import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  RotateCcw,
  ArrowRight,
  ArrowDown,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Compass,
  Package,
  Truck,
  CreditCard,
  Building2,
  ChevronRight,
  User,
  Gavel,
  Zap,
  Lock,
  ArrowLeft,
  Info,
  Check,
  HelpCircle,
  Play,
  Pause,
  AlertTriangle,
  Trophy,
  Bot,
  Flame,
  PlusCircle
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import {
  DEMO_PERSONAS,
  DEMO_TEMPLATES,
  getDemoState,
  setDemoPersona,
  resetDemoState,
  fastForwardStage,
  placeDemoBid,
  simulateCompetitorBid,
  finalizeDemoAuction,
  fundDemoEscrow,
  verifyDemoPickupOtp,
  verifyDemoDeliveryOtp,
  submitDemoQualityInspection,
  releaseDemoEscrow,
  createDemoAuction,
  createDemoAuctionCustom,
  updateDemoFreightTariff,
  resolveDemoQualityDispute
} from '../../utils/demoEngine';

export default function DemoCenter({ currentUser, onNavigate, navState }) {
  const [state, setState] = useState(() => getDemoState());
  const [activeTab, setActiveTab] = useState('stage_view'); // 'stage_view' | 'audit_log'
  const [bidInput, setBidInput] = useState('');
  const [pickupOtpInput, setPickupOtpInput] = useState('');
  const [deliveryOtpInput, setDeliveryOtpInput] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Phase 3 States: Countdown Timer, AI Auto-Bidding, Custom Lot Creator
  const [secondsLeft, setSecondsLeft] = useState(150);
  const [autoBotBidding, setAutoBotBidding] = useState(true);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customCommodity, setCustomCommodity] = useState('Turmeric (Finger Polish)');
  const [customQuantity, setCustomQuantity] = useState('1000');
  const [customUnit, setCustomUnit] = useState('KG');
  const [customStartingBid, setCustomStartingBid] = useState('65');
  const [customReservePrice, setCustomReservePrice] = useState('74');
  const [customBidStep, setCustomBidStep] = useState('1');
  const [customOrigin, setCustomOrigin] = useState('Erode Mandi Yard, Tamil Nadu');
  const [customDestination, setCustomDestination] = useState('ITC Spices Processing Plant, Guntur');

  // Phase 4 States: Escrow Deposit Method & Vehicle Fleet Selector
  const [depositMethod, setDepositMethod] = useState('rtgs_escrow'); // 'rtgs_escrow' | 'upi_mandate' | 'credit_advance'
  const [selectedVehicleType, setSelectedVehicleType] = useState('medium_lcv'); // 'mini_truck' | 'medium_lcv' | 'reefer_truck'

  // Phase 5 States: Auto-Play Showcase Tour & Escrow Telephone Audit
  const [isTourRunning, setIsTourRunning] = useState(false);
  const [currentTourStep, setCurrentTourStep] = useState(0); // 0 = inactive, 1..5
  const [cloudVisible, setCloudVisible] = useState(false);
  const [activeTourDef, setActiveTourDef] = useState(null);
  const [isTourPaused, setIsTourPaused] = useState(false);
  const [tourStepText, setTourStepText] = useState('');
  const [escrowAudited, setEscrowAudited] = useState(true);

  const tourTimeoutsRef = useRef([]);

  const clearAllTourTimeouts = () => {
    tourTimeoutsRef.current.forEach(clearTimeout);
    tourTimeoutsRef.current = [];
  };

  useEffect(() => {
    return () => clearAllTourTimeouts();
  }, []);

  const TOUR_STEP_DEFINITIONS = [
    {
      step: 1,
      title: 'Stage 1: Launch Produce Auction Lot',
      actorName: 'Suresh Sharma',
      actorRole: 'Farmer / Producer',
      actorIcon: '🧑‍🌾',
      badgeText: 'Step 1 of 5 • Farmgate Launch',
      headline: 'Listing 2,000 KG Milled Paddy directly to Live Exchange',
      caption: 'Farmer Suresh selects 2,000 KG of Grade A Sona Masoori Paddy and sets a reserve floor of ₹35/KG. Clicking "Launch This Lot" creates a certified auction visible to verified commercial buyers across India with zero middleman commissions.',
      targetHighlightId: 'tour-target-paddy-lot',
      duration: 6500,
      actionDelay: 2000,
      action: () => {
        createDemoAuction('tpl_paddy');
      },
    },
    {
      step: 2,
      title: 'Stage 2: Live Floor Bidding & Knockdown',
      actorName: 'Maran S & Competitors',
      actorRole: 'Verified Buyers',
      actorIcon: '🏢',
      badgeText: 'Step 2 of 5 • Bidding & Knockdown',
      headline: 'Real-Time Floor Competition & Early Acceptance',
      caption: 'Buyer Maran places a competitive bid of ₹35/KG. An AI competitor trader instantly counter-bids at ₹36/KG! Farmer Suresh decides to lock in the ₹72,000 gross valuation immediately by accepting early knockdown without waiting for the clock.',
      targetHighlightId: 'tour-target-bidding-area',
      duration: 7200,
      actionDelay: 1800,
      action: () => {
        placeDemoBid(35);
        const t1 = setTimeout(() => simulateCompetitorBid(), 700);
        const t2 = setTimeout(() => {
          placeDemoBid(36);
          finalizeDemoAuction(true);
        }, 1500);
        tourTimeoutsRef.current.push(t1, t2);
      },
    },
    {
      step: 3,
      title: 'Stage 3: Escrow Trust Custody Deposit',
      actorName: 'Maran S & Trustee Desk',
      actorRole: 'IDBI Bank Escrow Custody',
      actorIcon: '🔒',
      badgeText: 'Step 3 of 5 • Escrow Funding',
      headline: 'Locking ₹72,000 into Legal Neutral Bank Trust Custody',
      caption: 'To protect both parties, Buyer Maran deposits ₹72,000 into the IDBI Bank Nodal Escrow Trust Account. Funds are safely frozen in institutional custody — the farmer knows payout is 100% guaranteed, and the buyer knows money is safe until delivery passes inspection.',
      targetHighlightId: 'tour-target-escrow-deposit',
      duration: 6500,
      actionDelay: 2000,
      action: () => {
        fundDemoEscrow('rtgs_escrow');
      },
    },
    {
      step: 4,
      title: 'Stage 4: Logistics & 2-Step Anti-Theft OTP Verification',
      actorName: 'Ravi Kumar',
      actorRole: 'Logistics Fleet Driver',
      actorIcon: '🚚',
      badgeText: 'Step 4 of 5 • 2-Step OTP Transit',
      headline: 'Tamper-Proof Farmgate Pickup & Destination Handover',
      caption: 'Carrier Ravi enters Farmgate Pickup OTP "8492" at Suresh\'s farm to confirm loading. The GPS-tracked truck delivers 2,000 KG to Chennai Mill, where Delivery OTP "3175" is verified to guarantee genuine physical arrival without cargo substitution.',
      targetHighlightId: 'tour-target-transit-otps',
      duration: 7200,
      actionDelay: 1800,
      action: () => {
        verifyDemoPickupOtp('8492');
        const t = setTimeout(() => {
          verifyDemoDeliveryOtp('3175');
        }, 1200);
        tourTimeoutsRef.current.push(t);
      },
    },
    {
      step: 5,
      title: 'Stage 5: Quality Assay Certification & Direct Bank IMPS Payout',
      actorName: 'Priya Raman',
      actorRole: 'AgroLnk Escrow Trustee',
      actorIcon: '🏆',
      badgeText: 'Step 5 of 5 • Final Settlement',
      headline: 'Moisture Tested 12.4% (Grade A Approved) & Instant IMPS Bank Disbursal',
      caption: 'Destination lab certifies moisture at 12.4% (well within 14% limit). Escrow Desk Trustee Priya Raman executes the instant ₹72,000 IMPS payout directly into Suresh\'s SBI account with Bank UTR: UTR-20261030-8421. The permanent legal settlement certificate is generated!',
      targetHighlightId: 'tour-target-settlement',
      duration: 7500,
      actionDelay: 1800,
      action: () => {
        submitDemoQualityInspection(true);
        const t = setTimeout(() => {
          releaseDemoEscrow();
        }, 1000);
        tourTimeoutsRef.current.push(t);
      },
    },
  ];

  const executeTourStep = (stepNum) => {
    const stepDef = TOUR_STEP_DEFINITIONS.find((s) => s.step === stepNum);
    if (!stepDef) {
      // Finished all 5 steps!
      setCloudVisible(false);
      clearAllTourTimeouts();
      const tEnd = setTimeout(() => {
        setIsTourRunning(false);
        setCurrentTourStep(0);
        setActiveTourDef(null);
        setTourStepText('');
        showFeedback('🎉 Complete 5-Stage Demo Tour finished! All operations successfully verified.');
      }, 700);
      tourTimeoutsRef.current.push(tEnd);
      return;
    }

    setCurrentTourStep(stepNum);
    setActiveTourDef(stepDef);
    setTourStepText(`${stepDef.badgeText}: ${stepDef.headline}`);

    // Phase 1: Slowly open cloud (fade in & scale from 0.9 to 1.0)
    setCloudVisible(false);
    const tOpen = setTimeout(() => {
      setCloudVisible(true);
      const targetEl = document.getElementById(stepDef.targetHighlightId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 80);
    tourTimeoutsRef.current.push(tOpen);

    // Phase 2: Execute platform action midway while user watches
    const tAction = setTimeout(() => {
      stepDef.action();
    }, stepDef.actionDelay);
    tourTimeoutsRef.current.push(tAction);

    // Phase 3: Slowly fade out cloud instructions (duration - 800ms)
    const tFade = setTimeout(() => {
      setCloudVisible(false);
    }, stepDef.duration - 800);
    tourTimeoutsRef.current.push(tFade);

    // Phase 4: Advance to next step
    const tNext = setTimeout(() => {
      executeTourStep(stepNum + 1);
    }, stepDef.duration);
    tourTimeoutsRef.current.push(tNext);
  };

  const startAutoTour = () => {
    clearAllTourTimeouts();
    setIsTourRunning(true);
    setIsTourPaused(false);
    setTourStepText('Tour Initializing: Resetting to clean state...');
    resetDemoState();

    const tInit = setTimeout(() => {
      executeTourStep(1);
    }, 600);
    tourTimeoutsRef.current.push(tInit);
  };

  const stopAutoTour = () => {
    clearAllTourTimeouts();
    setCloudVisible(false);
    setIsTourRunning(false);
    setIsTourPaused(false);
    setCurrentTourStep(0);
    setActiveTourDef(null);
    setTourStepText('');
    showFeedback('Auto-Play Tour stopped.');
  };

  const nextTourStep = () => {
    clearAllTourTimeouts();
    setCloudVisible(false);
    const nextStep = currentTourStep + 1;
    const tNext = setTimeout(() => {
      executeTourStep(nextStep);
    }, 300);
    tourTimeoutsRef.current.push(tNext);
  };

  // Live Timer Countdown for Stage 2
  useEffect(() => {
    if (state.currentStage !== 2 || state.auction?.status !== 'live') return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          finalizeDemoAuction(false);
          showFeedback('Auction clock expired! Reserve evaluated and order generated.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state.currentStage, state.auction?.status]);

  // AI Competitor Auto-Bidding Simulation
  useEffect(() => {
    if (!autoBotBidding || state.currentStage !== 2 || state.auction?.status !== 'live') return;
    const botInterval = setInterval(() => {
      // If buyer is leading, bot places a realistic counter-bid
      if (state.auction?.highestBidderId === DEMO_PERSONAS.buyer.id) {
        simulateCompetitorBid();
        showFeedback('🤖 AI Competitor placed a counter-bid!');
      }
    }, 8000);
    return () => clearInterval(botInterval);
  }, [autoBotBidding, state.currentStage, state.auction?.status, state.auction?.highestBidderId]);

  // Sync state whenever demo state updates
  useEffect(() => {
    const handleUpdate = (e) => {
      setState(e.detail || getDemoState());
    };
    window.addEventListener('agrolnk_demo_state_updated', handleUpdate);
    return () => window.removeEventListener('agrolnk_demo_state_updated', handleUpdate);
  }, []);

  const activePersona = DEMO_PERSONAS[state.activePersonaKey] || DEMO_PERSONAS.farmer;

  const showFeedback = (msg) => {
    setFeedbackMsg(msg);
    setErrorMsg('');
    setTimeout(() => setFeedbackMsg(''), 4500);
  };

  const showError = (err) => {
    setErrorMsg(err);
    setFeedbackMsg('');
    setTimeout(() => setErrorMsg(''), 5000);
  };

  const handleReset = () => {
    const fresh = resetDemoState();
    setState(fresh);
    showFeedback('Demo Sandbox reset to initial state.');
  };

  const handlePersonaSelect = (key) => {
    setDemoPersona(key);
  };

  const handleJumpToStage = (stageNum) => {
    const updated = fastForwardStage(stageNum);
    setState(updated);
    showFeedback(`Advanced to Stage ${stageNum}: ${getStageTitle(stageNum)}`);
  };

  const getStageTitle = (num) => {
    switch (num) {
      case 1: return 'Auction Setup & Launch';
      case 2: return 'Live Bidding Arena';
      case 3: return 'Bank Escrow Deposit';
      case 4: return 'Logistics & 2-OTP Transit';
      case 5: return 'Assay Inspection & Settlement';
      default: return `Stage ${num}`;
    }
  };

  const getRecommendedAction = () => {
    switch (state.currentStage) {
      case 1:
        return {
          actor: '👨‍🌾 Farmer Suresh',
          action: 'Choose a crop template and click "Launch Live Auction".',
          personaKey: 'farmer',
        };
      case 2:
        if (state.auction?.highestBidderId === DEMO_PERSONAS.buyer.id) {
          return {
            actor: '👨‍🌾 Farmer Suresh',
            action: `You are leading! Switch to Farmer to accept early bid of ₹${state.auction.currentBid}/kg or simulate counter-bid.`,
            personaKey: 'farmer',
          };
        }
        return {
          actor: '🏢 Buyer Maran',
          action: `Place a competitive bid higher than ₹${state.auction?.currentBid || 32}/kg to claim the lot.`,
          personaKey: 'buyer',
        };
      case 3:
        return {
          actor: '🏢 Buyer Maran',
          action: `Auction won! Fund the Bank Escrow Trust Account (₹${state.order?.totalAmount?.toLocaleString('en-IN')}) to lock consignment.`,
          personaKey: 'buyer',
        };
      case 4:
        if (state.delivery?.status !== 'in_transit') {
          return {
            actor: '🚚 Transporter Ravi / 👨‍🌾 Farmer',
            action: `Driver at farmgate. Input Farmer's Pickup OTP (${state.delivery?.pickupOtp}) to start transit.`,
            personaKey: 'transporter',
          };
        }
        return {
          actor: '🏢 Buyer Maran / 🚚 Driver',
          action: `Truck arrived at mill. Enter Delivery OTP (${state.delivery?.deliveryOtp}) to confirm safe unloading.`,
          personaKey: 'buyer',
        };
      case 5:
        if (state.qualityAssay?.status === 'pending') {
          return {
            actor: '🏢 Buyer Maran',
            action: 'Verify moisture assay and certify Grade A quality.',
            personaKey: 'buyer',
          };
        }
        if (state.order?.escrowStatus !== 'released') {
          return {
            actor: '🏛️ Escrow Desk Priya',
            action: 'Click "Authorize Bank Payout" to disburse funds to Farmer SBI account via IMPS.',
            personaKey: 'escrow',
          };
        }
        return {
          actor: '🏆 Complete',
          action: 'Trade settled 100%! All parties received verified documents and bank UTR.',
          personaKey: 'farmer',
        };
      default:
        return { actor: 'System', action: 'Follow the guided steps.', personaKey: 'farmer' };
    }
  };

  const currentAction = getRecommendedAction();

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#14211D] font-sans text-left pb-16">
      
      {/* Top Professional Sticky Sub-Nav */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5EDE8] shadow-2xs py-3 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('landing')}
              className="p-1.5 rounded-xl border border-[#E5EDE8] hover:bg-[#F2FBF6] text-[#566861] hover:text-[#0B3326] transition-colors cursor-pointer"
              title="Return to AgroLnk Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[#0B3326] text-base font-heading">
                  AgroLnk Sandbox
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF5F0] text-[#10B981] border border-[#10B981]/30">
                  <ShieldCheck className="w-3 h-3" /> 100% ISOLATED DEMO
                </span>
              </div>
              <p className="text-[11px] text-[#566861]">
                Interactive end-to-end simulation • Zero database alterations
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
            {/* Quick Stage Jump Select */}
            <div className="flex items-center gap-1.5 bg-[#F8FAF8] border border-[#E5EDE8] rounded-xl px-2.5 py-1 text-xs">
              <span className="text-[#566861] font-semibold text-[11px]">Jump to:</span>
              <select
                value={state.currentStage}
                onChange={(e) => handleJumpToStage(Number(e.target.value))}
                className="bg-transparent font-bold text-[#0B3326] text-xs cursor-pointer focus:outline-none"
              >
                <option value={1}>1. Setup & Launch</option>
                <option value={2}>2. Live Bidding Floor</option>
                <option value={3}>3. Escrow Deposit</option>
                <option value={4}>4. Logistics & 2-OTP</option>
                <option value={5}>5. Settlement & UTR</option>
              </select>
            </div>

            {/* Auto-Play Showcase Tour Button */}
            <Button
              variant={isTourRunning ? 'accent' : 'primary'}
              size="sm"
              onClick={isTourRunning ? stopAutoTour : startAutoTour}
              icon={isTourRunning ? RotateCcw : Play}
              iconPosition="left"
              className={`text-xs font-bold py-1.5 px-3 h-auto cursor-pointer shadow-xs ${
                isTourRunning ? 'animate-pulse' : ''
              }`}
              title="Automatically run through all 5 trade stages"
            >
              {isTourRunning ? 'Stop Tour' : 'Auto-Play 60s Tour'}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleReset}
              icon={RotateCcw}
              iconPosition="left"
              className="text-xs font-semibold py-1.5 px-3 h-auto cursor-pointer"
              title="Reset sandbox state"
            >
              Reset Demo
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">

        {/* Live Auto-Tour Narrative Banner */}
        {isTourRunning && (
          <div className="p-4 rounded-2xl bg-[#0B3326] text-white border-2 border-[#34D399] shadow-lg flex items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-[#10B981] animate-ping shrink-0" />
              <div className="space-y-0.5 text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#34D399] block">
                  Automated 60-Second Trade Tour Active
                </span>
                <p className="text-xs sm:text-sm font-semibold text-white">
                  {tourStepText}
                </p>
              </div>
            </div>
            <Button
              variant="white"
              size="sm"
              onClick={stopAutoTour}
              className="text-xs font-bold py-1.5 px-3 shrink-0 cursor-pointer !bg-white !text-[#0B3326]"
            >
              Exit Tour
            </Button>
          </div>
        )}

        {/* Global Feedback & Error Toasts */}
        {feedbackMsg && (
          <div className="p-3.5 rounded-2xl bg-[#10B981] text-white text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              {feedbackMsg}
            </span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-red-600 text-white text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
            <span>⚠️ {errorMsg}</span>
          </div>
        )}

        {/* Persona Switcher Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E5EDE8] shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#566861] block">
                Active Stakeholder Perspective
              </span>
              <p className="text-xs text-[#566861] mt-0.5">
                Click any persona below to experience the platform through their dashboard and permissions:
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#10B981] font-semibold bg-[#EBF5F0] px-2.5 py-1 rounded-full self-start sm:self-auto">
              <span>Viewing as:</span>
              <strong className="text-[#0B3326]">{activePersona.badge}</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
            {Object.entries(DEMO_PERSONAS).map(([key, persona]) => {
              const isSelected = state.activePersonaKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePersonaSelect(key)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    isSelected
                      ? 'bg-[#0B3326] text-white border-[#0B3326] shadow-sm ring-2 ring-[#10B981]/50'
                      : 'bg-[#F8FAF8] text-[#14211D] border-[#E5EDE8] hover:bg-[#EBF5F0]/60 hover:border-[#10B981]/40'
                  }`}
                >
                  <span className="text-2xl shrink-0">{persona.avatar}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-[#0B3326]'}`}>
                        {persona.name}
                      </span>
                    </div>
                    <span className={`text-[10px] block truncate ${isSelected ? 'text-[#A7F3D0]' : 'text-[#566861]'}`}>
                      {persona.badge.split('/')[0]}
                    </span>
                    <span className={`text-[9px] block truncate mt-0.5 ${isSelected ? 'text-white/70' : 'text-[#566861]/70'}`}>
                      {persona.location}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5-Stage Interactive Workflow Stepper */}
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-[#E5EDE8] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#566861]">
              Contract Lifecycle &amp; Progress
            </span>
            <span className="text-xs font-bold text-[#0B3326]">
              Stage {state.currentStage} of 5: {getStageTitle(state.currentStage)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-3">
            {[
              { num: 1, title: '1. Setup', icon: Package, subtitle: 'Launch Lot' },
              { num: 2, title: '2. Bidding', icon: Gavel, subtitle: 'Live Arena' },
              { num: 3, title: '3. Escrow', icon: Lock, subtitle: 'Bank Deposit' },
              { num: 4, title: '4. Transit', icon: Truck, subtitle: '2-OTP Freight' },
              { num: 5, title: '5. Settle', icon: CreditCard, subtitle: 'Assay & UTR' },
            ].map((step) => {
              const isPast = state.currentStage > step.num;
              const isCurrent = state.currentStage === step.num;
              const StepIcon = step.icon;

              return (
                <div
                  key={step.num}
                  onClick={() => handleJumpToStage(step.num)}
                  className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                    isCurrent
                      ? 'bg-[#EBF5F0] border-[#10B981] shadow-xs ring-1 ring-[#10B981]'
                      : isPast
                      ? 'bg-white border-[#A7F3D0] hover:bg-[#F8FAF8]'
                      : 'bg-[#F8FAF8] border-[#E5EDE8] text-[#566861]/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
                      isCurrent
                        ? 'bg-[#10B981] text-white'
                        : isPast
                        ? 'bg-[#0B3326] text-white'
                        : 'bg-[#E5EDE8] text-[#566861]'
                    }`}>
                      {isPast ? <Check className="w-3.5 h-3.5" /> : <StepIcon className="w-3.5 h-3.5" />}
                    </div>
                    {isCurrent && (
                      <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
                    )}
                  </div>
                  <div className="font-bold text-xs text-[#0B3326] truncate">{step.title}</div>
                  <div className="text-[10px] text-[#566861] truncate">{step.subtitle}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recommended Next Action Banner */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[#0B3326] text-white border border-[#14624A] shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#10B981] flex items-center justify-center text-white shrink-0 shadow-sm">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="space-y-0.5 text-left">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#34D399] bg-[#0F4A37] px-2 py-0.5 rounded-full border border-[#14624A]">
                  Recommended Next Step
                </span>
                <span className="text-xs font-bold text-white">
                  {currentAction.actor}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#DCFCE7]/90 font-normal">
                {currentAction.action}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
            {state.activePersonaKey !== currentAction.personaKey && currentAction.personaKey !== 'farmer' && (
              <Button
                variant="accent"
                size="sm"
                onClick={() => handlePersonaSelect(currentAction.personaKey)}
                className="text-xs font-bold py-2 px-3.5 shadow-sm cursor-pointer"
              >
                Switch to {DEMO_PERSONAS[currentAction.personaKey]?.name}
              </Button>
            )}
          </div>
        </div>

        {/* Dynamic Stage Render Area & Interactive Workbench */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Stage Interactive Panel (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">

            {/* Auto-Play Cloud Guide Instructions & Bouncing Arrow */}
            {isTourRunning && activeTourDef && (
              <div
                className={`transition-all duration-700 ease-out transform mb-6 ${
                  cloudVisible
                    ? 'opacity-100 scale-100 translate-y-0'
                    : 'opacity-0 scale-95 -translate-y-4 pointer-events-none'
                }`}
              >
                <div className="relative mx-auto max-w-3xl">
                  {/* Decorative Cloud Puffs on top */}
                  <div className="absolute -top-3.5 left-10 w-14 h-7 bg-white/95 rounded-t-full border-t-2 border-l-2 border-r-2 border-[#10B981] backdrop-blur-md pointer-events-none -z-10 shadow-xs" />
                  <div className="absolute -top-6 left-22 w-20 h-10 bg-white/95 rounded-t-full border-t-2 border-l-2 border-r-2 border-[#10B981] backdrop-blur-md pointer-events-none -z-10 shadow-xs" />
                  <div className="absolute -top-3.5 left-38 w-12 h-6 bg-white/95 rounded-t-full border-t-2 border-l-2 border-r-2 border-[#10B981] backdrop-blur-md pointer-events-none -z-10 shadow-xs" />
                  <div className="absolute -top-4 right-16 w-16 h-8 bg-white/95 rounded-t-full border-t-2 border-l-2 border-r-2 border-[#10B981] backdrop-blur-md pointer-events-none -z-10 shadow-xs" />

                  {/* Cloud Main Body */}
                  <div className="relative bg-white/95 backdrop-blur-xl rounded-[28px] p-5 sm:p-6 border-2 border-[#10B981] shadow-[0_20px_50px_rgba(11,51,38,0.22)] ring-4 ring-[#10B981]/20 text-[#0B3326] space-y-3.5 overflow-hidden">
                    {/* Radial background ambient light */}
                    <div className="absolute -right-12 -top-12 w-44 h-44 bg-gradient-to-br from-emerald-200/50 to-teal-100/10 rounded-full blur-2xl pointer-events-none" />

                    {/* Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#E5EDE8] pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl p-1.5 bg-[#EBF5F0] rounded-2xl shadow-2xs border border-emerald-100">
                          {activeTourDef.actorIcon}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs sm:text-sm text-[#0B3326]">
                              {activeTourDef.actorName}
                            </span>
                            <span className="text-[10px] text-[#065F46] font-semibold bg-[#ECFDF5] border border-[#A7F3D0] px-2 py-0.5 rounded-full">
                              {activeTourDef.actorRole}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-[#10B981] uppercase tracking-wider block mt-0.5">
                            {activeTourDef.badgeText}
                          </span>
                        </div>
                      </div>

                      {/* Interactive Tour Controls */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={nextTourStep}
                          className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-[#EBF5F0] text-[#0B3326] hover:bg-[#10B981] hover:text-white transition-all cursor-pointer shadow-2xs"
                          title="Skip to next step"
                        >
                          <span>Next</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={stopAutoTour}
                          className="w-7 h-7 flex items-center justify-center rounded-xl text-[#566861] hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer font-bold text-xs"
                          title="Close tour"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Caption Headline & Description */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-[#0B3326] font-heading">
                        <span className="text-base">☁️</span>
                        <span>{activeTourDef.headline}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-[#334E43] leading-relaxed font-medium">
                        {activeTourDef.caption}
                      </p>
                    </div>

                    {/* Step Countdown / Progress Bar */}
                    <div className="pt-1">
                      <div className="w-full bg-[#E5EDE8] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#10B981] to-[#059669] h-full rounded-full transition-all ease-linear"
                          style={{
                            width: cloudVisible ? '100%' : '0%',
                            transitionDuration: `${Math.max(500, activeTourDef.duration - 800)}ms`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Speech Bubble Tail & Animated Pointing Arrow */}
                  <div className="flex flex-col items-center -mb-8 mt-1">
                    {/* Tail Triangle */}
                    <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[16px] border-t-white drop-shadow-[0_2px_4px_rgba(11,51,38,0.1)] -mt-0.5" />
                    
                    {/* Animated Bouncing Arrow pointing at the target action below */}
                    <div className="flex flex-col items-center animate-bounce mt-1">
                      <div className="w-10 h-10 rounded-full bg-[#10B981] text-white flex items-center justify-center shadow-lg shadow-[#10B981]/50 ring-4 ring-[#A7F3D0]">
                        <ArrowDown className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <span className="text-[10px] font-extrabold text-[#0B3326] bg-white px-2 py-0.5 rounded-full shadow-xs border border-emerald-300 mt-1">
                        Active Action Below ↓
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* STAGE 1: SETUP & LAUNCH */}
            {state.currentStage === 1 && (
              <Card className="p-6 bg-white border border-[#E5EDE8] shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5EDE8]">
                  <div>
                    <h3 className="text-base font-bold text-[#0B3326] font-heading">
                      Stage 1: Launch Produce Auction Lot
                    </h3>
                    <p className="text-xs text-[#566861] mt-0.5">
                      Choose a pre-configured verified lot or customize commodity, reserve price, and volume:
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#F8FAF8] p-1 rounded-xl border border-[#E5EDE8] self-start sm:self-auto text-xs">
                    <button
                      type="button"
                      onClick={() => setIsCustomMode(false)}
                      className={`py-1 px-3 rounded-lg font-bold transition-all cursor-pointer ${
                        !isCustomMode ? 'bg-[#0B3326] text-white shadow-2xs' : 'text-[#566861] hover:text-[#0B3326]'
                      }`}
                    >
                      Pre-Set Lots
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCustomMode(true)}
                      className={`py-1 px-3 rounded-lg font-bold transition-all cursor-pointer ${
                        isCustomMode ? 'bg-[#0B3326] text-white shadow-2xs' : 'text-[#566861] hover:text-[#0B3326]'
                      }`}
                    >
                      Custom Lot
                    </button>
                  </div>
                </div>

                {!isCustomMode ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {DEMO_TEMPLATES.map((tpl) => {
                      const isTarget = isTourRunning && currentTourStep === 1 && tpl.id === 'tpl_paddy';
                      return (
                        <div
                          key={tpl.id}
                          id={tpl.id === 'tpl_paddy' ? 'tour-target-paddy-lot' : undefined}
                          className={`p-4 rounded-2xl border transition-all text-left space-y-3 group shadow-2xs bg-white ${
                            isTarget
                              ? 'ring-4 ring-[#10B981] ring-offset-2 border-[#10B981] shadow-xl animate-pulse scale-[1.02]'
                              : 'border-[#E5EDE8] hover:border-[#10B981] hover:bg-[#F2FBF6]/40'
                          }`}
                        >
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-xs font-bold text-[#0B3326] block group-hover:text-[#10B981]">
                            {tpl.commodity}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Grade {tpl.grade}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#566861] space-y-1 bg-[#F8FAF8] p-2.5 rounded-xl border border-[#E5EDE8]/60">
                          <div className="flex justify-between">
                            <span>Volume:</span>
                            <b className="text-[#0B3326]">{tpl.quantity?.toLocaleString('en-IN')} {tpl.unit}</b>
                          </div>
                          <div className="flex justify-between">
                            <span>Base Bid:</span>
                            <b className="text-[#0B3326]">₹{tpl.startingBid}/{tpl.unit}</b>
                          </div>
                          <div className="flex justify-between">
                            <span>Reserve Floor:</span>
                            <b className="text-[#10B981]">₹{tpl.reservePrice}/{tpl.unit}</b>
                          </div>
                        </div>
                        <div className="text-[10px] text-[#566861] truncate">
                          📍 {tpl.origin.split(',')[0]} ➔ {tpl.destination.split(',')[0]}
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            createDemoAuction(tpl.id);
                            showFeedback(`Launched auction for ${tpl.commodity} (${tpl.quantity} ${tpl.unit})!`);
                          }}
                          className="w-full text-xs py-2 h-auto font-bold"
                        >
                          Launch This Lot
                        </Button>
                      </div>
                    ); })}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="font-bold text-[#0B3326] block">Commodity Name</label>
                        <input
                          type="text"
                          value={customCommodity}
                          onChange={(e) => setCustomCommodity(e.target.value)}
                          className="w-full bg-[#F8FAF8] border border-[#E5EDE8] rounded-xl px-3 py-2 font-semibold text-[#0B3326]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-[#0B3326] block">Volume / Quantity</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={customQuantity}
                            onChange={(e) => setCustomQuantity(e.target.value)}
                            className="w-full bg-[#F8FAF8] border border-[#E5EDE8] rounded-xl px-3 py-2 font-semibold text-[#0B3326]"
                          />
                          <select
                            value={customUnit}
                            onChange={(e) => setCustomUnit(e.target.value)}
                            className="bg-[#F8FAF8] border border-[#E5EDE8] rounded-xl px-2 py-2 font-bold text-[#0B3326]"
                          >
                            <option value="KG">KG</option>
                            <option value="Quintal">Quintal</option>
                            <option value="MT">MT</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-[#0B3326] block">Starting Price (₹/{customUnit})</label>
                        <input
                          type="number"
                          value={customStartingBid}
                          onChange={(e) => setCustomStartingBid(e.target.value)}
                          className="w-full bg-[#F8FAF8] border border-[#E5EDE8] rounded-xl px-3 py-2 font-semibold text-[#0B3326]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-[#0B3326] block">Reserve Floor (₹/{customUnit})</label>
                        <input
                          type="number"
                          value={customReservePrice}
                          onChange={(e) => setCustomReservePrice(e.target.value)}
                          className="w-full bg-[#F8FAF8] border border-[#E5EDE8] rounded-xl px-3 py-2 font-semibold text-[#10B981]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-[#0B3326] block">Bid Step Increment (₹)</label>
                        <input
                          type="number"
                          value={customBidStep}
                          onChange={(e) => setCustomBidStep(e.target.value)}
                          className="w-full bg-[#F8FAF8] border border-[#E5EDE8] rounded-xl px-3 py-2 font-semibold text-[#0B3326]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-[#0B3326] block">Origin Farmgate Hub</label>
                        <input
                          type="text"
                          value={customOrigin}
                          onChange={(e) => setCustomOrigin(e.target.value)}
                          className="w-full bg-[#F8FAF8] border border-[#E5EDE8] rounded-xl px-3 py-2 font-semibold text-[#0B3326]"
                        />
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#EBF5F0] border border-[#10B981]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5">
                        <span className="font-bold text-[#0B3326] block">
                          Contract Valuation Forecast
                        </span>
                        <span className="text-[#566861]">
                          Base: ₹{((Number(customQuantity) || 0) * (customUnit === 'MT' ? 1000 : customUnit === 'Quintal' ? 100 : 1) * (Number(customStartingBid) || 0)).toLocaleString('en-IN')} • 
                          Reserve Floor: ₹{((Number(customQuantity) || 0) * (customUnit === 'MT' ? 1000 : customUnit === 'Quintal' ? 100 : 1) * (Number(customReservePrice) || 0)).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => {
                          createDemoAuctionCustom({
                            commodity: customCommodity,
                            quantity: customQuantity,
                            unit: customUnit,
                            startingBid: customStartingBid,
                            reservePrice: customReservePrice,
                            bidStep: customBidStep,
                            origin: customOrigin,
                            destination: customDestination,
                          });
                          showFeedback(`Custom auction launched for ${customCommodity}!`);
                        }}
                        icon={Zap}
                        iconPosition="left"
                        className="font-bold text-xs py-2 px-4 shadow-sm"
                      >
                        Launch Custom Auction
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* STAGE 2: LIVE FLOOR BIDDING */}
            {state.currentStage === 2 && (
              <Card className="p-6 bg-white border border-[#E5EDE8] shadow-xs space-y-6">
                
                {/* Header with Countdown Clock and Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5EDE8]">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
                        LIVE AUCTION ARENA
                      </div>
                      <span className="text-xs text-[#566861]">Lot #{state.auction?.id}</span>
                    </div>
                    <h3 className="text-xl font-extrabold text-[#0B3326] font-heading mt-1">
                      {state.auction?.commodity} ({state.auction?.quantity} {state.auction?.unit})
                    </h3>
                    <p className="text-xs text-[#566861] mt-0.5">
                      📍 {state.auction?.origin} ➔ {state.auction?.destination} • Variety: {state.auction?.variety}
                    </p>
                  </div>

                  {/* Timer & Current Bid Box */}
                  <div className="flex items-center gap-3">
                    {/* Live Clock */}
                    <div className="bg-[#0B3326] text-white p-3 rounded-2xl border border-[#14624A] text-center min-w-[100px] shadow-sm">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-[#A7F3D0] uppercase font-bold">
                        <Clock className="w-3 h-3 text-[#34D399]" /> Time Left
                      </div>
                      <div className="text-xl font-black font-mono tracking-wider text-white">
                        {Math.floor(secondsLeft / 60).toString().padStart(2, '0')}:{(secondsLeft % 60).toString().padStart(2, '0')}
                      </div>
                    </div>

                    {/* Current Leading Offer */}
                    <div className="bg-[#F2FBF6] p-3 rounded-2xl border border-[#10B981]/30 text-right min-w-[130px]">
                      <span className="text-[10px] text-[#566861] uppercase tracking-wider font-bold block">
                        Leading Offer
                      </span>
                      <span className="text-2xl font-black text-[#10B981] font-heading block">
                        ₹{state.auction?.currentBid}
                      </span>
                      <span className="text-[10px] text-[#566861]">per {state.auction?.unit}</span>
                    </div>
                  </div>
                </div>

                {/* Status Banners: Leading vs Outbid */}
                {state.auction?.highestBidderId === DEMO_PERSONAS.buyer.id ? (
                  <div className="p-3.5 rounded-2xl bg-[#EBF5F0] border border-[#10B981]/40 text-[#0B3326] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs animate-in fade-in">
                    <span className="flex items-center gap-2 font-bold text-xs">
                      <Sparkles className="w-4 h-4 text-[#10B981] shrink-0" />
                      🎉 You ({DEMO_PERSONAS.buyer.name}) hold the highest leading bid at ₹{state.auction?.currentBid}/{state.auction?.unit}!
                    </span>
                    <Badge variant="emerald" size="sm">Top Bidder</Badge>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs animate-in fade-in">
                    <span className="flex items-center gap-2 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      ⚠️ Outbid! <b>{state.auction?.highestBidderName || 'Competitor'}</b> is now leading at ₹{state.auction?.currentBid}/{state.auction?.unit}.
                    </span>
                    <span className="text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                      Submit Counter-Bid Below
                    </span>
                  </div>
                )}

                {/* Reserve Price Progress Gauge */}
                <div className="p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#566861]">Reserve Floor Progress</span>
                    <div className="flex items-center gap-2 font-bold">
                      <span className="text-[#0B3326]">Base: ₹{state.auction?.startingBid}</span>
                      <span>➔</span>
                      <span className={state.auction?.currentBid >= state.auction?.reservePrice ? 'text-[#10B981]' : 'text-amber-700'}>
                        Floor: ₹{state.auction?.reservePrice}/{state.auction?.unit}
                      </span>
                      {state.auction?.currentBid >= state.auction?.reservePrice ? (
                        <Badge variant="emerald" size="sm">✓ Reserve Met</Badge>
                      ) : (
                        <Badge variant="amber" size="sm">₹{state.auction?.reservePrice - state.auction?.currentBid} needed</Badge>
                      )}
                    </div>
                  </div>
                  <div className="w-full h-2 bg-[#E5EDE8] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        state.auction?.currentBid >= state.auction?.reservePrice ? 'bg-[#10B981]' : 'bg-amber-500'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.round((state.auction?.currentBid / state.auction?.reservePrice) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Bidding Controls Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Buyer Bidding Console */}
                  <div className="p-4 rounded-2xl bg-white border border-[#E5EDE8] space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0B3326] flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#10B981]" />
                        Buyer Bidding Console ({DEMO_PERSONAS.buyer.name})
                      </span>
                      <span className="text-[10px] text-[#566861]">Step: ₹{state.auction?.bidStep}</span>
                    </div>

                    {/* Quick 1-Click Increment Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          const next = state.auction.currentBid + state.auction.bidStep;
                          placeDemoBid(next);
                          showFeedback(`Bid placed: ₹${next}/${state.auction.unit}`);
                        }}
                        className="py-1 px-2.5 rounded-lg bg-[#F8FAF8] hover:bg-[#EBF5F0] border border-[#E5EDE8] hover:border-[#10B981] text-xs font-bold text-[#0B3326] transition-colors cursor-pointer"
                      >
                        +₹{state.auction?.bidStep} ({state.auction?.currentBid + state.auction?.bidStep})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = state.auction.currentBid + state.auction.bidStep * 2;
                          placeDemoBid(next);
                          showFeedback(`Bid placed: ₹${next}/${state.auction.unit}`);
                        }}
                        className="py-1 px-2.5 rounded-lg bg-[#F8FAF8] hover:bg-[#EBF5F0] border border-[#E5EDE8] hover:border-[#10B981] text-xs font-bold text-[#0B3326] transition-colors cursor-pointer"
                      >
                        +₹{state.auction?.bidStep * 2} ({state.auction?.currentBid + state.auction?.bidStep * 2})
                      </button>
                      {state.auction?.currentBid < state.auction?.reservePrice && (
                        <button
                          type="button"
                          onClick={() => {
                            placeDemoBid(state.auction.reservePrice);
                            showFeedback(`Bid placed: ₹${state.auction.reservePrice}/${state.auction.unit} (Matches Reserve)`);
                          }}
                          className="py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold text-emerald-800 transition-colors cursor-pointer"
                        >
                          Match Reserve (₹{state.auction?.reservePrice})
                        </button>
                      )}
                    </div>

                    {/* Custom Amount Bid Input */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="number"
                        placeholder={`Min ₹${state.auction?.currentBid + state.auction?.bidStep}`}
                        value={bidInput}
                        onChange={(e) => setBidInput(e.target.value)}
                        className="w-full bg-[#F8FAF8] border border-[#E5EDE8] rounded-xl px-3 py-2 text-xs font-bold text-[#0B3326] focus:outline-none focus:border-[#10B981]"
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          const val = Number(bidInput) || (state.auction.currentBid + state.auction.bidStep);
                          try {
                            placeDemoBid(val);
                            setBidInput('');
                            showFeedback(`Bid of ₹${val}/${state.auction.unit} placed! You are leading.`);
                          } catch (err) {
                            showError(err.message);
                          }
                        }}
                        className="shrink-0 text-xs font-bold py-2 px-3.5"
                      >
                        Submit Bid
                      </Button>
                    </div>

                    {/* AI Competitor Simulation Section */}
                    <div className="pt-2 border-t border-[#E5EDE8] flex items-center justify-between gap-2">
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#566861] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoBotBidding}
                          onChange={(e) => setAutoBotBidding(e.target.checked)}
                          className="rounded text-[#10B981] focus:ring-0"
                        />
                        <Bot className="w-3.5 h-3.5 text-[#10B981]" /> Auto-AI Competitors
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          simulateCompetitorBid();
                          showFeedback('AI Competitor submitted an outbid offer!');
                        }}
                        className="text-[10px] font-bold text-[#10B981] hover:underline cursor-pointer"
                      >
                        ⚡ Force Bot Counter-Bid
                      </button>
                    </div>
                  </div>

                  {/* Farmer Early Knockdown Console */}
                  <div
                    id="tour-target-bidding-area"
                    className={`p-4 rounded-2xl bg-amber-50/50 border text-[#92400E] space-y-3 shadow-2xs transition-all ${
                      isTourRunning && currentTourStep === 2
                        ? 'ring-4 ring-[#10B981] ring-offset-2 border-[#10B981] shadow-xl animate-pulse scale-[1.01]'
                        : 'border-amber-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                        <Gavel className="w-3.5 h-3.5 text-amber-700" />
                        Farmer Knockdown ({DEMO_PERSONAS.farmer.name})
                      </span>
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                        Seller Option
                      </span>
                    </div>

                    <p className="text-[11px] text-amber-900/90 leading-relaxed">
                      Leading Bid: <b>₹{state.auction?.currentBid}/{state.auction?.unit}</b> offered by <b>{state.auction?.highestBidderName || 'None'}</b>.
                    </p>

                    <div className="p-2.5 rounded-xl bg-white/80 border border-amber-200/80 text-xs space-y-0.5">
                      <div className="text-[10px] text-[#566861] uppercase font-bold">Total Gross Valuation</div>
                      <div className="text-lg font-black text-[#0B3326] font-heading">
                        ₹{(state.auction?.quantity * (state.auction?.unit === 'MT' ? 1000 : state.auction?.unit === 'Quintal' ? 100 : 1) * state.auction?.currentBid).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="accent"
                        size="sm"
                        onClick={() => {
                          finalizeDemoAuction(true);
                          showFeedback('Farmer Knockdown accepted! Contract generated.');
                        }}
                        icon={Zap}
                        iconPosition="left"
                        className="w-full text-xs font-bold py-2 shadow-xs"
                      >
                        Accept Offer &amp; Close Now
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          finalizeDemoAuction(false);
                          showFeedback('Clock simulated expiry! Finalized.');
                        }}
                        className="shrink-0 text-xs font-semibold py-2 px-3 text-[#566861]"
                        title="Simulate timer hitting 00:00"
                      >
                        ⏩ Expire Clock
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Real-Time Live Ticker Feed */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#566861] uppercase tracking-wider flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-600" />
                      Live Arena Bid Stream ({state.bids.length} Offers)
                    </span>
                    <span className="text-[10px] text-[#10B981] font-semibold">Sub-second Ticker Feed</span>
                  </div>

                  <div className="divide-y divide-[#E5EDE8] border border-[#E5EDE8] rounded-2xl bg-white overflow-hidden text-xs">
                    {state.bids.map((b, idx) => (
                      <div
                        key={b.id}
                        className={`p-3 flex items-center justify-between transition-colors ${
                          idx === 0 ? 'bg-[#F2FBF6]/60 font-bold' : 'hover:bg-[#F8FAF8]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            idx === 0 ? 'bg-[#10B981] text-white' : 'bg-[#E5EDE8] text-[#566861]'
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <span className="text-[#0B3326] block">{b.bidderName}</span>
                            <span className="text-[10px] text-[#566861]">{b.timestamp}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-[#10B981] text-sm">₹{b.amount}</span>
                          <span className="text-[10px] text-[#566861]">/{state.auction?.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* STAGE 3: ESCROW DEPOSIT */}
            {state.currentStage === 3 && (
              <Card className="p-6 bg-white border border-[#E5EDE8] shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5EDE8]">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[10px] font-bold border border-blue-200">
                      <Lock className="w-3 h-3" /> ESCROW TRUST CUSTODY
                    </div>
                    <h3 className="text-xl font-extrabold text-[#0B3326] font-heading mt-1">
                      Order {state.order?.orderNumber} Escrow Funding Portal
                    </h3>
                    <p className="text-xs text-[#566861] mt-0.5">
                      Buyer deposits contract value into the bank trust account. Funds remain locked until destination inspection.
                    </p>
                  </div>

                  <div className="text-left sm:text-right bg-[#EFF6FF] p-3 rounded-2xl border border-blue-200 min-w-[140px]">
                    <span className="text-[10px] text-blue-900 uppercase tracking-wider font-bold block">
                      Required Deposit
                    </span>
                    <span className="text-2xl font-black text-[#1E40AF] font-heading block">
                      ₹{state.order?.totalAmount?.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-blue-800 font-semibold">100% Escrow Protected</span>
                  </div>
                </div>

                {/* Contract Summary Spec Grid */}
                <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-3">
                  <span className="text-xs font-bold text-[#0B3326] block">
                    Contract &amp; Lot Specifications
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[#566861] block text-[11px]">Commodity &amp; Grade</span>
                      <b className="text-[#0B3326]">{state.order?.commodity} (Grade {state.order?.grade})</b>
                    </div>
                    <div>
                      <span className="text-[#566861] block text-[11px]">Contract Volume</span>
                      <b className="text-[#0B3326]">{state.order?.quantity} {state.order?.unit}</b>
                    </div>
                    <div>
                      <span className="text-[#566861] block text-[11px]">Winning Auction Rate</span>
                      <b className="text-[#10B981]">₹{state.order?.pricePerUnit}/{state.order?.unit}</b>
                    </div>
                    <div>
                      <span className="text-[#566861] block text-[11px]">Seller / Producer</span>
                      <b className="text-[#0B3326]">{state.order?.farmerName}</b>
                    </div>
                  </div>
                </div>

                {/* Deposit Method Selector */}
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#566861]">
                    Select Institutional Deposit Facility
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        key: 'rtgs_escrow',
                        title: 'Bank RTGS / NEFT Trust',
                        subtitle: 'Direct Nodal Escrow Account',
                        badge: 'Recommended',
                        icon: Building2,
                      },
                      {
                        key: 'upi_mandate',
                        title: 'Corporate UPI Mandate',
                        subtitle: 'NPCI E-Mandate Instant Lock',
                        badge: 'Instant',
                        icon: Zap,
                      },
                      {
                        key: 'credit_advance',
                        title: 'Seasonal Procurement Credit',
                        subtitle: 'Godown Warehouse Advance',
                        badge: 'Credit Line',
                        icon: CreditCard,
                      },
                    ].map((opt) => (
                      <div
                        key={opt.key}
                        onClick={() => setDepositMethod(opt.key)}
                        className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                          depositMethod === opt.key
                            ? 'bg-[#EBF5F0] border-[#10B981] ring-1 ring-[#10B981] shadow-2xs'
                            : 'bg-white border-[#E5EDE8] hover:bg-[#F8FAF8]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <opt.icon className="w-4 h-4 text-[#10B981]" />
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            depositMethod === opt.key ? 'bg-[#10B981] text-white' : 'bg-[#E5EDE8] text-[#566861]'
                          }`}>
                            {opt.badge}
                          </span>
                        </div>
                        <div className="font-bold text-xs text-[#0B3326]">{opt.title}</div>
                        <div className="text-[10px] text-[#566861]">{opt.subtitle}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Escrow Custody Account Box & Action Button */}
                <div
                  id="tour-target-escrow-deposit"
                  className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0B3326] to-[#0F4A37] text-white border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm transition-all ${
                    isTourRunning && currentTourStep === 3
                      ? 'ring-4 ring-[#10B981] ring-offset-2 border-[#10B981] shadow-xl animate-pulse scale-[1.01]'
                      : 'border-[#14624A]'
                  }`}
                >
                  <div className="space-y-1 text-left">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-[#34D399]" />
                      <span className="font-extrabold text-sm text-white">
                        IDBI Bank Custody: AgroLnk Nodal Trust Account
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A7F3D0]">
                      Account: <b>0041104000189421</b> • IFSC: <b>IBKL0000041</b> • Zero fee platform guarantee
                    </p>
                  </div>

                  <Button
                    variant="accent"
                    size="md"
                    onClick={() => {
                      fundDemoEscrow(depositMethod);
                      showFeedback(`Escrow funded via ${depositMethod.toUpperCase()}! Money secured in trust.`);
                    }}
                    icon={Lock}
                    iconPosition="left"
                    className="font-bold text-xs py-3 px-5 shadow-sm shrink-0 cursor-pointer"
                  >
                    Deposit &amp; Lock ₹{state.order?.totalAmount?.toLocaleString('en-IN')}
                  </Button>
                </div>
              </Card>
            )}

            {/* STAGE 4: LOGISTICS & 2-OTP TRANSIT */}
            {state.currentStage === 4 && (
              <Card className="p-6 bg-white border border-[#E5EDE8] shadow-xs space-y-6">
                
                {/* Header with Transport Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5EDE8]">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                        <Truck className="w-3 h-3" /> TWO-STEP ANTI-THEFT LOGISTICS
                      </div>
                      <span className="text-xs text-[#566861]">Consignment #{state.delivery?.deliveryNumber}</span>
                    </div>
                    <h3 className="text-xl font-extrabold text-[#0B3326] font-heading mt-1">
                      Carrier Dispatch: {state.delivery?.pickupLocation?.split(',')[0]} ➔ {state.delivery?.deliveryLocation?.split(',')[0]}
                    </h3>
                    <p className="text-xs text-[#566861] mt-0.5">
                      Estimated Distance: <b>{state.delivery?.distanceKm} km</b> • Tariff: <b>₹{state.delivery?.freightAmount?.toLocaleString('en-IN')}</b>
                    </p>
                  </div>

                  <Badge variant={state.delivery?.status === 'delivered' ? 'emerald' : state.delivery?.status === 'in_transit' ? 'blue' : 'amber'} size="md">
                    {state.delivery?.status === 'delivered' ? '✓ Delivered' : state.delivery?.status === 'in_transit' ? '🚚 In Transit (340 km)' : 'Awaiting Farmgate Pickup'}
                  </Badge>
                </div>

                {/* Fleet Category Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#566861]">
                      Select Carrier Vehicle Category
                    </span>
                    <span className="text-[10px] text-[#10B981] font-semibold">APMC Corridor Tariff Matrix</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      {
                        type: 'mini_truck',
                        name: 'Mini Truck (Tata Ace)',
                        cap: 'Up to 1,500 KG',
                        rate: 'Base ₹400 + ₹14/km',
                      },
                      {
                        type: 'medium_lcv',
                        name: 'Medium LCV (14ft Eicher)',
                        cap: 'Up to 5,000 KG (Standard)',
                        rate: 'Base ₹900 + ₹24/km',
                      },
                      {
                        type: 'reefer_truck',
                        name: 'Reefer Cold-Chain',
                        cap: 'Up to 8,000 KG (Perishables)',
                        rate: 'Base ₹1,600 + ₹34/km',
                      },
                    ].map((v) => (
                      <button
                        key={v.type}
                        type="button"
                        onClick={() => {
                          setSelectedVehicleType(v.type);
                          updateDemoFreightTariff(v.type);
                          showFeedback(`Updated vehicle to ${v.name}`);
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          (state.delivery?.vehicleType || selectedVehicleType) === v.type
                            ? 'bg-[#EBF5F0] border-[#10B981] ring-1 ring-[#10B981]'
                            : 'bg-[#F8FAF8] border-[#E5EDE8] hover:bg-white'
                        }`}
                      >
                        <div className="font-bold text-xs text-[#0B3326]">{v.name}</div>
                        <div className="text-[10px] text-[#566861] mt-0.5">{v.cap}</div>
                        <div className="text-[10px] font-bold text-[#10B981] mt-1">{v.rate}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Assigned Vehicle & Driver Info Card */}
                <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[#566861] block text-[11px]">Carrier Fleet</span>
                    <b className="text-[#0B3326]">{state.delivery?.transporterName}</b>
                  </div>
                  <div>
                    <span className="text-[#566861] block text-[11px]">Truck Registration</span>
                    <b className="text-[#0B3326]">{state.delivery?.vehicleNumber}</b>
                  </div>
                  <div>
                    <span className="text-[#566861] block text-[11px]">Assigned Driver</span>
                    <b className="text-[#0B3326]">{state.delivery?.driverName}</b>
                  </div>
                  <div>
                    <span className="text-[#566861] block text-[11px]">Driver Mobile</span>
                    <b className="text-[#10B981]">{state.delivery?.driverPhone}</b>
                  </div>
                </div>

                {/* Two-Step Anti-Theft OTP Verification Consoles */}
                <div
                  id="tour-target-transit-otps"
                  className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-all rounded-3xl ${
                    isTourRunning && currentTourStep === 4
                      ? 'ring-4 ring-[#10B981] ring-offset-2 p-2 bg-emerald-50/40 shadow-xl scale-[1.01]'
                      : ''
                  }`}
                >
                  
                  {/* Step 4A: Farmgate Pickup OTP Console */}
                  <div className={`p-4 sm:p-5 rounded-2xl border space-y-3 transition-all ${
                    state.delivery?.status === 'in_transit' || state.delivery?.status === 'delivered'
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-white border-[#E5EDE8] shadow-xs'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0B3326] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                        Step 1: Farmgate Loading Verification
                      </span>
                      <Badge variant={state.delivery?.status === 'in_transit' || state.delivery?.status === 'delivered' ? 'emerald' : 'amber'} size="sm">
                        {state.delivery?.status === 'in_transit' || state.delivery?.status === 'delivered' ? '✓ Dispatched' : 'Pending Loading'}
                      </Badge>
                    </div>

                    <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs space-y-1">
                      <span className="text-[#566861] text-[11px] block">Farmer Screen Secure Pickup OTP:</span>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-black font-mono tracking-widest text-[#0B3326]">
                          {state.delivery?.pickupOtp}
                        </span>
                        {state.delivery?.status === 'pending_escrow' || state.delivery?.status === 'assigned' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPickupOtpInput(state.delivery?.pickupOtp);
                              showFeedback('Pickup OTP copied to driver input box!');
                            }}
                            className="text-[10px] font-bold text-[#10B981] hover:underline cursor-pointer"
                          >
                            Auto-Fill for Driver
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {state.delivery?.status !== 'in_transit' && state.delivery?.status !== 'delivered' ? (
                      <div className="space-y-2 pt-1">
                        <span className="text-[11px] text-[#566861] block">
                          Driver inputs code after physical lot verification:
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Enter 4-digit code"
                            value={pickupOtpInput}
                            onChange={(e) => setPickupOtpInput(e.target.value)}
                            maxLength={4}
                            className="w-full bg-[#F8FAF8] border border-[#E5EDE8] rounded-xl px-3 py-2 text-sm font-black font-mono text-center tracking-widest focus:outline-none focus:border-[#10B981]"
                          />
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              try {
                                verifyDemoPickupOtp(pickupOtpInput || state.delivery?.pickupOtp);
                                setPickupOtpInput('');
                                showFeedback('Pickup OTP verified! Carrier has departed farmgate.');
                              } catch (e) {
                                showError(e.message);
                              }
                            }}
                            className="shrink-0 text-xs font-bold py-2 px-3"
                          >
                            Verify &amp; Dispatch
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-emerald-800 font-semibold bg-emerald-100/60 p-2.5 rounded-xl border border-emerald-200 flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-700" />
                        <span>Pickup authenticated. Consignment safely loaded on truck.</span>
                      </div>
                    )}
                  </div>

                  {/* Step 4B: Destination Delivery OTP Console */}
                  <div className={`p-4 sm:p-5 rounded-2xl border space-y-3 transition-all ${
                    state.delivery?.status === 'delivered'
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : state.delivery?.status === 'in_transit'
                      ? 'bg-white border-[#E5EDE8] shadow-xs'
                      : 'bg-[#F8FAF8] border-[#E5EDE8] text-[#566861]/60'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0B3326] flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-[#10B981]" />
                        Step 2: Destination Arrival Verification
                      </span>
                      <Badge variant={state.delivery?.status === 'delivered' ? 'emerald' : 'dark'} size="sm">
                        {state.delivery?.status === 'delivered' ? '✓ Unloaded' : 'Awaiting Arrival'}
                      </Badge>
                    </div>

                    <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs space-y-1">
                      <span className="text-[#566861] text-[11px] block">Buyer Screen Secure Delivery OTP:</span>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-black font-mono tracking-widest text-[#0B3326]">
                          {state.delivery?.deliveryOtp}
                        </span>
                        {state.delivery?.status === 'in_transit' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setDeliveryOtpInput(state.delivery?.deliveryOtp);
                              showFeedback('Delivery OTP copied to receiver input box!');
                            }}
                            className="text-[10px] font-bold text-[#10B981] hover:underline cursor-pointer"
                          >
                            Auto-Fill for Driver
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {state.delivery?.status === 'in_transit' ? (
                      <div className="space-y-2 pt-1">
                        <span className="text-[11px] text-[#566861] block">
                          Driver inputs code after cargo arrival at buyer bay:
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Enter 4-digit code"
                            value={deliveryOtpInput}
                            onChange={(e) => setDeliveryOtpInput(e.target.value)}
                            maxLength={4}
                            className="w-full bg-[#F8FAF8] border border-[#E5EDE8] rounded-xl px-3 py-2 text-sm font-black font-mono text-center tracking-widest focus:outline-none focus:border-[#10B981]"
                          />
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              try {
                                verifyDemoDeliveryOtp(deliveryOtpInput || state.delivery?.deliveryOtp);
                                setDeliveryOtpInput('');
                                showFeedback('Delivery OTP confirmed! Cargo safely received at mill.');
                              } catch (e) {
                                showError(e.message);
                              }
                            }}
                            className="shrink-0 text-xs font-bold py-2 px-3"
                          >
                            Verify &amp; Unload
                          </Button>
                        </div>
                      </div>
                    ) : state.delivery?.status === 'delivered' ? (
                      <div className="text-xs text-emerald-800 font-semibold bg-emerald-100/60 p-2.5 rounded-xl border border-emerald-200 flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-700" />
                        <span>Consignment received at mill. Unloaded for assay check.</span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-[#566861]">
                        Unlocks automatically when truck completes farmgate pickup.
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* STAGE 5: SETTLEMENT & UTR */}
            {state.currentStage === 5 && (
              <Card className="p-6 bg-white border border-[#E5EDE8] shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5EDE8]">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 text-[10px] font-bold border border-purple-200">
                      <CreditCard className="w-3 h-3" /> SETTLEMENT &amp; ASSAY AUDIT
                    </div>
                    <h3 className="text-xl font-extrabold text-[#0B3326] font-heading mt-1">
                      Quality Inspection &amp; Final Bank Payout
                    </h3>
                    <p className="text-xs text-[#566861] mt-0.5">
                      Destination assay certification. Funds release from escrow directly to the farmer bank account via IMPS/NEFT.
                    </p>
                  </div>

                  <Badge variant={state.order?.escrowStatus === 'released' ? 'emerald' : 'purple'} size="md">
                    {state.order?.escrowStatus === 'released' ? '✓ Trade 100% Settled' : 'Ready for Disbursement'}
                  </Badge>
                </div>

                {/* Quality Assay Laboratory Report */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                      <span className="text-xs font-bold text-[#0B3326]">
                        Digital Quality Assay Certificate (#AGR-ASSAY-98421)
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      state.qualityAssay?.status === 'disputed'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}>
                      {state.qualityAssay?.status === 'disputed' ? '⚠️ Moisture Dispute Flagged' : '✓ Grade A Certified'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white p-3.5 rounded-xl border border-[#E5EDE8]">
                    <div>
                      <span className="text-[#566861] block text-[11px]">Moisture Content</span>
                      <b className={state.qualityAssay?.moisturePercentage > 14 ? 'text-rose-600' : 'text-[#0B3326]'}>
                        {state.qualityAssay?.moisturePercentage}% (Limit: 14.0%)
                      </b>
                    </div>
                    <div>
                      <span className="text-[#566861] block text-[11px]">Foreign Matter</span>
                      <b className="text-[#0B3326]">{state.qualityAssay?.foreignMatterPct}% (Limit: 1.0%)</b>
                    </div>
                    <div>
                      <span className="text-[#566861] block text-[11px]">Germination Rate</span>
                      <b className="text-[#0B3326]">{state.qualityAssay?.germinationPct}% (Min: 85%)</b>
                    </div>
                    <div>
                      <span className="text-[#566861] block text-[11px]">Certified At</span>
                      <b className="text-[#10B981]">{state.qualityAssay?.inspectedAt || 'Destination Bay'}</b>
                    </div>
                  </div>

                  {/* Quality Inspection Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        submitDemoQualityInspection(true);
                        showFeedback('Moisture assay certified: 12.4% (Grade A Approved).');
                      }}
                      className="text-xs font-semibold py-1.5 px-3 h-auto cursor-pointer"
                    >
                      ✓ Certify Assay Passed (12.4%)
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        submitDemoQualityInspection(false);
                        showFeedback('Quality dispute triggered for high moisture (16.2%).');
                      }}
                      className="text-xs font-semibold py-1.5 px-3 h-auto text-rose-700 hover:bg-rose-50 cursor-pointer"
                    >
                      ⚠️ Test Moisture Dispute (16.2%)
                    </Button>
                  </div>

                  {/* Dispute Settlement Banner if Disputed */}
                  {state.qualityAssay?.status === 'disputed' && (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2 animate-in fade-in">
                      <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>AgroLnk Quality Surveyor Inspection Notice</span>
                      </div>
                      <p className="text-[11px] text-amber-900/90 leading-relaxed">
                        Moisture measured at 16.2% exceeds the 14% threshold. Surveyor recommends an amicable ₹2/kg discount or return consignment.
                      </p>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          resolveDemoQualityDispute(2);
                          showFeedback('Dispute resolved! Mutually agreed ₹2/kg adjustment applied.');
                        }}
                        className="text-xs font-bold py-1 px-3 h-auto"
                      >
                        Accept ₹2/kg Adjustment &amp; Settle
                      </Button>
                    </div>
                  )}
                </div>

                {/* Final Payout Release Box or Settled Certificate */}
                <div
                  id="tour-target-settlement"
                  className={`transition-all rounded-3xl ${
                    isTourRunning && currentTourStep === 5
                      ? 'ring-4 ring-[#10B981] ring-offset-2 shadow-2xl animate-pulse scale-[1.01]'
                      : ''
                  }`}
                >
                {state.order?.escrowStatus === 'released' ? (
                  <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0B3326] to-[#0F4A37] text-white border border-[#14624A] space-y-4 shadow-md animate-in fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#14624A] pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">🏆</span>
                        <div>
                          <h4 className="font-extrabold text-base text-white">
                            Trade Settled &amp; Paid to Bank
                          </h4>
                          <span className="text-xs text-[#34D399]">
                            Permanent Legal Settlement Certificate #AGR-SETTLE-8421
                          </span>
                        </div>
                      </div>
                      <Badge variant="accent" size="sm">
                        Bank IMPS Completed
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white/10 p-3.5 rounded-2xl border border-white/10">
                      <div>
                        <span className="text-[#A7F3D0] block text-[11px]">Disbursed Amount</span>
                        <b className="text-white text-sm">₹{state.order?.totalAmount?.toLocaleString('en-IN')}</b>
                      </div>
                      <div>
                        <span className="text-[#A7F3D0] block text-[11px]">Beneficiary Farmer</span>
                        <b className="text-white">{DEMO_PERSONAS.farmer.name}</b>
                      </div>
                      <div>
                        <span className="text-[#A7F3D0] block text-[11px]">Bank Account</span>
                        <b className="text-white">{DEMO_PERSONAS.farmer.bankAccount}</b>
                      </div>
                      <div>
                        <span className="text-[#A7F3D0] block text-[11px]">Authoritative UTR</span>
                        <b className="text-[#34D399] font-mono">{state.order?.bankUtr}</b>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs pt-1">
                      <span className="text-[#DCFCE7]/90 text-[11px]">
                        ✓ All 5 stages verified: Auction Won ➔ Escrow Funded ➔ 2-OTP Transit ➔ Assay Certified ➔ Payout Disbursed.
                      </span>
                      <Button
                        variant="white"
                        size="sm"
                        onClick={handleReset}
                        icon={RotateCcw}
                        iconPosition="left"
                        className="text-xs font-bold py-1.5 px-3 shrink-0 !bg-white !text-[#0B3326] hover:!bg-[#EBF5F0]"
                      >
                        Run New Simulation
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#EBF5F0] border border-[#10B981]/30 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-[#0B3326] block">
                          Escrow Payment Disbursement Authorization
                        </span>
                        <span className="text-[11px] text-[#566861]">
                          Beneficiary: {DEMO_PERSONAS.farmer.name} • Account: {DEMO_PERSONAS.farmer.bankAccount} (IFSC: {DEMO_PERSONAS.farmer.ifsc})
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-[#566861] block">Net Payable to Farmer:</span>
                        <span className="text-xl font-black text-[#10B981]">
                          ₹{state.order?.totalAmount?.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-[#E5EDE8] flex items-center justify-between text-xs">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#0B3326]">
                        <input
                          type="checkbox"
                          checked={escrowAudited}
                          onChange={(e) => setEscrowAudited(e.target.checked)}
                          className="rounded text-[#10B981] focus:ring-0"
                        />
                        <span>Priya Raman (Escrow Operations Desk) verified telephone audit with Buyer Maran S</span>
                      </label>
                      <Badge variant="emerald" size="sm">Audit Complete</Badge>
                    </div>

                    <div className="flex items-center justify-end">
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => {
                          releaseDemoEscrow();
                          showFeedback('Disbursement completed! IMPS Bank UTR generated.');
                        }}
                        disabled={!escrowAudited}
                        icon={CheckCircle2}
                        iconPosition="left"
                        className="text-xs font-bold py-2.5 px-5 shadow-sm"
                      >
                        Authorize IMPS Disbursement (₹{state.order?.totalAmount?.toLocaleString('en-IN')})
                      </Button>
                    </div>
                  </div>
                )}
                </div>
              </Card>
            )}
          </div>

          {/* Right Sidebar: Active Persona Detail & Sandbox Audit Log (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Active Persona Profile Card */}
            <Card className="p-5 bg-white border border-[#E5EDE8] shadow-xs space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#566861] block">
                Current Actor Context
              </span>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{activePersona.avatar}</span>
                <div>
                  <h4 className="font-bold text-[#0B3326] text-sm">{activePersona.name}</h4>
                  <span className="text-xs text-[#10B981] font-semibold">{activePersona.badge}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-[#E5EDE8] text-xs space-y-1 text-[#566861]">
                <div>Org: <b className="text-[#14211D]">{activePersona.organization}</b></div>
                <div>Location: <b className="text-[#14211D]">{activePersona.location}</b></div>
                {activePersona.bankAccount && (
                  <div>Bank: <b className="text-[#14211D]">{activePersona.bankAccount}</b></div>
                )}
                {activePersona.walletBalance && (
                  <div>Deposit Limit: <b className="text-[#10B981]">₹{activePersona.walletBalance.toLocaleString('en-IN')}</b></div>
                )}
              </div>
            </Card>

            {/* Live Sandbox Audit Trail */}
            <Card className="p-5 bg-white border border-[#E5EDE8] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#566861]">
                  Live Activity Audit Trail
                </span>
                <span className="text-[10px] font-semibold text-[#10B981]">
                  {state.logs.length} Events
                </span>
              </div>
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {state.logs.map((log) => (
                  <div key={log.id} className="text-xs p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-0.5">
                    <div className="flex items-center justify-between text-[10px] text-[#566861]">
                      <span className="font-bold text-[#0B3326]">{log.role}</span>
                      <span>{log.time}</span>
                    </div>
                    <p className="text-[11px] text-[#14211D] leading-relaxed">
                      {log.text}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

        </div>

      </main>

    </div>
  );
}

