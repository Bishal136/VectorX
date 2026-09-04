import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { forgotPassword, resetPassword } from '../../features/auth/authSlice';
import AuthBackground from './AuthBackground';
import {
  Mail,
  KeyRound,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'react-toastify';

const ForgotPassword = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1 = enter email, 2 = enter OTP & new password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Please enter your email address');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await dispatch(forgotPassword(cleanEmail)).unwrap();
      setSuccessMsg(res || 'OTP sent to your email address.');
      toast.success('Reset code sent! Check your inbox.');
      setStep(2);
    } catch (err) {
      const msg = typeof err === 'string' ? err : 'Failed to send reset code';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      setErrorMsg('Please enter the 6-digit OTP code');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    try {
      const res = await dispatch(
        resetPassword({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
          newPassword,
        })
      ).unwrap();
      toast.success(res || 'Password reset successfully! Please login.');
      navigate('/login', { state: { email, justReset: true } });
    } catch (err) {
      const msg = typeof err === 'string' ? err : 'Failed to reset password';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground>
      {/* Header matching Reference Image Style */}
      <div className="text-center mb-4 sm:mb-5">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 mb-2 shadow-lg shadow-emerald-950/40 backdrop-blur-md">
          <KeyRound className="w-6 h-6 sm:w-7 sm:h-7 text-amber-300" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
          {step === 1 ? 'Forgot Password' : 'New Password'}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-emerald-100/70 max-w-xs mx-auto">
          {step === 1
            ? 'Enter your account email to receive a 6-digit password reset code.'
            : `Enter the code sent to ${email} and your new password.`}
        </p>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div
          role="alert"
          className="mb-4 rounded-2xl bg-red-500/20 border border-red-400/40 p-3 text-xs sm:text-sm text-red-200 flex items-start gap-2.5 backdrop-blur-md shadow-lg"
        >
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Success Banner */}
      {successMsg && step === 2 && (
        <div className="mb-4 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 p-3 text-xs sm:text-sm text-emerald-200 flex items-start gap-2.5 backdrop-blur-md shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={handleSendOtp} className="space-y-3 sm:space-y-3.5" noValidate>
          {/* Email Input */}
          <div className="relative flex items-center rounded-2xl border border-white/20 bg-white/[0.07] hover:bg-white/[0.1] hover:border-white/35 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20 backdrop-blur-md transition-all px-3.5 sm:px-4 py-2.5 sm:py-3">
            <Mail className="w-4.5 h-4.5 text-emerald-300/80 shrink-0 mr-3" />
            <input
              id="reset-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder="Enter your registered email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              className="w-full bg-transparent text-white placeholder-white/40 text-sm outline-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/40 text-white font-bold py-2.5 sm:py-3 text-sm sm:text-base shadow-lg shadow-emerald-950/60 hover:shadow-emerald-900/80 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending reset code…</span>
              </>
            ) : (
              <span>Send Reset Code</span>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-3 sm:space-y-3.5" noValidate>
          {/* OTP Code Input */}
          <div className="relative flex items-center rounded-2xl border border-white/20 bg-white/[0.07] hover:bg-white/[0.1] hover:border-white/35 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20 backdrop-blur-md transition-all px-3.5 sm:px-4 py-2.5 sm:py-3">
            <KeyRound className="w-4.5 h-4.5 text-amber-300/80 shrink-0 mr-3" />
            <input
              id="reset-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              placeholder="6-Digit Reset Code"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, ''));
                if (errorMsg) setErrorMsg('');
              }}
              className="w-full bg-transparent text-white placeholder-white/40 text-sm tracking-widest font-mono outline-none"
            />
          </div>

          {/* New Password Input */}
          <div className="relative flex items-center rounded-2xl border border-white/20 bg-white/[0.07] hover:bg-white/[0.1] hover:border-white/35 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20 backdrop-blur-md transition-all px-3.5 sm:px-4 py-2.5 sm:py-3">
            <Lock className="w-4.5 h-4.5 text-emerald-300/80 shrink-0 mr-3" />
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="New Password (min. 8 characters)"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
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

          {/* Confirm New Password Input */}
          <div className="relative flex items-center rounded-2xl border border-white/20 bg-white/[0.07] hover:bg-white/[0.1] hover:border-white/35 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20 backdrop-blur-md transition-all px-3.5 sm:px-4 py-2.5 sm:py-3">
            <Lock className="w-4.5 h-4.5 text-emerald-300/80 shrink-0 mr-3" />
            <input
              id="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/40 text-white font-bold py-2.5 sm:py-3 text-sm sm:text-base shadow-lg shadow-emerald-950/60 hover:shadow-emerald-900/80 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Resetting password…</span>
              </>
            ) : (
              <span>Reset Password</span>
            )}
          </button>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setOtp('');
                setNewPassword('');
                setConfirmPassword('');
                setErrorMsg('');
              }}
              className="text-xs font-medium text-emerald-200/70 hover:text-white cursor-pointer transition-colors"
            >
              &larr; Change email
            </button>
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={loading}
              className="text-xs font-bold text-amber-300 hover:text-amber-200 underline cursor-pointer disabled:opacity-50"
            >
              Resend code
            </button>
          </div>
        </form>
      )}

      {/* Footer Navigation Link */}
      <p className="mt-5 sm:mt-6 text-center text-xs sm:text-sm text-emerald-100/70">
        Remember your password?{' '}
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

export default ForgotPassword;
