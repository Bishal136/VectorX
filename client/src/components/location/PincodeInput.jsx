import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setLocation } from '../../features/auth/authSlice';

const PincodeInput = ({ onSuccess, onConfirm, className = '' }) => {
  const dispatch = useDispatch();
  const [pincode, setPincode] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanPincode = pincode.trim();
    if (cleanPincode.length >= 4) {
      dispatch(
        setLocation({
          lat: null,
          lng: null,
          source: 'manual',
          pincode: cleanPincode,
        })
      );
      const payload = { pincode: cleanPincode };
      if (onConfirm) onConfirm(payload);
      if (onSuccess) onSuccess(payload);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`flex items-center gap-2 ${className}`}>
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Enter pincode..."
          maxLength={6}
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
        />
      </div>
      <button
        type="submit"
        disabled={pincode.length < 4}
        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors shrink-0"
      >
        Set Pincode
      </button>
    </form>
  );
};

export default PincodeInput;