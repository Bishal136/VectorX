import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchDashboardStats,
  fetchEarnings,
  fetchSellerProfile,
} from '../../features/seller/sellerSlice';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';

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

const SellerDashboard = () => {
  const dispatch = useDispatch();
  const { profile, dashboardStats, earnings, status, error } = useSelector(
    (state) => state.seller
  );
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  useEffect(() => {
    dispatch(fetchSellerProfile());
    dispatch(fetchDashboardStats());
    dispatch(fetchEarnings(selectedPeriod));
  }, [dispatch, selectedPeriod]);

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    dispatch(fetchEarnings(period));
  };

  const isLoading = status === 'loading' && !dashboardStats;

  // If user hasn't registered as seller yet
  const needsRegistration =
    profile === null &&
    status === 'failed' &&
    (error?.toLowerCase().includes('register') ||
      error?.toLowerCase().includes('not found') ||
      error?.toLowerCase().includes('not registered'));

  if (needsRegistration) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 sm:p-12">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            🏪
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Start Selling on VectorX
          </h2>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            Register your shop, set your location for hyperlocal ranking, and reach buyers in your area faster.
          </p>
          <Link to="/seller/register">
            <Button size="lg" variant="primary">
              Register Your Shop Now
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {profile?.shopName ? `${profile.shopName} Dashboard` : 'Seller Dashboard'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Overview of your store's sales, stock levels, and order fulfillment.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/seller/products">
            <Button variant="primary" size="md">
              <span className="mr-1.5">+</span> Add Product
            </Button>
          </Link>
          <Link to="/seller/orders">
            <Button variant="secondary" size="md">
              View Orders
            </Button>
          </Link>
        </div>
      </div>

      {/* Verification Status Alerts */}
      {profile && profile.verificationStatus === 'pending' && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
          <div className="flex items-start">
            <div className="shrink-0 text-amber-500 text-xl mr-3">⏳</div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-amber-800">
                Verification In Progress
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                Your seller application is under review by our admin team. Once approved, your products will be visible to nearby buyers.
              </p>
            </div>
            <Link to="/seller/shop" className="text-xs font-semibold text-amber-800 underline shrink-0 ml-3">
              View Details
            </Link>
          </div>
        </div>
      )}

      {profile && profile.verificationStatus === 'rejected' && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
          <div className="flex items-start">
            <div className="shrink-0 text-red-500 text-xl mr-3">⚠️</div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-red-800">
                Application Needs Attention
              </h3>
              <p className="text-sm text-red-700 mt-1">
                Reason: {profile.rejectionReason || 'Please review your shop details and re-submit.'}
              </p>
            </div>
            <Link to="/seller/shop" className="ml-3 shrink-0">
              <Button size="sm" variant="danger">
                Edit & Resubmit
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 h-32 border border-gray-100" />
          ))}
        </div>
      )}

      {/* Key Metric Stat Cards */}
      {!isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Total Revenue */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-200/80 shadow-xs flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 truncate">
                Revenue
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(dashboardStats?.totalRevenue)}
              </h3>
              <span className="text-xs text-green-600 font-medium mt-1 inline-block">
                Completed
              </span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-lg sm:text-xl shrink-0 ml-2">
              💰
            </div>
          </div>

          {/* Total Orders */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-200/80 shadow-xs flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 truncate">
                Orders
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                {dashboardStats?.totalOrders || 0}
              </h3>
              <span className="text-xs text-gray-500 mt-1 inline-block">
                All time
              </span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-lg sm:text-xl shrink-0 ml-2">
              📦
            </div>
          </div>

          {/* Pending Orders */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-200/80 shadow-xs flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 truncate">
                Pending
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-amber-600 mt-1">
                {dashboardStats?.pendingOrders || 0}
              </h3>
              <span className="text-xs text-amber-600 font-medium mt-1 inline-block">
                To fulfill
              </span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-lg sm:text-xl shrink-0 ml-2">
              ⏳
            </div>
          </div>

          {/* Total Products */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-200/80 shadow-xs flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 truncate">
                Catalog
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                {dashboardStats?.totalProducts || 0}
              </h3>
              <span className="text-xs text-indigo-600 font-medium mt-1 inline-block">
                Products
              </span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-lg sm:text-xl shrink-0 ml-2">
              🏷️
            </div>
          </div>
        </div>
      )}

      {/* Pending Return Requests Notification Banner */}
      {dashboardStats?.pendingReturnRequests > 0 && (
        <div className="bg-amber-50 border border-amber-300/80 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-lg font-bold shrink-0">
                🔄
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-amber-900">
                  {dashboardStats.pendingReturnRequests} Pending Return & Refund Request{dashboardStats.pendingReturnRequests > 1 ? 's' : ''}
                </h3>
                <p className="text-xs text-amber-800 mt-0.5">
                  Customers have requested returns on delivered orders. Review customer notes and approve or decline them.
                </p>
              </div>
            </div>
            <Link to="/seller/orders" className="shrink-0">
              <Button size="sm" variant="primary" className="bg-[#124B38] hover:bg-[#0d3628] rounded-xl text-xs font-bold">
                Review Returns →
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Low Stock Alert Section */}
      {dashboardStats?.lowStockProducts && dashboardStats.lowStockProducts.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-orange-600 text-lg">⚠️</span>
              <h3 className="text-sm sm:text-base font-semibold text-orange-900">
                Low Stock Alert ({dashboardStats.lowStockProducts.length} items)
              </h3>
            </div>
            <Link
              to="/seller/products"
              className="text-xs font-semibold text-orange-800 hover:text-orange-900 underline whitespace-nowrap"
            >
              Manage →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {dashboardStats.lowStockProducts.map((prod) => (
              <div
                key={prod._id}
                className="bg-white p-3 rounded-lg border border-orange-200/70 flex items-center justify-between"
              >
                <div className="truncate mr-2">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {prod.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    Threshold: {prod.lowStockThreshold || 5}
                  </p>
                </div>
                <Badge tone="danger" className="shrink-0">
                  {prod.stock} left
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Earnings & Performance Section */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Earnings & Sales Performance
            </h2>
            <p className="text-xs text-gray-500">
              Revenue overview filtered by timeframe
            </p>
          </div>
          <div className="inline-flex rounded-lg bg-gray-100 p-1 self-start sm:self-auto">
            {['week', 'month', 'year'].map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => handlePeriodChange(period)}
                className={`px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-md capitalize transition-colors ${
                  selectedPeriod === period
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {period === 'week' ? '7 Days' : period === 'month' ? '30 Days' : 'Year'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary Box */}
          <div className="space-y-4 bg-gray-50/70 rounded-xl p-4 sm:p-5 border border-gray-100">
            <div>
              <span className="text-xs font-medium text-gray-500">Period Earnings</span>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">
                {formatCurrency(earnings?.totalEarnings)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200/60">
              <div>
                <span className="text-xs text-gray-500">Orders</span>
                <p className="text-lg font-semibold text-gray-800 mt-0.5">
                  {earnings?.orderCount || 0}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Avg. Order</span>
                <p className="text-lg font-semibold text-gray-800 mt-0.5">
                  {formatCurrency(earnings?.averageOrderValue)}
                </p>
              </div>
            </div>
            <div className="pt-3">
              <Link to="/seller/shop">
                <Button size="sm" variant="secondary" className="w-full">
                  View Payout & Bank Info
                </Button>
              </Link>
            </div>
          </div>

          {/* Daily breakdown */}
          <div className="lg:col-span-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              Daily Breakdown
            </h4>
            {earnings?.dailyEarnings && earnings.dailyEarnings.length > 0 ? (
              <div className="space-y-2">
                {earnings.dailyEarnings.slice(-7).map((day) => {
                  const maxAmt = Math.max(
                    ...earnings.dailyEarnings.map((d) => d.amount),
                    1
                  );
                  const pct = Math.min(100, Math.round((day.amount / maxAmt) * 100));
                  return (
                    <div key={day.date} className="flex items-center gap-2 sm:gap-3 text-xs">
                      <span className="w-16 sm:w-20 text-gray-500 shrink-0">
                        {formatDate(day.date)}
                      </span>
                      <div className="flex-1 bg-gray-100 h-4 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all"
                          style={{ width: `${Math.max(5, pct)}%` }}
                        />
                      </div>
                      <span className="w-20 sm:w-24 text-right font-semibold text-gray-800 shrink-0">
                        {formatCurrency(day.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">
                No revenue recorded in this period.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Top Products & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900">Top Selling Products</h3>
            <Link to="/seller/products" className="text-xs font-semibold text-indigo-600 hover:underline">
              All Products →
            </Link>
          </div>

          {dashboardStats?.topProducts && dashboardStats.topProducts.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {dashboardStats.topProducts.map((p, idx) => (
                <div key={p.productId || idx} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.quantity} units sold</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-900 shrink-0 ml-2">
                    {formatCurrency(p.revenue)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">
              No sales data recorded yet.
            </p>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900">Recent Orders</h3>
            <Link to="/seller/orders" className="text-xs font-semibold text-indigo-600 hover:underline">
              All Orders →
            </Link>
          </div>

          {dashboardStats?.recentOrders && dashboardStats.recentOrders.length > 0 ? (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider">
                      <th className="pb-2 font-medium">Order</th>
                      <th className="pb-2 font-medium">Items</th>
                      <th className="pb-2 font-medium">Total</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dashboardStats.recentOrders.map((ord) => (
                      <tr key={ord._id} className="hover:bg-gray-50/50">
                        <td className="py-2.5 font-medium text-gray-900">
                          #{ord._id?.slice(-6).toUpperCase()}
                        </td>
                        <td className="py-2.5 text-gray-600">
                          {ord.items?.length || 1} item(s)
                        </td>
                        <td className="py-2.5 font-bold text-gray-900">
                          {formatCurrency(ord.totalAmount)}
                        </td>
                        <td className="py-2.5">
                          <Badge tone={getStatusTone(ord.status)}>{ord.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-gray-100">
                {dashboardStats.recentOrders.map((ord) => (
                  <div key={ord._id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        #{ord._id?.slice(-6).toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {ord.items?.length || 1} item(s) · {formatCurrency(ord.totalAmount)}
                      </p>
                    </div>
                    <Badge tone={getStatusTone(ord.status)}>{ord.status}</Badge>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">
              No recent orders found.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;