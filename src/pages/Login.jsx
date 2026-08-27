import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Check,
  Lock,
  Mail,
  User,
  Phone,
  Sparkles
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { loginUser, registerUser } from '../utils/auth';
import logoImg from '../assets/Logo.jpeg';

export default function Login({ onNavigate, navState }) {
  // Flip state: false = Sign In (Front), true = Join AGRAMAZ (Back)
  const [isFlipped, setIsFlipped] = useState(Boolean(navState?.initialRegister));

  // --- Sign In State ---
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [signInError, setSignInError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

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

  const roles = [
    { id: 'farmer', label: 'Farmer', icon: '🌾' },
    { id: 'buyer', label: 'Buyer', icon: '🛒' },
    { id: 'financier', label: 'Financier', icon: '💰' },
    { id: 'transporter', label: 'Transporter', icon: '🚚' },
    { id: 'warehouse', label: 'Warehouse', icon: '🏭' },
  ];

  const demoAccounts = [
    { label: 'Farmer', email: 'farmer@agramaz.com', icon: '🌾' },
    { label: 'Buyer', email: 'buyer@agramaz.com', icon: '🛒' },
    { label: 'Financier', email: 'financier@agramaz.com', icon: '💰' },
    { label: 'Transporter', email: 'transporter@agramaz.com', icon: '🚚' },
    { label: 'Warehouse', email: 'warehouse@agramaz.com', icon: '🏭' },
  ];

  // Handle Sign In Submit
  const handleSignInSubmit = (e) => {
    e.preventDefault();
    setSignInError('');

    if (!signInEmail.trim()) {
      setSignInError('Please enter your email address.');
      return;
    }

    setIsSigningIn(true);

    try {
      const user = loginUser({ email: signInEmail, password: signInPassword });
      onNavigate(`${user.role}-dashboard`, { user });
    } catch (err) {
      setSignInError("We couldn't sign you in. Please check your email and try again.");
      setIsSigningIn(false);
    }
  };

  // Handle Quick Demo Login
  const handleQuickDemoLogin = (demoEmail) => {
    setSignInError('');
    try {
      const user = loginUser({ email: demoEmail, password: 'password' });
      onNavigate(`${user.role}-dashboard`, { user });
    } catch (err) {
      setSignInError("We couldn't sign you in. Please check your email and try again.");
    }
  };

  // Handle Register Submit
  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    setRegisterError('');

    if (!registerData.name.trim()) {
      setRegisterError('Please enter your full name.');
      return;
    }
    if (!registerData.phone.trim()) {
      setRegisterError('Please enter your mobile number.');
      return;
    }
    if (!registerData.email.trim()) {
      setRegisterError('Please enter your email address.');
      return;
    }

    setIsRegistering(true);

    try {
      const user = registerUser({
        name: registerData.name,
        phone: registerData.phone,
        email: registerData.email,
        role: selectedRole,
      });

      onNavigate(`${user.role}-dashboard`, { user });
    } catch (err) {
      setRegisterError(err.message || 'Registration failed. Please try again.');
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] flex items-center justify-center p-4 sm:p-6 lg:p-8 xl:p-10">
      
      {/* 3D Perspective Container (Expands dynamically on desktop) */}
      <div className="perspective-1000 w-full max-w-5xl xl:max-w-6xl">
        
        {/* Flippable Card Wrapper */}
        <div
          className={`relative w-full transition-transform duration-700 transform-style-3d ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          style={{ transformStyle: 'preserve-3d' }}
        >
          
          {/* ================= FRONT SIDE: SIGN IN ================= */}
          <div
            className={`w-full bg-white rounded-3xl border border-[#E5EDE8] shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 text-left backface-hidden ${
              isFlipped ? 'pointer-events-none' : ''
            }`}
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            {/* Left Brand Panel */}
            <div className="lg:col-span-5 bg-[#0B3326] text-white p-7 sm:p-9 xl:p-11 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#14624A]">
              <div className="space-y-6">
                <button
                  onClick={() => onNavigate('landing')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#34D399] hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Home
                </button>

                <div className="flex items-center gap-3">
                  <img
                    src={logoImg}
                    alt="AGRAMAZ Logo"
                    className="w-11 h-11 object-contain rounded-xl bg-white p-0.5 shadow-xs shrink-0"
                  />
                  <div>
                    <span className="text-2xl font-bold tracking-tight text-white font-heading block">
                      AGRAMAZ
                    </span>
                    <span className="text-[11px] text-[#34D399] font-semibold uppercase tracking-widest block">
                      Digital Agri Exchange
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white leading-tight">
                    Fair markets. <br />
                    <span className="text-[#34D399]">Better futures.</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-[#DCFCE7]/80 leading-relaxed font-normal">
                    Direct trade, digital auctions, verified logistics, and guaranteed escrow protection.
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-[#14624A] text-xs sm:text-sm text-[#DCFCE7]/90">
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

              <div className="pt-6 mt-6 border-t border-[#14624A] text-xs text-[#DCFCE7]/60 flex items-center gap-2">
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

                {/* 1-Click Demo Pills */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#0B3326]">
                      ⚡ 1-Click Demo Access
                    </span>
                    <span className="text-[11px] text-[#566861]">
                      Instant Test Sign-In
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {demoAccounts.map((demo) => (
                      <button
                        key={demo.label}
                        type="button"
                        onClick={() => handleQuickDemoLogin(demo.email)}
                        className="py-2 px-2.5 rounded-xl bg-white border border-[#E5EDE8] hover:border-[#10B981] hover:bg-[#F2FBF6] transition-all text-center text-xs font-bold text-[#14211D] hover:text-[#0B3326] flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <span className="text-sm">{demo.icon}</span>
                        <span className="text-xs">{demo.label}</span>
                      </button>
                    ))}
                  </div>
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
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#566861] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        placeholder="e.g. farmer@agramaz.com"
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
                        onClick={() => setSignInError('For prototype testing, click any 1-Click demo button above.')}
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
                  <span>Join AGRAMAZ</span>
                  <span className="text-[10px] text-[#10B981]">🔄</span>
                </button>
              </div>
            </div>
          </div>

          {/* ================= BACK SIDE: JOIN AGRAMAZ (REGISTER) ================= */}
          <div
            className={`absolute inset-0 w-full h-full bg-white rounded-3xl border border-[#E5EDE8] shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 text-left backface-hidden rotate-y-180 ${
              !isFlipped ? 'pointer-events-none' : ''
            }`}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            {/* Left Brand Panel */}
            <div className="lg:col-span-5 bg-[#0B3326] text-white p-7 sm:p-9 xl:p-11 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#14624A]">
              <div className="space-y-6">
                <button
                  onClick={() => setIsFlipped(false)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#34D399] hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Sign In
                </button>

                <div className="flex items-center gap-3">
                  <img
                    src={logoImg}
                    alt="AGRAMAZ Logo"
                    className="w-11 h-11 object-contain rounded-xl bg-white p-0.5 shadow-xs shrink-0"
                  />
                  <div>
                    <span className="text-2xl font-bold tracking-tight text-white font-heading block">
                      AGRAMAZ
                    </span>
                    <span className="text-[11px] text-[#34D399] font-semibold uppercase tracking-widest block">
                      Direct Agricultural Exchange
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white leading-tight">
                    Join the <br />
                    <span className="text-[#34D399]">New Exchange.</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-[#DCFCE7]/80 leading-relaxed font-normal">
                    Create your account to start trading directly with guaranteed pricing and escrow protection.
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-[#14624A] text-xs sm:text-sm text-[#DCFCE7]/90">
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

              <div className="pt-6 mt-6 border-t border-[#14624A] text-xs text-[#DCFCE7]/60 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#34D399]" />
                <span>WDRA & Escrow Protected</span>
              </div>
            </div>

            {/* Right Join AGRAMAZ Form */}
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
                  <label className="text-xs font-bold text-[#14211D] uppercase tracking-wider block">
                    Choose Your Role
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {roles.map((r) => {
                      const isSelected = selectedRole === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setSelectedRole(r.id)}
                          className={`py-2 px-1.5 rounded-xl text-center transition-all cursor-pointer border text-xs font-bold flex flex-col items-center justify-center gap-1 ${
                            isSelected
                              ? 'bg-[#0B3326] text-white border-[#0B3326] shadow-xs'
                              : 'bg-[#F8FAF8] text-[#566861] border-[#E5EDE8] hover:border-[#10B981]/50 hover:bg-white'
                          }`}
                        >
                          <span className="text-base">{r.icon}</span>
                          <span className="text-xs leading-none">{r.label}</span>
                        </button>
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
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-[#566861] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={registerData.name}
                          onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                          placeholder="e.g. Sakthi Vel"
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
                          value={registerData.phone}
                          onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                          placeholder="+91 98765 43210"
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
                          placeholder="user@example.com"
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

    </div>
  );
}
