// Flow:
// 1. User clicks "Sign in with Google" -> browser goes to {API_URL}/auth/google
// 2. Backend runs the OAuth flow with Google (passport.js), then redirects the
//    browser to: {FRONTEND_URL}/auth/google/callback?accessToken=...&refreshToken=...&user=<encoded-json>
//    (see googleAuthCallback in server/src/controllers/auth.controller.js)
// 3. This page reads those query params and dispatches handleGoogleCallback
//    (defined in authSlice.js) to store them exactly like a normal login.
// Registered at /auth/google/callback in routes/AppRoutes.jsx.

import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { handleGoogleCallback } from '../../features/auth/authSlice';

const GoogleCallback = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasRun = useRef(false); // guard against React StrictMode double-invoke

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const userParam = searchParams.get('user');

    if (!accessToken || !refreshToken || !userParam) {
      navigate('/login?error=google-auth-failed', { replace: true });
      return;
    }

    let user;
    try {
     
      user = JSON.parse(userParam);
    } catch {
      navigate('/login?error=google-auth-failed', { replace: true });
      return;
    }

    dispatch(handleGoogleCallback({ accessToken, refreshToken, user }))
      .unwrap()
      .then((data) => {
        const role = data?.user?.role || user?.role;
        if (role === 'seller') {
          navigate('/seller/dashboard', { replace: true });
        } else if (role === 'admin') {
          navigate('/admin/dashboard', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      })
      .catch(() => navigate('/login?error=google-auth-failed', { replace: true }));
  }, [dispatch, navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-green-600 rounded-full animate-spin" />
        <p className="text-sm">Signing you in…</p>
      </div>
    </div>
  );
};

export default GoogleCallback;