
const express = require('express');
const router = express.Router();
const {
  registerSeller,
  getDashboardStats,
  getSellerProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getSellerOrders,
  updateOrderStatus,
  handleReturnDecision,
  issueOrderRefund,
  getSellerProfile,
  updateSellerProfile,
  uploadSellerLogo,
  uploadSellerBanner,
  requestVerification,
  getSellerEarnings,
  uploadProductImage,
  uploadProductVideo,
  getSellerReviews,
  replyToReview,
  deleteReviewReply
} = require('../controllers/seller.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { isSeller, isVerifiedSeller } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { uploadSingle, uploadSingleVideo } = require('../middlewares/upload.middleware');
const Joi = require('joi');
const Seller = require('../models/Seller.model');

// ===================== Validation Schemas =====================

const replyReviewSchema = Joi.object({
  comment: Joi.string().required().min(1).max(1000)
});

const registerSellerSchema = Joi.object({
  shopName: Joi.string().required().min(3).max(100),
  shopAddress: Joi.object({
    line1: Joi.string().required(),
    city: Joi.string().required(),
    pincode: Joi.string().required()
  }).required(),
  location: Joi.object({
    type: Joi.string().valid('Point').default('Point'),
    coordinates: Joi.array().items(Joi.number()).length(2).required()
  }).required(),
  gstNumber: Joi.string().optional().allow(''),
  panNumber: Joi.string().optional().allow(''),
  bankDetails: Joi.object({
    accountHolderName: Joi.string().optional(),
    accountNumber: Joi.string().optional(),
    ifsc: Joi.string().optional()
  }).optional()
});

const variantOptionSchema = Joi.object({
  value: Joi.string().required(),
  price: Joi.number().min(0).optional().allow(null, ''),
  stock: Joi.number().min(0).default(0).optional(),
  sku: Joi.string().optional().allow('')
});

const variantSchema = Joi.object({
  name: Joi.string().required(),
  options: Joi.array().items(variantOptionSchema).required()
});

const videoSchema = Joi.alternatives().try(
  Joi.string().allow('', null).optional(),
  Joi.object({
    url: Joi.string().allow('', null).optional(),
    publicId: Joi.string().allow('', null).optional(),
    thumbnail: Joi.string().allow('', null).optional()
  }).optional().allow(null)
).optional().allow(null);

const createProductSchema = Joi.object({
  name: Joi.string().required().min(3).max(200),
  description: Joi.string().optional().allow(''),
  price: Joi.number().required().min(0),
  comparePrice: Joi.number().min(0).optional().allow(null, ''),
  category: Joi.string().required(),
  images: Joi.array().items(Joi.object({
    url: Joi.string().required(),
    publicId: Joi.string().optional().allow(''),
    isPrimary: Joi.boolean().optional(),
    alt: Joi.string().optional().allow('')
  })).optional(),
  video: videoSchema,
  hasVariants: Joi.boolean().optional(),
  variants: Joi.array().items(variantSchema).optional().allow(null),
  stock: Joi.number().default(0).min(0),
  lowStockThreshold: Joi.number().default(5).min(0),
  isActive: Joi.boolean().optional()
});

const updateProductSchema = Joi.object({
  name: Joi.string().min(3).max(200).optional(),
  description: Joi.string().optional().allow(''),
  price: Joi.number().min(0).optional(),
  comparePrice: Joi.number().min(0).optional().allow(null, ''),
  category: Joi.string().optional(),
  images: Joi.array().items(Joi.object({
    url: Joi.string().required(),
    publicId: Joi.string().optional().allow(''),
    isPrimary: Joi.boolean().optional(),
    alt: Joi.string().optional().allow('')
  })).optional(),
  video: videoSchema,
  hasVariants: Joi.boolean().optional(),
  variants: Joi.array().items(variantSchema).optional().allow(null),
  stock: Joi.number().min(0).optional(),
  lowStockThreshold: Joi.number().min(0).optional(),
  isActive: Joi.boolean().optional()
});

const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return_Requested', 'Return_Approved', 'Return_Rejected', 'Refunded',
      'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'return_requested', 'return_approved', 'return_rejected', 'refunded'
    )
    .required(),
  notes: Joi.string().optional().allow(''),
  trackingNumber: Joi.string().optional().allow(''),
  carrier: Joi.string().optional().allow(''),
  cancellationReason: Joi.string().optional().allow('')
});

const returnDecisionSchema = Joi.object({
  decision: Joi.string().valid('approved', 'rejected').required(),
  comment: Joi.string().optional().allow(''),
  refundAmount: Joi.number().min(0).optional().allow(null, ''),
  restockItems: Joi.boolean().optional(),
  action: Joi.string().valid('approve_and_refund', 'approve_return', 'reject').optional()
});

