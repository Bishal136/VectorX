import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../../services/axiosInstance';
import { toast } from 'react-toastify';

const PaymentCancel = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('orderId');

  const [retrying, setRetrying] = useState(false);

  const handleRetryPayment = async () => {
    if (!orderId) {
      navigate('/checkout');
      return;
    }

    setRetrying(true);
    try {
      toast.info('Connecting to PortPos (পোর্টপস)...');
      const res = await axiosInstance.post('/payments/initiate', { orderId });
      if (res.data?.success && res.data?.data?.paymentUrl) {
        window.location.href = res.data.data.paymentUrl;
      } else {
        toast.error(res.data?.message || 'Could not resume payment');
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
        {/* Cancel Icon */}
        <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center shadow-inner">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <div className="space-y-2">
          <span className="inline-block px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-bold uppercase tracking-wider">
            Payment Cancelled
          </span>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            পেমেন্ট বাতিল করা হয়েছে
          </h1>
          <p className="text-xs text-gray-500">
            You cancelled the payment on PortPos. Your order is safely saved in your account. You can complete the payment at any time.
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
            {retrying ? 'Connecting to PortPos…' : 'Pay Now with PortPos (পোর্টপস)'}
          </button>

          <Link
            to="/orders"
            className="block w-full py-3 px-6 rounded-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs transition-colors text-center cursor-pointer"
          >
            Go to My Orders
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;
