import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  fetchSellerOrders,
  updateOrderStatus,
  respondToReturnRequest,
  issueOrderRefund,
  clearSellerError,
} from '../../features/seller/sellerSlice';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  RotateCcw,
  Search,
  ChevronDown,
  ChevronUp,
  MapPin,
  Phone,
  User,
  CreditCard,
  Calendar,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Send,
  FileText,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';

const formatCurrency = (amount) => {
  return `৳${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const ORDER_STATUS_CONFIG = {
  Pending: {
    label: 'Pending',
    tone: 'warning',
    icon: Clock,
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    description: 'Order placed by customer, awaiting processing or confirmation.',
  },
  Processing: {
    label: 'Processing',
    tone: 'info',
    icon: Package,
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    description: 'Order is being packed and prepared for dispatch.',
  },
  Shipped: {
    label: 'Shipped',
    tone: 'info',
    icon: Truck,
    color: 'text-purple-700 bg-purple-50 border-purple-200',
    description: 'Package is handed over to logistics / out for delivery.',
  },
  Delivered: {
    label: 'Delivered',
    tone: 'success',
    icon: CheckCircle,
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    description: 'Order received by customer. For COD, payment is recorded as collected.',
  },
  Return_Requested: {
    label: 'Return Requested',
    tone: 'warning',
    icon: RotateCcw,
    color: 'text-amber-800 bg-amber-100 border-amber-300',
    description: 'Customer submitted a return request. Awaiting your approval or decision.',
  },
  Return_Approved: {
    label: 'Return Approved',
    tone: 'info',
    icon: CheckCircle,
    color: 'text-blue-800 bg-blue-100 border-blue-300',
    description: 'Return request approved. Waiting for return shipment or refund issuance.',
  },
  Return_Rejected: {
    label: 'Return Declined',
    tone: 'danger',
    icon: XCircle,
    color: 'text-rose-800 bg-rose-100 border-rose-300',
    description: 'Return request was declined by seller.',
  },
  Cancelled: {
    label: 'Cancelled',
    tone: 'danger',
    icon: XCircle,
    color: 'text-red-700 bg-red-50 border-red-200',
    description: 'Order has been cancelled by seller or customer.',
  },
  Refunded: {
    label: 'Refunded',
    tone: 'danger',
    icon: RotateCcw,
    color: 'text-orange-700 bg-orange-50 border-orange-200',
    description: 'Payment has been refunded for returned / disputed items.',
  },
};

const ALL_STATUS_OPTIONS = [
  'Pending',
  'Processing',
  'Shipped',
  'Delivered',
  'Return_Requested',
  'Return_Approved',
  'Return_Rejected',
  'Cancelled',
  'Refunded',
];

const statusTabs = [
  { id: 'all', label: 'All Orders' },
  { id: 'Pending', label: 'Pending' },
  { id: 'Processing', label: 'Processing' },
  { id: 'Shipped', label: 'Shipped' },
  { id: 'Delivered', label: 'Delivered' },
  { id: 'returns', label: 'Return Requests' },
  { id: 'Cancelled', label: 'Cancelled' },
  { id: 'Refunded', label: 'Refunded' },
];

const STAGE_ORDER = ['Pending', 'Processing', 'Shipped', 'Delivered'];

const Orders = () => {
  const dispatch = useDispatch();
  const { orders, orderPagination, status, actionLoading, error } = useSelector(
    (state) => state.seller
  );

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Status update modal state
  const [selectedOrderForStatus, setSelectedOrderForStatus] = useState(null);
  const [newStatus, setNewStatus] = useState('Processing');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [statusUpdateError, setStatusUpdateError] = useState('');

  // Return decision modal state
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [orderForReturnDecision, setOrderForReturnDecision] = useState(null);
  const [returnDecision, setReturnDecision] = useState('approved');
  const [returnActionType, setReturnActionType] = useState('approve_and_refund'); // 'approve_and_refund' | 'approve_return'
  const [decisionComment, setDecisionComment] = useState('');
  const [refundAmountInput, setRefundAmountInput] = useState('');
  const [restockInventory, setRestockInventory] = useState(true);
  const [submittingReturnDecision, setSubmittingReturnDecision] = useState(false);

  // Quick inline update loading per order
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  // Expanded order details
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  useEffect(() => {
    dispatch(
      fetchSellerOrders({
        page: currentPage,
        limit: 10,
        status: activeTab === 'all' ? undefined : activeTab,
      })
    );
  }, [dispatch, activeTab, currentPage]);

  const handleOpenStatusModal = (order, presetStatus = null) => {
    setSelectedOrderForStatus(order);
    setNewStatus(presetStatus || order.status || 'Processing');
    setTrackingNumber(order.trackingNumber || '');
    setCarrier('');
    setStatusNotes(order.notes || '');
    setCancellationReason(order.cancellationReason || '');
    setStatusUpdateError('');
  };

  const handleQuickStatusChange = async (order, targetStatus) => {
    setUpdatingOrderId(order._id);
    try {
      const res = await dispatch(
        updateOrderStatus({
          orderId: order._id,
          status: targetStatus,
        })
      );
      if (!res.error) {
        toast.success(`Order #${order._id.slice(-6).toUpperCase()} updated to ${targetStatus}`);
      } else {
        toast.error(res.payload || 'Failed to update order status');
      }
    } catch {
      toast.error('Could not update status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrderForStatus || !newStatus) return;

    setStatusUpdateError('');
    const res = await dispatch(
      updateOrderStatus({
        orderId: selectedOrderForStatus._id,
        status: newStatus,
        trackingNumber: trackingNumber.trim() || undefined,
        carrier: carrier.trim() || undefined,
        notes: statusNotes.trim() || undefined,
        cancellationReason: cancellationReason.trim() || undefined,
      })
    );

    if (!res.error) {
      toast.success(
        `Order #${selectedOrderForStatus._id.slice(-6).toUpperCase()} updated to ${newStatus}`
      );
      setSelectedOrderForStatus(null);
    } else {
      setStatusUpdateError(res.payload || 'Failed to update order status');
    }
  };

  const handleOpenReturnModal = (order) => {
    setOrderForReturnDecision(order);
    setReturnDecision('approved');
    setReturnActionType('approve_and_refund');
    setDecisionComment('');
    setRefundAmountInput(order.returnRequest?.refundAmount || order.totalAmount || '');
    setRestockInventory(true);
    setReturnModalOpen(true);
  };

  const handleSubmitReturnDecision = async (e) => {
    e.preventDefault();
    if (!orderForReturnDecision) return;

    setSubmittingReturnDecision(true);
    try {
      await dispatch(
        respondToReturnRequest({
          orderId: orderForReturnDecision._id,
          decision: returnDecision,
          comment: decisionComment.trim() || undefined,
          refundAmount: refundAmountInput ? Number(refundAmountInput) : undefined,
          restockItems: restockInventory,
          action: returnDecision === 'approved' ? returnActionType : 'reject',
        })
      ).unwrap();

      toast.success(
        returnDecision === 'approved'
          ? (returnActionType === 'approve_and_refund'
              ? `Return approved and refund of ৳${refundAmountInput || orderForReturnDecision.totalAmount} issued!`
              : 'Return approved. Customer requested to return items.')
          : 'Return request declined.'
      );
      setReturnModalOpen(false);
      setOrderForReturnDecision(null);

      // Refresh list
      dispatch(
        fetchSellerOrders({
          page: currentPage,
          limit: 10,
          status: activeTab === 'all' ? undefined : activeTab,
        })
      );
    } catch (err) {
      toast.error(typeof err === 'string' ? err : err?.message || 'Failed to submit return decision');
    } finally {
      setSubmittingReturnDecision(false);
    }
  };

  const handleQuickIssueRefund = async (order) => {
    setUpdatingOrderId(order._id);
    try {
      await dispatch(
        issueOrderRefund({
          orderId: order._id,
          refundAmount: order.refundAmount || order.totalAmount,
          notes: 'Refund processed by seller',
          restockItems: true,
        })
      ).unwrap();

      toast.success(`Refund of ৳${order.totalAmount} issued for Order #${order._id.slice(-6).toUpperCase()}`);

      dispatch(
        fetchSellerOrders({
          page: currentPage,
          limit: 10,
          status: activeTab === 'all' ? undefined : activeTab,
        })
      );
    } catch (err) {
      toast.error(typeof err === 'string' ? err : err?.message || 'Failed to issue refund');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const toggleExpand = (orderId) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  const filteredOrders = (orders || []).filter((order) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const orderIdMatch = order._id?.toLowerCase().includes(q);
    const userNameMatch = order.userId?.name?.toLowerCase().includes(q);
    const userEmailMatch = order.userId?.email?.toLowerCase().includes(q);
    const userPhoneMatch = order.userId?.phone?.toLowerCase().includes(q);
    const itemMatch = order.items?.some((i) => i.name?.toLowerCase().includes(q));
    const cityMatch = order.shippingAddress?.city?.toLowerCase().includes(q);
    return orderIdMatch || userNameMatch || userEmailMatch || userPhoneMatch || itemMatch || cityMatch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Order Fulfillment & Logistics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your customer orders with full status control: process, ship, deliver, or adjust stages on demand.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              dispatch(
                fetchSellerOrders({
                  page: currentPage,
                  limit: 10,
                  status: activeTab === 'all' ? undefined : activeTab,
                })
              )
            }
            className="text-xs font-semibold rounded-2xl"
          >
            ↻ Refresh Orders
          </Button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl flex items-center justify-between text-xs sm:text-sm shadow-2xs">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            {error}
          </span>
          <button
            type="button"
            onClick={() => dispatch(clearSellerError())}
            className="text-red-500 hover:text-red-700 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-3xl border border-slate-200/80 shadow-2xs">
          {/* Scrollable Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {statusTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? 'bg-[#124B38] text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order ID, name, phone..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Orders List Feed */}
      <div className="space-y-4">
        {status === 'loading' && !orders?.length ? (
          <div className="bg-white rounded-3xl p-12 text-center text-slate-500 border border-slate-200 shadow-2xs space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-semibold">Loading fulfillment orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200 shadow-2xs space-y-2">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No orders found</p>
            <p className="text-xs text-slate-400">
              {searchQuery
                ? `No orders matching "${searchQuery}" in this category.`
                : 'There are currently no orders in this status category.'}
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isExpanded = expandedOrderId === order._id;
            const cfg = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.Pending;
            const StatusIcon = cfg.icon;
            const isCurrentlyUpdating = updatingOrderId === order._id;

            return (
              <div
                key={order._id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all hover:border-slate-300"
              >
                {/* Order Summary Header */}
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Top Row: Order ID, Status Badge, Order Date */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-extrabold text-slate-900 text-sm sm:text-base font-mono">
                        #{order._id?.slice(-8).toUpperCase()}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold border ${cfg.color}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {order.status}
                      </span>
                      {order.paymentMethod && (
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                          💳 {order.paymentMethod === 'PORTPOS' ? 'PortPos (পোর্টপস)' : order.paymentMethod === 'COD' ? 'Cash on Delivery (COD)' : order.paymentMethod}{' '}
                          <span
                            className={`font-bold ml-1 ${
                              order.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            ({order.paymentStatus || 'pending'})
                          </span>
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-300" />
                      {formatDate(order.createdAt)}
                    </span>
                  </div>

                  {/* Customer Info & Order Items Preview */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1 text-xs">
                    {/* Customer */}
                    <div className="space-y-0.5">
                      <span className="text-[11px] text-slate-400 font-medium block">Customer</span>
                      <p className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
                        <User className="w-3.5 h-3.5 text-[#124B38]" />
                        {order.userId?.name || 'Customer'}
                      </p>
                      <p className="text-slate-500 truncate">{order.userId?.email || 'N/A'}</p>
                    </div>

                    {/* Delivery Destination */}
                    <div className="space-y-0.5">
                      <span className="text-[11px] text-slate-400 font-medium block">Destination</span>
                      <p className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        {order.shippingAddress?.city || 'City N/A'}
                        {order.shippingAddress?.pincode ? ` (${order.shippingAddress.pincode})` : ''}
                      </p>
                      <p className="text-slate-500 truncate">
                        {order.shippingAddress?.line1 || 'No street address'}
                      </p>
                    </div>

                    {/* Items & Total */}
                    <div className="space-y-0.5">
                      <span className="text-[11px] text-slate-400 font-medium block">Order Value</span>
                      <p className="text-base font-extrabold text-[#124B38]">
                        {formatCurrency(order.totalAmount)}
                      </p>
                      <p className="text-slate-500">
                        {order.items?.length || 0} item(s) ordered
                      </p>
                    </div>
                  </div>

                  {/* Return Request Notification Banner (If Pending Approval) */}
                  {(order.status === 'Return_Requested' || order.returnRequest?.status === 'pending') && (
                    <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 space-y-2.5 text-xs shadow-2xs">
                      <div className="flex items-center justify-between font-bold text-amber-900">
                        <span className="flex items-center gap-1.5">
                          <RotateCcw className="w-4 h-4 text-amber-700 animate-spin" />
                          Return & Refund Requested by Customer
                        </span>
                        <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md uppercase font-extrabold">
                          Needs Seller Decision
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 bg-white/70 p-3 rounded-xl border border-amber-100">
                        <div>
                          <span className="font-bold text-slate-900 block">Return Reason:</span>
                          <span className="text-slate-800">{order.returnRequest?.reason || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">Requested Date:</span>
                          <span className="text-slate-600">{formatDate(order.returnRequest?.requestedAt || order.updatedAt)}</span>
                        </div>
                        {order.returnRequest?.customerNotes && (
                          <div className="col-span-full pt-1 border-t border-slate-100">
                            <span className="font-bold text-slate-900 block">Customer Notes:</span>
                            <span className="italic text-slate-700">"{order.returnRequest.customerNotes}"</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleOpenReturnModal(order)}
                          className="px-4 py-2 rounded-xl bg-[#124B38] hover:bg-[#0d3628] text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <ShieldCheck className="w-4 h-4" /> Review & Decide Request
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Return Approved Banner */}
                  {order.status === 'Return_Approved' && (
                    <div className="bg-blue-50/90 border border-blue-200/90 rounded-2xl p-4 space-y-2 text-xs shadow-2xs">
                      <div className="flex items-center justify-between font-bold text-blue-900">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-blue-700" />
                          Return Approved — Awaiting Physical Items / Refund
                        </span>
                        <button
                          type="button"
                          disabled={updatingOrderId === order._id}
                          onClick={() => handleQuickIssueRefund(order)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Complete Refund ({formatCurrency(order.refundAmount || order.totalAmount)})
                        </button>
                      </div>
                      {order.returnRequest?.sellerResponse?.comment && (
                        <p className="text-slate-600 bg-white/70 p-2 rounded-xl border border-blue-100">
                          <strong>Seller instruction:</strong> {order.returnRequest.sellerResponse.comment}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Visual Stepper Lifecycle (For Standard Active Stages) */}
                  {!['Cancelled', 'Refunded', 'Return_Requested', 'Return_Approved', 'Return_Rejected'].includes(order.status) && (
                    <div className="pt-2">
                      <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-center text-[11px]">
                        {STAGE_ORDER.map((stage, idx) => {
                          const currentIdx = STAGE_ORDER.indexOf(order.status);
                          const isPassed = currentIdx >= idx;
                          const isCurrent = order.status === stage;

                          return (
                            <div
                              key={stage}
                              className={`py-1.5 px-2 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
                                isCurrent
                                  ? 'bg-[#124B38] text-white shadow-2xs'
                                  : isPassed
                                  ? 'bg-emerald-100/70 text-emerald-800'
                                  : 'text-slate-400 bg-white/60'
                              }`}
                            >
                              {isPassed ? (
                                <CheckCircle className="w-3 h-3" />
                              ) : (
                                <span className="w-3 h-3 rounded-full border border-slate-300 text-[9px] flex items-center justify-center font-mono">
                                  {idx + 1}
                                </span>
                              )}
                              <span className="truncate">{stage}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Actions & 1-Click Status Controls */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    {/* Quick 1-Click Shortcut Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      {order.status === 'Return_Requested' && (
                        <button
                          type="button"
                          onClick={() => handleOpenReturnModal(order)}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Handle Return Request
                        </button>
                      )}

                      {order.status === 'Return_Approved' && (
                        <button
                          type="button"
                          disabled={updatingOrderId === order._id}
                          onClick={() => handleQuickIssueRefund(order)}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Issue Refund
                        </button>
                      )}

                      {order.status === 'Pending' && (
                        <>
                          <button
                            type="button"
                            disabled={isCurrentlyUpdating}
                            onClick={() => handleQuickStatusChange(order, 'Processing')}
                            className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition cursor-pointer shadow-2xs"
                          >
                            ⚡ Accept & Process
                          </button>
                          <button
                            type="button"
                            disabled={isCurrentlyUpdating}
                            onClick={() => handleQuickStatusChange(order, 'Shipped')}
                            className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 transition cursor-pointer shadow-2xs"
                          >
                            🚚 Mark as Shipped
                          </button>
                          <button
                            type="button"
                            disabled={isCurrentlyUpdating}
                            onClick={() => handleQuickStatusChange(order, 'Delivered')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition cursor-pointer shadow-2xs"
                          >
                            ✅ Mark as Delivered
                          </button>
                        </>
                      )}

                      {order.status === 'Processing' && (
                        <>
                          <button
                            type="button"
                            disabled={isCurrentlyUpdating}
                            onClick={() => handleQuickStatusChange(order, 'Shipped')}
                            className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 transition cursor-pointer shadow-2xs"
                          >
                            🚚 Mark as Shipped
                          </button>
                          <button
                            type="button"
                            disabled={isCurrentlyUpdating}
                            onClick={() => handleQuickStatusChange(order, 'Delivered')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition cursor-pointer shadow-2xs"
                          >
                            ✅ Mark as Delivered
                          </button>
                        </>
                      )}

                      {order.status === 'Shipped' && (
                        <button
                          type="button"
                          disabled={isCurrentlyUpdating}
                          onClick={() => handleQuickStatusChange(order, 'Delivered')}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition cursor-pointer shadow-2xs"
                        >
                          ✅ Confirm Delivered
                        </button>
                      )}

                      {/* Full Status Control Trigger */}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenStatusModal(order)}
                        className="text-xs font-bold rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50"
                      >
                        ⚙ Update Status
                      </Button>
                    </div>

                    {/* Expand Details Trigger */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(order._id)}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                    >
                      <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expandable Full Order Breakdown */}
                {isExpanded && (
                  <div className="bg-slate-50/80 p-5 sm:p-6 border-t border-slate-200/80 space-y-6 animate-in fade-in duration-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Shipping Info Card */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                        <h4 className="font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-emerald-700" />
                          Delivery Address & Contact
                        </h4>
                        <div className="text-slate-700 space-y-1 pt-1">
                          <p className="font-semibold text-slate-900">
                            Recipient: {order.userId?.name || 'Customer'}
                          </p>
                          <p>{order.shippingAddress?.line1 || 'No street address provided'}</p>
                          {order.shippingAddress?.line2 && <p>{order.shippingAddress.line2}</p>}
                          <p>
                            {order.shippingAddress?.city}{' '}
                            {order.shippingAddress?.state ? `, ${order.shippingAddress.state}` : ''}{' '}
                            {order.shippingAddress?.pincode ? `- ${order.shippingAddress.pincode}` : ''}
                          </p>
                          {order.userId?.phone && (
                            <p className="text-slate-600 pt-1 font-semibold flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {order.userId.phone}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Payment & Logistics Metadata */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                        <h4 className="font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-emerald-700" />
                          Payment & Fulfillment Meta
                        </h4>
                        <div className="text-slate-700 space-y-1.5 pt-1">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Payment Method:</span>
                            <span className="font-bold text-slate-900">{order.paymentMethod}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Payment Status:</span>
                            <span
                              className={`font-extrabold uppercase ${
                                order.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'
                              }`}
                            >
                              {order.paymentStatus || 'pending'}
                            </span>
                          </div>
                          {order.trackingNumber && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Tracking Code:</span>
                              <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                                {order.trackingNumber}
                              </span>
                            </div>
                          )}
                          {order.deliveryDate && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Delivered At:</span>
                              <span className="font-bold text-emerald-700">{formatDate(order.deliveryDate)}</span>
                            </div>
                          )}
                          {order.notes && (
                            <div className="pt-1 border-t border-slate-100 text-slate-600">
                              <span className="font-bold text-slate-800">Order Note: </span>
                              {order.notes}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Return & Refund Request Card (If exists) */}
                      {order.returnRequest?.isRequested && (
                        <div className="col-span-full bg-amber-50/70 p-4 rounded-2xl border border-amber-200 space-y-2 text-xs text-slate-800">
                          <div className="flex items-center justify-between font-bold text-amber-900">
                            <span className="flex items-center gap-1.5">
                              <RotateCcw className="w-4 h-4 text-amber-700" /> Return & Refund Request Lifecycle
                            </span>
                            <span className="px-2.5 py-0.5 rounded-lg bg-white border border-amber-300 uppercase text-[10px] font-extrabold">
                              Status: {order.returnRequest.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                            <div>
                              <span className="text-slate-500 block text-[11px]">Return Reason</span>
                              <p className="font-semibold text-slate-900">{order.returnRequest.reason}</p>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[11px]">Requested At</span>
                              <p className="font-semibold text-slate-900">
                                {order.returnRequest.requestedAt ? formatDate(order.returnRequest.requestedAt) : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[11px]">Refund Amount</span>
                              <p className="font-black text-emerald-800">
                                {formatCurrency(order.refundAmount || order.returnRequest.refundAmount || order.totalAmount)}
                              </p>
                            </div>
                          </div>
                          {order.returnRequest.customerNotes && (
                            <div className="bg-white/80 p-2.5 rounded-xl border border-amber-100">
                              <span className="font-bold text-slate-900 block text-[11px]">Customer Explanation:</span>
                              <p className="text-slate-700 italic">"{order.returnRequest.customerNotes}"</p>
                            </div>
                          )}
                          {order.returnRequest.sellerResponse && (
                            <div className="bg-white/80 p-2.5 rounded-xl border border-amber-100">
                              <span className="font-bold text-slate-900 block text-[11px]">Seller Decision Remark:</span>
                              <p className="text-slate-700">"{order.returnRequest.sellerResponse.comment || order.returnRequest.sellerResponse.decision}"</p>
                              {order.returnRequest.sellerResponse.respondedAt && (
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  Responded on {formatDate(order.returnRequest.sellerResponse.respondedAt)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Ordered Items Table */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
                      <div className="p-3.5 bg-slate-50 border-b border-slate-200/80 font-bold text-xs text-slate-700 uppercase tracking-wider">
                        Purchased Items ({order.items?.length || 0})
                      </div>
                      <div className="divide-y divide-slate-100 text-xs">
                        {order.items?.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-1">
                                {item.productId?.images?.[0]?.url || item.productSnapshot?.images?.[0]?.url ? (
                                  <img
                                    src={item.productId?.images?.[0]?.url || item.productSnapshot?.images?.[0]?.url}
                                    alt=""
                                    className="w-full h-full object-contain mix-blend-multiply"
                                  />
                                ) : (
                                  <Package className="w-5 h-5 text-slate-400" />
                                )}
                              </div>
                              <div>
                                <h5 className="font-bold text-slate-900">{item.name}</h5>
                                <span className="text-[11px] text-slate-500 font-medium">
                                  Qty: {item.quantity} × {formatCurrency(item.price)}
                                </span>
                              </div>
                            </div>
                            <span className="font-extrabold text-slate-900 text-sm sm:text-right">
                              {formatCurrency((item.price || 0) * (item.quantity || 1))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Pagination */}
        {orderPagination?.totalPages > 1 && (
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              Page {orderPagination.page} of {orderPagination.totalPages} ({orderPagination.total} total orders)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded-xl"
              >
                Prev
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage >= orderPagination.totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="rounded-xl"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ──────────────── Comprehensive Status Update Modal ──────────────── */}
      <Modal
        open={!!selectedOrderForStatus}
        onClose={() => setSelectedOrderForStatus(null)}
        title={`Update Status: Order #${selectedOrderForStatus?._id?.slice(-8).toUpperCase()}`}
      >
        <form onSubmit={handleUpdateStatusSubmit} className="space-y-4 py-2 text-xs">
          {statusUpdateError && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 font-medium">
              {statusUpdateError}
            </div>
          )}

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
            <span className="text-slate-500 font-medium">Current Status:</span>
            <span className="font-extrabold text-slate-900 px-3 py-1 rounded-xl bg-white border border-slate-200 shadow-2xs">
              {selectedOrderForStatus?.status}
            </span>
          </div>

          {/* New Status Select */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Select New Order Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 font-semibold"
            >
              {ALL_STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st} — {ORDER_STATUS_CONFIG[st]?.description}
                </option>
              ))}
            </select>
          </div>

          {/* If Shipped: Tracking Number & Carrier */}
          {newStatus === 'Shipped' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-purple-50/50 rounded-2xl border border-purple-200">
              <div>
                <label className="block font-bold text-purple-900 mb-1">
                  Tracking Code / AWB
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. TRK-9823472"
                  className="w-full rounded-xl border border-purple-300 px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>
              <div>
                <label className="block font-bold text-purple-900 mb-1">
                  Courier / Logistics Partner
                </label>
                <input
                  type="text"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="e.g. RedX, Pathao, Paperfly"
                  className="w-full rounded-xl border border-purple-300 px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>
            </div>
          )}

          {/* If Cancelled: Cancellation Reason */}
          {newStatus === 'Cancelled' && (
            <div className="p-3.5 bg-red-50/50 rounded-2xl border border-red-200">
              <label className="block font-bold text-red-900 mb-1">
                Reason for Cancellation
              </label>
              <input
                type="text"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="e.g. Customer requested cancellation / Out of stock"
                className="w-full rounded-xl border border-red-300 px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
          )}

          {/* Optional Order Note */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Internal Note / Customer Instruction (Optional)
            </label>
            <textarea
              rows={2}
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              placeholder="Add any delivery notes or remarks..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setSelectedOrderForStatus(null)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={actionLoading}
              className="rounded-xl"
            >
              Confirm Status Change
            </Button>
          </div>
        </form>
      </Modal>

      {/* ──────────────── Return / Refund Decision Modal (Seller Side) ──────────────── */}
      <Modal
        open={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        title={`Return & Refund Decision: Order #${orderForReturnDecision?._id?.slice(-8).toUpperCase()}`}
      >
        <form onSubmit={handleSubmitReturnDecision} className="space-y-4 py-2 text-xs">
          {/* Customer Request Recap Card */}
          <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200 space-y-1.5 text-amber-900">
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1">
                <RotateCcw className="w-3.5 h-3.5 text-amber-700" /> Buyer Request Details
              </span>
              <span className="font-black text-slate-900">
                Total: {formatCurrency(orderForReturnDecision?.totalAmount)}
              </span>
            </div>
            <p className="text-slate-800">
              <strong>Reason: </strong>
              {orderForReturnDecision?.returnRequest?.reason || 'Customer requested return'}
            </p>
            {orderForReturnDecision?.returnRequest?.customerNotes && (
              <p className="text-slate-600 italic bg-white/70 p-2 rounded-xl border border-amber-100">
                "{orderForReturnDecision.returnRequest.customerNotes}"
              </p>
            )}
          </div>

          {/* Decision Selector: Approve vs Reject */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Select Your Decision
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setReturnDecision('approved')}
                className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                  returnDecision === 'approved'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-300'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <CheckCircle className="w-4 h-4 text-emerald-600" /> Approve Return
              </button>

              <button
                type="button"
                onClick={() => setReturnDecision('rejected')}
                className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                  returnDecision === 'rejected'
                    ? 'border-rose-600 bg-rose-50 text-rose-900 ring-2 ring-rose-300'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-600" /> Decline Return
              </button>
            </div>
          </div>

          {/* If Approved: Choose Action Type */}
          {returnDecision === 'approved' && (
            <div className="space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  Approval Action Type
                </label>
                <div className="space-y-1.5">
                  <label
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                      returnActionType === 'approve_and_refund'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="returnActionType"
                      checked={returnActionType === 'approve_and_refund'}
                      onChange={() => setReturnActionType('approve_and_refund')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span>Approve & Issue Refund Immediately</span>
                      <span className="text-[11px] text-slate-500 font-normal block">
                        Order status changes to <strong>Refunded</strong> and items can be restocked into inventory.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                      returnActionType === 'approve_return'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="returnActionType"
                      checked={returnActionType === 'approve_return'}
                      onChange={() => setReturnActionType('approve_return')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span>Approve Return (Awaiting Physical Parcel)</span>
                      <span className="text-[11px] text-slate-500 font-normal block">
                        Customer will ship items back; you can issue refund after inspecting the package.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Refund Amount Input */}
              {returnActionType === 'approve_and_refund' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Refund Amount (৳)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={refundAmountInput}
                      onChange={(e) => setRefundAmountInput(e.target.value)}
                      placeholder={orderForReturnDecision?.totalAmount?.toString()}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 font-bold"
                    />
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={restockInventory}
                        onChange={(e) => setRestockInventory(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Restock ordered items into product stock</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Seller Response Note / Comment */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Note to Customer {returnDecision === 'rejected' ? '(Reason for Decline)' : '(Optional Remarks / Instructions)'}
            </label>
            <textarea
              rows={2}
              value={decisionComment}
              onChange={(e) => setDecisionComment(e.target.value)}
              placeholder={
                returnDecision === 'approved'
                  ? 'e.g. Return approved. Please send package to our registered shop address.'
                  : 'e.g. Return declined as the warranty period has expired / product is not eligible for return.'
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setReturnModalOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={returnDecision === 'approved' ? 'primary' : 'danger'}
              size="sm"
              loading={submittingReturnDecision}
              className="rounded-xl"
            >
              {returnDecision === 'approved' ? 'Confirm Approval' : 'Confirm Decline'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Orders;
