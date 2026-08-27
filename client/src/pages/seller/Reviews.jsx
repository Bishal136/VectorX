import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchSellerReviews,
  replyToReview,
  deleteReviewReply,
  clearSellerError
} from '../../features/seller/sellerSlice';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import {
  Star,
  Search,
  MessageSquare,
  MessageCircle,
  ShieldCheck,
  ThumbsUp,
  Trash2,
  Edit2,
  X,
  Play,
  Eye,
  Camera,
  Video,
  Filter,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShoppingBag
} from 'lucide-react';

const RATING_FILTER_OPTIONS = [
  { label: 'All Ratings', value: 'all' },
  { label: '5 Stars ★★★★★', value: '5' },
  { label: '4 Stars ★★★★☆', value: '4' },
  { label: '3 Stars ★★★☆☆', value: '3' },
  { label: '2 Stars ★★☆☆☆', value: '2' },
  { label: '1 Star ★☆☆☆☆', value: '1' }
];

const REPLY_FILTER_OPTIONS = [
  { label: 'All Reviews', value: 'all' },
  { label: '⚠️ Needs Reply (Unreplied)', value: 'false' },
  { label: '✅ Replied by Seller', value: 'true' }
];

const SORT_OPTIONS = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Oldest First', value: 'oldest' },
  { label: 'Highest Rated', value: 'highest' },
  { label: 'Lowest Rated', value: 'lowest' },
  { label: 'Unreplied First', value: 'unreplied' }
];

