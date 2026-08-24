import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { 
  fetchCart,
  removeFromCart, 
  updateCartItem, 
  clearCart 
} from '../../features/cart/cartSlice';
import useAuth from '../../hooks/useAuth';
import axiosInstance from '../../services/axiosInstance';
import { toast } from 'react-toastify';

// --- Local Icons ---
const ShoppingBagIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);

const CreditCardIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const CheckCircleIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TrashIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const DeliveryIcon = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
  </svg>
);

const StoreBoxIcon = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const ReturnTruckIcon = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 15v-1a4 4 0 00-4-4H4m0 0l3 3m-3-3l3-3m9 14a2 2 0 100-4 2 2 0 000 4zm-8 0a2 2 0 100-4 2 2 0 000 4z" />
  </svg>
);

const Cart = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { items = [], status } = useSelector((state) => state.cart);

  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [updatingItemId, setUpdatingItemId] = useState(null);

  // Fetch fresh cart on mount if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchCart());
    }
  }, [dispatch, isAuthenticated]);

  // Sync selected items when cart items change (default select all)
  useEffect(() => {
    if (items.length > 0) {
      const validIds = items.map((i) => i._id || i.productId?._id || i.productId);
      setSelectedItemIds((prev) => {
        if (prev.length === 0) return validIds;
        // Keep existing selections that still exist
        const retained = prev.filter((id) => validIds.includes(id));
        return retained.length > 0 ? retained : validIds;
      });
    } else {
      setSelectedItemIds([]);
    }
  }, [items]);

  const totalItemCount = items.reduce((acc, item) => acc + (item.quantity || 1), 0);

  // Filter selected items
  const selectedItems = items.filter((item) => {
    const key = item._id || item.productId?._id || item.productId;
    return selectedItemIds.includes(key);
  });

  const isAllSelected = items.length > 0 && selectedItems.length === items.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(items.map((i) => i._id || i.productId?._id || i.productId));
    }
  };

  const toggleSelectItem = (itemKey) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemKey) ? prev.filter((id) => id !== itemKey) : [...prev, itemKey]
    );
  };

  // Calculate subtotal for selected items
  const subtotal = selectedItems.reduce((acc, item) => {
    const product = typeof item.productId === 'object' && item.productId !== null ? item.productId : {};
    const price = Number(item.price ?? product.price ?? 0);
    return acc + price * (item.quantity || 1);
  }, 0);

  // Shipping rules: Orders >= ৳100 get free shipping, else ৳50
  const freeShippingThreshold = 100;
  const isFreeShipping = subtotal >= freeShippingThreshold;
  const shippingCost = selectedItems.length === 0 ? 0 : isFreeShipping ? 0 : 50;
  const shippingProgress = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
  const amountNeededForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  // Coupon discount calculation
  const discountAmount = appliedCoupon
    ? appliedCoupon.discountType === 'percentage'
      ? (subtotal * appliedCoupon.discount) / 100
      : Math.min(subtotal, appliedCoupon.discount)
    : 0;

  const grandTotal = Math.max(0, subtotal - discountAmount + shippingCost);

  const handleQuantityChange = async (item, newQuantity) => {
    const cartItemId = item._id;
    const product = typeof item.productId === 'object' && item.productId !== null ? item.productId : {};
    const maxStock = product.stock ?? item.stock ?? 99;

    if (newQuantity < 1) {
      handleRemove(item);
      return;
    }

    if (newQuantity > maxStock) {
      toast.warning(`Only ${maxStock} items available in stock.`);
      return;
    }

    setUpdatingItemId(cartItemId);
    try {
      await dispatch(
        updateCartItem({
          cartItemId,
          quantity: newQuantity,
        })
      ).unwrap();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to update quantity');
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemove = async (item) => {
    const cartItemId = item._id;
    const product = typeof item.productId === 'object' && item.productId !== null ? item.productId : {};
    const productName = product.name || item.name || 'Item';

    try {
      await dispatch(removeFromCart(cartItemId)).unwrap();
      toast.info(`Removed ${productName} from cart`);
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to remove item');
    }
  };

  const handleClearCart = async () => {
    try {
      await dispatch(clearCart()).unwrap();
      setSelectedItemIds([]);
      toast.info('Cart cleared');
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to clear cart');
    }
  };

  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      toast.error('Please enter a coupon code');
      return;
    }

    setValidatingCoupon(true);
    try {
      const response = await axiosInstance.post('/orders/validate-coupon', {
        code,
        subtotal,
      });
      const data = response.data.data;
      setAppliedCoupon({
        code: data.code,
        discount: data.discount,
        discountType: data.discountType,
        discountAmount: data.discountAmount,
      });
      toast.success(`🎉 ${response.data.message || `Coupon ${data.code} applied!`}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid coupon code');
    } finally {
      setValidatingCoupon(false);
    }
  };

  // Multiple Selected Items Checkout
  const handleCheckoutSelected = () => {
    if (selectedItems.length === 0) {
      toast.warning('Please select at least one item to checkout.');
      return;
    }
    navigate('/checkout', {
      state: {
        checkoutItems: selectedItems,
        subtotal,
        discountAmount,
        shippingCost,
        grandTotal,
        appliedCoupon
      }
    });
  };

  // Single Item Direct Checkout
  const handleCheckoutSingleItem = (item) => {
    const product = typeof item.productId === 'object' && item.productId !== null ? item.productId : {};
    const itemPrice = Number(item.price ?? product.price ?? 0);
    const itemQty = Number(item.quantity || 1);
    const singleSubtotal = itemPrice * itemQty;
    const singleShipping = singleSubtotal >= 100 ? 0 : 50;
    const singleGrandTotal = singleSubtotal + singleShipping;

    navigate('/checkout', {
      state: {
        checkoutItems: [item],
        subtotal: singleSubtotal,
        discountAmount: 0,
        shippingCost: singleShipping,
        grandTotal: singleGrandTotal,
        appliedCoupon: null
      }
    });
  };

  // -------------------- Empty Cart State --------------------
  if (!items || items.length === 0) {
    return (
      <div className="min-h-[75vh] bg-[#F4F6F5]/40 py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-gray-100 flex flex-col items-center text-center">
          {/* Header */}
          <div className="w-full flex items-center justify-between pb-5 border-b border-gray-100 mb-8">
            <h1 className="text-xl font-bold text-gray-900">Your Cart</h1>
            <span className="text-gray-400 text-sm font-semibold">(0)</span>
          </div>

          {/* Bag Icon Illustration */}
          <div className="w-32 h-32 rounded-full bg-emerald-50 flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-emerald-100/70 flex items-center justify-center text-[#124B38]">
              <ShoppingBagIcon className="w-10 h-10" />
            </div>
          </div>

          <h2 className="text-lg font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-sm text-gray-500 mb-8 max-w-xs">
            Looks like you haven't added any products to your cart yet.
          </p>

          {/* Action Button */}
          <button
            onClick={() => navigate('/products')}
            className="w-full py-3.5 px-6 rounded-full bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-sm transition-all duration-200 shadow-md shadow-emerald-600/20 active:scale-[0.98] cursor-pointer"
          >
            Show Products
          </button>
        </div>
      </div>
    );
  }

  // -------------------- Active Cart State --------------------
  return (
    <div className="min-h-screen bg-[#F4F6F5]/40 pb-16">
      {/* 1. Top Checkout Stepper */}
      <div className="bg-white border-b border-gray-100 py-6 mb-8 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-3 sm:gap-6 text-sm">
            {/* Step 1: Shopping Cart (Active) */}
            <div className="flex items-center gap-2 text-[#124B38] font-bold">
              <div className="w-8 h-8 rounded-full bg-[#124B38] text-white flex items-center justify-center shadow-xs">
                <ShoppingBagIcon className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm">Shopping Cart</span>
            </div>

            {/* Step 1 to 2 Divider */}
            <div className="w-8 sm:w-16 h-0.5 bg-gray-200" />

            {/* Step 2: Checkout */}
            <div className="flex items-center gap-2 text-gray-400 font-medium">
              <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center">
                <CreditCardIcon className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm hidden sm:inline">Checkout</span>
            </div>

            {/* Step 2 to 3 Divider */}
            <div className="w-8 sm:w-16 h-0.5 bg-gray-200" />

            {/* Step 3: Order Complete */}
            <div className="flex items-center gap-2 text-gray-400 font-medium">
              <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center">
                <CheckCircleIcon className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm hidden sm:inline">Order Complete</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ==================== LEFT COLUMN: Items & Value Cards ==================== */}
          <div className="lg:col-span-8 space-y-8">
            {/* Items Container */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8">
              {/* Header */}
              <div className="flex items-center justify-between pb-5 border-b border-gray-100 flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  {/* Select All Checkbox */}
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded text-[#124B38] border-gray-300 focus:ring-[#124B38] accent-[#124B38] cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-gray-700">
                      Select All ({selectedItems.length}/{items.length})
                    </span>
                  </label>

                  <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block" />

                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                    Your Cart
                  </h1>
                  <span className="text-gray-400 font-semibold text-sm">
                    ({totalItemCount})
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  {selectedItems.length > 0 && selectedItems.length < items.length && (
                    <button
                      type="button"
                      onClick={handleCheckoutSelected}
                      className="text-xs bg-emerald-50 text-[#124B38] hover:bg-emerald-100 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      Checkout Selected ({selectedItems.length})
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleClearCart}
                    className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Cart Item Rows */}
              <div className="divide-y divide-gray-100">
                {items.map((item) => {
                  const product = typeof item.productId === 'object' && item.productId !== null ? item.productId : {};
                  const productId = product._id || product.id || item.productId;
                  const itemKey = item._id || productId;
                  const productName = product.name || item.name || 'Product';
                  const itemPrice = Number(item.price ?? product.price ?? 0);
                  const itemQty = Number(item.quantity || 1);
                  const itemTotal = itemPrice * itemQty;
                  const itemImage =
                    product.images?.[0]?.url ||
                    product.images?.[0] ||
                    item.images?.[0]?.url ||
                    item.image ||
                    '/placeholder.png';
                  const sellerName = item.sellerId?.shopName || product.seller?.shopName || item.shopName;
                  const isUpdating = updatingItemId === item._id;
                  const isSelected = selectedItemIds.includes(itemKey);

                  return (
                    <div
                      key={itemKey}
                      className={`py-6 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center justify-between group transition-colors rounded-2xl px-2 sm:px-3 ${
                        isSelected ? 'bg-emerald-50/20' : 'bg-transparent'
                      }`}
                    >
                      {/* Checkbox, Thumbnail & Details */}
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        {/* Item Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectItem(itemKey)}
                          className="w-4 h-4 rounded text-[#124B38] border-gray-300 focus:ring-[#124B38] accent-[#124B38] cursor-pointer shrink-0"
                          title="Select item for checkout"
                        />

                        <Link
                          to={`/products/${productId}`}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gray-50 border border-gray-100 p-1.5 flex-shrink-0 flex items-center justify-center overflow-hidden group-hover:border-emerald-200 transition-colors"
                        >
                          <img
                            src={itemImage}
                            alt={productName}
                            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
                          />
                        </Link>

                        <div className="flex-1 min-w-0 space-y-1">
                          <Link
                            to={`/products/${productId}`}
                            className="text-sm sm:text-base font-semibold text-gray-900 hover:text-[#124B38] transition-colors line-clamp-1"
                          >
                            {productName}
                          </Link>

                          {sellerName && (
                            <p className="text-xs text-gray-500 font-medium">
                              Sold by: <span className="text-[#124B38] font-semibold">{sellerName}</span>
                            </p>
                          )}

                          {item.variant && (
                            <p className="text-xs text-gray-400">
                              Variant: <span className="text-gray-700 font-medium">{item.variant}</span>
                            </p>
                          )}

                          {/* Unit price badge for mobile */}
                          <div className="sm:hidden text-xs text-gray-500 pt-0.5">
                            ৳{itemPrice.toFixed(2)} each
                          </div>
                        </div>
                      </div>

                      {/* Quantity Stepper, Prices, and Actions */}
                      <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 sm:gap-6 pt-2 sm:pt-0">
                        {/* Quantity Controls */}
                        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50/60">
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleQuantityChange(item, itemQty - 1)}
                            className="px-3 py-1.5 text-gray-600 hover:bg-gray-200/80 hover:text-gray-900 transition-colors text-sm font-bold disabled:opacity-50 cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            –
                          </button>
                          <span className="px-3 py-1.5 text-xs sm:text-sm font-bold text-gray-900 min-w-[32px] text-center">
                            {itemQty}
                          </span>
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleQuantityChange(item, itemQty + 1)}
                            className="px-3 py-1.5 text-gray-600 hover:bg-gray-200/80 hover:text-gray-900 transition-colors text-sm font-bold disabled:opacity-50 cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        {/* Single item price (Desktop) */}
                        <div className="hidden sm:block text-right min-w-[65px]">
                          <span className="text-sm font-medium text-gray-700">
                            ৳{itemPrice.toFixed(2)}
                          </span>
                        </div>

                        {/* Total line item price */}
                        <div className="text-right min-w-[75px]">
                          <span className="text-sm sm:text-base font-bold text-gray-900">
                            ৳{itemTotal.toFixed(2)}
                          </span>
                        </div>

                        {/* Single Item Direct Checkout Button */}
                        <button
                          type="button"
                          onClick={() => handleCheckoutSingleItem(item)}
                          className="px-2.5 py-1 text-xs font-bold text-white bg-[#124B38] hover:bg-[#0d3628] rounded-lg transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
                          title="Checkout only this item"
                        >
                          Buy Item
                        </button>

                        {/* Remove Action Button */}
                        <button
                          type="button"
                          onClick={() => handleRemove(item)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                          title="Remove item"
                          aria-label="Remove item"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3 Value Propositions Cards (Figma Delivery & Returns Section) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Next Day Delivery */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-2xs space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#124B38] flex items-center justify-center">
                  <DeliveryIcon className="w-5 h-5" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">
                  Order by 10pm for free next day delivery on Orders over ৳100
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  We deliver Monday to Saturday - excluding Holidays.
                </p>
              </div>

              {/* Card 2: Store Delivery */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-2xs space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#124B38] flex items-center justify-center">
                  <StoreBoxIcon className="w-5 h-5" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">
                  Free next day delivery to stores.
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Home delivery is ৳50 for orders under ৳100 and is FREE for all orders over ৳100.
                </p>
              </div>

              {/* Card 3: Free Returns */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-2xs space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#124B38] flex items-center justify-center">
                  <ReturnTruckIcon className="w-5 h-5" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">
                  30 days to return it to us for a refund.
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  We have made returns SO EASY - you can return your order to a store or send with FedEx FOR FREE.
                </p>
              </div>
            </div>
          </div>

          {/* ==================== RIGHT COLUMN: Order Summary Card ==================== */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-7 sticky top-24 space-y-5">
              {/* Summary Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="text-sm font-bold text-gray-900">Order Summary</span>
                <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                  {selectedItems.length} of {items.length} Selected
                </span>
              </div>

              {/* Cost Breakdown */}
              <div className="space-y-3 text-sm pb-5 border-b border-gray-100">
                <div className="flex items-center justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-gray-900">৳{subtotal.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between text-gray-600">
                  <span>Discount</span>
                  <span className={`font-semibold ${discountAmount > 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                    {discountAmount > 0 ? `-৳${discountAmount.toFixed(2)}` : '৳0.0'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-gray-600">
                  <span>Shipping Costs</span>
                  <span className="font-semibold text-gray-900">
                    {selectedItems.length === 0 ? (
                      '৳0.00'
                    ) : isFreeShipping ? (
                      <span className="text-emerald-600 font-bold uppercase text-xs">FREE</span>
                    ) : (
                      `৳${shippingCost.toFixed(2)}`
                    )}
                  </span>
                </div>
              </div>

              {/* Coupon Form */}
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2 text-xs uppercase placeholder:normal-case placeholder:text-gray-400 focus:ring-2 focus:ring-[#124B38] outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#124B38] text-xs font-bold transition-colors cursor-pointer"
                >
                  Apply Coupon
                </button>
              </form>

              {appliedCoupon && (
                <div className="flex items-center justify-between bg-emerald-50/80 text-[#124B38] text-xs px-3 py-2 rounded-lg font-medium">
                  <span>Coupon <strong>{appliedCoupon.code}</strong> applied</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponCode('');
                    }}
                    className="text-red-500 hover:text-red-700 font-bold ml-2 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Free Shipping Progress */}
              <div className="space-y-1.5 pt-1">
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#16a34a] h-2 rounded-full transition-all duration-500"
                    style={{ width: `${shippingProgress}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-500 font-medium">
                  {selectedItems.length === 0 ? (
                    'Select items to see free shipping progress'
                  ) : isFreeShipping ? (
                    <span className="text-emerald-700 font-semibold">
                      🎉 You unlocked <strong>FREE Shipping</strong> on this order!
                    </span>
                  ) : (
                    <>
                      Get Free <strong className="text-gray-800">Shipping</strong> for orders over{' '}
                      <strong className="text-gray-900">৳{freeShippingThreshold.toFixed(2)}</strong> (add{' '}
                      <span className="text-emerald-700 font-bold">৳{amountNeededForFreeShipping.toFixed(2)}</span> more)
                    </>
                  )}
                </p>
              </div>

              {/* Continue Shopping Link */}
              <div className="text-center pt-1">
                <Link
                  to="/products"
                  className="text-xs font-semibold text-[#124B38] hover:underline transition-all"
                >
                  Continue Shopping
                </Link>
              </div>

              {/* Primary Checkout CTA Button */}
              <button
                type="button"
                disabled={selectedItems.length === 0}
                onClick={handleCheckoutSelected}
                className="w-full py-4 px-6 rounded-full bg-[#16a34a] hover:bg-[#15803d] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-sm sm:text-base transition-all duration-200 shadow-md shadow-emerald-600/20 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>
                  {selectedItems.length === 0
                    ? 'Select Items to Checkout'
                    : selectedItems.length === items.length
                    ? 'Checkout All Items'
                    : `Checkout Selected (${selectedItems.length})`}
                </span>
                {selectedItems.length > 0 && (
                  <>
                    <span className="opacity-75">|</span>
                    <span>৳{grandTotal.toFixed(2)}</span>
                  </>
                )}
              </button>

              {/* Secure Payments Badges */}
              <div className="pt-3 text-center border-t border-gray-100">
                <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-3">
                  Secure Payments Provided By
                </p>

                <div className="flex items-center justify-center gap-2 sm:gap-2.5 flex-wrap">
                  {/* Mastercard */}
                  <div className="h-8 px-2.5 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-2xs">
                    <svg className="h-4.5 w-auto" viewBox="0 0 36 24" fill="none">
                      <rect width="36" height="24" rx="3" fill="#FFFFFF" />
                      <circle cx="14" cy="12" r="7" fill="#EB001B" />
                      <circle cx="22" cy="12" r="7" fill="#F79E1B" fillOpacity="0.8" />
                    </svg>
                  </div>

                  {/* Visa */}
                  <div className="h-8 px-2.5 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-2xs">
                    <span className="font-black italic tracking-tighter text-blue-800 text-xs">
                      VISA
                    </span>
                  </div>

                  {/* Crypto */}
                  <div className="h-8 px-2.5 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-2xs">
                    <span className="font-bold text-yellow-600 text-[11px] flex items-center gap-1">
                      <span className="w-3.5 h-3.5 rounded-full bg-yellow-500 text-white flex items-center justify-center text-[8px] font-bold">
                        ₿
                      </span>
                      Crypto
                    </span>
                  </div>

                  {/* Interac */}
                  <div className="h-8 px-2.5 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-2xs">
                    <span className="font-bold text-amber-600 text-[11px] tracking-tight">
                      interac
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;