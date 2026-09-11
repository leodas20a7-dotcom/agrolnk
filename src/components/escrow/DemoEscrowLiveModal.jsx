import React, { useState, useEffect } from 'react';
import {
  X,
  Landmark,
  ShieldCheck,
  Lock,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Zap,
  RefreshCw,
  Clock,
  Building2,
  DollarSign,
  FileCheck,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import {
  getLiveEscrowTelemetry,
  getEscrowTransactions,
  getLiveEscrowEvents,
  processLiveEscrowDeposit,
  processLiveEscrowRelease,
  resetDemoEscrowLedger,
  ESCROW_NODAL_ACCOUNT
} from '../../utils/escrowApi';
import { formatINR } from '../../utils/commission';

export default function DemoEscrowLiveModal({ isOpen, onClose }) {
  const [telemetry, setTelemetry] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'simulator' | 'webhooks'
  const [copiedField, setCopiedField] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState('');

  // Simulator Form State
  const [simCommodity, setSimCommodity] = useState('Tomato (Hybrid Shivam)');
  const [simAmount, setSimAmount] = useState('5000');
  const [simBuyer, setSimBuyer] = useState('Maran S (Global Agro)');
  const [simFarmer, setSimFarmer] = useState('Veerappan (Salem Producer)');
  const [simOtp, setSimOtp] = useState('849201');

  const loadData = async () => {
    try {
      const [tel, txns] = await Promise.all([
        getLiveEscrowTelemetry(),
        getEscrowTransactions(),
      ]);
      setTelemetry(tel);
      setTransactions(txns || []);
      setEvents(getLiveEscrowEvents());
    } catch (err) {
      console.error('Error loading escrow data:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('agrolnk_escrow_updated', handleUpdate);
    window.addEventListener('agrolnk_escrow_event', handleUpdate);

    return () => {
      window.removeEventListener('agrolnk_escrow_updated', handleUpdate);
      window.removeEventListener('agrolnk_escrow_event', handleUpdate);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const showToast = (msg) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(''), 4000);
  };

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2500);
  };

  const handleTestDeposit = async (e) => {
    e.preventDefault();
    setIsSimulating(true);
    try {
      const result = await processLiveEscrowDeposit({
        commodity: simCommodity,
        tradeAmount: Number(simAmount) || 5000,
        buyerName: simBuyer,
        farmerName: simFarmer,
        paymentMode: 'Instant Virtual Nodal UPI',
      });
      showToast(`✓ Captured ${formatINR(result.grossAmount)} into Escrow Vault! UTR: ${result.utrNumber}`);
      loadData();
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleTestRelease = async () => {
    setIsSimulating(true);
    try {
      const result = await processLiveEscrowRelease('first_available', simOtp);
      if (result) {
        showToast(`✓ OTP Verified! Disbursed ${formatINR(result.netFarmerPayout)} to ${result.farmerName}. AgroLnk fee realized: ${formatINR(result.platformRevenue)}`);
      } else {
        showToast('ℹ️ No active locked escrow orders found to release.');
      }
      loadData();
    } catch (err) {
      console.error('Release simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleReset = () => {
    resetDemoEscrowLedger();
    showToast('✓ Escrow Ledger reset to initial seed state.');
    loadData();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs p-3 sm:p-6 flex items-center justify-center animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] flex flex-col border border-[#E5EDE8] shadow-2xl text-left my-auto animate-in zoom-in-95 duration-200 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toast Notification */}
        {feedbackToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#0B3326] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg border border-[#10B981] flex items-center gap-2 animate-in slide-in-from-top duration-200">
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            {feedbackToast}
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 pb-3 sm:pb-4 border-b border-[#E5EDE8] shrink-0 bg-white z-10 gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-[#0B3326] text-white flex items-center justify-center shrink-0">
              <Landmark className="w-4 h-4 sm:w-5 sm:h-5 text-[#34D399]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="text-sm sm:text-xl font-extrabold text-[#0B3326] font-heading truncate">
                  Nodal Settlement & Escrow Gateway Simulator
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-pulse"></span>
                  Sandbox Simulator Mode
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-[#566861] mt-0.5 truncate">
                {ESCROW_NODAL_ACCOUNT.bankName} • Visualizer & Webhook Bus (Isolated from Live Database)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#E5EDE8] bg-[#F8FAF8] px-6 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'border-[#0B3326] text-[#0B3326]'
                : 'border-transparent text-[#566861] hover:text-[#0B3326]'
            }`}
          >
            🏦 Nodal Account & Telemetry
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'simulator'
                ? 'border-[#0B3326] text-[#0B3326]'
                : 'border-transparent text-[#566861] hover:text-[#0B3326]'
            }`}
          >
            ⚡ Live Interactive Simulator
          </button>
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'webhooks'
                ? 'border-[#0B3326] text-[#0B3326]'
                : 'border-transparent text-[#566861] hover:text-[#0B3326]'
            }`}
          >
            📡 Live Webhook Logs ({events.length})
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* TAB 1: OVERVIEW & TELEMETRY */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Official Tripartite Escrow Trust Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0B3326] to-[#0A261D] text-white border border-[#14624A] shadow-md relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[#34D399] tracking-wider uppercase">
                      Official Nodal Banking Partner
                    </span>
                    <h4 className="text-lg font-bold text-white font-heading">
                      {ESCROW_NODAL_ACCOUNT.accountName}
                    </h4>
                    <p className="text-xs text-[#DCFCE7]/80">
                      Virtual Nodal Account: <strong className="font-mono text-white">{ESCROW_NODAL_ACCOUNT.accountNumber}</strong> • IFSC: <strong className="font-mono text-white">{ESCROW_NODAL_ACCOUNT.ifscCode}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(ESCROW_NODAL_ACCOUNT.accountNumber, 'acc')}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/20"
                    >
                      {copiedField === 'acc' ? <Check className="w-3.5 h-3.5 text-[#34D399]" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedField === 'acc' ? 'Copied' : 'Copy Virtual A/C'}
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center gap-4 text-xs text-[#DCFCE7]/80">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#34D399]" />
                    <span>Trustee: <strong>{ESCROW_NODAL_ACCOUNT.trusteePartner}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-[#34D399]" />
                    <span>Speed: <strong>{ESCROW_NODAL_ACCOUNT.settlementSpeed}</strong></span>
                  </div>
                </div>
              </div>

              {/* Real-time Balances Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0]">
                  <span className="text-xs font-medium text-[#166534] block">Locked in Escrow</span>
                  <span className="text-xl font-extrabold text-[#0B3326] block font-heading mt-1">
                    {formatINR(telemetry?.totalLockedInEscrow || 0)}
                  </span>
                  <span className="text-[11px] text-[#15803D] mt-1 block font-medium">
                    {telemetry?.activeLockedOrdersCount || 0} Orders in Transit
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8]">
                  <span className="text-xs font-medium text-[#566861] block">Settled Payouts</span>
                  <span className="text-xl font-extrabold text-[#0B3326] block font-heading mt-1">
                    {formatINR(telemetry?.totalSettledToFarmers || 0)}
                  </span>
                  <span className="text-[11px] text-[#566861] mt-1 block">
                    {telemetry?.completedSettlementsCount || 0} Successful Payouts
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0]">
                  <span className="text-xs font-medium text-[#065F46] block">0.50% AgroLnk Revenue</span>
                  <span className="text-xl font-extrabold text-[#047857] block font-heading mt-1">
                    {formatINR(telemetry?.totalPlatformRevenue || 0)}
                  </span>
                  <span className="text-[11px] text-[#059669] mt-1 block font-medium">
                    0.25% Buyer + 0.25% Farmer
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8]">
                  <span className="text-xs font-medium text-[#566861] block">Processed Volume</span>
                  <span className="text-xl font-extrabold text-[#0B3326] block font-heading mt-1">
                    {formatINR(telemetry?.totalProcessedVolume || 0)}
                  </span>
                  <span className="text-[11px] text-[#566861] mt-1 block">
                    {telemetry?.totalTransactionsCount || 0} Escrow Trades
                  </span>
                </div>
              </div>

              {/* Transactions Ledger Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[#0B3326] font-heading flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-[#10B981]" />
                    Live Escrow Vault Ledger
                  </h4>
                  <button
                    onClick={handleReset}
                    className="text-xs text-[#566861] hover:text-[#0B3326] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Reset Demo
                  </button>
                </div>

                <div className="rounded-2xl border border-[#E5EDE8] overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#0B3326] text-white">
                      <tr>
                        <th className="p-3 font-semibold">Order & Date</th>
                        <th className="p-3 font-semibold">Parties</th>
                        <th className="p-3 font-semibold">Gross Escrow</th>
                        <th className="p-3 font-semibold">AgroLnk 0.50%</th>
                        <th className="p-3 font-semibold">Farmer Net</th>
                        <th className="p-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5EDE8]">
                      {transactions.map((t) => (
                        <tr key={t.id} className="hover:bg-[#F8FAF8] transition-colors">
                          <td className="p-3">
                            <strong className="font-bold text-[#0B3326] block font-heading">{t.orderNumber}</strong>
                            <span className="text-[10px] text-[#566861] block font-mono">{t.utrNumber}</span>
                          </td>
                          <td className="p-3">
                            <span className="block text-[#0B3326] font-medium">{t.buyerName} ➡️</span>
                            <span className="block text-[#566861]">{t.farmerName}</span>
                          </td>
                          <td className="p-3 font-bold text-[#0B3326]">
                            {formatINR(t.grossAmount)}
                          </td>
                          <td className="p-3 text-[#059669] font-semibold">
                            +{formatINR(t.platformRevenue)}
                          </td>
                          <td className="p-3 font-semibold text-[#0B3326]">
                            {formatINR(t.netFarmerPayout)}
                          </td>
                          <td className="p-3">
                            {t.status === 'LOCKED_IN_ESCROW' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                                <Lock className="w-3 h-3" /> Locked
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                                <CheckCircle2 className="w-3 h-3 text-[#10B981]" /> Settled
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: LIVE INTERACTIVE SIMULATOR */}
          {activeTab === 'simulator' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-xs text-[#065F46]">
                💡 <strong>Tester Assistant:</strong> Use the controls below to trigger real-time simulated bank deposits and delivery OTP payouts. Watch the balances and webhook telemetry update dynamically!
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Simulate Inward Buyer Deposit */}
                <div className="p-5 rounded-2xl border border-[#E5EDE8] bg-[#F8FAF8] space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#0B3326] text-white flex items-center justify-center">
                      <Zap className="w-4 h-4 text-[#34D399]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#0B3326] font-heading">
                        1. Simulate Inward Escrow Deposit
                      </h4>
                      <p className="text-[11px] text-[#566861]">Buyer deposits 100% into Nodal Virtual A/C</p>
                    </div>
                  </div>

                  <form onSubmit={handleTestDeposit} className="space-y-3 text-xs">
                    <div>
                      <label className="font-semibold text-[#0B3326] block mb-1">Commodity Lot</label>
                      <input
                        type="text"
                        value={simCommodity}
                        onChange={(e) => setSimCommodity(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-[#E5EDE8] bg-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-[#0B3326] block mb-1">Trade Amount (₹)</label>
                      <input
                        type="number"
                        value={simAmount}
                        onChange={(e) => setSimAmount(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-[#E5EDE8] bg-white font-bold"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-semibold text-[#0B3326] block mb-1">Buyer</label>
                        <input
                          type="text"
                          value={simBuyer}
                          onChange={(e) => setSimBuyer(e.target.value)}
                          className="w-full p-2 rounded-xl border border-[#E5EDE8] bg-white text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-[#0B3326] block mb-1">Farmer</label>
                        <input
                          type="text"
                          value={simFarmer}
                          onChange={(e) => setSimFarmer(e.target.value)}
                          className="w-full p-2 rounded-xl border border-[#E5EDE8] bg-white text-[11px]"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      icon={Lock}
                      iconPosition="left"
                      disabled={isSimulating}
                      className="w-full justify-center mt-2 cursor-pointer font-bold"
                    >
                      {isSimulating ? 'Processing...' : '⚡ Trigger Live Inward Deposit'}
                    </Button>
                  </form>
                </div>

                {/* 2. Simulate Outward Delivery OTP Release */}
                <div className="p-5 rounded-2xl border border-[#E5EDE8] bg-[#F8FAF8] space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#047857] text-white flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#0B3326] font-heading">
                          2. Simulate Delivery OTP Payout
                        </h4>
                        <p className="text-[11px] text-[#566861]">Release funds to Farmer Bank Account</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-[#E5EDE8] space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[#566861]">
                        <span>Active Locked Vault Balance:</span>
                        <strong className="text-[#0B3326]">{formatINR(telemetry?.totalLockedInEscrow || 0)}</strong>
                      </div>
                      <div className="flex items-center justify-between text-[#566861]">
                        <span>Delivery Confirmation OTP:</span>
                        <span className="font-mono font-bold text-[#0B3326] bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#A7F3D0]">
                          {simOtp}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleTestRelease}
                    variant="secondary"
                    size="sm"
                    icon={CheckCircle2}
                    iconPosition="left"
                    disabled={isSimulating || (telemetry?.totalLockedInEscrow || 0) === 0}
                    className="w-full justify-center bg-[#0B3326] text-white hover:bg-[#0A261D] cursor-pointer font-bold"
                  >
                    {isSimulating ? 'Verifying OTP...' : '🔓 Verify OTP & Disburse to Farmer'}
                  </Button>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: LIVE WEBHOOK LOGS */}
          {activeTab === 'webhooks' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0B3326]">
                  Real-time Nodal Gateway Event Bus
                </span>
                <span className="text-[11px] text-[#566861] font-mono">
                  Listening on ws://icici.agrolnk.internal/webhooks
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#0B3326] text-[#A7F3D0] font-mono text-xs space-y-2.5 max-h-80 overflow-y-auto shadow-inner">
                {events.length === 0 ? (
                  <div className="text-white/60 py-4 text-center">No webhook events logged yet. Trigger a test deposit to see live logs!</div>
                ) : (
                  events.map((evt) => (
                    <div key={evt.id} className="pb-2 border-b border-white/10 last:border-0">
                      <div className="flex items-center justify-between text-[11px] text-white/70">
                        <span className="text-[#34D399] font-bold">[{evt.topic}]</span>
                        <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-white mt-1 text-[11px]">
                        {evt.details}
                      </div>
                      {evt.utr && (
                        <div className="text-[10px] text-white/50 mt-0.5">
                          UTR: {evt.utr} • Order: {evt.orderNumber}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#E5EDE8] bg-[#F8FAF8] flex items-center justify-between text-xs text-[#566861] shrink-0">
          <span>
            AgroLnk Escrow Security Engine • Zero Fraud Guarantee
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="cursor-pointer"
          >
            Close Console
          </Button>
        </div>

      </div>
    </div>
  );
}
