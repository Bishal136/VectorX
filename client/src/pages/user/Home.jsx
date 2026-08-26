import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts } from '../../features/products/productSlice';
import { addToCart } from '../../features/cart/cartSlice';
import { toast } from 'react-toastify';
import axiosInstance from '../../services/axiosInstance';

import banner1 from "../../assets/bannar/Green1.png"
import banner2 from "../../assets/bannar/Green2.jpeg"

import {
  ChevronLeft,
  ChevronRight,
  Star,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Zap,
  Tag,
  ExternalLink,
  ShieldCheck,
  Check,
  Loader2,
  Flame,
  Truck,
  RotateCcw,
  CreditCard,
  Layers,
} from 'lucide-react';

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
    if (typeof first === 'object' && first?.image) return first.image;
  }
  if (typeof product.image === 'string' && product.image.trim()) return product.image.trim();
  if (typeof product.thumbnail === 'string' && product.thumbnail.trim()) return product.thumbnail.trim();
  return DEFAULT_FALLBACK_IMAGE;
};

// Hero Slider Data
const HERO_SLIDES = [
  {
    id: 1,
    title: 'Discover the Latest Deals –',
    highlight: 'Up to 50% Off!',
    bgImage: banner1,
    link: '/products',
  },
  {
    id: 2,
    title: 'Smart Tech & Gadgets Fest –',
    highlight: 'Save Big Today!',
    bgImage: banner2,
    link: '/products?category=electronics',
  },
];

// Fallback Category Visuals mapping
const CATEGORY_IMAGES = {
  electronics: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&auto=format&fit=crop&q=80',
  cloth: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=300&auto=format&fit=crop&q=80',
  fashion: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=300&auto=format&fit=crop&q=80',
  grocery: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=80',
  home: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&auto=format&fit=crop&q=80',
  toys: 'https://images.unsplash.com/photo-1559715745-e1b123c51fa8?w=300&auto=format&fit=crop&q=80',
};

// Customer Reviews
const CUSTOMER_REVIEWS = [
  {
    id: 1,
    name: 'Emily R.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    highlighted: false,
    text: 'Fast delivery and fantastic quality! The customer support team was quick to resolve my query. Dealport has earned a loyal customer.',
  },
  {
    id: 2,
    name: 'John D.',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    highlighted: true,
    text: 'Fast delivery and fantastic quality! The customer support team was quick to resolve my query. Dealport has earned a loyal customer.',
  },
  {
    id: 3,
    name: 'Ahmed M.',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
    highlighted: false,
    text: 'Fast delivery and fantastic quality! The customer support team was quick to resolve my query. Dealport has earned a loyal customer.',
  },
  {
    id: 4,
    name: 'Alex T.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    highlighted: false,
    text: 'Fast delivery and fantastic quality! The customer support team was quick to resolve my query. Dealport has earned a loyal customer.',
  },
  {
    id: 5,
    name: 'Priya R.',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    highlighted: false,
    text: 'Fast delivery and fantastic quality! The customer support team was quick to resolve my query. Dealport has earned a loyal customer.',
  },
  {
    id: 6,
    name: 'David H.',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    highlighted: false,
    text: 'Fast delivery and fantastic quality! The customer support team was quick to resolve my query. Dealport has earned a loyal customer.',
  },
];

