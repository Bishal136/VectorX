
const mongoose = require('mongoose');

// Order status constants (to be used with constants/orderStatus.js)
const ORDER_STATUS = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded'
};

const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

const PAYMENT_METHODS = {
  WALLEMIX: 'WALLEMIX',
  COD: 'COD'
};

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  // Snapshot of product details at time of order
  productSnapshot: {
    images: [{ url: String }],
    description: String,
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' }
  }
}, {
  _id: true
});

const shippingAddressSchema = new mongoose.Schema({
  label: {
    type: String,
    default: 'Default'
  },
  line1: {
    type: String,
    required: true
  },
  line2: String,
  city: {
    type: String,
    required: true
  },
  state: String,
  pincode: {
    type: String,
    required: true
  },
  coordinates: {
    type: [Number],

  },
  phone: String // Contact number for delivery
}, {
  _id: false
});

const orderSchema = new mongoose.Schema({
  // User who placed the order
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Seller receiving the order (one order per seller)
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true
  },

  // Order items
  items: [orderItemSchema],

  // Total amount for this order
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },

  // Subtotal before tax/shipping
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },

  // Shipping charges
  shippingCharge: {
    type: Number,
    default: 0,
    min: 0
  },

  // Tax amount (if applicable)
  tax: {
    type: Number,
    default: 0,
    min: 0
  },

  // Discount applied (coupon)
  discount: {
    type: Number,
    default: 0,
    min: 0
  },

  // Coupon code used (if any)
  couponCode: {
    type: String,
    uppercase: true,
    trim: true
  },

  // Shipping address
  shippingAddress: {
    type: shippingAddressSchema,
    required: true
  },

  // Order status
  status: {
    type: String,
    enum: Object.values(ORDER_STATUS),
    default: ORDER_STATUS.PENDING
  },

  // Payment details
  paymentMethod: {
    type: String,
    enum: Object.values(PAYMENT_METHODS),
    required: true
  },
  paymentStatus: {
    type: String,
    enum: Object.values(PAYMENT_STATUS),
    default: PAYMENT_STATUS.PENDING
  },
  paymentReference: {
    type: String,
    sparse: true
  },
  paymentId: {
    type: String,
    sparse: true
  },

  // For multi-seller checkout grouping
  checkoutSessionId: {
    type: String,
  },

  // Delivery tracking
  trackingNumber: {
    type: String,
    sparse: true
  },
  deliveryDate: {
    type: Date
  },
  estimatedDeliveryDate: {
    type: Date
  },

  // Review status (if user has reviewed)
  isReviewed: {
    type: Boolean,
    default: false
  },

  // Cancellation reason (if cancelled)
  cancellationReason: {
    type: String
  },

  // Refund details
  refundAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  refundReference: {
    type: String,
    sparse: true
  },
  refundDate: {
    type: Date
  },

  // Order notes (for delivery instructions)
  notes: {
    type: String,
    trim: true
  },

  // Platform commission (calculated at checkout)
  commissionAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  commissionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // Metadata for additional info
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for performance
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ sellerId: 1, status: 1 });
orderSchema.index({ checkoutSessionId: 1 }, { sparse: true });
orderSchema.index({ status: 1, createdAt: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ 'shippingAddress.coordinates': '2dsphere' });

// Compound index for seller dashboard queries
orderSchema.index({ sellerId: 1, status: 1, createdAt: -1 });

// Method to check if order can be cancelled
orderSchema.methods.canCancel = function () {
  return [ORDER_STATUS.PENDING, ORDER_STATUS.PROCESSING].includes(this.status);
};

// Method to check if order can be updated (status)
orderSchema.methods.canUpdateStatus = function () {
  return [ORDER_STATUS.PENDING, ORDER_STATUS.PROCESSING, ORDER_STATUS.SHIPPED].includes(this.status);
};

// Method to check if order is completed
orderSchema.methods.isCompleted = function () {
  return [ORDER_STATUS.DELIVERED, ORDER_STATUS.REFUNDED].includes(this.status);
};

// Method to check if order is active (not cancelled/refunded)
orderSchema.methods.isActive = function () {
  return ![ORDER_STATUS.CANCELLED, ORDER_STATUS.REFUNDED].includes(this.status);
};

// Method to get order summary
orderSchema.methods.getSummary = function () {
  return {
    orderId: this._id,
    totalAmount: this.totalAmount,
    status: this.status,
    paymentStatus: this.paymentStatus,
    itemCount: this.items.reduce((sum, item) => sum + item.quantity, 0),
    createdAt: this.createdAt,
    estimatedDelivery: this.estimatedDeliveryDate
  };
};

// Static method to get sales stats for a seller
orderSchema.statics.getSellerStats = async function (sellerId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await this.aggregate([
    {
      $match: {
        sellerId: sellerId,
        status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.SHIPPED] },
        paymentStatus: PAYMENT_STATUS.PAID,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        totalCommission: { $sum: '$commissionAmount' },
        averageOrderValue: { $avg: '$totalAmount' }
      }
    }
  ]);

  return stats.length > 0 ? stats[0] : {
    totalOrders: 0,
    totalRevenue: 0,
    totalCommission: 0,
    averageOrderValue: 0
  };
};

// Static method to get platform-wide stats
orderSchema.statics.getPlatformStats = async function (days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        paymentStatus: PAYMENT_STATUS.PAID
      }
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        totalCommission: { $sum: '$commissionAmount' },
        avgOrderValue: { $avg: '$totalAmount' },
        uniqueCustomers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        totalOrders: 1,
        totalRevenue: 1,
        totalCommission: 1,
        avgOrderValue: 1,
        uniqueCustomers: { $size: '$uniqueCustomers' }
      }
    }
  ]);

  // Get status breakdown
  const statusBreakdown = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = stats.length > 0 ? stats[0] : {
    totalOrders: 0,
    totalRevenue: 0,
    totalCommission: 0,
    avgOrderValue: 0,
    uniqueCustomers: 0
  };

  result.statusBreakdown = statusBreakdown.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  return result;
};

// Pre-save middleware to calculate totals if not provided
orderSchema.pre('save', function () {
  // Ensure totalAmount matches subtotal + shipping + tax - discount
  if (!this.isModified('items') &&
    !this.isModified('subtotal') &&
    !this.isModified('shippingCharge') &&
    !this.isModified('tax') &&
    !this.isModified('discount')) {
    return ;
  }

  this.subtotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  this.totalAmount = this.subtotal + (this.shippingCharge || 0) + (this.tax || 0) - (this.discount || 0);

  // Ensure total amount doesn't go below 0
  if (this.totalAmount < 0) {
    this.totalAmount = 0;
  }


});

// Post-save middleware to update product stock
// orderSchema.post('save', async function(doc) {
//   if (doc.isNew && doc.status === ORDER_STATUS.PENDING) {
//     // Reduce stock for each item
//     const Product = mongoose.model('Product');
//     const updates = doc.items.map(item => 
//       Product.findByIdAndUpdate(
//         item.productId,
//         { $inc: { stock: -item.quantity } },
//         { new: true }
//       )
//     );

//     try {
//       await Promise.all(updates);
//     } catch (error) {
//       // Log error but don't fail the order save
//       console.error('Failed to update product stock:', error);
//     }
//   }
// });

module.exports = {
  Order: mongoose.model('Order', orderSchema),
  ORDER_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHODS
};