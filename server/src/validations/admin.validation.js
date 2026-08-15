// src/validations/admin.validation.js
const Joi = require('joi');

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).message('Invalid ID format');

const blockUser = Joi.object({
  block: Joi.boolean().required(),
});

const verifySeller = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required(),
  rejectionReason: Joi.string().when('status', {
    is: 'rejected',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
});

const createCategory = Joi.object({
  name: Joi.string().trim().required().max(100),
  slug: Joi.string().trim().lowercase().max(100).optional(), // optional, auto-generated if missing
  description: Joi.string().trim().optional(),
  parent: objectId.optional().allow(null),
  image: Joi.object({
    url: Joi.string().uri().optional(),
    publicId: Joi.string().optional(),
  }).optional(),
  seo: Joi.object({
    title: Joi.string().max(60).optional(),
    description: Joi.string().max(160).optional(),
    keywords: Joi.array().items(Joi.string()).optional(),
  }).optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
});

const updateCategory = Joi.object({
  name: Joi.string().trim().max(100).optional(),
  description: Joi.string().trim().optional(),
  parent: objectId.optional().allow(null),
  image: Joi.object({
    url: Joi.string().uri().optional(),
    publicId: Joi.string().optional(),
  }).optional(),
  seo: Joi.object({
    title: Joi.string().max(60).optional(),
    description: Joi.string().max(160).optional(),
    keywords: Joi.array().items(Joi.string()).optional(),
  }).optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
});

const updateOrderStatus = Joi.object({
  status: Joi.string().valid('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded').required(),
  notes: Joi.string().optional(),
});

const updateSettings = Joi.object({
  deliveryCharge: Joi.number().min(0).optional(),
  commissionRate: Joi.number().min(0).max(100).optional(),
  couponCodes: Joi.array().items(
    Joi.object({
      code: Joi.string().trim().uppercase().required(),
      discount: Joi.number().min(0).required(),
      discountType: Joi.string().valid('percentage', 'fixed').default('percentage'),
      minOrderAmount: Joi.number().min(0).default(0),
      expiresAt: Joi.date().iso().optional(),
      isActive: Joi.boolean().default(true),
      usageLimit: Joi.number().integer().min(0).allow(null).default(null),
    })
  ).optional(),
});

// Add to adminSchemas object
const getUserSchema = Joi.object({
  id: Joi.string().required().pattern(/^[0-9a-fA-F]{24}$/),
});

const deleteUserSchema = Joi.object({
  id: Joi.string().required().pattern(/^[0-9a-fA-F]{24}$/),
});

const suspendSeller = Joi.object({
  suspend: Joi.boolean().required(),
  reason: Joi.string().trim().optional(),
});


module.exports = {
  adminSchemas: {
    suspendSeller,
    getUserSchema,
    deleteUserSchema,
    blockUser,
    verifySeller,
    createCategory,
    updateCategory,
    updateOrderStatus,
    updateSettings,
  },
};