const issueRefundSchema = Joi.object({
  refundAmount: Joi.number().min(0).optional().allow(null, ''),
  notes: Joi.string().optional().allow(''),
  restockItems: Joi.boolean().optional()
});

const updateSellerProfileSchema = Joi.object({
  shopName: Joi.string().min(2).max(100).optional(),
  name: Joi.string().min(2).max(100).optional().allow(''),
  ownerName: Joi.string().min(2).max(100).optional().allow(''),
  headline: Joi.string().optional().allow(''),
  bio: Joi.string().optional().allow(''),
  skills: Joi.array().items(Joi.string()).optional(),
  socialLinks: Joi.object({
    linkedin: Joi.string().optional().allow(''),
    website: Joi.string().optional().allow(''),
    github: Joi.string().optional().allow(''),
    twitter: Joi.string().optional().allow('')
  }).optional(),
  banner: Joi.object({
    url: Joi.string().optional().allow('', null),
    publicId: Joi.string().optional().allow('', null),
    slogan: Joi.string().optional().allow(''),
    subtitle: Joi.string().optional().allow('')
  }).optional(),
  logo: Joi.object({
    url: Joi.string().optional().allow('', null),
    publicId: Joi.string().optional().allow('', null)
  }).optional(),
  shopAddress: Joi.object({
    line1: Joi.string().optional().allow(''),
    city: Joi.string().optional().allow(''),
    pincode: Joi.string().optional().allow('')
  }).optional(),
  location: Joi.object({
    type: Joi.string().valid('Point').default('Point'),
    coordinates: Joi.array().items(Joi.number()).length(2)
  }).optional(),
  gstNumber: Joi.string().optional().allow(''),
  panNumber: Joi.string().optional().allow(''),
  bankDetails: Joi.object({
    accountHolderName: Joi.string().optional().allow(''),
    accountNumber: Joi.string().optional().allow(''),
    ifsc: Joi.string().optional().allow('')
  }).optional()
});

const checkSellerExists = async (req, res, next) => {
  try {
    const userId = req.user._id?.toString() || req.user.id;
    const seller = await Seller.findOne({ user: userId });
    
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found. Please register as a seller first.',
        data: {
          needsRegistration: true,
          registrationEndpoint: '/api/sellers/register'
        }
      });
    }
    
    req.seller = seller;
    next();
  } catch (error) {
    next(error);
  }
};

// ===================== Routes =====================

// All seller routes require authentication and seller role
router.use(verifyToken);

// Seller registration and profile
router.post('/register', validate(registerSellerSchema), registerSeller);
router.get('/profile', checkSellerExists, getSellerProfile);
router.put('/profile', checkSellerExists, validate(updateSellerProfileSchema), updateSellerProfile);

// Profile media uploads & verification request
router.post('/upload/logo', checkSellerExists, uploadSingle('logo'), uploadSellerLogo);
router.post('/upload/banner', checkSellerExists, uploadSingle('banner'), uploadSellerBanner);
router.post('/request-verification', checkSellerExists, requestVerification);

router.use(isSeller);

// Dashboard
router.get('/dashboard', checkSellerExists, getDashboardStats);

// Earnings
router.get('/earnings', checkSellerExists, getSellerEarnings);

// Product management - all product routes require verified seller
router.use(isVerifiedSeller);

// Media uploads
router.post('/upload/image', uploadSingle('image'), uploadProductImage);
router.post('/upload/video', uploadSingleVideo('video'), uploadProductVideo);

router.get('/products', getSellerProducts);
router.post('/products', validate(createProductSchema), createProduct);
router.put('/products/:id', validate(updateProductSchema), updateProduct);
router.delete('/products/:id', deleteProduct);

// Order management
router.get('/orders', getSellerOrders);
router.put('/orders/:id/status', validate(updateOrderStatusSchema), updateOrderStatus);
router.put('/orders/:id/return-decision', validate(returnDecisionSchema), handleReturnDecision);
router.post('/orders/:id/return-decision', validate(returnDecisionSchema), handleReturnDecision);
router.put('/orders/:id/refund', validate(issueRefundSchema), issueOrderRefund);

// Reviews & Ratings management
router.get('/reviews', getSellerReviews);
router.post('/products/:productId/reviews/:reviewId/reply', validate(replyReviewSchema), replyToReview);
router.delete('/products/:productId/reviews/:reviewId/reply', deleteReviewReply);

module.exports = router;