// vectorx-backend/src/services/product.service.js
const Product = require('../models/Product.model');
const Seller = require('../models/Seller.model');
const Category = require('../models/Category.model');
const { validateCoordinates } = require('./geo.service');
const ApiError = require('../utils/ApiError');
const cloudinary = require('../config/cloudinary');

class ProductService {
  // Create a new product
  static async createProduct(sellerId, productData) {
    // Verify seller exists and is verified
    const seller = await Seller.findOne({ 
      user: sellerId,
      verificationStatus: 'approved',
      isVerified: true
    });
    
    if (!seller) {
      throw new ApiError(403, 'Seller not verified or not found');
    }
    
    // Validate category
    const category = await Category.findOne({
      _id: productData.category,
      isActive: true
    });
    
    if (!category) {
      throw new ApiError(400, 'Invalid category');
    }
    
    // Get seller's location
    const sellerLocation = seller.location;
    if (!sellerLocation || !sellerLocation.coordinates) {
      throw new ApiError(400, 'Seller location not set');
    }
    
    // Validate coordinates
    const [lng, lat] = sellerLocation.coordinates;
    if (!validateCoordinates(lng, lat)) {
      throw new ApiError(400, 'Invalid seller coordinates');
    }
    
    // Prepare product data
    const productDataToSave = {
      ...productData,
      sellerId: seller._id,
      location: {
        type: 'Point',
        coordinates: sellerLocation.coordinates
      }
    };
    
    // Create product
    const product = new Product(productDataToSave);
    await product.save();
    
    return product;
  }
  
  // Update product
  static async updateProduct(sellerId, productId, updateData) {
    // Find product and verify ownership
    const product = await Product.findOne({
      _id: productId,
      sellerId: sellerId,
      isActive: true
    });
    
    if (!product) {
      throw new ApiError(404, 'Product not found or access denied');
    }
    
    // Update fields
    Object.keys(updateData).forEach(key => {
      if (key !== 'sellerId' && key !== 'location') {
        product[key] = updateData[key];
      }
    });
    
    await product.save();
    return product;
  }
  
  // Delete product (soft delete)
  static async deleteProduct(sellerId, productId) {
    const product = await Product.findOne({
      _id: productId,
      sellerId: sellerId
    });
    
    if (!product) {
      throw new ApiError(404, 'Product not found or access denied');
    }
    
    // Soft delete
    product.isActive = false;
    await product.save();
    
    // Optionally delete images from Cloudinary
    if (product.images && product.images.length > 0) {
      const publicIds = product.images.map(img => img.publicId);
      await cloudinary.api.delete_resources(publicIds);
    }
    
    return product;
  }
  
  // Get product by ID with access control
  static async getProductById(productId, includeInactive = false) {
    const query = { _id: productId };
    if (!includeInactive) {
      query.isActive = true;
    }
    
    const product = await Product.findOne(query)
      .populate('sellerId', 'shopName shopAddress location')
      .populate('category', 'name slug');
    
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }
    
