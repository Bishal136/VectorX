const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { verifyToken } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const upload = require('../middlewares/upload.middleware').upload;
const {
  startConversation,
  getConversations,
  getConversationMessages,
  sendMessage,
  uploadChatAttachment,
  markConversationAsRead,
  getUnreadCount
} = require('../controllers/chat.controller');

// Validation Schemas
const startConversationSchema = Joi.object({
  sellerId: Joi.alternatives().try(Joi.string(), Joi.object()).required(),
  productId: Joi.string().optional().allow('', null),
  message: Joi.string().max(2000).optional().allow('')
});

const sendMessageSchema = Joi.object({
  text: Joi.string().max(2000).optional().allow(''),
  images: Joi.array()
    .items(
      Joi.object({
        url: Joi.string().required(),
        publicId: Joi.string().optional().allow('', null)
      })
    )
    .optional(),
  product: Joi.object({
    productId: Joi.string().optional(),
    name: Joi.string().optional(),
    slug: Joi.string().optional(),
    image: Joi.string().optional().allow(null, ''),
    price: Joi.number().optional()
  }).optional().allow(null)
}).or('text', 'images');

// All chat routes require authentication
router.use(verifyToken);

router.post('/start', validate(startConversationSchema), startConversation);
router.post('/upload', upload.single('image'), uploadChatAttachment);
router.get('/conversations', getConversations);
router.get('/conversations/:conversationId', getConversationMessages);
router.post('/conversations/:conversationId/messages', validate(sendMessageSchema), sendMessage);
router.put('/conversations/:conversationId/read', markConversationAsRead);
router.get('/unread-count', getUnreadCount);

module.exports = router;
