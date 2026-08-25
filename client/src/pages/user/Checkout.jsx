import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createOrder } from '../../features/order/orderSlice';
import { fetchCart } from '../../features/cart/cartSlice';
import useAuth from '../../hooks/useAuth';
import axiosInstance from '../../services/axiosInstance';
import { toast } from 'react-toastify';

// --- Icons ---
const ShoppingBagIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);

const CheckCircleIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CreditCardIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const CloseIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const Checkout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const cartState = useSelector((state) => state.cart) || {};
  const orderState = useSelector((state) => state.orders || state.order) || {};
  const orderStatus = orderState.status;

  // Get items passed via navigation state or fallback to full cart items
  const stateItems = location.state?.checkoutItems;
  const checkoutItems = stateItems && stateItems.length > 0 ? stateItems : cartState.items || [];

  // Top notification banner state
  const [showNotification, setShowNotification] = useState(true);

  // Form states
  const [formData, setFormData] = useState({
    firstName: user?.name ? user.name.split(' ')[0] : '',
    lastName: user?.name ? user.name.split(' ').slice(1).join(' ') || 'User' : '',
    country: 'Singapore',
    street1: '',
    street2: '',
    city: 'New York',
    province: 'New York',
    postcode: '21945',
    phone: user?.phone || '',
    email: user?.email || '',
    shipToDifferent: false,
    diffFirstName: '',
    diffLastName: '',
    diffCountry: 'Singapore',
    diffStreet1: '',
    diffStreet2: '',
    diffCity: 'New York',
    diffProvince: 'New York',
    diffPostcode: '21945',
    orderNotes: '',
    outOfStockAction: 'Contact me (With delay)',
    referralSource: '',
  });

  // Checkbox requirements
  const [confirmAddress, setConfirmAddress] = useState(false);
  const [emailNewsUpdates, setEmailNewsUpdates] = useState(false);

  // Payment method selection ('PORTPOS' or 'COD')
  const [paymentMethod, setPaymentMethod] = useState('PORTPOS');

  // Coupon state
  const [couponCode, setCouponCode] = useState(location.state?.appliedCoupon?.code || '');
  const [appliedCoupon, setAppliedCoupon] = useState(location.state?.appliedCoupon || null);

  // Order placed completion state
  const [orderPlacedData, setOrderPlacedData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redirectingToPayment, setRedirectingToPayment] = useState(false);

  // Update email if user loads later
  useEffect(() => {
    if (user && !formData.email) {
      setFormData((prev) => ({
        ...prev,
        firstName: prev.firstName || user.name?.split(' ')[0] || '',
        lastName: prev.lastName || user.name?.split(' ').slice(1).join(' ') || '',
        email: user.email || '',
        phone: prev.phone || user.phone || ''
      }));
    }
  }, [user]);

  // Calculations
  const itemCount = checkoutItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

  const subtotal = checkoutItems.reduce((sum, item) => {
    const product = typeof item.productId === 'object' && item.productId !== null ? item.productId : {};
    const price = Number(item.price ?? product.price ?? 0);
    return sum + price * (item.quantity || 1);
  }, 0);

  const isFreeShipping = subtotal >= 100;
  const shippingCost = checkoutItems.length === 0 ? 0 : isFreeShipping ? 0 : 50;

  // Calculate discount
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percentage') {
      discountAmount += (subtotal * appliedCoupon.discount) / 100;
    } else {
      discountAmount += Math.min(subtotal, appliedCoupon.discount);
    }
  }

  const grandTotal = Math.max(0, subtotal - discountAmount + shippingCost);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
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

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (!confirmAddress) {
      toast.error('Please confirm your shipping address check before placing order.');
      return;
    }

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('Please enter your full name.');
      return;
    }

    if (!formData.street1.trim()) {
      toast.error('Please enter your street address.');
      return;
    }

    if (!formData.city.trim() || !formData.postcode.trim()) {
      toast.error('Please enter your city and postal code.');
      return;
    }

    if (!formData.email.trim()) {
      toast.error('Please enter your email address.');
      return;
    }

    if (checkoutItems.length === 0) {
      toast.error('No items to checkout.');
      return;
    }

    setIsSubmitting(true);

    const shippingAddressPayload = {
      label: 'Home',
      line1: formData.street1,
      line2: formData.street2,
      city: formData.city,
      state: formData.province,
      pincode: formData.postcode,
      phone: formData.phone
    };

    // Format items payload
    const itemsPayload = checkoutItems.map((item) => {
      const product = typeof item.productId === 'object' && item.productId !== null ? item.productId : {};
      const pId = product._id || product.id || item.productId;
      return {
        productId: pId,
        quantity: item.quantity || 1
      };
    });

    try {
      const selectedMethod = paymentMethod === 'PORTPOS' ? 'PORTPOS' : 'COD';

      const orderPayload = {
        shippingAddress: shippingAddressPayload,
        paymentMethod: selectedMethod,
        couponCode: appliedCoupon?.code || '',
        notes: `${formData.orderNotes ? `Notes: ${formData.orderNotes}. ` : ''}${formData.outOfStockAction ? `If out of stock: ${formData.outOfStockAction}. ` : ''}`,
        items: itemsPayload
      };

      const result = await dispatch(createOrder(orderPayload)).unwrap();
      
      // Refresh cart state globally
      dispatch(fetchCart());

      // If user chose PortPos online payment, initiate gateway session and redirect
      if (selectedMethod === 'PORTPOS') {
        const targetOrder = result.orders && result.orders.length > 0 ? result.orders[0] : null;
        const targetOrderId = targetOrder ? targetOrder._id : result._id;

        if (!targetOrderId) {
          throw new Error('Order ID missing from response');
        }

        setRedirectingToPayment(true);
        toast.info('Connecting to PortPos (পোর্টপস) Secure Payment Gateway...');

        try {
          const initRes = await axiosInstance.post('/payments/initiate', { orderId: targetOrderId });
          if (initRes.data?.success && initRes.data?.data?.paymentUrl) {
            window.location.href = initRes.data.data.paymentUrl;
            return;
          } else {
            throw new Error(initRes.data?.message || 'Could not retrieve payment URL');
          }
        } catch (payErr) {
          setRedirectingToPayment(false);
          toast.error(payErr.response?.data?.message || payErr.message || 'Payment initiation failed. Please try from your Order History.');
          setOrderPlacedData(result);
          return;
        }
      }

      // Cash on Delivery (COD) flow
      setOrderPlacedData(result);
      toast.success('🎉 Order placed successfully with Cash on Delivery!');
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------- Order Placed Success View --------------------
  if (orderPlacedData) {
    return (
      <div className="min-h-screen bg-[#F4F6F5]/40 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-gray-100 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-[#124B38] mx-auto flex items-center justify-center">
            <CheckCircleIcon className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Thank You! Your Order is Complete
            </h1>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              We have received your order and sent confirmation to{' '}
              <strong className="text-gray-800">{formData.email}</strong>.
            </p>
          </div>

          {orderPlacedData.checkoutSessionId && (
            <div className="inline-block bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-mono text-gray-700">
              Session Reference: <strong>{orderPlacedData.checkoutSessionId}</strong>
            </div>
          )}

          <div className="border-t border-b border-gray-100 py-6 my-6 text-left space-y-3">
            <h2 className="text-sm font-bold text-gray-900">Order Summary</h2>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Items Total ({itemCount} items)</span>
              <span className="font-semibold text-gray-900">৳{subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-xs text-emerald-700">
                <span>Discount Applied</span>
                <span className="font-semibold">-৳{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-gray-600">
              <span>Shipping</span>
              <span className="font-semibold text-gray-900">{isFreeShipping ? 'FREE' : `৳${shippingCost.toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-100">
              <span>Grand Total</span>
              <span className="text-[#124B38] text-base font-extrabold">৳{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => navigate('/products')}
              className="py-3 px-6 rounded-full bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-sm transition-colors cursor-pointer"
            >
              Continue Shopping
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="py-3 px-6 rounded-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-sm transition-colors cursor-pointer"
            >
              View My Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------- Empty Checkout State --------------------
  if (checkoutItems.length === 0) {
    return (
      <div className="min-h-[75vh] bg-[#F4F6F5]/40 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-emerald-50 text-[#124B38] flex items-center justify-center mb-6">
            <ShoppingBagIcon className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No items to checkout</h2>
          <p className="text-sm text-gray-500 mb-8 max-w-xs">
            Your cart is currently empty or no items were selected.
          </p>
          <div className="flex gap-3 w-full">
            <button
              onClick={() => navigate('/cart')}
              className="flex-1 py-3 px-4 rounded-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Go to Cart
            </button>
            <button
              onClick={() => navigate('/products')}
              className="flex-1 py-3 px-4 rounded-full bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Browse Catalog
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------- Standard Checkout Flow --------------------
  return (
    <div className="min-h-screen bg-[#F4F6F5]/40 pb-20">
      {/* 1. Top Checkout Stepper */}
      <div className="bg-white border-b border-gray-100 py-6 mb-6 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-3 sm:gap-6 text-sm">
            {/* Step 1: Shopping Cart (Completed) */}
            <Link to="/cart" className="flex items-center gap-2 text-emerald-800 font-bold hover:underline">
              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <CheckCircleIcon className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm">Shopping Cart</span>
            </Link>

            {/* Divider */}
            <div className="w-8 sm:w-16 h-0.5 bg-emerald-600" />

            {/* Step 2: Checkout (Active) */}
            <div className="flex items-center gap-2 text-[#124B38] font-bold">
              <div className="w-8 h-8 rounded-full bg-[#124B38] text-white flex items-center justify-center shadow-xs">
                <ShoppingBagIcon className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm">Checkout</span>
            </div>

            {/* Divider */}
            <div className="w-8 sm:w-16 h-0.5 bg-gray-200" />

            {/* Step 3: Order Complete */}
            <div className="flex items-center gap-2 text-gray-400 font-medium">
              <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center">
                <CheckCircleIcon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs sm:text-sm hidden sm:inline">Order Complete</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Optional Notification Area Banner */}
        {showNotification && (
          <div className="mb-6 bg-[#FEF9E7] border border-[#FDECB2] text-amber-900 rounded-2xl px-5 py-3.5 flex items-center justify-between text-xs sm:text-sm">
            <span>
              <strong>Note:</strong> Please verify your shipping address and contact info to ensure fast, hassle-free delivery.
            </span>
            <button
              onClick={() => setShowNotification(false)}
              className="text-amber-800 hover:text-amber-950 p-1 cursor-pointer"
              aria-label="Dismiss notification"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handlePlaceOrder}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ==================== LEFT COLUMN: Shipping Form ==================== */}
            <div className="lg:col-span-8 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-8">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                  Shipping
                </h1>
                <span className="text-gray-400 font-semibold text-sm sm:text-base">
                  ({itemCount})
                </span>
              </div>

              {/* Form Fields */}
              <div className="space-y-5">
                {/* First & Last Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      required
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="e.g. John"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-[#124B38] outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      required
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="e.g. Doe"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-[#124B38] outline-none transition"
                    />
                  </div>
                </div>

                {/* Country / Region */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Country / Region *
                  </label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-[#124B38] outline-none bg-white transition cursor-pointer"
                  >
                    <option value="Singapore">Singapore</option>
                    <option value="United States">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Bangladesh">Bangladesh</option>
                    <option value="Australia">Australia</option>
                  </select>
                </div>

                {/* Street Address */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    name="street1"
                    required
                    value={formData.street1}
                    onChange={handleInputChange}
                    placeholder="House number and street name"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-[#124B38] outline-none transition"
                  />
                  <input
                    type="text"
                    name="street2"
                    value={formData.street2}
                    onChange={handleInputChange}
                    placeholder="Apartment, suite, unit, etc. (optional)"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-[#124B38] outline-none transition"
                  />
                </div>

                {/* Town / City, Province, Postcode */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Town / City *
                    </label>
                    <input
                      type="text"
                      name="city"
                      required
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="e.g. New York"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-[#124B38] outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Province / State *
                    </label>
                    <input
                      type="text"
                      name="province"
                      required
                      value={formData.province}
                      onChange={handleInputChange}
                      placeholder="e.g. NY"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-[#124B38] outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Postcode / ZIP *
                    </label>
                    <input
                      type="text"
                      name="postcode"
                      required
                      value={formData.postcode}
                      onChange={handleInputChange}
                      placeholder="e.g. 21945"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-[#124B38] outline-none transition"
                    />
                  </div>
                </div>

                {/* Phone & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+1 234 567 8900"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-[#124B38] outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="johndoe@example.com"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-[#124B38] outline-none transition"
                    />
                  </div>
                </div>

                {/* Ship to Different Address Toggle */}
                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="shipToDifferent"
                      checked={formData.shipToDifferent}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded text-[#124B38] border-gray-300 focus:ring-[#124B38] accent-[#124B38] cursor-pointer"
                    />
                    <span className="text-sm font-bold text-gray-900">
                      Ship to a different Address?
                    </span>
                  </label>
                </div>

                {/* Different Address Form if checked */}
                {formData.shipToDifferent && (
                  <div className="p-5 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-4 transition-all">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#124B38]">
                      Alternate Shipping Destination
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        name="diffFirstName"
                        placeholder="Recipient First Name"
                        value={formData.diffFirstName}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#124B38]"
                      />
                      <input
                        type="text"
                        name="diffLastName"
                        placeholder="Recipient Last Name"
                        value={formData.diffLastName}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#124B38]"
                      />
                    </div>
                    <input
                      type="text"
                      name="diffStreet1"
                      placeholder="Alternate Street Address"
                      value={formData.diffStreet1}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#124B38]"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        name="diffCity"
                        placeholder="City"
                        value={formData.diffCity}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#124B38]"
                      />
                      <input
                        type="text"
                        name="diffProvince"
                        placeholder="Province / State"
                        value={formData.diffProvince}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#124B38]"
                      />
                      <input
                        type="text"
                        name="diffPostcode"
                        placeholder="Postcode / ZIP"
                        value={formData.diffPostcode}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#124B38]"
                      />
                    </div>
                  </div>
                )}

                {/* Order Notes */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Order Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    name="orderNotes"
                    value={formData.orderNotes}
                    onChange={handleInputChange}
                    placeholder="Notes about your order, e.g. special notes for delivery."
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-[#124B38] outline-none resize-none transition"
                  />
                </div>

                {/* Out of Stock Question */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    What would you like us to do if an Item is out of Stock?
                  </label>
                  <select
                    name="outOfStockAction"
                    value={formData.outOfStockAction}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-[#124B38] outline-none bg-white transition cursor-pointer"
                  >
                    <option value="Contact me (With delay)">Contact me (With delay)</option>
                    <option value="Refund the item and ship remainder">Refund the item and ship remainder</option>
                    <option value="Replace with a similar item">Replace with a similar item</option>
                  </select>
                </div>

                {/* Where did you hear about us */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Where did you hear About Us?
                  </label>
                  <input
                    type="text"
                    name="referralSource"
                    value={formData.referralSource}
                    onChange={handleInputChange}
                    placeholder="e.g. Social media, friend, search engine"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-[#124B38] outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* ==================== RIGHT COLUMN: Order Summary & Place Order ==================== */}
            <div className="lg:col-span-4">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-7 sticky top-24 space-y-5">
                {/* Cost Breakdown */}
                <div className="space-y-3 text-sm pb-5 border-b border-gray-100">
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-semibold text-gray-900">৳{subtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between text-gray-600">
                    <span>Shipping Destination</span>
                    <span className="font-semibold text-gray-900 text-xs truncate max-w-[140px]">
                      {formData.city}, {formData.province}
                    </span>
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
                      {isFreeShipping ? (
                        <span className="text-emerald-600 font-bold uppercase text-xs">FREE</span>
                      ) : (
                        `৳${shippingCost.toFixed(2)}`
                      )}
                    </span>
                  </div>
                </div>

                {/* Payment Method Badge / Option */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Payment Method
                    </span>
                    <span className="h-5 px-2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      PortPos & COD
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {/* Option 1: PortPos Online Payment */}
                    <div
                      onClick={() => setPaymentMethod('PORTPOS')}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                        paymentMethod === 'PORTPOS'
                          ? 'border-[#124B38] bg-emerald-50/40 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        id="method_portpos"
                        name="payment_method_choice"
                        checked={paymentMethod === 'PORTPOS'}
                        onChange={() => setPaymentMethod('PORTPOS')}
                        className="mt-1 w-4 h-4 text-[#124B38] accent-[#124B38] cursor-pointer"
                      />
                      <label htmlFor="method_portpos" className="flex-1 cursor-pointer select-none">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                            PortPos <span className="text-xs font-medium text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">পোর্টপস</span>
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            Online Pay
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          bKash, Nagad, Rocket, Visa, Mastercard, Internet Banking
                        </p>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <span className="text-[10px] font-bold bg-[#E2136E]/10 text-[#E2136E] px-1.5 py-0.5 rounded border border-[#E2136E]/20">
                            bKash
                          </span>
                          <span className="text-[10px] font-bold bg-[#F7941D]/10 text-[#F7941D] px-1.5 py-0.5 rounded border border-[#F7941D]/20">
                            Nagad
                          </span>
                          <span className="text-[10px] font-bold bg-[#8C3494]/10 text-[#8C3494] px-1.5 py-0.5 rounded border border-[#8C3494]/20">
                            Rocket
                          </span>
                          <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                            Cards
                          </span>
                        </div>
                      </label>
                    </div>

                    {/* Option 2: Cash on Delivery */}
                    <div
                      onClick={() => setPaymentMethod('COD')}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                        paymentMethod === 'COD'
                          ? 'border-[#124B38] bg-emerald-50/40 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        id="method_cod"
                        name="payment_method_choice"
                        checked={paymentMethod === 'COD'}
                        onChange={() => setPaymentMethod('COD')}
                        className="mt-1 w-4 h-4 text-[#124B38] accent-[#124B38] cursor-pointer"
                      />
                      <label htmlFor="method_cod" className="flex-1 cursor-pointer select-none">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                            Cash on Delivery <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">COD</span>
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                            Doorstep
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          পণ্য হাতে পেয়ে নগদ টাকায় মূল্য পরিশোধ করুন
                        </p>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Coupon Form */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2 text-xs uppercase placeholder:normal-case placeholder:text-gray-400 focus:ring-2 focus:ring-[#124B38] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#124B38] text-xs font-bold transition-colors cursor-pointer"
                  >
                    Apply Coupon
                  </button>
                </div>

                {/* Agreement Checkboxes */}
                <div className="space-y-3 pt-2 text-xs text-gray-600">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={confirmAddress}
                      onChange={(e) => setConfirmAddress(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[#124B38] border-gray-300 focus:ring-[#124B38] accent-[#124B38] cursor-pointer shrink-0"
                    />
                    <span className="leading-snug">
                      I confirm that my shipping address and phone number are 100% correct. *
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={emailNewsUpdates}
                      onChange={(e) => setEmailNewsUpdates(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[#124B38] border-gray-300 focus:ring-[#124B38] accent-[#124B38] cursor-pointer shrink-0"
                    />
                    <span className="leading-snug">
                      Sign me up to receive SMS / Email delivery updates and exclusive deals
                    </span>
                  </label>
                </div>

                {/* Primary Place Order CTA Button */}
                <button
                  type="submit"
                  disabled={!confirmAddress || isSubmitting || redirectingToPayment}
                  className="w-full py-4 px-6 rounded-full bg-[#16a34a] hover:bg-[#15803d] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-sm sm:text-base transition-all duration-200 shadow-md shadow-emerald-600/20 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {redirectingToPayment ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      Redirecting to PortPos…
                    </span>
                  ) : isSubmitting ? (
                    <span>Placing Order…</span>
                  ) : (
                    <>
                      <span>
                        {paymentMethod === 'PORTPOS' ? 'Pay with PortPos (পোর্টপস)' : 'Place Order (COD)'}
                      </span>
                      <span className="opacity-75">|</span>
                      <span>৳{grandTotal.toFixed(2)}</span>
                    </>
                  )}
                </button>

                {/* Secure Payments Badges */}
                <div className="pt-3 text-center border-t border-gray-100">
                  <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-3">
                    Supported Gateways & Methods
                  </p>

                  <div className="flex items-center justify-center gap-2 sm:gap-2.5 flex-wrap">
                    {/* PortPos */}
                    <div className="h-7 px-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-center text-xs font-extrabold text-emerald-900 shadow-2xs">
                      PortPos
                    </div>

                    {/* bKash */}
                    <div className="h-7 px-2 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-2xs text-[11px] font-bold text-[#E2136E]">
                      bKash
                    </div>

                    {/* Nagad */}
                    <div className="h-7 px-2 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-2xs text-[11px] font-bold text-[#F7941D]">
                      Nagad
                    </div>

                    {/* Rocket */}
                    <div className="h-7 px-2 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-2xs text-[11px] font-bold text-[#8C3494]">
                      Rocket
                    </div>

                    {/* Visa / Master */}
                    <div className="h-7 px-2 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-2xs text-[11px] font-bold text-blue-800">
                      Cards
                    </div>

                    {/* COD */}
                    <div className="h-7 px-2 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-2xs text-[11px] font-bold text-gray-700">
                      COD
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Checkout;
