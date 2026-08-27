// vectorx-backend/src/routes/product.routes.js
const express = require('express');
const router = express.Router();

const {
  getProducts,
  getCategories,
  getProductById,
  getRelatedProducts,
  getProductsBySeller,
  uploadReviewImage,
  uploadReviewVideo,
  submitReview,
  checkCanReview,
  getProductReviews,
  reportReview,
  markReviewHelpful
} = require('../controllers/product.controller');

const { verifyToken } = require('../middlewares/auth.middleware');
const { isUser } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { uploadSingle, uploadSingleVideo } = require('../middlewares/upload.middleware');

// Joi schemas for validation
const Joi = require('joi');

// Validation schemas
const reviewSchema = Joi.object({
  rating: Joi.number().min(1).max(5).required(),
  title: Joi.string().max(100).allow('', null).optional(),
  comment: Joi.string().max(1000).allow('', null).optional(),
  orderId: Joi.string().optional().allow('', null),
  images: Joi.array().items(
    Joi.alternatives().try(
      Joi.string(),
      Joi.object({
        url: Joi.string().required(),
        publicId: Joi.string().optional().allow('')
      })
    )
  ).optional(),
  video: Joi.alternatives().try(
    Joi.string().allow('', null),
    Joi.object({
      url: Joi.string().allow('', null).optional(),
      publicId: Joi.string().allow('', null).optional(),
      thumbnail: Joi.string().allow('', null).optional()
    }).allow(null)
  ).optional().allow(null)
});

const productQuerySchema = Joi.object({
  lat: Joi.number().min(-90).max(90),
  lng: Joi.number().min(-180).max(180),
  category: Joi.string(),
  subCategory: Joi.string(),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  sort: Joi.string().valid('distance', 'popularity', 'price_asc', 'price_desc', 'newest', 'rating'),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  search: Joi.string().allow(''),
  sellerId: Joi.string(),
  isFeatured: Joi.boolean(),
  minRating: Joi.number().min(0).max(5)
});

const relatedQuerySchema = Joi.object({
  limit: Joi.number().min(1).max(20).default(6)
});

const sellerProductsQuerySchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  status: Joi.string().valid('active', 'inactive', 'all').default('active')
});

const reviewsQuerySchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(50).default(10),
  sort: Joi.string().valid('newest', 'helpful', 'highest', 'lowest').default('newest')
});

// ==================== Public Routes ====================

/**
 * @route   GET /api/products
 * @desc    Get products with location-based sorting
 * @access  Public
 */
router.get(
  '/',
  validate(productQuerySchema, 'query'),
  getProducts
);

/**
 * @route   GET /api/products/categories
 * @desc    Get all active product categories
 * @access  Public
 */
router.get('/categories', getCategories);

/**
 * @route   GET /api/products/:id
 * @desc    Get single product by ID or slug
 * @access  Public
 */
router.get('/:id', getProductById);

/**
 * @route   GET /api/products/:id/related
 * @desc    Get related products
 * @access  Public
 */
router.get(
  '/:id/related',
  validate(relatedQuerySchema, 'query'),
  getRelatedProducts
);

/**
 * @route   GET /api/products/seller/:sellerId
 * @desc    Get products by seller
 * @access  Public
 */
router.get(
  '/seller/:sellerId',
  validate(sellerProductsQuerySchema, 'query'),
  getProductsBySeller
);

/**
 * @route   GET /api/products/:id/reviews
 * @desc    Get product reviews
 * @access  Public
 */
router.get(
  '/:id/reviews',
  validate(reviewsQuerySchema, 'query'),
  getProductReviews
);

// ==================== Protected Routes (User) ====================

/**
 * @route   POST /api/products/reviews/upload/image
 * @desc    Upload an image for a product review
 * @access  Private (User)
 */
router.post(
  '/reviews/upload/image',
  verifyToken,
  isUser,
  uploadSingle('image'),
  uploadReviewImage
);

/**
 * @route   POST /api/products/reviews/upload/video
 * @desc    Upload a video for a product review
 * @access  Private (User)
 */
router.post(
  '/reviews/upload/video',
  verifyToken,
  isUser,
  uploadSingleVideo('video'),
  uploadReviewVideo
);

/**
 * @route   GET /api/products/:id/can-review
 * @desc    Check if authenticated user is a verified buyer who can review
 * @access  Private (User)
 */
router.get(
  '/:id/can-review',
  verifyToken,
  isUser,
  checkCanReview
);

/**
 * @route   POST /api/products/:id/reviews
 * @desc    Submit a review for a product
 * @access  Private (User)
 */
router.post(
  '/:id/reviews',
  verifyToken,
  isUser,
  validate(reviewSchema, 'body'),
  submitReview
);

/**
 * @route   POST /api/products/:productId/reviews/:reviewId/report
 * @desc    Report a review
 * @access  Private (User)
 */
router.post(
  '/:productId/reviews/:reviewId/report',
  verifyToken,
  isUser,
  reportReview
);

/**
 * @route   POST /api/products/:productId/reviews/:reviewId/helpful
 * @desc    Mark a review as helpful
 * @access  Private (User)
 */
router.post(
  '/:productId/reviews/:reviewId/helpful',
  verifyToken,
  isUser,
  markReviewHelpful
);

module.exports = router;