import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RotateCcw,
  ArrowRight,
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
  Play
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
  createDemoAuction
} from '../../utils/demoEngine';

export default function DemoCenter({ currentUser, onNavigate, navState }) {
  const [state, setState] = useState(() => getDemoState());
  const [activeTab, setActiveTab] = useState('stage_view'); // 'stage_view' | 'audit_log'
  const [bidInput, setBidInput] = useState('');
  const [pickupOtpInput, setPickupOtpInput] = useState('');
  const [deliveryOtpInput, setDeliveryOtpInput] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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
            
            {/* STAGE 1: SETUP & LAUNCH */}
            {state.currentStage === 1 && (
              <Card className="p-6 bg-white border border-[#E5EDE8] shadow-xs space-y-6">
                <div>
                  <h3 className="text-base font-bold text-[#0B3326] font-heading">
                    Stage 1: Launch Produce Auction Lot
                  </h3>
                  <p className="text-xs text-[#566861] mt-0.5">
                    Select a pre-configured harvest lot or configure custom parameters:
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {DEMO_TEMPLATES.map((tpl) => (
                    <div
                      key={tpl.id}
                      onClick={() => createDemoAuction(tpl.id)}
                      className="p-4 rounded-2xl border border-[#E5EDE8] hover:border-[#10B981] hover:bg-[#F2FBF6]/50 transition-all cursor-pointer text-left space-y-2 group"
                    >
                      <span className="text-xs font-bold text-[#0B3326] block group-hover:text-[#10B981]">
                        {tpl.commodity}
                      </span>
                      <div className="text-[11px] text-[#566861] space-y-0.5">
                        <div>Quantity: <b>{tpl.quantity} {tpl.unit}</b></div>
                        <div>Base: <b>₹{tpl.startingBid}/{tpl.unit}</b></div>
                        <div>Reserve: <b className="text-[#10B981]">₹{tpl.reservePrice}/{tpl.unit}</b></div>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full text-xs py-1.5 mt-2 h-auto font-bold"
                      >
                        Launch This Lot
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* STAGE 2: LIVE FLOOR BIDDING */}
            {state.currentStage === 2 && (
              <Card className="p-6 bg-white border border-[#E5EDE8] shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5EDE8]">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
                      LIVE AUCTION FLOOR
                    </div>
                    <h3 className="text-lg font-bold text-[#0B3326] font-heading mt-1">
                      {state.auction?.commodity} ({state.auction?.quantity} {state.auction?.unit})
                    </h3>
                    <p className="text-xs text-[#566861]">
                      Origin: {state.auction?.origin} • Grade {state.auction?.grade}
                    </p>
                  </div>

                  <div className="text-left sm:text-right bg-[#F8FAF8] p-3 rounded-2xl border border-[#E5EDE8]">
                    <span className="text-[10px] text-[#566861] uppercase tracking-wider font-bold block">
                      Leading Offer
                    </span>
                    <span className="text-2xl font-extrabold text-[#10B981] font-heading">
                      ₹{state.auction?.currentBid}
                    </span>
                    <span className="text-xs text-[#566861]">/{state.auction?.unit}</span>
                  </div>
                </div>

                {/* Bidding Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Buyer Action Box */}
                  <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-3">
                    <span className="text-xs font-bold text-[#0B3326] block">
                      🏢 Buyer Controls ({DEMO_PERSONAS.buyer.name})
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder={`Min ₹${(state.auction?.currentBid || 32) + 1}`}
                        value={bidInput}
                        onChange={(e) => setBidInput(e.target.value)}
                        className="w-full bg-white border border-[#E5EDE8] rounded-xl px-3 py-2 text-xs font-bold text-[#0B3326] focus:outline-none focus:border-[#10B981]"
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          const val = Number(bidInput) || (state.auction.currentBid + state.auction.bidStep);
                          placeDemoBid(val);
                          setBidInput('');
                          showFeedback(`Bid of ₹${val}/${state.auction.unit} placed! You are leading.`);
                        }}
                        className="shrink-0 text-xs font-bold py-2 px-3"
                      >
                        Bid Now
                      </Button>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        simulateCompetitorBid();
                        showFeedback('Simulated competitor placed an outbid offer!');
                      }}
                      className="w-full text-xs font-semibold py-1.5 h-auto text-[#566861]"
                    >
                      🤖 Simulate Competitor Outbid
                    </Button>
                  </div>

                  {/* Farmer Action Box */}
                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60 space-y-3">
                    <span className="text-xs font-bold text-amber-950 block">
                      👨‍🌾 Farmer Early Knockdown Controls
                    </span>
                    <p className="text-[11px] text-amber-900/80">
                      Reserve Price: <b>₹{state.auction?.reservePrice}/{state.auction?.unit}</b>. Satisfied with the leading bid? You can accept immediately:
                    </p>
                    <Button
                      variant="accent"
                      size="sm"
                      onClick={() => {
                        finalizeDemoAuction(true);
                        showFeedback('Auction closed! Order and delivery consignment generated.');
                      }}
                      icon={Zap}
                      iconPosition="left"
                      className="w-full text-xs font-bold py-2 shadow-xs"
                    >
                      Accept Offer &amp; Close Now
                    </Button>
                  </div>
                </div>

                {/* Live Bids History */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#566861] uppercase tracking-wider">
                    Recent Bid Ticker
                  </span>
                  <div className="divide-y divide-[#E5EDE8] border border-[#E5EDE8] rounded-2xl bg-white overflow-hidden text-xs">
                    {state.bids.slice(0, 5).map((b) => (
                      <div key={b.id} className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#0B3326]">{b.bidderName}</span>
                          <span className="text-[10px] text-[#566861]">({b.timestamp})</span>
                        </div>
                        <span className="font-extrabold text-[#10B981]">₹{b.amount}/{state.auction?.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* STAGE 3: ESCROW DEPOSIT */}
            {state.currentStage === 3 && (
              <Card className="p-6 bg-white border border-[#E5EDE8] shadow-xs space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[10px] font-bold border border-blue-200">
                    <Lock className="w-3 h-3" /> ESCROW TRUST DEPOSIT
                  </div>
                  <h3 className="text-lg font-bold text-[#0B3326] font-heading mt-1">
                    Order {state.order?.orderNumber} Awaiting Escrow Funding
                  </h3>
                  <p className="text-xs text-[#566861]">
                    The buyer deposits funds into the AgroLnk Bank Escrow Trust Account. Neither buyer nor seller holds custody during transit.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-[#566861] block text-[11px]">Commodity</span>
                      <b className="text-[#0B3326]">{state.order?.commodity}</b>
                    </div>
                    <div>
                      <span className="text-[#566861] block text-[11px]">Quantity</span>
                      <b className="text-[#0B3326]">{state.order?.quantity} {state.order?.unit}</b>
                    </div>
                    <div>
                      <span className="text-[#566861] block text-[11px]">Rate</span>
                      <b className="text-[#10B981]">₹{state.order?.pricePerUnit}/{state.order?.unit}</b>
                    </div>
                    <div>
                      <span className="text-[#566861] block text-[11px]">Total Contract</span>
                      <b className="text-[#0B3326] text-sm">₹{state.order?.totalAmount?.toLocaleString('en-IN')}</b>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#EBF5F0] border border-[#10B981]/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#10B981] text-white flex items-center justify-center font-bold">
                      🏛️
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#0B3326] block">
                        AgroLnk Escrow Trust Account (IDBI Bank)
                      </span>
                      <span className="text-[11px] text-[#566861]">
                        Safe Custody Account • 100% RBI Protected
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      fundDemoEscrow();
                      showFeedback('Escrow funded! Money locked in trust. Dispatch authorized.');
                    }}
                    className="font-bold text-xs py-2 px-4 shadow-sm"
                  >
                    Deposit ₹{state.order?.totalAmount?.toLocaleString('en-IN')} Now
                  </Button>
                </div>
              </Card>
            )}

            {/* STAGE 4: LOGISTICS & 2-OTP TRANSIT */}
            {state.currentStage === 4 && (
              <Card className="p-6 bg-white border border-[#E5EDE8] shadow-xs space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                    <Truck className="w-3 h-3" /> TWO-STEP ANTI-THEFT LOGISTICS
                  </div>
                  <h3 className="text-lg font-bold text-[#0B3326] font-heading mt-1">
                    Consignment {state.delivery?.deliveryNumber} Dispatch
                  </h3>
                  <p className="text-xs text-[#566861]">
                    Truck: <b>{state.delivery?.vehicleNumber}</b> • Driver: <b>{state.delivery?.driverName}</b> ({state.delivery?.driverPhone})
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Step 4A: Farmgate Pickup */}
                  <div className={`p-4 rounded-2xl border space-y-3 ${
                    state.delivery?.status === 'in_transit' || state.delivery?.status === 'delivered'
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-white border-[#E5EDE8]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0B3326]">
                        Step 1: Farmgate Loading OTP
                      </span>
                      <Badge variant={state.delivery?.status === 'in_transit' || state.delivery?.status === 'delivered' ? 'emerald' : 'amber'} size="sm">
                        {state.delivery?.status === 'in_transit' || state.delivery?.status === 'delivered' ? '✓ Verified' : 'Awaiting Driver'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-[#566861]">
                      Farmer reveals code upon inspecting truck: <b className="text-[#0B3326] text-sm tracking-widest">{state.delivery?.pickupOtp}</b>
                    </p>
                    {state.delivery?.status !== 'in_transit' && state.delivery?.status !== 'delivered' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Enter 4-digit code"
                          value={pickupOtpInput}
                          onChange={(e) => setPickupOtpInput(e.target.value)}
                          className="w-full bg-[#F8FAF8] border border-[#E5EDE8] rounded-xl px-3 py-2 text-xs font-bold text-center tracking-widest"
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            try {
                              verifyDemoPickupOtp(pickupOtpInput || state.delivery?.pickupOtp);
                              setPickupOtpInput('');
                              showFeedback('Pickup OTP confirmed! Produce is now in transit.');
                            } catch (e) {
                              showError(e.message);
                            }
                          }}
                          className="shrink-0 text-xs font-bold"
                        >
                          Verify Pickup
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Step 4B: Destination Delivery */}
                  <div className={`p-4 rounded-2xl border space-y-3 ${
                    state.delivery?.status === 'delivered'
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-[#F8FAF8] border-[#E5EDE8]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0B3326]">
                        Step 2: Destination Delivery OTP
                      </span>
                      <Badge variant={state.delivery?.status === 'delivered' ? 'emerald' : 'dark'} size="sm">
                        {state.delivery?.status === 'delivered' ? '✓ Unloaded' : 'In Transit'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-[#566861]">
                      Buyer reveals code upon arrival at mill: <b className="text-[#0B3326] text-sm tracking-widest">{state.delivery?.deliveryOtp}</b>
                    </p>
                    {state.delivery?.status === 'in_transit' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Enter 4-digit code"
                          value={deliveryOtpInput}
                          onChange={(e) => setDeliveryOtpInput(e.target.value)}
                          className="w-full bg-white border border-[#E5EDE8] rounded-xl px-3 py-2 text-xs font-bold text-center tracking-widest"
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            try {
                              verifyDemoDeliveryOtp(deliveryOtpInput || state.delivery?.deliveryOtp);
                              setDeliveryOtpInput('');
                              showFeedback('Delivery OTP confirmed! Truck safely unloaded.');
                            } catch (e) {
                              showError(e.message);
                            }
                          }}
                          className="shrink-0 text-xs font-bold"
                        >
                          Verify Arrival
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* STAGE 5: SETTLEMENT & UTR */}
            {state.currentStage === 5 && (
              <Card className="p-6 bg-white border border-[#E5EDE8] shadow-xs space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 text-[10px] font-bold border border-purple-200">
                    <CreditCard className="w-3 h-3" /> SETTLEMENT &amp; ASSAY AUDIT
                  </div>
                  <h3 className="text-lg font-bold text-[#0B3326] font-heading mt-1">
                    Quality Inspection &amp; Final Bank Payout
                  </h3>
                  <p className="text-xs text-[#566861]">
                    Destination moisture assay verified. Payment releases from escrow trust directly to the farmer bank account.
                  </p>
                </div>

                {/* Quality Assay Card */}
                <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0B3326]">
                      Moisture &amp; Quality Assay Report
                    </span>
                    <Badge variant={state.qualityAssay?.status === 'disputed' ? 'rose' : 'emerald'} size="sm">
                      {state.qualityAssay?.status === 'disputed' ? '⚠️ Moisture Dispute' : '✓ Grade A Certified'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-[#566861]">
                    <div>Moisture: <b>{state.qualityAssay?.moisturePercentage}%</b> (Limit 14%)</div>
                    <div>Foreign Matter: <b>{state.qualityAssay?.foreignMatterPct}%</b></div>
                    <div>Germination: <b>{state.qualityAssay?.germinationPct}%</b></div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        submitDemoQualityInspection(true);
                        showFeedback('Moisture assay set to Passed (12.4%).');
                      }}
                      className="text-xs font-semibold py-1 px-2.5 h-auto"
                    >
                      Certify Assay Passed
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        submitDemoQualityInspection(false);
                        showFeedback('Quality dispute triggered for high moisture (16.2%).');
                      }}
                      className="text-xs font-semibold py-1 px-2.5 h-auto text-rose-700"
                    >
                      Trigger Quality Dispute
                    </Button>
                  </div>
                </div>

                {/* Final Payout Release Box */}
                {state.order?.escrowStatus === 'released' ? (
                  <div className="p-5 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🎉</span>
                      <span className="font-extrabold text-sm text-[#34D399]">
                        Trade 100% Settled &amp; Paid to Bank
                      </span>
                    </div>
                    <p className="text-xs text-[#DCFCE7]/90 leading-relaxed">
                      Escrow funds of <b>₹{state.order?.totalAmount?.toLocaleString('en-IN')}</b> have been credited to Suresh Sharma's State Bank of India account.
                    </p>
                    <div className="pt-2 border-t border-[#14624A] text-xs flex items-center justify-between font-mono text-[#A7F3D0]">
                      <span>Bank UTR: {state.order?.bankUtr}</span>
                      <span className="text-white font-sans text-xs">✓ Escrow Released</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-[#EBF5F0] border border-[#10B981]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-[#0B3326] block">
                        Ready for Bank Disbursement
                      </span>
                      <span className="text-[11px] text-[#566861]">
                        Target: {DEMO_PERSONAS.farmer.bankAccount} (IFSC: {DEMO_PERSONAS.farmer.ifsc})
                      </span>
                    </div>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => {
                        releaseDemoEscrow();
                        showFeedback('Payout processed! Bank UTR generated.');
                      }}
                      className="text-xs font-bold py-2 px-4 shadow-sm"
                    >
                      Authorize IMPS Payout
                    </Button>
                  </div>
                )}
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
