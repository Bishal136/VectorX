// server/src/controllers/banner.controller.js
const fs = require('fs');
const { Banner, BANNER_SLOTS } = require('../models/Banner.model');
const CMS = require('../models/CMS.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { uploadFile, deleteFile } = require('../config/cloudinary');

/**
 * Public: Get active banners for storefront
 * GET /api/banners
 * @query { slot }
 */
const getActiveBanners = asyncHandler(async (req, res) => {
  const { slot } = req.query;
  const banners = await Banner.getActiveBanners(slot || null);

  res.status(200).json({
    success: true,
    count: banners.length,
    data: banners
  });
});

/**
 * Public: Get complete Homepage CMS package
 * GET /api/banners/homepage
 */
const getHomepageCMS = asyncHandler(async (req, res) => {
  const activeBanners = await Banner.getActiveBanners();
  const cmsConfig = await CMS.getConfig();

  // Group banners by placement slot
  const groupedBanners = {
    hero_slider: [],
    promo_top: [],
    promo_middle: [],
    flash_sale: [],
    footer_banner: []
  };

  activeBanners.forEach((banner) => {
    if (groupedBanners[banner.slot]) {
      groupedBanners[banner.slot].push(banner);
    }
  });

  res.status(200).json({
    success: true,
    data: {
      banners: groupedBanners,
      allActive: activeBanners,
      announcement: cmsConfig.announcement,
      heroSettings: cmsConfig.heroSettings,
      promoSection: cmsConfig.promoSection,
      logo: cmsConfig.logo
    }
  });
});

/**
 * Public: Track banner click
 * POST /api/banners/:id/click
 */
const trackBannerClick = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const banner = await Banner.findByIdAndUpdate(
    id,
    { $inc: { clicks: 1 } },
    { new: true, select: '_id clicks' }
  );

  if (!banner) {
    throw new ApiError(404, 'Banner not found');
  }

  res.status(200).json({
    success: true,
    data: { id: banner._id, clicks: banner.clicks }
  });
});

/**
 * Admin: Get all banners with filters and analytics
 * GET /api/admin/banners
 */
const adminGetBanners = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, slot, isActive, search } = req.query;

  const query = {};

  if (slot && Object.values(BANNER_SLOTS).includes(slot)) {
    query.slot = slot;
  }

  if (isActive !== undefined && isActive !== '') {
    query.isActive = isActive === 'true' || isActive === true;
  }

  if (search && search.trim()) {
    const s = search.trim();
    query.$or = [
      { title: { $regex: s, $options: 'i' } },
      { subtitle: { $regex: s, $options: 'i' } },
      { badgeText: { $regex: s, $options: 'i' } },
      { link: { $regex: s, $options: 'i' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [banners, total, totalBanners, activeBannersCount, totalClicksResult] = await Promise.all([
    Banner.find(query)
      .sort({ slot: 1, order: 1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'name email'),
    Banner.countDocuments(query),
    Banner.countDocuments(),
    Banner.countDocuments({ isActive: true }),
    Banner.aggregate([
      { $group: { _id: null, totalClicks: { $sum: '$clicks' } } }
    ])
  ]);

  const totalClicks = totalClicksResult[0]?.totalClicks || 0;

  res.status(200).json({
    success: true,
    data: {
      banners,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      },
      stats: {
        totalBanners,
        activeBanners: activeBannersCount,
        inactiveBanners: totalBanners - activeBannersCount,
        totalClicks
      }
    }
  });
});

/**
 * Admin: Create new banner
 * POST /api/admin/banners
 */
const adminCreateBanner = asyncHandler(async (req, res) => {
  let imageData = null;

  // If a file was uploaded via multipart/form-data
  if (req.file) {
    try {
      const uploadRes = await uploadFile(req.file.path, {
        folder: 'vectorx/banners',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }]
      });
      imageData = {
        url: uploadRes.secure_url,
        publicId: uploadRes.public_id
      };
    } catch (err) {
      throw new ApiError(err.statusCode || 500, `Failed to upload image to Cloudinary: ${err.message}`);
    } finally {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
    }
  } else if (req.body.imageUrl) {
    imageData = {
      url: req.body.imageUrl.trim(),
      publicId: null
    };
  } else if (req.body.image && req.body.image.url) {
    imageData = {
      url: req.body.image.url.trim(),
      publicId: req.body.image.publicId || null
    };
  }

  if (!imageData || !imageData.url) {
    throw new ApiError(400, 'Banner image is required (upload file or provide image URL)');
  }

  // Handle auto ordering if not specified: append to end of current slot
  let orderNumber = req.body.order !== undefined ? parseInt(req.body.order) : null;
  if (orderNumber === null || isNaN(orderNumber)) {
    const highestOrder = await Banner.findOne({ slot: req.body.slot || BANNER_SLOTS.HERO_SLIDER })
      .sort({ order: -1 })
      .select('order');
    orderNumber = highestOrder ? highestOrder.order + 1 : 0;
  }

  const banner = await Banner.create({
    title: req.body.title,
    subtitle: req.body.subtitle || '',
    description: req.body.description || '',
    image: imageData,
    mobileImage: req.body.mobileImageUrl ? { url: req.body.mobileImageUrl.trim() } : undefined,
    link: req.body.link || '/products',
    ctaText: req.body.ctaText || 'Shop Now',
    slot: req.body.slot || BANNER_SLOTS.HERO_SLIDER,
    badgeText: req.body.badgeText || '',
    bgColor: req.body.bgColor || '#0f172a',
    textColor: req.body.textColor || '#ffffff',
    showTextOverlay: req.body.showTextOverlay !== undefined ? (req.body.showTextOverlay === 'true' || req.body.showTextOverlay === true) : false,
    order: orderNumber,
    isActive: req.body.isActive !== undefined ? req.body.isActive : true,
    startDate: req.body.startDate ? new Date(req.body.startDate) : null,
    endDate: req.body.endDate ? new Date(req.body.endDate) : null,
    createdBy: req.user?._id || null
  });

  res.status(201).json({
    success: true,
    message: 'Banner created successfully',
    data: banner
  });
});

