import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchSellerOrders,
  updateOrderStatus,
  clearSellerError,
} from '../../features/seller/sellerSlice';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

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

const getStatusTone = (status) => {
  switch (status) {
    case 'Delivered':
      return 'success';
    case 'Shipped':
    case 'Processing':
      return 'info';
    case 'Pending':
      return 'warning';
    case 'Cancelled':
    case 'Refunded':
      return 'danger';
    default:
      return 'neutral';
  }
};

const statusTabs = [
  'all',
  'Pending',
  'Processing',
  'Shipped',
  'Delivered',
  'Cancelled',
];

const availableTransitions = {
  Pending: ['Processing', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered', 'Cancelled'],
  Delivered: ['Refunded'],
  Cancelled: [],
  Refunded: [],
};

const Orders = () => {
  const dispatch = useDispatch();
  const { orders, orderPagination, status, actionLoading, error } = useSelector(
    (state) => state.seller
  );

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Status update modal
  const [selectedOrderForStatus, setSelectedOrderForStatus] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusUpdateError, setStatusUpdateError] = useState('');

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

  const handleOpenStatusModal = (order) => {
    setSelectedOrderForStatus(order);
    const possible = availableTransitions[order.status] || [];
    setNewStatus(possible[0] || '');
    setStatusUpdateError('');
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedOrderForStatus || !newStatus) return;

    setStatusUpdateError('');
    const res = await dispatch(
      updateOrderStatus({
        orderId: selectedOrderForStatus._id,
        status: newStatus,
      })
    );

    if (!res.error) {
      setSelectedOrderForStatus(null);
    } else {
      setStatusUpdateError(res.payload || 'Failed to update order status');
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
    const itemMatch = order.items?.some((i) => i.name?.toLowerCase().includes(q));
    return orderIdMatch || userNameMatch || userEmailMatch || itemMatch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Order Fulfillment
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track customer orders, manage fulfillment stages, and update shipping progress.
          </p>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between text-sm">
          <span>{error}</span>
          <button
            onClick={() => dispatch(clearSellerError())}
            className="text-red-500 hover:text-red-700 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Status Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs space-y-4">
        {/* Search */}
        <div className="relative w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order ID, customer name, or item..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
          <span className="absolute left-3 top-2.5 text-gray-400 text-sm">🔍</span>
        </div>

        {/* Filter Tabs — scrollable on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-gray-100 scrollbar-none">
          {statusTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {status === 'loading' && orders.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center text-gray-400 border">
            Loading incoming orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center text-gray-500 border">
            No orders found in this status category.
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isExpanded = expandedOrderId === order._id;
            const possibleTransitions = availableTransitions[order.status] || [];

            return (
              <div
                key={order._id}
                className="bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden transition-all"
              >
                {/* Order Summary Header */}
                <div className="p-4 sm:p-5">
                  {/* Top row: order ID + badge + date */}
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="font-bold text-gray-900 text-sm sm:text-base">
                      Order #{order._id?.slice(-8).toUpperCase()}
                    </span>
                    <Badge tone={getStatusTone(order.status)}>
                      {order.status}
                    </Badge>
                    <span className="text-xs text-gray-400 ml-auto">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>

                  {/* Customer info */}
                  <p className="text-xs text-gray-600 truncate">
                    Customer:{' '}
                    <strong className="text-gray-800">
                      {order.userId?.name || 'Anonymous User'}
                    </strong>{' '}
                    <span className="hidden sm:inline">({order.userId?.email || 'N/A'})</span>
                  </p>

                  {/* Bottom row: total + actions */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-xs text-gray-400 block">Total Amount</span>
                      <span className="text-base font-bold text-gray-900">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {possibleTransitions.length > 0 && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleOpenStatusModal(order)}
                        >
                          Update Status
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => toggleExpand(order._id)}
                      >
                        {isExpanded ? 'Hide ▲' : 'Details ▼'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expandable Order Details */}
                {isExpanded && (
                  <div className="bg-gray-50/70 p-4 sm:p-5 border-t border-gray-100 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Shipping Info */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                          Shipping Address
                        </h4>
                        <div className="text-xs text-gray-700 bg-white p-3 rounded-lg border border-gray-200/70 space-y-1">
                          <p className="font-medium text-gray-900">
                            {order.shippingAddress?.line1 || 'No street address provided'}
                          </p>
                          <p>
                            {order.shippingAddress?.city}{' '}
                            {order.shippingAddress?.pincode ? `- ${order.shippingAddress.pincode}` : ''}
                          </p>
                          {order.userId?.phone && (
                            <p className="text-gray-500 pt-1">
                              Phone: {order.userId.phone}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Payment & Delivery Details */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                          Payment & Metadata
                        </h4>
                        <div className="text-xs text-gray-700 bg-white p-3 rounded-lg border border-gray-200/70 space-y-1">
                          <p>
                            Payment Method:{' '}
                            <span className="font-medium uppercase">
                              {order.paymentMethod || 'Online'}
                            </span>
                          </p>
                          <p>
                            Payment Status:{' '}
                            <Badge
                              tone={order.paymentStatus === 'paid' ? 'success' : 'warning'}
                              className="capitalize ml-1"
                            >
                              {order.paymentStatus || 'Pending'}
                            </Badge>
                          </p>
                          {order.paymentReference && (
                            <p className="text-gray-400">
                              Ref: {order.paymentReference}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Items Table — scrollable on mobile */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                        Ordered Items ({order.items?.length || 0})
                      </h4>
                      <div className="bg-white rounded-lg border border-gray-200/70 overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100 text-xs">
                          <thead className="bg-gray-50 text-gray-400 uppercase">
                            <tr>
                              <th className="px-3 sm:px-4 py-2 text-left font-medium">Item</th>
                              <th className="px-3 sm:px-4 py-2 text-right font-medium">Price</th>
                              <th className="px-3 sm:px-4 py-2 text-center font-medium">Qty</th>
                              <th className="px-3 sm:px-4 py-2 text-right font-medium">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-gray-700">
                            {order.items?.map((item, idx) => (
                              <tr key={idx}>
                                <td className="px-3 sm:px-4 py-2.5 font-medium text-gray-900 max-w-[140px] sm:max-w-none truncate">
                                  {item.name}
                                </td>
                                <td className="px-3 sm:px-4 py-2.5 text-right whitespace-nowrap">
                                  {formatCurrency(item.price)}
                                </td>
                                <td className="px-3 sm:px-4 py-2.5 text-center font-bold">
                                  {item.quantity}
                                </td>
                                <td className="px-3 sm:px-4 py-2.5 text-right font-bold text-gray-900 whitespace-nowrap">
                                  {formatCurrency((item.price || 0) * (item.quantity || 1))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
          <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Page {orderPagination.page} of {orderPagination.totalPages} (
              {orderPagination.total} total orders)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage >= orderPagination.totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Status Update Modal */}
      <Modal
        open={!!selectedOrderForStatus}
        onClose={() => setSelectedOrderForStatus(null)}
        title="Update Order Status"
      >
        <form onSubmit={handleUpdateStatus} className="space-y-4 py-2">
          {statusUpdateError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-md">
              {statusUpdateError}
            </div>
          )}

          <p className="text-sm text-gray-600">
            Current Status:{' '}
            <strong className="text-gray-900">
              {selectedOrderForStatus?.status}
            </strong>
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select New Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {availableTransitions[selectedOrderForStatus?.status]?.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSelectedOrderForStatus(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={actionLoading}>
              Confirm Status Change
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Orders;
