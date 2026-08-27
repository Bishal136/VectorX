import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import useAuth from '../../hooks/useAuth';
import axiosInstance from '../../services/axiosInstance';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import {
  fetchProductById,
  fetchRelatedProducts,
  fetchProductReviews,
  submitReview,
  markReviewHelpful,
  reportReview,
} from '../../features/products/productSlice';
import { addToCart } from '../../features/cart/cartSlice';
import { toggleWishlist } from '../../features/user/userSlice';
import {
  Star,
  Heart,
  ShoppingCart,
  Zap,
  Truck,
  RotateCcw,
  ShieldCheck,
  ThumbsUp,
  Flag,
  Bug,
  Share2,
  Check,
  Plus,
  Minus,
  AlertCircle,
  X,
  Store,
  ChevronRight,
  Sparkles,
  Play,
  Maximize2,
  Lock,
  Camera,
  Video,
  Image as ImageIcon,
  Trash2,
  Loader2,
  MessageSquareQuote,
  Eye,
  MessageCircle,
} from 'lucide-react';
import ProductChatModal from '../../components/chat/ProductChatModal';

const REVIEW_SORTS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'helpful', label: 'Most Helpful' },
  { value: 'highest', label: 'Highest Rated' },
  { value: 'lowest', label: 'Lowest Rated' },
];

const DEFAULT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=80';

const getProductImage = (prod) => {
  if (!prod) return DEFAULT_FALLBACK_IMAGE;

  if (prod.primaryImage) {
    if (typeof prod.primaryImage === 'string' && prod.primaryImage.trim()) {
      return prod.primaryImage.trim();
    }
    if (typeof prod.primaryImage === 'object' && prod.primaryImage.url) {
      return prod.primaryImage.url;
    }
  }

  if (Array.isArray(prod.images) && prod.images.length > 0) {
    const primary = prod.images.find((img) => img?.isPrimary && img?.url);
    if (primary?.url) return primary.url;

    const first = prod.images[0];
    if (typeof first === 'string' && first.trim()) return first.trim();
    if (typeof first === 'object' && first?.url) return first.url;
  }

  if (typeof prod.image === 'string' && prod.image.trim()) {
    return prod.image.trim();
  }
  if (typeof prod.thumbnail === 'string' && prod.thumbnail.trim()) {
    return prod.thumbnail.trim();
  }

  return DEFAULT_FALLBACK_IMAGE;
};

const getEmbedVideoUrl = (url = '') => {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }
  const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|)(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  return null;
};

