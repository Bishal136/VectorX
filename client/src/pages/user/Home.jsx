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

// Safe Banner Image resolution
const getBannerImage = (banner) => {
  if (!banner) return '';
  if (banner.image && typeof banner.image.url === 'string' && banner.image.url.trim()) {
    return banner.image.url.trim();
  }
  if (typeof banner.image === 'string' && banner.image.trim()) {
    return banner.image.trim();
  }
  if (typeof banner.imageUrl === 'string' && banner.imageUrl.trim()) {
    return banner.imageUrl.trim();
  }
  return '';
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
          mobileImage: b.mobileImage?.url || b.mobileImageUrl || null,
          link: b.link || '/products',
          ctaText: b.ctaText || 'Shop Now',
          badgeText: b.badgeText,
          bgColor: b.bgColor || '#0f172a',
          textColor: b.textColor || '#ffffff',
          showTextOverlay: b.showTextOverlay === true,
          isCMS: true,
        }));
      }
    }
    return HERO_SLIDES.map((s) => ({ ...s, showTextOverlay: true, bgColor: '#0f172a' }));
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
      return list.filter((b) => b && (getBannerImage(b) || b.title));
    }
    return [];
  }, [homepageData]);

  const promoMiddleBanners = useMemo(() => {
    const list = homepageData?.banners?.promo_middle;
    if (Array.isArray(list)) {
      return list.filter((b) => b && (getBannerImage(b) || b.title));
    }
    return [];
  }, [homepageData]);

  const flashSaleBanner = useMemo(() => {
    const list = homepageData?.banners?.flash_sale;
    if (Array.isArray(list) && list.length > 0) {
      return list.find((b) => b && (getBannerImage(b) || b.title)) || null;
    }
    return null;
  }, [homepageData]);

  const footerBanners = useMemo(() => {
    const list = homepageData?.banners?.footer_banner;
    if (Array.isArray(list)) {
      return list.filter((b) => b && (getBannerImage(b) || b.title));
    }
    return [];
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
      {/* 1. HERO BANNER SECTION (RESPONSIVE AUTO-RESIZING HERO SLIDER)            */}
      {/* ========================================================================= */}
      <section
        style={{
          backgroundColor: heroSlides[currentSlide]?.bgColor || '#0f172a',
        }}
        className="relative w-full overflow-hidden transition-colors duration-500 min-h-[140px] sm:min-h-[200px] md:min-h-[260px] max-h-[580px]"
      >
        {/* Intrinsic sizer: sizes container automatically to natural banner image aspect ratio */}
        {heroSlides[currentSlide]?.bgImage && (
          <img
            src={heroSlides[currentSlide].bgImage}
            alt=""
            className="w-full h-auto block invisible pointer-events-none select-none max-h-[580px] object-cover"
            aria-hidden="true"
          />
        )}

        {heroSlides.map((slide, index) => {
          const isActive = index === currentSlide;
          const showOverlay = slide.showTextOverlay === true;

          return (
            <div
              key={slide.id || index}
              className={`absolute inset-0 w-full h-full transition-opacity duration-700 ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <Link
                to={slide.link || '/products'}
                onClick={() => handleHeroBannerClick(slide)}
                className="relative block w-full h-full cursor-pointer group"
                tabIndex={isActive ? 0 : -1}
              >
                {slide.mobileImage ? (
                  <picture>
                    <source media="(max-width: 640px)" srcSet={slide.mobileImage} />
                    <img
                      src={slide.bgImage}
                      alt={slide.title || 'Hero Banner'}
                      className="w-full h-full object-cover object-center"
                    />
                  </picture>
                ) : (
                  <img
                    src={slide.bgImage}
                    alt={slide.title || 'Hero Banner'}
                    className="w-full h-full object-cover object-center"
                  />
                )}

                {/* Dark gradient & typography overlay only when showOverlay is enabled */}
                {showOverlay && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

                    <div className="absolute inset-0 max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 flex flex-col justify-center text-white space-y-2 sm:space-y-4">
                      {slide.badgeText && (
                        <span className="w-fit px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-emerald-500 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-sm">
                          {slide.badgeText}
                        </span>
                      )}

                      <h1 className="text-lg sm:text-3xl lg:text-5xl font-extrabold tracking-tight leading-tight max-w-xl">
                        {slide.title} <br className="hidden sm:inline" />
                        {slide.highlight && (
                          <span className="font-serif italic font-normal text-emerald-300 ml-1 sm:ml-0">
                            {slide.highlight}
                          </span>
                        )}
                      </h1>

                      <div className="pt-1 sm:pt-2">
                        <span
                          className="inline-block bg-white hover:bg-emerald-50 text-slate-900 hover:text-emerald-900 px-5 py-2 sm:px-8 sm:py-3 rounded-full font-bold text-xs sm:text-sm tracking-wide shadow-lg transition-all transform group-hover:-translate-y-0.5"
                        >
                          {slide.ctaText || 'Shop Now'}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </Link>
            </div>
          );
        })}

        {/* Carousel Navigation Arrows */}
        {heroSlides.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCurrentSlide((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1));
              }}
              className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs flex items-center justify-center transition cursor-pointer shadow-md"
              aria-label="Previous Slide"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
              }}
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs flex items-center justify-center transition cursor-pointer shadow-md"
              aria-label="Next Slide"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </>
        )}

        {/* Carousel Dots Indicator */}
        {heroSlides.length > 1 && (
          <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-full">
            {heroSlides.map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentSlide(dotIdx);
                }}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  dotIdx === currentSlide ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to slide ${dotIdx + 1}`}
              />
            ))}
          </div>
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
            <div
              style={{
                backgroundColor: promoTopBanners[0]?.bgColor || undefined,
                color: promoTopBanners[0]?.textColor || undefined,
              }}
              className="lg:col-span-4 bg-slate-100 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between min-h-[260px] border border-slate-200/80 shadow-2xs group"
            >
              <div>
                {promoTopBanners[0]?.badgeText && (
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-black/10 text-current mb-1 inline-block">
                    {promoTopBanners[0].badgeText}
                  </span>
                )}
                <h3
                  className="font-bold text-base text-slate-900 leading-snug"
                  style={{ color: promoTopBanners[0]?.textColor || undefined }}
                >
                  {promoTopBanners[0]?.title || (featuredProduct1 ? 'Featured Selection' : 'Discover Great Deals')}
                </h3>
                <p
                  className="text-[11px] text-slate-500 mt-0.5"
                  style={{ color: promoTopBanners[0]?.textColor ? `${promoTopBanners[0].textColor}cc` : undefined }}
                >
                  {promoTopBanners[0]?.subtitle || (featuredProduct1 ? featuredProduct1.name : 'Explore our verified products and daily offers')}
                </p>
              </div>

              <div className="my-auto flex justify-center items-center py-2">
                {getBannerImage(promoTopBanners[0]) ? (
                  <img
                    src={getBannerImage(promoTopBanners[0])}
                    alt={promoTopBanners[0].title || 'Promo Banner'}
                    className="max-h-36 rounded-xl object-contain group-hover:scale-105 transition-transform duration-300"
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
                onClick={() => promoTopBanners[0]?._id && dispatch(trackBannerClick(promoTopBanners[0]._id))}
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
                <div
                  style={{
                    backgroundColor: promoTopBanners[1]?.bgColor || undefined,
                    color: promoTopBanners[1]?.textColor || undefined,
                  }}
                  className="bg-slate-900 text-white rounded-xl p-3 flex flex-col justify-between min-h-[120px] relative overflow-hidden shadow-2xs group"
                >
                  {getBannerImage(promoTopBanners[1]) && (
                    <img
                      src={getBannerImage(promoTopBanners[1])}
                      alt={promoTopBanners[1]?.title || 'Promo'}
                      className="absolute right-1 bottom-1 w-16 h-16 object-contain opacity-40 group-hover:opacity-60 transition pointer-events-none"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                  <div className="relative z-10">
                    <span
                      style={{ color: promoTopBanners[1]?.textColor ? `${promoTopBanners[1].textColor}ee` : undefined }}
                      className="text-[9px] font-extrabold uppercase tracking-wider text-rose-400"
                    >
                      {promoTopBanners[1]?.badgeText || 'Special Deals'}
                    </span>
                    <h4
                      style={{ color: promoTopBanners[1]?.textColor || undefined }}
                      className="text-xs font-bold text-white leading-tight line-clamp-2"
                    >
                      {promoTopBanners[1]?.title || 'Exclusive Offers'}
                    </h4>
                  </div>
                  <Link
                    to={promoTopBanners[1]?.link || '/products?deals=true'}
                    onClick={() => promoTopBanners[1]?._id && dispatch(trackBannerClick(promoTopBanners[1]._id))}
                    className="text-xs font-black text-amber-400 hover:underline relative z-10 inline-flex items-center gap-1"
                  >
                    {promoTopBanners[1]?.ctaText || 'Explore Deals →'}
                  </Link>
                </div>

                <div
                  style={{
                    backgroundColor: promoTopBanners[2]?.bgColor || undefined,
                    color: promoTopBanners[2]?.textColor || undefined,
                  }}
                  className="bg-gradient-to-br from-indigo-900 to-purple-900 text-white rounded-xl p-3 flex flex-col justify-between min-h-[120px] relative overflow-hidden shadow-2xs group"
                >
                  {getBannerImage(promoTopBanners[2]) && (
                    <img
                      src={getBannerImage(promoTopBanners[2])}
                      alt={promoTopBanners[2]?.title || 'Promo'}
                      className="absolute right-1 bottom-1 w-16 h-16 object-contain opacity-40 group-hover:opacity-60 transition pointer-events-none"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                  <div className="relative z-10">
                    <span
                      style={{ color: promoTopBanners[2]?.textColor ? `${promoTopBanners[2].textColor}ee` : undefined }}
                      className="text-[9px] font-extrabold uppercase tracking-wider text-cyan-300"
                    >
                      {promoTopBanners[2]?.badgeText || 'Verified'}
                    </span>
                    <h4
                      style={{ color: promoTopBanners[2]?.textColor || undefined }}
                      className="text-xs font-bold text-white leading-tight line-clamp-2"
                    >
                      {promoTopBanners[2]?.title || 'Fast Delivery'}
                    </h4>
                  </div>
                  <Link
                    to={promoTopBanners[2]?.link || '/products'}
                    onClick={() => promoTopBanners[2]?._id && dispatch(trackBannerClick(promoTopBanners[2]._id))}
                    className="text-[10px] font-bold text-cyan-300 hover:underline relative z-10 inline-flex items-center gap-1"
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
        {/* PROMOTIONAL MIDDLE STRIPS (CMS ADMIN CONNECTED)                           */}
        {/* ========================================================================= */}
        {promoMiddleBanners.length > 0 && (
          <section className="space-y-4">
            {promoMiddleBanners.length === 1 ? (
              (() => {
                const banner = promoMiddleBanners[0];
                const bannerImg = getBannerImage(banner);
                const showOverlay = banner.showTextOverlay === true;
                if (!showOverlay && bannerImg) {
                  return (
                    <Link
                      to={banner.link || '/products'}
                      onClick={() => banner._id && dispatch(trackBannerClick(banner._id))}
                      className="block w-full overflow-hidden rounded-2xl sm:rounded-3xl shadow-sm hover:opacity-95 transition group"
                    >
                      <img
                        src={bannerImg}
                        alt={banner.title}
                        className="w-full h-auto object-cover max-h-[360px] group-hover:scale-[1.01] transition-transform duration-500"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </Link>
                  );
                }
                return (
                  <div
                    style={{
                      backgroundColor: banner.bgColor || '#0f172a',
                      color: banner.textColor || '#ffffff',
                    }}
                    className="rounded-3xl p-6 sm:p-10 relative overflow-hidden shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 group"
                  >
                    <div className="max-w-xl space-y-3 relative z-10">
                      {banner.badgeText && (
                        <span className="inline-block text-[10px] sm:text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-white/20 text-current backdrop-blur-xs">
                          {banner.badgeText}
                        </span>
                      )}
                      <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight tracking-tight">
                        {banner.title}
                      </h3>
                      {banner.subtitle && (
                        <p className="text-sm sm:text-base font-medium opacity-90 leading-relaxed">
                          {banner.subtitle}
                        </p>
                      )}
                      {banner.description && (
                        <p className="text-xs sm:text-sm opacity-75 line-clamp-2 max-w-lg leading-relaxed">
                          {banner.description}
                        </p>
                      )}
                      <div className="pt-2">
                        <Link
                          to={banner.link || '/products'}
                          onClick={() => banner._id && dispatch(trackBannerClick(banner._id))}
                          className="inline-block bg-white text-slate-950 hover:bg-emerald-500 hover:text-white px-7 py-3 rounded-full font-bold text-xs sm:text-sm tracking-wide transition shadow-md"
                        >
                          {banner.ctaText || 'Shop Now'}
                        </Link>
                      </div>
                    </div>

                    {bannerImg && (
                      <div className="relative z-10 shrink-0 md:max-w-md flex justify-center items-center">
                        <img
                          src={bannerImg}
                          alt={banner.title}
                          className="max-h-52 sm:max-h-64 object-contain group-hover:scale-105 transition-transform duration-500 filter drop-shadow-xl"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className={`grid grid-cols-1 ${promoMiddleBanners.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
                {promoMiddleBanners.map((banner) => {
                  const bannerImg = getBannerImage(banner);
                  return (
                    <div
                      key={banner._id || banner.id}
                      style={{
                        backgroundColor: banner.bgColor || '#0f172a',
                        color: banner.textColor || '#ffffff',
                      }}
                      className="rounded-2xl p-5 sm:p-6 relative overflow-hidden shadow-2xs flex flex-col justify-between min-h-[220px] group"
                    >
                      <div className="space-y-2 relative z-10">
                        {banner.badgeText && (
                          <span className="inline-block text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-current backdrop-blur-xs">
                            {banner.badgeText}
                          </span>
                        )}
                        <h4 className="text-lg sm:text-xl font-black leading-snug">
                          {banner.title}
                        </h4>
                        {banner.subtitle && (
                          <p className="text-xs opacity-85 line-clamp-2">
                            {banner.subtitle}
                          </p>
                        )}
                      </div>

                      {bannerImg && (
                        <div className="my-3 flex justify-center relative z-10">
                          <img
                            src={bannerImg}
                            alt={banner.title}
                            className="max-h-28 object-contain group-hover:scale-105 transition-transform duration-300 filter drop-shadow-md"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        </div>
                      )}

                      <div className="pt-2 relative z-10">
                        <Link
                          to={banner.link || '/products'}
                          onClick={() => banner._id && dispatch(trackBannerClick(banner._id))}
                          className="inline-block bg-white text-slate-950 hover:bg-emerald-500 hover:text-white px-5 py-2 rounded-full font-bold text-xs transition shadow-2xs"
                        >
                          {banner.ctaText || 'Shop Now'}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

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
            <div
              style={{
                backgroundColor: flashSaleBanner?.bgColor || undefined,
                color: flashSaleBanner?.textColor || undefined,
              }}
              className="md:col-span-4 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-6 flex flex-col justify-between min-h-[340px] shadow-md relative overflow-hidden"
            >
              <div className="space-y-2 relative z-10">
                <span
                  style={{ color: flashSaleBanner?.textColor ? `${flashSaleBanner.textColor}ee` : undefined }}
                  className="text-xs font-black uppercase tracking-wider text-emerald-300 bg-black/40 px-2.5 py-0.5 rounded-full backdrop-blur-xs"
                >
                  {flashSaleBanner?.badgeText || 'SPECIAL OFFER'}
                </span>
                <h3
                  className="text-2xl font-black leading-tight"
                  style={{ color: flashSaleBanner?.textColor || undefined }}
                >
                  {flashSaleBanner?.title || 'EXCLUSIVE DEALS & VERIFIED PRODUCTS'}
                </h3>
                <p
                  className="text-xs text-emerald-100/80 font-medium leading-relaxed"
                  style={{ color: flashSaleBanner?.textColor ? `${flashSaleBanner.textColor}cc` : undefined }}
                >
                  {flashSaleBanner?.subtitle || '100% Guaranteed authentic quality with doorstep express delivery.'}
                </p>
              </div>

              <div className="my-auto flex justify-center py-4 relative z-10">
                {getBannerImage(flashSaleBanner) ? (
                  <img
                    src={getBannerImage(flashSaleBanner)}
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
                onClick={() => flashSaleBanner?._id && dispatch(trackBannerClick(flashSaleBanner._id))}
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
        {/* FOOTER PROMO BANNER STRIP (CMS ADMIN CONNECTED)                           */}
        {/* ========================================================================= */}
        {footerBanners.length > 0 && (
          <section className="space-y-4">
            {footerBanners.map((banner) => {
              const bannerImg = getBannerImage(banner);
              const showOverlay = banner.showTextOverlay === true;
              if (!showOverlay && bannerImg) {
                return (
                  <Link
                    key={banner._id || banner.id}
                    to={banner.link || '/products'}
                    onClick={() => banner._id && dispatch(trackBannerClick(banner._id))}
                    className="block w-full overflow-hidden rounded-2xl sm:rounded-3xl shadow-sm hover:opacity-95 transition group"
                  >
                    <img
                      src={bannerImg}
                      alt={banner.title}
                      className="w-full h-auto object-cover max-h-[360px] group-hover:scale-[1.01] transition-transform duration-500"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </Link>
                );
              }
              return (
                <div
                  key={banner._id || banner.id}
                  style={{
                    backgroundColor: banner.bgColor || '#124B38',
                    color: banner.textColor || '#ffffff',
                  }}
                  className="rounded-3xl p-6 sm:p-10 relative overflow-hidden shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 group"
                >
                  {/* Left Content */}
                  <div className="max-w-xl space-y-3 relative z-10">
                    {banner.badgeText && (
                      <span className="inline-block text-[10px] sm:text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-white/20 text-current backdrop-blur-xs">
                        {banner.badgeText}
                      </span>
                    )}
                    <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight tracking-tight">
                      {banner.title}
                    </h3>
                    {banner.subtitle && (
                      <p className="text-sm sm:text-base font-medium opacity-90 leading-relaxed">
                        {banner.subtitle}
                      </p>
                    )}
                    {banner.description && (
                      <p className="text-xs sm:text-sm opacity-75 line-clamp-2 max-w-lg leading-relaxed">
                        {banner.description}
                      </p>
                    )}
                    <div className="pt-2">
                      <Link
                        to={banner.link || '/products'}
                        onClick={() => banner._id && dispatch(trackBannerClick(banner._id))}
                        className="inline-block bg-white text-slate-950 hover:bg-emerald-500 hover:text-white px-7 py-3 rounded-full font-bold text-xs sm:text-sm tracking-wide transition shadow-md"
                      >
                        {banner.ctaText || 'Shop Now'}
                      </Link>
                    </div>
                  </div>

                  {/* Right Image */}
                  {bannerImg && (
                    <div className="relative z-10 shrink-0 md:max-w-md flex justify-center items-center">
                      <img
                        src={bannerImg}
                        alt={banner.title}
                        className="max-h-48 sm:max-h-60 object-contain group-hover:scale-105 transition-transform duration-500 filter drop-shadow-xl"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

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