const Home = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { items = [], products: stateProducts = [], status } = useSelector((state) => state.products || {});
  const [categories, setCategories] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [addingToCartId, setAddingToCartId] = useState(null);

  // Safely resolve the array of products from Redux state
  const products = useMemo(() => {
    if (Array.isArray(items) && items.length > 0) return items;
    if (Array.isArray(stateProducts) && stateProducts.length > 0) return stateProducts;
    return [];
  }, [items, stateProducts]);

  // Fetch backend products and categories on mount
  useEffect(() => {
    dispatch(fetchProducts({ limit: 40 }));

    const fetchCategories = async () => {
      try {
        const res = await axiosInstance.get('/products/categories');
        if (res.data?.data) {
          const catList = Array.isArray(res.data.data) ? res.data.data : res.data.data.categories || [];
          setCategories(catList);
        }
      } catch (err) {
        // use fallback if categories API fails
      }
    };
    fetchCategories();
  }, [dispatch]);

  // Auto rotate hero slides
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleAddToCart = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    const productId = product._id || product.id;

    setAddingToCartId(productId);
    try {
      await dispatch(
        addToCart({
          productId,
          quantity: 1,
        })
      ).unwrap();
      toast.success(`Added "${product.name}" to cart!`);
    } catch (err) {
      toast.error(typeof err === 'string' ? err : err?.message || 'Could not add to cart');
    } finally {
      setAddingToCartId(null);
    }
  };

  // Trending Products (First 3 products from backend or safe fallbacks)
  const trendingProducts = useMemo(() => {
    if (Array.isArray(products) && products.length > 0) {
      return products.slice(0, 3);
    }
    return [];
  }, [products]);

  // Mini Trend Collection products (Next 4 products from backend)
  const miniTrendProducts = useMemo(() => {
    if (Array.isArray(products) && products.length > 3) {
      return products.slice(3, 7);
    }
    if (Array.isArray(products) && products.length > 0) {
      return products.slice(0, 4);
    }
    return [];
  }, [products]);

  // Best Selling Products (Next 6 products from backend)
  const bestSellingProducts = useMemo(() => {
    if (Array.isArray(products) && products.length > 0) {
      return products.slice(0, 6);
    }
    return [];
  }, [products]);

  // Limited Time Deals (Products with discounts or next slice)
  const limitedDeals = useMemo(() => {
    if (!Array.isArray(products) || products.length === 0) return [];
    const withDiscount = products.filter((p) => p && p.comparePrice && p.comparePrice > p.price);
    if (withDiscount.length >= 4) return withDiscount.slice(0, 4);
    return products.slice(0, 4);
  }, [products]);

  // Dynamic Exploring Categories List
  const exploreCategories = useMemo(() => {
    if (Array.isArray(categories) && categories.length > 0) {
      return categories.map((c) => ({
        name: c.name,
        slug: c.slug || c._id,
        image:
          CATEGORY_IMAGES[c.slug?.toLowerCase()] ||
          'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=80',
      }));
    }
    return [
      { name: 'Electronics', slug: 'electronics', image: CATEGORY_IMAGES.electronics },
      { name: 'Fashion & Cloth', slug: 'cloth', image: CATEGORY_IMAGES.cloth },
      { name: 'Home & Living', slug: 'electronics', image: CATEGORY_IMAGES.home },
      { name: 'Grocery', slug: 'cloth', image: CATEGORY_IMAGES.grocery },
      { name: 'Toys & Gaming', slug: 'electronics', image: CATEGORY_IMAGES.toys },
    ];
  }, [categories]);

  // Top Promo Products for Header Cards
  const topFashionProduct = useMemo(() => {
    if (!Array.isArray(products) || products.length === 0) return null;
    return (
      products.find(
        (p) =>
          p?.category?.slug === 'cloth' ||
          p?.category?.name?.toLowerCase().includes('cloth') ||
          p?.name?.toLowerCase().includes('cloth') ||
          p?.name?.toLowerCase().includes('jacket')
      ) || products[0] || null
    );
  }, [products]);

  const topElectronicsProduct = useMemo(() => {
    if (!Array.isArray(products) || products.length === 0) return null;
    return (
      products.find(
        (p) =>
          p?.category?.slug === 'electronics' ||
          p?.category?.name?.toLowerCase().includes('elect') ||
          p?.name?.toLowerCase().includes('tv') ||
          p?.name?.toLowerCase().includes('headphone')
      ) || products[1] || products[0] || null
    );
  }, [products]);

  return (
    <div className="w-full bg-white text-slate-800 space-y-12 sm:space-y-16 pb-16">
      {/* ========================================================================= */}
      {/* 1. HERO BANNER SECTION (FULL-WIDTH ATMOSPHERIC BANNER)                   */}
      {/* ========================================================================= */}
      <section className="relative w-full h-80 sm:h-100 lg:h-120 bg-slate-900 overflow-hidden">
        {HERO_SLIDES.map((slide, index) => {
          const isActive = index === currentSlide;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
            >
              <img
                src={slide.bgImage}
                alt={slide.title}
                className="w-full h-full object-cover object-center filter brightness-75 scale-105 transition-transform duration-10000"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

              <div className="absolute inset-0 max-w-7xl mx-auto px-6 sm:px-12 flex flex-col justify-center text-white space-y-4">
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight max-w-xl">
                  {slide.title} <br />
                  <span className="font-serif italic font-normal text-emerald-300">
                    {slide.highlight}
                  </span>
                </h1>

                <div className="pt-2">
                  <Link
                    to={slide.link}
                    className="inline-block bg-white hover:bg-emerald-50 text-slate-900 hover:text-emerald-900 px-8 py-3 rounded-full font-bold text-xs sm:text-sm tracking-wide shadow-lg transition-all transform hover:-translate-y-0.5"
                  >
                    Shop Now
                  </Link>
                </div>
              </div>
            </div>
          );
        })}

        {/* Carousel Navigation Arrows */}
        <button
          type="button"
          onClick={() =>
            setCurrentSlide((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1))
          }
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-slate-800 flex items-center justify-center transition cursor-pointer shadow-md"
          aria-label="Previous Slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-slate-800 flex items-center justify-center transition cursor-pointer shadow-md"
          aria-label="Next Slide"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
        {/* ========================================================================= */}
        {/* 2. PROMO GRID & CATEGORY BLOCKS (BACKEND CONNECTED)                      */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          {/* Top 3-block row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Block 1: New Year! New Fashion (4 cols) */}
            <div className="lg:col-span-4 bg-slate-100 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between min-h-[260px] border border-slate-200/80 shadow-2xs group">
              <div>
                <h3 className="font-bold text-base text-slate-900 leading-snug">
                  New Year! New Fashion
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {topFashionProduct ? topFashionProduct.name : 'Mens Premium Winter Collection'}
                </p>
              </div>

              <div className="my-auto flex justify-center items-center py-2">
                <img
                  src={
                    topFashionProduct
                      ? getProductImage(topFashionProduct)
                      : 'https://images.unsplash.com/photo-1544441893-675973e31985?w=400&auto=format&fit=crop&q=80'
                  }
                  alt="Winter Jacket Collection"
                  className="max-h-36 object-contain group-hover:scale-105 transition-transform duration-300 mix-blend-multiply"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = DEFAULT_FALLBACK_IMAGE;
                  }}
                />
              </div>

              <Link
                to={
                  topFashionProduct
                    ? `/products/${topFashionProduct.slug || topFashionProduct._id}`
                    : '/products?category=cloth'
                }
                className="inline-block bg-white hover:bg-slate-900 hover:text-white text-slate-900 px-5 py-2 rounded-full font-bold text-xs text-center transition shadow-2xs w-fit"
              >
                Shop Now {topFashionProduct && `• ৳${topFashionProduct.price}`}
              </Link>
            </div>

            {/* Block 2: Gaming Accessories (4 cols) */}
            <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-[260px]">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900">Gaming & Tech Accessories</h3>
                <Link
                  to="/products?category=electronics"
                  className="text-xs text-emerald-700 font-semibold hover:underline"
                >
                  See more
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3 py-2">
                <Link
                  to="/products?category=electronics"
                  className="flex flex-col items-center text-center p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 transition group"
                >
                  <img
                    src="https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=160&auto=format&fit=crop&q=80"
                    alt="Headsets"
                    className="w-14 h-14 object-contain group-hover:scale-105 transition mix-blend-multiply"
                  />
                  <span className="text-[11px] font-semibold text-slate-700 mt-1">Headsets</span>
                </Link>

                <Link
                  to="/products?category=electronics"
                  className="flex flex-col items-center text-center p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 transition group"
                >
                  <img
                    src="https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=160&auto=format&fit=crop&q=80"
                    alt="Mouse"
                    className="w-14 h-14 object-contain group-hover:scale-105 transition mix-blend-multiply"
                  />
                  <span className="text-[11px] font-semibold text-slate-700 mt-1">Mouse</span>
                </Link>

                <Link
                  to="/products?category=electronics"
                  className="flex flex-col items-center text-center p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 transition group"
                >
                  <img
                    src="https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?w=160&auto=format&fit=crop&q=80"
                    alt="Controller"
                    className="w-14 h-14 object-contain group-hover:scale-105 transition mix-blend-multiply"
                  />
                  <span className="text-[11px] font-semibold text-slate-700 mt-1">Controller</span>
                </Link>

                <Link
                  to="/products?category=electronics"
                  className="flex flex-col items-center text-center p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 transition group"
                >
                  <img
                    src="https://images.unsplash.com/photo-1580481077111-9a742c3664d4?w=160&auto=format&fit=crop&q=80"
                    alt="Chair"
                    className="w-14 h-14 object-contain group-hover:scale-105 transition mix-blend-multiply"
                  />
                  <span className="text-[11px] font-semibold text-slate-700 mt-1">Gadgets</span>
                </Link>
              </div>
            </div>

            {/* Block 3: Gaming Setup + TV Banner (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-3 justify-between">
              {/* Top 2 mini promos */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 text-white rounded-xl p-3 flex flex-col justify-between min-h-[110px] relative overflow-hidden shadow-2xs">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-rose-400">
                      Be The Winner
                    </span>
                    <h4 className="text-xs font-bold text-white leading-tight">Pro Gadgets Fest</h4>
                  </div>
                  <Link
                    to="/products?category=electronics"
                    className="text-xs font-black text-amber-400 hover:underline"
                  >
                    Explore Deals →
                  </Link>
                </div>

                <div className="bg-gradient-to-br from-indigo-900 to-purple-900 text-white rounded-xl p-3 flex flex-col justify-between min-h-[110px] relative overflow-hidden shadow-2xs">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-cyan-300">
                      Featured Tech
                    </span>
                    <h4 className="text-xs font-bold text-white leading-tight">Fast Delivery</h4>
                  </div>
                  <Link
                    to="/products?category=electronics"
                    className="text-[10px] font-bold text-cyan-300 hover:underline"
                  >
                    Shop Now →
                  </Link>
                </div>
              </div>

              {/* Bottom Featured electronics banner from backend */}
              <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
                <div className="space-y-1 max-w-[60%]">
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                    Featured Deal
                  </span>
                  <h4 className="font-bold text-xs text-slate-900 line-clamp-1">
                    {topElectronicsProduct ? topElectronicsProduct.name : 'Smart 4K Set Top Box'}
                  </h4>
                  <p className="font-black text-sm text-slate-900">
                    ৳{topElectronicsProduct ? topElectronicsProduct.price : 2200}
                  </p>
                  <Link
                    to={
                      topElectronicsProduct
                        ? `/products/${topElectronicsProduct.slug || topElectronicsProduct._id}`
                        : '/products?category=electronics'
                    }
                    className="inline-block bg-slate-900 hover:bg-emerald-700 text-white text-[10px] font-bold px-3 py-1 rounded-full transition mt-1"
                  >
                    Shop Now
                  </Link>
                </div>
                <img
                  src={
                    topElectronicsProduct
                      ? getProductImage(topElectronicsProduct)
                      : 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=200&auto=format&fit=crop&q=80'
                  }
                  alt="Electronics Deal"
                  className="w-20 h-20 object-contain mix-blend-multiply"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = DEFAULT_FALLBACK_IMAGE;
                  }}
                />
              </div>
            </div>
          </div>

          {/* Bottom 4-banner horizontal strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link
              to="/products?category=cloth"
              className="bg-slate-900 text-white rounded-xl p-4 min-h-[100px] flex flex-col justify-between relative overflow-hidden group shadow-2xs"
            >
              <div className="relative z-10">
                <span className="text-[10px] font-bold text-emerald-400 uppercase">Casual Fit</span>
                <h4 className="font-extrabold text-xs sm:text-sm text-white">Apparel & Fashion</h4>
              </div>
              <span className="relative z-10 text-[10px] font-bold text-slate-300 group-hover:text-white transition">
                Shop Now →
              </span>
            </Link>

            <Link
              to="/products?category=electronics"
              className="bg-slate-800 text-white rounded-xl p-4 min-h-[100px] flex flex-col justify-between relative overflow-hidden group shadow-2xs"
            >
              <div className="relative z-10">
                <span className="text-[10px] font-bold text-amber-400 uppercase">Smart Gadgets</span>
                <h4 className="font-extrabold text-xs sm:text-sm text-white">Headphones & Sound</h4>
              </div>
              <span className="relative z-10 text-[10px] font-bold text-slate-300 group-hover:text-white transition">
                Shop Now →
              </span>
            </Link>

            <Link
              to="/products"
              className="bg-indigo-950 text-white rounded-xl p-4 min-h-[100px] flex flex-col justify-between relative overflow-hidden group shadow-2xs"
            >
              <div className="relative z-10">
                <span className="text-[10px] font-bold text-cyan-300 uppercase">Express Hub</span>
                <h4 className="font-extrabold text-xs sm:text-sm text-white">All Daily Essentials</h4>
              </div>
              <span className="relative z-10 text-[10px] font-bold text-slate-300 group-hover:text-white transition">
                See more →
              </span>
            </Link>

            <Link
              to="/products?category=electronics"
              className="bg-emerald-950 text-white rounded-xl p-4 min-h-[100px] flex flex-col justify-between relative overflow-hidden group shadow-2xs"
            >
              <div className="relative z-10">
                <span className="text-[10px] font-bold text-emerald-400 uppercase">PHILIPS & TECH</span>
                <h4 className="font-extrabold text-xs sm:text-sm text-white">Home Electronics</h4>
              </div>
              <span className="relative z-10 text-[10px] font-bold text-slate-300 group-hover:text-white transition">
                Shop Now →
              </span>
            </Link>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. TRENDING PRODUCT SECTION (FROM BACKEND)                               */}
        {/* ========================================================================= */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" /> Trending Product
            </h2>
            <Link
              to="/products"
              className="text-xs font-bold text-slate-700 hover:text-emerald-700 border border-slate-300 hover:border-emerald-600 px-4 py-1.5 rounded-full transition cursor-pointer"
            >
              View All ({products.length})
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5 items-stretch">
            {/* 3 Main Product Cards (9 cols) */}
            <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {trendingProducts.map((product) => {
                const productId = product._id || product.id;
                const imgUrl = getProductImage(product);
                const isAdding = addingToCartId === productId;
                const discount =
                  product.discountPercentage ||
                  (product.comparePrice && product.comparePrice > product.price
                    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
                    : 0);

                return (
                  <div
                    key={productId}
                    className="bg-white rounded-2xl border border-slate-200/80 p-4 hover:shadow-md transition flex flex-col justify-between group"
                  >
                    {/* Image */}
                    <Link
                      to={`/products/${product.slug || productId}`}
                      className="aspect-square bg-slate-50 rounded-xl overflow-hidden mb-3 flex items-center justify-center p-2"
                    >
                      <img
                        src={imgUrl}
                        alt={product.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 mix-blend-multiply"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = DEFAULT_FALLBACK_IMAGE;
                        }}
                      />
                    </Link>

                    {/* Content */}
                    <div className="space-y-1.5">
                      <Link
                        to={`/products/${product.slug || productId}`}
                        className="font-bold text-sm text-slate-900 hover:text-emerald-800 line-clamp-1 block transition"
                      >
                        {product.name}
                      </Link>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {product.description || 'Authentic product with warranty and fast delivery.'}
                      </p>

                      {/* Ratings */}
                      <div className="flex items-center gap-1 text-xs pt-0.5">
                        <div className="flex text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                          ))}
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          ({product.rating?.count || 12} reviews)
                        </span>
                      </div>

                      {/* Pricing */}
                      <div className="flex items-baseline gap-2 pt-1">
                        <span className="text-base font-black text-slate-900">
                          ৳{product.price}
                        </span>
                        {product.comparePrice && (
                          <span className="text-xs text-slate-400 line-through">
                            ৳{product.comparePrice}
                          </span>
                        )}
                        {discount > 0 && (
                          <span className="text-[11px] font-bold text-rose-600 ml-auto">
                            {discount}% Off
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100">
                      <Link
                        to={`/products/${product.slug || productId}`}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
                      >
                        View Details
                      </Link>
                      <button
                        type="button"
                        disabled={isAdding}
                        onClick={(e) => handleAddToCart(e, product)}
                        className="bg-[#1B8057] hover:bg-[#156947] text-white px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                      >
                        <ShoppingBag className="w-3 h-3" />
                        {isAdding ? 'Adding...' : 'Add to cart'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Mini Collection Card (3 cols) */}
            <div className="lg:col-span-3 bg-slate-50 rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-3">
              <h3 className="font-bold text-sm text-slate-900">Trend collection from catalog</h3>
              <div className="grid grid-cols-2 gap-2">
                {miniTrendProducts.map((item) => {
                  const pId = item._id || item.id;
                  const itemImg = getProductImage(item);
                  return (
                    <div
                      key={pId}
                      className="bg-white p-2 rounded-xl border border-slate-100 flex flex-col justify-between text-center group"
                    >
                      <img
                        src={itemImg}
                        alt={item.name}
                        className="h-16 w-full object-contain mix-blend-multiply"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = DEFAULT_FALLBACK_IMAGE;
                        }}
                      />
                      <span className="text-[10px] font-bold text-slate-800 mt-1 line-clamp-1">
                        ৳{item.price}
                      </span>
                      <Link
                        to={`/products/${item.slug || pId}`}
                        className="mt-1 bg-slate-100 group-hover:bg-slate-900 group-hover:text-white text-[9px] font-bold py-0.5 rounded transition"
                      >
                        Buy Now
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. START EXPLORING NOW (CATEGORY TILES FROM BACKEND)                      */}
        {/* ========================================================================= */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" /> Start exploring now
            </h2>
            <Link
              to="/products"
              className="text-xs font-bold text-slate-700 hover:text-emerald-700 border border-slate-300 hover:border-emerald-600 px-4 py-1.5 rounded-full transition cursor-pointer"
            >
              View All Categories
            </Link>
          </div>

          <div className="relative">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {exploreCategories.map((cat, index) => (
                <Link
                  key={index}
                  to={`/products?category=${cat.slug}`}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-col items-center justify-between hover:shadow-md hover:border-emerald-300 transition-all group cursor-pointer"
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center mb-2">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-300 mix-blend-multiply"
                    />
                  </div>
                  <span className="font-bold text-xs sm:text-sm text-slate-800 group-hover:text-emerald-800 transition">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. BEST SELLING PRODUCT PROMOTIONAL GRID (FROM BACKEND)                  */}
        {/* ========================================================================= */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Best selling product
            </h2>
            <Link
              to="/products"
              className="text-xs font-bold text-slate-700 hover:text-emerald-700 border border-slate-300 hover:border-emerald-600 px-4 py-1.5 rounded-full transition cursor-pointer"
            >
              View All
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
            {/* Left 8 cols grid */}
            <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {bestSellingProducts.slice(0, 4).map((p, idx) => {
                const pId = p._id || p.id;
                const pImg = getProductImage(p);

                return (
                  <div
                    key={pId}
                    className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between relative overflow-hidden min-h-[160px] group hover:border-emerald-300 transition"
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                        {p.category?.name || 'FEATURED'}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{p.name}</h4>
                    </div>

                    <div className="my-2 flex justify-end">
                      <img
                        src={pImg}
                        alt={p.name}
                        className="max-h-20 object-contain mix-blend-multiply group-hover:scale-105 transition"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = DEFAULT_FALLBACK_IMAGE;
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <Link
                        to={`/products/${p.slug || pId}`}
                        className="text-[11px] font-bold bg-white text-slate-900 px-3 py-1 rounded-full hover:bg-slate-900 hover:text-white transition inline-flex items-center gap-1 shadow-2xs"
                      >
                        Visit store <ExternalLink className="w-3 h-3" />
                      </Link>
                      <span className="text-sm font-black text-slate-900">৳{p.price}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right 4 cols: Dog Food / Promo Banner */}
            <div className="md:col-span-4 bg-gradient-to-br from-cyan-400 to-blue-500 text-white rounded-2xl p-6 flex flex-col justify-between min-h-[340px] shadow-md relative overflow-hidden">
              <div className="space-y-2 relative z-10">
                <span className="text-xs font-black uppercase tracking-wider text-blue-950 bg-white/70 px-2.5 py-0.5 rounded-full">
                  15% OFF
                </span>
                <h3 className="text-2xl font-black leading-tight text-slate-950">
                  DEALPORT EXCLUSIVE <br /> TOP RATED SELECTION
                </h3>
                <p className="text-xs text-blue-950 font-semibold">
                  100% Guaranteed quality with doorstep express delivery.
                </p>
              </div>

              <div className="my-auto flex justify-center py-4 relative z-10">
                <img
                  src="https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400&auto=format&fit=crop&q=80"
                  alt="Pet Dog Food"
                  className="max-h-40 object-contain filter drop-shadow-lg"
                />
              </div>

              <Link
                to="/products"
                className="bg-blue-900 hover:bg-blue-950 text-white py-2.5 rounded-full text-xs font-bold text-center transition shadow-md relative z-10"
              >
                Shop Now
              </Link>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 6. LIMITED-TIME DEAL SECTION (FROM BACKEND)                              */}
        {/* ========================================================================= */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Zap className="w-5 h-5 text-rose-500 fill-rose-500" /> Limited-Time Deal
            </h2>
            <Link
              to="/products"
              className="text-xs font-bold text-slate-700 hover:text-emerald-700 border border-slate-300 hover:border-emerald-600 px-4 py-1.5 rounded-full transition cursor-pointer"
            >
              View All Deals
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            {limitedDeals.map((product) => {
              const productId = product._id || product.id;
              const imgUrl = getProductImage(product);
              const isAdding = addingToCartId === productId;
              const discount =
                product.discountPercentage ||
                (product.comparePrice && product.comparePrice > product.price
                  ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
                  : 0);

              return (
                <div
                  key={productId}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 hover:shadow-md transition flex flex-col justify-between group relative"
                >
                  {/* Discount Badge */}
                  {discount > 0 && (
                    <span className="absolute top-3 left-3 z-10 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                      {discount}% Off
                    </span>
                  )}

                  {/* Product Image */}
                  <Link
                    to={`/products/${product.slug || productId}`}
                    className="aspect-square bg-slate-50 rounded-xl overflow-hidden mb-3 flex items-center justify-center p-2"
                  >
                    <img
                      src={imgUrl}
                      alt={product.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 mix-blend-multiply"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = DEFAULT_FALLBACK_IMAGE;
                      }}
                    />
                  </Link>

                  {/* Details */}
                  <div className="space-y-1.5">
                    <Link
                      to={`/products/${product.slug || productId}`}
                      className="font-bold text-sm text-slate-900 hover:text-emerald-800 line-clamp-1 block transition"
                    >
                      {product.name}
                    </Link>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {product.description || 'Verified product from authenticated suppliers.'}
                    </p>

                    {/* Ratings */}
                    <div className="flex items-center gap-1 text-xs pt-0.5">
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                        ))}
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        ({product.rating?.count || 10} reviews)
                      </span>
                    </div>

                    {/* Pricing */}
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-base font-black text-slate-900">
                        ৳{product.price}
                      </span>
                      {product.comparePrice && (
                        <span className="text-xs text-slate-400 line-through">
                          ৳{product.comparePrice}
                        </span>
                      )}
                      {discount > 0 && (
                        <span className="text-[11px] font-bold text-rose-600 ml-auto">
                          {discount}% Off
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100">
                    <Link
                      to={`/products/${product.slug || productId}`}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
                    >
                      View Details
                    </Link>
                    <button
                      type="button"
                      disabled={isAdding}
                      onClick={(e) => handleAddToCart(e, product)}
                      className="bg-[#1B8057] hover:bg-[#156947] text-white px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                    >
                      <ShoppingBag className="w-3 h-3" />
                      {isAdding ? 'Adding...' : 'Add to cart'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 7. "OUR HAPPY CUSTOMERS" TESTIMONIALS SECTION                            */}
        {/* ========================================================================= */}
        <section className="space-y-8 text-center pt-4">
          <div className="space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black text-[#1B8057] tracking-tight">
              Our Happy Customers
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Don't just take our word for it – see how our products and services have delighted
              customers across the globe, one experience at a time.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-left">
            {CUSTOMER_REVIEWS.map((review) => (
              <div
                key={review.id}
                className={`p-5 rounded-2xl border transition shadow-2xs space-y-3 flex flex-col justify-between ${review.highlighted
                    ? 'bg-[#EBF7EE] border-emerald-300'
                    : 'bg-white border-slate-200/80'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={review.avatar}
                    alt={review.name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{review.name}</h4>
                    <div className="flex text-amber-400 pt-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400" />
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed italic">
                  "{review.text}"
                </p>
              </div>
            ))}
          </div>

          {/* GET STARTED Button */}
          <div className="pt-2">
            <Link
              to="/products"
              className="inline-block bg-[#0F372A] hover:bg-[#1B8057] text-white px-10 py-3 rounded-full font-extrabold text-xs tracking-wider uppercase transition shadow-md"
            >
              GET STARTED
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;