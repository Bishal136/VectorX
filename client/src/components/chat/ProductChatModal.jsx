import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
import {
  startChat,
  fetchConversationMessages,
  sendChatMessage,
  uploadChatImage,
  clearActiveConversation
} from '../../features/chat/chatSlice';
import Button from '../../components/common/Button';
import {
  Send,
  Store,
  ShieldCheck,
  ShoppingBag,
  Clock,
  Sparkles,
  User,
  X,
  Minus,
  Maximize2,
  Minimize2,
  Loader2,
  CheckCheck,
  Image as ImageIcon,
  Smile,
  ExternalLink,
  ThumbsUp,
  Heart,
  Flame,
  MessageCircle,
  Paperclip,
  Info,
  ChevronDown
} from 'lucide-react';

const QUICK_PROMPTS = [
  'Is this item currently in stock?',
  'How soon can this item be delivered?',
  'Is this product 100% authentic & genuine?',
  'Do you offer warranty or replacement?'
];

const EMOJIS = ['👍', '❤️', '🔥', '🎉', '😊', '👌'];

const ProductChatModal = ({ open, onClose, product, seller }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token, isAuthenticated, isInitializing } = useAuth();
  const isUserLoggedIn = Boolean(isAuthenticated || token || localStorage.getItem('accessToken'));

  const { activeConversation, messages = [], loading, sending } = useSelector((state) => state.chat);

  const [inputMessage, setInputMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); // { file, previewUrl, isUploading, url, publicId }
  const [activeLightboxImage, setActiveLightboxImage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const audioContextRef = useRef(null);

  const sellerId =
    (typeof seller === 'string' && seller) ||
    seller?.id ||
    seller?._id ||
    (typeof product?.seller === 'string' && product.seller) ||
    product?.seller?.id ||
    product?.seller?._id ||
    (typeof product?.sellerId === 'string' ? product.sellerId : null) ||
    product?.sellerId?.id ||
    product?.sellerId?._id ||
    null;

  const productId = product?.id || product?._id || product?.productId || null;

  const shopName =
    seller?.shopName ||
    product?.seller?.shopName ||
    product?.sellerId?.shopName ||
    'Store Merchant';

  const isVerified =
    seller?.isVerified ||
    product?.seller?.isVerified ||
    product?.sellerId?.isVerified ||
    false;

  // Extract primary product image
  const primaryImage =
    product?.primaryImage?.url ||
    (typeof product?.primaryImage === 'string' ? product.primaryImage : null) ||
    (product?.images && product.images.length > 0
      ? typeof product.images[0] === 'string'
        ? product.images[0]
        : product.images[0]?.url
      : null);

  // Play gentle sound chime on message arrival
  const playChime = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  };

  // Initialize chat when modal opens
  useEffect(() => {
    if (open && isUserLoggedIn && (sellerId || productId)) {
      dispatch(
        startChat({
          sellerId: sellerId || productId,
          productId
        })
      );
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [open, isUserLoggedIn, sellerId, productId, dispatch]);

  // Periodic polling for incoming messages while modal is active
  useEffect(() => {
    if (open && activeConversation?._id) {
      pollIntervalRef.current = setInterval(() => {
        dispatch(fetchConversationMessages(activeConversation._id));
      }, 4000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [open, activeConversation?._id, dispatch]);

  // Auto-scroll to bottom of message stream
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending, selectedImage]);

  // Handle Image File Selection
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, WEBP)');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image size must be less than 8MB');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setSelectedImage({
      file,
      previewUrl,
      isUploading: true,
      url: null,
      publicId: null
    });

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await dispatch(uploadChatImage(formData)).unwrap();
      setSelectedImage({
        file,
        previewUrl,
        isUploading: false,
        url: res.url,
        publicId: res.publicId
      });
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to upload image.');
      setSelectedImage(null);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    const hasImage = selectedImage?.url;

    if (!text && !hasImage) return;

    if (!isUserLoggedIn) {
      toast.info('Please log in to chat with the store seller.');
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }

    if (selectedImage?.isUploading) {
      toast.info('Image is still uploading, please wait a moment...');
      return;
    }

    const productContext = product
      ? {
          productId,
          name: product.name,
          slug: product.slug,
          image: primaryImage,
          price: product.price
        }
      : undefined;

    const imagesPayload = selectedImage?.url
      ? [{ url: selectedImage.url, publicId: selectedImage.publicId }]
      : undefined;

    setInputMessage('');
    setSelectedImage(null);
    setShowEmojiPicker(false);

    try {
      if (!activeConversation?._id) {
        // Auto start chat with initial message if conversation is still initializing
        await dispatch(
          startChat({
            sellerId: sellerId || productId,
            productId,
            message: text || 'Sent an attachment'
          })
        ).unwrap();
      } else {
        await dispatch(
          sendChatMessage({
            conversationId: activeConversation._id,
            text,
            images: imagesPayload,
            product: productContext
          })
        ).unwrap();
      }
      playChime();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to send message.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!open) return null;

  // Minimized Floating Bar (Adjusted on mobile above sticky bottom bar)
  if (isMinimized) {
    return (
      <div className="fixed bottom-20 sm:bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-200">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2.5 sm:gap-3 bg-[#124B38] hover:bg-[#0d382a] text-white p-2.5 px-3.5 sm:p-3 sm:px-4 rounded-full shadow-2xl border-2 border-emerald-400 transition cursor-pointer group"
        >
          <div className="relative">
            <Store className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-400 border border-white" />
          </div>
          <div className="text-left pr-1">
            <p className="text-xs font-bold leading-tight truncate max-w-[120px] sm:max-w-[140px]">{shopName}</p>
            <span className="text-[9px] sm:text-[10px] text-emerald-200 block">Messenger Active</span>
          </div>
          <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-200 group-hover:text-white" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 sm:inset-auto sm:bottom-4 sm:right-4 sm:w-[420px] z-50 flex flex-col bg-white sm:rounded-3xl shadow-2xl border border-slate-200 h-[100dvh] sm:h-[620px] max-h-[100dvh] sm:max-h-[85vh] overflow-hidden animate-in fade-in sm:zoom-in-95 duration-200">
        {/* Messenger Header */}
        <div className="p-3 sm:p-3.5 px-3.5 sm:px-4 bg-gradient-to-r from-slate-900 via-slate-800 to-[#124B38] text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-700/90 border border-emerald-400/40 flex items-center justify-center text-white shadow-xs">
                <Store className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-400 border-2 border-slate-900 ring-1 ring-emerald-500" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-xs sm:text-sm text-white truncate">{shopName}</h3>
                {isVerified && (
                  <span title="Verified Merchant">
                    <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="truncate">Active now • Verified Store</span>
              </div>
            </div>
          </div>

          {/* Window action buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="p-1.5 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
              title="Minimize chat"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
              title="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Product Context Banner (Pinned Showcase) */}
        {product && (
          <div className="p-2 sm:p-2.5 px-3 sm:px-3.5 bg-emerald-50/85 border-b border-emerald-100/80 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white border border-emerald-200 overflow-hidden shrink-0 flex items-center justify-center p-0.5 shadow-2xs">
                {primaryImage ? (
                  <img
                    src={primaryImage}
                    alt={product.name}
                    className="w-full h-full object-contain mix-blend-multiply"
                  />
                ) : (
                  <ShoppingBag className="w-4 h-4 text-emerald-600" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{product.name}</p>
                <span className="text-[10px] sm:text-[11px] font-black text-[#124B38]">
                  ৳{Number(product.price || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <Link
              to={`/products/${product.slug || product._id || product.id}`}
              target="_blank"
              className="text-[9px] sm:text-[10px] uppercase font-bold text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg transition shrink-0 flex items-center gap-1 shadow-2xs"
            >
              <span>Product</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </Link>
          </div>
        )}

        {/* Unauthenticated View */}
        {!isUserLoggedIn && !isInitializing ? (
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4 bg-slate-50/50">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center shadow-xs">
              <Store className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-xs">
              <h4 className="font-black text-slate-900 text-base">Sign In to Message Seller</h4>
              <p className="text-xs text-slate-500">
                Directly connect with {shopName} about pricing, stock availability, and instant support.
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                navigate('/login', { state: { from: window.location.pathname } });
              }}
              className="rounded-2xl px-6 font-bold shadow-md"
            >
              Sign In to Start Chat
            </Button>
          </div>
        ) : loading && messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-2.5 text-xs text-slate-400 bg-slate-50/50">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-700" />
            <span className="font-semibold text-slate-600">Connecting to store messenger...</span>
          </div>
        ) : (
          /* Messenger Message Feed */
          <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3 bg-[#f8fafc] min-h-0">
            {/* Timestamp divider */}
            <div className="text-center py-0.5">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 bg-white border border-slate-200/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                End-to-End Store Messenger
              </span>
            </div>

            {/* First message greeting if empty */}
            {messages.length === 0 && (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-600 font-semibold max-w-xs mx-auto">
                  Ask {shopName} anything about this product or click a quick prompt below:
                </p>
                <div className="flex flex-col gap-1.5 max-w-xs mx-auto text-left">
                  {QUICK_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(prompt)}
                      className="text-xs bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-900 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl transition shadow-2xs font-medium cursor-pointer"
                    >
                      💬 {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Render Messages */}
            {messages.map((msg) => {
              const isUserSender =
                msg.sender === user?._id ||
                msg.sender?._id === user?._id ||
                msg.senderRole === 'user';

              return (
                <div
                  key={msg._id || msg.id}
                  className={`flex items-end gap-1.5 sm:gap-2 ${
                    isUserSender ? 'justify-end' : 'justify-start'
                  } group`}
                >
                  {!isUserSender && (
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 flex items-center justify-center text-[9px] sm:text-[10px] font-bold shrink-0 mb-0.5 shadow-2xs">
                      <Store className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-2.5 sm:p-3 text-xs leading-relaxed space-y-1 shadow-2xs transition-all ${
                      isUserSender
                        ? 'bg-[#124B38] text-white rounded-br-xs'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                    }`}
                  >
                    {!isUserSender && (
                      <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 block">
                        {shopName}
                      </span>
                    )}

                    {/* Image Attachment inside Message */}
                    {msg.images && msg.images.length > 0 && (
                      <div className="space-y-1 pt-0.5">
                        {msg.images.map((imgObj, iIdx) => (
                          <div
                            key={iIdx}
                            onClick={() => setActiveLightboxImage(imgObj.url)}
                            className="rounded-xl overflow-hidden cursor-pointer hover:opacity-95 transition border border-black/10 max-h-44 sm:max-h-48"
                          >
                            <img
                              src={imgObj.url}
                              alt="Attachment"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Message Text */}
                    {msg.text && <p className="whitespace-pre-line break-words">{msg.text}</p>}

                    {/* Timestamp & Read Receipt */}
                    <div
                      className={`flex items-center justify-end gap-1 text-[9px] ${
                        isUserSender ? 'text-emerald-200' : 'text-slate-400'
                      }`}
                    >
                      <span>
                        {msg.createdAt
                          ? new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Just now'}
                      </span>
                      {isUserSender && <CheckCheck className="w-3 h-3 text-emerald-300" />}
                    </div>
                  </div>
                </div>
              );
            })}

            {sending && (
              <div className="flex justify-end animate-in fade-in duration-150">
                <div className="bg-[#124B38]/80 text-white rounded-2xl rounded-br-xs p-2 px-3 text-xs flex items-center gap-2 shadow-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Selected Image Preview Pill before sending */}
        {selectedImage && (
          <div className="p-2 px-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-white border border-slate-300 overflow-hidden shrink-0 relative">
                <img
                  src={selectedImage.previewUrl}
                  alt="Upload Preview"
                  className="w-full h-full object-cover"
                />
                {selectedImage.isUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-800 block truncate">
                  {selectedImage.file?.name}
                </span>
                <span className="text-[10px] text-slate-500">
                  {selectedImage.isUploading ? 'Uploading photo...' : 'Photo ready to send'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Emoji Bar Picker */}
        {showEmojiPicker && (
          <div className="p-1.5 px-3 bg-white border-t border-slate-200 flex items-center justify-around gap-1 shrink-0 animate-in fade-in duration-100">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setInputMessage((prev) => prev + emoji);
                  setShowEmojiPicker(false);
                }}
                className="text-base sm:text-lg hover:scale-125 transition transform p-1 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Messenger Input Bar */}
        {isUserLoggedIn && (
          <div className="p-2.5 sm:p-3 border-t border-slate-200 bg-white space-y-1.5 sm:space-y-2 shrink-0">
            {/* Quick Prompts Bar */}
            {messages.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {QUICK_PROMPTS.slice(0, 2).map((prompt, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    className="text-[10px] whitespace-nowrap bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 px-2.5 py-1 rounded-full text-slate-600 hover:text-emerald-800 transition cursor-pointer font-medium"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-1.5 sm:gap-2"
            >
              {/* Photo Upload Attachment Button */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 text-slate-500 flex items-center justify-center transition cursor-pointer shrink-0"
                title="Attach photo"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              {/* Emoji Toggle */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:text-amber-600 text-slate-500 flex items-center justify-center transition cursor-pointer shrink-0"
                title="Quick Emoji"
              >
                <Smile className="w-4 h-4" />
              </button>

              {/* Message Input */}
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${shopName}...`}
                className="flex-1 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50/70 px-3 sm:px-4 py-2 sm:py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
              />

              {/* Send Button / Quick Like Button */}
              {inputMessage.trim() || selectedImage?.url ? (
                <button
                  type="submit"
                  disabled={sending || selectedImage?.isUploading}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#124B38] hover:bg-[#0d382a] text-white flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer shrink-0"
                  title="Send Message"
                >
                  <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSendMessage('👍')}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center transition cursor-pointer shrink-0"
                  title="Send Thumbs Up"
                >
                  <ThumbsUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}
            </form>
          </div>
        )}
      </div>

      {/* Lightbox for Zooming Photos in Chat */}
      {activeLightboxImage && (
        <div
          onClick={() => setActiveLightboxImage(null)}
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={activeLightboxImage}
              alt="Enlarged Attachment"
              className="w-full h-full object-contain rounded-2xl shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setActiveLightboxImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductChatModal;
