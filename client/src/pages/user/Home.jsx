import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts } from '../../features/products/productSlice';
import { addToCart } from '../../features/cart/cartSlice';
import { fetchHomepageCMS, trackBannerClick } from '../../features/cms/cmsSlice';
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

const getProductImage = (product) => {
  if (!product) return null;
  if (product.primaryImage) {
    if (typeof product.primaryImage === 'string' && product.primaryImage.trim()) {
      return product.primaryImage.trim();
    }
    if (typeof product.primaryImage === 'object' && product.primaryImage.url) {
      return product.primaryImage.url.trim();
    }
  }
  if (Array.isArray(product.images) && product.images.length > 0) {
    const primary = product.images.find((img) => img?.isPrimary && img?.url);
    if (primary?.url) return primary.url.trim();
    const first = product.images[0];
    if (typeof first === 'string' && first.trim()) return first.trim();
    if (typeof first === 'object' && first?.url) return first.url.trim();
    if (typeof first === 'object' && first?.image) return first.image.trim();
  }
  if (typeof product.image === 'string' && product.image.trim()) return product.image.trim();
  if (typeof product.thumbnail === 'string' && product.thumbnail.trim()) return product.thumbnail.trim();
  return null;
};

// Safe Category Image resolution (admin-provided only)
const getCategoryImage = (cat) => {
  if (!cat) return null;
  if (typeof cat.image === 'string' && cat.image.trim()) {
    return cat.image.trim();
  }
  if (cat.image && typeof cat.image.url === 'string' && cat.image.url.trim()) {
    return cat.image.url.trim();
  }
  return null;
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
    link: '/products',
  },
];

// Customer Reviews (Initials-based without external image links)
const CUSTOMER_REVIEWS = [
  {
    id: 1,
    name: 'Emily R.',
    initials: 'ER',
    avatarBg: 'bg-emerald-600',
    highlighted: false,
    text: 'Fast delivery and fantastic quality! The customer support team was quick to resolve my query. Dealport has earned a loyal customer.',
  },
  {
    id: 2,
    name: 'John D.',
    initials: 'JD',
    avatarBg: 'bg-blue-600',
    highlighted: true,
    text: 'Great platform and verified sellers. I got my package delivered on time in pristine condition.',
  },
  {
    id: 3,
    name: 'Ahmed M.',
    initials: 'AM',
    avatarBg: 'bg-indigo-600',
    highlighted: false,
    text: 'A very reliable online shopping experience. The deals and offers make it my go-to choice.',
  },
  {
    id: 4,
    name: 'Alex T.',
    initials: 'AT',
    avatarBg: 'bg-amber-600',
    highlighted: false,
    text: 'Easy navigation and seamless checkout. Customer service was friendly and supportive.',
  },
  {
    id: 5,
    name: 'Priya R.',
    initials: 'PR',
    avatarBg: 'bg-rose-600',
    highlighted: false,
    text: 'Wonderful selection of authentic products. Delivery was surprisingly fast!',
  },
  {
    id: 6,
    name: 'David H.',
    initials: 'DH',
    avatarBg: 'bg-teal-600',
    highlighted: false,
    text: 'Highly recommend Dealport for quality products and excellent customer care.',
  },
];

