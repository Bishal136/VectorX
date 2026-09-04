// server/src/validations/banner.validation.js
const Joi = require('joi');
const { BANNER_SLOTS } = require('../models/Banner.model');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const createBannerSchema = Joi.object({
  title: Joi.string().trim().max(120).required(),
  subtitle: Joi.string().trim().max(160).allow('', null).optional(),
  description: Joi.string().trim().max(300).allow('', null).optional(),
  imageUrl: Joi.string().uri().allow('', null).optional(),
  image: Joi.object({
    url: Joi.string().required(),
    publicId: Joi.string().allow('', null).optional()
  }).optional(),
  mobileImageUrl: Joi.string().uri().allow('', null).optional(),
  link: Joi.string().trim().default('/products').optional(),
  ctaText: Joi.string().trim().max(30).default('Shop Now').optional(),
  slot: Joi.string().valid(...Object.values(BANNER_SLOTS)).default(BANNER_SLOTS.HERO_SLIDER).optional(),
  badgeText: Joi.string().trim().max(40).allow('', null).optional(),
  bgColor: Joi.string().trim().default('#0f172a').optional(),
  textColor: Joi.string().trim().default('#ffffff').optional(),
  order: Joi.number().integer().min(0).default(0).optional(),
  isActive: Joi.boolean().default(true).optional(),
  startDate: Joi.date().iso().allow(null, '').optional(),
  endDate: Joi.date().iso().allow(null, '').optional()
});

const updateBannerSchema = Joi.object({
  title: Joi.string().trim().max(120).optional(),
  subtitle: Joi.string().trim().max(160).allow('', null).optional(),
  description: Joi.string().trim().max(300).allow('', null).optional(),
  imageUrl: Joi.string().uri().allow('', null).optional(),
  image: Joi.object({
    url: Joi.string().required(),
    publicId: Joi.string().allow('', null).optional()
  }).optional(),
  mobileImageUrl: Joi.string().uri().allow('', null).optional(),
  link: Joi.string().trim().optional(),
  ctaText: Joi.string().trim().max(30).optional(),
  slot: Joi.string().valid(...Object.values(BANNER_SLOTS)).optional(),
  badgeText: Joi.string().trim().max(40).allow('', null).optional(),
  bgColor: Joi.string().trim().optional(),
  textColor: Joi.string().trim().optional(),
  order: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
  startDate: Joi.date().iso().allow(null, '').optional(),
  endDate: Joi.date().iso().allow(null, '').optional()
});

const reorderBannersSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      id: Joi.string().pattern(objectIdPattern).required(),
      order: Joi.number().integer().min(0).required()
    })
  ).required()
});

const updateCMSSchema = Joi.object({
  announcement: Joi.object({
    enabled: Joi.boolean().optional(),
    text: Joi.string().trim().allow('').optional(),
    link: Joi.string().trim().allow('').optional(),
    badge: Joi.string().trim().allow('').optional(),
    bgColor: Joi.string().trim().optional(),
    textColor: Joi.string().trim().optional()
  }).optional(),
  heroSettings: Joi.object({
    autoPlayInterval: Joi.number().integer().min(1000).max(30000).optional(),
    showDots: Joi.boolean().optional(),
    showArrows: Joi.boolean().optional()
  }).optional(),
  promoSection: Joi.object({
    enabled: Joi.boolean().optional(),
    title: Joi.string().trim().optional(),
    tagline: Joi.string().trim().allow('').optional()
  }).optional(),
  logo: Joi.object({
    type: Joi.string().valid('default', 'image', 'text', 'both').optional(),
    imageUrl: Joi.string().allow('', null).optional(),
    publicId: Joi.string().allow('', null).optional(),
    text: Joi.string().trim().max(100).allow('', null).optional(),
    subtext: Joi.string().trim().max(100).allow('', null).optional(),
    height: Joi.number().integer().min(16).max(120).optional(),
    altText: Joi.string().trim().max(100).allow('', null).optional()
  }).optional()
});

module.exports = {
  createBannerSchema,
  updateBannerSchema,
  reorderBannersSchema,
  updateCMSSchema
};
