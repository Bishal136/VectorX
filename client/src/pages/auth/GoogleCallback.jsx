// Suggested location: src/pages/auth/GoogleCallback.jsx
//
// Expected flow once the backend route exists:
// 1. User clicks "Sign in with Google" -> browser goes to {API_URL}/auth/google
// 2. Backend runs the OAuth flow with Google, then redirects the browser to
//    something like: {FRONTEND_URL}/auth/google/callback?accessToken=...&refreshToken=...&user=<encoded-json>
// 3. This page reads those query params and dispatches handleGoogleCallback
//    (already defined in authSlice.js) to store them exactly like a normal login.
//
// Adjust the query param names / user encoding below to match whatever your
// backend actually sends back once that route is built.

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
      user = JSON.parse(decodeURIComponent(userParam));
    } catch {
      navigate('/login?error=google-auth-failed', { replace: true });
      return;
    }

    dispatch(handleGoogleCallback({ accessToken, refreshToken, user }))
      .unwrap()
      .then(() => navigate('/', { replace: true }))
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