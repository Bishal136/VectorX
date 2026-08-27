// vectorx-backend/src/models/Product.model.js
const mongoose = require('mongoose');

const productImageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  publicId: {
    type: String,
    default: () => `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  alt: {
    type: String,
    trim: true
  }
}, {
  _id: true
});

const productReviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    trim: true,
    maxlength: 100
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      default: () => `rev_img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    }
  }],
  video: {
    url: {
      type: String,
      trim: true,
      default: null
    },
    publicId: {
      type: String,
      trim: true,
      default: null
    },
    thumbnail: {
      type: String,
      trim: true,
      default: null
    }
  },
  isVerifiedPurchase: {
    type: Boolean,
    default: true
  },
  helpful: {
    type: Number,
    default: 0
  },
  helpfulUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  reported: {
    type: Boolean,
    default: false
  },
  reply: {
    comment: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  _id: true
});

const productVariantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  options: [{
    value: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      min: 0
    },
    stock: {
      type: Number,
      default: 0,
      min: 0
    },
    sku: {
      type: String,
      trim: true
    }
  }]
}, {
  _id: true
});

const productSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  description: {
    type: String,
    trim: true
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: 200
  },
  
  // Pricing
  price: {
    type: Number,
    required: true,
    min: 0
  },
  comparePrice: {
    type: Number,
    min: 0,
    validate: {
      validator: function(value) {
        return !value || value >= this.price;
      },
      message: 'Compare price must be greater than or equal to regular price'
    }
  },
  
  // Inventory
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  lowStockThreshold: {
    type: Number,
    default: 5,
    min: 0
  },
  sku: {
    type: String,
    trim: true,
    sparse: true
  },
  isInStock: {
    type: Boolean,
    default: true
  },
  
  // Variants (for products with options like size, color)
  variants: [productVariantSchema],
  hasVariants: {
    type: Boolean,
    default: false
  },
  
  // Categories
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true
  },
  subCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Images
  images: [productImageSchema],

  // Video
  video: {
    url: {
      type: String,
      trim: true,
      default: null
    },
    publicId: {
      type: String,
      trim: true,
      default: null
    },
    thumbnail: {
      type: String,
      trim: true,
      default: null
    }
  },
  
  // Seller Information
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true,
    index: true
  },
  
  // Location (inherited from seller at creation time)
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function(coords) {
          if (!coords || coords.length !== 2) return false;
          const [lng, lat] = coords;
          return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
        },
        message: 'Invalid coordinates. Longitude must be -180 to 180, latitude -90 to 90'
      }
    }
  },
  
  // Ratings and Reviews
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0,
      min: 0
    },
    distribution: {
      1: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      5: { type: Number, default: 0 }
    }
  },
  reviews: [productReviewSchema],
  
  // Product Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isApproved: {
    type: Boolean,
    default: true // Admin can flag products for review
  },
  
  // Delivery Information
  deliveryInfo: {
    handlingTime: {
      type: String,
      enum: ['1-2 days', '2-3 days', '3-5 days', '5-7 days', '7-14 days'],
      default: '2-3 days'
    },
    returnPolicy: {
      type: String,
      enum: ['7 days', '15 days', '30 days', 'No returns'],
      default: '7 days'
    },
    isReturnable: {
      type: Boolean,
      default: true
    },
    shippingWeight: {
      type: Number,
      min: 0
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: {
        type: String,
        enum: ['cm', 'in'],
        default: 'cm'
      }
    }
  },
  
  // SEO
  seo: {
    title: {
      type: String,
      trim: true,
      maxlength: 60
    },
    description: {
      type: String,
      trim: true,
      maxlength: 160
    },
    keywords: [{
      type: String,
      trim: true
    }]
  },
  
  // Metadata for future extensibility
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// ==================== Indexes ====================

// Geospatial index for location-based queries
productSchema.index({ location: '2dsphere' });

