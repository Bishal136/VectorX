import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../../services/axiosInstance';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('orderId');
  const invoiceId = searchParams.get('invoice');

  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatusAndOrder = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // 1. Fetch payment status
        const [payRes, orderRes] = await Promise.allSettled([
          axiosInstance.get(`/payments/status/${orderId}`),
          axiosInstance.get(`/orders/${orderId}`)
        ]);

        if (payRes.status === 'fulfilled' && payRes.value?.data?.success) {
          setPaymentData(payRes.value.data.data);
        }

        if (orderRes.status === 'fulfilled' && orderRes.value?.data?.success) {
          setOrderData(orderRes.value.data.data);
        }
      } catch (err) {
        console.error('Error loading payment details:', err);
        setError('Could not verify payment details from the server.');
      } finally {
        setLoading(false);
      }
    };

    fetchStatusAndOrder();
  }, [orderId]);

  return (
    <div className="min-h-[80vh] bg-[#F4F6F5]/50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-gray-100 text-center space-y-6">
        {/* Animated Checkmark Badge */}
        <div className="w-20 h-20 rounded-full bg-emerald-100 text-[#124B38] mx-auto flex items-center justify-center shadow-inner">
          <svg className="w-10 h-10 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider">
            <span>PortPos Verified</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            পেমেন্ট সফল হয়েছে!
          </h1>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Payment Successful! Thank you for your purchase. We have received your payment via PortPos and your order is being processed.
          </p>
        </div>

        {/* References */}
        <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left text-xs">
          <div>
            <span className="text-gray-400 font-bold block uppercase text-[10px]">Order Reference</span>
            <span className="font-mono font-bold text-gray-900 break-all">{orderId || 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-400 font-bold block uppercase text-[10px]">PortPos Invoice ID</span>
            <span className="font-mono font-bold text-emerald-800 break-all">{invoiceId || paymentData?.invoiceId || 'Verified'}</span>
          </div>
        </div>

        {/* Order Details Preview if available */}
        {orderData && (
          <div className="border-t border-b border-gray-100 py-5 text-left space-y-3">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Order Summary</h2>
            <div className="divide-y divide-gray-50 max-h-40 overflow-y-auto pr-1">
              {orderData.items?.map((item, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between text-xs">
                  <span className="text-gray-700 font-medium truncate max-w-[240px]">
                    {item.name} <span className="text-gray-400">×{item.quantity}</span>
                  </span>
                  <span className="font-bold text-gray-900">৳{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-gray-100 flex justify-between text-sm font-black text-gray-900">
              <span>Total Paid</span>
              <span className="text-[#124B38] text-base">৳{(orderData.totalAmount || 0).toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            to="/orders"
            className="py-3.5 px-6 rounded-full bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-sm transition-all shadow-md shadow-emerald-600/20 active:scale-[0.99] text-center cursor-pointer"
          >
            View My Orders
          </Link>
          <Link
            to="/products"
            className="py-3.5 px-6 rounded-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-sm transition-colors text-center cursor-pointer"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
