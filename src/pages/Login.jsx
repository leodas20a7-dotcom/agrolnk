import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Check,
  CheckCircle2,
  Lock,
  Mail,
  User,
  Phone,
  Sparkles,
  X,
  KeyRound
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { loginUser, registerUser, sendPasswordResetEmail } from '../utils/auth';
import logoImg from '../assets/Logo.jpeg';

export default function Login({ onNavigate, navState }) {
  // Flip state: false = Sign In (Front), true = Join AgroLnk (Back)
  const [isFlipped, setIsFlipped] = useState(Boolean(navState?.initialRegister));

  // --- Sign In State ---
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [signInError, setSignInError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  // --- Forgot Password Modal State ---
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  // Live countdown timer for email rate limit cooldown (60 seconds)
  useEffect(() => {
    let timer;
    if (resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const handleOpenForgotModal = () => {
    setForgotError('');
    setForgotSuccess(false);
    if (signInEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signInEmail.trim())) {
      setForgotEmail(signInEmail.trim());
    } else {
      setForgotEmail('');
    }
    setShowForgotModal(true);
  };

  const handleSendPasswordReset = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setForgotError('');

    if (resendCountdown > 0) {
      setForgotError(`Security cooldown active. Please wait ${resendCountdown} seconds before requesting another email.`);
      return;
    }

    const emailToReset = forgotEmail.trim();
    if (!emailToReset) {
      setForgotError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToReset)) {
      setForgotError('Please enter a valid email address.');
      return;
    }

    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(emailToReset);
      setForgotSuccess(true);
      setResendCountdown(60);
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('rate limit')) {
        setForgotError('Security cooldown active. Please wait 60 seconds before requesting another email.');
        setResendCountdown(60);
      } else {
        setForgotError(msg || 'Unable to send reset email. Please try again.');
      }
    } finally {
      setIsSendingReset(false);
    }
  };

  // --- Register State ---
  const [selectedRole, setSelectedRole] = useState(navState?.role || 'farmer');
  const [registerData, setRegisterData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
  });
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [hoveredRole, setHoveredRole] = useState(null);

  const roles = [
    { id: 'farmer', label: 'Farmer', tooltip: 'Farmer / Producer', icon: '🌾' },
    { id: 'fpo', label: 'FPO / Org', tooltip: 'Farmer Producer Organisation (FPO)', icon: '🏢' },
    { id: 'food_processor', label: 'Food Processor', tooltip: 'Food Processor & Commercial Miller', icon: '🏭' },
    { id: 'buyer', label: 'Buyer', tooltip: 'Wholesale Buyer & Trader', icon: '🛒' },
    { id: 'financier', label: 'Financial Inst.', tooltip: 'Financial Institution', icon: '💰' },
    { id: 'transporter', label: 'Transporter', tooltip: 'Logistics Transporter', icon: '🚚' },
    { id: 'warehouse', label: 'Warehouse', tooltip: 'Warehouse & Cold Storage Operator', icon: '🏪' },
  ];

  // Handle Sign In Submit
  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    setSignInError('');

    if (!signInEmail.trim()) {
      setSignInError('Please enter your email address or 10-digit mobile number.');
      return;
    }
    if (!signInPassword || !signInPassword.trim()) {
      setSignInError('Please enter your password.');
      return;
    }

    setIsSigningIn(true);

    try {
      const user = await loginUser({ email: signInEmail, password: signInPassword });
      onNavigate(`${user.role}-dashboard`, { user });
    } catch (err) {
      setSignInError(err.message || "We couldn't sign you in. Please check your credentials and try again.");
      setIsSigningIn(false);
    }
  };

  // Handle Register Submit
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterError('');

    if (!registerData.name.trim()) {
      setRegisterError('Please enter your full name.');
      return;
    }
    if (!/^[A-Za-z\s.]{2,}$/.test(registerData.name.trim())) {
      setRegisterError('Full name must contain only letters and spaces (no numbers).');
      return;
    }
    if (!registerData.phone.trim()) {
      setRegisterError('Please enter your mobile number.');
      return;
    }
    if (registerData.phone.length !== 10 || !/^\d{10}$/.test(registerData.phone)) {
      setRegisterError('Mobile number must be exactly 10 digits.');
      return;
    }
    if (!registerData.email.trim()) {
      setRegisterError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerData.email.trim())) {
      setRegisterError('Please enter a valid email address (e.g. user@example.com).');
      return;
    }
    if (!registerData.password || registerData.password.length < 6) {
      setRegisterError('Password must be at least 6 characters.');
      return;
    }

    setIsRegistering(true);

    try {
      const user = await registerUser({
        name: registerData.name,
        phone: registerData.phone,
        email: registerData.email,
        password: registerData.password,
        role: selectedRole,
      });

      onNavigate(`${user.role}-dashboard`, { user });
    } catch (err) {
      setRegisterError(err.message || 'Registration failed. Please try again.');
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] flex flex-col items-center justify-center py-6 px-4 sm:p-6 lg:p-8 xl:p-10">

      {/* 3D Perspective Container (Expands dynamically on desktop) */}
      <div className="perspective-1000 w-full max-w-5xl xl:max-w-6xl my-auto">

        {/* Flippable Card Wrapper */}
        <div
          className={`relative w-full transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''
            }`}
          style={{ transformStyle: 'preserve-3d' }}
        >

          {/* ================= FRONT SIDE: SIGN IN ================= */}
          <div
            className={`w-full bg-white rounded-3xl border border-[#E5EDE8] shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 text-left backface-hidden ${isFlipped ? 'absolute inset-0 pointer-events-none' : 'relative'
              }`}
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            {/* Left Brand Panel */}
            <div className="lg:col-span-5 bg-[#0B3326] text-white p-5 sm:p-9 xl:p-11 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#14624A]">
              <div className="space-y-4 sm:space-y-6">
                <button
                  onClick={() => onNavigate('landing')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#34D399] hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Home
                </button>

                <div className="flex items-center gap-3">
                  <img
                    src={logoImg}
                    alt="AgroLnk Logo"
                    className="w-9 h-9 sm:w-11 sm:h-11 object-contain rounded-xl bg-white p-0.5 shadow-xs shrink-0"
                  />
                  <div>
                    <span className="text-xl sm:text-2xl font-bold tracking-tight text-white font-heading block">
                      AgroLnk
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-[#34D399] font-semibold uppercase tracking-widest block">
                      Digital Agri Exchange
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2 pt-1">
                  <h2 className="text-xl sm:text-3xl font-extrabold font-heading text-white leading-tight">
                    Fair markets. <br className="hidden sm:inline" />
                    <span className="text-[#34D399]">Better futures.</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-[#DCFCE7]/80 leading-relaxed font-normal">
                    Direct trade, digital auctions, verified logistics, and guaranteed escrow protection.
                  </p>
                </div>

                <div className="hidden sm:block space-y-3 pt-3 border-t border-[#14624A] text-xs sm:text-sm text-[#DCFCE7]/90">
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-[#10B981] flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                    </div>
                    <span>Zero middleman commission deductions</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-[#10B981] flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                    </div>
                    <span>100% Escrow deposit payment security</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-[#10B981] flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                    </div>
                    <span>Integrated transport & warehouse receipts</span>
                  </div>
                </div>
              </div>

              <div className="hidden sm:flex pt-6 mt-6 border-t border-[#14624A] text-xs text-[#DCFCE7]/60 items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#34D399]" />
                <span>Escrow & Bank Grade Security</span>
              </div>
            </div>  

            {/* Right Sign In Form */}
            <div className="lg:col-span-7 p-7 sm:p-9 xl:p-11 flex flex-col justify-between bg-white space-y-6">
              <div className="space-y-5">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-[#0B3326] font-heading">
                    Welcome back
                  </h1>
                  <p className="text-xs sm:text-sm text-[#566861] mt-1">
                    Sign in to access your agricultural exchange desk.
                  </p>
                </div>

                {signInError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{signInError}</span>
                  </div>
                )}

                <form onSubmit={handleSignInSubmit} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#14211D] block">
                      Email or Mobile Number
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#566861] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        placeholder="e.g. user@example.com or 9876543210"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#14211D] block">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={handleOpenForgotModal}
                        className="text-[11px] font-semibold text-[#10B981] hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#566861] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showSignInPassword ? 'text' : 'password'}
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignInPassword(!showSignInPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#566861] hover:text-[#0B3326] cursor-pointer"
                      >
                        {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-1">
                    <Button
                      type="submit"
                      variant="accent"
                      size="md"
                      disabled={isSigningIn}
                      icon={ArrowRight}
                      iconPosition="right"
                      className="w-full font-bold py-2.5 px-4 shadow-xs cursor-pointer text-xs"
                    >
                      {isSigningIn ? 'Signing In...' : 'Sign In'}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Flip to Register trigger */}
              <div className="pt-3 border-t border-[#E5EDE8] text-center text-xs text-[#566861]">
                <span>Don't have an account? </span>
                <button
                  type="button"
                  onClick={() => setIsFlipped(true)}
                  className="font-bold text-[#0B3326] hover:text-[#10B981] hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Join AgroLnk</span>
                  <span className="text-[10px] text-[#10B981]">🔄</span>
                </button>
              </div>
            </div>
          </div>

          {/* ================= BACK SIDE: JOIN AGROLNK (REGISTER) ================= */}
          <div
            className={`w-full bg-white rounded-3xl border border-[#E5EDE8] shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 text-left backface-hidden rotate-y-180 ${!isFlipped ? 'absolute inset-0 pointer-events-none' : 'relative'
              }`}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            {/* Left Brand Panel */}
            <div className="lg:col-span-5 bg-[#0B3326] text-white p-5 sm:p-9 xl:p-11 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#14624A]">
              <div className="space-y-4 sm:space-y-6">
                <button
                  onClick={() => setIsFlipped(false)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#34D399] hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Sign In
                </button>

                <div className="flex items-center gap-3">
                  <img
                    src={logoImg}
                    alt="AgroLnk Logo"
                    className="w-9 h-9 sm:w-11 sm:h-11 object-contain rounded-xl bg-white p-0.5 shadow-xs shrink-0"
                  />
                  <div>
                    <span className="text-xl sm:text-2xl font-bold tracking-tight text-white font-heading block">
                      AgroLnk
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-[#34D399] font-semibold uppercase tracking-widest block">
                      Direct Agricultural Exchange
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2 pt-1">
                  <h2 className="text-xl sm:text-3xl font-extrabold font-heading text-white leading-tight">
                    Join the <br className="hidden sm:inline" />
                    <span className="text-[#34D399]">New Exchange.</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-[#DCFCE7]/80 leading-relaxed font-normal">
                    Create your account to start trading directly with guaranteed pricing and escrow protection.
                  </p>
                </div>

                <div className="hidden sm:block space-y-3 pt-3 border-t border-[#14624A] text-xs sm:text-sm text-[#DCFCE7]/90">
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-[#10B981] flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                    </div>
                    <span>Instant verified onboarding in 1 minute</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-[#10B981] flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                    </div>
                    <span>Full access to direct trading & live auctions</span>
                  </div>
                </div>
              </div>

              <div className="hidden sm:flex pt-6 mt-6 border-t border-[#14624A] text-xs text-[#DCFCE7]/60 items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#34D399]" />
                <span>WDRA & Escrow Protected</span>
              </div>
            </div>

            {/* Right Join AgroLnk Form */}
            <div className="lg:col-span-7 p-7 sm:p-9 xl:p-11 flex flex-col justify-between bg-white space-y-5">
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-[#0B3326] font-heading">
                    Create your account
                  </h1>
                  <p className="text-xs sm:text-sm text-[#566861] mt-1">
                    Select your participation role and fill in your details.
                  </p>
                </div>

                {/* Role Pill Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#14211D] uppercase tracking-wider block">
                      Choose Your Role
                    </label>
                    <span className="text-[11px] font-semibold text-[#10B981] transition-all duration-200 truncate ml-2">
                      {roles.find(r => r.id === (hoveredRole || selectedRole))?.tooltip}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1 relative">
                    {roles.map((r) => {
                      const isSelected = selectedRole === r.id;
                      const isTooltipVisible = hoveredRole === r.id;
                      
                      // Alignment for edge pills to avoid clipping
                      const tooltipAlign = r.id === 'farmer' 
                        ? 'left-0 translate-x-0' 
                        : r.id === 'warehouse' 
                        ? 'right-0 translate-x-0' 
                        : 'left-1/2 -translate-x-1/2';
                        
                      const arrowAlign = r.id === 'farmer' 
                        ? 'left-4' 
                        : r.id === 'warehouse' 
                        ? 'right-4' 
                        : 'left-1/2 -translate-x-1/2';

                      return (
                        <div key={r.id} className="relative flex-1 min-w-[65px] sm:min-w-0">
                          {/* Floating Tooltip Bubble ONLY on Hover */}
                          {isTooltipVisible && (
                            <div
                              role="tooltip"
                              className={`absolute bottom-full ${tooltipAlign} mb-2.5 z-40 pointer-events-none whitespace-nowrap bg-[#0B3326] text-white text-[10px] sm:text-[11px] font-semibold py-1.5 px-2.5 rounded-lg shadow-xl border border-[#14624A] animate-in fade-in zoom-in-95 duration-150 flex items-center gap-1.5`}
                            >
                              <span>{r.icon}</span>
                              <span>{r.tooltip}</span>
                              <div className={`absolute top-full ${arrowAlign} -mt-1 w-2 h-2 bg-[#0B3326] rotate-45 border-b border-r border-[#14624A]`} />
                            </div>
                          )}

                          <button
                            type="button"
                            title={r.tooltip}
                            onClick={() => setSelectedRole(r.id)}
                            onMouseEnter={() => setHoveredRole(r.id)}
                            onMouseLeave={() => setHoveredRole(null)}
                            onFocus={() => setHoveredRole(r.id)}
                            onBlur={() => setHoveredRole(null)}
                            className={`w-full py-2.5 px-1.5 rounded-xl text-center transition-all cursor-pointer border flex flex-col items-center justify-center gap-1 ${isSelected
                              ? 'bg-[#0B3326] text-white border-[#0B3326] shadow-xs ring-2 ring-[#10B981]/40'
                              : 'bg-[#F8FAF8] text-[#566861] border-[#E5EDE8] hover:border-[#10B981]/50 hover:bg-white'
                              }`}
                          >
                            <span className="text-base">{r.icon}</span>
                            <span className="text-[11px] sm:text-xs font-bold leading-tight truncate max-w-full">
                              {r.label}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {registerError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{registerError}</span>
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} className="space-y-2.5">
                  {/* Name & Phone in 2 cols */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#14211D] block">
                        {selectedRole === 'fpo' 
                          ? 'Organisation Name' 
                          : selectedRole === 'financier'
                          ? 'Institution Name'
                          : 'Full Name'}
                      </label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-[#566861] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={registerData.name}
                          onChange={(e) => {
                            const lettersOnly = e.target.value.replace(/[^a-zA-Z\s.]/g, '');
                            setRegisterData({ ...registerData, name: lettersOnly });
                          }}
                          placeholder={
                            selectedRole === 'fpo' 
                              ? 'e.g. Cauvery Delta Collective' 
                              : selectedRole === 'financier'
                              ? 'e.g. Kisan Capital NBFC'
                              : 'e.g. Ramesh Kumar'
                          }
                          className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#14211D] block">
                        Mobile Number
                      </label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-[#566861] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          value={registerData.phone}
                          onChange={(e) => {
                            const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setRegisterData({ ...registerData, phone: digitsOnly });
                          }}
                          placeholder="10 digit number"
                          className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email & Password in 2 cols */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#14211D] block">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-[#566861] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={registerData.email}
                          onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                          placeholder="ramesh@example.com"
                          className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#14211D] block">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-[#566861] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showRegisterPassword ? 'text' : 'password'}
                          value={registerData.password}
                          onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                          placeholder="••••••••"
                          className="w-full pl-8 pr-8 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#566861] hover:text-[#0B3326] cursor-pointer"
                        >
                          {showRegisterPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1">
                    <Button
                      type="submit"
                      variant="accent"
                      size="md"
                      disabled={isRegistering}
                      icon={ArrowRight}
                      iconPosition="right"
                      className="w-full font-bold py-2.5 px-4 shadow-xs cursor-pointer text-xs"
                    >
                      {isRegistering ? 'Creating Account...' : `Join as ${roles.find(r => r.id === selectedRole)?.label || 'Member'}`}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Flip back to Sign In trigger */}
              <div className="pt-3 border-t border-[#E5EDE8] text-center text-xs text-[#566861]">
                <span>Already have an account? </span>
                <button
                  type="button"
                  onClick={() => setIsFlipped(false)}
                  className="font-bold text-[#0B3326] hover:text-[#10B981] hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Sign In</span>
                  <span className="text-[10px] text-[#10B981]">🔄</span>
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-[#E5EDE8] shadow-2xl w-full max-w-md p-6 sm:p-7 relative">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-5 right-5 text-[#566861] hover:text-[#14211D] p-1.5 rounded-full hover:bg-[#F8FAF8] transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#ECFDF5] text-[#10B981] flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#14211D]">Reset your password</h3>
                <p className="text-xs text-[#566861]">We'll send a secure password recovery link</p>
              </div>
            </div>

            {forgotSuccess ? (
              <div className="py-2 space-y-4 text-center">
                <div className="p-4 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-left">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-[#065F46]">Recovery link sent!</h4>
                      <p className="text-xs text-[#047857] mt-1 leading-relaxed">
                        We have sent password reset instructions to <strong className="font-semibold">{forgotEmail}</strong>. Please check your inbox (and spam folder) and click the link.
                      </p>
                    </div>
                  </div>
                </div>

                {resendCountdown > 0 ? (
                  <div className="text-[11px] text-[#566861] flex items-center justify-center gap-1.5 py-1">
                    <span>Didn't get the email? Resend available in</span>
                    <span className="font-bold text-[#0B3326] bg-[#F0FDF4] px-2 py-0.5 rounded-md border border-[#DCFCE7]">{resendCountdown}s</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendPasswordReset}
                    disabled={isSendingReset}
                    className="text-xs font-semibold text-[#10B981] hover:underline cursor-pointer py-1 block mx-auto"
                  >
                    Didn't receive email? Click here to resend
                  </button>
                )}

                <Button
                  variant="accent"
                  size="md"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full font-bold py-2.5 px-4 shadow-xs cursor-pointer text-xs"
                >
                  Close & Return to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSendPasswordReset} className="space-y-4">
                <p className="text-xs text-[#566861] leading-relaxed">
                  Enter the email address associated with your AgroLnk account and we'll send you a password recovery link.
                </p>

                {forgotError && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-[#FEF2F2] border border-[#FEE2E2] text-xs text-[#991B1B]">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#EF4444]" />
                    <span className="font-medium">{forgotError}</span>
                  </div>
                )}

                {resendCountdown > 0 && !forgotError && (
                  <div className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] text-[11px] text-[#166534] font-medium">
                    <span>⏱️ Please wait</span>
                    <span className="font-bold text-[#15803D]">{resendCountdown}s</span>
                    <span>before requesting another link</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#14211D] block">
                    Registered Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#566861] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="e.g. user@example.com"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 font-semibold py-2.5 text-xs border border-[#E5EDE8] cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="accent"
                    size="md"
                    disabled={isSendingReset || resendCountdown > 0}
                    icon={resendCountdown > 0 ? null : ArrowRight}
                    iconPosition="right"
                    className="flex-1 font-bold py-2.5 text-xs shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSendingReset
                      ? 'Sending...'
                      : resendCountdown > 0
                      ? `Wait ${resendCountdown}s`
                      : 'Send Link'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
