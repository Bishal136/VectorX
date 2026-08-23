// Suggested location: src/pages/auth/VerifyOtp.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { verifyOtp } from '../../features/auth/authSlice';
import axiosInstance from '../../services/axiosInstance';
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

  // Arrives via state or query parameter (?email=...)
  const searchParams = new URLSearchParams(location.search);
  const initialEmail = location.state?.email || searchParams.get('email') || '';
  const [email, setEmail] = useState(initialEmail);
  const emailLocked = Boolean(location.state?.email);

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [formError, setFormError] = useState('');
  const [resendSuccess, setResendSuccess] = useState('');
  const [resending, setResending] = useState(false);
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
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setFormError('Please enter your email.');
      return;
    }
    if (otpValue.length !== OTP_LENGTH) {
      setFormError('Enter the full 6-digit code.');
      return;
    }
    try {
      await dispatch(verifyOtp({ email: cleanEmail, otp: otpValue })).unwrap();
      navigate('/login', { state: { justVerified: true, email: cleanEmail } });
    } catch {
      // rejected value is already captured in redux `error` state
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setFormError('Please enter your email to resend OTP.');
      return;
    }
    setResending(true);
    setFormError('');
    setResendSuccess('');
    try {
      await axiosInstance.post('/auth/resend-otp', { email: cleanEmail, type: 'verification' });
      setResendSuccess('New verification code sent to your email.');
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to resend verification code.');
    } finally {
      setResending(false);
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

            {resendSuccess && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                {resendSuccess}
              </div>
            )}

            {!emailLocked && (
              <div>
                <label htmlFor="verify-email" className="block text-sm font-medium text-gray-900 mb-1.5">
                  Email
                </label>
                <input
                  id="verify-email"
                  name="email"
                  type="email"
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

            {/* 6-box OTP input */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">Verification Code</label>
              <div className="flex justify-between gap-2" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                    aria-label={`Digit ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {isLoading ? 'Verifying…' : 'Verify Email'}
            </button>

            {/* Resend link */}
            <div className="text-center text-sm text-gray-500">
              Didn&apos;t receive a code?{' '}
              {cooldown > 0 ? (
                <span className="text-gray-400">Resend in {cooldown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="font-semibold text-green-700 hover:text-green-800 disabled:opacity-50"
                >
                  {resending ? 'Sending…' : 'Resend code'}
                </button>
              )}
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Already verified?{' '}
            <Link to="/login" className="font-semibold text-green-700 hover:text-green-800">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <AuthBrandPanel tagline="Local products, doorstep delivery. Verify your email to get started." />
    </div>
  );
};

export default VerifyOtp;