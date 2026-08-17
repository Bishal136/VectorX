// Suggested location: src/pages/auth/VerifyOtp.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { verifyOtp } from '../../features/auth/authSlice';
import Logo from '../../components/common/Logo';
import AuthBrandPanel from '../../pages/auth/AuthBrandPanel';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30; // seconds

const VerifyOtp = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, error } = useSelector((state) => state.auth);
  const isLoading = status === 'loading';

  // Arrives via navigate('/verify-otp', { state: { email } }) from Register.jsx.
  // Falls back to an editable field if the page was opened directly (refresh, bookmark, etc).
  const emailFromState = location.state?.email || '';
  const [email, setEmail] = useState(emailFromState);
  const emailLocked = Boolean(emailFromState);

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [formError, setFormError] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const otpValue = otp.join('');

  const handleOtpChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return; // digits only, one char
    setOtp((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (formError) setFormError('');
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((digit, i) => {
      next[i] = digit;
    });
    setOtp(next);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setFormError('Please enter your email.');
      return;
    }
    if (otpValue.length !== OTP_LENGTH) {
      setFormError('Enter the full 6-digit code.');
      return;
    }
    try {
      await dispatch(verifyOtp({ email: email.trim(), otp: otpValue })).unwrap();
      navigate('/login', { state: { justVerified: true } });
    } catch {
      // rejected value is already captured in redux `error` state
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = () => {
    if (cooldown > 0) return;
    // NOTE: authRouterTest.json has no POST /auth/resend-otp route yet, so there's
    // nothing to actually call here. Wire this up once that endpoint exists on the backend.
    setCooldown(RESEND_COOLDOWN);
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left: form panel */}
      <div className="w-full lg:w-[45%] flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="inline-block mb-8">
            <Logo />
          </Link>

          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">VERIFY YOUR EMAIL</h1>
          <p className="mt-2 text-sm text-gray-500">
            {emailLocked ? (
              <>
                We sent a 6-digit code to <span className="font-medium text-gray-700">{email}</span>.
                Enter it below to verify your account.
              </>
            ) : (
              'Enter your email and the 6-digit code we sent you.'
            )}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
            {(formError || error) && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {formError || error}
              </div>
            )}

            {!emailLocked && (
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
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (formError) setFormError('');
                  }}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                />
              </div>
            )}

            <div>
              <span className="block text-sm font-medium text-gray-900 mb-2">Verification code</span>
              <div className="flex items-center justify-between gap-2" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-11 h-13 sm:w-12 sm:h-14 rounded-xl border border-gray-300 text-center text-xl font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                    aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {isLoading ? 'Verifying…' : 'Verify account'}
            </button>

            <p className="text-center text-sm text-gray-500">
              Didn&apos;t get a code?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0}
                className="font-semibold text-green-700 hover:text-green-800 disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:text-gray-400"
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </button>
            </p>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Wrong email?{' '}
            <Link to="/register" className="font-semibold text-green-700 hover:text-green-800">
              Go back
            </Link>
          </p>
        </div>
      </div>

      <AuthBrandPanel tagline="Almost there — verify your email to start shopping or selling." />
    </div>
  );
};

export default VerifyOtp;