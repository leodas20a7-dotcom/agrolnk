import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Check } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import logoImg from '../assets/Logo.jpeg';

export default function RoleSelection({ onNavigate, navState }) {
  const [selectedRole, setSelectedRole] = useState(() => {
    return navState?.initialRole || localStorage.getItem('selectedRole') || 'farmer';
  });

  const roles = [
    {
      id: 'farmer',
      title: 'Farmer',
      headline: 'Sell produce directly',
      description: 'List harvest lots, run digital auctions, and receive guaranteed escrow payouts.',
      iconEmoji: '🌾',
      badge: 'Zero Commission',
      bgLight: '#EBF5F0',
      highlights: ['Direct fixed pricing', 'Live clock auctions'],
    },
    {
      id: 'buyer',
      title: 'Buyer',
      headline: 'Source verified crops',
      description: 'Discover quality produce, place direct orders, and participate in live auctions.',
      iconEmoji: '🛒',
      badge: 'Verified Grades',
      bgLight: '#F2FBF6',
      highlights: ['NABL verified quality', 'Transparent prices'],
    },
    {
      id: 'financier',
      title: 'Financier',
      headline: 'Trade credit & advances',
      description: 'Deploy working capital into verified, escrow-backed trade invoices.',
      iconEmoji: '💰',
      badge: 'Escrow Backed',
      bgLight: '#EFF6FF',
      highlights: ['Institutional security', 'Automated settlement'],
    },
    {
      id: 'transporter',
      title: 'Transporter',
      headline: 'Move freight & earn',
      description: 'Accept farmgate freight jobs, manage routes, and receive guaranteed freight pay.',
      iconEmoji: '🚚',
      badge: 'Guaranteed Freight',
      bgLight: '#FEF3C7',
      highlights: ['Farmgate load jobs', 'Instant trip payment'],
    },
    {
      id: 'warehouse',
      title: 'Warehouse',
      headline: 'Certified storage hub',
      description: 'Operate WDRA certified chambers, issue digital e-NWR receipts, and manage lots.',
      iconEmoji: '🏭',
      badge: 'WDRA Certified',
      bgLight: '#F3E8FF',
      highlights: ['Digital e-NWR titles', 'Cold chain telemetry'],
    },
  ];

  const handleSelectRole = (roleId) => {
    setSelectedRole(roleId);
    try {
      localStorage.setItem('selectedRole', roleId);
    } catch (err) {
      console.error('Failed to store selected role in localStorage:', err);
    }
  };

  const handleContinue = () => {
    if (!selectedRole) return;
    try {
      localStorage.setItem('selectedRole', selectedRole);
    } catch (err) {
      console.error('Failed to store selected role:', err);
    }
    // Navigate to login with initialRegister=true for flip card register or to register directly
    onNavigate('login', { initialRegister: true, role: selectedRole });
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-[#F8FAF8] flex flex-col justify-between p-4 sm:p-6 lg:p-7">

      {/* 1. Top Header with Pixel-Perfect Center Alignment */}
      <header className="max-w-7xl w-full mx-auto grid grid-cols-3 items-center shrink-0">
        <div className="flex justify-start">
          <button
            onClick={() => onNavigate('landing')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#566861] hover:text-[#0B3326] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </button>
        </div>

        <div className="flex items-center justify-center">
          <span className="text-2xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-[#0B3326] font-heading">
            Join With Us
          </span>
        </div>

        <div className="flex justify-end text-xs text-[#566861]">
          Step <span className="font-bold text-[#0B3326] ml-1 mr-1">1</span> of 2
        </div>
      </header>

      {/* 2. Main Center Content */}
      <main className="max-w-7xl w-full mx-auto my-auto text-center space-y-4 sm:space-y-6">

        {/* Concise Subtitle Prompt */}
        <div className="max-w-xl mx-auto">
          <p className="text-sm sm:text-base font-semibold text-[#0B3326]">
            How will you participate in the digital agricultural exchange?
          </p>
        </div>

        {/* 5 Selectable Cards with Staggered Entrance Animation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-3.5 text-left">
          {roles.map((r, idx) => {
            const isSelected = selectedRole === r.id;

            return (
              <div
                key={r.id}
                onClick={() => handleSelectRole(r.id)}
                style={{ animationDelay: `${idx * 60}ms` }}
                className={`animate-slide-up-fade relative p-3.5 sm:p-4 rounded-2xl cursor-pointer transition-all duration-300 border-2 bg-white flex flex-col justify-between group ${
                  isSelected
                    ? 'border-[#10B981] shadow-md ring-4 ring-[#10B981]/20 bg-[#F2FBF6]/30 -translate-y-1'
                    : 'border-[#E5EDE8] hover:border-[#10B981]/60 hover:shadow-md hover:-translate-y-1'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Badge & Check Indicator */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EBF5F0] text-[#0B3326]">
                      {r.badge}
                    </span>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-[#10B981] border-[#10B981] text-white shadow-xs scale-100'
                          : 'border-[#E5EDE8] bg-white group-hover:border-[#10B981]/50'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3] animate-in zoom-in-50 duration-150" />}
                    </div>
                  </div>

                  {/* Icon & Role Title */}
                  <div className="space-y-1.5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-2xs transition-transform duration-300 group-hover:scale-110"
                      style={{ backgroundColor: r.bgLight }}
                    >
                      <span className="transition-transform duration-200 group-hover:rotate-6">{r.iconEmoji}</span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-[#0B3326] font-heading">
                        {r.title}
                      </h3>
                      <p className="text-[11px] font-semibold text-[#10B981]">
                        {r.headline}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-[#566861] leading-relaxed line-clamp-2">
                    {r.description}
                  </p>

                  {/* 2 Feature Highlights */}
                  <div className="pt-2 border-t border-[#E5EDE8] space-y-1">
                    {r.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[10px] text-[#14211D]">
                        <span className="w-1 h-1 rounded-full bg-[#10B981] shrink-0" />
                        <span className="font-medium truncate">{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Selection Cue */}
                <div className="pt-3">
                  <div
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold text-center transition-colors ${
                      isSelected
                        ? 'bg-[#10B981] text-white shadow-xs'
                        : 'bg-[#F8FAF8] text-[#566861] group-hover:bg-[#EBF5F0] group-hover:text-[#0B3326]'
                    }`}
                  >
                    {isSelected ? '✓ Selected' : `Select ${r.title}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="pt-1 max-w-xs mx-auto space-y-2 animate-slide-up-fade" style={{ animationDelay: '320ms' }}>
          <Button
            variant="accent"
            size="md"
            disabled={!selectedRole}
            onClick={handleContinue}
            className="w-full justify-center text-xs sm:text-sm font-bold py-2.5 shadow-md shadow-[#10B981]/20 hover:shadow-lg hover:shadow-[#10B981]/30 cursor-pointer group"
            icon={ArrowRight}
            iconPosition="right"
          >
            {selectedRole
              ? `Continue as ${roles.find((r) => r.id === selectedRole)?.title}`
              : 'Select a role to continue'}
          </Button>

          <p className="text-[11px] text-[#566861]">
            Already have an account?{' '}
            <button
              onClick={() => onNavigate('login')}
              className="font-bold text-[#0B3326] hover:text-[#10B981] transition-colors cursor-pointer underline"
            >
              Sign In
            </button>
          </p>
        </div>

      </main>

      {/* 3. Bottom Footer */}
      <footer className="max-w-6xl w-full mx-auto text-center text-[10px] text-[#566861]/70 shrink-0">
        <span>Agrolnk Secure Agricultural Digital Exchange • Next Step: Account Verification</span>
      </footer>

    </div>
  );
}
