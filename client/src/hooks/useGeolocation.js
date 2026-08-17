// src/hooks/useGeolocation.js
import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLocation } from '../features/auth/authSlice';

/**
 * Custom hook to get and manage user location.
 * Uses browser Geolocation API with manual pincode fallback.
 *
 * @returns {Object} { location, loading, error, getLocation, setManualLocation, retry }
 */
const useGeolocation = () => {
  const dispatch = useDispatch();
  const authLocation = useSelector((state) => state.auth.location);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [manualMode, setManualMode] = useState(false);

  // Get location via browser API
  const getLocation = useCallback(() => {
    // Reset states
    setLoading(true);
    setError(null);
    setManualMode(false);

    // Check if browser supports geolocation
    if (!navigator.geolocation) {
      setLoading(false);
      setError('Geolocation is not supported by your browser.');
      setManualMode(true);
      return Promise.reject(new Error('Geolocation is not supported by your browser.'));
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          dispatch(
            setLocation({
              lat: latitude,
              lng: longitude,
              pincode: null,
              source: 'geo',
            })
          );
          setLoading(false);
          setError(null);
          resolve({ latitude, longitude, lat: latitude, lng: longitude });
        },
        (err) => {
          setLoading(false);
          setError(err.message || 'Unable to retrieve location.');
          setManualMode(true);
          reject(err);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }, [dispatch]);

  // Set location manually (pincode or coordinates)
  const setManualLocation = useCallback(
    ({ lat, lng, pincode, city }) => {
      dispatch(
        setLocation({
          lat: lat || null,
          lng: lng || null,
          pincode: pincode || null,
          city: city || null,
          source: 'manual',
        })
      );
      setManualMode(false);
      setError(null);
    },
    [dispatch]
  );

  // Retry geolocation
  const retry = useCallback(() => {
    getLocation();
  }, [getLocation]);

  // Auto‑fetch location on mount if not already present and source is not 'manual'
  useEffect(() => {
    // Only auto‑fetch if we don't have a location yet, or if current location is the default (0,0)
    const hasLocation =
      authLocation &&
      authLocation.lat !== null &&
      authLocation.lng !== null &&
      !(authLocation.lat === 0 && authLocation.lng === 0);

    if (!hasLocation && authLocation?.source !== 'manual') {
      getLocation();
    }
  }, [authLocation, getLocation]);

  return {
    location: authLocation,
    loading,
    error,
    manualMode,
    getLocation,
    setManualLocation,
    retry,
  };
};

export default useGeolocation;