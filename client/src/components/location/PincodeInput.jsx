import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setLocation } from '../../features/auth/authSlice';

const PincodeInput = ({ onSuccess }) => {
  const dispatch = useDispatch();
  const [pincode, setPincode] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pincode.length >= 4) {
      dispatch(
        setLocation({
          lat: null,
          lng: null,
          source: 'manual',
          pincode: pincode.trim(),
        })
      );
      if (onSuccess) onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        placeholder="Enter pincode"
        value={pincode}
        onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
        className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
      />
      <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
        Set Location
      </button>
    </form>
  );
};

export default PincodeInput;