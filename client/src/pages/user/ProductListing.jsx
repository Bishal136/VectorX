import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams, Link } from 'react-router-dom';
import {
  fetchProducts,
  setFilters,
  clearFilters,
  setPagination,
} from '../../features/products/productSlice';
import { addToCart } from '../../features/cart/cartSlice';
import { toast } from 'react-toastify';
import axiosInstance from '../../services/axiosInstance';
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
} from 'lucide-react';

// Default fallback categories
const DEFAULT_CATEGORIES = [
  { id: 'all', slug: 'all', name: 'All Categories' },
  { id: 'flowers', slug: 'flowers', name: 'Flowers' },
  { id: 'concentrates', slug: 'concentrates', name: 'Concentrates' },
  { id: 'edibles', slug: 'edibles', name: 'Edibles' },
  { id: 'tinctures', slug: 'tinctures', name: 'Tinctures' },
  { id: 'topicals', slug: 'topicals', name: 'Topicals' },
  { id: 'accessories', slug: 'accessories', name: 'Accessories' },
];

// Quick price presets
const PRICE_PRESETS = [
  { label: 'Under ৳500', min: null, max: 500 },
  { label: '৳500 - ৳1,000', min: 500, max: 1000 },
  { label: '৳1,000 - ৳2,500', min: 1000, max: 2500 },
  { label: 'Above ৳2,500', min: 2500, max: null },
];

