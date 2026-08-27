import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchConversations,
  fetchConversationMessages,
  sendChatMessage,
  uploadChatImage,
  markChatRead,
  clearActiveConversation
} from '../../features/chat/chatSlice';
import Button from '../../components/common/Button';
import {
  MessageSquare,
  MessageCircle,
  Search,
  Send,
  Store,
  ShieldCheck,
  ShoppingBag,
  ExternalLink,
  Clock,
  CheckCheck,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Inbox,
  ArrowLeft,
  Image as ImageIcon,
  Smile,
  ThumbsUp,
  X,
  Paperclip,
  Info,
  Package,
  MapPin,
  Check
} from 'lucide-react';

const BUYER_PROMPTS = [
  'Is this product available for immediate order?',
  'How many days will delivery take to my address?',
  'Does this item include official warranty?',
  'Can I get a discount for bulk purchase?'
];

const EMOJIS = ['👍', '❤️', '🔥', '🎉', '😊', '👌', '🙏', '💯'];

const UserMessages = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, token } = useAuth();
  const isUserLoggedIn = Boolean(isAuthenticated || token || localStorage.getItem('accessToken'));

  const {
    conversations = [],
    activeConversation,
    messages = [],
    loading,
    sending
  } = useSelector((state) => state.chat);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null); // { file, previewUrl, isUploading, url, publicId }
  const [activeLightboxImage, setActiveLightboxImage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStoreDetails, setShowStoreDetails] = useState(false);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const audioContextRef = useRef(null);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isUserLoggedIn) {
      navigate('/login', { state: { from: '/messages' } });
    }
  }, [isUserLoggedIn, navigate]);

  // Load conversations on mount
  useEffect(() => {
    if (isUserLoggedIn) {
      dispatch(fetchConversations({ role: 'user' }));

      const interval = setInterval(() => {
        dispatch(fetchConversations({ role: 'user' }));
      }, 8000);

      return () => {
        clearInterval(interval);
        dispatch(clearActiveConversation());
      };
    }
  }, [isUserLoggedIn, dispatch]);

  // Load messages and start polling when active conversation changes
  useEffect(() => {
    if (activeConversation?._id) {
      dispatch(fetchConversationMessages(activeConversation._id));
      dispatch(markChatRead(activeConversation._id));

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      pollIntervalRef.current = setInterval(() => {
        dispatch(fetchConversationMessages(activeConversation._id));
      }, 4000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [activeConversation?._id, dispatch]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending, selectedImage]);

  // Play gentle sound chime
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

  const handleSelectConversation = (conv) => {
    dispatch(fetchConversationMessages(conv._id));
    dispatch(markChatRead(conv._id));
    setSelectedImage(null);
    setShowEmojiPicker(false);
  };

  // Handle image upload
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, WEBP)');
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
    const text = (textToSend || inputText).trim();
    const hasImage = selectedImage?.url;

    if ((!text && !hasImage) || !activeConversation?._id) return;

    if (selectedImage?.isUploading) {
      toast.info('Image is still uploading, please wait a moment...');
      return;
    }

    const imagesPayload = selectedImage?.url
      ? [{ url: selectedImage.url, publicId: selectedImage.publicId }]
      : undefined;

    setInputText('');
    setSelectedImage(null);
    setShowEmojiPicker(false);

    try {
      await dispatch(
        sendChatMessage({
          conversationId: activeConversation._id,
          text,
          images: imagesPayload,
          product: activeConversation.productContext
        })
      ).unwrap();
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

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const shopName = c.seller?.shopName || '';
    const productName = c.productContext?.name || '';
    const lastText = c.lastMessage?.text || '';
    const q = searchTerm.toLowerCase();

    const matchesSearch =
      shopName.toLowerCase().includes(q) ||
      productName.toLowerCase().includes(q) ||
      lastText.toLowerCase().includes(q);

    if (filterUnreadOnly) {
      return matchesSearch && (c.unreadCount?.customer > 0);
    }

    return matchesSearch;
  });

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount?.customer || 0), 0);

  if (!isUserLoggedIn) return null;

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-2 sm:py-3.5 h-full flex flex-col space-y-2 sm:space-y-3 overflow-hidden">
      {/* Messenger Header Bar */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#124B38] text-white flex items-center justify-center shadow-xs shrink-0">
            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="truncate">Store Messages</span>
              {totalUnread > 0 && (
                <span className="text-[10px] sm:text-[11px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full shrink-0 animate-pulse">
                  {totalUnread} New
                </span>
              )}
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 hidden sm:block truncate">
              Live instant messaging with store sellers across all your product inquiries.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => dispatch(fetchConversations({ role: 'user' }))}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl bg-[#124B38] hover:bg-[#0d382a] text-white text-xs font-bold transition shadow-2xs"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Shop</span>
          </Link>
        </div>
      </div>

      {/* Messenger Responsive 2-Pane Container */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 relative">
        {/* Left Column: Messenger Chat Sidebar */}
        <div
          className={`md:col-span-5 lg:col-span-4 border-r border-slate-200 flex flex-col h-full bg-slate-50/60 overflow-hidden ${
            activeConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search and Filters */}
          <div className="p-2.5 sm:p-3.5 border-b border-slate-200 bg-white space-y-2 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search store, product, messages..."
                className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
              />
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setFilterUnreadOnly(false)}
                className={`flex-1 py-1.5 text-[11px] sm:text-xs font-bold rounded-xl transition text-center cursor-pointer ${
                  !filterUnreadOnly
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({conversations.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterUnreadOnly(true)}
                className={`flex-1 py-1.5 text-[11px] sm:text-xs font-bold rounded-xl transition text-center cursor-pointer ${
                  filterUnreadOnly
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Unread ({totalUnread})
              </button>
            </div>
          </div>

          {/* Conversations Scroll List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 no-scrollbar">
            {loading && conversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                <span>Loading your store chats...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 space-y-2">
                <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700">No conversations</p>
                <p className="text-[11px] max-w-xs mx-auto">
                  {filterUnreadOnly
                    ? 'You have read all seller messages!'
                    : 'Click "Chat with Seller" on any product page to begin.'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = activeConversation?._id === conv._id;
                const unread = conv.unreadCount?.customer || 0;
                const shopName = conv.seller?.shopName || 'Store Merchant';
                const isVerified = conv.seller?.isVerified;
                const productContext = conv.productContext;

                return (
                  <button
                    key={conv._id}
                    type="button"
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full text-left p-3 sm:p-3.5 transition flex items-start gap-2.5 sm:gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/90 border-l-4 border-l-[#124B38]'
                        : unread > 0
                        ? 'bg-emerald-50/30 hover:bg-slate-100 font-semibold'
                        : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    {/* Store / Product Avatar with Online Dot */}
                    <div className="relative shrink-0">
                      {productContext?.image ? (
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center p-0.5 shadow-2xs">
                          <img
                            src={productContext.image}
                            alt={productContext.name || 'Product'}
                            className="w-full h-full object-contain mix-blend-multiply"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-sm shadow-2xs">
                          <Store className="w-5 h-5" />
                        </div>
                      )}

                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 border-2 border-white" />

                      {unread > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-emerald-600 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                          {unread}
                        </span>
                      )}
                    </div>

                    {/* Chat details */}
                    <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 truncate min-w-0">
                          <span
                            className={`text-xs truncate ${
                              unread > 0 ? 'font-black text-slate-900' : 'font-bold text-slate-800'
                            }`}
                          >
                            {shopName}
                          </span>
                          {isVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-slate-400 shrink-0">
                          {conv.lastMessage?.createdAt
                            ? new Date(conv.lastMessage.createdAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric'
                              })
                            : ''}
                        </span>
                      </div>

                      {/* Product context pill */}
                      {productContext?.name && (
                        <div className="flex items-center justify-between gap-1 text-[10px] text-emerald-900 bg-emerald-100/70 px-1.5 py-0.5 rounded-md truncate font-medium">
                          <span className="truncate">{productContext.name}</span>
                          {productContext.price && (
                            <span className="font-black shrink-0">
                              ৳{Number(productContext.price).toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Last message snippet */}
                      <p
                        className={`text-[11px] truncate ${
                          unread > 0 ? 'font-bold text-slate-900' : 'text-slate-500'
                        }`}
                      >
                        {conv.lastMessage?.text || 'Conversation active'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Messenger Chat Thread */}
        <div
          className={`md:col-span-7 lg:col-span-8 flex flex-col h-full bg-white overflow-hidden ${
            !activeConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          {!activeConversation ? (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3 text-slate-400">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-emerald-50 text-emerald-800 flex items-center justify-center shadow-xs">
                <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="font-bold text-slate-800 text-base sm:text-lg">Select a Product Chat</h3>
                <p className="text-xs text-slate-500">
                  Pick any conversation from the list to view product details, send photos, and talk with the store merchant in real time.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Responsive Active Chat Header */}
              <div className="p-3 sm:p-3.5 px-3.5 sm:px-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shrink-0 shadow-xs">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    type="button"
                    onClick={() => dispatch(clearActiveConversation())}
                    className="md:hidden p-1.5 -ml-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer shrink-0"
                    title="Back to conversation list"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="relative shrink-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-700/90 border border-emerald-400/40 flex items-center justify-center text-white shadow-xs">
                      <Store className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-900" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-xs sm:text-sm text-white truncate">
                        {activeConversation.seller?.shopName || 'Store Merchant'}
                      </h3>
                      {activeConversation.seller?.isVerified && (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-emerald-300 truncate">
                      Active now • Verified Retailer
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowStoreDetails(!showStoreDetails)}
                    className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer text-xs font-bold flex items-center gap-1"
                    title="Toggle Merchant Info"
                  >
                    <Info className="w-4 h-4" />
                    <span className="hidden sm:inline">Info</span>
                  </button>
                  <Link
                    to={
                      activeConversation.seller?._id
                        ? `/products?sellerId=${activeConversation.seller._id}`
                        : '/products'
                    }
                    className="text-[11px] sm:text-xs bg-white/10 hover:bg-white/20 text-slate-200 font-bold px-2.5 sm:px-3.5 py-1.5 rounded-xl transition shrink-0"
                  >
                    Visit Shop
                  </Link>
                </div>
              </div>

              {/* Pinned Attached Product Showcase Banner */}
              {activeConversation.productContext?.name && (
                <div className="p-2 sm:p-2.5 px-3 sm:px-5 bg-emerald-50/90 border-b border-emerald-100 flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white border border-emerald-200 overflow-hidden shrink-0 flex items-center justify-center p-0.5 shadow-2xs">
                      {activeConversation.productContext.image ? (
                        <img
                          src={activeConversation.productContext.image}
                          alt={activeConversation.productContext.name}
                          className="w-full h-full object-contain mix-blend-multiply"
                        />
                      ) : (
                        <ShoppingBag className="w-4 h-4 text-emerald-700" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {activeConversation.productContext.name}
                      </p>
                      <span className="text-[10px] sm:text-[11px] font-extrabold text-[#124B38]">
                        ৳{Number(activeConversation.productContext.price || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <Link
                    to={`/products/${
                      activeConversation.productContext.slug ||
                      activeConversation.productContext.productId
                    }`}
                    target="_blank"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] sm:text-[11px] font-bold transition shadow-2xs shrink-0"
                  >
                    <span>View</span>
                    <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </Link>
                </div>
              )}

              {/* Side Drawer / Store Info Panel (When toggled) */}
              {showStoreDetails && (
                <div className="p-3 px-4 bg-slate-50 border-b border-slate-200 text-xs space-y-2 animate-in slide-in-from-top-2 duration-150 shrink-0">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <Store className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Merchant & Product Details</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowStoreDetails(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
                    <div>
                      <span className="font-semibold text-slate-500 block">Store Merchant:</span>
                      <span className="font-bold text-slate-800">
                        {activeConversation.seller?.shopName || 'VectorX Verified Store'}
                      </span>
                    </div>
                    {activeConversation.seller?.shopAddress && (
                      <div>
                        <span className="font-semibold text-slate-500 block">Address:</span>
                        <span className="font-medium text-slate-800 truncate block">
                          {activeConversation.seller.shopAddress}
                        </span>
                      </div>
                    )}
                    {activeConversation.productContext?.name && (
                      <div className="sm:col-span-2">
                        <span className="font-semibold text-slate-500 block">Discussing Product:</span>
                        <span className="font-bold text-emerald-900">
                          {activeConversation.productContext.name} (৳{Number(activeConversation.productContext.price || 0).toLocaleString()})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Message Feed Stream */}
              <div className="flex-1 p-3 sm:p-5 overflow-y-auto space-y-3 bg-[#f8fafc] min-h-0">
                {messages.length === 0 ? (
                  <div className="text-center py-8 space-y-3">
                    <p className="text-xs text-slate-500 font-medium">
                      Start your inquiry by typing a message or choosing a quick template below:
                    </p>
                    <div className="flex flex-col gap-1.5 max-w-xs mx-auto">
                      {BUYER_PROMPTS.map((prompt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendMessage(prompt)}
                          className="text-left text-xs bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-900 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl transition shadow-2xs font-medium cursor-pointer"
                        >
                          💬 {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isUserSender =
                      msg.sender === user?._id ||
                      msg.sender?._id === user?._id ||
                      msg.senderRole === 'user';

                    return (
                      <div
                        key={msg._id || msg.id}
                        className={`flex items-end gap-1.5 sm:gap-2 ${
                          isUserSender ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {!isUserSender && (
                          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 flex items-center justify-center text-[9px] sm:text-[10px] font-bold shrink-0 mb-0.5 shadow-2xs">
                            <Store className="w-3.5 h-3.5" />
                          </div>
                        )}

                        <div
                          className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-2.5 sm:p-3 text-xs leading-relaxed space-y-1 shadow-2xs ${
                            isUserSender
                              ? 'bg-[#124B38] text-white rounded-br-xs'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                          }`}
                        >
                          {!isUserSender && (
                            <span className="text-[10px] font-bold text-emerald-700 block">
                              {activeConversation.seller?.shopName || 'Seller'}
                            </span>
                          )}

                          {/* Image Attachments */}
                          {msg.images && msg.images.length > 0 && (
                            <div className="space-y-1 pt-0.5">
                              {msg.images.map((imgObj, iIdx) => (
                                <div
                                  key={iIdx}
                                  onClick={() => setActiveLightboxImage(imgObj.url)}
                                  className="rounded-xl overflow-hidden cursor-pointer hover:opacity-95 transition border border-black/10 max-h-48 sm:max-h-56"
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

                          {msg.text && <p className="whitespace-pre-line break-words">{msg.text}</p>}

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
                  })
                )}

                {sending && (
                  <div className="flex justify-end animate-in fade-in duration-150">
                    <div className="bg-[#124B38]/80 text-white rounded-2xl rounded-br-xs p-2 px-3 text-xs flex items-center gap-2 shadow-xs">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending message...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Selected Image Preview Pill */}
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

              {/* Emoji Picker Bar */}
              {showEmojiPicker && (
                <div className="p-1.5 px-3 bg-white border-t border-slate-200 flex items-center justify-around gap-1 shrink-0 animate-in fade-in duration-100">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setInputText((prev) => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="text-base sm:text-lg hover:scale-125 transition transform p-1 cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Message Composer Area */}
              <div className="p-2.5 sm:p-3.5 border-t border-slate-200 bg-white space-y-2 shrink-0">
                {/* Prompt chips */}
                {messages.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {BUYER_PROMPTS.slice(0, 3).map((prompt, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => handleSendMessage(prompt)}
                        className="text-[10px] sm:text-[11px] whitespace-nowrap bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 px-2.5 sm:px-3 py-1 rounded-full text-slate-600 hover:text-emerald-800 transition cursor-pointer font-medium"
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
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 text-slate-500 flex items-center justify-center transition cursor-pointer shrink-0"
                    title="Attach Photo"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>

                  {/* Emoji Button */}
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:text-amber-600 text-slate-500 flex items-center justify-center transition cursor-pointer shrink-0"
                    title="Insert Emoji"
                  >
                    <Smile className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${activeConversation.seller?.shopName || 'seller'}...`}
                    className="flex-1 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50/70 px-3 sm:px-4 py-2 sm:py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
                  />

                  {inputText.trim() || selectedImage?.url ? (
                    <button
                      type="submit"
                      disabled={(!inputText.trim() && !selectedImage?.url) || sending || selectedImage?.isUploading}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#124B38] hover:bg-[#0d382a] text-white flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer shrink-0"
                      title="Send Message"
                    >
                      <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendMessage('👍')}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center transition cursor-pointer shrink-0"
                      title="Send Thumbs Up"
                    >
                      <ThumbsUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  )}
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Image Lightbox */}
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
    </div>
  );
};

export default UserMessages;
