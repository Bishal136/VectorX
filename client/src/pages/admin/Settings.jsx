import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchSettings,
  updateSettings,
} from '../../features/admin/adminSlice';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import { toast } from 'react-toastify';

const Settings = () => {
  const dispatch = useDispatch();
  const { settings, status } = useSelector((state) => state.admin);

  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [commissionRate, setCommissionRate] = useState(10);
  const [couponCodes, setCouponCodes] = useState([]);

  // Coupon modal state
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discount: 10,
    discountType: 'percentage',
    minOrderAmount: 0,
    expiresAt: '',
    isActive: true,
    usageLimit: '',
  });

  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  useEffect(() => {
    if (settings) {
      setDeliveryCharge(settings.deliveryCharge ?? 0);
      setCommissionRate(settings.commissionRate ?? 10);
      setCouponCodes(settings.couponCodes || []);
    }
  }, [settings]);

  const handleSaveGeneralSettings = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await dispatch(
        updateSettings({
          deliveryCharge: Number(deliveryCharge),
          commissionRate: Number(commissionRate),
          couponCodes,
        })
      ).unwrap();
      toast.success('Platform global settings updated successfully!');
    } catch (err) {
      toast.error(err || 'Failed to update settings');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenAddCoupon = () => {
    setNewCoupon({
      code: '',
      discount: 10,
      discountType: 'percentage',
      minOrderAmount: 0,
      expiresAt: '',
      isActive: true,
      usageLimit: '',
    });
    setCouponModalOpen(true);
  };

  const handleAddCouponSubmit = (e) => {
    e.preventDefault();
    if (!newCoupon.code.trim()) {
      toast.error('Coupon code is required');
      return;
    }

    const formatted = {
      code: newCoupon.code.trim().toUpperCase(),
      discount: Number(newCoupon.discount),
      discountType: newCoupon.discountType,
      minOrderAmount: Number(newCoupon.minOrderAmount) || 0,
      expiresAt: newCoupon.expiresAt ? new Date(newCoupon.expiresAt).toISOString() : undefined,
      isActive: newCoupon.isActive,
      usageLimit: newCoupon.usageLimit ? Number(newCoupon.usageLimit) : null,
      usedCount: 0,
    };

    setCouponCodes((prev) => [...prev, formatted]);
    setCouponModalOpen(false);
    toast.info(`Coupon ${formatted.code} added. Click "Save Platform Settings" to persist changes.`);
  };

  const handleDeleteCoupon = (index) => {
    setCouponCodes((prev) => prev.filter((_, i) => i !== index));
    toast.info('Coupon removed. Remember to save settings.');
  };

  const handleToggleCouponActive = (index) => {
    setCouponCodes((prev) =>
      prev.map((c, i) => (i === index ? { ...c, isActive: !c.isActive } : c))
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            Platform Settings & Commission
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Configure global fee rules, delivery parameters, and manage platform discount coupons.
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveGeneralSettings} className="space-y-4 sm:space-y-6">
        {/* Financial & Delivery Parameters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-4 sm:p-6 space-y-4 sm:space-y-5">
          <h2 className="text-sm sm:text-base font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
            <span>💳</span> Global Financial & Delivery Parameters
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-800 mb-1">
                Default Delivery Charge (৳)
              </label>
              <p className="text-[11px] sm:text-xs text-gray-500 mb-2">
                Flat shipping fee applied to customer checkouts unless free shipping conditions are met.
              </p>
              <div className="relative rounded-lg shadow-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-gray-500 text-xs sm:text-sm font-bold">৳</span>
                </div>
                <input
                  type="number"
                  min="0"
                  required
                  value={deliveryCharge}
                  onChange={(e) => setDeliveryCharge(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 pl-8 pr-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-800 mb-1">
                Platform Commission Rate (%)
              </label>
              <p className="text-[11px] sm:text-xs text-gray-500 mb-2">
                Percentage deducted from seller order payouts as platform transaction fee.
              </p>
              <div className="relative rounded-lg shadow-xs">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  required
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-gray-500 text-xs sm:text-sm font-bold">%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-4 bg-indigo-50/50 rounded-lg text-xs text-indigo-900 border border-indigo-100 flex items-start gap-2.5">
            <span className="text-base shrink-0">💡</span>
            <div>
              <strong>Payout Preview:</strong> On an order of ৳1,000, VectorX retains{' '}
              <strong>৳{((1000 * (Number(commissionRate) || 0)) / 100).toFixed(0)}</strong> ({commissionRate}%), and the seller receives{' '}
              <strong>৳{(1000 - (1000 * (Number(commissionRate) || 0)) / 100).toFixed(0)}</strong>.
            </div>
          </div>
        </div>

        {/* Coupons Management */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
                <span>🎟️</span> Platform Coupon Codes
              </h2>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                Active discounts applied during checkout
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full sm:w-auto justify-center text-xs"
              onClick={handleOpenAddCoupon}
            >
              <span className="mr-1 font-bold">+</span> Add Coupon
            </Button>
          </div>

          {couponCodes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                    <th className="py-2.5 px-3 whitespace-nowrap">Code</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Discount</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Min Order</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Expires</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {couponCodes.map((c, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/75">
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-700 text-xs sm:text-sm whitespace-nowrap">
                        {c.code}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-gray-800 whitespace-nowrap">
                        {c.discountType === 'percentage' ? `${c.discount}%` : `৳${c.discount}`}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap">
                        ৳{c.minOrderAmount || 0}
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">
                        {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleCouponActive(idx)}
                          className="cursor-pointer"
                        >
                          <Badge tone={c.isActive ? 'success' : 'neutral'}>
                            {c.isActive ? 'Active' : 'Disabled'}
                          </Badge>
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDeleteCoupon(idx)}
                          className="text-red-500 hover:text-red-700 font-bold px-2 py-1 rounded cursor-pointer"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 sm:p-8 text-center text-gray-500 text-xs bg-gray-50 rounded-lg border border-dashed border-gray-300">
              No active coupon codes configured. Click "+ Add Coupon" to create one.
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={actionLoading}
            className="w-full sm:w-auto px-8 font-semibold shadow-xs justify-center text-sm"
          >
            Save Platform Settings
          </Button>
        </div>
      </form>

      {/* Add Coupon Modal */}
      <Modal
        open={couponModalOpen}
        onClose={() => setCouponModalOpen(false)}
        title="Create Platform Coupon Code"
      >
        <form onSubmit={handleAddCouponSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Coupon Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. VECTORX50"
              value={newCoupon.code}
              onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm font-mono uppercase focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Discount Type
              </label>
              <select
                value={newCoupon.discountType}
                onChange={(e) => setNewCoupon({ ...newCoupon, discountType: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (৳)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Discount Value <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={newCoupon.discount}
                onChange={(e) => setNewCoupon({ ...newCoupon, discount: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Minimum Order Amount (৳)
              </label>
              <input
                type="number"
                min="0"
                value={newCoupon.minOrderAmount}
                onChange={(e) => setNewCoupon({ ...newCoupon, minOrderAmount: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Expiry Date (Optional)
              </label>
              <input
                type="date"
                value={newCoupon.expiresAt}
                onChange={(e) => setNewCoupon({ ...newCoupon, expiresAt: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isCouponActive"
              checked={newCoupon.isActive}
              onChange={(e) => setNewCoupon({ ...newCoupon, isActive: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
            />
            <label htmlFor="isCouponActive" className="text-xs font-medium text-gray-800 cursor-pointer">
              Active immediately
            </label>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3">
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="w-full sm:w-auto justify-center text-xs sm:text-sm"
              onClick={() => setCouponModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full sm:w-auto justify-center text-xs sm:text-sm"
            >
              Add Coupon
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Settings;

