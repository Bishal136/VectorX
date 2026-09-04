import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { verifyOtp, clearAuthError } from '../../features/auth/authSlice';
import axiosInstance from '../../services/axiosInstance';
import AuthBackground from './AuthBackground';
import {
  ShieldCheck,
  Mail,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Edit2,
  Sparkles,
} from 'lucide-react';

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
  const [isEditingEmail, setIsEditingEmail] = useState(!initialEmail);

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [formError, setFormError] = useState('');
  const [resendSuccess, setResendSuccess] = useState('');
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const inputRefs = useRef([]);

  useEffect(() => {
    // Focus first input box if email is available
    if (email && !isEditingEmail) {
      inputRefs.current[0]?.focus();
    }
  }, [email, isEditingEmail]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const otpValue = otp.join('');

  const handleOtpChange = (index, value) => {
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      setOtp((prev) => {
        const next = [...prev];
        next[index] = '';
        return next;
      });
      return;
    }

    if (cleaned.length > 1) {
      // Multiple digits entered (e.g. mobile keyboard autofill suggestion or paste)
      const digits = cleaned.slice(0, OTP_LENGTH).split('');
      setOtp((prev) => {
        const next = [...prev];
        digits.forEach((digit, i) => {
          if (index + i < OTP_LENGTH) {
            next[index + i] = digit;
          }
        });
        return next;
      });
      const nextFocus = Math.min(index + digits.length, OTP_LENGTH - 1);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    // Single digit
    setOtp((prev) => {
      const next = [...prev];
      next[index] = cleaned;
      return next;
    });
    if (formError) setFormError('');
    if (error) dispatch(clearAuthError());

    // Auto advance
    if (index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        setOtp((prev) => {
          const next = [...prev];
          next[index - 1] = '';
          return next;
        });
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
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
    if (formError) setFormError('');
    if (error) dispatch(clearAuthError());

    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setFormError('Please enter your email address.');
      setIsEditingEmail(true);
      return;
    }
    if (otpValue.length !== OTP_LENGTH) {
      setFormError('Please enter the full 6-digit verification code.');
      return;
    }

    try {
      await dispatch(verifyOtp({ email: cleanEmail, otp: otpValue })).unwrap();
      navigate('/login', { state: { justVerified: true, email: cleanEmail } });
    } catch {
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setFormError('Please enter your email to resend verification code.');
      setIsEditingEmail(true);
      return;
    }
    setResending(true);
    setFormError('');
    setResendSuccess('');
    try {
      await axiosInstance.post('/auth/resend-otp', { email: cleanEmail, type: 'verification' });
      setResendSuccess('A new verification code has been sent to your email.');
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to resend verification code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthBackground>
      {/* Header matching Reference Image Style */}
      <div className="text-center mb-4 sm:mb-5">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 mb-2 shadow-lg shadow-emerald-950/40 backdrop-blur-md">
          <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-300" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
          Verify OTP
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-emerald-100/70 max-w-xs mx-auto">
          Please enter the 6-digit verification code sent to your email
        </p>
      </div>

      {/* Recipient Email Glass Pill with Edit Button */}
      <div className="mb-4 p-2.5 sm:p-3 rounded-2xl bg-white/[0.06] border border-white/15 flex items-center justify-between gap-3 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/20">
            <Mail className="w-3.5 h-3.5 shrink-0" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-white truncate">
            {email || 'No email provided'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsEditingEmail((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 hover:text-amber-200 shrink-0 hover:underline cursor-pointer"
        >
          <Edit2 className="w-3 h-3" />
          <span>{isEditingEmail ? 'Done' : 'Change'}</span>
        </button>
      </div>

      {/* Inline Email Input If Editing */}
      {isEditingEmail && (
        <div className="mb-4">
          <div className="relative flex items-center rounded-2xl border border-white/20 bg-white/[0.07] hover:bg-white/[0.1] hover:border-white/35 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20 backdrop-blur-md transition-all px-3.5 sm:px-4 py-2.5 sm:py-3">
            <Mail className="w-4.5 h-4.5 text-emerald-300/80 shrink-0 mr-3" />
            <input
              id="verify-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (formError) setFormError('');
              }}
              placeholder="Enter your email address"
              className="w-full bg-transparent text-white placeholder-white/40 text-sm outline-none"
            />
          </div>
        </div>
      )}

      {/* Error Banner */}
      {(formError || error) && (
        <div
          role="alert"
          className="mb-4 rounded-2xl bg-red-500/20 border border-red-400/40 p-3 text-xs sm:text-sm text-red-200 flex items-start gap-2.5 backdrop-blur-md shadow-lg"
        >
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span className="font-medium">{formError || error}</span>
        </div>
      )}

      {/* Success Banner */}
      {resendSuccess && (
        <div className="mb-4 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 p-3 text-xs sm:text-sm text-emerald-200 flex items-start gap-2.5 backdrop-blur-md shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span className="font-medium">{resendSuccess}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* 6-Digit OTP Boxes - Responsive down to small phones */}
        <div>
          <label className="block text-xs font-semibold text-emerald-100/80 mb-2 text-center">
            Verification Code
          </label>
          <div
            className="flex items-center justify-between gap-1.5 sm:gap-2"
            onPaste={handlePaste}
          >
            {otp.map((digit, index) => {
              const isFilled = Boolean(digit);
              return (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  aria-label={`Digit ${index + 1}`}
                  className={`flex-1 min-w-0 max-w-[46px] sm:max-w-[50px] h-11.5 sm:h-13.5 text-center text-lg sm:text-xl font-bold rounded-2xl border outline-none transition-all backdrop-blur-md ${
                    isFilled
                      ? 'border-emerald-400 bg-emerald-500/25 text-white ring-2 ring-emerald-400/30 shadow-md shadow-emerald-950/40'
                      : 'border-white/20 bg-white/[0.07] text-white hover:border-white/40 focus:border-emerald-400 focus:bg-white/[0.12] focus:ring-2 focus:ring-emerald-400/25'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || otpValue.length !== OTP_LENGTH}
          className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/40 text-white font-bold py-2.5 sm:py-3 text-sm sm:text-base shadow-lg shadow-emerald-950/60 hover:shadow-emerald-900/80 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-1"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying code…</span>
            </>
          ) : (
            <span>Verify &amp; Continue</span>
          )}
        </button>

        {/* Resend OTP Timer & Button */}
        <div className="text-center pt-1">
          {cooldown > 0 ? (
            <div className="inline-flex items-center gap-1.5 text-xs text-amber-200 bg-amber-500/15 border border-amber-400/30 px-3 py-1 rounded-full font-medium backdrop-blur-sm">
              <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
              <span>Resend code in <strong className="text-amber-300 font-bold">{cooldown}s</strong></span>
            </div>
          ) : (
            <div className="text-xs text-emerald-100/70">
              Didn&apos;t receive any code?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="font-bold text-amber-300 hover:text-amber-200 underline hover:underline-offset-2 disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer ml-1"
              >
                {resending ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Sending…</span>
                  </>
                ) : (
                  <span>Resend code</span>
                )}
              </button>
            </div>
          )}
        </div>
      </form>

      {/* Footer Navigation Link */}
      <p className="mt-5 sm:mt-6 text-center text-xs sm:text-sm text-emerald-100/70">
        Already verified?{' '}
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

export default VerifyOtp;