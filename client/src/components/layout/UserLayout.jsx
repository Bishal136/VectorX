import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import Navbar from './Navbar';
import Footer from './Footer';
import LocationPrompt from '../location/LocationPrompt';
import  useGeolocation  from '../../hooks/useGeolocation';
import { setLocation } from '../../features/auth/authSlice';

const UserLayout = () => {
  const dispatch = useDispatch();
  const { getLocation, loading, error } = useGeolocation();

  useEffect(() => {
    const fetchLocation = async () => {
      const coords = await getLocation();
      if (coords) {
        dispatch(
          setLocation({
            lat: coords.latitude,
            lng: coords.longitude,
            source: 'geo',
            pincode: null,
          })
        );
      }
    };
    fetchLocation();
  }, [getLocation, dispatch]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <LocationPrompt />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default UserLayout;