const SellerReviews = () => {
  const dispatch = useDispatch();
  const {
    reviews = [],
    reviewStats,
    sellerProductList = [],
    reviewPagination = { page: 1, limit: 20, total: 0, totalPages: 1 },
    status,
    actionLoading,
    error
  } = useSelector((state) => state.seller);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [replyFilter, setReplyFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);

  // Reply Draft State: { [reviewId]: string }
  const [replyTexts, setReplyTexts] = useState({});
  const [activeReplyBox, setActiveReplyBox] = useState(null); // reviewId

  // Media Modals
  const [activePhotoModal, setActivePhotoModal] = useState(null); // { url, title }
  const [activeVideoModal, setActiveVideoModal] = useState(null); // { url, title }

  // Load reviews on filter change
  useEffect(() => {
    dispatch(
      fetchSellerReviews({
        search: searchTerm,
        rating: ratingFilter,
        hasReply: replyFilter,
        productId: productFilter,
        sort: sortBy,
        page: currentPage,
        limit: 20
      })
    );
  }, [dispatch, searchTerm, ratingFilter, replyFilter, productFilter, sortBy, currentPage]);

  useEffect(() => {
    if (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to load reviews');
      dispatch(clearSellerError());
    }
  }, [error, dispatch]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    dispatch(
      fetchSellerReviews({
        search: searchTerm,
        rating: ratingFilter,
        hasReply: replyFilter,
        productId: productFilter,
        sort: sortBy,
        page: 1,
        limit: 20
      })
    );
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setRatingFilter('all');
    setReplyFilter('all');
    setProductFilter('all');
    setSortBy('newest');
    setCurrentPage(1);
  };

  const handleOpenReplyBox = (review) => {
    setActiveReplyBox(review._id);
    setReplyTexts((prev) => ({
      ...prev,
      [review._id]: review.reply?.comment || ''
    }));
  };

  const handleCloseReplyBox = (reviewId) => {
    setActiveReplyBox(null);
  };

  const handleSendReply = async (review) => {
    const comment = (replyTexts[review._id] || '').trim();
    if (!comment) {
      toast.warning('Please write a reply before submitting.');
      return;
    }

    try {
      await dispatch(
        replyToReview({
          productId: review.productId,
          reviewId: review._id,
          comment
        })
      ).unwrap();

      toast.success('Official reply posted successfully!');
      setActiveReplyBox(null);
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to post reply.');
    }
  };

  const handleDeleteReply = async (review) => {
    if (!window.confirm('Are you sure you want to delete your official reply to this review?')) {
      return;
    }

    try {
      await dispatch(
        deleteReviewReply({
          productId: review.productId,
          reviewId: review._id
        })
      ).unwrap();

      toast.success('Reply removed.');
      setReplyTexts((prev) => ({ ...prev, [review._id]: '' }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to delete reply.');
    }
  };

  // Safe Stats
  const stats = reviewStats || {
    totalReviews: 0,
    averageRating: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    repliedCount: 0,
    unrepliedCount: 0,
    responseRate: 0
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Customer Reviews & Ratings</span>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
              {stats.totalReviews} Total
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitor buyer feedback, customer photo & video uploads, and respond directly to shoppers.
          </p>
        </div>

        {/* Quick action badges */}
        <div className="flex items-center gap-2">
          {stats.unrepliedCount > 0 && (
            <button
              onClick={() => {
                setReplyFilter('false');
                setCurrentPage(1);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{stats.unrepliedCount} Unanswered Reviews</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Rating Score Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Average Store Rating
          </span>
          <div className="flex items-baseline gap-3 my-2">
            <span className="text-4xl font-black text-slate-900">
              {Number(stats.averageRating || 0).toFixed(1)}
            </span>
            <span className="text-sm font-bold text-slate-400">/ 5.0</span>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= Math.round(stats.averageRating || 0)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-200'
                }`}
              />
            ))}
            <span className="text-xs text-slate-500 ml-1.5 font-medium">
              ({stats.totalReviews} reviews)
            </span>
          </div>
        </div>

        {/* Response Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Seller Response Rate
          </span>
          <div className="flex items-baseline gap-2 my-2">
            <span className="text-4xl font-black text-emerald-700">
              {stats.responseRate}%
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {stats.repliedCount} of {stats.totalReviews} customer reviews answered
          </p>
        </div>

        {/* Unreplied Reviews */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Pending Replies
          </span>
          <div className="flex items-baseline gap-2 my-2">
            <span className={`text-4xl font-black ${stats.unrepliedCount > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
              {stats.unrepliedCount}
            </span>
            <span className="text-xs font-bold text-slate-400">reviews</span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Shoppers appreciate quick responses from verified sellers.
          </p>
        </div>

        {/* Rating Breakdown Bars */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1.5 justify-center flex flex-col">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.ratingDistribution?.[star] || 0;
            const pct = stats.totalReviews > 0 ? Math.round((count / stats.totalReviews) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-[11px]">
                <span className="w-5 font-bold text-slate-600">{star}★</span>
                <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-amber-400 h-full rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-6 text-right text-slate-400 font-medium">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative sm:col-span-2 lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by buyer, review text, or product..."
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
            />
          </form>

          {/* Rating Filter */}
          <select
            value={ratingFilter}
            onChange={(e) => {
              setRatingFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium text-slate-700"
          >
            {RATING_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Reply Status Filter */}
          <select
            value={replyFilter}
            onChange={(e) => {
              setReplyFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium text-slate-700"
          >
            {REPLY_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Sort Order */}
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium text-slate-700"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Product Filter dropdown & Reset */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 flex-wrap">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Filter by Product:</span>
            <select
              value={productFilter}
              onChange={(e) => {
                setProductFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-700 max-w-xs truncate"
            >
              <option value="all">All Products ({sellerProductList.length})</option>
              {sellerProductList.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 font-semibold transition cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Reset Filters
          </button>
        </div>
      </div>

      {/* Reviews List */}
      {status === 'loading' && reviews.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading customer reviews...</span>
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs space-y-2 bg-white rounded-2xl border border-slate-200">
          <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700 text-sm">No reviews matching current filters</h3>
          <p className="text-slate-400">
            {searchTerm || ratingFilter !== 'all' || replyFilter !== 'all' || productFilter !== 'all'
              ? 'Try changing your search or filter settings.'
              : 'As customers purchase your products, their verified reviews with photos & video will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const hasImages = Array.isArray(review.images) && review.images.length > 0;
            const hasVideo = Boolean(review.video?.url);
            const isReplying = activeReplyBox === review._id;

            return (
              <div
                key={review._id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-2xs hover:border-slate-300 transition"
              >
                {/* Review Header: Product & Buyer Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  {/* Product Mini Banner */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center p-1">
                      {review.productImage ? (
                        <img
                          src={review.productImage}
                          alt={review.productName}
                          className="w-full h-full object-contain mix-blend-multiply"
                        />
                      ) : (
                        <ShoppingBag className="w-6 h-6 text-slate-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <Link
                        to={`/products/${review.productSlug || review.productId}`}
                        target="_blank"
                        className="font-bold text-xs sm:text-sm text-slate-900 hover:text-emerald-700 transition flex items-center gap-1 truncate"
                      >
                        <span>{review.productName}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 text-slate-400" />
                      </Link>
                      <span className="text-[11px] text-slate-500 font-semibold">
                        ৳{Number(review.productPrice || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Rating & Timestamp */}
                  <div className="flex items-center gap-3 sm:text-right shrink-0">
                    <div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= review.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {review.createdAt
                          ? new Date(review.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : 'Recent'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Buyer Info & Review Content */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                      {(review.user?.name || 'B')[0].toUpperCase()}
                    </div>
                    <span className="font-bold text-xs text-slate-800">
                      {review.user?.name || 'Verified Buyer'}
                    </span>
                    {review.isVerifiedPurchase && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified Order
                      </span>
                    )}
                  </div>

                  {review.title && (
                    <h4 className="font-bold text-sm text-slate-900">{review.title}</h4>
                  )}
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                    {review.comment}
                  </p>
                </div>

                {/* Customer Uploaded Media */}
                {(hasImages || hasVideo) && (
                  <div className="pt-2 pb-1 space-y-2 border-t border-slate-50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Buyer Photos & Video:
                    </span>
                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Photos */}
                      {hasImages &&
                        review.images.map((img, iIdx) => {
                          const imgUrl = typeof img === 'string' ? img : img?.url;
                          if (!imgUrl) return null;
                          return (
                            <button
                              key={iIdx}
                              type="button"
                              onClick={() =>
                                setActivePhotoModal({
                                  url: imgUrl,
                                  title: `Photo by ${review.user?.name || 'Customer'}`
                                })
                              }
                              className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden group cursor-pointer bg-slate-50 shrink-0 hover:border-emerald-600 transition"
                            >
                              <img
                                src={imgUrl}
                                alt="Customer review media"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
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
                            setActiveVideoModal({
                              url: review.video.url,
                              title: `Video by ${review.user?.name || 'Customer'}`
                            })
                          }
                          className="relative w-28 h-16 rounded-xl border-2 border-purple-300 bg-purple-950 flex flex-col items-center justify-center text-white group hover:border-purple-500 transition cursor-pointer shrink-0 shadow-2xs overflow-hidden"
                        >
                          {review.video.thumbnail ? (
                            <img
                              src={review.video.thumbnail}
                              alt="Customer video preview"
                              className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
                            />
                          ) : (
                            <div className="w-full h-full bg-linear-to-br from-purple-900 to-slate-900" />
                          )}
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                            <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white shadow-md">
                              <Play className="w-3 h-3 fill-white ml-0.5" />
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-black/60 px-1 py-0.2 rounded-sm">
                              Watch Video
                            </span>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Seller Reply Box / Existing Reply */}
                {review.reply && review.reply.comment && !isReplying ? (
                  <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Your Official Response</span>
                        <span className="text-[10px] text-emerald-600 font-normal">
                          • {review.reply.createdAt ? new Date(review.reply.createdAt).toLocaleDateString() : 'Replied'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenReplyBox(review)}
                          className="p-1 rounded-md hover:bg-emerald-200 text-emerald-800 transition cursor-pointer text-[11px] flex items-center gap-1 font-semibold"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteReply(review)}
                          className="p-1 rounded-md hover:bg-red-100 text-red-600 transition cursor-pointer text-[11px] flex items-center gap-1 font-semibold"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      </div>
                    </div>
                    <p className="text-slate-700 leading-relaxed pl-5">
                      {review.reply.comment}
                    </p>
                  </div>
                ) : isReplying ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 space-y-3 text-xs animate-in fade-in duration-100">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-emerald-950 flex items-center gap-1.5">
                        <MessageCircle className="w-4 h-4 text-emerald-700" />
                        {review.reply?.comment ? 'Edit Response to Customer' : 'Write Official Response to Customer'}
                      </h5>
                      <button
                        type="button"
                        onClick={() => handleCloseReplyBox(review._id)}
                        className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <textarea
                      rows={3}
                      value={replyTexts[review._id] ?? review.reply?.comment ?? ''}
                      onChange={(e) =>
                        setReplyTexts({ ...replyTexts, [review._id]: e.target.value })
                      }
                      placeholder="Thank the customer for their review or address their concern with courteous assistance..."
                      className="w-full p-3 rounded-xl border border-emerald-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCloseReplyBox(review._id)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        loading={actionLoading}
                        onClick={() => handleSendReply(review)}
                      >
                        Post Official Response
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenReplyBox(review)}
                      className="gap-1 text-xs"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Reply to Customer</span>
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Pagination */}
          {reviewPagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 bg-white p-4 rounded-2xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">
                Page {reviewPagination.page} of {reviewPagination.totalPages} ({reviewPagination.total} reviews)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={reviewPagination.page <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="gap-1 text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={reviewPagination.page >= reviewPagination.totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="gap-1 text-xs"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Customer Photo Lightbox Modal */}
      {activePhotoModal && (
        <Modal
          open={Boolean(activePhotoModal)}
          onClose={() => setActivePhotoModal(null)}
          size="2xl"
          title={activePhotoModal.title || 'Customer Review Attachment'}
        >
          <div className="p-2 flex items-center justify-center bg-black/90 rounded-2xl overflow-hidden min-h-[350px]">
            <img
              src={activePhotoModal.url}
              alt="Review Attachment"
              className="max-h-[70vh] w-auto object-contain"
            />
          </div>
        </Modal>
      )}

      {/* Customer Video Player Modal */}
      {activeVideoModal && (
        <Modal
          open={Boolean(activeVideoModal)}
          onClose={() => setActiveVideoModal(null)}
          size="3xl"
          title={activeVideoModal.title || 'Customer Video Review'}
        >
          <div className="p-2 flex items-center justify-center bg-black rounded-2xl overflow-hidden aspect-video w-full">
            <video
              src={activeVideoModal.url}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SellerReviews;
