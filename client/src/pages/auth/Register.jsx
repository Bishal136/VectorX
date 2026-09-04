import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser, clearAuthError } from '../../features/auth/authSlice';
import useAuth from '../../hooks/useAuth';
import AuthBackground from './AuthBackground';
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ShoppingBag,
  Store,
  AlertCircle,
  Loader2,
} from 'lucide-react';

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { status, error } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'user',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [formError, setFormError] = useState('');

  const isLoading = status === 'loading';

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'seller') {
        navigate('/seller/dashboard', { replace: true });
      } else if (user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (formError) setFormError('');
    if (error) dispatch(clearAuthError());
  };

  const handleRoleSelect = (role) => {
    setFormData((prev) => ({ ...prev, role }));
  };

  const validate = () => {
    if (!formData.name.trim()) return 'Please enter your full name.';
    if (!formData.email.trim()) return 'Please enter your email address.';
    if (!formData.phone.trim()) return 'Please enter your phone number.';
    if (formData.password.length < 8) return 'Password must be at least 8 characters.';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match.';
    if (!agreedToTerms) return 'Please agree to the Terms of Service and Privacy Policy.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const { name, email, phone, password, role } = formData;

    try {
      const cleanEmail = email.trim().toLowerCase();
      await dispatch(
        registerUser({
          name: name.trim(),
          email: cleanEmail,
          phone: phone.trim(),
          password,
          role,
        })
      ).unwrap();
      navigate('/verify-otp', { state: { email: cleanEmail } });
    } catch {
      // captured in redux error state
    }
  };

  return (
    <AuthBackground>
      {/* Header matching Reference Image */}
      <div className="text-center mb-4 sm:mb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
          Register
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-emerald-100/70">
          Please enter your Name, Login and your Password
        </p>
      </div>

      {/* Error Banner */}
      {(formError || error) && (
        <div
          role="alert"
          className="mb-3.5 rounded-2xl bg-red-500/20 border border-red-400/40 p-3 text-xs sm:text-sm text-red-200 flex flex-col gap-1.5 backdrop-blur-md shadow-lg"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="font-medium">{formError || error}</span>
          </div>
          {(error || formError)?.toString().toLowerCase().includes('already exists') && (
            <div className="pl-6.5 flex items-center gap-3 pt-1">
              <Link
                to={`/verify-otp?email=${encodeURIComponent(formData.email.trim().toLowerCase())}`}
                className="text-xs font-bold text-amber-300 hover:text-amber-200 underline"
              >
                Verify OTP →
              </Link>
              <span className="text-white/40">&middot;</span>
              <Link
                to="/login"
                className="text-xs font-bold text-emerald-300 hover:text-emerald-200 underline"
              >
                Sign in →
              </Link>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3" noValidate>
        {/* Account Type Sleek Pill Toggle */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-white/[0.05] border border-white/15 backdrop-blur-md">
          <button
            type="button"
            onClick={() => handleRoleSelect('user')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              formData.role === 'user'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md'
                : 'text-emerald-100/70 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Buyer (ক্রেতা)</span>
          </button>
          <button
            type="button"
            onClick={() => handleRoleSelect('seller')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              formData.role === 'seller'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md'
                : 'text-emerald-100/70 hover:text-white'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Seller (বিক্রেতা)</span>
          </button>
        </div>

        {/* Username / Name Input */}
        <div className="relative flex items-center rounded-2xl border border-white/20 bg-white/[0.07] hover:bg-white/[0.1] hover:border-white/35 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20 backdrop-blur-md transition-all px-3.5 sm:px-4 py-2 sm:py-2.5">
          <User className="w-4.5 h-4.5 text-emerald-300/80 shrink-0 mr-3" />
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            placeholder="Username"
            value={formData.name}
            onChange={handleChange}
            className="w-full bg-transparent text-white placeholder-white/40 text-sm outline-none"
          />
        </div>

        {/* Email Input */}
        <div className="relative flex items-center rounded-2xl border border-white/20 bg-white/[0.07] hover:bg-white/[0.1] hover:border-white/35 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20 backdrop-blur-md transition-all px-3.5 sm:px-4 py-2 sm:py-2.5">
          <Mail className="w-4.5 h-4.5 text-emerald-300/80 shrink-0 mr-3" />
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full bg-transparent text-white placeholder-white/40 text-sm outline-none"
          />
        </div>

        {/* Phone Input */}
        <div className="relative flex items-center rounded-2xl border border-white/20 bg-white/[0.07] hover:bg-white/[0.1] hover:border-white/35 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20 backdrop-blur-md transition-all px-3.5 sm:px-4 py-2 sm:py-2.5">
          <Phone className="w-4.5 h-4.5 text-emerald-300/80 shrink-0 mr-3" />
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            placeholder="Phone number (+880)"
            value={formData.phone}
            onChange={handleChange}
            className="w-full bg-transparent text-white placeholder-white/40 text-sm outline-none"
          />
        </div>

        {/* Password Input */}
        <div className="relative flex items-center rounded-2xl border border-white/20 bg-white/[0.07] hover:bg-white/[0.1] hover:border-white/35 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20 backdrop-blur-md transition-all px-3.5 sm:px-4 py-2 sm:py-2.5">
          <Lock className="w-4.5 h-4.5 text-emerald-300/80 shrink-0 mr-3" />
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            placeholder="Password (at least 8 chars)"
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

        {/* Re-enter Password Input */}
        <div>
          <div className="relative flex items-center rounded-2xl border border-white/20 bg-white/[0.07] hover:bg-white/[0.1] hover:border-white/35 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20 backdrop-blur-md transition-all px-3.5 sm:px-4 py-2 sm:py-2.5">
            <Lock className="w-4.5 h-4.5 text-emerald-300/80 shrink-0 mr-3" />
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              placeholder="Re-enter Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full bg-transparent text-white placeholder-white/40 text-sm outline-none pr-8"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors cursor-pointer"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex justify-end mt-1">
            <Link
              to="/forgot-password"
              className="text-[11px] text-emerald-300/80 hover:text-emerald-200 hover:underline transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        {/* Terms agreement */}
        <div className="pt-0.5">
          <label className="flex items-start gap-2.5 text-xs text-emerald-100/70 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 w-3.5 h-3.5 rounded border-white/30 text-emerald-600 focus:ring-emerald-500 bg-white/10 transition cursor-pointer"
            />
            <span className="leading-relaxed text-[11px] sm:text-xs">
              I agree to the{' '}
              <Link to="/terms" className="font-semibold text-emerald-300 hover:text-emerald-200 underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="font-semibold text-emerald-300 hover:text-emerald-200 underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
        </div>

        {/* Primary Register Button matching reference image green button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/40 text-white font-bold py-2.5 sm:py-3 text-sm sm:text-base shadow-lg shadow-emerald-950/60 hover:shadow-emerald-900/80 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Registering account…</span>
            </>
          ) : (
            <span>Register</span>
          )}
        </button>
      </form>

      {/* Footer Navigation Link matching reference image */}
      <p className="mt-4 sm:mt-5 text-center text-xs sm:text-sm text-emerald-100/70">
        Already have an Account?{' '}
        <Link
          to="/login"
          className="font-bold text-amber-300 hover:text-amber-200 underline underline-offset-2 ml-1"
        >
          Login!
        </Link>
      </p>
    </AuthBackground>
  );
};

export default Register;