const StarRating = ({ value = 0, count, size = 'sm' }) => {
  const rounded = Math.round(Number(value) || 0);
  return (
    <div className="flex items-center gap-1.5" role="img" aria-label={`Rated ${value} out of 5 stars`}>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={`${size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} ${
              n <= rounded ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-300'
            }`}
          />
        ))}
      </div>
      {typeof count === 'number' && (
        <span className={`text-slate-500 font-medium ${size === 'lg' ? 'text-sm' : 'text-xs'}`}>
          {Number(value).toFixed(1)} ({count} {count === 1 ? 'review' : 'reviews'})
        </span>
      )}
    </div>
  );
};

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useAuth();

  const { currentProduct: product, relatedProducts, reviews, status, error } = useSelector(
    (state) => state.products
  );
  const wishlist = useSelector((state) => state.user?.wishlist || []);

  // Gallery state: index (number) or 'video'
  const [activeMedia, setActiveMedia] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // Multi-group variant selection state: { 'Color': 'Red', 'Size': 'M' }
  const [selectedVariantMap, setSelectedVariantMap] = useState({});

  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Active Information Tab below product
  const [activeInfoTab, setActiveInfoTab] = useState('specs'); // 'specs' | 'video' | 'reviews' | 'shipping' | 'seller'

  // Verified review eligibility state (only buyer can write review)
  const [canReviewInfo, setCanReviewInfo] = useState({
    canReview: false,
    hasPurchased: false,
    alreadyReviewed: false,
    orderId: null,
    loading: false,
  });

  // Reviews state
  const [reviewSort, setReviewSort] = useState('newest');
  const [reviewFilterMediaOnly, setReviewFilterMediaOnly] = useState(false);
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' });
  const [reviewImages, setReviewImages] = useState([]); // [{ id, url, publicId, isUploading }]
  const [reviewVideo, setReviewVideo] = useState(null); // { url, publicId, thumbnail, isUploading }
  const [submittingReview, setSubmittingReview] = useState(false);
  const [activeReviewMediaLightbox, setActiveReviewMediaLightbox] = useState(null);
  const [activeReviewVideoModal, setActiveReviewVideoModal] = useState(null);

  // Chat with seller modal state
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Bug report modal
  const [bugModalOpen, setBugModalOpen] = useState(false);
  const [bugReport, setBugReport] = useState({
    issueType: 'incorrect_info',
    description: '',
    email: user?.email || '',
  });
  const [submittingBug, setSubmittingBug] = useState(false);

  // Fetch product data on load / id change
  useEffect(() => {
    if (!id) return;
    dispatch(fetchProductById(id));
    dispatch(fetchRelatedProducts({ productId: id, limit: 6 }));
    dispatch(fetchProductReviews({ productId: id, sort: 'newest' }));
    setActiveMedia(0);
    setQuantity(1);
    setSelectedVariantMap({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id, dispatch]);

  // Prepopulate default variant options when product loads
  useEffect(() => {
    if (product?.variants?.length > 0 && Object.keys(selectedVariantMap).length === 0) {
      const defaults = {};
      product.variants.forEach((v) => {
        if (v.options?.length > 0) {
          defaults[v.name] = v.options[0].value;
        }
      });
      setSelectedVariantMap(defaults);
    }
  }, [product, selectedVariantMap]);

  // Check buyer eligibility to review
  useEffect(() => {
    const checkEligibility = async () => {
      const targetId = product?._id || product?.id || id;
      if (!isAuthenticated || !targetId) {
        setCanReviewInfo({
          canReview: false,
          hasPurchased: false,
          alreadyReviewed: false,
          orderId: null,
          loading: false,
        });
        return;
      }
      try {
        setCanReviewInfo((prev) => ({ ...prev, loading: true }));
        const res = await axiosInstance.get(`/products/${targetId}/can-review`);
        if (res.data?.data) {
          setCanReviewInfo({
            canReview: Boolean(res.data.data.canReview),
            hasPurchased: Boolean(res.data.data.hasPurchased),
            alreadyReviewed: Boolean(res.data.data.alreadyReviewed),
            orderId: res.data.data.orderId || null,
            loading: false,
          });
        }
      } catch {
        setCanReviewInfo({
          canReview: false,
          hasPurchased: false,
          alreadyReviewed: false,
          orderId: null,
          loading: false,
        });
      }
    };

    checkEligibility();
  }, [isAuthenticated, id, product?._id, product?.id]);

  // Safe reviews list extraction
  const reviewsList = useMemo(() => {
    if (Array.isArray(reviews)) return reviews;
    if (Array.isArray(reviews?.reviews)) return reviews.reviews;
    return [];
  }, [reviews]);

  // Star breakdown calculation
  const starBreakdown = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (!reviewsList.length) return counts;
    reviewsList.forEach((r) => {
      const rate = Math.round(Number(r.rating) || 5);
      if (counts[rate] !== undefined) counts[rate]++;
    });
    return counts;
  }, [reviewsList]);

  // Safe related products list extraction
  const relatedProductsList = useMemo(() => {
    if (Array.isArray(relatedProducts)) return relatedProducts;
    if (Array.isArray(relatedProducts?.products)) return relatedProducts.products;
    return [];
  }, [relatedProducts]);

  // Check wishlist state
  const isWishlisted = useMemo(() => {
    if (!Array.isArray(wishlist)) return false;
    const targetId = product?._id || product?.id || id;
    return wishlist.some(
      (item) => (typeof item === 'string' ? item : item?._id || item?.id) === targetId
    );
  }, [wishlist, product?._id, product?.id, id]);

  const images = useMemo(() => {
    if (product?.images && product.images.length > 0) {
      const valid = product.images
        .map((img) => (typeof img === 'string' ? img : img?.url))
        .filter(Boolean);
      if (valid.length > 0) return valid;
    }
    if (product?.primaryImage) {
      const pUrl = typeof product.primaryImage === 'string' ? product.primaryImage : product.primaryImage?.url;
      if (pUrl) return [pUrl];
    }
    if (product?.image) return [product.image];
    return [DEFAULT_FALLBACK_IMAGE];
  }, [product]);

  // Video URL extraction from all potential field structures
  const videoUrl = useMemo(() => {
    if (typeof product?.video === 'string' && product.video.trim()) {
      return product.video.trim();
    }
    if (product?.video?.url && typeof product.video.url === 'string' && product.video.url.trim()) {
      return product.video.url.trim();
    }
    if (typeof product?.videoUrl === 'string' && product.videoUrl.trim()) {
      return product.videoUrl.trim();
    }
    if (typeof product?.video_url === 'string' && product.video_url.trim()) {
      return product.video_url.trim();
    }
    return null;
  }, [product]);

  const embedVideo = useMemo(() => {
    return getEmbedVideoUrl(videoUrl);
  }, [videoUrl]);

  const shopName = product?.seller?.shopName || product?.shopName;
  const sellerId =
    product?.seller?.id ||
    product?.seller?._id ||
    product?.sellerId?._id ||
    product?.sellerId;
  const isSellerVerified = product?.seller?.isVerified || product?.sellerVerified;

  // Selected variant details (price, stock, sku override)
  const activeVariantDetails = useMemo(() => {
    if (!product?.variants?.length) return null;

    let priceOverride = null;
    let stockOverride = null;
    let skuOverride = null;

    for (const v of product.variants) {
      const chosenVal = selectedVariantMap[v.name];
      if (chosenVal) {
        const opt = v.options?.find((o) => o.value === chosenVal);
        if (opt) {
          if (opt.price !== undefined && opt.price !== null && Number(opt.price) > 0) {
            priceOverride = Number(opt.price);
          }
          if (opt.stock !== undefined && opt.stock !== null) {
            stockOverride = Number(opt.stock);
          }
          if (opt.sku) {
            skuOverride = opt.sku;
          }
        }
      }
    }

    return {
      price: priceOverride,
      stock: stockOverride,
      sku: skuOverride,
      combinedValue: Object.values(selectedVariantMap).join(' / '),
    };
  }, [product, selectedVariantMap]);

  const currentPrice = activeVariantDetails?.price || product?.price || 0;
  const currentStock = activeVariantDetails?.stock !== null && activeVariantDetails?.stock !== undefined
    ? activeVariantDetails.stock
    : product?.stock ?? 0;

  const inStock = currentStock > 0;
  const isLowStock =
    inStock &&
    product?.lowStockThreshold != null &&
    currentStock <= product.lowStockThreshold;

  const discountPct = useMemo(() => {
    if (product?.comparePrice && product?.comparePrice > currentPrice) {
      return Math.round(((product.comparePrice - currentPrice) / product.comparePrice) * 100);
    }
    if (product?.discountPercentage) return product.discountPercentage;
    return 0;
  }, [product, currentPrice]);

  const handleReviewSortChange = (e) => {
    const sort = e.target.value;
    setReviewSort(sort);
    const targetProductId = product?._id || product?.id || id;
    dispatch(fetchProductReviews({ productId: targetProductId, sort }));
  };

  const handleQuantityChange = (delta) => {
    setQuantity((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (currentStock && next > currentStock) return currentStock;
      return next;
    });
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/products/${id}` } });
      return;
    }
    const targetProductId = product?._id || product?.id || id;
    setAddingToCart(true);
    try {
      await dispatch(
        addToCart({
          productId: targetProductId,
          quantity,
          variant: activeVariantDetails?.combinedValue || undefined,
        })
      ).unwrap();
      toast.success(`Added ${quantity} item(s) to your cart.`);
    } catch (err) {
      toast.error(typeof err === 'string' ? err : err?.message || 'Could not add this to your cart.');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/products/${id}` } });
      return;
    }
    const targetProductId = product?._id || product?.id || id;
    setBuyingNow(true);
    try {
      await dispatch(
        addToCart({
          productId: targetProductId,
          quantity,
          variant: activeVariantDetails?.combinedValue || undefined,
        })
      ).unwrap();
      navigate('/checkout');
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Could not proceed to checkout.');
    } finally {
      setBuyingNow(false);
    }
  };

  const handleToggleWishlist = async () => {
    if (!isAuthenticated) {
      toast.info('Please log in to save items to your wishlist.');
      navigate('/login', { state: { from: `/products/${id}` } });
      return;
    }
    const targetProductId = product?._id || product?.id || id;
    setWishlistLoading(true);
    try {
      await dispatch(toggleWishlist(targetProductId)).unwrap();
      toast.success(isWishlisted ? 'Removed from wishlist.' : 'Saved to wishlist!');
    } catch {
      toast.error('Could not update wishlist.');
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: product?.name || 'Check out this product',
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleReviewImageSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (reviewImages.length + files.length > 5) {
      toast.error('You can upload a maximum of 5 images per review.');
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 10MB limit.`);
        continue;
      }

      const tempId = `temp_img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const previewUrl = URL.createObjectURL(file);

      setReviewImages((prev) => [
        ...prev,
        { id: tempId, url: previewUrl, isUploading: true, fileName: file.name }
      ]);

      try {
        const formData = new FormData();
        formData.append('image', file);
        const res = await axiosInstance.post('/products/reviews/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (res.data?.success && res.data?.data?.url) {
          setReviewImages((prev) =>
            prev.map((item) =>
              item.id === tempId
                ? { id: tempId, url: res.data.data.url, publicId: res.data.data.publicId, isUploading: false }
                : item
            )
          );
        } else {
          throw new Error('Upload failed');
        }
      } catch (err) {
        toast.error(`Could not upload ${file.name}`);
        setReviewImages((prev) => prev.filter((item) => item.id !== tempId));
      }
    }
    e.target.value = '';
  };

  const handleRemoveReviewImage = (idToRemove) => {
    setReviewImages((prev) => prev.filter((item) => item.id !== idToRemove));
  };

  const handleReviewVideoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Please select a valid video file (MP4, WebM, MOV).');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error('Video file size exceeds 100MB limit.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setReviewVideo({ url: previewUrl, isUploading: true, fileName: file.name });

    try {
      const formData = new FormData();
      formData.append('video', file);
      const res = await axiosInstance.post('/products/reviews/upload/video', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success && res.data?.data?.url) {
        setReviewVideo({
          url: res.data.data.url,
          publicId: res.data.data.publicId,
          thumbnail: res.data.data.thumbnail,
          isUploading: false
        });
        toast.success('Review video uploaded successfully!');
      } else {
        throw new Error('Video upload failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload video');
      setReviewVideo(null);
    }
    e.target.value = '';
  };

  const handleRemoveReviewVideo = () => {
    setReviewVideo(null);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.info('Please log in to leave a review.');
      navigate('/login', { state: { from: `/products/${id}` } });
      return;
    }

    if (reviewImages.some((img) => img.isUploading) || reviewVideo?.isUploading) {
      toast.warning('Please wait until your media finishes uploading.');
      return;
    }

    setSubmittingReview(true);
    try {
      const uploadedImages = reviewImages
        .filter((img) => !img.isUploading && img.url && !img.url.startsWith('blob:'))
        .map((img) => ({ url: img.url, publicId: img.publicId }));

      const uploadedVideo =
        reviewVideo && !reviewVideo.isUploading && reviewVideo.url && !reviewVideo.url.startsWith('blob:')
          ? { url: reviewVideo.url, publicId: reviewVideo.publicId, thumbnail: reviewVideo.thumbnail }
          : null;

      await dispatch(
        submitReview({
          productId: product?._id || id,
          reviewData: {
            ...reviewForm,
            orderId: canReviewInfo.orderId || undefined,
            images: uploadedImages,
            video: uploadedVideo,
          },
        })
      ).unwrap();

      toast.success('Thank you! Your verified review and media have been published.');
      setReviewForm({ rating: 5, title: '', comment: '' });
      setReviewImages([]);
      setReviewVideo(null);
      setReviewFormOpen(false);
      setCanReviewInfo((prev) => ({
        ...prev,
        canReview: false,
        alreadyReviewed: true,
      }));

      // Refetch reviews
      dispatch(fetchProductReviews({ productId: product?._id || id, sort: reviewSort }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleHelpful = async (reviewId) => {
    try {
      await dispatch(markReviewHelpful({ productId: product?._id || id, reviewId })).unwrap();
      toast.success('Marked as helpful!');
    } catch {
      toast.error('Could not mark review as helpful.');
    }
  };

  const handleReport = async (reviewId) => {
    try {
      await dispatch(reportReview({ productId: product?._id || id, reviewId })).unwrap();
      toast.success('Review reported for moderation.');
    } catch {
      toast.error('Could not report review.');
    }
  };

  const handleBugSubmit = async (e) => {
    e.preventDefault();
    setSubmittingBug(true);
    try {
      await axiosInstance.post('/reports/product-issue', {
        productId: product?._id || id,
        ...bugReport,
      });
      toast.success('Bug report submitted. Thank you for helping us improve!');
      setBugModalOpen(false);
      setBugReport({ issueType: 'incorrect_info', description: '', email: user?.email || '' });
    } catch {
      toast.success('Report received. We will review this issue shortly.');
      setBugModalOpen(false);
    } finally {
      setSubmittingBug(false);
    }
  };

  if (status === 'loading' && !product) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (status === 'failed' || (!product && status !== 'loading')) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-6">
        <div className="max-w-md bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">Product Not Found</h2>
          <p className="text-xs text-slate-500">
            {error || "The product you're looking for does not exist or is no longer available."}
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button type="button" variant="secondary" onClick={() => navigate('/products')}>
              Browse Products
            </Button>
            <Button type="button" variant="primary" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF9F6] min-h-screen text-slate-800 font-sans pb-28 sm:pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
        {/* Breadcrumb Bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap text-xs text-slate-500">
          <nav className="flex items-center gap-1.5" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-[#124B38] transition">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <Link to="/products" className="hover:text-[#124B38] transition">
              Products
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="font-semibold text-slate-800 truncate max-w-xs sm:max-w-sm">
              {product.name}
            </span>
          </nav>

          <div className="flex items-center gap-2">
            {videoUrl && (
              <button
                type="button"
                onClick={() => {
                  setActiveMedia('video');
                  window.scrollTo({ top: 120, behavior: 'smooth' });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 transition text-xs font-bold shadow-2xs cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-purple-600 text-purple-600" />
                Video Demo
              </button>
            )}

            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition text-xs font-semibold shadow-2xs cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-500" />
              Share
            </button>
            <button
              type="button"
              onClick={() => setBugModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 transition text-xs font-semibold shadow-2xs cursor-pointer"
            >
              <Bug className="w-3.5 h-3.5 text-amber-600" />
              Report Issue
            </button>
          </div>
        </div>

        {/* ──────────────── Main Product Details Grid ──────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs">
          {/* LEFT: Product Media Gallery (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="relative aspect-square bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden flex items-center justify-center group shadow-2xs p-3">
              {activeMedia === 'video' && videoUrl ? (
                <div className="w-full h-full relative flex items-center justify-center bg-black rounded-2xl overflow-hidden">
                  {embedVideo ? (
                    <iframe
                      src={embedVideo}
                      title="Product Video Demo"
                      className="w-full h-full rounded-2xl"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  ) : (
                    <video
                      src={videoUrl}
                      controls
                      autoPlay
                      playsInline
                      className="w-full h-full rounded-2xl object-contain bg-black"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setIsVideoModalOpen(true)}
                    className="absolute top-3 right-3 bg-black/70 hover:bg-black/90 text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-xs flex items-center gap-1 transition cursor-pointer shadow-md"
                    title="Open in Theater Mode"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Theater</span>
                  </button>
                </div>
              ) : images[activeMedia] ? (
                <img
                  src={images[activeMedia]}
                  alt={product.name}
                  className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105 mix-blend-multiply"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = DEFAULT_FALLBACK_IMAGE;
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 text-xs">
                  <Sparkles className="w-8 h-8 text-slate-300 mb-2" />
                  <span>No preview available</span>
                </div>
              )}

              {/* Floating discount badge */}
              {discountPct > 0 && (
                <span className="absolute top-4 left-4 bg-red-600 text-white font-extrabold text-xs px-3 py-1 rounded-full shadow-md">
                  {discountPct}% OFF
                </span>
              )}

              {/* Lightbox Trigger */}
              {activeMedia !== 'video' && images[activeMedia] && (
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-xs text-slate-700 hover:text-[#124B38] p-2 rounded-xl border border-slate-200 shadow-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Expand Fullscreen Preview"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}

              {/* Stock badge overlay if out of stock */}
              {!inStock && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center">
                  <span className="px-5 py-2.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-2xl shadow-lg">
                    Out of Stock
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnail Selector Bar */}
            {(images.length > 1 || videoUrl) && (
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {images.map((src, idx) => (
                  <button
                    key={src + idx}
                    type="button"
                    onClick={() => setActiveMedia(idx)}
                    aria-label={`View image ${idx + 1}`}
                    className={`w-16 h-16 rounded-2xl overflow-hidden border-2 shrink-0 transition cursor-pointer p-1 bg-slate-50 ${
                      activeMedia === idx
                        ? 'border-[#124B38] ring-2 ring-emerald-100 shadow-2xs'
                        : 'border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={src}
                      alt=""
                      className="w-full h-full object-contain mix-blend-multiply"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = DEFAULT_FALLBACK_IMAGE;
                      }}
                    />
                  </button>
                ))}

                {/* Video thumbnail button */}
                {videoUrl && (
                  <button
                    type="button"
                    onClick={() => setActiveMedia('video')}
                    aria-label="View product video demo"
                    className={`w-16 h-16 rounded-2xl overflow-hidden border-2 shrink-0 transition cursor-pointer p-1 bg-purple-50 flex flex-col items-center justify-center text-purple-700 font-bold ${
                      activeMedia === 'video'
                        ? 'border-purple-600 ring-2 ring-purple-200 bg-purple-100 shadow-2xs'
                        : 'border-purple-200 opacity-85 hover:opacity-100'
                    }`}
                  >
                    <Play className="w-5 h-5 fill-purple-600 text-purple-600" />
                    <span className="text-[9px] mt-0.5 uppercase tracking-wider font-extrabold">Video</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Product Information (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Seller badge / store link */}
              {shopName && (
                <div className="flex items-center gap-2">
                  <Link
                    to={sellerId ? `/products?sellerId=${sellerId}` : '#'}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition"
                  >
                    <Store className="w-3.5 h-3.5 text-[#124B38]" />
                    <span>{shopName}</span>
                    {isSellerVerified && (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 ml-0.5" title="Verified Seller" />
                    )}
                  </Link>
                </div>
              )}

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {product.name}
              </h1>

              {/* Rating, SKU, Distance, Video CTA */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <StarRating
                  value={product.rating?.average || 0}
                  count={product.rating?.count || reviewsList.length || 0}
                  size="md"
                />
                {activeVariantDetails?.sku && (
                  <Badge tone="neutral" className="bg-slate-100 text-slate-700 font-mono text-[11px]">
                    SKU: {activeVariantDetails.sku}
                  </Badge>
                )}
                {typeof product.distanceKm === 'number' && product.distanceKm > 0 && (
                  <Badge tone="neutral" className="bg-slate-100 text-slate-700 font-medium">
                    📍 {product.distanceKm.toFixed(1)} km away
                  </Badge>
                )}
                {videoUrl && (
                  <button
                    type="button"
                    onClick={() => setActiveMedia('video')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold text-[11px] transition cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-purple-600" /> Watch Video
                  </button>
                )}
              </div>

              {/* Price Row */}
              <div className="flex items-baseline gap-3 pt-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-[#124B38]">
                  ৳{Number(currentPrice).toLocaleString()}
                </span>
                {product.comparePrice && product.comparePrice > currentPrice && (
                  <span className="text-lg text-slate-400 line-through font-medium">
                    ৳{Number(product.comparePrice).toLocaleString()}
                  </span>
                )}
                {discountPct > 0 && (
                  <span className="text-xs font-extrabold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-100">
                    Save {discountPct}%
                  </span>
                )}
              </div>

              {/* Stock Status Indicator */}
              <div className="pt-1">
                {inStock ? (
                  isLowStock ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Hurry, only {currentStock} left in stock!
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                      <Check className="w-3.5 h-3.5" />
                      In Stock ({currentStock} available)
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-xl">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Currently Out of Stock
                  </span>
                )}
              </div>

              {/* ── Multi-group Variant Selectors ── */}
              {product.variants?.length > 0 && (
                <div className="pt-4 space-y-4 border-t border-slate-100">
                  {product.variants.map((variantGroup) => {
                    const groupName = variantGroup.name;
                    const selectedVal = selectedVariantMap[groupName] || variantGroup.options?.[0]?.value;

                    return (
                      <div key={groupName} className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-bold text-slate-800 uppercase tracking-wider">
                            {groupName}: <span className="text-emerald-700 font-extrabold">{selectedVal}</span>
                          </label>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {variantGroup.options?.map((opt) => {
                            const isSelected = selectedVal === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() =>
                                  setSelectedVariantMap((prev) => ({
                                    ...prev,
                                    [groupName]: opt.value,
                                  }))
                                }
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                                  isSelected
                                    ? 'bg-emerald-50 border-[#124B38] text-[#124B38] ring-2 ring-emerald-200 shadow-2xs'
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                }`}
                              >
                                <span>{opt.value}</span>
                                {opt.price && opt.price !== product.price && (
                                  <span className="ml-1.5 text-[10px] text-slate-400 font-normal">
                                    (৳{opt.price})
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Purchase & Action Section */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-3">
                {/* Quantity Control */}
                <div className="flex items-center border border-slate-200 rounded-2xl bg-slate-50/50 p-1">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1 || !inStock}
                    aria-label="Decrease quantity"
                    className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-white rounded-xl disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-center text-xs font-extrabold text-slate-800">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(1)}
                    disabled={!inStock || (currentStock && quantity >= currentStock)}
                    aria-label="Increase quantity"
                    className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-white rounded-xl disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Add to Cart Button */}
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  disabled={!inStock}
                  loading={addingToCart}
                  onClick={handleAddToCart}
                  className="flex-1 min-w-[130px] gap-2 rounded-2xl border-slate-300 text-slate-800 hover:bg-slate-50"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {inStock ? 'Add to Cart' : 'Out of Stock'}
                </Button>

                {/* Buy Now Button */}
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  disabled={!inStock}
                  loading={buyingNow}
                  onClick={handleBuyNow}
                  className="flex-1 min-w-[130px] gap-2 rounded-2xl"
                >
                  <Zap className="w-4 h-4" />
                  Buy Now
                </Button>

                {/* Wishlist Button */}
                <button
                  type="button"
                  onClick={handleToggleWishlist}
                  disabled={wishlistLoading}
                  aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition cursor-pointer ${
                    isWishlisted
                      ? 'bg-red-50 border-red-200 text-red-500 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-400 hover:text-red-500 hover:border-slate-300'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-red-500' : ''}`} />
                </button>
              </div>

              {/* Chat with Seller Button */}
              <button
                type="button"
                onClick={() => setIsChatOpen(true)}
                className="w-full py-2.5 px-4 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-900 text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-emerald-700" />
                <span>Chat with Seller ({shopName || 'Store Owner'})</span>
                {isSellerVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 ml-0.5" />}
              </button>

              {/* Trust Badges Bar */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
                <div className="p-2 bg-slate-50/75 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
                  <Truck className="w-4 h-4 text-emerald-700 mb-1" />
                  <span className="text-[10px] font-bold text-slate-800">Fast Delivery</span>
                  <span className="text-[9px] text-slate-400">Within 24-48 hrs</span>
                </div>
                <div className="p-2 bg-slate-50/75 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
                  <RotateCcw className="w-4 h-4 text-emerald-700 mb-1" />
                  <span className="text-[10px] font-bold text-slate-800">7 Days Return</span>
                  <span className="text-[9px] text-slate-400">Easy & Free</span>
                </div>
                <div className="p-2 bg-slate-50/75 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 mb-1" />
                  <span className="text-[10px] font-bold text-slate-800">100% Authentic</span>
                  <span className="text-[9px] text-slate-400">Verified Seller</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ──────────────── Tabs Section Below Product ──────────────── */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-6">
          {/* Tab Navigation Headers */}
          <div className="flex border-b border-slate-200 gap-2 sm:gap-4 overflow-x-auto pb-2">
            {[
              { id: 'specs', label: '📋 Specifications & Overview' },
              ...(videoUrl ? [{ id: 'video', label: '🎬 Video Demo' }] : []),
              { id: 'reviews', label: `⭐ Reviews & Ratings (${reviewsList.length})` },
              { id: 'shipping', label: '🚚 Delivery & Returns' },
              { id: 'seller', label: '🏬 Seller Information' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveInfoTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer ${
                  activeInfoTab === tab.id
                    ? 'bg-[#124B38] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ────── TAB 1: SPECIFICATIONS & OVERVIEW ────── */}
          {activeInfoTab === 'specs' && (
            <div className="space-y-6 animate-in fade-in duration-100">
              <div className="prose prose-sm max-w-none text-slate-700">
                <h3 className="text-base font-bold text-slate-900 mb-2">Product Description</h3>
                <p className="leading-relaxed whitespace-pre-line text-xs sm:text-sm text-slate-600">
                  {product.description || 'No extended description provided.'}
                </p>
              </div>

              {/* Specifications Table */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
                  Key Specifications
                </h3>
                <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 text-xs">
                  <div className="grid grid-cols-3 p-3 bg-slate-50 font-semibold text-slate-500">
                    <div>Attribute</div>
                    <div className="col-span-2">Details</div>
                  </div>
                  <div className="grid grid-cols-3 p-3 hover:bg-slate-50/50">
                    <div className="font-semibold text-slate-700">Category</div>
                    <div className="col-span-2 text-slate-600">
                      {typeof product.category === 'object' ? product.category?.name : product.category}
                    </div>
                  </div>
                  {activeVariantDetails?.sku && (
                    <div className="grid grid-cols-3 p-3 hover:bg-slate-50/50">
                      <div className="font-semibold text-slate-700">SKU Number</div>
                      <div className="col-span-2 text-slate-600 font-mono">{activeVariantDetails.sku}</div>
                    </div>
                  )}
                  <div className="grid grid-cols-3 p-3 hover:bg-slate-50/50">
                    <div className="font-semibold text-slate-700">Stock Availability</div>
                    <div className="col-span-2 text-slate-600">{currentStock} units in stock</div>
                  </div>
                  {product.variants?.length > 0 && (
                    <div className="grid grid-cols-3 p-3 hover:bg-slate-50/50">
                      <div className="font-semibold text-slate-700">Available Variations</div>
                      <div className="col-span-2 text-slate-600">
                        {product.variants.map((v) => `${v.name} (${v.options.map((o) => o.value).join(', ')})`).join(' | ')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ────── TAB 2: VIDEO SHOWCASE ────── */}
          {activeInfoTab === 'video' && videoUrl && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Product Video Showcase</h3>
                  <p className="text-xs text-slate-500">Watch the official demonstration and real-world usage of this product.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsVideoModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 font-bold text-xs hover:bg-purple-100 transition cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Fullscreen Theater
                </button>
              </div>

              <div className="aspect-video w-full max-w-4xl mx-auto rounded-3xl overflow-hidden bg-black shadow-lg">
                {embedVideo ? (
                  <iframe
                    src={embedVideo}
                    title="Product Video Showcase"
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                ) : (
                  <video
                    src={videoUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            </div>
          )}

          {/* ────── TAB 3: REVIEWS & RATINGS ────── */}
          {activeInfoTab === 'reviews' && (
            <div className="space-y-8 animate-in fade-in duration-100">
              {/* Rating Summary Header & Progress Bars */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                {/* Score */}
                <div className="flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-slate-200 pb-4 md:pb-0 md:pr-6">
                  <span className="text-4xl sm:text-5xl font-extrabold text-[#124B38]">
                    {Number(product.rating?.average || 0).toFixed(1)}
                  </span>
                  <div className="mt-2">
                    <StarRating value={product.rating?.average || 0} size="lg" />
                  </div>
                  <span className="text-xs text-slate-400 mt-1 font-medium">
                    Based on {reviewsList.length} verified reviews
                  </span>
                </div>

                {/* Progress breakdown */}
                <div className="space-y-1.5 col-span-2 justify-center flex flex-col">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = starBreakdown[stars] || 0;
                    const pct = reviewsList.length ? Math.round((count / reviewsList.length) * 100) : 0;
                    return (
                      <div key={stars} className="flex items-center gap-3 text-xs">
                        <span className="w-8 font-semibold text-slate-600">{stars} ★</span>
                        <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-amber-400 h-full rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-slate-400 font-medium">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Review Actions & Verified Buyer Form Trigger */}
              <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  {canReviewInfo.canReview ? (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => setReviewFormOpen((prev) => !prev)}
                      className="gap-1.5 shadow-xs"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      {reviewFormOpen ? 'Cancel Review' : '✍ Write a Verified Review (with Photos & Video)'}
                    </Button>
                  ) : canReviewInfo.alreadyReviewed ? (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      You have reviewed this product
                    </span>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-xs font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Reviews are exclusive to verified purchasers who received this product.</span>
                    </div>
                  )}

                  {/* Filter by media only */}
                  <button
                    type="button"
                    onClick={() => setReviewFilterMediaOnly((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                      reviewFilterMediaOnly
                        ? 'bg-purple-50 border-purple-300 text-purple-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                    <span>With Photos & Videos</span>
                    <span className="ml-0.5 px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded-full text-[10px]">
                      {reviewsList.filter((r) => (r.images && r.images.length > 0) || (r.video && r.video.url)).length}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-medium">Sort Reviews:</span>
                  <select
                    value={reviewSort}
                    onChange={handleReviewSortChange}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#124B38] text-xs font-semibold"
                  >
                    {REVIEW_SORTS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Verified Buyer Review Form */}
              {reviewFormOpen && canReviewInfo.canReview && (
                <form
                  onSubmit={handleReviewSubmit}
                  className="bg-emerald-50/40 p-6 rounded-3xl border border-emerald-200 space-y-5 animate-in fade-in duration-150 shadow-2xs"
                >
                  <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                    <div className="space-y-0.5">
                      <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        Write Verified Buyer Review & Upload Media
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Share your genuine experience with other shoppers. You can add up to 5 photos and 1 product video!
                      </p>
                    </div>
                    <span className="text-[11px] text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full font-bold">
                      Verified Purchase
                    </span>
                  </div>

                  {/* Rating Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Overall Rating <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                          className="p-1 cursor-pointer hover:scale-115 transition-transform"
                          title={`${star} Star`}
                        >
                          <Star
                            className={`w-7 h-7 ${
                              star <= reviewForm.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-xs font-bold text-slate-700">
                        {reviewForm.rating === 5 && '⭐️⭐️⭐️⭐️⭐️ Excellent'}
                        {reviewForm.rating === 4 && '⭐️⭐️⭐️⭐️ Very Good'}
                        {reviewForm.rating === 3 && '⭐️⭐️⭐️ Average'}
                        {reviewForm.rating === 2 && '⭐️⭐️ Poor'}
                        {reviewForm.rating === 1 && '⭐️ Terrible'}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Review Headline / Summary
                    </label>
                    <input
                      type="text"
                      required
                      value={reviewForm.title}
                      onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                      placeholder="e.g. Premium quality, exceeded my expectations!"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                    />
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Detailed Review <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                      placeholder="What did you like or dislike about this product? How was the packaging, quality, and performance?"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                    />
                  </div>

                  {/* Photo & Video Upload Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {/* Photos Upload Box */}
                    <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Camera className="w-4 h-4 text-emerald-600" />
                          Add Product Photos ({reviewImages.length}/5)
                        </label>
                        <span className="text-[10px] text-slate-400">Max 10MB each</span>
                      </div>

                      {/* Image Preview Grid */}
                      <div className="flex flex-wrap gap-2.5 items-center">
                        {reviewImages.map((img) => (
                          <div
                            key={img.id}
                            className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden group bg-slate-50 shrink-0 flex items-center justify-center"
                          >
                            <img src={img.url} alt="Review attachment" className="w-full h-full object-cover" />
                            {img.isUploading && (
                              <div className="absolute inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center">
                                <Loader2 className="w-4 h-4 text-white animate-spin" />
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveReviewImage(img.id)}
                              className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Remove photo"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}

                        {reviewImages.length < 5 && (
                          <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-700 transition cursor-pointer shrink-0">
                            <Camera className="w-5 h-5 mb-0.5" />
                            <span className="text-[9px] font-bold">+ Photo</span>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={handleReviewImageSelect}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Video Upload Box */}
                    <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Video className="w-4 h-4 text-purple-600" />
                          Add Review Video (Max 100MB)
                        </label>
                        <span className="text-[10px] text-slate-400">MP4, WebM, MOV</span>
                      </div>

                      {reviewVideo ? (
                        <div className="relative rounded-xl border border-purple-200 overflow-hidden bg-purple-50 p-2.5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                              <Play className="w-4 h-4 fill-purple-600 text-purple-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-purple-900 truncate">
                                {reviewVideo.fileName || 'Product Review Video'}
                              </p>
                              <span className="text-[10px] text-purple-600">
                                {reviewVideo.isUploading ? 'Uploading to cloud...' : 'Ready for publishing'}
                              </span>
                            </div>
                          </div>

                          {reviewVideo.isUploading ? (
                            <Loader2 className="w-4 h-4 text-purple-600 animate-spin shrink-0 mr-2" />
                          ) : (
                            <button
                              type="button"
                              onClick={handleRemoveReviewVideo}
                              className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition cursor-pointer shrink-0"
                              title="Remove video"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <label className="w-full py-3 rounded-xl border-2 border-dashed border-purple-200 hover:border-purple-500 hover:bg-purple-50/50 flex items-center justify-center gap-2 text-purple-700 transition cursor-pointer text-xs font-bold">
                          <Video className="w-4 h-4" />
                          <span>Choose Video from Device</span>
                          <input
                            type="file"
                            accept="video/*"
                            onChange={handleReviewVideoSelect}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Submit Actions */}
                  <div className="flex justify-end gap-2.5 pt-2 border-t border-emerald-100">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setReviewFormOpen(false)}
                      className="rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      loading={submittingReview}
                      disabled={reviewImages.some((i) => i.isUploading) || reviewVideo?.isUploading}
                      className="rounded-xl shadow-xs"
                    >
                      Submit Verified Review
                    </Button>
                  </div>
                </form>
              )}

              {/* Reviews Feed */}
              {(() => {
                const displayedReviews = reviewFilterMediaOnly
                  ? reviewsList.filter((r) => (r.images && r.images.length > 0) || (r.video && r.video.url))
                  : reviewsList;

                if (displayedReviews.length === 0) {
                  return (
                    <div className="text-center py-12 bg-slate-50 rounded-3xl border border-slate-200 text-slate-400 text-xs space-y-2">
                      <MessageSquareQuote className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-600">
                        {reviewFilterMediaOnly
                          ? 'No reviews with photos or videos found for this product.'
                          : 'No reviews yet for this product. Be the first verified buyer to leave one!'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {displayedReviews.map((review) => {
                      const reviewId = review._id || review.id;
                      const hasImages = Array.isArray(review.images) && review.images.length > 0;
                      const hasVideo = Boolean(review.video?.url);

                      return (
                        <div
                          key={reviewId}
                          className="p-5 bg-slate-50/60 rounded-3xl border border-slate-200/80 space-y-3.5 hover:bg-white hover:shadow-xs transition duration-200"
                        >
                          {/* Review Header */}
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center font-bold text-xs">
                                {(review.user?.name || review.userName || 'B')[0].toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-xs">
                                    {review.user?.name || review.userName || 'Verified Buyer'}
                                  </span>
                                  {review.isVerifiedPurchase !== false && (
                                    <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-bold text-[10px] flex items-center gap-1">
                                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified Purchase
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 block">
                                  {review.createdAt ? new Date(review.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                                </span>
                              </div>
                            </div>

                            <StarRating value={review.rating} size="sm" />
                          </div>

                          {/* Review Title & Comment */}
                          <div className="space-y-1">
                            {review.title && (
                              <h5 className="font-bold text-slate-900 text-xs sm:text-sm">
                                {review.title}
                              </h5>
                            )}
                            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                              {review.comment}
                            </p>
                          </div>

                          {/* Customer Uploaded Media (Photos & Video) */}
                          {(hasImages || hasVideo) && (
                            <div className="pt-2 space-y-2 border-t border-slate-100">
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                Customer Photos & Video:
                              </span>
                              <div className="flex flex-wrap items-center gap-2.5">
                                {/* Photos */}
                                {hasImages &&
                                  review.images.map((img, imgIdx) => {
                                    const imgUrl = typeof img === 'string' ? img : img?.url;
                                    if (!imgUrl) return null;
                                    return (
                                      <button
                                        key={imgIdx}
                                        type="button"
                                        onClick={() =>
                                          setActiveReviewMediaLightbox({
                                            url: imgUrl,
                                            title: `Review photo by ${review.user?.name || 'Customer'}`
                                          })
                                        }
                                        className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-slate-200 hover:border-emerald-600 group transition cursor-pointer bg-slate-100 shrink-0"
                                      >
                                        <img src={imgUrl} alt="Review attachment" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                          <Eye className="w-4 h-4 drop-shadow" />
                                        </div>
                                      </button>
                                    );
                                  })}

                                {/* Video */}
                                {hasVideo && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveReviewVideoModal({
                                        url: review.video.url,
                                        title: `Review video by ${review.user?.name || 'Customer'}`
                                      })
                                    }
                                    className="relative w-28 h-16 sm:w-32 sm:h-20 rounded-2xl overflow-hidden border-2 border-purple-300 bg-purple-950 flex flex-col items-center justify-center text-white group hover:border-purple-500 transition cursor-pointer shrink-0 shadow-xs"
                                  >
                                    {review.video.thumbnail ? (
                                      <img src={review.video.thumbnail} alt="Video thumbnail" className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity" />
                                    ) : (
                                      <div className="w-full h-full bg-linear-to-br from-purple-900 to-slate-900 flex items-center justify-center" />
                                    )}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                                      <div className="w-7 h-7 rounded-full bg-purple-600/90 group-hover:bg-purple-600 flex items-center justify-center text-white shadow-md">
                                        <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                                      </div>
                                      <span className="text-[9px] font-bold uppercase tracking-wider bg-black/60 px-1.5 py-0.2 rounded-md">
                                        Watch Video
                                      </span>
                                    </div>
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Seller Official Reply */}
                          {review.reply && review.reply.comment && (
                            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1 text-xs">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
                                  <Store className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>Response from Seller ({shopName || 'Store Owner'})</span>
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                </div>
                                <span className="text-[10px] text-emerald-600">
                                  {review.reply.createdAt ? new Date(review.reply.createdAt).toLocaleDateString() : 'Official Reply'}
                                </span>
                              </div>
                              <p className="text-slate-700 text-xs leading-relaxed pl-5">
                                {review.reply.comment}
                              </p>
                            </div>
                          )}

                          {/* Review Footer Actions */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                            <span className="text-slate-400">
                              Was this review helpful?
                            </span>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleHelpful(reviewId)}
                                className="flex items-center gap-1.5 text-slate-600 hover:text-emerald-700 font-semibold transition cursor-pointer"
                              >
                                <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Helpful ({review.helpful || 0})</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReport(reviewId)}
                                className="flex items-center gap-1 hover:text-red-600 transition cursor-pointer text-slate-400"
                              >
                                <Flag className="w-3 h-3" /> Report
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ────── TAB 4: SHIPPING & RETURNS ────── */}
          {activeInfoTab === 'shipping' && (
            <div className="space-y-5 text-xs text-slate-600 leading-relaxed animate-in fade-in duration-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-emerald-700" /> Standard Delivery
                  </h4>
                  <p>
                    Delivery is handled directly by the nearby store or our trusted logistics network.
                    Estimated arrival is <strong>24 to 48 hours</strong> from order confirmation.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-emerald-700" /> 7 Days Hassle-Free Returns
                  </h4>
                  <p>
                    If the item is damaged, defective, or incorrect, you can request an easy exchange or full refund within 7 days of delivery.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ────── TAB 5: SELLER INFORMATION ────── */}
          {activeInfoTab === 'seller' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 text-2xl font-bold">
                    🏬
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                      {shopName || 'Verified Merchant Store'}
                      {isSellerVerified && <ShieldCheck className="w-4 h-4 text-emerald-600" />}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Official verified retailer on VectorX
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsChatOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-700" />
                    <span>Chat with Seller</span>
                  </button>
                  <Link
                    to={sellerId ? `/products?sellerId=${sellerId}` : '/products'}
                    className="px-5 py-2.5 rounded-xl bg-[#124B38] text-white text-xs font-semibold hover:bg-[#0d382a] transition shadow-2xs"
                  >
                    Visit Seller Store →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ──────────────── Related Products Grid ──────────────── */}
        {relatedProductsList.length > 0 && (
          <div className="space-y-4 pt-4">
            <h3 className="text-xl font-bold text-slate-900">Related Products</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {relatedProductsList.map((rel) => {
                const relId = rel.id || rel._id;
                const relImg = getProductImage(rel);
                return (
                  <Link
                    key={relId}
                    to={`/products/${rel.slug || relId}`}
                    className="bg-white p-3 rounded-2xl border border-slate-200 hover:shadow-md transition-all group flex flex-col justify-between space-y-2"
                  >
                    <div className="aspect-square bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center p-2">
                      <img
                        src={relImg}
                        alt={rel.name}
                        className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-slate-800 text-xs truncate group-hover:text-[#124B38] transition">
                        {rel.name}
                      </h4>
                      <span className="font-extrabold text-slate-900 text-xs block">
                        ৳{Number(rel.price).toLocaleString()}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ──────────────── Lightbox Modal ──────────────── */}
      {isLightboxOpen && (
        <Modal open={isLightboxOpen} onClose={() => setIsLightboxOpen(false)} size="2xl" title="Product Image Lightbox">
          <div className="p-2 flex items-center justify-center bg-black/90 rounded-2xl overflow-hidden min-h-[400px]">
            <img
              src={images[activeMedia]}
              alt={product.name}
              className="max-h-[70vh] w-auto object-contain"
            />
          </div>
        </Modal>
      )}

      {/* ──────────────── Customer Review Image Lightbox ──────────────── */}
      {activeReviewMediaLightbox && (
        <Modal
          open={Boolean(activeReviewMediaLightbox)}
          onClose={() => setActiveReviewMediaLightbox(null)}
          size="2xl"
          title={activeReviewMediaLightbox.title || 'Customer Review Photo'}
        >
          <div className="p-2 flex items-center justify-center bg-black/90 rounded-2xl overflow-hidden min-h-[400px]">
            <img
              src={activeReviewMediaLightbox.url}
              alt="Customer Review"
              className="max-h-[75vh] w-auto object-contain"
            />
          </div>
        </Modal>
      )}

      {/* ──────────────── Customer Review Video Theater Modal ──────────────── */}
      {activeReviewVideoModal && (
        <Modal
          open={Boolean(activeReviewVideoModal)}
          onClose={() => setActiveReviewVideoModal(null)}
          size="3xl"
          title={activeReviewVideoModal.title || 'Customer Video Review'}
        >
          <div className="p-2 flex items-center justify-center bg-black rounded-2xl overflow-hidden aspect-video w-full">
            <video
              src={activeReviewVideoModal.url}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
        </Modal>
      )}

      {/* ──────────────── Video Theater Modal ──────────────── */}
      {isVideoModalOpen && videoUrl && (
        <Modal open={isVideoModalOpen} onClose={() => setIsVideoModalOpen(false)} size="3xl" title={`Video Demo: ${product.name}`}>
          <div className="p-2 flex items-center justify-center bg-black rounded-2xl overflow-hidden aspect-video w-full">
            {embedVideo ? (
              <iframe
                src={embedVideo}
                title="Theater Mode Video"
                className="w-full h-full rounded-xl"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            ) : (
              <video
                src={videoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            )}
          </div>
        </Modal>
      )}

      {/* ──────────────── Bug / Issue Modal ──────────────── */}
      <Modal open={bugModalOpen} onClose={() => setBugModalOpen(false)} title="Report an Issue">
        <form onSubmit={handleBugSubmit} className="space-y-4 py-2 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Issue Category</label>
            <select
              value={bugReport.issueType}
              onChange={(e) => setBugReport({ ...bugReport, issueType: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white text-xs"
            >
              <option value="incorrect_info">Incorrect Product Information</option>
              <option value="broken_image">Broken Image or Video</option>
              <option value="pricing_issue">Pricing / Stock Inaccuracy</option>
              <option value="fake_product">Suspicious / Inauthentic Listing</option>
              <option value="other">Other Problem</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              required
              value={bugReport.description}
              onChange={(e) => setBugReport({ ...bugReport, description: e.target.value })}
              placeholder="Provide details about the issue..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" size="sm" onClick={() => setBugModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submittingBug}>
              Submit Report
            </Button>
          </div>
        </form>
      </Modal>

      {/* ──────────────── Mobile Floating Sticky Action Bar ──────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 px-4 shadow-lg flex items-center justify-between gap-3">
        <div>
          <span className="text-xs text-slate-400 block">Total Price:</span>
          <span className="text-lg font-extrabold text-[#124B38]">
            ৳{Number(currentPrice * quantity).toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-1 justify-end max-w-xs">
          <button
            type="button"
            onClick={() => setIsChatOpen(true)}
            className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition cursor-pointer shrink-0"
            title="Chat with Seller"
          >
            <MessageCircle className="w-4 h-4 text-emerald-700" />
          </button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!inStock}
            onClick={handleAddToCart}
            className="flex-1 text-xs"
          >
            Add to Cart
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={!inStock}
            onClick={handleBuyNow}
            className="flex-1 text-xs"
          >
            Buy Now
          </Button>
        </div>
      </div>

      {/* ──────────────── Product Chat With Seller Modal ──────────────── */}
      <ProductChatModal
        open={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        product={product}
        seller={product?.sellerId || product?.seller}
      />
    </div>
  );
};

export default ProductDetails;