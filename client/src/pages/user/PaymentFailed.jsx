import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../../services/axiosInstance';
import { toast } from 'react-toastify';

const PaymentFailed = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('orderId');
  const errorReason = searchParams.get('error') || searchParams.get('reason') || 'Transaction could not be completed';

  const [retrying, setRetrying] = useState(false);

  const handleRetryPayment = async () => {
    if (!orderId) {
      navigate('/checkout');
      return;
    }

    setRetrying(true);
    try {
      toast.info('Re-initiating PortPos (পোর্টপস) payment session...');
      const res = await axiosInstance.post('/payments/initiate', { orderId });
      if (res.data?.success && res.data?.data?.paymentUrl) {
        window.location.href = res.data.data.paymentUrl;
      } else {
        toast.error(res.data?.message || 'Could not re-initiate payment');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Payment initiation failed');
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="min-h-[80vh] bg-[#F4F6F5]/50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-gray-100 text-center space-y-6">
        {/* Error Icon */}
        <div className="w-20 h-20 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center shadow-inner">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <div className="space-y-2">
          <span className="inline-block px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-full text-xs font-bold uppercase tracking-wider">
            Payment Incomplete
          </span>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            পেমেন্ট সম্পন্ন হয়নি
          </h1>
          <p className="text-xs text-gray-500">
            {errorReason}
          </p>
        </div>

        {orderId && (
          <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200 text-xs text-gray-600">
            <span>Order Reference: </span>
            <strong className="font-mono text-gray-900">{orderId}</strong>
          </div>
        )}

        <div className="space-y-3 pt-2">
          <button
            onClick={handleRetryPayment}
            disabled={retrying}
            className="w-full py-3.5 px-6 rounded-full bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-sm transition-all shadow-md shadow-emerald-600/20 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
          >
            {retrying ? 'Connecting to PortPos…' : 'Retry Payment with PortPos (পোর্টপস)'}
          </button>

          <Link
            to="/orders"
            className="block w-full py-3 px-6 rounded-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs transition-colors text-center cursor-pointer"
          >
            View Order History
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailed;
