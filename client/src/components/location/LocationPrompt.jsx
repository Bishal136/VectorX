import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLocation } from '../../features/auth/authSlice';
import  useGeolocation  from '../../hooks/useGeolocation';

const LocationPrompt = () => {
  const dispatch = useDispatch();
  const { getLocation, loading } = useGeolocation();
  const currentLocation = useSelector((state) => state.auth.location);
  const [pincode, setPincode] = useState('');
  const [isPincodeMode, setIsPincodeMode] = useState(false);

  const hasLocation = currentLocation?.lat && currentLocation?.lng;
  const [dismissed, setDismissed] = useState(false);

  if (hasLocation || dismissed) return null;

  const handleUseGeolocation = async () => {
    try {
      const coords = await getLocation();
      if (coords) {
        dispatch(
          setLocation({
            lat: coords.latitude || coords.lat,
            lng: coords.longitude || coords.lng,
            source: 'geo',
            pincode: null,
          })
        );
      } else {
        // If permission was denied or unavailable, gracefully open pincode entry
        setIsPincodeMode(true);
      }
    } catch {
      setIsPincodeMode(true);
    }
  };

  const handlePincodeSubmit = (e) => {
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
      setPincode('');
      setIsPincodeMode(false);
    }
  };

  return (
    <div className="bg-indigo-50 border-b border-indigo-200 py-3 px-4">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-indigo-800">
          <span className="text-xl">📍</span>
          <span className="font-medium">Enable location</span>
          <span className="text-indigo-600 hidden sm:inline">
            – see products from sellers near you
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isPincodeMode ? (
            <>
              <button
                onClick={handleUseGeolocation}
                disabled={loading}
                className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {loading ? 'Detecting…' : 'Use my location'}
              </button>
              <button
                onClick={() => setIsPincodeMode(true)}
                className="px-3 py-1 text-sm text-indigo-700 hover:bg-indigo-100 rounded-md transition"
              >
                Enter pincode
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="px-2 py-1 text-sm text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </>
          ) : (
            <form onSubmit={handlePincodeSubmit} className="flex items-center gap-1">
              <input
                type="text"
                placeholder="e.g. 560001"
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                className="w-28 sm:w-36 px-2 py-1 text-sm border border-indigo-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Set
              </button>
              <button
                type="button"
                onClick={() => setIsPincodeMode(false)}
                className="px-2 py-1 text-sm text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationPrompt;