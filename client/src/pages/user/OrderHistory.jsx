import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchUserOrders,
  cancelOrder,
  requestOrderReturn,
  fetchOrderById,
} from '../../features/order/orderSlice';
import { addToCart } from '../../features/cart/cartSlice';
import { toast } from 'react-toastify';
import {
  Package,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Search,
  SlidersHorizontal,
  RefreshCw,
  ShoppingBag,
  Eye,
  MapPin,
  CreditCard,
  X,
  FileText,
  Store,
  Calendar,
  ArrowRight,
  Printer,
  RotateCcw,
  HelpCircle,
} from 'lucide-react';

const DEFAULT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=80';

const getProductImage = (item) => {
  if (!item) return DEFAULT_FALLBACK_IMAGE;
  if (item.productSnapshot?.images?.[0]?.url) return item.productSnapshot.images[0].url;
  if (item.productId?.primaryImage?.url) return item.productId.primaryImage.url;
  if (typeof item.productId?.primaryImage === 'string') return item.productId.primaryImage;
  if (item.productId?.images?.[0]?.url) return item.productId.images[0].url;
  if (typeof item.productId?.images?.[0] === 'string') return item.productId.images[0];
  if (item.image) return item.image;
  return DEFAULT_FALLBACK_IMAGE;
};

