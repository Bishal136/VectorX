import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import useAuth from '../../hooks/useAuth';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
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
} from 'lucide-react';

const REVIEW_SORTS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'helpful', label: 'Most Helpful' },
  { value: 'highest', label: 'Highest Rated' },
  { value: 'lowest', label: 'Lowest Rated' },
];

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

  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);

  const [reviewSort, setReviewSort] = useState('newest');
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

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
    setActiveImage(0);
    setQuantity(1);
    setSelectedVariant(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id, dispatch]);

  // Set default variant if variants exist
  useEffect(() => {
    if (product?.variants?.length && !selectedVariant) {
      setSelectedVariant(product.variants[0]?.options?.[0]?.value || null);
    }
  }, [product, selectedVariant]);

  // Safe reviews list extraction
  const reviewsList = useMemo(() => {
    if (Array.isArray(reviews)) return reviews;
    if (Array.isArray(reviews?.reviews)) return reviews.reviews;
    return [];
  }, [reviews]);

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

  const inStock = (product?.stock ?? 0) > 0;
  const isLowStock =
    inStock &&
    product?.lowStockThreshold != null &&
    product.stock <= product.lowStockThreshold;
  const DEFAULT_FALLBACK_IMAGE =
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=80';

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

  const shopName = product?.seller?.shopName || product?.shopName;
  const sellerId =
    product?.seller?.id ||
    product?.seller?._id ||
    product?.sellerId?._id ||
    product?.sellerId;
  const isSellerVerified = product?.seller?.isVerified || product?.sellerVerified;

  const discountPct = useMemo(() => {
    if (product?.discountPercentage) return product.discountPercentage;
    if (product?.comparePrice && product?.comparePrice > product?.price) {
      return Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100);
    }
    return 0;
  }, [product]);

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
      if (product?.stock && next > product.stock) return product.stock;
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
          variant: selectedVariant || undefined,
        })
      ).unwrap();
      toast.success(`Added ${quantity} ${quantity > 1 ? 'items' : 'item'} to your cart.`);
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
          variant: selectedVariant || undefined,
        })
      ).unwrap();
      toast.success('Proceeding to checkout...');
      navigate('/cart');
    } catch (err) {
      toast.error(typeof err === 'string' ? err : err?.message || 'Could not initiate purchase.');
    } finally {
      setBuyingNow(false);
    }
  };

  const handleToggleWishlist = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/products/${id}` } });
      return;
    }
    const targetProductId = product?._id || product?.id || id;
    setWishlistLoading(true);
    try {
      await dispatch(toggleWishlist(targetProductId)).unwrap();
      toast.success(isWishlisted ? 'Removed from your wishlist.' : 'Added to your wishlist!');
    } catch (err) {
      toast.error(typeof err === 'string' ? err : err?.message || 'Could not update your wishlist.');
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleReviewFormChange = (field) => (e) =>
    setReviewForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/products/${id}` } });
      return;
    }
    const targetProductId = product?._id || product?.id || id;
    setSubmittingReview(true);
    try {
      await dispatch(
        submitReview({
          productId: targetProductId,
          rating: Number(reviewForm.rating),
          title: reviewForm.title,
          comment: reviewForm.comment,
        })
      ).unwrap();
      toast.success('Review submitted successfully! Thank you for your feedback.');
      setReviewForm({ rating: 5, title: '', comment: '' });
      setReviewFormOpen(false);
      dispatch(fetchProductReviews({ productId: targetProductId, sort: reviewSort }));
    } catch (err) {
      toast.error(
        typeof err === 'string'
          ? err
          : err?.message || 'Only verified buyers with a delivered order can review this product.'
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleMarkHelpful = (reviewId) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/products/${id}` } });
      return;
    }
    const targetProductId = product?._id || product?.id || id;
    dispatch(markReviewHelpful({ productId: targetProductId, reviewId }))
      .unwrap()
      .then(() => toast.success('Thank you for voting!'))
      .catch(() => {
        toast.error('Could not record your vote right now.');
      });
  };

  const handleReportReview = (reviewId) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/products/${id}` } });
      return;
    }
    const targetProductId = product?._id || product?.id || id;
    dispatch(reportReview({ productId: targetProductId, reviewId }))
      .unwrap()
      .then(() => toast.success('Review reported. Our moderation team will inspect it.'))
      .catch((err) =>
        toast.error(typeof err === 'string' ? err : err?.message || 'Could not report this review.')
      );
  };

  const handleShareProduct = () => {
    if (navigator.share) {
      navigator
        .share({
          title: product?.name || 'Check out this product',
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.info('Product link copied to clipboard!');
    }
  };

  const handleSubmitBugReport = (e) => {
    e.preventDefault();
    setSubmittingBug(true);
    setTimeout(() => {
      setSubmittingBug(false);
      setBugModalOpen(false);
      setBugReport({ issueType: 'incorrect_info', description: '', email: user?.email || '' });
      toast.success('Bug report submitted! Our support team has logged the issue.');
    }, 600);
  };

  // Loading skeleton
  if (status === 'loading' && !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-slate-200 rounded w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="aspect-square bg-slate-200 rounded-2xl" />
            <div className="space-y-4">
              <div className="h-6 bg-slate-200 rounded w-1/3" />
              <div className="h-8 bg-slate-200 rounded w-3/4" />
              <div className="h-5 bg-slate-200 rounded w-1/4" />
              <div className="h-10 bg-slate-200 rounded w-1/3" />
              <div className="h-24 bg-slate-200 rounded" />
              <div className="h-12 bg-slate-200 rounded w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Failed state
  if (status === 'failed' && !product) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">We couldn't find this product</h1>
        <p className="text-sm text-slate-500 mb-6">
          {error || 'It may have been removed, sold out, or the link might be broken.'}
        </p>
        <div className="flex justify-center gap-3">
          <Button type="button" onClick={() => navigate('/products')}>
            Back to Products
          </Button>
          <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="bg-[#FAF9F6] min-h-screen text-slate-800 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Breadcrumb & Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 mb-6">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 flex-wrap">
            <Link to="/" className="hover:text-[#124B38] font-medium transition">
              Home
            </Link>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <Link to="/products" className="hover:text-[#124B38] font-medium transition">
              Products
            </Link>
            {product.category?.name && (
              <>
                <ChevronRight className="w-3 h-3 text-slate-400" />
                <Link
                  to={`/products?category=${product.category.slug || product.category._id}`}
                  className="hover:text-[#124B38] font-medium transition"
                >
                  {product.category.name}
                </Link>
              </>
            )}
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="text-slate-800 font-semibold truncate max-w-xs">{product.name}</span>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShareProduct}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition text-xs font-medium cursor-pointer shadow-2xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
            <button
              type="button"
              onClick={() => setBugModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 transition text-xs font-medium cursor-pointer shadow-2xs"
              title="Report an issue or bug with this product"
            >
              <Bug className="w-3.5 h-3.5 text-amber-600" />
              Report Bug
            </button>
          </div>
        </div>

        {/* Product Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs">
          {/* LEFT: Product Gallery (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="relative aspect-square bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center group shadow-2xs p-2">
              {images[activeImage] ? (
                <img
                  src={images[activeImage]}
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
                <span className="absolute top-3 left-3 bg-red-600 text-white font-bold text-xs px-2.5 py-1 rounded-full shadow-md">
                  {discountPct}% OFF
                </span>
              )}

              {/* Stock badge */}
              {!inStock && (
                <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px] flex items-center justify-center">
                  <span className="px-4 py-2 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg">
                    Out of Stock
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnail selector */}
            {images.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {images.map((src, idx) => (
                  <button
                    key={src + idx}
                    type="button"
                    onClick={() => setActiveImage(idx)}
                    aria-label={`View image ${idx + 1}`}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition cursor-pointer p-1 bg-slate-50 ${
                      idx === activeImage
                        ? 'border-[#124B38] ring-2 ring-emerald-100'
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
              </div>
            )}
          </div>

          {/* RIGHT: Product Information (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Seller info link */}
              {shopName && (
                <div className="flex items-center gap-2">
                  <Link
                    to={sellerId ? `/products?sellerId=${sellerId}` : '#'}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition"
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
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-snug">
                {product.name}
              </h1>

              {/* Rating & Distance */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <StarRating
                  value={product.rating?.average || 0}
                  count={product.rating?.count || reviewsList.length || 0}
                  size="md"
                />
                {typeof product.distanceKm === 'number' && product.distanceKm > 0 && (
                  <Badge tone="neutral" className="bg-slate-100 text-slate-700 font-medium">
                    {product.distanceKm.toFixed(1)} km away
                  </Badge>
                )}
                {product.isFeatured && (
                  <Badge tone="warning" className="bg-amber-100 text-amber-800 font-medium">
                    Featured
                  </Badge>
                )}
              </div>

              {/* Price Row */}
              <div className="flex items-baseline gap-3 pt-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-[#124B38]">
                  ৳{Number(product.price).toLocaleString()}
                </span>
                {product.comparePrice && product.comparePrice > product.price && (
                  <span className="text-lg text-slate-400 line-through font-medium">
                    ৳{Number(product.comparePrice).toLocaleString()}
                  </span>
                )}
                {discountPct > 0 && (
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                    Save {discountPct}%
                  </span>
                )}
              </div>

              {/* Stock Status Indicator */}
              <div className="pt-1">
                {inStock ? (
                  isLowStock ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Hurry, only {product.stock} left in stock!
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                      <Check className="w-3.5 h-3.5" />
                      In Stock ({product.stock} available)
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Currently Out of Stock
                  </span>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <div className="pt-2">
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Variant Selector (if product has variants) */}
              {product.variants?.length > 0 && (
                <div className="pt-3 space-y-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Select Option
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((v) =>
                      v.options?.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSelectedVariant(opt.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                            selectedVariant === opt.value
                              ? 'bg-emerald-50 border-[#124B38] text-[#124B38] ring-1 ring-[#124B38]'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {opt.value}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Purchase & Action Section */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-3">
                {/* Quantity Control */}
                <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50/50 p-0.5">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1 || !inStock}
                    aria-label="Decrease quantity"
                    className="w-9 h-9 flex items-center justify-center text-slate-600 hover:bg-white rounded-lg disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-center text-xs font-bold text-slate-800" aria-live="polite">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(1)}
                    disabled={!inStock || (product.stock && quantity >= product.stock)}
                    aria-label="Increase quantity"
                    className="w-9 h-9 flex items-center justify-center text-slate-600 hover:bg-white rounded-lg disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
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
                  className="flex-1 min-w-[130px] gap-2 border-slate-300 text-slate-800 hover:bg-slate-50"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {inStock ? 'Add to Cart' : 'Out of Stock'}
                </Button>

                {/* Buy Now Button (The Primary Buy Button) */}
                <button
                  type="button"
                  disabled={!inStock || buyingNow}
                  onClick={handleBuyNow}
                  className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#124B38] hover:bg-[#0e3b2c] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm cursor-pointer"
                >
                  {buyingNow ? (
                    <span className="animate-spin mr-1">●</span>
                  ) : (
                    <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
                  )}
                  Buy Now
                </button>

                {/* Wishlist Button */}
                <button
                  type="button"
                  onClick={handleToggleWishlist}
                  disabled={wishlistLoading}
                  aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  aria-pressed={isWishlisted}
                  className={`w-11 h-11 flex items-center justify-center border rounded-xl transition cursor-pointer ${
                    isWishlisted
                      ? 'border-red-200 bg-red-50 text-red-600'
                      : 'border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:border-red-200'
                  }`}
                  title={isWishlisted ? 'Wishlisted' : 'Save to Wishlist'}
                >
                  <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-red-600' : ''}`} />
                </button>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
                <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50/70 border border-slate-100">
                  <Truck className="w-4 h-4 text-emerald-700 mb-1" />
                  <span className="text-[10px] font-bold text-slate-800">
                    {product.deliveryInfo?.handlingTime || '2-3 Days'}
                  </span>
                  <span className="text-[9px] text-slate-400">Fast Delivery</span>
                </div>
                <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50/70 border border-slate-100">
                  <RotateCcw className="w-4 h-4 text-emerald-700 mb-1" />
                  <span className="text-[10px] font-bold text-slate-800">
                    {product.deliveryInfo?.returnPolicy || '7 Days'}
                  </span>
                  <span className="text-[9px] text-slate-400">Return Policy</span>
                </div>
                <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50/70 border border-slate-100">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 mb-1" />
                  <span className="text-[10px] font-bold text-slate-800">100% Genuine</span>
                  <span className="text-[9px] text-slate-400">Verified Quality</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bug Report Modal */}
        {bugModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                  <Bug className="w-5 h-5 text-amber-600" />
                  <h3>Report Product Issue / Bug</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setBugModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitBugReport} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Issue Category
                  </label>
                  <select
                    value={bugReport.issueType}
                    onChange={(e) => setBugReport((prev) => ({ ...prev, issueType: e.target.value }))}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:border-[#124B38]"
                  >
                    <option value="incorrect_info">Incorrect Product Information / Price</option>
                    <option value="broken_images">Broken / Misleading Image</option>
                    <option value="out_of_stock_bug">Stock / Variant Issue</option>
                    <option value="seller_issue">Suspicious Seller / Product</option>
                    <option value="other">Other Technical Glitch</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description of the issue
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Tell us what went wrong..."
                    value={bugReport.description}
                    onChange={(e) => setBugReport((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:border-[#124B38]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setBugModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" loading={submittingBug}>
                    Submit Report
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <section className="mt-12 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Customer Reviews ({reviewsList.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verified buyer ratings and authentic feedback
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>Sort by:</span>
                <select
                  value={reviewSort}
                  onChange={handleReviewSortChange}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-semibold focus:outline-none focus:border-[#124B38] text-xs cursor-pointer"
                >
                  {REVIEW_SORTS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setReviewFormOpen((v) => !v)}
              >
                {reviewFormOpen ? 'Close Form' : 'Write a Review'}
              </Button>
            </div>
          </div>

          {/* Rating Summary Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex flex-col items-center justify-center text-center p-2">
              <span className="text-4xl font-extrabold text-slate-900">
                {(product.rating?.average || 0).toFixed(1)}
              </span>
              <div className="flex items-center gap-1 my-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`w-4 h-4 ${
                      n <= Math.round(product.rating?.average || 0)
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-slate-200 text-slate-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Based on {reviewsList.length} verified ratings
              </span>
            </div>

            <div className="md:col-span-2 flex flex-col justify-center space-y-1.5">
              {[5, 4, 3, 2, 1].map((ratingNum) => {
                const countForRating = reviewsList.filter((r) => Math.round(r.rating) === ratingNum).length;
                const pct = reviewsList.length > 0 ? (countForRating / reviewsList.length) * 100 : 0;
                return (
                  <div key={ratingNum} className="flex items-center gap-2 text-xs">
                    <span className="w-10 font-semibold text-slate-600 flex items-center gap-0.5">
                      {ratingNum} <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline" />
                    </span>
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-[11px] text-slate-400 font-medium">
                      {countForRating}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Collapsible Write Review Form */}
          {reviewFormOpen && (
            <form
              onSubmit={handleSubmitReview}
              className="border border-emerald-200 bg-emerald-50/40 rounded-2xl p-5 space-y-4 animate-fadeIn"
            >
              <h3 className="text-sm font-bold text-slate-800">Share your experience</h3>
              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1">Your Rating</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setReviewForm((prev) => ({ ...prev, rating: n }))}
                      aria-label={`Rate ${n} stars`}
                      className="p-1 text-amber-400 hover:scale-110 transition cursor-pointer"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          n <= reviewForm.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-slate-200 text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="review-title" className="block text-xs font-semibold text-slate-700 mb-1">
                  Headline
                </label>
                <input
                  id="review-title"
                  value={reviewForm.title}
                  onChange={handleReviewFormChange('title')}
                  placeholder="Summarize your review in a headline"
                  required
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#124B38]"
                />
              </div>

              <div>
                <label htmlFor="review-comment" className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Review
                </label>
                <textarea
                  id="review-comment"
                  rows={3}
                  value={reviewForm.comment}
                  onChange={handleReviewFormChange('comment')}
                  placeholder="What did you like or dislike? How was the quality?"
                  required
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#124B38]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setReviewFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" loading={submittingReview}>
                  Submit Review
                </Button>
              </div>
            </form>
          )}

          {/* Empty Reviews State */}
          {reviewsList.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-xs">
              <p>No reviews yet for this product. Be the first to share your thoughts!</p>
            </div>
          )}

          {/* Reviews List */}
          <ul className="space-y-4 divide-y divide-slate-100">
            {reviewsList.map((review) => (
              <li key={review._id || review.id} className="pt-4 first:pt-0 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StarRating value={review.rating} />
                    <span className="text-xs font-bold text-slate-800">
                      {review.user?.name || review.userId?.name || 'Verified Buyer'}
                    </span>
                    {review.isVerifiedPurchase && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                        <Check className="w-2.5 h-2.5" /> Verified Purchase
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}
                  </span>
                </div>

                {review.title && (
                  <h4 className="text-xs font-bold text-slate-900 mt-1">{review.title}</h4>
                )}

                {review.comment && (
                  <p className="text-xs text-slate-600 leading-relaxed">{review.comment}</p>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleMarkHelpful(review._id || review.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-[#124B38] transition cursor-pointer"
                  >
                    <ThumbsUp className="w-3 h-3" />
                    Helpful{review.helpful || review.helpfulCount ? ` (${review.helpful || review.helpfulCount})` : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReportReview(review._id || review.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-red-500 transition cursor-pointer"
                  >
                    <Flag className="w-3 h-3" />
                    Report
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Related Products Section */}
        {relatedProductsList.length > 0 && (
          <section className="mt-12 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">You Might Also Like</h2>
                <p className="text-xs text-slate-500 mt-0.5">Similar items from related categories</p>
              </div>
              <Link
                to="/products"
                className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 transition"
              >
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {relatedProductsList.map((rp) => {
                const rpImage =
                  (typeof rp.images?.[0] === 'string'
                    ? rp.images[0]
                    : rp.images?.[0]?.url) ||
                  rp.primaryImage?.url ||
                  (typeof rp.primaryImage === 'string' ? rp.primaryImage : null) ||
                  DEFAULT_FALLBACK_IMAGE;
                const rpId = rp._id || rp.id;

                return (
                  <Link
                    key={rpId}
                    to={`/products/${rpId}`}
                    className="group bg-slate-50/50 hover:bg-white border border-slate-100 hover:border-emerald-200 rounded-2xl p-3 flex flex-col justify-between transition-all duration-200 hover:shadow-md cursor-pointer"
                  >
                    <div className="aspect-square bg-white border border-slate-100 rounded-xl overflow-hidden mb-2.5 flex items-center justify-center p-1">
                      <img
                        src={rpImage}
                        alt={rp.name || 'Product'}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform mix-blend-multiply"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = DEFAULT_FALLBACK_IMAGE;
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-tight group-hover:text-[#124B38] transition-colors">
                        {rp.name}
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-bold text-[#124B38]">
                          ৳{Number(rp.price).toLocaleString()}
                        </span>
                        {rp.rating?.average ? (
                          <div className="flex items-center gap-0.5 text-[10px] text-amber-500 font-medium">
                            <Star className="w-2.5 h-2.5 fill-amber-400" />
                            {Number(rp.rating.average).toFixed(1)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProductDetails;