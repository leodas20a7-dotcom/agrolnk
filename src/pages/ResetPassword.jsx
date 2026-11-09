import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  KeyRound,
  ShieldCheck
} from 'lucide-react';
import Button from '../components/ui/Button';
import { updateUserPassword } from '../utils/auth';
import { supabase } from '../lib/supabase';
import logoImg from '../assets/Logo.jpeg';

export default function ResetPassword({ onNavigate }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasValidSession, setHasValidSession] = useState(true);

  useEffect(() => {
    // 1. Listen for auth state change from Supabase recovery
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setHasValidSession(true);
      }
    });

    // 2. Check current session or recovery tokens in URL
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setHasValidSession(true);
        return;
      }

      const hash = typeof window !== 'undefined' ? window.location.hash || '' : '';
      const search = typeof window !== 'undefined' ? window.location.search || '' : '';

      // Check if Supabase sent an explicit error in the hash or search params
      if (hash.includes('error=') || search.includes('error=')) {
        setHasValidSession(false);
        const params = new URLSearchParams(hash.replace(/^#\/?/, '').replace(/^\?/, ''));
        const desc = params.get('error_description');
        if (desc) {
          setErrorMessage(decodeURIComponent(desc.replace(/\+/g, ' ')));
        }
        return;
      }

      // Check if access_token is present anywhere in the URL (even after a double-hash '#/reset-password#access_token=...')
      const tokenMatch = hash.match(/access_token=([^&]+)/);
      const refreshMatch = hash.match(/refresh_token=([^&]+)/);

      if (tokenMatch) {
        const accessToken = decodeURIComponent(tokenMatch[1]);
        const refreshToken = refreshMatch ? decodeURIComponent(refreshMatch[1]) : '';
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || accessToken,
          });
          if (!error && data?.session) {
            setHasValidSession(true);
            return;
          }
        } catch (err) {
          console.warn('Manual token session hydration fallback:', err);
        }
      }

      // If tokens or recovery parameters are present, give Supabase a grace period to process
      if (hash.includes('access_token') || hash.includes('type=recovery') || search.includes('code=')) {
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            setHasValidSession(true);
          } else {
            setHasValidSession(false);
          }
        }, 1500);
        return;
      }

      // No tokens and no active session
      setHasValidSession(false);
    };

    checkSession();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!password || password.length < 6) {
      setErrorMessage('New password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify and retype.');
      return;
    }

    setIsSubmitting(true);

    try {
      await updateUserPassword(password);
      setIsSuccess(true);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update password. Your reset link may have expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] flex flex-col items-center justify-center py-6 px-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#E5EDE8] shadow-xl overflow-hidden p-6 sm:p-8">
        
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-6 border-b border-[#E5EDE8] mb-6">
          <div className="flex items-center gap-3">
            <img
              src={logoImg}
              alt="AgroLnk Logo"
              className="w-10 h-10 object-contain rounded-xl shadow-xs"
            />
            <div>
              <span className="text-xl font-bold tracking-tight text-[#0B3326] font-heading block">
                AgroLnk
              </span>
              <span className="text-[10px] text-[#10B981] font-semibold uppercase tracking-widest block">
                Digital Agri Exchange
              </span>
            </div>
          </div>

          <button
            onClick={() => onNavigate('login')}
            className="text-xs font-semibold text-[#566861] hover:text-[#0B3326] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </button>
        </div>

        {/* Content Body */}
        {isSuccess ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 bg-[#ECFDF5] text-[#10B981] rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#14211D]">Password Updated!</h2>
              <p className="text-xs text-[#566861] mt-1.5 leading-relaxed">
                Your password has been successfully reset. You can now securely sign in to your AgroLnk account with your new credentials.
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="accent"
                size="md"
                onClick={() => onNavigate('login')}
                className="w-full font-bold py-2.5 px-4 shadow-xs cursor-pointer text-xs"
                icon={ArrowRight}
                iconPosition="right"
              >
                Go to Sign In
              </Button>
            </div>
          </div>
        ) : !hasValidSession ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 bg-[#FEF2F2] text-[#EF4444] rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#14211D]">Reset Link Expired</h2>
              <p className="text-xs text-[#566861] mt-1.5 leading-relaxed">
                This password reset link is invalid or has expired. Please request a new recovery link from the Sign In page.
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="accent"
                size="md"
                onClick={() => onNavigate('login')}
                className="w-full font-bold py-2.5 px-4 shadow-xs cursor-pointer text-xs"
                icon={ArrowLeft}
              >
                Return to Sign In
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#065F46] text-[11px] font-semibold mb-2">
                <KeyRound className="w-3.5 h-3.5 text-[#10B981]" />
                Password Recovery
              </div>
              <h2 className="text-xl font-bold text-[#14211D]">Set New Password</h2>
              <p className="text-xs text-[#566861] mt-1">
                Enter your new password below. Must be at least 6 characters.
              </p>
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FEF2F2] border border-[#FEE2E2] text-xs text-[#991B1B]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#EF4444]" />
                <span className="font-medium leading-relaxed">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#14211D] block">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#566861] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#566861] hover:text-[#0B3326] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#14211D] block">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#566861] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#566861] hover:text-[#0B3326] cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="accent"
                  size="md"
                  disabled={isSubmitting}
                  icon={ArrowRight}
                  iconPosition="right"
                  className="w-full font-bold py-2.5 px-4 shadow-xs cursor-pointer text-xs"
                >
                  {isSubmitting ? 'Updating Password...' : 'Save New Password'}
                </Button>
              </div>
            </form>

            <div className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-[#566861]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Secured by AgroLnk Cryptographic Escrow Vault</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