/**
 * FilterPanel component defined outside ProductListing
 * to prevent remounting and losing input focus during typing.
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
            className="text-xs text-emerald-700 hover:text-emerald-900 flex items-center gap-1 font-semibold transition cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Clear All
          </button>
        )}
      </div>

      {/* 1. Category Filter */}
      <div>
        <h3 className="font-semibold text-xs text-slate-900 uppercase tracking-wider mb-3">
          Category
        </h3>
        <div className="space-y-1 text-sm max-h-56 overflow-y-auto pr-1">
          {categoriesList.map((cat) => {
            const isSelected =
              cat.slug === 'all' || cat.id === 'all'
                ? !selectedCategory
                : selectedCategory === cat.slug ||
                  selectedCategory === cat.id ||
                  selectedCategory === cat.name ||
                  selectedCategory === cat._id;

            return (
              <button
                key={cat.id || cat.slug}
                type="button"
                onClick={() => onCategoryChange(cat)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition text-left cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50 text-[#124B38] font-bold border border-emerald-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
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
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-xs text-slate-900 uppercase tracking-wider">
            Price Range
          </h3>
          {isPriceSet && (
            <button
              type="button"
              onClick={onPriceClear}
              className="text-[11px] text-slate-400 hover:text-red-500 transition cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        {/* Quick price preset chips */}
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {PRICE_PRESETS.map((preset) => {
            const isPresetActive =
              (preset.min === null ? localMinPrice === '' : Number(localMinPrice) === preset.min) &&
              (preset.max === null ? localMaxPrice === '' : Number(localMaxPrice) === preset.max);

            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => onPricePresetSelect(preset.min, preset.max)}
                className={`px-2 py-1 text-[10px] rounded-md border font-medium transition text-center truncate cursor-pointer ${
                  isPresetActive
                    ? 'bg-emerald-50 text-[#124B38] border-emerald-300 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
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
            className="w-full bg-[#124B38] hover:bg-[#0d382a] text-white py-1.5 rounded-lg text-xs font-semibold transition active:scale-[0.98] cursor-pointer shadow-2xs"
          >
            Apply Price
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
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
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

  const { location } = useSelector((state) => state.auth || {});

  // Local state
  const [categoriesList, setCategoriesList] = useState(DEFAULT_CATEGORIES);
  const [localMinPrice, setLocalMinPrice] = useState(
    filters.minPrice !== null && filters.minPrice !== undefined ? String(filters.minPrice) : ''
  );
  const [localMaxPrice, setLocalMaxPrice] = useState(
    filters.maxPrice !== null && filters.maxPrice !== undefined ? String(filters.maxPrice) : ''
  );
  const [selectedVariants, setSelectedVariants] = useState({});
  const [addingToCartId, setAddingToCartId] = useState(null);
  const [justAddedId, setJustAddedId] = useState(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Fetch active categories from server
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
      .catch(() => {
        // Fallback to DEFAULT_CATEGORIES
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync URL search params -> Redux state on initial load / URL change
  useEffect(() => {
    const querySearch = searchParams.get('search') || '';
    const queryCategory = searchParams.get('category') || null;
    const querySort = searchParams.get('sort') || 'distance';
    const queryMinPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : null;
    const queryMaxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : null;
    const queryRating = searchParams.get('minRating') ? Number(searchParams.get('minRating')) : null;
    const queryPage = searchParams.get('page') ? Number(searchParams.get('page')) : 1;

    dispatch(
      setFilters({
        search: querySearch,
        category: queryCategory === 'all' ? null : queryCategory,
        sort: querySort,
        minPrice: queryMinPrice,
        maxPrice: queryMaxPrice,
        minRating: queryRating,
      })
    );

    dispatch(setPagination({ page: queryPage }));
  }, [searchParams, dispatch]);

  // Sync local price inputs whenever Redux filter values change from outside (URL/clear)
  useEffect(() => {
    setLocalMinPrice(
      filters.minPrice !== null && filters.minPrice !== undefined ? String(filters.minPrice) : ''
    );
    setLocalMaxPrice(
      filters.maxPrice !== null && filters.maxPrice !== undefined ? String(filters.maxPrice) : ''
    );
  }, [filters.minPrice, filters.maxPrice]);

  // Helper to update URL params
  const updateUrlParams = useCallback(
    (newParams) => {
      const updated = new URLSearchParams(searchParams);
      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          updated.delete(key);
        } else {
          updated.set(key, String(value));
        }
      });
      setSearchParams(updated);
    },
    [searchParams, setSearchParams]
  );

  // Fetch products whenever relevant state changes
  const executeFetch = useCallback(() => {
    dispatch(
      fetchProducts({
        lat: location?.lat,
        lng: location?.lng,
        category: filters.category,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        sort: filters.sort,
        search: filters.search,
        minRating: filters.minRating,
        page: pagination.page,
        limit: pagination.limit || 20,
      })
    );
  }, [
    dispatch,
    location?.lat,
    location?.lng,
    filters.category,
    filters.minPrice,
    filters.maxPrice,
    filters.sort,
    filters.search,
    filters.minRating,
    pagination.page,
    pagination.limit,
  ]);

  useEffect(() => {
    executeFetch();
  }, [executeFetch]);

  // Handlers
  const handleCategoryChange = (cat) => {
    const catSlug = typeof cat === 'object' ? (cat.slug || cat.id || cat.name) : cat;
    const isCurrentlySelected =
      filters.category &&
      (filters.category === catSlug ||
        (typeof cat === 'object' &&
          (filters.category === cat.name ||
            filters.category === cat.id ||
            filters.category === cat._id)));

    const newCategory = catSlug === 'all' || isCurrentlySelected ? null : catSlug;
    dispatch(setFilters({ category: newCategory }));
    dispatch(setPagination({ page: 1 }));
    updateUrlParams({ category: newCategory, page: 1 });
  };

  const handlePriceApply = (e) => {
    if (e) e.preventDefault();
    const min = localMinPrice !== '' ? Number(localMinPrice) : null;
    const max = localMaxPrice !== '' ? Number(localMaxPrice) : null;

    if (min !== null && isNaN(min)) {
      toast.error('Please enter a valid minimum price');
      return;
    }
    if (max !== null && isNaN(max)) {
      toast.error('Please enter a valid maximum price');
      return;
    }
    if (min !== null && min < 0) {
      toast.error('Minimum price cannot be negative');
      return;
    }
    if (max !== null && max < 0) {
      toast.error('Maximum price cannot be negative');
      return;
    }
    if (min !== null && max !== null && min > max) {
      toast.warning('Minimum price cannot be greater than maximum price');
      return;
    }

    dispatch(setFilters({ minPrice: min, maxPrice: max }));
    dispatch(setPagination({ page: 1 }));
    updateUrlParams({ minPrice: min, maxPrice: max, page: 1 });
  };

  const handlePricePresetSelect = (min, max) => {
    setLocalMinPrice(min !== null ? String(min) : '');
    setLocalMaxPrice(max !== null ? String(max) : '');
    dispatch(setFilters({ minPrice: min, maxPrice: max }));
    dispatch(setPagination({ page: 1 }));
    updateUrlParams({ minPrice: min, maxPrice: max, page: 1 });
  };

  const handlePriceClear = () => {
    setLocalMinPrice('');
    setLocalMaxPrice('');
    dispatch(setFilters({ minPrice: null, maxPrice: null }));
    dispatch(setPagination({ page: 1 }));
    updateUrlParams({ minPrice: null, maxPrice: null, page: 1 });
  };

  const handleRatingFilter = (rating) => {
    const updatedRating = filters.minRating === rating ? null : rating;
    dispatch(setFilters({ minRating: updatedRating }));
    dispatch(setPagination({ page: 1 }));
    updateUrlParams({ minRating: updatedRating, page: 1 });
  };

  const handleSortChange = (e) => {
    const newSort = e.target.value;
    dispatch(setFilters({ sort: newSort }));
    dispatch(setPagination({ page: 1 }));
    updateUrlParams({ sort: newSort, page: 1 });
  };

  const handleClearSearch = () => {
    dispatch(setFilters({ search: '' }));
    dispatch(setPagination({ page: 1 }));
    updateUrlParams({ search: '', page: 1 });
  };

  const handleClearAll = () => {
    dispatch(clearFilters());
    setLocalMinPrice('');
    setLocalMaxPrice('');
    dispatch(setPagination({ page: 1 }));
    setSearchParams({});
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      dispatch(setPagination({ page: newPage }));
      updateUrlParams({ page: newPage });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleVariantSelect = (productId, variant) => {
    setSelectedVariants((prev) => ({ ...prev, [productId]: variant }));
  };

  const handleAddToCart = async (product) => {
    const productId = product.id || product._id;
    if (!productId) return;

    const variant = selectedVariants[productId] || '28g';
    setAddingToCartId(productId);

    try {
      await dispatch(
        addToCart({
          productId,
          quantity: 1,
          variant,
        })
      ).unwrap();

      toast.success(`${product.name || 'Product'} added to cart!`);
      setJustAddedId(productId);
      setTimeout(() => {
        setJustAddedId((prev) => (prev === productId ? null : prev));
      }, 2000);
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to add item to cart');
    } finally {
      setAddingToCartId(null);
    }
  };

  const hasActiveFilters = useMemo(() => {
    return Boolean(
      filters.category ||
        filters.minPrice !== null ||
        filters.maxPrice !== null ||
        filters.minRating ||
        filters.search
    );
  }, [filters]);

  return (
    <div className="bg-[#FAF9F6] min-h-screen text-slate-800 font-sans pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Fallback Location Banner */}
        {fallbackUsed && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800 text-xs sm:text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
            <span>
              Location is unavailable or disabled. Showing top rated products across all locations.
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
                  hasActiveFilters={hasActiveFilters}
                  onClearAll={handleClearAll}
                />
              </div>

              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-full mt-4 bg-[#124B38] text-white py-2.5 rounded-xl font-semibold text-sm cursor-pointer"
              >
                View Results ({products.length})
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
              hasActiveFilters={hasActiveFilters}
              onClearAll={handleClearAll}
            />
          </aside>

          {/* ================= MAIN PRODUCTS AREA ================= */}
          <main className="flex-1 space-y-5">
            {/* Header & Active Search Info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Shop Products
                </h1>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                  Browse fresh, quality items sourced directly from verified nearby sellers.
                </p>
              </div>

              {/* Mobile Filter Trigger Button */}
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-sm cursor-pointer"
              >
                <Filter className="w-4 h-4 text-[#124B38]" />
                Filters
                {hasActiveFilters && (
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                )}
              </button>
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
                      aria-label="Remove search filter"
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
                      onClick={() => handleCategoryChange(filters.category)}
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
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 px-4 rounded-xl border border-slate-200 shadow-2xs">
              <p className="text-xs text-slate-500">
                Showing{' '}
                <span className="font-bold text-slate-800">
                  {products.length}
                </span>{' '}
                {pagination.totalResults !== undefined && pagination.totalResults > products.length ? (
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
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#124B38] text-slate-700 font-medium text-xs cursor-pointer"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
            {status === 'succeeded' && products.length === 0 && (
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

            {/* Product Cards Grid */}
            {status === 'succeeded' && products.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {products.map((product) => {
                  const productId = product.id || product._id;
                  const currentVariant = selectedVariants[productId] || '28g';
                  const isAdding = addingToCartId === productId;
                  const isJustAdded = justAddedId === productId;
                  const isOutOfStock = product.stock === 0 || product.isInStock === false;

                  const imageUrl =
                    product.primaryImage?.url ||
                    product.images?.[0]?.url ||
                    (typeof product.images?.[0] === 'string' ? product.images[0] : null) ||
                    'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=60';

                  const categoryName =
                    typeof product.category === 'object'
                      ? product.category?.name
                      : product.category || 'General';

                  return (
                    <div
                      key={productId}
                      className="bg-white rounded-2xl border border-slate-200/90 p-4 hover:shadow-md transition-all duration-300 flex flex-col justify-between group relative"
                    >
                      {/* Distance Badge */}
                      {product.distanceKm !== undefined && product.distanceKm > 0 && (
                        <div className="absolute top-6 left-6 z-10 bg-emerald-900/85 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1 shadow-xs">
                          <MapPin className="w-3 h-3 text-emerald-300" />{' '}
                          {product.distanceKm.toFixed(1)} km
                        </div>
                      )}

                      {/* Product Image */}
                      <Link
                        to={`/products/${product.slug || productId}`}
                        className="relative w-full h-44 rounded-xl bg-slate-50 overflow-hidden mb-3 flex items-center justify-center block"
                      >
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="object-contain h-full w-full group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </Link>

                      {/* Category & Title */}
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                          {categoryName}
                        </p>
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
                            ({product.rating?.count || 12})
                          </span>
                          {product.shopName && (
                            <span className="text-slate-400 text-[11px] ml-auto truncate max-w-[100px]">
                              by {product.shopName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Pricing & Actions */}
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-baseline gap-2">
                          <span className="text-base font-bold text-slate-900">
                            ৳{product.price}
                          </span>
                          {(product.comparePrice || product.originalPrice) && (
                            <span className="text-xs text-slate-400 line-through">
                              ৳{product.comparePrice || product.originalPrice}
                            </span>
                          )}
                          {product.discountPercentage > 0 && (
                            <span className="ml-auto text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              {product.discountPercentage}% OFF
                            </span>
                          )}
                        </div>

                        {/* Weight Variants */}
                        <div className="flex gap-1.5 mt-2">
                          {['28g', '1/2oz', '1oz'].map((weight) => (
                            <button
                              key={weight}
                              type="button"
                              onClick={() => handleVariantSelect(productId, weight)}
                              className={`text-[10px] px-2 py-0.5 rounded-md border transition cursor-pointer ${
                                currentVariant === weight
                                  ? 'border-[#124B38] bg-emerald-50 font-bold text-[#124B38]'
                                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
                              }`}
                            >
                              {weight}
                            </button>
                          ))}
                        </div>

                        {/* Add to Cart Button */}
                        <button
                          type="button"
                          disabled={isAdding || isOutOfStock}
                          onClick={() => handleAddToCart(product)}
                          className={`w-full mt-3 py-2 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ${
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
            )}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6">
                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-2 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: pagination.totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-8 h-8 text-xs rounded-lg font-semibold transition cursor-pointer ${
                      pagination.page === pageNum
                        ? 'bg-[#124B38] text-white shadow-xs'
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
                  className="p-2 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}