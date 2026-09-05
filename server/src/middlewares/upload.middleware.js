// src/middlewares/upload.middleware.js
const multer = require('multer');
const path = require('path');
const ApiError = require('../utils/ApiError');

// Configure storage
const storage = multer.diskStorage({
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for images
const imageFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/x-png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Invalid image format. Only JPEG, PNG, GIF, WEBP, and SVG are allowed'), false);
  }
};

// File filter for videos
const videoFilter = (req, file, cb) => {
  const allowedTypes = [
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/mpeg',
    'video/ogg'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Invalid video format. Only MP4, WebM, MOV, and AVI videos are allowed'), false);
  }
};

// Create multer instance for general images (10MB)
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: imageFilter
});

// Create multer instance for videos (100MB limit)
const uploadVideo = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: videoFilter
});

// Middleware for single file upload
const uploadSingle = (fieldName) => upload.single(fieldName);

// Middleware for multiple file upload
const uploadMultiple = (fieldName, maxCount = 10) => upload.array(fieldName, maxCount);

// Middleware for single video upload
const uploadSingleVideo = (fieldName) => uploadVideo.single(fieldName);

// Middleware for multiple fields
const uploadFields = (fields) => upload.fields(fields);

module.exports = {
  upload,
  uploadVideo,
  uploadSingle,
  uploadMultiple,
  uploadSingleVideo,
  uploadFields
};