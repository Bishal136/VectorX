import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAdminOrders,
  fetchAdminOrderDetails,
  updateAdminOrderStatus,
} from '../../features/admin/adminSlice';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import { toast } from 'react-toastify';
import {
  Search,
  Calendar,
  RefreshCw,
  ShoppingBag,
  Store,
  User,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Copy,
} from 'lucide-react';

const orderStatusTones = {
  Pending: 'warning',
  Processing: 'info',
  Shipped: 'info',
  Delivered: 'success',
  Cancelled: 'danger',
  Refunded: 'neutral',
};

const paymentStatusTones = {
  paid: 'success',
  pending: 'warning',
  failed: 'danger',
  refunded: 'neutral',
};

const Orders = () => {
  const dispatch = useDispatch();
  const { orders, status } = useSelector((state) => state.admin);

  const [search, setSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('Processing');
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Date range validation error
  const isDateRangeInvalid = Boolean(startDate && endDate && new Date(startDate) > new Date(endDate));

  const loadOrders = useCallback(
    (page = currentPage) => {
      dispatch(
        fetchAdminOrders({
          page,
          limit: 15,
          search: search.trim() || undefined,
          status: orderStatus || undefined,
          paymentStatus: paymentStatus || undefined,
          startDate: !isDateRangeInvalid && startDate ? startDate : undefined,
          endDate: !isDateRangeInvalid && endDate ? endDate : undefined,
        })
      );
    },
    [dispatch, currentPage, search, orderStatus, paymentStatus, startDate, endDate, isDateRangeInvalid]
  );

  useEffect(() => {
    loadOrders(currentPage);
  }, [loadOrders, currentPage]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadOrders(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setOrderStatus('');
    setPaymentStatus('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const handleSetDatePreset = (preset) => {
    const now = new Date();
    let start = '';
    const end = now.toISOString().split('T')[0];

    if (preset === 'today') {
      start = end;
    } else if (preset === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      start = d.toISOString().split('T')[0];
    } else if (preset === '30days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      start = d.toISOString().split('T')[0];
    } else if (preset === 'thisMonth') {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      start = d.toISOString().split('T')[0];
    }

    setStartDate(start);
    setEndDate(end);
    setCurrentPage(1);
  };

  const handleOpenDetails = async (order) => {
    setSelectedOrder(order);
    setViewDetailsOpen(true);
    setDetailsLoading(true);
    try {
      const res = await dispatch(fetchAdminOrderDetails(order._id)).unwrap();
      if (res) setSelectedOrder(res);
    } catch {
      // Retain basic order info
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleOpenStatusModal = (order) => {
    setSelectedOrder(order);
    setNewStatus(order.status || 'Processing');
    setAdminNotes('');
    setStatusModalOpen(true);
  };

  const handleConfirmStatusUpdate = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const updatedOrder = await dispatch(
        updateAdminOrderStatus({
          orderId: selectedOrder._id,
          status: newStatus,
          notes: adminNotes.trim() || undefined,
        })
      ).unwrap();

      toast.success(
        `Order #${selectedOrder._id.slice(-6).toUpperCase()} status updated to ${newStatus}`
      );
      setStatusModalOpen(false);
      if (selectedOrder && selectedOrder._id === updatedOrder?._id) {
        setSelectedOrder(updatedOrder);
      }
      loadOrders(currentPage);
    } catch (err) {
      toast.error(err || 'Failed to update order status');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.info(`Copied ${label || 'text'} to clipboard`);
  };

  const orderList = orders?.data || [];
  const pagination = orders?.pagination || { page: 1, totalPages: 1, total: 0 };
  const hasActiveFilters = Boolean(search || orderStatus || paymentStatus || startDate || endDate);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              Platform Orders & Oversight
            </h1>
            <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-indigo-100">
              Admin
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Monitor real-time transactions, inspect items & buyer details, track delivery status, and override lifecycle status.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadOrders(currentPage)}
            className="text-xs flex items-center gap-1.5"
            title="Refresh order list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${status === 'loading' ? 'animate-spin text-indigo-600' : ''}`} />
            Refresh
          </Button>

          <div className="text-xs sm:text-sm text-gray-600 bg-gray-50 px-3.5 py-1.5 rounded-lg border border-gray-200 font-medium">
            Total Orders:{' '}
            <span className="font-bold text-indigo-600">
              {pagination.total || pagination.totalResults || orderList.length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Date Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
        {/* Search row */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Order ID, Buyer name, Email, Shop name, Item name, Phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" variant="primary" size="md" className="text-xs sm:text-sm px-4 whitespace-nowrap">
              Search
            </Button>
            {search && (
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="text-xs sm:text-sm px-3"
                onClick={() => {
                  setSearch('');
                  setCurrentPage(1);
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </form>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Order Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Order Status</label>
            <select
              value={orderStatus}
              onChange={(e) => {
                setOrderStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
            >
              <option value="">All Statuses (Lifecycle)</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>

          {/* Payment Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Payment Status</label>
            <select
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
            >
              <option value="">All Payment Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
              <span>From Date</span>
              {startDate && (
                <button
                  type="button"
                  onClick={() => setStartDate('')}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-normal"
                >
                  Reset
                </button>
              )}
            </label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full rounded-xl border px-3 py-2 text-xs sm:text-sm focus:ring-2 outline-none transition ${
                  isDateRangeInvalid
                    ? 'border-red-400 bg-red-50/50 focus:ring-red-400'
                    : 'border-gray-300 focus:ring-indigo-500'
                }`}
              />
            </div>
          </div>

          {/* To Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
              <span>To Date</span>
              {endDate && (
                <button
                  type="button"
                  onClick={() => setEndDate('')}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-normal"
                >
                  Reset
                </button>
              )}
            </label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full rounded-xl border px-3 py-2 text-xs sm:text-sm focus:ring-2 outline-none transition ${
                  isDateRangeInvalid
                    ? 'border-red-400 bg-red-50/50 focus:ring-red-400'
                    : 'border-gray-300 focus:ring-indigo-500'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Date presets and active filters indicator */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 text-gray-500">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium mr-1">Quick Date:</span>
            <button
              type="button"
              onClick={() => handleSetDatePreset('today')}
              className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 font-medium transition"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleSetDatePreset('7days')}
              className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 font-medium transition"
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => handleSetDatePreset('30days')}
              className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 font-medium transition"
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => handleSetDatePreset('thisMonth')}
              className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 font-medium transition"
            >
              This Month
            </button>
          </div>

          {hasActiveFilters && (
            <Button
              variant="secondary"
              size="sm"
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
              onClick={handleClearFilters}
            >
              Clear All Filters
            </Button>
          )}
        </div>

        {/* Invalid Date Range Warning */}
        {isDateRangeInvalid && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>
              <strong>Invalid Date Range:</strong> 'From Date' ({startDate}) cannot be after 'To Date' ({endDate}). Please adjust your dates.
            </span>
          </div>
        )}
      </div>

      {/* Orders Table Container */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        {status === 'loading' && orderList.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs sm:text-sm font-medium">Fetching platform orders...</p>
          </div>
        ) : orderList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-200 text-[11px] sm:text-xs">
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Order ID</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Buyer Details</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Seller / Shop</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Items</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Total GMV</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Payment</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Lifecycle Status</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Placed Date</th>
                  <th className="py-3 px-3 sm:px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orderList.map((o) => (
                  <tr key={o._id} className="hover:bg-indigo-50/20 transition-colors">
                    {/* Order ID */}
                    <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100">
                          #{o._id.slice(-8).toUpperCase()}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(o._id, 'Order ID')}
                          className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition"
                          title="Copy Full Order ID"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Buyer Details */}
                    <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900 text-xs sm:text-sm">
                        {o.userId?.name || o.shippingAddress?.fullName || 'Customer'}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {o.userId?.email || o.shippingAddress?.phone || 'No email provided'}
                      </div>
                    </td>

                    {/* Seller / Store */}
                    <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-gray-800 font-medium">
                        <Store className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate max-w-[140px]">
                          {o.sellerId?.shopName || 'Marketplace Seller'}
                        </span>
                      </div>
                    </td>

                    {/* Items */}
                    <td className="py-3.5 px-3 sm:px-4 text-xs text-gray-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>
                          {o.items?.length || 0} item{(o.items?.length || 0) > 1 ? 's' : ''}
                        </span>
                      </div>
                    </td>

                    {/* Total Amount */}
                    <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                      <span className="font-bold text-gray-900 text-xs sm:text-sm">
                        ৳{(o.totalAmount || 0).toLocaleString()}
                      </span>
                    </td>

                    {/* Payment Status & Method */}
                    <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        <Badge tone={paymentStatusTones[o.paymentStatus] || 'neutral'}>
                          {(o.paymentStatus || 'pending').toUpperCase()}
                        </Badge>
                        {o.paymentMethod && (
                          <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">
                            {o.paymentMethod === 'PORTPOS' ? 'PortPos (পোর্টপস)' : o.paymentMethod === 'COD' ? 'Cash on Delivery (COD)' : o.paymentMethod}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Order Status */}
                    <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                      <Badge tone={orderStatusTones[o.status] || 'neutral'}>
                        {o.status}
                      </Badge>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-3 sm:px-4 text-xs text-gray-500 whitespace-nowrap">
                      {o.createdAt ? (
                        <div>
                          <div>{new Date(o.createdAt).toLocaleDateString()}</div>
                          <div className="text-[10px] text-gray-400">
                            {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-3 sm:px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-xs px-2.5 py-1"
                          onClick={() => handleOpenDetails(o)}
                        >
                          Details
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          className="text-xs px-2.5 py-1"
                          onClick={() => handleOpenStatusModal(o)}
                        >
                          Status
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 sm:p-14 text-center text-gray-500 text-xs sm:text-sm space-y-3">
            <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="font-semibold text-gray-700">No orders found matching your search or date filters.</p>
            {hasActiveFilters && (
              <div>
                <Button variant="secondary" size="sm" onClick={handleClearFilters} className="text-xs">
                  Reset All Filters
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-3.5 sm:p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/60">
            <div className="text-xs text-gray-600 font-medium">
              Showing page <strong className="text-gray-900">{pagination.page}</strong> of{' '}
              <strong className="text-gray-900">{pagination.totalPages}</strong> (Total{' '}
              {pagination.total || pagination.totalResults || orderList.length} orders)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="text-xs"
                disabled={pagination.page <= 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              >
                ← Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="text-xs"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, pagination.totalPages))}
              >
                Next →
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <Modal
        open={viewDetailsOpen}
        onClose={() => setViewDetailsOpen(false)}
        title="Platform Order Oversight Details"
      >
        {selectedOrder && (
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
            {/* Header / ID & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-indigo-700 text-xs sm:text-sm break-all">
                    #{selectedOrder._id}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(selectedOrder._id, 'Order ID')}
                    className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition"
                    title="Copy Order ID"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Placed on {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : 'N/A'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={orderStatusTones[selectedOrder.status] || 'neutral'}>
                  {selectedOrder.status}
                </Badge>
                <Badge tone={paymentStatusTones[selectedOrder.paymentStatus] || 'neutral'}>
                  {(selectedOrder.paymentStatus || 'pending').toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* Buyer & Seller Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Buyer info */}
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-gray-700 uppercase tracking-wider text-[11px]">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Buyer Information</span>
                </div>
                <div className="font-semibold text-gray-900">{selectedOrder.userId?.name || 'N/A'}</div>
                <div className="text-gray-600">{selectedOrder.userId?.email || 'No email provided'}</div>
                <div className="text-gray-600">{selectedOrder.userId?.phone || selectedOrder.shippingAddress?.phone || 'No phone'}</div>
              </div>

              {/* Seller info */}
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-gray-700 uppercase tracking-wider text-[11px]">
                  <Store className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Fulfilling Seller / Store</span>
                </div>
                <div className="font-semibold text-gray-900">{selectedOrder.sellerId?.shopName || 'N/A'}</div>
                <div className="text-gray-600">{selectedOrder.sellerId?.user?.email || selectedOrder.sellerId?.shopAddress || 'Seller'}</div>
                {selectedOrder.sellerId?.isVerified && (
                  <div className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified Seller
                  </div>
                )}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-gray-700 uppercase tracking-wider text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                <span>Shipping Address</span>
              </div>
              <div className="text-gray-900 font-medium">
                {selectedOrder.shippingAddress?.fullName || selectedOrder.shippingAddress?.name || selectedOrder.userId?.name || 'Customer'}
              </div>
              <div className="text-gray-600">
                {selectedOrder.shippingAddress?.line1 || selectedOrder.shippingAddress?.street}
                {selectedOrder.shippingAddress?.line2 ? `, ${selectedOrder.shippingAddress.line2}` : ''}
                {selectedOrder.shippingAddress?.city ? `, ${selectedOrder.shippingAddress.city}` : ''}
                {selectedOrder.shippingAddress?.state ? `, ${selectedOrder.shippingAddress.state}` : ''}
                {selectedOrder.shippingAddress?.pincode ? ` - ${selectedOrder.shippingAddress.pincode}` : ''}
              </div>
              {selectedOrder.shippingAddress?.phone && (
                <div className="text-gray-600">Phone: {selectedOrder.shippingAddress.phone}</div>
              )}
            </div>

            {/* Order Items */}
            <div>
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Ordered Items ({selectedOrder.items?.length || 0})</span>
                {detailsLoading && <span className="text-[10px] text-indigo-600">Loading details...</span>}
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 bg-white">
                {(selectedOrder.items || []).map((item, i) => {
                  const imgUrl = item.productId?.images?.[0]?.url || item.productSnapshot?.images?.[0]?.url;
                  return (
                    <div key={i} className="p-3 flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={item.name}
                            className="w-10 h-10 object-cover rounded-lg border border-gray-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-sm shrink-0">
                            📦
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 truncate">{item.name}</div>
                          <div className="text-gray-500">
                            Qty: {item.quantity} × ৳{item.price?.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="font-bold text-gray-900 whitespace-nowrap">
                        ৳{(item.quantity * item.price).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-2 text-xs">
              <div className="font-bold text-gray-700 uppercase tracking-wider text-[11px] mb-1">
                Financial Breakdown
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Items Subtotal</span>
                <span>৳{(selectedOrder.subtotal || selectedOrder.totalAmount || 0).toLocaleString()}</span>
              </div>
              {selectedOrder.shippingCharge > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Shipping Fee</span>
                  <span>+৳{selectedOrder.shippingCharge.toLocaleString()}</span>
                </div>
              )}
              {selectedOrder.tax > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax</span>
                  <span>+৳{selectedOrder.tax.toLocaleString()}</span>
                </div>
              )}
              {selectedOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount {selectedOrder.couponCode ? `(${selectedOrder.couponCode})` : ''}</span>
                  <span>-৳{selectedOrder.discount.toLocaleString()}</span>
                </div>
              )}
              {selectedOrder.commissionAmount > 0 && (
                <div className="flex justify-between text-indigo-700 border-t border-gray-200/80 pt-1">
                  <span>Platform Commission ({selectedOrder.commissionRate || 0}%)</span>
                  <span>৳{selectedOrder.commissionAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="pt-2 border-t border-gray-200 flex justify-between items-center font-bold text-gray-900 text-sm">
                <span>Total GMV</span>
                <span className="text-base text-indigo-700">
                  ৳{(selectedOrder.totalAmount || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment & Audit Notes */}
            {(selectedOrder.notes || selectedOrder.cancellationReason || selectedOrder.trackingNumber) && (
              <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200 text-xs space-y-1">
                <div className="font-bold text-amber-900">Notes & Tracking</div>
                {selectedOrder.trackingNumber && (
                  <div className="text-gray-700">
                    <strong>Tracking #:</strong> {selectedOrder.trackingNumber}
                  </div>
                )}
                {selectedOrder.cancellationReason && (
                  <div className="text-rose-700">
                    <strong>Cancellation Reason:</strong> {selectedOrder.cancellationReason}
                  </div>
                )}
                {selectedOrder.notes && (
                  <div className="text-gray-700 whitespace-pre-wrap">
                    <strong>Notes:</strong> {selectedOrder.notes}
                  </div>
                )}
              </div>
            )}

            {/* Actions in Modal */}
            <div className="pt-3 flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-gray-100">
              <Button
                variant="secondary"
                size="md"
                className="w-full sm:w-auto justify-center text-xs sm:text-sm"
                onClick={() => setViewDetailsOpen(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="md"
                className="w-full sm:w-auto justify-center text-xs sm:text-sm"
                onClick={() => {
                  setViewDetailsOpen(false);
                  handleOpenStatusModal(selectedOrder);
                }}
              >
                Override Lifecycle Status
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Admin Status Override Modal */}
      <Modal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Admin Lifecycle Status Override"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-gray-600">
              Override lifecycle status for Order{' '}
              <strong className="font-mono text-indigo-700 break-all">#{selectedOrder._id}</strong>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Target Order Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
              >
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Refunded">Refunded</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Admin Notes / Reason (Audit Log)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Disputed return approved by support team, tracking verified"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3">
              <Button
                variant="secondary"
                size="md"
                className="w-full sm:w-auto justify-center text-xs sm:text-sm"
                onClick={() => setStatusModalOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                className="w-full sm:w-auto justify-center text-xs sm:text-sm"
                loading={actionLoading}
                onClick={handleConfirmStatusUpdate}
              >
                Apply Status Override
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Orders;

