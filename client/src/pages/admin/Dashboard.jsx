import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchDashboardStats, fetchSellers } from '../../features/admin/adminSlice';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

const statusToneMap = {
  Pending: 'warning',
  Processing: 'info',
  Shipped: 'info',
  Delivered: 'success',
  Cancelled: 'danger',
  Refunded: 'neutral',
};

const Dashboard = () => {
  const dispatch = useDispatch();
  const { dashboardStats, sellers, status } = useSelector((state) => state.admin);

  useEffect(() => {
    dispatch(fetchDashboardStats());
    dispatch(fetchSellers({ verificationStatus: 'pending', limit: 5 }));
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchDashboardStats());
    dispatch(fetchSellers({ verificationStatus: 'pending', limit: 5 }));
  };

  const pendingSellersCount =
    sellers?.data?.filter((s) => s.verificationStatus === 'pending').length || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Platform Admin Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            System overview, platform revenue, seller verification queue, and order fulfillment oversight.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="md" onClick={handleRefresh}>
            🔄 Refresh Stats
          </Button>
          <Link to="/admin/sellers">
            <Button variant="primary" size="md">
              Verify Sellers ({pendingSellersCount})
            </Button>
          </Link>
        </div>
      </div>

      {/* KYC Alert Banner */}
      {pendingSellersCount > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xl shrink-0 font-bold">
              ⏳
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                {pendingSellersCount} Seller Application{pendingSellersCount > 1 ? 's' : ''} Awaiting KYC Verification
              </h3>
              <p className="text-xs text-amber-700 mt-0.5">
                New shop registrations require document and location approval before their products appear in nearby searches.
              </p>
            </div>
          </div>
          <Link to="/admin/sellers" className="shrink-0">
            <Button variant="primary" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
              Review Queue →
            </Button>
          </Link>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Platform GMV
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
              💰
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              ৳{(dashboardStats?.totalRevenue || 0).toLocaleString()}
            </span>
            <p className="text-xs text-gray-500 mt-1">Total value of all processed orders</p>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Orders
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
              📦
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              {(dashboardStats?.totalOrders || 0).toLocaleString()}
            </span>
            <p className="text-xs text-gray-500 mt-1">Lifetime customer orders placed</p>
          </div>
        </div>

        {/* Total Sellers */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Registered Sellers
            </span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg">
              🏪
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              {(dashboardStats?.totalSellers || 0).toLocaleString()}
            </span>
            <p className="text-xs text-gray-500 mt-1">
              {pendingSellersCount > 0 ? (
                <span className="text-amber-600 font-medium">{pendingSellersCount} pending KYC approval</span>
              ) : (
                'All active shops'
              )}
            </p>
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Users
            </span>
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-lg">
              👥
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              {(dashboardStats?.totalUsers || 0).toLocaleString()}
            </span>
            <p className="text-xs text-gray-500 mt-1">Buyers, sellers & administrators</p>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          to="/admin/users"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:border-indigo-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-xl font-bold group-hover:scale-105 transition-transform">
              👥
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">User Management</h3>
              <p className="text-xs text-gray-500">Manage buyer accounts, roles & block status</p>
            </div>
          </div>
        </Link>

        <Link
          to="/admin/categories"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:border-indigo-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold group-hover:scale-105 transition-transform">
              📂
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Categories & Hierarchy</h3>
              <p className="text-xs text-gray-500">Add subcategories, sort orders & SEO metadata</p>
            </div>
          </div>
        </Link>

        <Link
          to="/admin/settings"
          className="bg-white p-5 rounded-xl border border-gray-200 hover:border-indigo-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold group-hover:scale-105 transition-transform">
              ⚙️
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Platform Settings</h3>
              <p className="text-xs text-gray-500">Commission rates, delivery fees & coupon codes</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Orders Overview */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Recent Platform Orders</h2>
            <p className="text-xs text-gray-500 mt-0.5">Latest customer transactions across all stores</p>
          </div>
          <Link to="/admin/orders">
            <Button variant="secondary" size="sm">
              View All Orders →
            </Button>
          </Link>
        </div>

        {dashboardStats?.recentOrders && dashboardStats.recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 text-xs">
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dashboardStats.recentOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50/75 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-gray-700">
                      #{order._id.substring(order._id.length - 8).toUpperCase()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">
                        {order.userId?.name || 'Customer'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {order.userId?.email || ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {order.items?.length || 0} item{(order.items?.length || 0) > 1 ? 's' : ''}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      ৳{(order.totalAmount || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <Badge tone={statusToneMap[order.status] || 'neutral'}>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 text-sm">
            No platform orders recorded yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
