import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  fetchProducts,
  setFilters,
  clearFilters,
  setPagination,
} from '../../features/products/productSlice';
import { addToCart } from '../../features/cart/cartSlice';
import { toggleWishlist } from '../../features/user/userSlice';
import { toast } from 'react-toastify';
import axiosInstance from '../../services/axiosInstance';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import {
  Star,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  MapPin,
  AlertCircle,
  ShoppingBag,
  Search,
  X,
  Check,
  Loader2,
  Filter,
  Heart,
  Eye,
  Grid,
  List,
  Play,
  Sparkles,
  ShieldCheck,
  Percent,
  PackageCheck,
  Store,
} from 'lucide-react';

const DEFAULT_CATEGORIES = [
  { id: 'all', slug: 'all', name: 'All Categories' },
];

const DEFAULT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=80';

const getProductImage = (product) => {
  if (!product) return DEFAULT_FALLBACK_IMAGE;

  if (product.primaryImage) {
    if (typeof product.primaryImage === 'string' && product.primaryImage.trim()) {
      return product.primaryImage.trim();
    }
    if (typeof product.primaryImage === 'object' && product.primaryImage.url) {
      return product.primaryImage.url;
    }
  }

  if (Array.isArray(product.images) && product.images.length > 0) {
    const primary = product.images.find((img) => img?.isPrimary && img?.url);
    if (primary?.url) return primary.url;

    const first = product.images[0];
    if (typeof first === 'string' && first.trim()) return first.trim();
    if (typeof first === 'object' && first?.url) return first.url;
  }

  if (typeof product.image === 'string' && product.image.trim()) {
    return product.image.trim();
  }
  if (typeof product.thumbnail === 'string' && product.thumbnail.trim()) {
    return product.thumbnail.trim();
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

const getProductVideoUrl = (product) => {
  if (!product) return null;
  if (typeof product.video === 'string' && product.video.trim()) {
    return product.video.trim();
  }
  if (product.video?.url && typeof product.video.url === 'string' && product.video.url.trim()) {
    return product.video.url.trim();
  }
  if (typeof product.videoUrl === 'string' && product.videoUrl.trim()) {
    return product.videoUrl.trim();
  }
  if (typeof product.video_url === 'string' && product.video_url.trim()) {
    return product.video_url.trim();
  }
  return null;
};

const PRICE_PRESETS = [
  { label: 'Under ৳500', min: null, max: 500 },
  { label: '৳500 - ৳1,000', min: 500, max: 1000 },
  { label: '৳1,000 - ৳2,500', min: 1000, max: 2500 },
  { label: 'Above ৳2,500', min: 2500, max: null },
];

/**
 * FilterPanel Component
 */
function FilterPanel({
  categoriesList,
  selectedCategory,
  onCategoryChange,
  localMinPrice,
  setLocalMinPrice,
  localMaxPrice,
  setLocalMaxPrice,
  onPriceApply,
  onPricePresetSelect,
  onPriceClear,
  selectedRating,
  onRatingFilter,
  inStockOnly,
  onInStockToggle,
  onSaleOnly,
  onOnSaleToggle,
  hasActiveFilters,
  onClearAll,
}) {
  const isPriceSet = localMinPrice !== '' || localMaxPrice !== '';

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
      {/* Filter Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 className="font-bold text-base text-[#124B38] flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          Filter Products
        </h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 transition cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Reset All
          </button>
        )}
      </div>

      {/* Quick Toggles: In Stock & On Sale */}
      <div className="space-y-2.5">
        <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer">
          <span className="text-xs font-semibold text-slate-700 flex items-center gap-2">
            <PackageCheck className="w-3.5 h-3.5 text-emerald-700" />
            In-Stock Items Only
          </span>
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => onInStockToggle(e.target.checked)}
            className="w-4 h-4 text-emerald-700 rounded border-slate-300 focus:ring-emerald-600 cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer">
          <span className="text-xs font-semibold text-slate-700 flex items-center gap-2">
            <Percent className="w-3.5 h-3.5 text-red-600" />
            Discounted / On Sale
          </span>
          <input
            type="checkbox"
            checked={onSaleOnly}
            onChange={(e) => onOnSaleToggle(e.target.checked)}
            className="w-4 h-4 text-emerald-700 rounded border-slate-300 focus:ring-emerald-600 cursor-pointer"
          />
        </label>
      </div>

      <hr className="border-slate-100" />

      {/* 1. Category Filter */}
      <div>
        <h3 className="font-semibold text-xs text-slate-900 uppercase tracking-wider mb-3">
          Categories
        </h3>
        <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
          {categoriesList.map((cat) => {
            const isSelected =
              (!selectedCategory && (cat.id === 'all' || cat.slug === 'all')) ||
              selectedCategory === cat.slug ||
              selectedCategory === cat.id ||
              selectedCategory === cat.name;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategoryChange(cat.id === 'all' ? '' : cat.slug || cat.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50 text-[#124B38] font-bold border border-emerald-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
              >
                <span>{cat.name}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#124B38]" />}
              </button>
            );
          })}
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* 2. Price Range Filter */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-xs text-slate-900 uppercase tracking-wider">
            Price Range (৳)
          </h3>
          {isPriceSet && (
            <button
              type="button"
              onClick={onPriceClear}
              className="text-[11px] text-red-500 hover:text-red-700 font-medium transition cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Preset Chips */}
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {PRICE_PRESETS.map((preset, idx) => {
            const isActive =
              (preset.min === null || Number(localMinPrice) === preset.min) &&
              (preset.max === null || Number(localMaxPrice) === preset.max);

            return (
              <button
                key={idx}
                type="button"
                onClick={() => onPricePresetSelect(preset.min, preset.max)}
                className={`text-[11px] py-1.5 px-2 rounded-lg border text-center transition cursor-pointer font-medium truncate ${
                  isActive
                    ? 'bg-emerald-50 border-emerald-300 text-[#124B38] font-bold'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Min / Max Inputs */}
        <form onSubmit={onPriceApply} className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                Min Price
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-2.5 text-xs text-slate-400 font-medium">৳</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={localMinPrice}
                  onChange={(e) => setLocalMinPrice(e.target.value)}
                  className="w-full pl-6 pr-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#124B38] focus:ring-1 focus:ring-[#124B38] bg-slate-50/50"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                Max Price
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-2.5 text-xs text-slate-400 font-medium">৳</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Any"
                  value={localMaxPrice}
                  onChange={(e) => setLocalMaxPrice(e.target.value)}
                  className="w-full pl-6 pr-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#124B38] focus:ring-1 focus:ring-[#124B38] bg-slate-50/50"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#124B38] hover:bg-[#0d382a] text-white py-2 rounded-xl text-xs font-semibold transition active:scale-[0.98] cursor-pointer shadow-2xs"
          >
            Apply Price Filter
          </button>
        </form>
      </div>

      <hr className="border-slate-100" />

      {/* 3. Rating Filter */}
      <div>
        <h3 className="font-semibold text-xs text-slate-900 uppercase tracking-wider mb-3">
          Customer Rating
        </h3>
        <div className="space-y-1">
          {[5, 4, 3, 2, 1].map((stars) => {
            const isSelected = selectedRating === stars;
            return (
              <button
                key={stars}
                type="button"
                onClick={() => onRatingFilter(stars)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50 border border-emerald-200 font-semibold text-[#124B38]'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < stars
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-200 fill-slate-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-slate-500 font-medium">& Up</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ProductListing() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Redux state
  const {
    items: products = [],
    filters,
    pagination,
    sortedBy,
    fallbackUsed,
    status,
    error,
  } = useSelector((state) => state.products);

  const { isAuthenticated } = useSelector((state) => state.auth || {});
  const wishlist = useSelector((state) => state.user?.wishlist || []);

  // View mode: 'grid' | 'list'
  const [viewMode, setViewMode] = useState('grid');

  // Quick View Modal product
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [quickViewActiveImage, setQuickViewActiveImage] = useState(0);
  const [quickViewQty, setQuickViewQty] = useState(1);

  // Local state
  const [categoriesList, setCategoriesList] = useState(DEFAULT_CATEGORIES);
  const [localMinPrice, setLocalMinPrice] = useState(
    filters.minPrice !== null && filters.minPrice !== undefined ? String(filters.minPrice) : ''
  );
  const [localMaxPrice, setLocalMaxPrice] = useState(
    filters.maxPrice !== null && filters.maxPrice !== undefined ? String(filters.maxPrice) : ''
  );
  const [selectedVariants, setSelectedVariants] = useState({});
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);

  const [addingToCartId, setAddingToCartId] = useState(null);
  const [justAddedId, setJustAddedId] = useState(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Fetch categories from server
  useEffect(() => {
    let isMounted = true;
    axiosInstance
      .get('/products/categories')
      .then((res) => {
        if (isMounted && res.data?.data && res.data.data.length > 0) {
          const formatted = [
            { id: 'all', slug: 'all', name: 'All Categories' },
            ...res.data.data.map((c) => ({
              id: c._id,
              slug: c.slug || c.name.toLowerCase().replace(/\s+/g, '-'),
              name: c.name,
            })),
          ];
          setCategoriesList(formatted);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync query params into Redux filters
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const searchParam = searchParams.get('search');
    const sortParam = searchParams.get('sort');
    const minPriceParam = searchParams.get('minPrice');
    const maxPriceParam = searchParams.get('maxPrice');
    const ratingParam = searchParams.get('minRating');
    const pageParam = searchParams.get('page');

    const updated = {};
    if (categoryParam !== null) updated.category = categoryParam;
    if (searchParam !== null) updated.search = searchParam;
    if (sortParam !== null) updated.sort = sortParam;
    if (minPriceParam !== null) updated.minPrice = Number(minPriceParam);
    if (maxPriceParam !== null) updated.maxPrice = Number(maxPriceParam);
    if (ratingParam !== null) updated.minRating = Number(ratingParam);

    if (Object.keys(updated).length > 0) {
      dispatch(setFilters(updated));
    }
    if (pageParam) {
      dispatch(setPagination({ page: Number(pageParam) }));
    }
  }, [searchParams, dispatch]);

  const executeFetch = useCallback(() => {
    dispatch(
      fetchProducts({
        category: filters.category,
        search: filters.search,
        sort: filters.sort,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        minRating: filters.minRating,
        page: pagination.page,
        limit: 12,
      })
    );
  }, [dispatch, filters, pagination.page]);

  useEffect(() => {
    executeFetch();
  }, [executeFetch]);

  // Handle wishlisting
  const isProductWishlisted = (productId) => {
    if (!Array.isArray(wishlist)) return false;
    return wishlist.some(
      (item) => (typeof item === 'string' ? item : item?._id || item?.id) === productId
    );
  };

  const handleToggleWishlist = async (productId, e) => {
    if (e) e.stopPropagation();
    if (!isAuthenticated) {
      toast.info('Please log in to save items to your wishlist.');
      navigate('/login');
      return;
    }
    try {
      await dispatch(toggleWishlist(productId)).unwrap();
      const isNowInWishlist = !isProductWishlisted(productId);
      toast.success(isNowInWishlist ? 'Saved to wishlist!' : 'Removed from wishlist.');
    } catch {
      toast.error('Could not update wishlist.');
    }
  };

  // Filter actions
  const handleCategoryChange = (categorySlug) => {
    const nextCat = categorySlug === 'all' || categorySlug === '' ? null : categorySlug;
    dispatch(setFilters({ category: nextCat }));
    dispatch(setPagination({ page: 1 }));

    const newParams = new URLSearchParams(searchParams);
    if (nextCat) newParams.set('category', nextCat);
    else newParams.delete('category');
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handlePriceApply = (e) => {
    if (e) e.preventDefault();
    const min = localMinPrice !== '' ? Number(localMinPrice) : null;
    const max = localMaxPrice !== '' ? Number(localMaxPrice) : null;

    dispatch(setFilters({ minPrice: min, maxPrice: max }));
    dispatch(setPagination({ page: 1 }));

    const newParams = new URLSearchParams(searchParams);
    if (min !== null) newParams.set('minPrice', String(min));
    else newParams.delete('minPrice');
    if (max !== null) newParams.set('maxPrice', String(max));
    else newParams.delete('maxPrice');
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handlePricePresetSelect = (min, max) => {
    setLocalMinPrice(min !== null ? String(min) : '');
    setLocalMaxPrice(max !== null ? String(max) : '');
    dispatch(setFilters({ minPrice: min, maxPrice: max }));
    dispatch(setPagination({ page: 1 }));

    const newParams = new URLSearchParams(searchParams);
    if (min !== null) newParams.set('minPrice', String(min));
    else newParams.delete('minPrice');
    if (max !== null) newParams.set('maxPrice', String(max));
    else newParams.delete('maxPrice');
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handlePriceClear = () => {
    setLocalMinPrice('');
    setLocalMaxPrice('');
    dispatch(setFilters({ minPrice: null, maxPrice: null }));
    dispatch(setPagination({ page: 1 }));

    const newParams = new URLSearchParams(searchParams);
    newParams.delete('minPrice');
    newParams.delete('maxPrice');
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleRatingFilter = (rating) => {
    const nextRating = filters.minRating === rating ? null : rating;
    dispatch(setFilters({ minRating: nextRating }));
    dispatch(setPagination({ page: 1 }));

    const newParams = new URLSearchParams(searchParams);
    if (nextRating !== null) newParams.set('minRating', String(nextRating));
    else newParams.delete('minRating');
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleClearAll = () => {
    setLocalMinPrice('');
    setLocalMaxPrice('');
    setInStockOnly(false);
    setOnSaleOnly(false);
    dispatch(clearFilters());
    setSearchParams({});
  };

  const handleClearSearch = () => {
    dispatch(setFilters({ search: '' }));
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('search');
    setSearchParams(newParams);
  };

  const handleSortChange = (e) => {
    const newSort = e.target.value;
    dispatch(setFilters({ sort: newSort }));
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sort', newSort);
    setSearchParams(newParams);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > (pagination.totalPages || 1)) return;
    dispatch(setPagination({ page: newPage }));
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', String(newPage));
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleVariantSelect = (productId, variantValue) => {
    setSelectedVariants((prev) => ({
      ...prev,
      [productId]: variantValue,
    }));
  };

  // Add to cart action
  const handleAddToCart = async (product, customQty = 1) => {
    const productId = product.id || product._id;
    const variant = selectedVariants[productId] || (product.variants?.[0]?.options?.[0]?.value) || undefined;

    setAddingToCartId(productId);
    try {
      await dispatch(
        addToCart({
          productId,
          quantity: customQty,
          variant,
        })
      ).unwrap();

      toast.success(`${product.name || 'Product'} added to cart!`);
      setJustAddedId(productId);
      setTimeout(() => {
        setJustAddedId((prev) => (prev === productId ? null : prev));
      }, 2000);
      if (quickViewProduct) {
        setQuickViewProduct(null);
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to add item to cart');
    } finally {
      setAddingToCartId(null);
    }
  };

  // Filter in-memory for in-stock and on-sale toggles
  const displayedProducts = useMemo(() => {
    return products.filter((p) => {
      if (inStockOnly && (p.stock === 0 || p.isInStock === false)) return false;
      if (onSaleOnly && (!p.comparePrice || p.comparePrice <= p.price)) return false;
      return true;
    });
  }, [products, inStockOnly, onSaleOnly]);

  const hasActiveFilters = useMemo(() => {
    return Boolean(
      filters.category ||
        filters.minPrice !== null ||
        filters.maxPrice !== null ||
        filters.minRating ||
        filters.search ||
        inStockOnly ||
        onSaleOnly
    );
  }, [filters, inStockOnly, onSaleOnly]);

  const quickViewVideoUrl = getProductVideoUrl(quickViewProduct);
  const quickViewEmbedVideo = getEmbedVideoUrl(quickViewVideoUrl);

  return (
    <div className="bg-[#FAF9F6] min-h-screen text-slate-800 font-sans pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Fallback Location Banner */}
        {fallbackUsed && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-800 text-xs sm:text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
            <span>
              Location is unavailable. Showing top rated products across all locations.
            </span>
          </div>
        )}

        {/* Mobile Filter Drawer Modal */}
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsMobileFilterOpen(false)}
            />
            <div className="relative ml-auto w-full max-w-xs bg-white h-full p-4 overflow-y-auto shadow-2xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 text-base">Filters</h3>
                  <button
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <FilterPanel
                  categoriesList={categoriesList}
                  selectedCategory={filters.category}
                  onCategoryChange={handleCategoryChange}
                  localMinPrice={localMinPrice}
                  setLocalMinPrice={setLocalMinPrice}
                  localMaxPrice={localMaxPrice}
                  setLocalMaxPrice={setLocalMaxPrice}
                  onPriceApply={handlePriceApply}
                  onPricePresetSelect={handlePricePresetSelect}
                  onPriceClear={handlePriceClear}
                  selectedRating={filters.minRating}
                  onRatingFilter={handleRatingFilter}
                  inStockOnly={inStockOnly}
                  onInStockToggle={setInStockOnly}
                  onSaleOnly={onSaleOnly}
                  onOnSaleToggle={setOnSaleOnly}
                  hasActiveFilters={hasActiveFilters}
                  onClearAll={handleClearAll}
                />
              </div>

              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-full mt-4 bg-[#124B38] text-white py-2.5 rounded-xl font-semibold text-sm cursor-pointer"
              >
                View Results ({displayedProducts.length})
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* ================= LEFT SIDEBAR (Desktop) ================= */}
          <aside className="hidden lg:block w-64 shrink-0 space-y-6">
            <FilterPanel
              categoriesList={categoriesList}
              selectedCategory={filters.category}
              onCategoryChange={handleCategoryChange}
              localMinPrice={localMinPrice}
              setLocalMinPrice={setLocalMinPrice}
              localMaxPrice={localMaxPrice}
              setLocalMaxPrice={setLocalMaxPrice}
              onPriceApply={handlePriceApply}
              onPricePresetSelect={handlePricePresetSelect}
              onPriceClear={handlePriceClear}
              selectedRating={filters.minRating}
              onRatingFilter={handleRatingFilter}
              inStockOnly={inStockOnly}
              onInStockToggle={setInStockOnly}
              onSaleOnly={onSaleOnly}
              onOnSaleToggle={setOnSaleOnly}
              hasActiveFilters={hasActiveFilters}
              onClearAll={handleClearAll}
            />
          </aside>

          {/* ================= MAIN PRODUCTS AREA ================= */}
          <main className="flex-1 space-y-5">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Explore Products
                </h1>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                  Discover verified items, rich media, and multi-variant products delivered quickly to your doorstep.
                </p>
              </div>

              {/* View Mode & Filter Trigger */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                {/* Grid / List View Toggle */}
                <div className="bg-white border border-slate-200 rounded-xl p-1 flex items-center shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    aria-label="Grid View"
                    className={`p-1.5 rounded-lg transition ${
                      viewMode === 'grid'
                        ? 'bg-[#124B38] text-white'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    aria-label="List View"
                    className={`p-1.5 rounded-lg transition ${
                      viewMode === 'list'
                        ? 'bg-[#124B38] text-white'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                {/* Mobile Filter Button */}
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(true)}
                  className="lg:hidden flex items-center justify-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs cursor-pointer"
                >
                  <Filter className="w-4 h-4 text-[#124B38]" />
                  Filters
                  {hasActiveFilters && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  )}
                </button>
              </div>
            </div>

            {/* Active Search & Filter Tags Banner */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 bg-emerald-50/70 border border-emerald-100 p-2.5 px-3.5 rounded-xl">
                <span className="text-xs text-slate-600 font-medium">Active filters:</span>

                {filters.search && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-xs text-[#124B38] font-medium shadow-2xs">
                    <Search className="w-3 h-3 text-emerald-600" />
                    &ldquo;{filters.search}&rdquo;
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="ml-1 hover:text-red-500 transition cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.category && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-xs text-[#124B38] font-medium shadow-2xs">
                    Category:{' '}
                    {categoriesList.find(
                      (c) =>
                        c.slug === filters.category ||
                        c.id === filters.category ||
                        c.name === filters.category
                    )?.name || filters.category}
                    <button
                      type="button"
                      onClick={() => handleCategoryChange('all')}
                      className="ml-1 hover:text-red-500 transition cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {(filters.minPrice !== null || filters.maxPrice !== null) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-xs text-[#124B38] font-medium shadow-2xs">
                    Price: ৳{filters.minPrice ?? 0} - ৳{filters.maxPrice ?? '∞'}
                    <button
                      type="button"
                      onClick={handlePriceClear}
                      className="ml-1 hover:text-red-500 transition cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.minRating && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-xs text-[#124B38] font-medium shadow-2xs">
                    {filters.minRating}★ & Up
                    <button
                      type="button"
                      onClick={() => handleRatingFilter(filters.minRating)}
                      className="ml-1 hover:text-red-500 transition cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {inStockOnly && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-xs text-[#124B38] font-medium shadow-2xs">
                    In-Stock Only
                    <button
                      type="button"
                      onClick={() => setInStockOnly(false)}
                      className="ml-1 hover:text-red-500 transition cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {onSaleOnly && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-xs text-[#124B38] font-medium shadow-2xs">
                    On Sale Only
                    <button
                      type="button"
                      onClick={() => setOnSaleOnly(false)}
                      className="ml-1 hover:text-red-500 transition cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs text-red-600 hover:text-red-800 font-semibold ml-auto underline cursor-pointer"
                >
                  Reset all
                </button>
              </div>
            )}

            {/* Top Bar: Results Count + Sort Dropdown */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 px-4 rounded-2xl border border-slate-200 shadow-2xs">
              <p className="text-xs text-slate-500">
                Showing <span className="font-bold text-slate-800">{displayedProducts.length}</span>{' '}
                {pagination.totalResults !== undefined && pagination.totalResults > displayedProducts.length ? (
                  <span>of {pagination.totalResults} products</span>
                ) : (
                  <span>products</span>
                )}
                {sortedBy && (
                  <span className="ml-1 text-emerald-700 font-medium">
                    (Sorted by: {sortedBy})
                  </span>
                )}
              </p>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Sort By:</span>
                <select
                  value={filters.sort || 'distance'}
                  onChange={handleSortChange}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#124B38] text-slate-700 font-medium text-xs cursor-pointer"
                >
                  <option value="distance">Nearest Distance</option>
                  <option value="popularity">Popularity</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating">Highest Rating</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>
            </div>

            {/* Loading Skeletons */}
            {status === 'loading' && (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5' : 'space-y-4'}>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl p-4 border border-slate-100 animate-pulse space-y-3 shadow-2xs"
                  >
                    <div className="w-full h-44 bg-slate-100 rounded-xl"></div>
                    <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                    <div className="h-8 bg-slate-100 rounded w-full mt-4"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {status === 'failed' && (
              <div className="p-8 text-center bg-white rounded-2xl border border-red-100 space-y-3 shadow-sm">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
                <h3 className="text-base font-semibold text-slate-800">
                  Unable to load products
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {error || 'An unexpected error occurred while fetching products.'}
                </p>
                <button
                  type="button"
                  onClick={executeFetch}
                  className="px-5 py-2 bg-[#124B38] hover:bg-[#0d382a] text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Empty State */}
            {status === 'succeeded' && displayedProducts.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-2xs">
                <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-800">No Products Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No items matched your current search and filter settings. Try adjusting your keywords or clearing filters.
                </p>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="mt-3 px-5 py-2 bg-[#124B38] hover:bg-[#0d382a] text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            )}

            {/* ================= Product Cards ================= */}
            {status === 'succeeded' && displayedProducts.length > 0 && (
              viewMode === 'grid' ? (
                /* GRID VIEW */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {displayedProducts.map((product) => {
                    const productId = product.id || product._id;
                    const isAdding = addingToCartId === productId;
                    const isJustAdded = justAddedId === productId;
                    const isOutOfStock = product.stock === 0 || product.isInStock === false;
                    const isWishlisted = isProductWishlisted(productId);

                    const imageUrl = getProductImage(product);
                    const categoryName =
                      typeof product.category === 'object'
                        ? product.category?.name
                        : product.category || 'General';

                    // Variant options
                    const hasVariants = product.variants && product.variants.length > 0;
                    const activeVariantVal = selectedVariants[productId] || (hasVariants ? product.variants[0]?.options?.[0]?.value : null);

                    // Find variant price override if any
                    let cardPrice = product.price;
                    if (hasVariants && activeVariantVal) {
                      for (const v of product.variants) {
                        const matched = v.options?.find((o) => o.value === activeVariantVal);
                        if (matched && matched.price) {
                          cardPrice = matched.price;
                          break;
                        }
                      }
                    }

                    const discountPct = product.comparePrice && product.comparePrice > cardPrice
                      ? Math.round(((product.comparePrice - cardPrice) / product.comparePrice) * 100)
                      : product.discountPercentage || 0;

                    return (
                      <div
                        key={productId}
                        className="bg-white rounded-3xl border border-slate-200/90 p-4 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
                      >
                        {/* Top Action Badges */}
                        <div className="absolute top-6 left-6 z-10 flex flex-col gap-1.5">
                          {discountPct > 0 && (
                            <span className="bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs">
                              {discountPct}% OFF
                            </span>
                          )}
                          {getProductVideoUrl(product) && (
                            <span className="bg-purple-700/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1 shadow-xs">
                              <Play className="w-2.5 h-2.5 fill-current" /> Video
                            </span>
                          )}
                          {product.distanceKm !== undefined && product.distanceKm > 0 && (
                            <span className="bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1 shadow-xs">
                              <MapPin className="w-2.5 h-2.5 text-emerald-300" />{' '}
                              {product.distanceKm.toFixed(1)} km
                            </span>
                          )}
                        </div>

                        {/* Top Right Wishlist & Quick View Buttons */}
                        <div className="absolute top-6 right-6 z-10 flex flex-col gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleToggleWishlist(productId, e)}
                            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs border border-slate-200 shadow-xs flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-white transition cursor-pointer"
                            title={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
                          >
                            <Heart
                              className={`w-4 h-4 ${
                                isWishlisted ? 'fill-red-500 text-red-500' : 'text-slate-400'
                              }`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickViewProduct(product);
                              setQuickViewActiveImage(0);
                              setQuickViewQty(1);
                            }}
                            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs border border-slate-200 shadow-xs flex items-center justify-center text-slate-500 hover:text-emerald-700 hover:bg-white transition cursor-pointer opacity-0 group-hover:opacity-100"
                            title="Quick View Product"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Product Image */}
                        <Link
                          to={`/products/${product.slug || productId}`}
                          className="relative w-full h-48 rounded-2xl bg-slate-50 overflow-hidden mb-3.5 flex items-center justify-center p-3 border border-slate-100 group-hover:border-emerald-200 transition-colors block"
                        >
                          <img
                            src={imageUrl}
                            alt={product.name || 'Product'}
                            className="object-contain h-full w-full group-hover:scale-105 transition-transform duration-300 mix-blend-multiply"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = DEFAULT_FALLBACK_IMAGE;
                            }}
                          />
                        </Link>

                        {/* Category & Title */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                              {categoryName}
                            </span>
                            {product.shopName && (
                              <span className="text-slate-400 text-[11px] truncate max-w-[110px]">
                                {product.shopName}
                              </span>
                            )}
                          </div>

                          <Link
                            to={`/products/${product.slug || productId}`}
                            className="font-bold text-slate-800 text-sm line-clamp-2 min-h-[2.5rem] hover:text-[#124B38] transition block"
                          >
                            {product.name}
                          </Link>

                          {/* Rating & Reviews */}
                          <div className="flex items-center gap-1.5 text-xs pt-0.5">
                            <div className="flex items-center text-amber-400">
                              <Star className="w-3.5 h-3.5 fill-amber-400" />
                            </div>
                            <span className="font-semibold text-slate-700 text-xs">
                              {Number(product.rating?.average || 4.5).toFixed(1)}
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              ({product.rating?.count || 8})
                            </span>
                          </div>
                        </div>

                        {/* Pricing & Variants Area */}
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <div className="flex items-baseline gap-2">
                            <span className="text-base font-extrabold text-slate-900">
                              ৳{Number(cardPrice).toLocaleString()}
                            </span>
                            {product.comparePrice && product.comparePrice > cardPrice && (
                              <span className="text-xs text-slate-400 line-through">
                                ৳{Number(product.comparePrice).toLocaleString()}
                              </span>
                            )}
                          </div>

                          {/* Dynamic Variants Pills */}
                          {hasVariants && (
                            <div className="flex items-center gap-1.5 flex-wrap mt-2">
                              {product.variants.map((v) =>
                                v.options?.slice(0, 4).map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => handleVariantSelect(productId, opt.value)}
                                    className={`text-[10px] px-2 py-0.5 rounded-md border transition cursor-pointer ${
                                      activeVariantVal === opt.value
                                        ? 'border-[#124B38] bg-emerald-50 font-bold text-[#124B38]'
                                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                    }`}
                                  >
                                    {opt.value}
                                  </button>
                                ))
                              )}
                              {product.variants[0]?.options?.length > 4 && (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  +{product.variants[0].options.length - 4}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Add to Cart Button */}
                          <button
                            type="button"
                            disabled={isAdding || isOutOfStock}
                            onClick={() => handleAddToCart(product)}
                            className={`w-full mt-3 py-2.5 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ${
                              isOutOfStock
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : isJustAdded
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#124B38] hover:bg-[#0d382a] text-white active:scale-[0.98]'
                            }`}
                          >
                            {isAdding ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding...
                              </>
                            ) : isJustAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> Added to Cart
                              </>
                            ) : isOutOfStock ? (
                              'Out of Stock'
                            ) : (
                              <>
                                <ShoppingBag className="w-3.5 h-3.5" /> Add To Cart
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* LIST VIEW */
                <div className="space-y-4">
                  {displayedProducts.map((product) => {
                    const productId = product.id || product._id;
                    const isAdding = addingToCartId === productId;
                    const isJustAdded = justAddedId === productId;
                    const isOutOfStock = product.stock === 0 || product.isInStock === false;
                    const isWishlisted = isProductWishlisted(productId);

                    const imageUrl = getProductImage(product);
                    const categoryName =
                      typeof product.category === 'object'
                        ? product.category?.name
                        : product.category || 'General';

                    const hasVariants = product.variants && product.variants.length > 0;
                    const activeVariantVal = selectedVariants[productId] || (hasVariants ? product.variants[0]?.options?.[0]?.value : null);

                    let cardPrice = product.price;
                    if (hasVariants && activeVariantVal) {
                      for (const v of product.variants) {
                        const matched = v.options?.find((o) => o.value === activeVariantVal);
                        if (matched && matched.price) {
                          cardPrice = matched.price;
                          break;
                        }
                      }
                    }

                    const discountPct = product.comparePrice && product.comparePrice > cardPrice
                      ? Math.round(((product.comparePrice - cardPrice) / product.comparePrice) * 100)
                      : product.discountPercentage || 0;

                    return (
                      <div
                        key={productId}
                        className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row gap-5 items-center"
                      >
                        {/* Image Box */}
                        <div className="relative w-full sm:w-44 h-44 rounded-2xl bg-slate-50 shrink-0 overflow-hidden flex items-center justify-center p-2 border border-slate-100">
                          <img
                            src={imageUrl}
                            alt={product.name}
                            className="object-contain w-full h-full mix-blend-multiply"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = DEFAULT_FALLBACK_IMAGE;
                            }}
                          />
                          {discountPct > 0 && (
                            <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs">
                              {discountPct}% OFF
                            </span>
                          )}
                          {getProductVideoUrl(product) && (
                            <span className="absolute bottom-2 left-2 bg-purple-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                              <Play className="w-2.5 h-2.5 fill-current" /> Video
                            </span>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                              {categoryName}
                            </span>
                            {product.shopName && (
                              <span className="text-xs text-slate-500 font-medium">
                                Sold by <strong>{product.shopName}</strong>
                              </span>
                            )}
                          </div>

                          <Link
                            to={`/products/${product.slug || productId}`}
                            className="font-bold text-slate-900 text-base sm:text-lg hover:text-[#124B38] transition line-clamp-1"
                          >
                            {product.name}
                          </Link>

                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                            {product.description || 'No description available for this product.'}
                          </p>

                          {/* Rating & Variants */}
                          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                            <div className="flex items-center gap-1 text-amber-500 font-bold">
                              <Star className="w-3.5 h-3.5 fill-amber-400" />
                              <span>{Number(product.rating?.average || 4.5).toFixed(1)}</span>
                              <span className="text-slate-400 font-normal">
                                ({product.rating?.count || 8} reviews)
                              </span>
                            </div>

                            {hasVariants && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-400 text-xs">Options:</span>
                                {product.variants[0]?.options?.slice(0, 4).map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => handleVariantSelect(productId, opt.value)}
                                    className={`text-[10px] px-2 py-0.5 rounded-md border transition cursor-pointer ${
                                      activeVariantVal === opt.value
                                        ? 'border-[#124B38] bg-emerald-50 font-bold text-[#124B38]'
                                        : 'border-slate-200 text-slate-600'
                                    }`}
                                  >
                                    {opt.value}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Pricing & CTA Column */}
                        <div className="sm:border-l sm:border-slate-100 sm:pl-5 sm:min-w-[160px] flex flex-col justify-between h-full gap-3 w-full sm:w-auto">
                          <div>
                            <span className="text-xl font-extrabold text-slate-900 block">
                              ৳{Number(cardPrice).toLocaleString()}
                            </span>
                            {product.comparePrice && product.comparePrice > cardPrice && (
                              <span className="text-xs text-slate-400 line-through">
                                ৳{Number(product.comparePrice).toLocaleString()}
                              </span>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={(e) => handleToggleWishlist(productId, e)}
                              className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-red-500 transition cursor-pointer"
                              title="Wishlist"
                            >
                              <Heart
                                className={`w-4 h-4 ${
                                  isWishlisted ? 'fill-red-500 text-red-500' : ''
                                }`}
                              />
                            </button>
                            <button
                              type="button"
                              disabled={isAdding || isOutOfStock}
                              onClick={() => handleAddToCart(product)}
                              className={`flex-1 py-2.5 px-3 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ${
                                isOutOfStock
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : isJustAdded
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-[#124B38] hover:bg-[#0d382a] text-white active:scale-[0.98]'
                              }`}
                            >
                              {isAdding ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : isJustAdded ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <>
                                  <ShoppingBag className="w-3.5 h-3.5" /> Add to Cart
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6">
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-2.5 border border-slate-200 bg-white rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: pagination.totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-9 h-9 text-xs rounded-xl font-bold transition cursor-pointer shadow-2xs ${
                      pagination.page === pageNum
                        ? 'bg-[#124B38] text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-2.5 border border-slate-200 bg-white rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ──────────────── Quick View Modal ──────────────── */}
      {quickViewProduct && (
        <Modal
          open={!!quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          size="xl"
          title={`Quick View: ${quickViewProduct.name}`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
            {/* Gallery in Modal */}
            <div className="space-y-3">
              <div className="relative aspect-square bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center p-2">
                {quickViewActiveImage === 'video' && quickViewVideoUrl ? (
                  quickViewEmbedVideo ? (
                    <iframe
                      src={quickViewEmbedVideo}
                      title="Quick View Video"
                      className="w-full h-full rounded-xl"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  ) : (
                    <video
                      src={quickViewVideoUrl}
                      controls
                      autoPlay
                      className="w-full h-full object-contain bg-black rounded-xl"
                    />
                  )
                ) : (
                  <img
                    src={
                      quickViewProduct.images?.[quickViewActiveImage]?.url ||
                      getProductImage(quickViewProduct)
                    }
                    alt={quickViewProduct.name}
                    className="w-full h-full object-contain mix-blend-multiply"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = DEFAULT_FALLBACK_IMAGE;
                    }}
                  />
                )}
              </div>

              {/* Thumbnails */}
              {((quickViewProduct.images?.length || 0) > 1 || quickViewVideoUrl) && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {quickViewProduct.images?.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setQuickViewActiveImage(idx)}
                      className={`w-14 h-14 rounded-xl border-2 overflow-hidden shrink-0 bg-slate-50 p-1 ${
                        quickViewActiveImage === idx
                          ? 'border-[#124B38]'
                          : 'border-slate-200 opacity-70'
                      }`}
                    >
                      <img
                        src={typeof img === 'string' ? img : img.url}
                        alt=""
                        className="w-full h-full object-contain mix-blend-multiply"
                      />
                    </button>
                  ))}
                  {quickViewVideoUrl && (
                    <button
                      type="button"
                      onClick={() => setQuickViewActiveImage('video')}
                      className={`w-14 h-14 rounded-xl border-2 flex flex-col items-center justify-center text-purple-700 bg-purple-50 text-[9px] font-bold shrink-0 ${
                        quickViewActiveImage === 'video' ? 'border-purple-600 ring-2 ring-purple-200 bg-purple-100' : 'border-purple-200'
                      }`}
                    >
                      <Play className="w-4 h-4 fill-purple-600" />
                      Video
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Details & Purchase in Modal */}
            <div className="space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  {typeof quickViewProduct.category === 'object'
                    ? quickViewProduct.category?.name
                    : quickViewProduct.category}
                </span>
                <h2 className="text-xl font-bold text-slate-900 leading-snug">
                  {quickViewProduct.name}
                </h2>

                {/* Price */}
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-[#124B38]">
                    ৳{Number(quickViewProduct.price).toLocaleString()}
                  </span>
                  {quickViewProduct.comparePrice &&
                    quickViewProduct.comparePrice > quickViewProduct.price && (
                      <span className="text-sm text-slate-400 line-through">
                        ৳{Number(quickViewProduct.comparePrice).toLocaleString()}
                      </span>
                    )}
                </div>

                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {quickViewProduct.description || 'Quality product available for fast delivery.'}
                </p>

                {/* Variants if any */}
                {quickViewProduct.variants?.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-800 uppercase">
                      Select Variant:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {quickViewProduct.variants.map((v) =>
                        v.options?.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              handleVariantSelect(
                                quickViewProduct.id || quickViewProduct._id,
                                opt.value
                              )
                            }
                            className={`text-xs px-2.5 py-1 rounded-lg border font-semibold ${
                              selectedVariants[quickViewProduct.id || quickViewProduct._id] ===
                              opt.value
                                ? 'border-[#124B38] bg-emerald-50 text-[#124B38]'
                                : 'border-slate-200 text-slate-700'
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

              {/* Action Buttons in Modal */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => setQuickViewQty((q) => Math.max(1, q - 1))}
                      className="w-7 h-7 flex items-center justify-center font-bold text-slate-600 hover:bg-white rounded"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-xs font-bold">{quickViewQty}</span>
                    <button
                      type="button"
                      onClick={() => setQuickViewQty((q) => q + 1)}
                      className="w-7 h-7 flex items-center justify-center font-bold text-slate-600 hover:bg-white rounded"
                    >
                      +
                    </button>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={() => handleAddToCart(quickViewProduct, quickViewQty)}
                    className="flex-1 gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" /> Add To Cart
                  </Button>
                </div>

                <Link
                  to={`/products/${quickViewProduct.slug || quickViewProduct._id || quickViewProduct.id}`}
                  className="block text-center text-xs font-bold text-[#124B38] hover:underline"
                >
                  View Full Product Details →
                </Link>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}