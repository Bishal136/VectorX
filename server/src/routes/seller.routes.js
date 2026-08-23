
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
  getSellerProfile,
  updateSellerProfile,
  getSellerEarnings
} = require('../controllers/seller.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { isSeller, isVerifiedSeller } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const Joi = require('joi');
const Seller = require('../models/Seller.model');

// ===================== Validation Schemas =====================

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
  stock: Joi.number().min(0).optional(),
  lowStockThreshold: Joi.number().min(0).optional(),
  isActive: Joi.boolean().optional()
});

const updateOrderStatusSchema = Joi.object({
  status: Joi.string().valid('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded').required()
});

const updateSellerProfileSchema = Joi.object({
  shopName: Joi.string().min(3).max(100).optional(),
  shopAddress: Joi.object({
    line1: Joi.string().optional(),
    city: Joi.string().optional(),
    pincode: Joi.string().optional()
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
router.get('/profile',checkSellerExists, getSellerProfile);
router.put('/profile',checkSellerExists, validate(updateSellerProfileSchema), updateSellerProfile);

router.use(isSeller);

// Dashboard
router.get('/dashboard',checkSellerExists, getDashboardStats);

// Earnings
router.get('/earnings',checkSellerExists, getSellerEarnings);

// Product management - all product routes require verified seller
router.use(isVerifiedSeller);

router.get('/products', getSellerProducts);
router.post('/products', validate(createProductSchema), createProduct);
router.put('/products/:id', validate(updateProductSchema), updateProduct);
router.delete('/products/:id', deleteProduct);

// Order management
router.get('/orders', getSellerOrders);
router.put('/orders/:id/status', validate(updateOrderStatusSchema), updateOrderStatus);

module.exports = router;