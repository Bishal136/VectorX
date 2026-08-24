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
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            Platform Admin Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            System overview, platform revenue, seller verification queue, and order fulfillment oversight.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            className="flex-1 sm:flex-none justify-center text-xs sm:text-sm"
          >
            🔄 Refresh
          </Button>
          <Link to="/admin/sellers" className="flex-1 sm:flex-none">
            <Button
              variant="primary"
              size="sm"
              className="w-full justify-center text-xs sm:text-sm whitespace-nowrap"
            >
              Verify Sellers ({pendingSellersCount})
            </Button>
          </Link>
        </div>
      </div>

      {/* KYC Alert Banner */}
      {pendingSellersCount > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-3.5 sm:p-4 rounded-r-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-lg sm:text-xl shrink-0 font-bold">
              ⏳
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-amber-900">
                {pendingSellersCount} Seller Application{pendingSellersCount > 1 ? 's' : ''} Awaiting KYC Verification
              </h3>
              <p className="text-[11px] sm:text-xs text-amber-700 mt-0.5">
                New shop registrations require document and location approval before their products appear in nearby searches.
              </p>
            </div>
          </div>
          <Link to="/admin/sellers" className="shrink-0 w-full sm:w-auto">
            <Button
              variant="primary"
              size="sm"
              className="w-full justify-center bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm"
            >
              Review Queue →
            </Button>
          </Link>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        {/* Total Revenue */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Platform GMV
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-base sm:text-lg">
              💰
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900">
              ৳{(dashboardStats?.totalRevenue || 0).toLocaleString()}
            </span>
            <p className="text-[11px] sm:text-xs text-gray-500 mt-1">Total value of all processed orders</p>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Orders
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-base sm:text-lg">
              📦
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900">
              {(dashboardStats?.totalOrders || 0).toLocaleString()}
            </span>
            <p className="text-[11px] sm:text-xs text-gray-500 mt-1">Lifetime customer orders placed</p>
          </div>
        </div>

        {/* Total Sellers */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Registered Sellers
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-base sm:text-lg">
              🏪
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900">
              {(dashboardStats?.totalSellers || 0).toLocaleString()}
            </span>
            <p className="text-[11px] sm:text-xs text-gray-500 mt-1">
              {pendingSellersCount > 0 ? (
                <span className="text-amber-600 font-medium">{pendingSellersCount} pending KYC approval</span>
              ) : (
                'All active shops'
              )}
            </p>
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Users
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-base sm:text-lg">
              👥
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900">
              {(dashboardStats?.totalUsers || 0).toLocaleString()}
            </span>
            <p className="text-[11px] sm:text-xs text-gray-500 mt-1">Buyers, sellers & administrators</p>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-5">
        <Link
          to="/admin/users"
          className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 hover:border-indigo-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-lg sm:text-xl font-bold group-hover:scale-105 transition-transform shrink-0">
              👥
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-xs sm:text-sm">User Management</h3>
              <p className="text-[11px] sm:text-xs text-gray-500">Manage buyer accounts, roles & block status</p>
            </div>
          </div>
        </Link>

        <Link
          to="/admin/categories"
          className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 hover:border-indigo-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-lg sm:text-xl font-bold group-hover:scale-105 transition-transform shrink-0">
              📂
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-xs sm:text-sm">Categories & Hierarchy</h3>
              <p className="text-[11px] sm:text-xs text-gray-500">Add subcategories, sort orders & SEO metadata</p>
            </div>
          </div>
        </Link>

        <Link
          to="/admin/settings"
          className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 hover:border-indigo-500 hover:shadow-md transition-all group sm:col-span-2 md:col-span-1"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg sm:text-xl font-bold group-hover:scale-105 transition-transform shrink-0">
              ⚙️
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-xs sm:text-sm">Platform Settings</h3>
              <p className="text-[11px] sm:text-xs text-gray-500">Commission rates, delivery fees & coupon codes</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Orders Overview */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-3.5 sm:p-5 border-b border-gray-200 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-gray-900">Recent Platform Orders</h2>
            <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">Latest customer transactions across all stores</p>
          </div>
          <Link to="/admin/orders" className="shrink-0">
            <Button variant="secondary" size="sm" className="text-xs">
              View All →
            </Button>
          </Link>
        </div>

        {dashboardStats?.recentOrders && dashboardStats.recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 text-[11px] sm:text-xs">
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Order ID</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Customer</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Items</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Total Amount</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dashboardStats.recentOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50/75 transition-colors">
                    <td className="py-3 px-3 sm:px-4 font-mono text-xs text-gray-700 whitespace-nowrap font-bold text-indigo-600">
                      #{order._id.substring(order._id.length - 8).toUpperCase()}
                    </td>
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {order.userId?.name || 'Customer'}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {order.userId?.email || ''}
                      </div>
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-gray-600 whitespace-nowrap">
                      {order.items?.length || 0} item{(order.items?.length || 0) > 1 ? 's' : ''}
                    </td>
                    <td className="py-3 px-3 sm:px-4 font-semibold text-gray-900 whitespace-nowrap">
                      ৳{(order.totalAmount || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      <Badge tone={statusToneMap[order.status] || 'neutral'}>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-xs text-gray-500 whitespace-nowrap">
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

