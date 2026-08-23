// Suggested location: src/pages/auth/Login.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, clearAuthError } from '../../features/auth/authSlice';
import useAuth from '../../hooks/useAuth';
import Logo from '../../components/common/Logo';
import AuthBrandPanel from '../../pages/auth/AuthBrandPanel';

const EyeIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7z" />
    <circle cx="12" cy="12" r="3" strokeWidth={2} />
  </svg>
);

const EyeOffIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.4 5.4A9.9 9.9 0 0112 5c6 0 9.5 7 9.5 7a13.6 13.6 0 01-3.1 3.9M6.6 6.6C4.4 8.1 2.5 10.6 2.5 12c0 0 3.5 7 9.5 7 1.1 0 2.1-.2 3-.5" />
  </svg>
);

const GoogleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 01-2.4 3.64v3h3.88c2.27-2.09 3.54-5.17 3.54-8.88z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.15-4.05 1.15-3.11 0-5.75-2.1-6.69-4.93H1.3v3.09A12 12 0 0012 24z" />
    <path fill="#FBBC05" d="M5.31 14.31A7.2 7.2 0 014.9 12c0-.8.14-1.58.38-2.31V6.6H1.3A12 12 0 000 12c0 1.93.46 3.76 1.3 5.4l4.01-3.09z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.3 6.6l4.01 3.09C6.25 6.85 8.89 4.75 12 4.75z" />
  </svg>
);

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { status, error } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    email: location.state?.email || '',
    password: '',
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const isLoading = status === 'loading';

  // Handle URL error params (e.g., from Google auth redirect)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const googleError = params.get('error');
    if (googleError) {
      if (googleError === 'google_auth_failed') {
        setFormError('Google sign-in failed. Please try again.');
      } else {
        setFormError(decodeURIComponent(googleError));
      }
    }
  }, [location.search]);

  const getDestination = (userRole) => {
    const fromPath = location.state?.from?.pathname;
    if (fromPath && fromPath !== '/' && fromPath !== '/login' && fromPath !== '/register') {
      if (fromPath.startsWith('/seller') && userRole !== 'seller') {
        return userRole === 'admin' ? '/admin/dashboard' : '/';
      }
      if (fromPath.startsWith('/admin') && userRole !== 'admin') {
        return userRole === 'seller' ? '/seller/dashboard' : '/';
      }
      return fromPath;
    }
    if (userRole === 'seller') return '/seller/dashboard';
    if (userRole === 'admin') return '/admin/dashboard';
    return '/';
  };

  // Already logged in? bounce to role-appropriate dashboard or origin.
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getDestination(user.role), { replace: true });
    }
  }, [isAuthenticated, user, navigate, location.state]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (formError) setFormError('');
    if (error) dispatch(clearAuthError());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.password) {
      setFormError('Please enter your email and password.');
      return;
    }
    try {
      const payload = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      };
      const result = await dispatch(loginUser(payload)).unwrap();
      const userRole = result?.user?.role || result?.role;
      navigate(getDestination(userRole), { replace: true });
    } catch {
      // rejected value is already captured in redux `error` state
    }
  };

  const handleGoogleLogin = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    window.location.href = `${apiUrl}/auth/google`;
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left: form panel */}
      <div className="w-full lg:w-[45%] flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="inline-block mb-10">
            <Logo />
          </Link>

          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">WELCOME BACK</h1>
          <p className="mt-2 text-sm text-gray-500">Welcome back! Please enter your details.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            {location.state?.justVerified && !error && !formError && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                ✓ Email verified successfully! Please sign in with your credentials.
              </div>
            )}

            {(formError || error) && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 flex flex-col gap-1.5">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{formError || error}</span>
                </div>
                {(formError || error)?.toString().toLowerCase().includes('verify') && (
                  <Link
                    to={`/verify-otp${formData.email ? `?email=${encodeURIComponent(formData.email.trim().toLowerCase())}` : ''}`}
                    className="text-xs font-semibold text-indigo-700 hover:text-indigo-800 underline ml-6"
                  >
                    Click here to enter OTP and verify your email →
                  </Link>
                )}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-1.5">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-11 text-sm placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-sm font-medium text-green-700 hover:text-green-800">
                Forgot password
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-gray-400">OR</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              <GoogleIcon className="w-5 h-5" />
              Sign in with Google
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-semibold text-green-700 hover:text-green-800">
              Sign up for free!
            </Link>
          </p>
        </div>
      </div>

      <AuthBrandPanel tagline="Fresh picks from trusted local sellers, delivered near you." />
    </div>
  );
};

export default Login;