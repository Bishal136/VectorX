import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    dispatch(
      fetchAdminOrders({
        page: currentPage,
        limit: 15,
        status: orderStatus || undefined,
        paymentStatus: paymentStatus || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })
    );
  }, [dispatch, currentPage, orderStatus, paymentStatus, startDate, endDate]);

  const handleOpenDetails = async (order) => {
    setSelectedOrder(order);
    setViewDetailsOpen(true);
    try {
      const res = await dispatch(fetchAdminOrderDetails(order._id)).unwrap();
      if (res) setSelectedOrder(res);
    } catch {
      // Retain basic order info
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
      await dispatch(
        updateAdminOrderStatus({
          orderId: selectedOrder._id,
          status: newStatus,
          notes: adminNotes.trim() || undefined,
        })
      ).unwrap();
      toast.success(`Order #${selectedOrder._id.substring(selectedOrder._id.length - 6)} status updated to ${newStatus}`);
      setStatusModalOpen(false);
      dispatch(fetchAdminOrders({ page: currentPage, limit: 15 }));
    } catch (err) {
      toast.error(err || 'Failed to update order status');
    } finally {
      setActionLoading(false);
    }
  };

  const orderList = orders?.data || [];
  const pagination = orders?.pagination || { page: 1, totalPages: 1, total: 0 };

  const totalGMV = orderList.reduce((acc, o) => acc + (o.totalAmount || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Platform Orders & Oversight
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor transaction flow, inspect order items, manage disputes, and override lifecycle status.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm font-medium">
            Orders: <span className="font-bold text-gray-900">{pagination.total || pagination.totalResults || orderList.length}</span>
          </div>
        </div>
      </div>

      {/* Filter and Date Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Order Status</label>
            <select
              value={orderStatus}
              onChange={(e) => {
                setOrderStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">All Order Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Status</label>
            <select
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">All Payments</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {(orderStatus || paymentStatus || startDate || endDate) && (
          <div className="flex justify-end pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setOrderStatus('');
                setPaymentStatus('');
                setStartDate('');
                setEndDate('');
                setCurrentPage(1);
              }}
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {orderList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 text-xs">
                  <th className="py-3.5 px-4">Order ID</th>
                  <th className="py-3.5 px-4">Buyer Details</th>
                  <th className="py-3.5 px-4">Items</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4">Order Status</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orderList.map((o) => (
                  <tr key={o._id} className="hover:bg-gray-50/75 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-xs text-indigo-700">
                      #{o._id.substring(o._id.length - 8).toUpperCase()}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900">{o.userId?.name || 'Guest/User'}</div>
                      <div className="text-xs text-gray-500">{o.userId?.email || o.shippingAddress?.email || 'N/A'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-600">
                      {o.items?.length || 0} item{(o.items?.length || 0) > 1 ? 's' : ''}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      ৳{(o.totalAmount || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge tone={paymentStatusTones[o.paymentStatus] || 'neutral'}>
                        {(o.paymentStatus || 'pending').toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge tone={orderStatusTones[o.status] || 'neutral'}>
                        {o.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-500">
                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenDetails(o)}
                        >
                          Details
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
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
          <div className="p-12 text-center text-gray-500 text-sm">
            {status === 'loading' ? 'Loading orders...' : 'No orders found matching your filters.'}
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-gray-50/50">
            <div className="text-xs text-gray-500">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              >
                ← Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
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
        title="Platform Order Details"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div>
                <span className="font-mono font-bold text-indigo-700 text-sm">
                  #{selectedOrder._id}
                </span>
                <p className="text-xs text-gray-500">
                  Placed on {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : 'N/A'}
                </p>
              </div>
              <Badge tone={orderStatusTones[selectedOrder.status] || 'neutral'}>
                {selectedOrder.status}
              </Badge>
            </div>

            {/* Buyer & Shipping Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-gray-50 p-3 rounded-xl border border-gray-200">
              <div>
                <h4 className="font-bold text-gray-700 uppercase tracking-wider mb-1">Customer</h4>
                <div className="font-semibold text-gray-900">{selectedOrder.userId?.name || 'N/A'}</div>
                <div className="text-gray-600">{selectedOrder.userId?.email || 'N/A'}</div>
                <div className="text-gray-600">{selectedOrder.userId?.phone || selectedOrder.shippingAddress?.phone || 'N/A'}</div>
              </div>
              <div>
                <h4 className="font-bold text-gray-700 uppercase tracking-wider mb-1">Shipping Destination</h4>
                <div className="text-gray-800 font-medium">
                  {selectedOrder.shippingAddress?.fullName || selectedOrder.shippingAddress?.name || ''}
                </div>
                <div className="text-gray-600">
                  {selectedOrder.shippingAddress?.street || selectedOrder.shippingAddress?.line1}, {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.pincode}
                </div>
              </div>
            </div>

            {/* Items List */}
            <div>
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Order Items ({selectedOrder.items?.length || 0})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                {(selectedOrder.items || []).map((item, i) => (
                  <div key={i} className="p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      {item.productId?.images?.[0]?.url ? (
                        <img
                          src={item.productId.images[0].url}
                          alt={item.name}
                          className="w-10 h-10 object-cover rounded-lg border border-gray-200"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-sm">
                          📦
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-gray-900">{item.name}</div>
                        <div className="text-gray-500">Qty: {item.quantity} × ৳{item.price}</div>
                      </div>
                    </div>
                    <div className="font-bold text-gray-900">
                      ৳{(item.quantity * item.price).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Summary */}
            <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-sm">
              <span className="font-semibold text-gray-700">Total Order GMV</span>
              <span className="text-lg font-extrabold text-gray-900">
                ৳{(selectedOrder.totalAmount || 0).toLocaleString()}
              </span>
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <Button variant="secondary" size="md" onClick={() => setViewDetailsOpen(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setViewDetailsOpen(false);
                  handleOpenStatusModal(selectedOrder);
                }}
              >
                Override Status
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Admin Status Override Modal */}
      <Modal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Admin Status Override"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Override lifecycle status for Order <strong className="font-mono text-indigo-700">#{selectedOrder._id}</strong>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Target Order Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
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
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Admin Notes / Reason (Audit Log)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Disputed return approved by support team"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setStatusModalOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
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
