// vectorx-backend/src/controllers/product.controller.js
const productService = require('../services/product.service');
const geoService = require('../services/geo.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Order, ORDER_STATUS } = require('../models/Order.model');
const Product = require('../models/Product.model');
const Category = require('../models/Category.model');
const mongoose = require('mongoose');
const fs = require('fs');
const { uploadProductImage: uploadProdImg, uploadProductVideo: uploadProdVid } = require('../config/cloudinary');

/**
 * Get public active categories
 * GET /api/products/categories
 */
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
  res.status(200).json({
    success: true,
    data: categories
  });
});

/**
 * Get products with location-based sorting
 * GET /api/products
 * Query: lat, lng, category, subCategory, minPrice, maxPrice, 
 *         sort, page, limit, search, sellerId
 */
const getProducts = asyncHandler(async (req, res) => {
  const {
    lat,
    lng,
    category,
    subCategory,
    minPrice,
    maxPrice,
    sort = 'distance',
    page = 1,
    limit = 20,
    search,
    sellerId,
    isFeatured,
    minRating
  } = req.query;

  // Parse pagination
  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 100); // Max 100 per page

  // Build filter object
  const filters = {
    isActive: true,
    isApproved: true
  };

  // Safe Category resolution (ID or slug or name)
  if (category && String(category).trim() !== '' && String(category).trim() !== 'all') {
    const catStr = String(category).trim();
    if (mongoose.Types.ObjectId.isValid(catStr) && /^[0-9a-fA-F]{24}$/.test(catStr)) {
      filters.category = new mongoose.Types.ObjectId(catStr);
    } else {
      const catDoc = await Category.findOne({
        isActive: true,
        $or: [
          { slug: catStr.toLowerCase() },
          { name: { $regex: new RegExp(`^${catStr}$`, 'i') } }
        ]
      });

      if (catDoc) {
        filters.category = catDoc._id;
      } else {
        // Not found: set to a valid non-matching ObjectId so it returns 0 items rather than crashing
        filters.category = new mongoose.Types.ObjectId();
      }
    }
  }

  // Safe SubCategory resolution
  if (subCategory && String(subCategory).trim() !== '') {
    const subStr = String(subCategory).trim();
    if (mongoose.Types.ObjectId.isValid(subStr) && /^[0-9a-fA-F]{24}$/.test(subStr)) {
      filters.subCategory = new mongoose.Types.ObjectId(subStr);
    } else {
      const subCatDoc = await Category.findOne({
        isActive: true,
        $or: [
          { slug: subStr.toLowerCase() },
          { name: { $regex: new RegExp(`^${subStr}$`, 'i') } }
        ]
      });

      if (subCatDoc) {
        filters.subCategory = subCatDoc._id;
      } else {
        filters.subCategory = new mongoose.Types.ObjectId();
      }
    }
  }

  // Safe SellerId resolution
  if (sellerId && String(sellerId).trim() !== '') {
    const sellerStr = String(sellerId).trim();
    if (mongoose.Types.ObjectId.isValid(sellerStr) && /^[0-9a-fA-F]{24}$/.test(sellerStr)) {
      filters.sellerId = new mongoose.Types.ObjectId(sellerStr);
    } else {
      filters.sellerId = sellerStr;
    }
  }

  if (isFeatured === 'true' || isFeatured === true) {
    filters.isFeatured = true;
  }

  // Price range
  if (minPrice || maxPrice) {
    filters.price = {};
    if (minPrice && !isNaN(parseFloat(minPrice))) filters.price.$gte = parseFloat(minPrice);
    if (maxPrice && !isNaN(parseFloat(maxPrice))) filters.price.$lte = parseFloat(maxPrice);
  }

  // Minimum rating
  if (minRating && !isNaN(parseFloat(minRating))) {
    filters['rating.average'] = { $gte: parseFloat(minRating) };
  }

  // Check if location is provided
  const hasLocation = lat && lng &&
    !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));

  // Text search
  if (search && String(search).trim() !== '') {
    const trimmedSearch = String(search).trim();
    if (hasLocation && (sort === 'distance' || !sort)) {
      filters.$or = [
        { name: { $regex: trimmedSearch, $options: 'i' } },
        { description: { $regex: trimmedSearch, $options: 'i' } },
        { tags: { $regex: trimmedSearch, $options: 'i' } }
      ];
    } else {
      filters.$text = { $search: trimmedSearch };
    }
  }

  let products;
  let sortedBy = sort;
  let fallbackUsed = false;
  let totalCount = 0;

  if (hasLocation && (sort === 'distance' || !sort)) {
    // Use geospatial sorting
    const result = await geoService.getSortedProducts(Product, {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      filters,
      page: pageNum,
      limit: limitNum
    });

    products = result.products;
    totalCount = result.total || 0;
    fallbackUsed = result.fallbackUsed || false;
    sortedBy = 'distance';
  } else {
    // Fallback to popularity/rating sorting
    const sortOptions = {};

    switch (sort) {
      case 'popularity':
        sortOptions['rating.average'] = -1;
        sortOptions['rating.count'] = -1;
        break;
      case 'price_asc':
        sortOptions.price = 1;
        break;
      case 'price_desc':
        sortOptions.price = -1;
        break;
      case 'newest':
        sortOptions.createdAt = -1;
        break;
      case 'rating':
        sortOptions['rating.average'] = -1;
        break;
      default:
        sortOptions['rating.average'] = -1;
        sortOptions['rating.count'] = -1;
    }

    // Build query
    let query = Product.find(filters);

    if (search) {
      query = query.sort({ score: { $meta: 'textScore' } });
    } else {
      query = query.sort(sortOptions);
    }

    totalCount = await Product.countDocuments(filters);

    products = await query
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('category', 'name slug image')
      .populate('sellerId', 'shopName isVerified')
      .lean();

    sortedBy = sort || 'popularity';
    // Only set fallbackUsed if the user explicitly requested distance-based sorting but coordinates were unavailable
    fallbackUsed = Boolean(sort === 'distance' && !hasLocation);

    // Transform products with distance 0 (no location available)
    products = products.map(p => ({
      ...p,
      distanceKm: 0
    }));
  }

  // Get seller info for each product
  const productsWithSeller = await Promise.all(
    products.map(async (product) => {
      const seller = await product.sellerId ||
        await Product.populate(product, { path: 'sellerId', select: 'shopName isVerified' });

      return {
        id: product._id,
        _id: product._id,
        name: product.name,
        slug: product.slug,
        description: product.shortDescription || product.description,
        price: product.price,
        comparePrice: product.comparePrice,
        discountPercentage: product.comparePrice ?
          Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100) : 0,
        images: product.images || [],
        primaryImage: product.getPrimaryImage ?
          product.getPrimaryImage() :
          (product.images && product.images.length > 0 ? product.images[0] : null),
        rating: product.rating || { average: 0, count: 0 },
        stock: product.stock,
        isInStock: product.stock > 0,
        category: product.category,
        sellerId: product.sellerId?._id || product.sellerId,
        shopName: product.sellerId?.shopName || 'Unknown Seller',
        sellerVerified: product.sellerId?.isVerified || false,
        distanceKm: product.distanceKm !== undefined ? product.distanceKm : (product.distance ? (product.distance / 1000) : 0),
        video: product.video || null,
        variants: product.variants || [],
        hasVariants: product.hasVariants || false,
        isFeatured: product.isFeatured || false,
        createdAt: product.createdAt
      };
    })
  );

  res.status(200).json({
    success: true,
    data: {
      products: productsWithSeller,
      sortedBy,
      fallbackUsed,
      filters: {
        category,
        subCategory,
        minPrice,
        maxPrice,
        search
      }
    },
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum) || 1,
      totalResults: totalCount
    }
  });
});