const Home = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { items = [], products: stateProducts = [], status } = useSelector((state) => state.products || {});
  const { homepageData } = useSelector((state) => state.cms || {});
  const [categories, setCategories] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [addingToCartId, setAddingToCartId] = useState(null);

  // Dynamic Hero Slides from CMS with fallback (admin uploaded images only)
  const heroSlides = useMemo(() => {
    const cmsSlides = homepageData?.banners?.hero_slider;
    if (Array.isArray(cmsSlides) && cmsSlides.length > 0) {
      const validSlides = cmsSlides.filter((b) => b && (b.image?.url || b.imageUrl));
      if (validSlides.length > 0) {
        return validSlides.map((b) => ({
          id: b._id,
          title: b.title,
          highlight: b.subtitle,
          bgImage: b.image?.url || b.imageUrl,
          link: b.link || '/products',
          ctaText: b.ctaText || 'Shop Now',
          badgeText: b.badgeText,
        }));
      }
    }
    return HERO_SLIDES;
  }, [homepageData]);

  // Safely resolve the array of products from Redux state
  const products = useMemo(() => {
    if (Array.isArray(items) && items.length > 0) return items;
    if (Array.isArray(stateProducts) && stateProducts.length > 0) return stateProducts;
    return [];
  }, [items, stateProducts]);

  // Fetch backend products, categories, and homepage CMS data on mount
  useEffect(() => {
    dispatch(fetchProducts({ limit: 40 }));
    dispatch(fetchHomepageCMS());

    const fetchCategories = async () => {
      try {
        const res = await axiosInstance.get('/products/categories');
        if (res.data?.data) {
          const catList = Array.isArray(res.data.data) ? res.data.data : res.data.data.categories || [];
          setCategories(catList);
        }
      } catch (err) {
        // fallback to empty if API fails
      }
    };
    fetchCategories();
  }, [dispatch]);

  // Auto rotate hero slides according to CMS interval
  useEffect(() => {
    if (!heroSlides || heroSlides.length === 0) return;
    const interval = homepageData?.heroSettings?.autoPlayInterval || 6000;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, interval);
    return () => clearInterval(timer);
  }, [heroSlides, homepageData?.heroSettings?.autoPlayInterval]);

  const handleHeroBannerClick = (slide) => {
    if (slide?.id && typeof slide.id === 'string' && slide.id.length === 24) {
      dispatch(trackBannerClick(slide.id));
    }
  };

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

  // Trending Products (First 3 products from backend)
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

  // Dynamic Admin Categories List (Only admin categories from backend)
  const exploreCategories = useMemo(() => {
    if (Array.isArray(categories) && categories.length > 0) {
      return categories.map((c) => ({
        _id: c._id,
        name: c.name,
        slug: c.slug || c._id,
        image: getCategoryImage(c),
        description: c.description,
      }));
    }
    return [];
  }, [categories]);

  // Dynamic CMS Promo Banners (uploaded by admin in CMS)
  const promoTopBanners = useMemo(() => {
    const list = homepageData?.banners?.promo_top;
    if (Array.isArray(list)) {
      return list.filter((b) => b && (b.image?.url || b.imageUrl));
    }
    return [];
  }, [homepageData]);

  const flashSaleBanner = useMemo(() => {
    const list = homepageData?.banners?.flash_sale;
    if (Array.isArray(list) && list.length > 0) {
      return list.find((b) => b && (b.image?.url || b.imageUrl)) || null;
    }
    return null;
  }, [homepageData]);

  // Top Products for Promo Cards (no hardcoded category filter)
  const featuredProduct1 = useMemo(() => {
    return Array.isArray(products) && products.length > 0 ? products[0] : null;
  }, [products]);

  const featuredProduct2 = useMemo(() => {
    return Array.isArray(products) && products.length > 1 ? products[1] : null;
  }, [products]);

  return (
    <div className="w-full bg-white text-slate-800 space-y-12 sm:space-y-16 pb-16">
      {/* ========================================================================= */}
      {/* 1. HERO BANNER SECTION (FULL-WIDTH ATMOSPHERIC BANNER)                   */}
      {/* ========================================================================= */}
      <section className="relative w-full h-80 sm:h-100 lg:h-120 bg-slate-900 overflow-hidden">
        {heroSlides.map((slide, index) => {
          const isActive = index === currentSlide;
          return (
            <div
              key={slide.id || index}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <img
                src={slide.bgImage}
                alt={slide.title}
                className="w-full h-full object-cover object-center filter brightness-75 scale-105 transition-transform duration-10000"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

              <div className="absolute inset-0 max-w-7xl mx-auto px-6 sm:px-12 flex flex-col justify-center text-white space-y-4">
                {slide.badgeText && (
                  <span className="w-fit px-3 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-black uppercase tracking-wider shadow-sm">
                    {slide.badgeText}
                  </span>
                )}

                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight max-w-xl">
                  {slide.title} <br />
                  {slide.highlight && (
                    <span className="font-serif italic font-normal text-emerald-300">
                      {slide.highlight}
                    </span>
                  )}
                </h1>

                <div className="pt-2">
                  <Link
                    to={slide.link || '/products'}
                    onClick={() => handleHeroBannerClick(slide)}
                    className="inline-block bg-white hover:bg-emerald-50 text-slate-900 hover:text-emerald-900 px-8 py-3 rounded-full font-bold text-xs sm:text-sm tracking-wide shadow-lg transition-all transform hover:-translate-y-0.5"
                  >
                    {slide.ctaText || 'Shop Now'}
                  </Link>
                </div>
              </div>
            </div>
          );
        })}

        {/* Carousel Navigation Arrows */}
        {heroSlides.length > 1 && (
          <>
            <button
              type="button"
              onClick={() =>
                setCurrentSlide((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1))
              }
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-slate-800 flex items-center justify-center transition cursor-pointer shadow-md"
              aria-label="Previous Slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentSlide((prev) => (prev + 1) % heroSlides.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-slate-800 flex items-center justify-center transition cursor-pointer shadow-md"
              aria-label="Next Slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
        {/* ========================================================================= */}
        {/* 2. PROMO GRID & CATEGORY BLOCKS (ADMIN & BACKEND CONNECTED)              */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          {/* Top 3-block row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Block 1: Admin Promo Banner or Featured Product (4 cols) */}
            <div className="lg:col-span-4 bg-slate-100 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between min-h-[260px] border border-slate-200/80 shadow-2xs group">
              <div>
                <h3 className="font-bold text-base text-slate-900 leading-snug">
                  {promoTopBanners[0]?.title || (featuredProduct1 ? 'Featured Selection' : 'Discover Great Deals')}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {promoTopBanners[0]?.subtitle || (featuredProduct1 ? featuredProduct1.name : 'Explore our verified products and daily offers')}
                </p>
              </div>

              <div className="my-auto flex justify-center items-center py-2">
                {promoTopBanners[0]?.image?.url ? (
                  <img
                    src={promoTopBanners[0].image.url}
                    alt={promoTopBanners[0].title || 'Promo Banner'}
                    className="max-h-36 object-contain group-hover:scale-105 transition-transform duration-300 mix-blend-multiply"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : featuredProduct1 && getProductImage(featuredProduct1) ? (
                  <img
                    src={getProductImage(featuredProduct1)}
                    alt={featuredProduct1.name}
                    className="max-h-36 object-contain group-hover:scale-105 transition-transform duration-300 mix-blend-multiply"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <div className="h-28 w-28 rounded-2xl bg-white/70 flex items-center justify-center text-slate-400">
                    <ShoppingBag className="w-10 h-10 text-emerald-600/70" />
                  </div>
                )}
              </div>

              <Link
                to={
                  promoTopBanners[0]?.link ||
                  (featuredProduct1 ? `/products/${featuredProduct1.slug || featuredProduct1._id}` : '/products')
                }
                className="inline-block bg-white hover:bg-slate-900 hover:text-white text-slate-900 px-5 py-2 rounded-full font-bold text-xs text-center transition shadow-2xs w-fit"
              >
                {promoTopBanners[0]?.ctaText || (featuredProduct1 ? `Shop Now • ৳${featuredProduct1.price}` : 'Browse Store')}
              </Link>
            </div>

            {/* Block 2: Real Admin Categories (4 cols) */}
            <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-[260px]">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900">Featured Categories</h3>
                <Link
                  to="/products"
                  className="text-xs text-emerald-700 font-semibold hover:underline"
                >
                  See all
                </Link>
              </div>

              {categories && categories.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 py-2">
                  {categories.slice(0, 4).map((cat) => {
                    const catImg = getCategoryImage(cat);
                    return (
                      <Link
                        key={cat._id}
                        to={`/products?category=${cat.slug || cat._id}`}
                        className="flex flex-col items-center text-center p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 transition group"
                      >
                        {catImg ? (
                          <img
                            src={catImg}
                            alt={cat.name}
                            className="w-14 h-14 object-contain group-hover:scale-105 transition mix-blend-multiply"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition">
                            <Layers className="w-6 h-6" />
                          </div>
                        )}
                        <span className="text-[11px] font-semibold text-slate-700 mt-1 line-clamp-1">
                          {cat.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                  <Layers className="w-8 h-8 text-slate-300" />
                  <p className="text-xs">Categories added by admin will appear here.</p>
                </div>
              )}
            </div>

            {/* Block 3: CMS Banner or Deals Spotlight (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-3 justify-between">
              {/* Top 2 mini promos */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 text-white rounded-xl p-3 flex flex-col justify-between min-h-[110px] relative overflow-hidden shadow-2xs">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-rose-400">
                      {promoTopBanners[1]?.badgeText || 'Special Deals'}
                    </span>
                    <h4 className="text-xs font-bold text-white leading-tight">
                      {promoTopBanners[1]?.title || 'Exclusive Offers'}
                    </h4>
                  </div>
                  <Link
                    to={promoTopBanners[1]?.link || '/products?deals=true'}
                    className="text-xs font-black text-amber-400 hover:underline"
                  >
                    {promoTopBanners[1]?.ctaText || 'Explore Deals →'}
                  </Link>
                </div>

                <div className="bg-gradient-to-br from-indigo-900 to-purple-900 text-white rounded-xl p-3 flex flex-col justify-between min-h-[110px] relative overflow-hidden shadow-2xs">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-cyan-300">
                      {promoTopBanners[2]?.badgeText || 'Verified'}
                    </span>
                    <h4 className="text-xs font-bold text-white leading-tight">
                      {promoTopBanners[2]?.title || 'Fast Delivery'}
                    </h4>
                  </div>
                  <Link
                    to={promoTopBanners[2]?.link || '/products'}
                    className="text-[10px] font-bold text-cyan-300 hover:underline"
                  >
                    {promoTopBanners[2]?.ctaText || 'Shop Now →'}
                  </Link>
                </div>
              </div>

              {/* Bottom Featured product deal from backend */}
              <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
                <div className="space-y-1 max-w-[60%]">
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                    Featured Deal
                  </span>
                  <h4 className="font-bold text-xs text-slate-900 line-clamp-1">
                    {featuredProduct2 ? featuredProduct2.name : (featuredProduct1 ? featuredProduct1.name : 'Best Price Guarantee')}
                  </h4>
                  {(featuredProduct2 || featuredProduct1) && (
                    <p className="font-black text-sm text-slate-900">
                      ৳{(featuredProduct2 || featuredProduct1).price}
                    </p>
                  )}
                  <Link
                    to={
                      featuredProduct2
                        ? `/products/${featuredProduct2.slug || featuredProduct2._id}`
                        : (featuredProduct1 ? `/products/${featuredProduct1.slug || featuredProduct1._id}` : '/products')
                    }
                    className="inline-block bg-slate-900 hover:bg-emerald-700 text-white text-[10px] font-bold px-3 py-1 rounded-full transition mt-1"
                  >
                    Shop Now
                  </Link>
                </div>
                {(featuredProduct2 || featuredProduct1) && getProductImage(featuredProduct2 || featuredProduct1) ? (
                  <img
                    src={getProductImage(featuredProduct2 || featuredProduct1)}
                    alt={(featuredProduct2 || featuredProduct1).name}
                    className="w-20 h-20 object-contain mix-blend-multiply"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <ShoppingBag className="w-6 h-6 text-slate-400" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom 4-banner horizontal strip (Dynamic from admin categories or CMS) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {categories && categories.length >= 4 ? (
              categories.slice(0, 4).map((cat, idx) => {
                const bgColors = [
                  'bg-slate-900',
                  'bg-slate-800',
                  'bg-indigo-950',
                  'bg-emerald-950',
                ];
                const tagColors = [
                  'text-emerald-400',
                  'text-amber-400',
                  'text-cyan-300',
                  'text-emerald-400',
                ];
                return (
                  <Link
                    key={cat._id}
                    to={`/products?category=${cat.slug || cat._id}`}
                    className={`${bgColors[idx % bgColors.length]} text-white rounded-xl p-4 min-h-[100px] flex flex-col justify-between relative overflow-hidden group shadow-2xs`}
                  >
                    <div className="relative z-10">
                      <span className={`text-[10px] font-bold ${tagColors[idx % tagColors.length]} uppercase`}>
                        Category
                      </span>
                      <h4 className="font-extrabold text-xs sm:text-sm text-white line-clamp-1">
                        {cat.name}
                      </h4>
                    </div>
                    <span className="relative z-10 text-[10px] font-bold text-slate-300 group-hover:text-white transition">
                      Shop Now →
                    </span>
                  </Link>
                );
              })
            ) : (
              [
                { title: 'New Arrivals', subtitle: 'LATEST PRODUCTS', link: '/products' },
                { title: 'Best Deals', subtitle: 'SAVE BIG', link: '/products?deals=true' },
                { title: 'Top Rated', subtitle: 'CUSTOMER FAVORITES', link: '/products' },
                { title: 'Fast Delivery', subtitle: 'DOORSTEP SERVICE', link: '/products' },
              ].map((item, idx) => (
                <Link
                  key={idx}
                  to={item.link}
                  className="bg-slate-900 text-white rounded-xl p-4 min-h-[100px] flex flex-col justify-between relative overflow-hidden group shadow-2xs"
                >
                  <div className="relative z-10">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase">
                      {item.subtitle}
                    </span>
                    <h4 className="font-extrabold text-xs sm:text-sm text-white">
                      {item.title}
                    </h4>
                  </div>
                  <span className="relative z-10 text-[10px] font-bold text-slate-300 group-hover:text-white transition">
                    Explore →
                  </span>
                </Link>
              ))
            )}
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
              {trendingProducts.length > 0 ? (
                trendingProducts.map((product) => {
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
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={product.name}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 mix-blend-multiply"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <ShoppingBag className="w-12 h-12 text-slate-300" />
                          </div>
                        )}
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
                })
              ) : (
                <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center space-y-2">
                  <ShoppingBag className="w-10 h-10 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">No products uploaded yet</p>
                  <p className="text-xs text-slate-400">Products will appear here once added by sellers.</p>
                </div>
              )}
            </div>

            {/* Right Mini Collection Card (3 cols) */}
            <div className="lg:col-span-3 bg-slate-50 rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-3">
              <h3 className="font-bold text-sm text-slate-900">Trend collection from catalog</h3>
              {miniTrendProducts.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {miniTrendProducts.map((item) => {
                    const pId = item._id || item.id;
                    const itemImg = getProductImage(item);
                    return (
                      <div
                        key={pId}
                        className="bg-white p-2 rounded-xl border border-slate-100 flex flex-col justify-between text-center group"
                      >
                        {itemImg ? (
                          <img
                            src={itemImg}
                            alt={item.name}
                            className="h-16 w-full object-contain mix-blend-multiply"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="h-16 w-full flex items-center justify-center text-slate-300">
                            <ShoppingBag className="w-6 h-6 text-slate-300" />
                          </div>
                        )}
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
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  New collections coming soon.
                </div>
              )}
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
            {exploreCategories.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {exploreCategories.map((cat, index) => (
                  <Link
                    key={cat._id || index}
                    to={`/products?category=${cat.slug || cat._id}`}
                    className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-col items-center justify-between hover:shadow-md hover:border-emerald-300 transition-all group cursor-pointer min-h-[150px]"
                  >
                    <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center mb-2">
                      {cat.image ? (
                        <img
                          src={cat.image}
                          alt={cat.name}
                          className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-300 mix-blend-multiply"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                          <Layers className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <span className="font-bold text-xs sm:text-sm text-slate-800 group-hover:text-emerald-800 transition text-center line-clamp-1">
                      {cat.name}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-2">
                <Layers className="w-8 h-8 text-slate-400" />
                <p className="text-sm font-semibold text-slate-700">Categories added by admin will appear here</p>
                <p className="text-xs text-slate-400">Manage categories in admin panel to display them here.</p>
                <Link to="/products" className="text-xs font-bold text-emerald-700 hover:underline pt-1">
                  Browse All Products →
                </Link>
              </div>
            )}
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
              {bestSellingProducts.length > 0 ? (
                bestSellingProducts.slice(0, 4).map((p, idx) => {
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
                        {pImg ? (
                          <img
                            src={pImg}
                            alt={p.name}
                            className="max-h-20 object-contain mix-blend-multiply group-hover:scale-105 transition"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="h-16 w-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300">
                            <ShoppingBag className="w-8 h-8 text-slate-300" />
                          </div>
                        )}
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
                })
              ) : (
                <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center space-y-2">
                  <ShoppingBag className="w-10 h-10 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">No best-selling products yet</p>
                  <p className="text-xs text-slate-400">Products will appear here once orders are placed.</p>
                </div>
              )}
            </div>

            {/* Right 4 cols: Admin Flash Sale Banner or Exclusive Promotion */}
            <div className="md:col-span-4 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-6 flex flex-col justify-between min-h-[340px] shadow-md relative overflow-hidden">
              <div className="space-y-2 relative z-10">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-300 bg-black/40 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                  {flashSaleBanner?.badgeText || 'SPECIAL OFFER'}
                </span>
                <h3 className="text-2xl font-black leading-tight text-white">
                  {flashSaleBanner?.title || 'EXCLUSIVE DEALS & VERIFIED PRODUCTS'}
                </h3>
                <p className="text-xs text-emerald-100/80 font-medium leading-relaxed">
                  {flashSaleBanner?.subtitle || '100% Guaranteed authentic quality with doorstep express delivery.'}
                </p>
              </div>

              <div className="my-auto flex justify-center py-4 relative z-10">
                {flashSaleBanner?.image?.url ? (
                  <img
                    src={flashSaleBanner.image.url}
                    alt={flashSaleBanner.title || 'Flash Sale'}
                    className="max-h-40 object-contain filter drop-shadow-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-xs">
                    <Sparkles className="w-12 h-12 text-emerald-300" />
                  </div>
                )}
              </div>

              <Link
                to={flashSaleBanner?.link || '/products?deals=true'}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-2.5 rounded-full text-xs font-bold text-center transition shadow-md relative z-10"
              >
                {flashSaleBanner?.ctaText || 'Shop Now'}
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
            {limitedDeals.length > 0 ? (
              limitedDeals.map((product) => {
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
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={product.name}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 mix-blend-multiply"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <ShoppingBag className="w-12 h-12 text-slate-300" />
                        </div>
                      )}
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
              })
            ) : (
              <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center space-y-2">
                <Zap className="w-10 h-10 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">No limited-time deals right now</p>
                <p className="text-xs text-slate-400">Discounted items and special deals will appear here.</p>
              </div>
            )}
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
                className={`p-5 rounded-2xl border transition shadow-2xs space-y-3 flex flex-col justify-between ${
                  review.highlighted
                    ? 'bg-[#EBF7EE] border-emerald-300'
                    : 'bg-white border-slate-200/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs text-white ${
                      review.avatarBg || 'bg-emerald-600'
                    } shadow-2xs`}
                  >
                    {review.initials || review.name?.slice(0, 2)?.toUpperCase()}
                  </div>
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