import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, clearAuthError } from '../../features/auth/authSlice';
import useAuth from '../../hooks/useAuth';
import AuthBackground from './AuthBackground';
import { User, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

const GoogleIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
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
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const isLoading = status === 'loading';

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
    const cleanEmail = formData.email.trim().toLowerCase();
    if (!cleanEmail || !formData.password) {
      setFormError('Please enter both your login and password.');
      return;
    }
    try {
      const payload = {
        email: cleanEmail,
        password: formData.password,
      };
      const result = await dispatch(loginUser(payload)).unwrap();
      const userRole = result?.user?.role || result?.role;
      navigate(getDestination(userRole), { replace: true });
    } catch {
      // captured in redux error state
    }
  };

  const handleGoogleLogin = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    window.location.href = `${apiUrl}/auth/google`;
  };

  const isUnverifiedError =
    (formError || error)?.toString().toLowerCase().includes('verify') ||
    (formError || error)?.toString().toLowerCase().includes('otp');

  return (
    <AuthBackground>
      {/* Header matching Reference Image */}
      <div className="text-center mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
          Login
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-emerald-100/70">
          Please enter your Login and your Password
        </p>
      </div>

      {/* Verified Banner */}
      {location.state?.justVerified && !error && !formError && (
        <div className="mb-4 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 p-3 text-xs sm:text-sm text-emerald-200 flex items-start gap-2.5 backdrop-blur-md shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>Email verified successfully! Please sign in with your credentials.</span>
        </div>
      )}

      {/* Error Banner */}
      {(formError || error) && (
        <div
          role="alert"
          className="mb-4 rounded-2xl bg-red-500/20 border border-red-400/40 p-3 text-xs sm:text-sm text-red-200 flex flex-col gap-1.5 backdrop-blur-md shadow-lg"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="font-medium">{formError || error}</span>
          </div>
          {isUnverifiedError && (
            <div className="pl-6.5">
              <Link
                to={`/verify-otp${formData.email ? `?email=${encodeURIComponent(formData.email.trim().toLowerCase())}` : ''}`}
                className="inline-flex items-center text-xs font-bold text-amber-300 hover:text-amber-200 underline"
              >
                Click here to enter OTP and verify your email →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Form with Pill-Shaped Inputs matching Reference Image */}
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5" noValidate>
        {/* Username or Email Input */}
        <div className="relative flex items-center rounded-2xl border border-white/20 bg-white/[0.07] hover:bg-white/[0.1] hover:border-white/35 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20 backdrop-blur-md transition-all px-3.5 sm:px-4 py-2.5 sm:py-3">
          <User className="w-4.5 h-4.5 text-emerald-300/80 shrink-0 mr-3" />
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="Username or Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full bg-transparent text-white placeholder-white/40 text-sm outline-none"
          />
        </div>

        {/* Password Input */}
        <div>
          <div className="relative flex items-center rounded-2xl border border-white/20 bg-white/[0.07] hover:bg-white/[0.1] hover:border-white/35 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20 backdrop-blur-md transition-all px-3.5 sm:px-4 py-2.5 sm:py-3">
            <Lock className="w-4.5 h-4.5 text-emerald-300/80 shrink-0 mr-3" />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-transparent text-white placeholder-white/40 text-sm outline-none pr-8"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex justify-end mt-1.5">
            <Link
              to="/forgot-password"
              className="text-xs text-emerald-300 hover:text-emerald-200 hover:underline transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        {/* Primary Login Button matching green outline/fill in reference image */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/40 text-white font-bold py-2.5 sm:py-3 text-sm sm:text-base shadow-lg shadow-emerald-950/60 hover:shadow-emerald-900/80 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-1"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Logging in…</span>
            </>
          ) : (
            <span>Login</span>
          )}
        </button>

        {/* Google Sign-in Button matching reference image dark pill */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full rounded-2xl bg-[#141e24]/90 hover:bg-[#1a2830] border border-white/15 text-white font-semibold py-2.5 sm:py-3 px-4 text-xs sm:text-sm shadow-md hover:border-white/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
        >
          <GoogleIcon className="w-4.5 h-4.5 shrink-0" />
          <span>Or, sign-in with Google</span>
        </button>
      </form>

      {/* Footer Navigation Link */}
      <p className="mt-4 sm:mt-5 text-center text-xs sm:text-sm text-emerald-100/70">
        Not a member yet?{' '}
        <Link
          to="/register"
          className="font-bold text-amber-300 hover:text-amber-200 underline underline-offset-2 ml-1"
        >
          Register!
        </Link>
      </p>
    </AuthBackground>
  );
};

export default Login;