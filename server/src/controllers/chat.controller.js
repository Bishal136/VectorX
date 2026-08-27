// server/src/controllers/chat.controller.js
const fs = require('fs');
const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { uploadFile } = require('../config/cloudinary');
const Conversation = require('../models/Conversation.model');
const Message = require('../models/Message.model');
const Seller = require('../models/Seller.model');
const Product = require('../models/Product.model');
const User = require('../models/User.model');

/**
 * Start or get an existing conversation with a seller
 * POST /api/chat/start
 * Body: { sellerId, productId, message }
 */
const startConversation = asyncHandler(async (req, res) => {
  const { sellerId, productId, message } = req.body;

  if (!sellerId) {
    throw new ApiError(400, 'sellerId is required');
  }

  // Find seller by sellerId or seller user ID
  let seller = null;
  const rawSellerId =
    typeof sellerId === 'object'
      ? (sellerId.id || sellerId._id || sellerId.sellerId || sellerId.user)
      : sellerId;

  if (rawSellerId && mongoose.Types.ObjectId.isValid(rawSellerId)) {
    seller = await Seller.findById(rawSellerId);
    if (!seller) {
      seller = await Seller.findOne({ user: rawSellerId });
    }
  }

  // If still not found and productId is provided, try looking up seller from product
  if (!seller && productId && mongoose.Types.ObjectId.isValid(productId)) {
    const prod = await Product.findById(productId);
    if (prod?.sellerId) {
      seller = await Seller.findById(prod.sellerId);
    }
  }

  if (!seller) {
    throw new ApiError(404, 'Seller profile not found');
  }

  // Prevent chatting with oneself if user is the seller
  if (seller.user.toString() === req.user.id.toString()) {
    throw new ApiError(400, 'You cannot start a chat with your own shop');
  }

  // Fetch optional product context
  let productContext = null;
  if (productId && mongoose.Types.ObjectId.isValid(productId)) {
    const product = await Product.findById(productId);
    if (product) {
      let primaryImg = null;
      if (product.images && product.images.length > 0) {
        primaryImg = typeof product.images[0] === 'string' ? product.images[0] : (product.images[0].url || null);
      }
      productContext = {
        productId: product._id,
        name: product.name,
        slug: product.slug,
        image: primaryImg,
        price: product.price
      };
    }
  }

  // Find or create distinct conversation per product (or general store chat)
  const conversationQuery = {
    customer: req.user.id,
    seller: seller._id
  };

  if (productContext?.productId) {
    conversationQuery['productContext.productId'] = productContext.productId;
  } else {
    // If general chat, match where no specific product is attached
    conversationQuery.$or = [
      { 'productContext.productId': { $exists: false } },
      { 'productContext.productId': null }
    ];
  }

  let conversation = await Conversation.findOne(conversationQuery);

  let isNew = false;
  if (!conversation) {
    conversation = new Conversation({
      participants: [req.user.id, seller.user],
      customer: req.user.id,
      seller: seller._id,
      sellerUser: seller.user,
      productContext: productContext || undefined,
      unreadCount: { customer: 0, seller: 0 }
    });
    isNew = true;
  } else if (productContext && (!conversation.productContext || !conversation.productContext.name)) {
    // Fill in product context snapshot if missing
    conversation.productContext = productContext;
  }

  // If an initial message was provided
  let createdMessage = null;
  if (message && String(message).trim()) {
    const msgText = String(message).trim();
    conversation.lastMessage = {
      text: msgText,
      sender: req.user.id,
      createdAt: new Date(),
      isRead: false
    };
    conversation.unreadCount.seller = (conversation.unreadCount.seller || 0) + 1;
    await conversation.save();

    createdMessage = await Message.create({
      conversationId: conversation._id,
      sender: req.user.id,
      senderRole: 'user',
      text: msgText,
      product: productContext || undefined
    });
  } else {
    await conversation.save();
  }

  // Populate conversation
  await conversation.populate([
    { path: 'customer', select: 'name email avatar' },
    { path: 'seller', select: 'shopName shopAddress isVerified' },
    { path: 'sellerUser', select: 'name email avatar' }
  ]);

  // Fetch messages for this conversation
  const messages = await Message.find({ conversationId: conversation._id })
    .sort({ createdAt: 1 })
    .lean();

  res.status(isNew ? 201 : 200).json({
    success: true,
    data: {
      conversation,
      messages,
      isNew
    }
  });
});

/**
 * Get all conversations for current user / seller
 * GET /api/chat/conversations
 * Query: role ('user' | 'seller')
 */
const getConversations = asyncHandler(async (req, res) => {
  const { role } = req.query;
  const userId = req.user.id;

  let query = {};

  if (role === 'seller') {
    const seller = await Seller.findOne({ user: userId });
    if (!seller) {
      return res.json({
        success: true,
        data: []
      });
    }
    query = {
      $or: [
        { sellerUser: userId },
        { seller: seller._id },
        { participants: userId }
      ]
    };
  } else {
    query = { customer: userId };
  }

  const conversations = await Conversation.find(query)
    .sort({ updatedAt: -1 })
    .populate('customer', 'name email avatar')
    .populate('seller', 'shopName shopAddress isVerified')
    .populate('sellerUser', 'name email avatar')
    .lean();

  res.json({
    success: true,
    data: conversations
  });
});

/**
 * Get single conversation and all its messages
 * GET /api/chat/conversations/:conversationId
 */
const getConversationMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.id;

  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new ApiError(400, 'Invalid conversation ID');
  }

  const conversation = await Conversation.findById(conversationId)
    .populate('customer', 'name email avatar')
    .populate('seller', 'shopName shopAddress isVerified')
    .populate('sellerUser', 'name email avatar');

  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  // Ensure requester is a participant
  const customerId = conversation.customer?._id?.toString() || conversation.customer?.toString();
  const sellerUserId = conversation.sellerUser?._id?.toString() || conversation.sellerUser?.toString();
  const isCustomer = customerId === userId.toString();
  const isSeller =
    sellerUserId === userId.toString() ||
    conversation.participants?.some((p) => p.toString() === userId.toString() && p.toString() !== customerId);

  if (!isCustomer && !isSeller) {
    throw new ApiError(403, 'Unauthorized access to this conversation');
  }

  // Clear unread count for current user
  let needsSave = false;
  if (isCustomer && conversation.unreadCount.customer > 0) {
    conversation.unreadCount.customer = 0;
    needsSave = true;
  }
  if (isSeller && conversation.unreadCount.seller > 0) {
    conversation.unreadCount.seller = 0;
    needsSave = true;
  }

  if (needsSave) {
    await conversation.save();
    // Mark messages from the other participant as read
    await Message.updateMany(
      {
        conversationId,
        sender: { $ne: userId },
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );
  }

  const messages = await Message.find({ conversationId })
    .sort({ createdAt: 1 })
    .lean();

  res.json({
    success: true,
    data: {
      conversation,
      messages
    }
  });
});

/**
 * Upload chat image attachment
 * POST /api/chat/upload
 */
const uploadChatAttachment = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No image file uploaded');
  }

  const result = await uploadFile(req.file.path, {
    folder: 'vectorx/chat',
    transformation: [{ width: 1200, crop: 'limit', quality: 'auto' }]
  });

  if (req.file.path && fs.existsSync(req.file.path)) {
    fs.unlinkSync(req.file.path);
  }

  res.status(200).json({
    success: true,
    data: {
      url: result.secure_url || result.url,
      publicId: result.public_id
    }
  });
});

/**
 * Send a message in a conversation
 * POST /api/chat/conversations/:conversationId/messages
 * Body: { text, images, product }
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { text, images, product } = req.body;
  const userId = req.user.id;

  const hasText = text && String(text).trim() !== '';
  const hasImages = Array.isArray(images) && images.length > 0;

  if (!hasText && !hasImages) {
    throw new ApiError(400, 'Message text or image attachment is required');
  }

  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new ApiError(400, 'Invalid conversation ID');
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  const customerId = conversation.customer?.toString();
  const sellerUserId = conversation.sellerUser?.toString();
  const isCustomer = customerId === userId.toString();
  const isSeller =
    sellerUserId === userId.toString() ||
    conversation.participants?.some((p) => p.toString() === userId.toString() && p.toString() !== customerId);

  if (!isCustomer && !isSeller) {
    throw new ApiError(403, 'Unauthorized to send messages in this conversation');
  }

  const senderRole = isCustomer ? 'user' : 'seller';
  const cleanText = hasText ? String(text).trim() : '';

  // Create message
  const message = await Message.create({
    conversationId: conversation._id,
    sender: userId,
    senderRole,
    text: cleanText,
    images: hasImages ? images : undefined,
    product: product || undefined
  });

  // Update conversation last message snippet
  const snippetText = cleanText || (hasImages ? '📷 Photo attachment' : 'New message');
  conversation.lastMessage = {
    text: snippetText,
    sender: userId,
    createdAt: new Date(),
    isRead: false
  };

  if (isCustomer) {
    conversation.unreadCount.seller = (conversation.unreadCount.seller || 0) + 1;
  } else {
    conversation.unreadCount.customer = (conversation.unreadCount.customer || 0) + 1;
  }

  if (product && (!conversation.productContext || !conversation.productContext.name)) {
    conversation.productContext = product;
  }

  await conversation.save();

  res.status(201).json({
    success: true,
    data: message
  });
});

/**
 * Mark conversation as read
 * PUT /api/chat/conversations/:conversationId/read
 */
const markConversationAsRead = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.id;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  const customerId = conversation.customer?.toString();
  const sellerUserId = conversation.sellerUser?.toString();
  const isCustomer = customerId === userId.toString();
  const isSeller =
    sellerUserId === userId.toString() ||
    conversation.participants?.some((p) => p.toString() === userId.toString() && p.toString() !== customerId);

  if (!isCustomer && !isSeller) {
    throw new ApiError(403, 'Unauthorized');
  }

  if (isCustomer) {
    conversation.unreadCount.customer = 0;
  } else {
    conversation.unreadCount.seller = 0;
  }

  await conversation.save();

  await Message.updateMany(
    {
      conversationId,
      sender: { $ne: userId },
      isRead: false
    },
    {
      isRead: true,
      readAt: new Date()
    }
  );

  res.json({
    success: true,
    message: 'Conversation marked as read'
  });
});

/**
 * Get unread messages count for badge
 * GET /api/chat/unread-count
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [customerConversations, sellerConversations] = await Promise.all([
    Conversation.find({ customer: userId }, 'unreadCount'),
    Conversation.find({ sellerUser: userId }, 'unreadCount')
  ]);

  const customerUnread = customerConversations.reduce((sum, c) => sum + (c.unreadCount?.customer || 0), 0);
  const sellerUnread = sellerConversations.reduce((sum, c) => sum + (c.unreadCount?.seller || 0), 0);

  res.json({
    success: true,
    data: {
      customerUnread,
      sellerUnread,
      totalUnread: customerUnread + sellerUnread
    }
  });
});

module.exports = {
  startConversation,
  getConversations,
  getConversationMessages,
  sendMessage,
  uploadChatAttachment,
  markConversationAsRead,
  getUnreadCount
};