/**
 * Get single product by ID or slug
 * GET /api/products/:id
 */
const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if ID is a valid ObjectId or slug
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

  let product;
  if (isObjectId) {
    product = await Product.findById(id)
      .populate('category', 'name slug image')
      .populate('sellerId', 'shopName shopAddress isVerified verificationStatus')
      .populate({
        path: 'reviews.userId',
        select: 'name'
      });
  } else {
    product = await Product.findBySlug(id)
      .populate('category', 'name slug image')
      .populate('sellerId', 'shopName shopAddress isVerified verificationStatus')
      .populate({
        path: 'reviews.userId',
        select: 'name'
      });
  }

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  if (!product.isActive || !product.isApproved) {
    throw new ApiError(404, 'Product not available');
  }

  // Format response
  const response = {
    id: product._id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    shortDescription: product.shortDescription,
    price: product.price,
    comparePrice: product.comparePrice,
    discountPercentage: product.getDiscountPercentage ?
      product.getDiscountPercentage() : 0,
    images: product.images || [],
    primaryImage: product.getPrimaryImage ?
      product.getPrimaryImage() :
      (product.images && product.images.length > 0 ? product.images[0] : null),
    video: product.video || null,
    category: product.category,
    subCategory: product.subCategory,
    tags: product.tags || [],
    variants: product.variants || [],
    hasVariants: product.hasVariants || false,
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    isInStock: product.isInStock || product.stock > 0,
    sku: product.sku,
    rating: product.rating || { average: 0, count: 0 },
    reviewBreakdown: product.reviewBreakdown || null,
    reviews: product.reviews ? product.reviews.slice(0, 10) : [],
    reviewsCount: product.reviews ? product.reviews.length : 0,
    seller: {
      id: product.sellerId?._id || product.sellerId,
      shopName: product.sellerId?.shopName || 'Unknown Seller',
      shopAddress: product.sellerId?.shopAddress || null,
      isVerified: product.sellerId?.isVerified || false,
      verificationStatus: product.sellerId?.verificationStatus || 'pending'
    },
    deliveryInfo: product.deliveryInfo || {
      handlingTime: '2-3 days',
      returnPolicy: '7 days',
      isReturnable: true
    },
    seo: product.seo || null,
    isFeatured: product.isFeatured || false,
    isActive: product.isActive,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  };

  res.status(200).json({
    success: true,
    data: response
  });
});