// Indexes for common queries
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ sellerId: 1, isActive: 1 });
productSchema.index({ 'rating.average': -1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ isFeatured: -1, isActive: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Compound indexes for filtering
productSchema.index({ category: 1, price: 1, isActive: 1 });
productSchema.index({ sellerId: 1, category: 1, isActive: 1 });
productSchema.index({ isActive: 1, stock: 1, isInStock: 1 });

// ==================== Middleware ====================

// Pre-validate middleware to generate a unique slug
productSchema.pre('validate', async function() {
  if (this.name && (this.isModified('name') || !this.slug)) {
    const baseSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let slug = baseSlug;
    let counter = 1;

    while (await this.constructor.exists({ slug, _id: { $ne: this._id } })) {
      counter += 1;
      slug = `${baseSlug}-${counter}`;
    }

    this.slug = slug;
  }

  this.isInStock = this.stock > 0;

  if (this.variants && this.variants.length > 0) {
    this.hasVariants = true;
    let totalStock = 0;
    this.variants.forEach(variant => {
      variant.options.forEach(option => {
        totalStock += option.stock || 0;
      });
    });
    if (!this.isModified('stock')) {
      this.stock = totalStock;
    }
  }
});

// Pre-validate middleware to ensure coordinates are valid
productSchema.pre('validate', function() {
  if (this.location && this.location.coordinates) {
    const [lng, lat] = this.location.coordinates;
    if (lng === 0 && lat === 0) {
      console.warn('Product coordinates are 0,0. Will be updated by service layer.');
    }
  }
});

// Pre-save middleware to sync rating distribution
productSchema.pre('save', function() {
  if (this.isModified('reviews') || this.isNew) {
    this.updateRatingStats();
  }
});

// ==================== Methods ====================

// Update rating statistics from reviews
productSchema.methods.updateRatingStats = function() {
  if (!this.reviews || this.reviews.length === 0) {
    this.rating.average = 0;
    this.rating.count = 0;
    this.rating.distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    return;
  }
  
  const total = this.reviews.length;
  const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
  this.rating.average = parseFloat((sum / total).toFixed(1));
  this.rating.count = total;
  
  // Update distribution
  this.rating.distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  this.reviews.forEach(review => {
    this.rating.distribution[review.rating] = (this.rating.distribution[review.rating] || 0) + 1;
  });
};

// Check if product is available for purchase
productSchema.methods.isAvailable = function() {
  return this.isActive && this.isApproved && this.stock > 0 && this.isInStock;
};

// Get primary image
productSchema.methods.getPrimaryImage = function() {
  if (!this.images) return null;
  const primary = this.images.find(img => img.isPrimary);
  return primary || (this.images.length > 0 ? this.images[0] : null);
};

// Get all image URLs
productSchema.methods.getImageUrls = function() {
  return this.images?.map(img => img.url) || [];
};

// Check if product has enough stock for an order
productSchema.methods.hasEnoughStock = function(quantity) {
  return this.stock >= quantity;
};

// Reduce stock
productSchema.methods.reduceStock = function(quantity) {
  if (!this.hasEnoughStock(quantity)) {
    throw new Error(`Insufficient stock. Available: ${this.stock}, Requested: ${quantity}`);
  }
  this.stock -= quantity;
  this.isInStock = this.stock > 0;
  return this.save();
};

// Add review
productSchema.methods.addReview = function(reviewData) {
  // Validate that user has purchased this product (verified by orderId)
  this.reviews.push({
    userId: reviewData.userId,
    orderId: reviewData.orderId,
    rating: reviewData.rating,
    title: reviewData.title,
    comment: reviewData.comment,
    images: reviewData.images || [],
    video: reviewData.video || { url: null, publicId: null, thumbnail: null },
    isVerifiedPurchase: reviewData.isVerifiedPurchase !== undefined ? reviewData.isVerifiedPurchase : true
  });
  
  this.updateRatingStats();
  return this.save();
};

// Get discount percentage if compare price exists
productSchema.methods.getDiscountPercentage = function() {
  if (!this.comparePrice || this.comparePrice <= this.price) return 0;
  return Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100);
};

// Get product summary (for listing views)
productSchema.methods.getSummary = function() {
  const primaryImage = this.getPrimaryImage();
  return {
    id: this._id,
    name: this.name,
    slug: this.slug,
    price: this.price,
    comparePrice: this.comparePrice,
    discountPercentage: this.getDiscountPercentage(),
    images: this.getImageUrls(),
    primaryImage: primaryImage ? primaryImage.url : null,
    rating: this.rating,
    stock: this.stock,
    isAvailable: this.isAvailable(),
    sellerId: this.sellerId,
    category: this.category
  };
};

// ==================== Statics ====================

// Get product by slug
productSchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug, isActive: true });
};

