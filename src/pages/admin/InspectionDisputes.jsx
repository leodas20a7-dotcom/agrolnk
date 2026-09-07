import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { 
  AlertTriangle, ShieldCheck, CheckCircle2, 
  XCircle, ArrowRight, ArrowLeft, DollarSign, Scale, Filter
} from 'lucide-react';
import { getInspectionRecords, arbitrateDispute } from '../../utils/inspection';
import { formatINR } from '../../utils/commission';
import InspectionStatusBadge from '../../components/inspection/InspectionStatusBadge';

export default function InspectionDisputes({ currentUser, onNavigate }) {
  const user = currentUser || {
    name: 'Platform Admin',
    role: 'admin',
    email: 'admin@agrolnk.com',
  };

  const [inspections, setInspections] = useState([]);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [resolutionAction, setResolutionAction] = useState('partial_refund');
  const [refundAmount, setRefundAmount] = useState('');
  const [arbitrationNotes, setArbitrationNotes] = useState('');
  const [filter, setFilter] = useState('all'); // all, disputed, resolved

  const loadInspections = () => {
    const list = getInspectionRecords();
    setInspections(list);
  };

  useEffect(() => {
    loadInspections();
  }, []);

  const disputedList = inspections.filter(i => {
    if (filter === 'disputed') return i.status === 'disputed';
    if (filter === 'resolved') return i.status === 'resolved' || i.arbitration;
    return true;
  });

  const handleOpenArbitration = (inspection) => {
    setSelectedDispute(inspection);
    setRefundAmount(inspection.orderAmount ? Math.round(inspection.orderAmount * 0.1) : '');
    setArbitrationNotes('');
    setResolutionAction('partial_refund');
  };

  const handleSubmitResolution = (e) => {
    e.preventDefault();
    if (!selectedDispute) return;

    arbitrateDispute(selectedDispute.id, {
      action: resolutionAction,
      refundAmount: resolutionAction === 'partial_refund' ? Number(refundAmount) : (resolutionAction === 'full_refund' ? selectedDispute.orderAmount : 0),
      notes: arbitrationNotes,
      arbitratedBy: 'AgroLnk Platform Ombudsman'
    });

    setSelectedDispute(null);
    loadInspections();
  };

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-6 text-left max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <button
              onClick={() => onNavigate('admin-dashboard')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#566861] hover:text-[#0B3326] transition-colors mb-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0B3326] font-heading">
                Inspection Disputes
              </h1>
              <span className="bg-amber-100 text-amber-800 text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Scale className="w-3.5 h-3.5" /> Ombudsman Arbitration
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#566861]">
              Review buyer quality assays, moisture discrepancies, and arbitrate escrow settlements.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-[#F8FAF8] border border-[#E5EDE8] p-1 rounded-xl">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filter === 'all' ? 'bg-[#0B3326] text-white shadow-xs' : 'text-[#566861] hover:text-[#0B3326]'
              }`}
            >
              All ({inspections.length})
            </button>
            <button
              onClick={() => setFilter('disputed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filter === 'disputed' ? 'bg-amber-600 text-white shadow-xs' : 'text-[#566861] hover:text-[#0B3326]'
              }`}
            >
              Disputed ({inspections.filter(i => i.status === 'disputed').length})
            </button>
            <button
              onClick={() => setFilter('resolved')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filter === 'resolved' ? 'bg-emerald-600 text-white shadow-xs' : 'text-[#566861] hover:text-[#0B3326]'
              }`}
            >
              Resolved ({inspections.filter(i => i.status === 'resolved' || i.status === 'passed').length})
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-amber-500 text-white rounded-xl shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-xs text-amber-950">
            <span className="font-bold block">Escrow Quality Lock:</span>
            Escrow funds remain securely frozen until both physical delivery and buyer quality sign-off are verified.
            In case of discrepancy, AgroLnk arbitrates net settlement or returns.
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-[#E5EDE8] shadow-xs overflow-hidden">
          {disputedList.length === 0 ? (
            <div className="text-center py-12 px-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-[#0B3326]">No inspection disputes pending</p>
              <p className="text-xs text-[#566861] mt-0.5">All quality inspections are either passed or no active disputes match this filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#566861]">
                <thead className="bg-[#F8FAF8] border-b border-[#E5EDE8] text-[11px] font-bold text-[#0B3326] uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Inspection / Order</th>
                    <th className="py-3.5 px-4">Commodity & Quantity</th>
                    <th className="py-3.5 px-4">Buyer & Seller</th>
                    <th className="py-3.5 px-4">Quality Assay</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Escrow Locked</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EDE8]">
                  {disputedList.map((item) => (
                    <tr key={item.id} className="hover:bg-[#F8FAF8]/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <span className="font-bold text-[#0B3326]">#{item.id}</span>
                        <div className="text-[#566861] text-[11px] mt-0.5">Order #{item.orderId}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[#0B3326]">{item.cropName}</span>
                        <div className="text-[11px] text-[#566861]">{item.quantity} MT ({item.verifiedWeight ? `${item.verifiedWeight} MT verified` : 'Pending weighment'})</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <div className="text-[#0B3326] font-semibold">B: {item.buyerName}</div>
                        <div className="text-[#566861]">S: {item.sellerName}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {item.grade ? (
                          <div>
                            <span className="font-semibold text-[#0B3326]">Grade {item.grade}</span>
                            <div className="text-[#566861] text-[11px]">
                              Moisture: {item.moisture || 'N/A'}% | Foreign: {item.foreignMatter || 'N/A'}%
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#566861] italic">Not tested</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <InspectionStatusBadge status={item.status} />
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#0B3326] text-xs">
                        {formatINR(item.orderAmount || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {item.status === 'disputed' ? (
                          <button
                            onClick={() => handleOpenArbitration(item)}
                            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            Arbitrate
                          </button>
                        ) : item.arbitration ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md font-semibold border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                          </span>
                        ) : (
                          <span className="text-xs text-[#566861]">Normal Flow</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Arbitration Modal */}
        {selectedDispute && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#E5EDE8] max-h-[90vh] overflow-y-auto text-left">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#0B3326] text-base">Arbitrate Quality Dispute</h3>
                    <p className="text-[11px] text-[#566861]">Inspection #{selectedDispute.id} &bull; Order #{selectedDispute.orderId}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDispute(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1 cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-1.5 text-amber-950">
                  <div className="flex justify-between font-semibold">
                    <span>Commodity:</span>
                    <span>{selectedDispute.cropName} ({selectedDispute.quantity} MT)</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Escrow Locked Value:</span>
                    <span className="text-amber-900 font-bold">{formatINR(selectedDispute.orderAmount || 0)}</span>
                  </div>
                  <div className="pt-2 border-t border-amber-200/60">
                    <span className="font-bold text-amber-900 block mb-0.5">Buyer Discrepancy Note:</span>
                    <p className="italic bg-white p-2 rounded-lg border border-amber-100 text-[#566861]">
                      "{selectedDispute.disputeReason || 'Assay does not meet contract grade specs. Excessive moisture detected.'}"
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmitResolution} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#0B3326] uppercase tracking-wider mb-2">
                      Select Ombudsman Ruling
                    </label>
                    <div className="space-y-2">
                      <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                        resolutionAction === 'partial_refund' ? 'border-[#10B981] bg-[#F2FBF6]' : 'border-[#E5EDE8] hover:bg-[#F8FAF8]'
                      }`}>
                        <input 
                          type="radio" 
                          name="action" 
                          value="partial_refund" 
                          checked={resolutionAction === 'partial_refund'}
                          onChange={(e) => setResolutionAction(e.target.value)}
                          className="mt-0.5"
                        />
                        <div>
                          <div className="text-xs font-bold text-[#0B3326]">Partial Price Discount & Release Remainder</div>
                          <div className="text-[11px] text-[#566861] mt-0.5">
                            Grant buyer a quality discount refund, release remaining escrow to seller.
                          </div>
                        </div>
                      </label>

                      <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                        resolutionAction === 'full_refund' ? 'border-red-500 bg-red-50' : 'border-[#E5EDE8] hover:bg-[#F8FAF8]'
                      }`}>
                        <input 
                          type="radio" 
                          name="action" 
                          value="full_refund" 
                          checked={resolutionAction === 'full_refund'}
                          onChange={(e) => setResolutionAction(e.target.value)}
                          className="mt-0.5"
                        />
                        <div>
                          <div className="text-xs font-bold text-red-900">Reject Consignment & Full Escrow Refund</div>
                          <div className="text-[11px] text-[#566861] mt-0.5">
                            Return 100% of escrow funds back to buyer.
                          </div>
                        </div>
                      </label>

                      <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                        resolutionAction === 'override_release' ? 'border-[#10B981] bg-[#F2FBF6]' : 'border-[#E5EDE8] hover:bg-[#F8FAF8]'
                      }`}>
                        <input 
                          type="radio" 
                          name="action" 
                          value="override_release" 
                          checked={resolutionAction === 'override_release'}
                          onChange={(e) => setResolutionAction(e.target.value)}
                          className="mt-0.5"
                        />
                        <div>
                          <div className="text-xs font-bold text-[#0B3326]">Overrule Dispute & Release 100% to Seller</div>
                          <div className="text-[11px] text-[#566861] mt-0.5">
                            Inspection within acceptable tolerance. Release full escrow to seller.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {resolutionAction === 'partial_refund' && (
                    <div>
                      <label className="block text-xs font-semibold text-[#0B3326] mb-1">
                        Buyer Refund Amount (₹)
                      </label>
                      <input 
                        type="number"
                        max={selectedDispute.orderAmount}
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-[#E5EDE8] rounded-xl text-xs focus:ring-2 focus:ring-[#10B981] focus:outline-none"
                        placeholder="e.g. 25000"
                      />
                      <div className="text-[11px] text-[#566861] mt-1">
                        Seller payout: {formatINR((selectedDispute.orderAmount || 0) - Number(refundAmount || 0))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-[#0B3326] mb-1">
                      Arbitration Findings / Memo
                    </label>
                    <textarea 
                      value={arbitrationNotes}
                      onChange={(e) => setArbitrationNotes(e.target.value)}
                      required
                      rows="2"
                      className="w-full px-3 py-2 border border-[#E5EDE8] rounded-xl text-xs focus:ring-2 focus:ring-[#10B981] focus:outline-none"
                      placeholder="Enter justification based on assay report or bilateral agreement..."
                    />
                  </div>

                  <div className="pt-3 border-t border-[#E5EDE8] flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedDispute(null)}
                      className="px-4 py-2 border border-[#E5EDE8] text-[#566861] rounded-xl text-xs font-semibold hover:bg-[#F8FAF8] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#0B3326] hover:bg-[#07241A] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      Execute Ruling
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