/**
 * Get related products (same category)
 * GET /api/products/:id/related
 * Query: limit (default 6)
 */
const getRelatedProducts = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const limit = parseInt(req.query.limit, 10) || 6;

  const isObjectId = mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
  const product = isObjectId ? await Product.findById(id) : await Product.findOne({ slug: id });
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const related = await Product.find({
    _id: { $ne: product._id },
    category: product.category,
    isActive: true,
    isApproved: true
  })
    .sort({ 'rating.average': -1 })
    .limit(limit)
    .populate('sellerId', 'shopName')
    .lean();

  const formattedRelated = related.map(p => ({
    id: p._id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    comparePrice: p.comparePrice,
    discountPercentage: p.comparePrice ?
      Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100) : 0,
    images: p.images || [],
    primaryImage: p.images && p.images.length > 0 ? p.images[0] : null,
    video: p.video || null,
    variants: p.variants || [],
    rating: p.rating || { average: 0, count: 0 },
    stock: p.stock,
    shopName: p.sellerId?.shopName || 'Unknown Seller',
    distanceKm: 0
  }));

  res.status(200).json({
    success: true,
    data: {
      products: formattedRelated,
      count: formattedRelated.length
    }
  });
});

/**
 * Get products by seller
 * GET /api/products/seller/:sellerId
 * Query: page, limit, status
 */
const getProductsBySeller = asyncHandler(async (req, res) => {
  const { sellerId } = req.params;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const status = req.query.status || 'active'; // 'active', 'inactive', 'all'

  // Verify seller exists
  const Seller = require('../models/Seller.model');
  const seller = await Seller.findById(sellerId);
  if (!seller) {
    throw new ApiError(404, 'Seller not found');
  }

  const filter = { sellerId };

  if (status === 'active') {
    filter.isActive = true;
    filter.isApproved = true;
  } else if (status === 'inactive') {
    filter.isActive = false;
  }
  // 'all' - no status filter

  const products = await Product.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('category', 'name slug image')
    .lean();

  const totalCount = await Product.countDocuments(filter);
  const totalPages = Math.ceil(totalCount / limit);

  const formattedProducts = products.map(p => ({
    id: p._id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    comparePrice: p.comparePrice,
    discountPercentage: p.comparePrice ?
      Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100) : 0,
    images: p.images || [],
    primaryImage: p.images && p.images.length > 0 ? p.images[0] : null,
    video: p.video || null,
    variants: p.variants || [],
    stock: p.stock,
    lowStockThreshold: p.lowStockThreshold || 5,
    isInStock: p.stock > 0,
    isActive: p.isActive,
    isFeatured: p.isFeatured || false,
    isApproved: p.isApproved,
    category: p.category,
    rating: p.rating || { average: 0, count: 0 },
    reviewsCount: p.reviews ? p.reviews.length : 0,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt
  }));

  res.status(200).json({
    success: true,
    data: {
      products: formattedProducts,
      seller: {
        id: seller._id,
        shopName: seller.shopName,
        isVerified: seller.isVerified,
        verificationStatus: seller.verificationStatus
      }
    },
    pagination: {
      page,
      limit,
      totalPages,
      totalCount
    }
  });
});

/**
 * Upload review image for buyers
 * POST /api/products/reviews/upload/image
 */
const uploadReviewImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No image file provided');
  }

  const result = await uploadProdImg(req.file.path);

  if (req.file.path && fs.existsSync(req.file.path)) {
    try {
      fs.unlinkSync(req.file.path);
    } catch {
      // non-fatal
    }
  }

  res.json({
    success: true,
    data: {
      url: result.url,
      publicId: result.publicId
    }
  });
});

