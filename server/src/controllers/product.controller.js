// vectorx-backend/src/controllers/product.controller.js
const productService = require('../services/product.service');
const geoService = require('../services/geo.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ORDER_STATUS } = require('../models/Order.model');
const Product = require('../models/Product.model');
const Order = require('../models/Order.model');

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

  if (category) filters.category = category;
  if (subCategory) filters.subCategory = subCategory;
  if (sellerId) filters.sellerId = sellerId;
  if (isFeatured === 'true') filters.isFeatured = true;

  // Price range
  if (minPrice || maxPrice) {
    filters.price = {};
    if (minPrice) filters.price.$gte = parseFloat(minPrice);
    if (maxPrice) filters.price.$lte = parseFloat(maxPrice);
  }

  // Minimum rating
  if (minRating) {
    filters['rating.average'] = { $gte: parseFloat(minRating) };
  }

  // Text search
  if (search) {
    filters.$text = { $search: search };
  }

  // Check if location is provided
  const hasLocation = lat && lng &&
    !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));

  let products;
  let sortedBy = sort;
  let fallbackUsed = false;

  if (hasLocation && (sort === 'distance' || !sort)) {
    // Use geospatial sorting
    const result = await geoService.getSortedProducts(Product, {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      category: filters.category,
      minPrice: filters.price?.$gte,
      maxPrice: filters.price?.$lte,
      page: pageNum,
      limit: limitNum
    });

    products = result.products;
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

    const totalCount = await Product.countDocuments(filters);
    const totalPages = Math.ceil(totalCount / limitNum);

    products = await query
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('category', 'name slug')
      .populate('sellerId', 'shopName isVerified')
      .lean();

    sortedBy = sort;
    fallbackUsed = !hasLocation;

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
        distanceKm: product.distanceKm || 0,
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
      totalPages: Math.ceil(productsWithSeller.length / limitNum),
      totalResults: productsWithSeller.length
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
      .populate('category', 'name slug')
      .populate('sellerId', 'shopName shopAddress isVerified verificationStatus')
      .populate({
        path: 'reviews.userId',
        select: 'name'
      });
  } else {
    product = await Product.findBySlug(id)
      .populate('category', 'name slug')
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

  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const related = await Product.find({
    _id: { $ne: id },
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
    .populate('category', 'name slug')
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
 * Submit a review for a product
 * POST /api/products/:id/reviews
 * Body: rating, title, comment, orderId
 */
const submitReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { rating, title, comment, orderId, images } = req.body;

  // Validate rating
  if (!rating || rating < 1 || rating > 5) {
    throw new ApiError(400, 'Rating must be between 1 and 5');
  }

  // Check if product exists
  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Verify order exists and is delivered
  const order = await Order.findOne({
    _id: orderId,
    userId: userId,
    'items.productId': id,
    status: ORDER_STATUS.DELIVERED
  });

  if (!order) {
    throw new ApiError(403, 'You can only review products from delivered orders');
  }

  // Check if user already reviewed this product from this order
  const existingReview = product.reviews.find(
    r => r.userId.toString() === userId.toString() &&
      r.orderId.toString() === orderId.toString()
  );

  if (existingReview) {
    throw new ApiError(400, 'You have already reviewed this product for this order');
  }

  // Add review
  const reviewData = {
    userId,
    orderId,
    rating,
    title: title || '',
    comment: comment || '',
    images: images || [],
    isVerifiedPurchase: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  product.reviews.push(reviewData);
  product.updateRatingStats();
  await product.save();

  // Get the newly added review (last in array)
  const newReview = product.reviews[product.reviews.length - 1];

  // Mark order as reviewed if all products are reviewed
  const allItems = order.items.map(item => item.productId.toString());
  const reviewedItems = product.reviews
    .filter(r => r.orderId.toString() === orderId.toString())
    .map(r => r.productId.toString());

  const allReviewed = allItems.every(itemId => reviewedItems.includes(itemId));

  if (allReviewed) {
    order.isReviewed = true;
    await order.save();
  }

  res.status(201).json({
    success: true,
    data: {
      review: {
        id: newReview._id,
        rating: newReview.rating,
        title: newReview.title,
        comment: newReview.comment,
        images: newReview.images,
        isVerifiedPurchase: newReview.isVerifiedPurchase,
        createdAt: newReview.createdAt,
        user: {
          id: req.user.id,
          name: req.user.name
        }
      },
      productRating: product.rating
    },
    message: 'Review submitted successfully'
  });
});

/**
 * Get product reviews
 * GET /api/products/:id/reviews
 * Query: page, limit, sort
 */
const getProductReviews = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
  const sort = req.query.sort || 'newest'; // newest, helpful, highest, lowest

  const product = await Product.findById(id)
    .populate({
      path: 'reviews.userId',
      select: 'name'
    });

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  let reviews = product.reviews || [];

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
    case 'newest':
    default:
      reviews = reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  const totalCount = reviews.length;
  const totalPages = Math.ceil(totalCount / limit);
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
  const userId = req.user.id;

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const review = product.reviews.id(reviewId);
  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  // Don't allow reporting your own review
  if (review.userId.toString() === userId) {
    throw new ApiError(400, 'You cannot report your own review');
  }

  review.reported = true;
  await product.save();

  res.status(200).json({
    success: true,
    message: 'Review reported successfully'
  });
});

/**
 * Mark review as helpful
 * POST /api/products/:productId/reviews/:reviewId/helpful
 */
const markReviewHelpful = asyncHandler(async (req, res) => {
  const { productId, reviewId } = req.params;

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const review = product.reviews.id(reviewId);
  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  review.helpful = (review.helpful || 0) + 1;
  await product.save();

  res.status(200).json({
    success: true,
    data: { helpful: review.helpful },
    message: 'Review marked as helpful'
  });
});

module.exports = {
  getProducts,
  getProductById,
  getRelatedProducts,
  getProductsBySeller,
  submitReview,
  getProductReviews,
  reportReview,
  markReviewHelpful
};