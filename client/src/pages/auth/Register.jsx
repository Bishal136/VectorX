// Suggested location: src/pages/auth/Register.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser } from '../../features/auth/authSlice';
import useAuth from '../../hooks/useAuth';
import Logo from '../../components/common/Logo';
import AuthBrandPanel from '../../pages/auth/AuthBrandPanel';

const EyeIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
    <circle cx="12" cy="12" r="3" strokeWidth={2} />
  </svg>
);

const EyeOffIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.4 5.4A9.9 9.9 0 0112 5c6 0 9.5 7 9.5 7a13.6 13.6 0 01-3.1 3.9M6.6 6.6C4.4 8.1 2.5 10.6 2.5 12c0 0 3.5 7 9.5 7 1.1 0 2.1-.2 3-.5" />
  </svg>
);



const CheckIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
  </svg>
);

const accountTypes = [
  { value: 'user', label: 'Buyer', blurb: 'Shop from local sellers' },
  { value: 'seller', label: 'Seller', blurb: 'List and sell your products' },
];

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
  };

  const handleRoleSelect = (role) => {
    setFormData((prev) => ({ ...prev, role }));
  };

  const validate = () => {
    if (!formData.name.trim()) return 'Please enter your full name.';
    if (!formData.email.trim()) return 'Please enter your email.';
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
      await dispatch(registerUser({ name, email, phone, password, role })).unwrap();
      // Registration succeeds with an unverified user — send them to OTP verification.
      navigate('/verify-otp', { state: { email } });
    } catch {
      // rejected value is already captured in redux `error` state
    }
  };



  return (
    <div className="min-h-screen flex bg-white">
      {/* Left: form panel */}
      <div className="w-full lg:w-[45%] flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="inline-block mb-8">
            <Logo />
          </Link>

          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">CREATE ACCOUNT</h1>
          <p className="mt-2 text-sm text-gray-500">
            Join VectorX to shop from sellers near you — or start selling.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
            {(formError || error) && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {formError || error}
              </div>
            )}

            {/* Account type */}
            <div>
              <span className="block text-sm font-medium text-gray-900 mb-1.5">I want to</span>
              <div className="grid grid-cols-2 gap-3">
                {accountTypes.map((type) => {
                  const selected = formData.role === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleRoleSelect(type.value)}
                      className={`relative text-left rounded-xl border px-4 py-3 transition ${
                        selected
                          ? 'border-green-600 bg-green-50 ring-1 ring-green-600'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {selected && (
                        <span className="absolute top-2 right-2 flex items-center justify-center w-4 h-4 rounded-full bg-green-600 text-white">
                          <CheckIcon className="w-2.5 h-2.5" />
                        </span>
                      )}
                      <div className="text-sm font-semibold text-gray-900">{type.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{type.blurb}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-1.5">
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              />
            </div>

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
              <label htmlFor="phone" className="block text-sm font-medium text-gray-900 mb-1.5">
                Phone number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+8801XXXXXXXXX"
                value={formData.phone}
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
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
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

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900 mb-1.5">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              />
            </div>

            <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span>
                I agree to the{' '}
                <Link to="/terms" className="font-medium text-green-700 hover:text-green-800">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="font-medium text-green-700 hover:text-green-800">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {isLoading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-green-700 hover:text-green-800">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <AuthBrandPanel tagline="Buy local, sell local — all in one place." />
    </div>
  );
};

export default Register;