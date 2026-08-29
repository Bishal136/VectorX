import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import Navbar from './Navbar';
import Footer from './Footer';
import LocationPrompt from '../location/LocationPrompt';
import useGeolocation from '../../hooks/useGeolocation';
import { setLocation } from '../../features/auth/authSlice';

const UserLayout = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { getLocation, loading, error } = useGeolocation();

  const isChatPage =
    location.pathname === '/messages' ||
    location.pathname.startsWith('/messages/') ||
    location.pathname === '/user/messages' ||
    location.pathname.startsWith('/user/messages/');

  useEffect(() => {
    const fetchLocation = async () => {
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
        }
      } catch {
        // Handled silently: user denied permission or geolocation is unavailable
      }
    };
    fetchLocation();
  }, [getLocation, dispatch]);

  return (
    <div className={isChatPage ? "h-[100dvh] flex flex-col bg-gray-50 overflow-hidden" : "min-h-screen flex flex-col bg-gray-50"}>
      <Navbar />
      <LocationPrompt />
      <main className={isChatPage ? "flex-1 overflow-hidden min-h-0" : "flex-grow"}>
        <Outlet />
      </main>
      {!isChatPage && <Footer />}
    </div>
  );
};

export default UserLayout;