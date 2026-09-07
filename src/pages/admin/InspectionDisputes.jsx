import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, ShieldCheck, RefreshCw, FileText, CheckCircle2, 
  XCircle, ArrowRight, DollarSign, Scale, Eye, Filter, MessageSquare, AlertCircle
} from 'lucide-react';
import { getInspectionRecords, arbitrateDispute } from '../../utils/inspection';
import { formatINR } from '../../utils/commission';
import InspectionStatusBadge from '../../components/inspection/InspectionStatusBadge';

export default function InspectionDisputes() {
  const [inspections, setInspections] = useState([]);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [resolutionAction, setResolutionAction] = useState('full_refund');
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
    setRefundAmount(inspection.orderAmount ? Math.round(inspection.orderAmount * 0.5) : '');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Quality Inspection & Dispute Desk</h1>
            <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Scale className="w-3.5 h-3.5" /> Ombudsman Arbitration
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Review buyer quality assays, moisture disputes, weight discrepancies, and arbitrate escrow releases.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === 'all' ? 'bg-white text-gray-900 shadow-sm font-semibold' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Inspections ({inspections.length})
          </button>
          <button
            onClick={() => setFilter('disputed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === 'disputed' ? 'bg-amber-600 text-white shadow-sm font-semibold' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Active Disputes ({inspections.filter(i => i.status === 'disputed').length})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === 'resolved' ? 'bg-emerald-600 text-white shadow-sm font-semibold' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Arbitrated / Passed ({inspections.filter(i => i.status === 'resolved' || i.status === 'passed').length})
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500 text-white rounded-xl shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-950 text-sm">Escrow Safe-Guard Protocol</h3>
            <p className="text-xs text-amber-800 mt-0.5">
              Escrow funds remain securely frozen until both physical delivery and buyer quality sign-off are verified.
              In case of discrepancy, AgroLnk arbitrates net settlement or returns.
            </p>
          </div>
        </div>
      </div>

      {/* Table List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {disputedList.length === 0 ? (
          <div className="text-center py-16 px-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No inspection disputes pending</p>
            <p className="text-xs text-gray-400 mt-1">All quality inspections are either passed or no active disputes match this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/75 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Inspection / Order</th>
                  <th className="py-3.5 px-4">Commodity & Quantity</th>
                  <th className="py-3.5 px-4">Buyer & Seller</th>
                  <th className="py-3.5 px-4">Quality Assay</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Escrow Locked</th>
                  <th className="py-3.5 px-4 text-right">Arbitration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {disputedList.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-4 font-mono text-xs">
                      <span className="font-bold text-gray-900">#{item.id}</span>
                      <div className="text-gray-400 text-[11px] mt-0.5">Order #{item.orderId}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-semibold text-gray-900">{item.cropName}</span>
                      <div className="text-xs text-gray-500">{item.quantity} MT ({item.verifiedWeight ? `${item.verifiedWeight} MT verified` : 'Pending weighment'})</div>
                    </td>
                    <td className="py-4 px-4 text-xs">
                      <div className="text-gray-900 font-medium">B: {item.buyerName}</div>
                      <div className="text-gray-500">S: {item.sellerName}</div>
                    </td>
                    <td className="py-4 px-4 text-xs">
                      {item.grade ? (
                        <div>
                          <span className="font-medium text-gray-800">Grade {item.grade}</span>
                          <div className="text-gray-500 text-[11px]">
                            Moisture: {item.moisture || 'N/A'}% | Foreign: {item.foreignMatter || 'N/A'}%
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Not tested yet</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <InspectionStatusBadge status={item.status} />
                    </td>
                    <td className="py-4 px-4 font-semibold text-gray-900 text-xs">
                      {formatINR(item.orderAmount || 0)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      {item.status === 'disputed' ? (
                        <button
                          onClick={() => handleOpenArbitration(item)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                        >
                          Arbitrate
                        </button>
                      ) : item.arbitration ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md font-medium border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Succeeded
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Normal Flow</span>
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Arbitrate Inspection Dispute</h3>
                  <p className="text-xs text-gray-500">Inspection #{selectedDispute.id} &bull; Order #{selectedDispute.orderId}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDispute(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Dispute Summary Box */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs space-y-2 text-amber-950">
                <div className="flex justify-between font-semibold">
                  <span>Commodity:</span>
                  <span>{selectedDispute.cropName} ({selectedDispute.quantity} MT)</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Escrow Locked Value:</span>
                  <span className="text-amber-900 font-bold">{formatINR(selectedDispute.orderAmount || 0)}</span>
                </div>
                <div className="pt-2 border-t border-amber-200/60">
                  <span className="font-bold text-amber-900 block mb-1">Buyer Stated Discrepancy:</span>
                  <p className="italic bg-white p-2.5 rounded-lg border border-amber-100 text-gray-700">
                    "{selectedDispute.disputeReason || 'Assay does not meet contract grade specs. Excessive moisture detected.'}"
                  </p>
                </div>
              </div>

              {/* Resolution Form */}
              <form onSubmit={handleSubmitResolution} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Select Binding Arbitration Ruling
                  </label>
                  <div className="space-y-2">
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      resolutionAction === 'partial_refund' ? 'border-primary-500 bg-primary-50/50' : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                      <input 
                        type="radio" 
                        name="action" 
                        value="partial_refund" 
                        checked={resolutionAction === 'partial_refund'}
                        onChange={(e) => setResolutionAction(e.target.value)}
                        className="mt-1"
                      />
                      <div>
                        <div className="text-xs font-bold text-gray-900">Partial Price Discount & Release Remainder</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          Grant buyer a quality discount refund, release remaining escrow to seller minus platform fee.
                        </div>
                      </div>
                    </label>

                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      resolutionAction === 'full_refund' ? 'border-red-500 bg-red-50/50' : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                      <input 
                        type="radio" 
                        name="action" 
                        value="full_refund" 
                        checked={resolutionAction === 'full_refund'}
                        onChange={(e) => setResolutionAction(e.target.value)}
                        className="mt-1"
                      />
                      <div>
                        <div className="text-xs font-bold text-gray-900">Reject Consignment & Full Escrow Refund to Buyer</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          Return 100% of escrow to buyer. Seller may arrange return haulage.
                        </div>
                      </div>
                    </label>

                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      resolutionAction === 'override_release' ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                      <input 
                        type="radio" 
                        name="action" 
                        value="override_release" 
                        checked={resolutionAction === 'override_release'}
                        onChange={(e) => setResolutionAction(e.target.value)}
                        className="mt-1"
                      />
                      <div>
                        <div className="text-xs font-bold text-gray-900">Overrule Dispute & Release 100% Escrow to Seller</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          Inspection deemed within acceptable commercial tolerance. Escrow released to seller.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {resolutionAction === 'partial_refund' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Buyer Refund Amount (₹)
                    </label>
                    <input 
                      type="number"
                      max={selectedDispute.orderAmount}
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      placeholder="e.g. 15000"
                    />
                    <div className="text-[11px] text-gray-500 mt-1">
                      Seller will receive: {formatINR((selectedDispute.orderAmount || 0) - Number(refundAmount || 0))} (less 0.25% fee)
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Ombudsman Arbitration Note / Findings
                  </label>
                  <textarea 
                    value={arbitrationNotes}
                    onChange={(e) => setArbitrationNotes(e.target.value)}
                    required
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    placeholder="Provide justification based on lab testing, moisture tolerance thresholds, or buyer-seller bilateral agreement..."
                  />
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedDispute(null)}
                    className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                  >
                    Execute Binding Ruling
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
