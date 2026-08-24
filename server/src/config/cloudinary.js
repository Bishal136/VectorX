// src/config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const ApiError = require('../utils/ApiError');

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true // Use HTTPS
});

/**
 * Upload a single file to Cloudinary
 * @param {string} filePath - Local file path or base64 data URI
 * @param {Object} options - Upload options
 * @param {string} options.folder - Folder name in Cloudinary (default: 'vectorx')
 * @param {string} options.publicId - Custom public ID
 * @param {Object} options.transformation - Image transformation options
 * @returns {Promise<Object>} - Cloudinary upload result
 */
const uploadFile = async (filePath, options = {}) => {
  try {
    const uploadOptions = {
      folder: options.folder || 'vectorx',
      resource_type: 'auto',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
      ...options
    };

    // If it's a base64 string or URL, upload directly
    if (filePath.startsWith('data:') || filePath.startsWith('http')) {
      const result = await cloudinary.uploader.upload(filePath, uploadOptions);
      return result;
    }

    // If it's a local file path
    if (fs.existsSync(filePath)) {
      const result = await cloudinary.uploader.upload(filePath, uploadOptions);
      return result;
    }

    throw new ApiError(400, 'Invalid file path or format');
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new ApiError(500, 'Failed to upload file to Cloudinary');
  }
};

/**
 * Upload multiple files to Cloudinary
 * @param {string[]} filePaths - Array of file paths or base64 data URIs
 * @param {Object} options - Upload options
 * @returns {Promise<Array>} - Array of Cloudinary upload results
 */
const uploadMultipleFiles = async (filePaths, options = {}) => {
  try {
    const uploadPromises = filePaths.map(filePath => 
      uploadFile(filePath, options)
    );
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Cloudinary multiple upload error:', error);
    throw new ApiError(500, 'Failed to upload multiple files to Cloudinary');
  }
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - Public ID of the file to delete
 * @param {Object} options - Delete options
 * @returns {Promise<Object>} - Cloudinary delete result
 */
const deleteFile = async (publicId, options = {}) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      ...options
    });
    
    if (result.result === 'not found') {
      throw new ApiError(404, 'File not found in Cloudinary');
    }
    
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new ApiError(500, 'Failed to delete file from Cloudinary');
  }
};

/**
 * Delete multiple files from Cloudinary
 * @param {string[]} publicIds - Array of public IDs to delete
 * @returns {Promise<Array>} - Array of Cloudinary delete results
 */
const deleteMultipleFiles = async (publicIds) => {
  try {
    const deletePromises = publicIds.map(publicId => 
      deleteFile(publicId)
    );
    return await Promise.all(deletePromises);
  } catch (error) {
    console.error('Cloudinary multiple delete error:', error);
    throw new ApiError(500, 'Failed to delete multiple files from Cloudinary');
  }
};

/**
 * Get Cloudinary URL with transformations
 * @param {string} publicId - Public ID of the file
 * @param {Object} transformations - Transformation options
 * @returns {string} - Transformed URL
 */
const getOptimizedUrl = (publicId, transformations = {}) => {
  const defaultTransformations = {
    quality: 'auto',
    fetch_format: 'auto',
    width: 800,
    crop: 'fill',
    ...transformations
  };

  return cloudinary.url(publicId, {
    secure: true,
    transformation: [defaultTransformations]
  });
};

/**
 * Get thumbnail URL
 * @param {string} publicId - Public ID of the file
 * @param {number} width - Thumbnail width
 * @param {number} height - Thumbnail height
 * @returns {string} - Thumbnail URL
 */
const getThumbnailUrl = (publicId, width = 200, height = 200) => {
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      {
        width,
        height,
        crop: 'fill',
        gravity: 'auto',
        quality: 'auto',
        fetch_format: 'auto'
      }
    ]
  });
};

/**
 * Upload product image
 * @param {string} filePath - File path or base64 data URI
 * @param {string} productId - Product ID for folder organization
 * @returns {Promise<Object>} - Upload result with URL and publicId
 */
const uploadProductImage = async (filePath, productId = null) => {
  const folder = productId 
    ? `vectorx/products/${productId}` 
    : 'vectorx/products';

  const result = await uploadFile(filePath, {
    folder,
    transformation: [
      { width: 1200, crop: 'limit', quality: 'auto' },
      { fetch_format: 'auto' }
    ]
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes
  };
};

/**
 * Upload user avatar
 * @param {string} filePath - File path or base64 data URI
 * @param {string} userId - User ID for folder organization
 * @returns {Promise<Object>} - Upload result with URL and publicId
 */
const uploadUserAvatar = async (filePath, userId) => {
  const result = await uploadFile(filePath, {
    folder: `vectorx/users/${userId}/avatar`,
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' }
    ]
  });

  return {
    url: result.secure_url,
    publicId: result.public_id
  };
};

/**
 * Upload seller shop logo
 * @param {string} filePath - File path or base64 data URI
 * @param {string} sellerId - Seller ID for folder organization
 * @returns {Promise<Object>} - Upload result with URL and publicId
 */
const uploadShopLogo = async (filePath, sellerId) => {
  const result = await uploadFile(filePath, {
    folder: `vectorx/sellers/${sellerId}/logo`,
    transformation: [
      { width: 300, height: 300, crop: 'fill' },
      { quality: 'auto', fetch_format: 'auto' }
    ]
  });

  return {
    url: result.secure_url,
    publicId: result.public_id
  };
};

/**
 * Generate a signed upload URL for client-side uploads
 * @param {Object} options - Upload options
 * @returns {string} - Signed upload URL
 */
const getSignedUploadUrl = (options = {}) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = options.folder || 'vectorx';

  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder,
      ...options
    },
    process.env.CLOUDINARY_API_SECRET
  );

  return {
    url: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    params: {
      timestamp,
      folder,
      signature,
      api_key: process.env.CLOUDINARY_API_KEY,
      ...options
    }
  };
};

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string} - Public ID
 */
const extractPublicId = (url) => {
  const matches = url.match(/\/v\d+\/(.+)\.\w+$/);
  return matches ? matches[1] : null;
};

/**
 * Check if URL is from Cloudinary
 * @param {string} url - URL to check
 * @returns {boolean} - True if URL is from Cloudinary
 */
const isCloudinaryUrl = (url) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  return url && url.includes(`res.cloudinary.com/${cloudName}`);
};

/**
 * Upload product video to Cloudinary
 * @param {string} filePath - File path or base64 data URI
 * @param {string} productId - Product ID for folder organization
 * @returns {Promise<Object>} - Upload result with URL, publicId, and thumbnail
 */
const uploadProductVideo = async (filePath, productId = null) => {
  try {
    const folder = productId 
      ? `vectorx/products/${productId}/videos` 
      : 'vectorx/products/videos';

    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'video',
      chunk_size: 6000000,
    });

    const thumbnail = cloudinary.url(`${result.public_id}.jpg`, {
      resource_type: 'video',
      transformation: [
        { width: 600, height: 400, crop: 'fill', quality: 'auto' }
      ]
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      thumbnail: thumbnail || null,
      duration: result.duration || 0,
      format: result.format,
      bytes: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary video upload error:', error);
    throw new ApiError(500, 'Failed to upload video to Cloudinary');
  }
};

module.exports = {
  cloudinary,
  uploadFile,
  uploadMultipleFiles,
  deleteFile,
  deleteMultipleFiles,
  getOptimizedUrl,
  getThumbnailUrl,
  uploadProductImage,
  uploadProductVideo,
  uploadUserAvatar,
  uploadShopLogo,
  getSignedUploadUrl,
  extractPublicId,
  isCloudinaryUrl
};