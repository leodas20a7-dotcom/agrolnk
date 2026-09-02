import React, { useState, useEffect } from 'react';
import {
  Sprout,
  ShoppingCart,
  Landmark,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Sparkles
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { registerUser } from '../utils/auth';
import logoImg from '../assets/Logo.jpeg';

export default function Register({ onNavigate, navState }) {
  // Read role from navState or localStorage, fallback to 'farmer'
  const [selectedRole, setSelectedRole] = useState(() => {
    return navState?.role || localStorage.getItem('selectedRole') || 'farmer';
  });

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    agreedToTerms: true,
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (navState?.role) {
      setSelectedRole(navState.role);
    }
  }, [navState?.role]);

  const roleMeta = {
    farmer: {
      title: 'Farmer',
      emoji: '🌾',
      badge: 'Zero Commission',
      tagline: 'Sell produce directly & earn more',
      bullets: [
        'Direct connection to national buyers',
        'Zero middleman deduction on settlements',
        '100% Escrow deposit protection',
      ],
      quote:
        '“Agrolnk helped our FPO eliminate middlemen and get paid directly to our bank account upon dispatch.”',
      author: 'Ramesh Patel, Producer (Madhya Pradesh)',
    },
    buyer: {
      title: 'Buyer',
      emoji: '🛒',
      badge: 'Verified Grades',
      tagline: 'Source quality commodities in volume',
      bullets: [
        'Lab-assayed NABL quality guarantees',
        'Transparent direct & auction lot discovery',
        'Integrated GPS logistics and dispatch',
      ],
      quote:
        '“We secure high-grade wheat and rice lots with full quality test reports before making any payment.”',
      author: 'Ananya Agro Foods, Commercial Miller',
    },
    financier: {
      title: 'Financier',
      emoji: '💰',
      badge: 'Escrow Backed',
      tagline: 'Finance verified agricultural trades',
      bullets: [
        'Backed by digital warehouse receipts (e-NWR)',
        'Automated trade turnaround & repayment',
        'Zero historical default rate on escrow lots',
      ],
      quote:
        '“Direct invoice visibility and escrow-locked payouts give us institutional confidence to fund agri-trades.”',
      author: 'Kisan Capital Partners, NBFC',
    },
    transporter: {
      title: 'Transporter',
      emoji: '🚚',
      badge: 'Guaranteed Freight',
      tagline: 'Move agricultural freight & grow earnings',
      bullets: [
        'Direct farmgate freight manifest bookings',
        'Instant trip settlement upon confirmed drop-off',
        'Verified GPS and consignment handover protocol',
      ],
      quote:
        '“No more empty return trips. Agrolnk connects our fleet directly to harvesting farmgates across states.”',
      author: 'Vetri Logistics & Transport, Fleet Operator',
    },
    warehouse: {
      title: 'Warehouse Operator',
      emoji: '🏭',
      badge: 'WDRA Certified',
      tagline: 'Operate certified agri-storage & issue e-NWR',
      bullets: [
        'Electronic Negotiable Warehouse Receipts (e-NWR)',
        'Real-time chamber temperature & capacity telemetry',
        'Seamless marketplace release order verification',
      ],
      quote:
        '“Agrolnk digitizes our warehouse receipts and connects our storage chambers directly to national trade flows.”',
      author: 'Salem Agri Cold Storage Hub, WDRA Accredited Operator',
    },
  };

  const currentRole = roleMeta[selectedRole] || roleMeta.farmer;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let cleanValue = value;

    if (name === 'name') {
      // Name: Only allow letters, spaces, dots (no numbers)
      cleanValue = value.replace(/[^a-zA-Z\s.]/g, '');
    } else if (name === 'phone') {
      // Phone: Only allow digits, max 10 characters (no letters)
      cleanValue = value.replace(/\D/g, '').slice(0, 10);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : cleanValue,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!/^[A-Za-z\s.]{2,}$/.test(formData.name.trim())) {
      setError('Full name must contain only letters and spaces (no numbers).');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Please enter your mobile number.');
      return;
    }
    if (formData.phone.length !== 10 || !/^\d{10}$/.test(formData.phone)) {
      setError('Mobile number must be exactly 10 digits.');
      return;
    }
    if (!formData.email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setError('Please enter a valid email address (e.g. user@example.com).');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!formData.agreedToTerms) {
      setError('Please agree to the Terms of Service & Privacy Policy.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Register user and store in Supabase & session cache
      const user = await registerUser({
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        role: selectedRole,
      });

      // Navigate to respective role-based dashboard
      onNavigate(`${user.role}-dashboard`, { user });
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8">

      {/* Container with Split Layout on Desktop */}
      <div className="max-w-5xl w-full mx-auto bg-white rounded-3xl border border-[#E5EDE8] shadow-lg overflow-hidden grid grid-cols-1 lg:grid-cols-12">

        {/* Left Side (Desktop Only): Solid Deep Green Brand & Value Panel */}
        <div className="lg:col-span-5 bg-[#0B3326] text-white p-8 sm:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#14624A]">

          {/* Top Logo & Back Nav */}
          <div className="space-y-6">
            <button
              onClick={() => onNavigate('role-selection')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#34D399] hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Change Role
            </button>

            <div className="flex items-center gap-3">
              <img
                src={logoImg}
                alt="Agrolnk Logo"
                className="w-10 h-10 object-contain rounded-xl bg-white p-0.5 shadow-xs"
              />
              <div>
                <span className="text-xl font-bold tracking-tight text-white font-heading">
                  Agrolnk
                </span>
                <span className="block text-[10px] text-[#10B981] font-semibold uppercase tracking-widest">
                  Agricultural Digital Exchange
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2 text-left">
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white leading-tight">
                Fair markets. <br />
                <span className="text-[#34D399]">Better futures.</span>
              </h2>
              <p className="text-xs text-[#DCFCE7]/80 leading-relaxed">
                {currentRole.tagline} through transparent pricing, verified grading, and guaranteed escrow protection.
              </p>
            </div>
          </div>

          {/* Middle: Role Specific Value Highlights */}
          <div className="py-3 sm:py-6 space-y-3 sm:space-y-4 text-left">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0F4A37] border border-[#14624A] space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#34D399] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> For {currentRole.title}s
                </span>
                <Badge variant="accent" size="sm">
                  {currentRole.badge}
                </Badge>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                {currentRole.bullets.map((bullet, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-white/90">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0 mt-0.5" />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Testimonial Quote - hidden on mobile */}
            <div className="hidden sm:block p-3.5 rounded-xl bg-white/5 border border-white/10 text-left">
              <p className="text-xs italic text-[#DCFCE7]/90 leading-relaxed">
                {currentRole.quote}
              </p>
              <span className="block text-[10px] font-semibold text-[#34D399] mt-2">
                — {currentRole.author}
              </span>
            </div>
          </div>

          {/* Bottom Security Note */}
          <div className="hidden sm:flex pt-4 border-t border-[#14624A] items-center gap-2 text-xs text-[#34D399]">
            <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
            <span className="text-[11px] text-white/80">
              100% Escrow & Bank-Guaranteed Settlements
            </span>
          </div>

        </div>

        {/* Right Side: Clean Minimal Registration Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">

          <div className="space-y-6">

            {/* Top Account Type Banner with "Change" Link */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8]">
              <div className="flex items-center gap-2">
                <span className="text-lg">{currentRole.emoji}</span>
                <span className="text-xs text-[#566861]">
                  Account type:{' '}
                  <strong className="text-[#0B3326] font-bold text-sm">
                    {currentRole.title}
                  </strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('role-selection')}
                className="text-xs font-bold text-[#10B981] hover:text-[#0B3326] transition-colors underline cursor-pointer"
              >
                Change
              </button>
            </div>

            {/* Form Headline */}
            <div className="space-y-1 text-left">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
                Create your Agrolnk account
              </h1>
              <p className="text-xs sm:text-sm text-[#566861]">
                Join a marketplace built for better agricultural opportunities.
              </p>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Registration Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-4 text-left">

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-[#14211D] mb-1.5">
                  Full name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] text-sm text-[#14211D] placeholder:text-[#566861]/40 focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent transition-all"
                />
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-[#14211D] mb-1.5">
                  Mobile number
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="9876543210 (10 digits)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] text-sm text-[#14211D] placeholder:text-[#566861]/40 focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent transition-all"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-[#14211D] mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="ramesh@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] text-sm text-[#14211D] placeholder:text-[#566861]/40 focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-[#14211D] mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a secure password (min 6 chars)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] text-sm text-[#14211D] placeholder:text-[#566861]/40 focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:border-transparent transition-all"
                />
              </div>

              {/* Terms Checkbox */}
              <div className="pt-1 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="agreedToTerms"
                  name="agreedToTerms"
                  checked={formData.agreedToTerms}
                  onChange={handleChange}
                  className="mt-1 w-4 h-4 rounded text-[#10B981] focus:ring-[#10B981] border-[#E5EDE8] cursor-pointer"
                />
                <label
                  htmlFor="agreedToTerms"
                  className="text-xs text-[#566861] leading-tight cursor-pointer"
                >
                  I agree to the{' '}
                  <span className="text-[#0B3326] font-semibold underline">
                    Terms of Service
                  </span>{' '}
                  and{' '}
                  <span className="text-[#0B3326] font-semibold underline">
                    Privacy Policy
                  </span>
                  .
                </label>
              </div>

              {/* Submit CTA Button */}
              <div className="pt-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={isSubmitting}
                  className="w-full justify-center py-3 font-bold text-sm shadow-xs cursor-pointer"
                  icon={ArrowRight}
                  iconPosition="right"
                >
                  {isSubmitting ? 'Creating Account...' : 'Create Account'}
                </Button>
              </div>

            </form>
          </div>

          {/* Bottom Sign In Link */}
          <div className="mt-8 pt-6 border-t border-[#E5EDE8] text-center">
            <p className="text-xs text-[#566861]">
              Already have an account?{' '}
              <button
                onClick={() => onNavigate('login')}
                className="font-bold text-[#0B3326] hover:text-[#10B981] transition-colors cursor-pointer"
              >
                Sign In
              </button>
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
