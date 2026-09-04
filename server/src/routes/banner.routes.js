// server/src/routes/banner.routes.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { uploadSingle } = require('../middlewares/upload.middleware');
const bannerController = require('../controllers/banner.controller');
const {
  createBannerSchema,
  updateBannerSchema,
  reorderBannersSchema,
  updateCMSSchema
} = require('../validations/banner.validation');

// ==========================================
// 1. Public Storefront Routes
// ==========================================
router.get('/', bannerController.getActiveBanners);
router.get('/homepage', bannerController.getHomepageCMS);
router.post('/:id/click', bannerController.trackBannerClick);

// ==========================================
// 2. Protected Admin CMS & Banner Routes
// ==========================================
// Global CMS Configuration (Announcement bar, Hero settings)
router.get('/admin/cms', verifyToken, isAdmin, bannerController.getCMSConfig);
router.put(
  '/admin/cms',
  verifyToken,
  isAdmin,
  validate(updateCMSSchema),
  bannerController.updateCMSConfig
);
router.post(
  '/admin/cms/logo',
  verifyToken,
  isAdmin,
  uploadSingle('logo'),
  bannerController.uploadCMSLogo
);

// Admin Banners Management
router.get('/admin', verifyToken, isAdmin, bannerController.adminGetBanners);
router.post(
  '/admin',
  verifyToken,
  isAdmin,
  uploadSingle('image'),
  validate(createBannerSchema),
  bannerController.adminCreateBanner
);
router.post(
  '/admin/reorder',
  verifyToken,
  isAdmin,
  validate(reorderBannersSchema),
  bannerController.adminReorderBanners
);
router.get('/admin/:id', verifyToken, isAdmin, bannerController.adminGetBannerById);
router.put(
  '/admin/:id',
  verifyToken,
  isAdmin,
  uploadSingle('image'),
  validate(updateBannerSchema),
  bannerController.adminUpdateBanner
);
router.delete('/admin/:id', verifyToken, isAdmin, bannerController.adminDeleteBanner);
router.patch('/admin/:id/toggle', verifyToken, isAdmin, bannerController.adminToggleBannerStatus);

module.exports = router;