    return product;
  }
  
  // Get products with location-based sorting
  static async getProductsWithLocation(lat, lng, filters = {}, page = 1, limit = 20) {
    const hasValidCoords = validateCoordinates(lng, lat);
    const skip = (page - 1) * limit;
    
    // Build filter
    const filter = { isActive: true };
    
    if (filters.category) {
      filter.category = filters.category;
    }
    
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      filter.price = {};
      if (filters.minPrice !== undefined) filter.price.$gte = parseFloat(filters.minPrice);
      if (filters.maxPrice !== undefined) filter.price.$lte = parseFloat(filters.maxPrice);
    }
    
    if (filters.tags && filters.tags.length > 0) {
      filter.tags = { $in: filters.tags };
    }
    
    if (filters.rating) {
      filter['rating.average'] = { $gte: parseFloat(filters.rating) };
    }
    
    if (filters.isFeatured !== undefined) {
      filter.isFeatured = filters.isFeatured === 'true';
    }
    
    if (filters.sellerId) {
      filter.sellerId = filters.sellerId;
    }
    
    let result;
    let sortedBy = 'popularity';
    let fallbackUsed = false;
    
    if (hasValidCoords) {
      // Use $geoNear for distance sorting
      const pipeline = [
        { $match: filter },
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [parseFloat(lng), parseFloat(lat)]
            },
            distanceField: 'distance',
            spherical: true,
            key: 'location'
          }
        },
        { $skip: skip },
        { $limit: parseInt(limit) }
      ];
      
      // Add sorting if not distance-based
      if (filters.sort) {
        if (filters.sort === 'price_low_to_high') {
          pipeline.push({ $sort: { price: 1 } });
        } else if (filters.sort === 'price_high_to_low') {
          pipeline.push({ $sort: { price: -1 } });
        } else if (filters.sort === 'rating') {
          pipeline.push({ $sort: { 'rating.average': -1, 'rating.count': -1 } });
        }
      }
      
      const products = await Product.aggregate(pipeline);
      const total = await Product.countDocuments(filter);
      
      result = {
        products,
        total,
        sortedBy: 'distance',
        fallbackUsed: false
      };
    } else {
      // Fallback: sort by rating/popularity
      let sortQuery = { 'rating.average': -1, 'rating.count': -1 };
      
      if (filters.sort) {
        if (filters.sort === 'price_low_to_high') {
          sortQuery = { price: 1 };
        } else if (filters.sort === 'price_high_to_low') {
          sortQuery = { price: -1 };
        } else if (filters.sort === 'newest') {
          sortQuery = { createdAt: -1 };
        }
      }
      
      const products = await Product.find(filter)
        .sort(sortQuery)
        .skip(skip)
        .limit(parseInt(limit));
      
      const total = await Product.countDocuments(filter);
      
      result = {
        products,
        total,
        sortedBy: 'popularity',
        fallbackUsed: true
      };
    }
    
    return result;
  }
  
  // Upload product images
  static async uploadImages(files, sellerId, productId) {
    const product = await Product.findOne({
      _id: productId,
      sellerId: sellerId
    });
    
    if (!product) {
      throw new ApiError(404, 'Product not found or access denied');
    }
    
    // Limit images
    const currentImageCount = product.images.length;
    const remainingSlots = 10 - currentImageCount;
    
    if (files.length > remainingSlots) {
      throw new ApiError(400, `Maximum 10 images allowed. You have ${remainingSlots} slots remaining.`);
    }
    
    const uploadPromises = files.map(file => 
      cloudinary.uploader.upload(file.path, {
        folder: `vectorx/products/${productId}`,
        transformation: [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto' }
        ]
      })
    );
    
    const results = await Promise.all(uploadPromises);
    
    const images = results.map((result, index) => ({
      url: result.secure_url,
      publicId: result.public_id,
      isPrimary: currentImageCount === 0 && index === 0 // First image is primary
    }));
    
    product.images.push(...images);
    await product.save();
    
    return product.images;
  }
  
  // Remove product image
  static async removeImage(sellerId, productId, imageId) {
    const product = await Product.findOne({
      _id: productId,
      sellerId: sellerId
    });
    
    if (!product) {
      throw new ApiError(404, 'Product not found or access denied');
    }
    
    const image = product.images.id(imageId);
    if (!image) {
      throw new ApiError(404, 'Image not found');
    }
    
    // Delete from Cloudinary
    if (image.publicId) {
      await cloudinary.uploader.destroy(image.publicId);
    }
    
    // Remove image
    product.images.pull(imageId);
    
    // If removed primary image, set another as primary
    if (image.isPrimary && product.images.length > 0) {
      product.images[0].isPrimary = true;
    }
    
    await product.save();
    return product.images;
  }
  
  // Set primary image
  static async setPrimaryImage(sellerId, productId, imageId) {
    const product = await Product.findOne({
      _id: productId,
      sellerId: sellerId
    });
    
    if (!product) {
      throw new ApiError(404, 'Product not found or access denied');
    }
    
    const image = product.images.id(imageId);
    if (!image) {
      throw new ApiError(404, 'Image not found');
    }
    
    // Unset all primary flags
    product.images.forEach(img => img.isPrimary = false);
    image.isPrimary = true;
    
    await product.save();
    return product.images;
  }
  
  // Update product stock
  static async updateStock(sellerId, productId, quantity) {
    const product = await Product.findOne({
      _id: productId,
      sellerId: sellerId
    });
    
    if (!product) {
      throw new ApiError(404, 'Product not found or access denied');
    }
    
    if (quantity < 0) {
      throw new ApiError(400, 'Quantity cannot be negative');
    }
    
    product.stock = quantity;
    product.isInStock = quantity > 0;
    await product.save();
    
    return product;
  }
}

module.exports = ProductService;