/**
 * Upload review video for buyers
 * POST /api/products/reviews/upload/video
 */
const uploadReviewVideo = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No video file provided');
  }

  const result = await uploadProdVid(req.file.path);

  if (req.file.path && fs.existsSync(req.file.path)) {
    try {
      fs.unlinkSync(req.file.path);
    } catch {
      // non-fatal
    }
  }

  res.json({
    success: true,
    data: {
      url: result.url,
      publicId: result.publicId,
      thumbnail: result.thumbnail
    }
  });
});

/**
 * Submit a review for a product
 * POST /api/products/:id/reviews
 * Body: rating, title, comment, orderId, images, video
 */
const submitReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id?.toString() || req.user.id;
  const { rating, title, comment, orderId, images, video } = req.body;

  // Validate rating
  const numRating = Number(rating);
  if (!numRating || numRating < 1 || numRating > 5) {
    throw new ApiError(400, 'Rating must be between 1 and 5 stars');
  }

  // Check if product exists (by ObjectId or slug)
  const isObjectId = mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
  const product = isObjectId ? await Product.findById(id) : await Product.findOne({ slug: id });
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Verify order exists and is delivered (or Completed)
  let orderQuery = {
    userId: userId,
    'items.productId': product._id,
    status: { $in: [ORDER_STATUS.DELIVERED, 'Delivered', 'Completed'] }
  };
  if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
    orderQuery._id = orderId;
  }

  const order = await Order.findOne(orderQuery);

  if (!order) {
    throw new ApiError(403, 'Only verified buyers who have received this product (order marked Delivered) can submit a review.');
  }

  // Check if user already reviewed this product
  const existingReview = product.reviews.find(
    r => r.userId && r.userId.toString() === userId.toString()
  );

  if (existingReview) {
    throw new ApiError(400, 'You have already submitted a review for this product.');
  }

  // Format images
  let formattedImages = [];
  if (Array.isArray(images)) {
    formattedImages = images
      .map((img, idx) => {
        if (typeof img === 'string' && img.trim()) {
          return {
            url: img.trim(),
            publicId: `rev_img_${Date.now()}_${idx}`
          };
        }
        if (img && typeof img === 'object' && img.url) {
          return {
            url: img.url,
            publicId: img.publicId || `rev_img_${Date.now()}_${idx}`
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  // Format video
  let formattedVideo = { url: null, publicId: null, thumbnail: null };
  if (typeof video === 'string' && video.trim()) {
    formattedVideo = {
      url: video.trim(),
      publicId: `rev_vid_${Date.now()}`,
      thumbnail: null
    };
  } else if (video && typeof video === 'object' && video.url) {
    formattedVideo = {
      url: video.url.trim(),
      publicId: video.publicId || `rev_vid_${Date.now()}`,
      thumbnail: video.thumbnail || null
    };
  }

  // Add review
  const reviewData = {
    userId,
    orderId: order._id,
    rating: numRating,
    title: title ? String(title).trim() : '',
    comment: comment ? String(comment).trim() : '',
    images: formattedImages,
    video: formattedVideo,
    isVerifiedPurchase: true,
    helpful: 0,
    helpfulUsers: [],
    reported: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  product.reviews.push(reviewData);
  product.updateRatingStats();
  await product.save();

  // Populate newly added review
  await product.populate({
    path: 'reviews.userId',
    select: 'name email avatar'
  });

  const newReview = product.reviews[product.reviews.length - 1];

  // Mark order as reviewed if all products in order are reviewed
  try {
    const allItems = order.items.map(item => item.productId.toString());
    const reviewedItems = product.reviews
      .filter(r => r.orderId && r.orderId.toString() === order._id.toString())
      .map(r => r.productId ? r.productId.toString() : '');

    const allReviewed = allItems.every(itemId => reviewedItems.includes(itemId));
    if (allReviewed) {
      order.isReviewed = true;
      await order.save();
    }
  } catch {
    // Non-fatal
  }

  res.status(201).json({
    success: true,
    data: {
      review: newReview
    },
    message: 'Verified review submitted successfully'
  });
});

/**
 * Check if logged-in user can review a product
 * GET /api/products/:id/can-review
 */
const checkCanReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id?.toString() || req.user.id;

  const isObjectId = mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
  const product = isObjectId ? await Product.findById(id) : await Product.findOne({ slug: id });
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Check if user has a delivered order for this product
  const order = await Order.findOne({
    userId: userId,
    'items.productId': product._id,
    status: { $in: [ORDER_STATUS.DELIVERED, 'Delivered', 'Completed'] }
  }).sort({ createdAt: -1 });

  const hasPurchased = Boolean(order);
  const alreadyReviewed = Boolean(
    product.reviews?.some(
      r => r.userId && r.userId.toString() === userId.toString()
    )
  );

  res.json({
    success: true,
    data: {
      canReview: hasPurchased && !alreadyReviewed,
      hasPurchased,
      alreadyReviewed,
      orderId: order?._id || null
    }
  });
});

/**
 * Get product reviews
 * GET /api/products/:id/reviews
 * Query: page, limit, sort, hasMedia
 */
const getProductReviews = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
  const sort = req.query.sort || 'newest'; // newest, helpful, highest, lowest, media
  const hasMedia = req.query.hasMedia === 'true';

  const isObjectId = mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
  const query = isObjectId ? Product.findById(id) : Product.findOne({ slug: id });
  const product = await query
    .populate({
      path: 'reviews.userId',
      select: 'name email avatar'
    })
    .populate({
      path: 'reviews.reply.sellerId',
      select: 'shopName'
    });

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  let reviews = product.reviews || [];

  // Filter if only reviews with images/videos requested
  if (hasMedia) {
    reviews = reviews.filter(
      r => (r.images && r.images.length > 0) || (r.video && r.video.url)
    );
  }

  // Sort reviews
  switch (sort) {
    case 'helpful':
      reviews = reviews.sort((a, b) => (b.helpful || 0) - (a.helpful || 0));
      break;
    case 'highest':
      reviews = reviews.sort((a, b) => b.rating - a.rating);
      break;
    case 'lowest':
      reviews = reviews.sort((a, b) => a.rating - b.rating);
      break;
    case 'media':
      reviews = reviews.sort((a, b) => {
        const aHasMedia = (a.images?.length > 0 || a.video?.url) ? 1 : 0;
        const bHasMedia = (b.images?.length > 0 || b.video?.url) ? 1 : 0;
        return bHasMedia - aHasMedia;
      });
      break;
    case 'newest':
    default:
      reviews = reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  const totalCount = reviews.length;
  const totalPages = Math.ceil(totalCount / limit) || 1;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedReviews = reviews.slice(startIndex, endIndex);

  res.status(200).json({
    success: true,
    data: {
      reviews: paginatedReviews,
      ratingStats: product.rating,
      totalCount
    },
    pagination: {
      page,
      limit,
      totalPages,
      totalCount
    }
  });
});

/**
 * Report a review (for moderation)
 * POST /api/products/:productId/reviews/:reviewId/report
 */
const reportReview = asyncHandler(async (req, res) => {
  const { productId, reviewId } = req.params;
  const userId = req.user._id?.toString() || req.user.id;

  const isObjectId = mongoose.Types.ObjectId.isValid(productId) && /^[0-9a-fA-F]{24}$/.test(productId);
  const product = isObjectId ? await Product.findById(productId) : await Product.findOne({ slug: productId });
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const review = product.reviews.id(reviewId);
  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  // Don't allow reporting your own review
  if (review.userId && review.userId.toString() === userId) {
    throw new ApiError(400, 'You cannot report your own review');
  }

  review.reported = true;
  await product.save();

  res.status(200).json({
    success: true,
    message: 'Review reported successfully for moderation'
  });
});

/**
 * Mark review as helpful (or toggle helpful)
 * POST /api/products/:productId/reviews/:reviewId/helpful
 */
const markReviewHelpful = asyncHandler(async (req, res) => {
  const { productId, reviewId } = req.params;
  const userId = req.user._id?.toString() || req.user.id;

  const isObjectId = mongoose.Types.ObjectId.isValid(productId) && /^[0-9a-fA-F]{24}$/.test(productId);
  const product = isObjectId ? await Product.findById(productId) : await Product.findOne({ slug: productId });
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const review = product.reviews.id(reviewId);
  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  if (!review.helpfulUsers) {
    review.helpfulUsers = [];
  }

  const alreadyVoted = review.helpfulUsers.some(
    u => u && u.toString() === userId.toString()
  );

  if (alreadyVoted) {
    // Un-vote
    review.helpfulUsers = review.helpfulUsers.filter(
      u => u && u.toString() !== userId.toString()
    );
    review.helpful = Math.max(0, (review.helpful || 1) - 1);
  } else {
    // Vote
    review.helpfulUsers.push(userId);
    review.helpful = (review.helpful || 0) + 1;
  }

  await product.save();

  res.status(200).json({
    success: true,
    data: {
      helpful: review.helpful,
      isHelpful: !alreadyVoted
    },
    message: alreadyVoted ? 'Helpful vote removed' : 'Marked review as helpful'
  });
});

module.exports = {
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
};