const STATUS_TABS = [
  { label: 'All Orders', value: 'all' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Processing', value: 'Processing' },
  { label: 'Shipped', value: 'Shipped' },
  { label: 'Delivered', value: 'Delivered' },
  { label: 'Returns & Refunds', value: 'Return_Requested' },
  { label: 'Cancelled', value: 'Cancelled' },
];

const CANCELLATION_REASONS = [
  'Changed my mind',
  'Found a better price elsewhere',
  'Ordered by mistake / duplicate order',
  'Delivery time is too long',
  'Need to change shipping address',
  'Other reasons',
];

const RETURN_REASONS = [
  'Defective / Not working properly',
  'Damaged product / Broken during delivery',
  'Wrong item or size received',
  'Item does not match description / images',
  'Quality not satisfactory / Missing parts',
  'Other reasons',
];

const OrderHistory = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { orders = [], pagination = {}, status, error } = useSelector((state) => state.order || {});

  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState(CANCELLATION_REASONS[0]);
  const [cancelCustomNotes, setCancelCustomNotes] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Return request modal state
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [orderToReturn, setOrderToReturn] = useState(null);
  const [returnReason, setReturnReason] = useState(RETURN_REASONS[0]);
  const [returnCustomNotes, setReturnCustomNotes] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  const [reorderingId, setReorderingId] = useState(null);
  const [payingOrderId, setPayingOrderId] = useState(null);

  const handlePayPortPos = async (order) => {
    setPayingOrderId(order._id);
    try {
      toast.info('Connecting to PortPos (পোর্টপস)...');
      const res = await axiosInstance.post('/payments/initiate', { orderId: order._id });
      if (res.data?.success && res.data?.data?.paymentUrl) {
        window.location.href = res.data.data.paymentUrl;
      } else {
        toast.error(res.data?.message || 'Could not initiate payment');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Payment initiation failed');
    } finally {
      setPayingOrderId(null);
    }
  };

  // Fetch orders when page or tab changes
  useEffect(() => {
    dispatch(
      fetchUserOrders({
        status: activeTab === 'all' ? undefined : activeTab,
        page: currentPage,
        limit: 10,
      })
    );
  }, [dispatch, activeTab, currentPage]);

  // KPI Statistics Calculation
  const stats = useMemo(() => {
    const list = Array.isArray(orders) ? orders : [];
    const total = pagination?.totalResults || list.length;
    const inProgress = list.filter((o) => ['Pending', 'Processing', 'Shipped'].includes(o.status)).length;
    const delivered = list.filter((o) => o.status === 'Delivered').length;
    const cancelled = list.filter((o) => o.status === 'Cancelled' || o.status === 'Refunded').length;

    return { total, inProgress, delivered, cancelled };
  }, [orders, pagination]);

  // Client-side filtering & sorting
  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    let result = [...orders];

    // Search filter (Order ID, Product Name, Shop Name)
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((o) => {
        const orderId = (o._id || '').toLowerCase();
        const shortId = (o._id || '').slice(-8).toLowerCase();
        const shopName = (o.sellerId?.shopName || '').toLowerCase();
        const itemNames = (o.items || []).map((i) => (i.name || '').toLowerCase()).join(' ');
        return orderId.includes(q) || shortId.includes(q) || shopName.includes(q) || itemNames.includes(q);
      });
    }

    // Sorting
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortBy === 'highest_amount') {
      result.sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0));
    } else if (sortBy === 'lowest_amount') {
      result.sort((a, b) => (a.totalAmount || 0) - (b.totalAmount || 0));
    }

    return result;
  }, [orders, searchTerm, sortBy]);

  // Handle Cancel Order Confirmation
  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    setCancelling(true);
    try {
      const fullReason = cancelReason === 'Other reasons' && cancelCustomNotes.trim()
        ? `Other: ${cancelCustomNotes.trim()}`
        : cancelReason;

      await dispatch(
        cancelOrder({
          orderId: orderToCancel._id || orderToCancel.id,
          cancellationReason: fullReason,
        })
      ).unwrap();

      toast.success('Order cancelled successfully.');
      setCancelModalOpen(false);
      setOrderToCancel(null);
      setCancelCustomNotes('');

      // Refresh list
      dispatch(
        fetchUserOrders({
          status: activeTab === 'all' ? undefined : activeTab,
          page: currentPage,
          limit: 10,
        })
      );
    } catch (err) {
      toast.error(typeof err === 'string' ? err : err?.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  // Handle Reorder / Buy Again
  const handleReorder = async (order) => {
    if (!order || !Array.isArray(order.items) || order.items.length === 0) return;
    setReorderingId(order._id);
    try {
      for (const item of order.items) {
        const productId = item.productId?._id || item.productId?.id || item.productId;
        if (productId) {
          await dispatch(
            addToCart({
              productId,
              quantity: item.quantity || 1,
            })
          ).unwrap();
        }
      }
      toast.success('Items added to cart!');
      navigate('/cart');
    } catch (err) {
      toast.error('Could not add some items to cart.');
    } finally {
      setReorderingId(null);
    }
  };

  // Handle Return Request Submission
  const handleConfirmReturn = async () => {
    if (!orderToReturn) return;
    setSubmittingReturn(true);
    try {
      const fullReason = returnReason === 'Other reasons' && returnCustomNotes.trim()
        ? `Other: ${returnCustomNotes.trim()}`
        : returnReason;

      await dispatch(
        requestOrderReturn({
          orderId: orderToReturn._id || orderToReturn.id,
          reason: fullReason,
          customerNotes: returnCustomNotes.trim(),
        })
      ).unwrap();

      toast.success('Return request submitted! The seller has been notified for approval.');
      setReturnModalOpen(false);
      setOrderToReturn(null);
      setReturnCustomNotes('');

      // Refresh orders
      dispatch(
        fetchUserOrders({
          status: activeTab === 'all' ? undefined : activeTab,
          page: currentPage,
          limit: 10,
        })
      );
    } catch (err) {
      toast.error(typeof err === 'string' ? err : err?.message || 'Failed to submit return request');
    } finally {
      setSubmittingReturn(false);
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (statusStr) => {
    switch (statusStr) {
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> Pending Confirmation
          </span>
        );
      case 'Processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing
          </span>
        );
      case 'Shipped':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Truck className="w-3.5 h-3.5" /> On The Way
          </span>
        );
      case 'Delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
          </span>
        );
      case 'Return_Requested':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
            <RotateCcw className="w-3.5 h-3.5 text-amber-700 animate-spin" /> Return Requested (Pending Approval)
          </span>
        );
      case 'Return_Approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Return Approved
          </span>
        );
      case 'Return_Rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Return Declined
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
      case 'Refunded':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <RotateCcw className="w-3.5 h-3.5 text-emerald-600" /> Refunded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {statusStr}
          </span>
        );
    }
  };

  // Timeline Step Status
  const getTimelineSteps = (orderStatus) => {
    const steps = [
      { key: 'placed', label: 'Order Placed', icon: FileText },
      { key: 'processing', label: 'Processing', icon: RefreshCw },
      { key: 'shipped', label: 'Shipped', icon: Truck },
      { key: 'delivered', label: 'Delivered', icon: CheckCircle2 },
    ];

    let activeIndex = 0;
    if (orderStatus === 'Pending') activeIndex = 0;
    else if (orderStatus === 'Processing') activeIndex = 1;
    else if (orderStatus === 'Shipped') activeIndex = 2;
    else if (orderStatus === 'Delivered') activeIndex = 3;
    else if (orderStatus === 'Cancelled' || orderStatus === 'Refunded') activeIndex = -1;

    return { steps, activeIndex };
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ========================================================================= */}
        {/* BREADCRUMB & HEADER                                                       */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <Link to="/" className="hover:text-emerald-700 transition">
                Home
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <Link to="/profile" className="hover:text-emerald-700 transition">
                My Account
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-900 font-semibold">Order History</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              My Orders & History
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Track active shipments, view past receipts, and manage your order deliveries.
            </p>
          </div>

          <Link
            to="/products"
            className="inline-flex items-center gap-2 bg-[#1B8057] hover:bg-[#156947] text-white px-5 py-2.5 rounded-full text-xs font-bold transition shadow-sm self-start sm:self-auto cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            Continue Shopping
          </Link>
        </div>

        {/* ========================================================================= */}
        {/* KPI METRIC CARDS                                                          */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Orders
              </p>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">{stats.total}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                In Progress
              </p>
              <h3 className="text-lg sm:text-xl font-black text-blue-600">{stats.inProgress}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Delivered
              </p>
              <h3 className="text-lg sm:text-xl font-black text-emerald-600">{stats.delivered}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Cancelled
              </p>
              <h3 className="text-lg sm:text-xl font-black text-rose-600">{stats.cancelled}</h3>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TABS, SEARCH & FILTER CONTROLS                                            */}
        {/* ========================================================================= */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-100">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setActiveTab(tab.value);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  activeTab === tab.value
                    ? 'bg-[#1B8057] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Order ID, product or shop name..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 focus:bg-white transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-600 cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest_amount">Highest Amount</option>
                <option value="lowest_amount">Lowest Amount</option>
              </select>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ORDERS LIST CONTAINER                                                     */}
        {/* ========================================================================= */}
        {status === 'loading' ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Loading your orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-4 shadow-2xs">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
              <Package className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">No orders found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchTerm || activeTab !== 'all'
                  ? 'No orders match your current filters. Try changing your search or filter tab.'
                  : "You haven't placed any orders yet. Discover our catalog and grab the best deals today!"}
              </p>
            </div>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 bg-[#1B8057] hover:bg-[#156947] text-white px-6 py-2.5 rounded-full text-xs font-bold transition shadow-sm cursor-pointer"
            >
              Explore Products <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const orderId = order._id || order.id;
              const shortId = (orderId || '').slice(-8).toUpperCase();
              const createdDate = order.createdAt
                ? new Date(order.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'N/A';

              const { steps, activeIndex } = getTimelineSteps(order.status);
              const isCancellable = ['Pending', 'Processing'].includes(order.status);
              const isReordering = reorderingId === orderId;

              return (
                <div
                  key={orderId}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  {/* Card Top Strip */}
                  <div className="bg-slate-50/80 px-4 sm:px-6 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 sm:gap-6 flex-wrap text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Order Number
                        </span>
                        <span className="font-mono font-bold text-slate-900">#ORD-{shortId}</span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Placed On
                        </span>
                        <span className="font-medium text-slate-700 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {createdDate}
                        </span>
                      </div>

                      {order.sellerId?.shopName && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Seller
                          </span>
                          <span className="font-semibold text-slate-800 flex items-center gap-1">
                            <Store className="w-3.5 h-3.5 text-emerald-600" />
                            {order.sellerId.shopName}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">{renderStatusBadge(order.status)}</div>
                  </div>

                  {/* Card Body - Products List */}
                  <div className="p-4 sm:p-6 space-y-4">
                    <div className="divide-y divide-slate-100">
                      {(order.items || []).map((item, idx) => {
                        const itemImg = getProductImage(item);
                        const pId = item.productId?._id || item.productId?.id || item.productId;
                        const pSlug = item.productId?.slug;

                        return (
                          <div
                            key={item._id || idx}
                            className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center p-1">
                                <img
                                  src={itemImg}
                                  alt={item.name}
                                  className="w-full h-full object-contain mix-blend-multiply"
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = DEFAULT_FALLBACK_IMAGE;
                                  }}
                                />
                              </div>

                              <div className="min-w-0 space-y-0.5">
                                <Link
                                  to={`/products/${pSlug || pId}`}
                                  className="font-bold text-xs sm:text-sm text-slate-900 hover:text-emerald-700 transition truncate block"
                                >
                                  {item.name}
                                </Link>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <span>Qty: {item.quantity}</span>
                                  <span>•</span>
                                  <span>৳{item.price} each</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                              <span className="text-xs sm:text-sm font-black text-slate-900 block">
                                ৳{(item.price || 0) * (item.quantity || 1)}
                              </span>
                              {order.status === 'Delivered' && (
                                <Link
                                  to={`/products/${pSlug || pId}`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-bold transition shadow-2xs"
                                >
                                  <span>⭐ Review Product</span>
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Return Request Notification Box (If return requested) */}
                    {order.returnRequest?.isRequested && (
                      <div className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                        order.returnRequest.status === 'approved' || order.status === 'Return_Approved'
                          ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                          : order.returnRequest.status === 'rejected' || order.status === 'Return_Rejected'
                          ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                          : order.status === 'Refunded' || order.returnRequest.status === 'refunded'
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                          : 'bg-amber-50/70 border-amber-200 text-amber-900'
                      }`}>
                        <div className="flex items-center justify-between font-bold">
                          <span className="flex items-center gap-1.5">
                            <RotateCcw className="w-4 h-4" />
                            Return & Refund Details:
                          </span>
                          <span className="uppercase text-[10px] tracking-wider px-2 py-0.5 rounded-md font-extrabold bg-white/80 border border-current">
                            {order.returnRequest.status || 'Pending'}
                          </span>
                        </div>
                        <p className="text-slate-700">
                          <strong>Reason:</strong> {order.returnRequest.reason}
                        </p>
                        {order.returnRequest.customerNotes && (
                          <p className="text-slate-600">
                            <strong>Your note:</strong> {order.returnRequest.customerNotes}
                          </p>
                        )}
                        {order.returnRequest.sellerResponse?.comment && (
                          <div className="mt-1 pt-1.5 border-t border-slate-200/60 text-slate-800">
                            <strong>Seller response:</strong> {order.returnRequest.sellerResponse.comment}
                          </div>
                        )}
                        {order.refundAmount > 0 && order.status === 'Refunded' && (
                          <p className="text-emerald-700 font-bold">
                            Refund amount: ৳{order.refundAmount} (Completed)
                          </p>
                        )}
                      </div>
                    )}

                    {/* Order Progress Stepper (Only for active standard stages) */}
                    {activeIndex >= 0 && (
                      <div className="pt-3 pb-1 border-t border-slate-100">
                        <div className="grid grid-cols-4 gap-2 relative">
                          {steps.map((step, sIdx) => {
                            const isDone = sIdx <= activeIndex;
                            const isCurrent = sIdx === activeIndex;
                            const StepIcon = step.icon;

                            return (
                              <div key={step.key} className="flex flex-col items-center text-center space-y-1.5">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                    isDone
                                      ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-200'
                                      : 'bg-slate-100 text-slate-400'
                                  }`}
                                >
                                  <StepIcon className="w-4 h-4" />
                                </div>
                                <span
                                  className={`text-[10px] font-bold leading-tight ${
                                    isCurrent ? 'text-emerald-700' : isDone ? 'text-slate-800' : 'text-slate-400'
                                  }`}
                                >
                                  {step.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Bottom Order Info & Action Buttons */}
                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                          <span>Method:</span>
                          <strong className="text-slate-800 uppercase font-bold">
                            {order.paymentMethod === 'PORTPOS' ? 'PortPos (পোর্টপস)' : 'Cash on Delivery (COD)'}
                          </strong>
                          {order.paymentStatus === 'paid' ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">PAID</span>
                          ) : (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">{order.paymentStatus || 'PENDING'}</span>
                          )}
                        </span>
                        <span>•</span>
                        <span>
                          Total Amount: <strong className="text-sm font-black text-slate-900">৳{order.totalAmount}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {order.paymentMethod === 'PORTPOS' && order.paymentStatus !== 'paid' && order.status !== 'Cancelled' && order.status !== 'Refunded' && (
                          <button
                            type="button"
                            disabled={payingOrderId === order._id}
                            onClick={() => handlePayPortPos(order)}
                            className="px-3.5 py-1.5 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 disabled:bg-gray-400"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            {payingOrderId === order._id ? 'Connecting…' : 'Pay Now (PortPos)'}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrder(order);
                            setDetailsModalOpen(true);
                          }}
                          className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Details
                        </button>

                        <button
                          type="button"
                          disabled={isReordering}
                          onClick={() => handleReorder(order)}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-emerald-200"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isReordering ? 'animate-spin' : ''}`} />
                          Buy Again
                        </button>

                        {/* Return Request Button (For Delivered Orders Without Active Return) */}
                        {order.status === 'Delivered' && (!order.returnRequest || !order.returnRequest.isRequested || order.returnRequest.status === 'none') && (
                          <button
                            type="button"
                            onClick={() => {
                              setOrderToReturn(order);
                              setReturnReason(RETURN_REASONS[0]);
                              setReturnCustomNotes('');
                              setReturnModalOpen(true);
                            }}
                            className="px-3.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Request Return
                          </button>
                        )}

                        {isCancellable && (
                          <button
                            type="button"
                            onClick={() => {
                              setOrderToCancel(order);
                              setCancelModalOpen(true);
                            }}
                            className="px-3.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" /> Cancel Order
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGINATION CONTROLS                                                       */}
        {/* ========================================================================= */}
        {pagination?.totalPages > 1 && (
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-xs text-slate-500">
              Showing page <strong>{pagination.page || 1}</strong> of <strong>{pagination.totalPages}</strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold disabled:opacity-40 hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button
                type="button"
                disabled={currentPage >= pagination.totalPages}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold disabled:opacity-40 hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ORDER DETAILS MODAL / DRAWER                                              */}
      {/* ========================================================================= */}
      {detailsModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col justify-between">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700">
                  Order Breakdown
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Order #ORD-{(selectedOrder._id || '').slice(-8).toUpperCase()}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 text-xs">
              {/* Order Status Strip */}
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl flex-wrap gap-2">
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Current Status</span>
                  <div className="mt-1">{renderStatusBadge(selectedOrder.status)}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Payment Method</span>
                  <span className="font-bold text-slate-800 uppercase block">
                    {selectedOrder.paymentMethod === 'PORTPOS' ? 'PortPos (পোর্টপস)' : 'Cash on Delivery (COD)'}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-block mt-0.5 ${
                    selectedOrder.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {(selectedOrder.paymentStatus || 'PENDING').toUpperCase()}
                  </span>
                </div>
                {selectedOrder.paymentMethod === 'PORTPOS' && selectedOrder.paymentStatus !== 'paid' && selectedOrder.status !== 'Cancelled' && (
                  <div>
                    <button
                      type="button"
                      disabled={payingOrderId === selectedOrder._id}
                      onClick={() => handlePayPortPos(selectedOrder)}
                      className="px-3 py-1.5 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 disabled:bg-gray-400"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      {payingOrderId === selectedOrder._id ? 'Connecting…' : 'Pay Now with PortPos'}
                    </button>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Ordered Items</h4>
                <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 p-2">
                  {(selectedOrder.items || []).map((item, i) => (
                    <div key={i} className="p-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={getProductImage(item)}
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-contain bg-slate-50 p-1 border border-slate-100"
                        />
                        <div>
                          <p className="font-bold text-slate-800 text-xs">{item.name}</p>
                          <p className="text-slate-500 text-[11px]">
                            Qty: {item.quantity} × ৳{item.price}
                          </p>
                        </div>
                      </div>
                      <span className="font-black text-slate-900 text-xs">
                        ৳{(item.price || 0) * (item.quantity || 1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address */}
              {selectedOrder.shippingAddress && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Shipping Address
                  </h4>
                  <div className="bg-slate-50 p-3.5 rounded-2xl space-y-1 text-slate-600">
                    <p className="font-bold text-slate-900">
                      {selectedOrder.shippingAddress.label || 'Delivery Address'}
                    </p>
                    <p>{selectedOrder.shippingAddress.line1}</p>
                    {selectedOrder.shippingAddress.line2 && <p>{selectedOrder.shippingAddress.line2}</p>}
                    <p>
                      {selectedOrder.shippingAddress.city} {selectedOrder.shippingAddress.pincode && `• ${selectedOrder.shippingAddress.pincode}`}
                    </p>
                    {selectedOrder.shippingAddress.phone && (
                      <p className="font-semibold text-slate-700">Phone: {selectedOrder.shippingAddress.phone}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Return & Refund Info (If requested) */}
              {selectedOrder.returnRequest?.isRequested && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600" /> Return & Refund Request
                  </h4>
                  <div className="bg-amber-50/70 p-3.5 rounded-2xl space-y-1.5 border border-amber-200 text-slate-700">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-amber-900">Status:</span>
                      <span className="font-extrabold uppercase text-[10px] px-2 py-0.5 rounded bg-white border border-amber-300">
                        {selectedOrder.returnRequest.status || 'Pending Approval'}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">Reason: </span>
                      {selectedOrder.returnRequest.reason}
                    </div>
                    {selectedOrder.returnRequest.customerNotes && (
                      <div>
                        <span className="font-semibold text-slate-900">Customer Note: </span>
                        {selectedOrder.returnRequest.customerNotes}
                      </div>
                    )}
                    {selectedOrder.returnRequest.requestedAt && (
                      <div className="text-[11px] text-slate-500">
                        Requested on: {new Date(selectedOrder.returnRequest.requestedAt).toLocaleString()}
                      </div>
                    )}
                    {selectedOrder.returnRequest.sellerResponse && (
                      <div className="pt-2 border-t border-amber-200/80 mt-1">
                        <span className="font-bold text-slate-900 block">Seller Response:</span>
                        <p className="text-slate-800 italic mt-0.5">
                          "{selectedOrder.returnRequest.sellerResponse.comment || selectedOrder.returnRequest.sellerResponse.decision}"
                        </p>
                        {selectedOrder.returnRequest.sellerResponse.respondedAt && (
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            Answered: {new Date(selectedOrder.returnRequest.sellerResponse.respondedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                    {selectedOrder.refundAmount > 0 && selectedOrder.status === 'Refunded' && (
                      <div className="pt-1.5 font-bold text-emerald-800 text-xs">
                        Refund of ৳{selectedOrder.refundAmount} issued.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Price Calculation Summary */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <div className="flex justify-between text-slate-500">
                  <span>Items Subtotal</span>
                  <span>৳{selectedOrder.subtotal || selectedOrder.totalAmount}</span>
                </div>
                {selectedOrder.shippingFee > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Shipping Fee</span>
                    <span>৳{selectedOrder.shippingFee}</span>
                  </div>
                )}
                {selectedOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount Applied</span>
                    <span>-৳{selectedOrder.discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-100">
                  <span>Total Paid / Due</span>
                  <span className="text-emerald-700">৳{selectedOrder.totalAmount}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50 rounded-b-3xl">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-white text-slate-700 font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5" /> Print Invoice
              </button>

              <button
                type="button"
                onClick={() => setDetailsModalOpen(false)}
                className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CANCEL ORDER CONFIRMATION MODAL                                           */}
      {/* ========================================================================= */}
      {cancelModalOpen && orderToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-rose-600">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-black text-base text-slate-900">Cancel Order?</h3>
              </div>
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Are you sure you want to cancel order <strong>#ORD-{(orderToCancel._id || '').slice(-8).toUpperCase()}</strong>? This action cannot be undone.
            </p>

            {/* Reason selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Please select a reason:</label>
              <div className="space-y-1.5">
                {CANCELLATION_REASONS.map((r) => (
                  <label
                    key={r}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                      cancelReason === r
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancelReason"
                      checked={cancelReason === r}
                      onChange={() => setCancelReason(r)}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>

              {cancelReason === 'Other reasons' && (
                <textarea
                  rows="2"
                  value={cancelCustomNotes}
                  onChange={(e) => setCancelCustomNotes(e.target.value)}
                  placeholder="Provide additional details..."
                  className="w-full mt-2 p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600"
                />
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleConfirmCancel}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REQUEST RETURN / REFUND MODAL                                             */}
      {/* ========================================================================= */}
      {returnModalOpen && orderToReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-amber-700">
                <RotateCcw className="w-5 h-5" />
                <div>
                  <h3 className="font-black text-base text-slate-900">Request Return & Refund</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Order #ORD-{(orderToReturn._id || '').slice(-8).toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReturnModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-amber-700" /> Seller Approval Policy
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Your return request will be submitted directly to the seller (<strong>{orderToReturn.sellerId?.shopName || 'Shop'}</strong>). Once approved, your refund of <strong>৳{orderToReturn.totalAmount}</strong> will be processed.
              </p>
            </div>

            {/* Reason selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Please select return reason:</label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {RETURN_REASONS.map((r) => (
                  <label
                    key={r}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                      returnReason === r
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="returnReason"
                      checked={returnReason === r}
                      onChange={() => setReturnReason(r)}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Additional Details / Explanation (Optional):
                </label>
                <textarea
                  rows="2"
                  value={returnCustomNotes}
                  onChange={(e) => setReturnCustomNotes(e.target.value)}
                  placeholder="Describe the issue with the item(s) to help the seller process your request faster..."
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 bg-slate-50 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReturnModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingReturn}
                onClick={handleConfirmReturn}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#1B8057] hover:bg-[#156947] text-white transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${submittingReturn ? 'animate-spin' : ''}`} />
                {submittingReturn ? 'Submitting Request...' : 'Submit Return Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
