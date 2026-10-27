import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import Button from '../components/ui/Button';

export default function RoleSelection({ onNavigate, navState }) {
  const [selectedRole, setSelectedRole] = useState(() => {
    return navState?.initialRole || localStorage.getItem('selectedRole') || 'farmer';
  });

  const sliderRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const roles = [
    {
      id: 'farmer',
      title: 'Farmer',
      tooltip: 'Farmer / Producer',
      headline: 'Sell produce directly',
      description: 'List harvest lots, run digital auctions, and receive guaranteed escrow payouts.',
      iconEmoji: '🌾',
      badge: 'Zero Commission',
      bgLight: '#EBF5F0',
      highlights: ['Direct fixed pricing', 'Live clock auctions'],
    },
    {
      id: 'fpo',
      title: 'FPO / Organisation',
      tooltip: 'Farmer Producer Organisation (FPO)',
      headline: 'Producer collective',
      description: 'Aggregate member harvest lots, run institutional auctions, and access working capital.',
      iconEmoji: '🏢',
      badge: 'Organisation',
      bgLight: '#EBF5F0',
      highlights: ['Bulk crop aggregation', 'Guaranteed escrow payout'],
    },
    {
      id: 'food_processor',
      title: 'Food Processor',
      tooltip: 'Food Processor & Commercial Miller',
      headline: 'Process & trade at scale',
      description: 'Source raw agricultural commodities directly from farmgates, and market finished processed goods.',
      iconEmoji: '🏭',
      badge: 'Dual Trader',
      bgLight: '#FEF3C7',
      highlights: ['Source raw commodities', 'Sell processed products'],
    },
    {
      id: 'buyer',
      title: 'Buyer',
      tooltip: 'Wholesale Buyer & Processor',
      headline: 'Source verified crops',
      description: 'Discover quality produce, place direct orders, and participate in live auctions.',
      iconEmoji: '🛒',
      badge: 'Verified Grades',
      bgLight: '#F2FBF6',
      highlights: ['NABL verified quality', 'Transparent prices'],
    },
    {
      id: 'financier',
      title: 'Financial Institution',
      buttonTitle: 'Financier',
      tooltip: 'Financial Institution',
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
      tooltip: 'Logistics Transporter',
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
      tooltip: 'Warehouse Operator',
      headline: 'Certified storage hub',
      description: 'Operate certified storage chambers, issue digital receipts, and manage lots.',
      iconEmoji: '🏭',
      badge: 'WDRA Certified',
      bgLight: '#F3E8FF',
      highlights: ['Digital storage receipts', 'Cold chain telemetry'],
    },
  ];

  const updateScrollButtons = () => {
    if (!sliderRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  useEffect(() => {
    updateScrollButtons();
    window.addEventListener('resize', updateScrollButtons);
    return () => window.removeEventListener('resize', updateScrollButtons);
  }, []);

  const accumulatedRef = useRef(0);

  // Smooth continuous horizontal movement from right to left
  useEffect(() => {
    let animationFrameId;
    const speed = 0.55; // Pixels per frame (~33px per second)

    const step = () => {
      if (!isPaused && sliderRef.current) {
        const el = sliderRef.current;
        const maxScroll = el.scrollWidth - el.clientWidth;

        if (maxScroll > 2) {
          accumulatedRef.current += speed;
          if (accumulatedRef.current >= maxScroll) {
            accumulatedRef.current = 0;
          }
          el.scrollLeft = accumulatedRef.current;
          updateScrollButtons();
        }
      } else if (sliderRef.current) {
        accumulatedRef.current = sliderRef.current.scrollLeft;
      }
      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused]);

  const scroll = (direction) => {
    if (!sliderRef.current) return;
    const cardWidth = 280;
    const delta = direction === 'left' ? -cardWidth : cardWidth;
    
    // Temporarily pause auto-scroll so the arrow click takes effect immediately
    setIsPaused(true);
    sliderRef.current.scrollBy({ left: delta, behavior: 'smooth' });
    accumulatedRef.current = Math.max(0, sliderRef.current.scrollLeft + delta);
    
    // Re-check buttons after scroll completes
    setTimeout(() => {
      updateScrollButtons();
      setIsPaused(false);
    }, 400);
  };

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
    onNavigate('login', { initialRegister: true, role: selectedRole });
  };

  const selectedRoleObj = roles.find((r) => r.id === selectedRole);

  return (
    <div className="min-h-screen sm:h-screen sm:max-h-screen bg-[#F8FAF8] flex flex-col justify-between p-4 sm:p-6 lg:p-7 select-none overflow-x-hidden">

      {/* 1. Top Header */}
      <header className="max-w-7xl w-full mx-auto flex items-center justify-between gap-2 shrink-0">
        <div className="flex justify-start shrink-0">
          <button
            onClick={() => onNavigate('landing')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#566861] hover:text-[#0B3326] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="sm:hidden">Back</span>
            <span className="hidden sm:inline">Back to Home</span>
          </button>
        </div>

        <div className="flex-1 text-center px-2">
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-[#0B3326] font-heading whitespace-nowrap">
            Join With Us
          </h1>
        </div>

        <div className="flex justify-end text-xs sm:text-sm text-[#566861] shrink-0">
          Step <span className="font-bold text-[#0B3326] ml-1 mr-1">1</span> of 2
        </div>
      </header>

      {/* 2. Main Content Center */}
      <main className="max-w-7xl w-full mx-auto my-auto text-center space-y-4 sm:space-y-6 flex flex-col justify-center">

        {/* Subtitle */}
        <div className="max-w-2xl mx-auto px-4">
          <p className="text-sm sm:text-lg font-bold text-[#0B3326]">
            How will you participate in the digital agricultural exchange?
          </p>
        </div>

        {/* Carousel Container with Left / Right Slider Arrows */}
        <div className="relative w-full px-2 sm:px-6">

          {/* Left Arrow Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              scroll('left');
            }}
            aria-label="Scroll left"
            className="absolute -left-1 sm:left-0 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white shadow-lg border border-[#E5EDE8] flex items-center justify-center transition-all duration-200 cursor-pointer text-[#0B3326] hover:bg-[#F2FBF6] hover:border-[#10B981] hover:scale-110 active:scale-95 active:bg-[#EBF5F0]"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
          </button>

          {/* 7 Cards Horizontal Slider with 3D Perspective and auto-movement */}
          <div
            ref={sliderRef}
            onScroll={updateScrollButtons}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
            className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto no-scrollbar py-3 px-3 sm:px-4 text-left"
            style={{
              perspective: '1200px',
            }}
          >
            {roles.map((r, idx) => {
              const isSelected = selectedRole === r.id;

              return (
                <div
                  key={r.id}
                  onClick={() => handleSelectRole(r.id)}
                  title={r.tooltip || r.title}
                  style={{
                    animationDelay: `${idx * 50}ms`,
                    transformStyle: 'preserve-3d',
                  }}
                  className={`animate-slide-up-fade relative flex-shrink-0 w-[240px] sm:w-[250px] lg:w-[260px] p-4 sm:p-5 rounded-2xl cursor-pointer transition-all duration-300 border-2 bg-white flex flex-col justify-between group select-none hover:[transform:rotateY(-4deg)_translateY(-6px)] ${
                    isSelected
                      ? 'border-[#10B981] shadow-xl ring-4 ring-[#10B981]/20 bg-[#F2FBF6]/40 -translate-y-1.5 [transform:rotateY(-2deg)]'
                      : 'border-[#E5EDE8] hover:border-[#10B981]/60 hover:shadow-lg [transform:rotateY(-1deg)]'
                  }`}
                >
                  <div className="space-y-3 sm:space-y-3.5">
                    {/* Top Row: Badge & Radio Circle Indicator */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EBF5F0] text-[#0B3326]">
                        {r.badge}
                      </span>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-[#10B981] border-[#10B981] text-white shadow-xs scale-105'
                            : 'border-[#E5EDE8] bg-white group-hover:border-[#10B981]/50'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3] animate-in zoom-in-50 duration-150" />}
                      </div>
                    </div>

                    {/* Icon & Title */}
                    <div className="space-y-1.5">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-2xs transition-transform duration-300 group-hover:scale-110"
                        style={{ backgroundColor: r.bgLight }}
                      >
                        <span className="transition-transform duration-200 group-hover:rotate-6">{r.iconEmoji}</span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-[#0B3326] font-heading leading-snug">
                          {r.title}
                        </h3>
                        <p className="text-[11px] font-semibold text-[#10B981]">
                          {r.headline}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-[11px] text-[#566861] leading-relaxed line-clamp-3">
                      {r.description}
                    </p>

                    {/* Highlights bullet list */}
                    <div className="pt-2 border-t border-[#E5EDE8] space-y-1.5">
                      {r.highlights.map((h, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[10.5px] text-[#14211D]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shrink-0" />
                          <span className="font-medium truncate">{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Button inside Card */}
                  <div className="pt-3.5 mt-auto">
                    <div
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold text-center transition-all ${
                        isSelected
                          ? 'bg-[#10B981] text-white shadow-xs'
                          : 'bg-[#F8FAF8] text-[#566861] group-hover:bg-[#EBF5F0] group-hover:text-[#0B3326]'
                      }`}
                    >
                      {isSelected ? '✓ Selected' : `Select ${r.buttonTitle || r.title}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Arrow Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              scroll('right');
            }}
            aria-label="Scroll right"
            className="absolute -right-1 sm:right-0 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white shadow-lg border border-[#E5EDE8] flex items-center justify-center transition-all duration-200 cursor-pointer text-[#0B3326] hover:bg-[#F2FBF6] hover:border-[#10B981] hover:scale-110 active:scale-95 active:bg-[#EBF5F0]"
          >
            <ChevronRight className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Action Controls - Large Green Pill Button like Image 2 */}
        <div className="pt-2 max-w-sm mx-auto w-full space-y-2 animate-slide-up-fade" style={{ animationDelay: '350ms' }}>
          <Button
            variant="accent"
            size="md"
            disabled={!selectedRole}
            onClick={handleContinue}
            className="w-full justify-center text-sm font-bold py-3 rounded-xl shadow-md shadow-[#10B981]/25 hover:shadow-lg hover:shadow-[#10B981]/35 cursor-pointer group bg-[#10B981] hover:bg-[#0ea371]"
            icon={ArrowRight}
            iconPosition="right"
          >
            {selectedRoleObj
              ? `Continue as ${selectedRoleObj.buttonTitle || selectedRoleObj.title}`
              : 'Select a role to continue'}
          </Button>

          <p className="text-xs text-[#566861]">
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
      <footer className="max-w-6xl w-full mx-auto text-center text-[10.5px] text-[#566861]/80 shrink-0 py-1">
        <span>AgroLnk Secure Agricultural Digital Exchange • Next Step: Account Verification</span>
      </footer>

    </div>
  );
}