/**
 * Admin: Get banner by ID
 * GET /api/admin/banners/:id
 */
const adminGetBannerById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const banner = await Banner.findById(id).populate('createdBy', 'name email');

  if (!banner) {
    throw new ApiError(404, 'Banner not found');
  }

  res.status(200).json({
    success: true,
    data: banner
  });
});

/**
 * Admin: Update banner
 * PUT /api/admin/banners/:id
 */
const adminUpdateBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const banner = await Banner.findById(id);

  if (!banner) {
    throw new ApiError(404, 'Banner not found');
  }

  // If a new image was uploaded
  if (req.file) {
    try {
      const uploadRes = await uploadFile(req.file.path, {
        folder: 'vectorx/banners',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }]
      });

      // Cleanup old image if it had a publicId
      if (banner.image?.publicId) {
        try {
          await deleteFile(banner.image.publicId);
        } catch (e) {
          // ignore cleanup error
        }
      }

      banner.image = {
        url: uploadRes.secure_url,
        publicId: uploadRes.public_id
      };
    } catch (err) {
      throw new ApiError(err.statusCode || 500, `Failed to upload image: ${err.message}`);
    } finally {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
    }
  } else if (req.body.imageUrl && req.body.imageUrl.trim() !== banner.image?.url) {
    banner.image = {
      url: req.body.imageUrl.trim(),
      publicId: null
    };
  }

  // Update text & configuration fields
  if (req.body.title !== undefined) banner.title = req.body.title;
  if (req.body.subtitle !== undefined) banner.subtitle = req.body.subtitle;
  if (req.body.description !== undefined) banner.description = req.body.description;
  if (req.body.link !== undefined) banner.link = req.body.link;
  if (req.body.ctaText !== undefined) banner.ctaText = req.body.ctaText;
  if (req.body.slot !== undefined) banner.slot = req.body.slot;
  if (req.body.badgeText !== undefined) banner.badgeText = req.body.badgeText;
  if (req.body.bgColor !== undefined) banner.bgColor = req.body.bgColor;
  if (req.body.textColor !== undefined) banner.textColor = req.body.textColor;
  if (req.body.showTextOverlay !== undefined) {
    banner.showTextOverlay = req.body.showTextOverlay === 'true' || req.body.showTextOverlay === true;
  }
  if (req.body.order !== undefined) banner.order = parseInt(req.body.order);
  if (req.body.isActive !== undefined) banner.isActive = req.body.isActive;
  if (req.body.startDate !== undefined) banner.startDate = req.body.startDate ? new Date(req.body.startDate) : null;
  if (req.body.endDate !== undefined) banner.endDate = req.body.endDate ? new Date(req.body.endDate) : null;

  await banner.save();

  res.status(200).json({
    success: true,
    message: 'Banner updated successfully',
    data: banner
  });
});

/**
 * Admin: Delete banner
 * DELETE /api/admin/banners/:id
 */
const adminDeleteBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const banner = await Banner.findById(id);

  if (!banner) {
    throw new ApiError(404, 'Banner not found');
  }

  // Cleanup Cloudinary file if it exists
  if (banner.image?.publicId) {
    try {
      await deleteFile(banner.image.publicId);
    } catch (e) {
      // ignore cleanup errors
    }
  }

  await Banner.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Banner deleted successfully'
  });
});

/**
 * Admin: Toggle active/inactive status
 * PATCH /api/admin/banners/:id/toggle
 */
const adminToggleBannerStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const banner = await Banner.findById(id);

  if (!banner) {
    throw new ApiError(404, 'Banner not found');
  }

  banner.isActive = !banner.isActive;
  await banner.save();

  res.status(200).json({
    success: true,
    message: `Banner is now ${banner.isActive ? 'Active' : 'Inactive'}`,
    data: banner
  });
});

/**
 * Admin: Reorder banners in bulk
 * POST /api/admin/banners/reorder
 */
const adminReorderBanners = asyncHandler(async (req, res) => {
  const { items } = req.body; // array of { id, order }

  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'Invalid items array for reordering');
  }

  const bulkOps = items.map((item) => ({
    updateOne: {
      filter: { _id: item.id },
      update: { $set: { order: item.order } }
    }
  }));

  await Banner.bulkWrite(bulkOps);

  res.status(200).json({
    success: true,
    message: 'Banner display orders updated successfully'
  });
});

/**
 * Admin / Public: Get CMS Configuration (Announcement bar, Hero settings)
 * GET /api/admin/cms
 */
const getCMSConfig = asyncHandler(async (req, res) => {
  const config = await CMS.getConfig();

  res.status(200).json({
    success: true,
    data: config
  });
});

/**
 * Admin: Update CMS Configuration
 * PUT /api/admin/cms
 */
const updateCMSConfig = asyncHandler(async (req, res) => {
  const config = await CMS.getConfig();

  if (req.body.announcement) {
    config.announcement = {
      ...config.announcement.toObject(),
      ...req.body.announcement
    };
  }

  if (req.body.heroSettings) {
    config.heroSettings = {
      ...config.heroSettings.toObject(),
      ...req.body.heroSettings
    };
  }

  if (req.body.promoSection) {
    config.promoSection = {
      ...config.promoSection.toObject(),
      ...req.body.promoSection
    };
  }

  if (req.body.logo) {
    const incomingLogo = { ...req.body.logo };
    if (incomingLogo.height !== undefined && incomingLogo.height !== null && incomingLogo.height !== '') {
      incomingLogo.height = parseInt(incomingLogo.height, 10) || 44;
    }
    if (incomingLogo.adminHeight !== undefined && incomingLogo.adminHeight !== null && incomingLogo.adminHeight !== '') {
      incomingLogo.adminHeight = parseInt(incomingLogo.adminHeight, 10) || 38;
    }
    config.logo = {
      ...(config.logo ? config.logo.toObject() : {}),
      ...incomingLogo
    };
  }

  await config.save();

  res.status(200).json({
    success: true,
    message: 'CMS configuration updated successfully',
    data: config
  });
});

/**
 * Admin: Upload and update store logo in CMS
 * POST /api/admin/cms/logo or POST /api/banners/admin/cms/logo
 */
const uploadCMSLogo = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'Logo image file is required');
  }

  const config = await CMS.getConfig();
  let uploadedUrl = '';
  let uploadedPublicId = null;

  try {
    const uploadRes = await uploadFile(req.file.path, {
      folder: 'vectorx/logo',
      transformation: [{ quality: 'auto', fetch_format: 'auto' }]
    });
    uploadedUrl = uploadRes.secure_url;
    uploadedPublicId = uploadRes.public_id;
  } catch (err) {
    console.warn('Cloudinary upload failed, using local public asset fallback:', err.message);
    const fs = require('fs');
    const path = require('path');
    const targetDir = path.join(__dirname, '../../../client/public/uploads');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const filename = `logo-${Date.now()}${path.extname(req.file.originalname || '.png')}`;
    const targetPath = path.join(targetDir, filename);
    fs.copyFileSync(req.file.path, targetPath);
    uploadedUrl = `/uploads/${filename}`;
    uploadedPublicId = null;
  } finally {
    const fs = require('fs');
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
  }

  // Cleanup old Cloudinary image if it exists
  if (config.logo?.publicId) {
    try {
      await deleteFile(config.logo.publicId);
    } catch (e) {}
  }

  config.logo = {
    ...(config.logo ? config.logo.toObject() : {}),
    imageUrl: uploadedUrl,
    publicId: uploadedPublicId,
    type: config.logo?.type === 'default' ? 'both' : (config.logo?.type || 'both')
  };

  await config.save();

  res.status(200).json({
    success: true,
    message: 'Logo uploaded and updated successfully',
    data: config
  });
});

module.exports = {
  getActiveBanners,
  getHomepageCMS,
  trackBannerClick,
  adminGetBanners,
  adminCreateBanner,
  adminGetBannerById,
  adminUpdateBanner,
  adminDeleteBanner,
  adminToggleBannerStatus,
  adminReorderBanners,
  getCMSConfig,
  updateCMSConfig,
  uploadCMSLogo
};