// Get featured products
productSchema.statics.getFeatured = function(limit = 10) {
  return this.find({ isFeatured: true, isActive: true })
    .sort({ 'rating.average': -1, createdAt: -1 })
    .limit(limit);
};

// Get products by category with pagination
productSchema.statics.findByCategory = function(categoryId, page = 1, limit = 20, sort = {}) {
  const skip = (page - 1) * limit;
  return this.find({ category: categoryId, isActive: true })
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

// Search products (text search)
productSchema.statics.searchProducts = function(query, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  return this.find(
    { $text: { $search: query }, isActive: true },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .skip(skip)
    .limit(limit);
};

// Get products by seller
productSchema.statics.findBySeller = function(sellerId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  return this.find({ sellerId, isActive: true })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Get low stock products for a seller
productSchema.statics.getLowStockProducts = function(sellerId) {
  return this.find({
    sellerId,
    isActive: true,
    stock: { $lte: '$lowStockThreshold' }
  }).sort({ stock: 1 });
};

// Get product statistics for a seller
productSchema.statics.getSellerStats = async function(sellerId) {
  const stats = await this.aggregate([
    {
      $match: { 
        sellerId: sellerId,
        isActive: true 
      }
    },
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        totalStock: { $sum: '$stock' },
        totalValue: { $sum: { $multiply: ['$price', '$stock'] } },
        averagePrice: { $avg: '$price' },
        lowStockCount: {
          $sum: {
            $cond: [
              { $expr: { $lte: ['$stock', '$lowStockThreshold'] } },
              1,
              0
            ]
          }
        },
        outOfStockCount: {
          $sum: {
            $cond: [
              { $eq: ['$stock', 0] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
  
  return stats.length > 0 ? stats[0] : {
    totalProducts: 0,
    totalStock: 0,
    totalValue: 0,
    averagePrice: 0,
    lowStockCount: 0,
    outOfStockCount: 0
  };
};

// Get top products by sales/revenue (requires Order model)
productSchema.statics.getTopProducts = async function(sellerId, limit = 10) {
  // This needs to be implemented with Order model
  // Placeholder for now
  return this.find({ sellerId, isActive: true })
    .sort({ 'rating.average': -1, 'rating.count': -1 })
    .limit(limit);
};

// Bulk update stock
productSchema.statics.bulkUpdateStock = async function(updates) {
  const operations = updates.map(update => ({
    updateOne: {
      filter: { _id: update.productId },
      update: { 
        $inc: { stock: -update.quantity },
        $set: { isInStock: { $gt: ['$stock', 0] } }
      }
    }
  }));
  
  return this.bulkWrite(operations);
};

// ==================== Virtuals ====================

// Virtual for formatted price
productSchema.virtual('formattedPrice').get(function() {
  return `৳${Number(this.price || 0).toLocaleString()}`;
});

// Virtual for formatted compare price
productSchema.virtual('formattedComparePrice').get(function() {
  if (!this.comparePrice) return null;
  return `৳${Number(this.comparePrice || 0).toLocaleString()}`;
});

// Virtual for rating percentage (for display)
productSchema.virtual('ratingPercentage').get(function() {
  if (!this.rating?.average) return 0;
  return (this.rating.average / 5) * 100;
});

// Virtual for review count breakdown
productSchema.virtual('reviewBreakdown').get(function() {
  const total = this.reviews?.length || 0;
  if (total === 0) return null;

  const dist = this.rating?.distribution || {};
  return {
    1: { count: dist[1] || 0, percentage: ((dist[1] || 0) / total) * 100 },
    2: { count: dist[2] || 0, percentage: ((dist[2] || 0) / total) * 100 },
    3: { count: dist[3] || 0, percentage: ((dist[3] || 0) / total) * 100 },
    4: { count: dist[4] || 0, percentage: ((dist[4] || 0) / total) * 100 },
    5: { count: dist[5] || 0, percentage: ((dist[5] || 0) / total) * 100 }
  };
});

// Set virtuals to be included in JSON and Object output
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

// ==================== Model Export ====================

module.exports = mongoose.model('Product', productSchema);