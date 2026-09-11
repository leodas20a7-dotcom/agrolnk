import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { 
  AlertTriangle, ShieldCheck, CheckCircle2, 
  XCircle, ArrowRight, ArrowLeft, DollarSign, Scale, Filter, Send, Clock, UserCheck, FileCheck, RefreshCw
} from 'lucide-react';
import { getInspectionRecords, arbitrateDispute, sendInspectionReportToBuyer, subscribeToInspections } from '../../utils/inspection';
import { formatINR } from '../../utils/commission';
import InspectionStatusBadge from '../../components/inspection/InspectionStatusBadge';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import { showGlobalLoader, hideGlobalLoader } from '../../context/LoadingContext';

export default function InspectionDisputes({ currentUser, onNavigate }) {
  const user = currentUser || {
    name: 'Platform Admin',
    role: 'admin',
    email: 'admin@agrolnk.com',
  };

  const [inspections, setInspections] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [selectedRequestToInspect, setSelectedRequestToInspect] = useState(null);
  const [resolutionAction, setResolutionAction] = useState('partial_refund');
  const [refundAmount, setRefundAmount] = useState('');
  const [arbitrationNotes, setArbitrationNotes] = useState('');
  const [filter, setFilter] = useState('all'); // all, requested, disputed, passed
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Inspector form states
  const [inspectorName, setInspectorName] = useState('');
  const [assayGrade, setAssayGrade] = useState('A');
  const [assayMoisture, setAssayMoisture] = useState('');
  const [assayForeign, setAssayForeign] = useState('');
  const [inspectionFee, setInspectionFee] = useState('500');
  const [assayNotes, setAssayNotes] = useState('');

  const loadInspections = async (showFlash = false) => {
    setIsLoading(true);
    if (showFlash) {
      showGlobalLoader('Accessing Quality Dispute Desk...', 'Fetching certified assay reports & arbitration cases...');
    }
    try {
      const list = await getInspectionRecords();
      setInspections(list || []);
    } catch (err) {
      console.error('Error loading inspections:', err);
    } finally {
      setIsLoading(false);
      if (showFlash) {
        hideGlobalLoader();
      }
    }
  };

  useEffect(() => {
    loadInspections(true);

    const unsubscribe = subscribeToInspections(() => {
      loadInspections(false);
    });

    const handleLocalUpdate = () => {
      loadInspections(false);
    };
    window.addEventListener('agrolnk_inspections_updated', handleLocalUpdate);
    window.addEventListener('storage', handleLocalUpdate);

    return () => {
      hideGlobalLoader();
      unsubscribe?.();
      window.removeEventListener('agrolnk_inspections_updated', handleLocalUpdate);
      window.removeEventListener('storage', handleLocalUpdate);
    };
  }, []);

  const filteredList = inspections.filter(i => {
    if (filter === 'requested') return i.status === 'requested';
    if (filter === 'disputed') return i.status === 'disputed';
    if (filter === 'passed') return i.status === 'passed' || i.status === 'resolved';
    return true;
  });

  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
  const paginatedInspections = filteredList.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleOpenArbitration = (inspection) => {
    setSelectedDispute(inspection);
    setRefundAmount(inspection.orderAmount ? Math.round(inspection.orderAmount * 0.1) : '');
    setArbitrationNotes('');
    setResolutionAction('partial_refund');
  };

  const handleSubmitResolution = async (e) => {
    e.preventDefault();
    if (!selectedDispute) return;

    await arbitrateDispute(selectedDispute.id, {
      action: resolutionAction,
      refundAmount: resolutionAction === 'partial_refund' ? Number(refundAmount) : (resolutionAction === 'full_refund' ? selectedDispute.orderAmount : 0),
      notes: arbitrationNotes,
      arbitratedBy: 'AgroLnk Platform Ombudsman'
    });

    setSelectedDispute(null);
    loadInspections();
  };

  const handleSendReport = async (e) => {
    e.preventDefault();
    if (!selectedRequestToInspect) return;

    await sendInspectionReportToBuyer(selectedRequestToInspect.id, {
      inspectorName,
      grade: assayGrade,
      moisture: Number(assayMoisture),
      foreignMatter: Number(assayForeign),
      inspectionFee: Number(inspectionFee) || 500,
      inspectorNotes: assayNotes,
      verdict: 'approved',
    });

    setSelectedRequestToInspect(null);
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
                Quality Inspection & Assay Desk
              </h1>
              <span className="bg-amber-100 text-amber-800 text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Scale className="w-3.5 h-3.5" /> Ombudsman & Quality Assays
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#566861]">
              Review buyer inspection requests, dispatch certified assayer reports, and arbitrate escrow releases.
            </p>
          </div>

          {/* Filter Pills & Refresh Button */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={loadInspections}
              disabled={isLoading}
              title="Refresh inspection list"
              className="p-2 rounded-xl border border-[#E5EDE8] bg-white text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#10B981]' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <div className="flex flex-wrap items-center gap-1.5 bg-[#F8FAF8] border border-[#E5EDE8] p-1 rounded-xl">
              <button
                onClick={() => { setFilter('all'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filter === 'all' ? 'bg-[#0B3326] text-white shadow-xs' : 'text-[#566861] hover:text-[#0B3326]'
                }`}
              >
                All ({inspections.length})
              </button>
              <button
                onClick={() => { setFilter('requested'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filter === 'requested' ? 'bg-amber-600 text-white shadow-xs' : 'text-[#566861] hover:text-[#0B3326]'
                }`}
              >
                Requested ({inspections.filter(i => i.status === 'requested').length})
              </button>
              <button
                onClick={() => { setFilter('passed'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filter === 'passed' ? 'bg-emerald-600 text-white shadow-xs' : 'text-[#566861] hover:text-[#0B3326]'
                }`}
              >
                Certified ({inspections.filter(i => i.status === 'passed' || i.status === 'resolved').length})
              </button>
              <button
                onClick={() => { setFilter('disputed'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filter === 'disputed' ? 'bg-red-600 text-white shadow-xs' : 'text-[#566861] hover:text-[#0B3326]'
                }`}
              >
                Disputed ({inspections.filter(i => i.status === 'disputed').length})
              </button>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-amber-500 text-white rounded-xl shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-xs text-amber-950">
            <span className="font-bold block">Pre-Purchase Quality Verification Workflow:</span>
            When a buyer requests inspection before buying, Admin dispatches an official assayer.
            Once the report is sent to the buyer, they verify grade and continue with delivery.
          </div>
        </div>

        {/* Table & Pagination */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E5EDE8] shadow-xs overflow-hidden">
            {filteredList.length === 0 ? (
              <div className="text-center py-12 px-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-[#0B3326]">No inspections pending</p>
                <p className="text-xs text-[#566861] mt-0.5">All quality inspections matching this filter have been processed.</p>
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
                      <th className="py-3.5 px-4">Escrow Value</th>
                      <th className="py-3.5 px-4 text-right">Admin Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EDE8]">
                    {paginatedInspections.map((item) => (
                      <tr key={item.id} className="hover:bg-[#F8FAF8]/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-xs">
                          <span className="font-bold text-[#0B3326]">#{item.id}</span>
                          <div className="text-[#566861] text-[11px] mt-0.5">Order #{item.orderId}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-[#0B3326]">{item.cropName}</span>
                          <div className="text-[11px] text-[#566861]">{item.quantity} MT</div>
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <div className="text-[#0B3326] font-semibold">B: {item.buyerName}</div>
                          <div className="text-[#566861]">S: {item.sellerName}</div>
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          {item.status === 'requested' ? (
                            <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Awaiting Inspector
                            </span>
                          ) : item.grade ? (
                            <div>
                              <span className="font-semibold text-[#0B3326]">Grade {item.grade}</span>
                              <div className="text-[#566861] text-[11px]">
                                Moisture: {item.moisture || '11.0'}% | Foreign: {item.foreignMatter || '0.4'}%
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
                          {item.status === 'requested' ? (
                            <button
                              onClick={() => setSelectedRequestToInspect(item)}
                              className="px-3.5 py-1.5 bg-[#0B3326] hover:bg-[#07241A] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 ml-auto"
                            >
                              <Send className="w-3.5 h-3.5 text-[#34D399]" />
                              Send Inspector & Report
                            </button>
                          ) : item.status === 'disputed' ? (
                            <button
                              onClick={() => handleOpenArbitration(item)}
                              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer ml-auto"
                            >
                              Arbitrate
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md font-semibold border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Certified
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {filteredList.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredList.length}
              pageSize={pageSize}
            />
          )}
        </div>

        {/* Modal: Admin Dispatches Inspector & Sends Assay Report to Buyer */}
        {selectedRequestToInspect && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#E5EDE8] max-h-[90vh] overflow-y-auto text-left space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#EBF5F0] text-[#0B3326] rounded-xl">
                    <FileCheck className="w-5 h-5 text-[#10B981]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#0B3326] text-base">Send Certified Assay Report to Buyer</h3>
                    <p className="text-[11px] text-[#566861]">Order #{selectedRequestToInspect.orderId} &bull; {selectedRequestToInspect.cropName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRequestToInspect(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1 cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSendReport} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-[#0B3326] block mb-1">
                    Assigned Inspector / Assayer Name
                  </label>
                  <input
                    type="text"
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    required
                    placeholder="e.g. Govind (Certified Assayer)"
                    className="w-full px-3 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs focus:ring-2 focus:ring-[#10B981]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="font-bold text-[#0B3326] block mb-1">
                      Assayed Grade
                    </label>
                    <select
                      value={assayGrade}
                      onChange={(e) => setAssayGrade(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-semibold focus:ring-2 focus:ring-[#10B981]"
                    >
                      <option value="A">Grade A (Premium)</option>
                      <option value="B">Grade B (Standard)</option>
                      <option value="C">Grade C (Commercial)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-[#0B3326] block mb-1">
                      Moisture %
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={assayMoisture}
                      onChange={(e) => setAssayMoisture(e.target.value)}
                      required
                      placeholder="e.g. 11.2"
                      className="w-full px-3 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs focus:ring-2 focus:ring-[#10B981]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#0B3326] block mb-1">
                      Foreign Matter %
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={assayForeign}
                      onChange={(e) => setAssayForeign(e.target.value)}
                      required
                      placeholder="e.g. 0.4"
                      className="w-full px-3 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs focus:ring-2 focus:ring-[#10B981]"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[#0B3326] block mb-1">
                    Quality Assay & Lab Inspection Fee (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#566861]">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={inspectionFee}
                      onChange={(e) => setInspectionFee(e.target.value)}
                      required
                      placeholder="500"
                      className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-bold text-[#0B3326] focus:ring-2 focus:ring-[#10B981]"
                    />
                  </div>
                  <p className="text-[10px] text-[#566861] mt-0.5">
                    This fee will be billed to the buyer via Razorpay to unlock and accept the certified assay report.
                  </p>
                </div>

                <div>
                  <label className="font-bold text-[#0B3326] block mb-1">
                    Inspector Lab Notes / Certification
                  </label>
                  <textarea
                    value={assayNotes}
                    onChange={(e) => setAssayNotes(e.target.value)}
                    rows="2"
                    required
                    placeholder="Enter physical assay findings, purity metrics & notes..."
                    className="w-full px-3 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs focus:ring-2 focus:ring-[#10B981]"
                  />
                </div>

                <div className="pt-3 border-t border-[#E5EDE8] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedRequestToInspect(null)}
                    className="px-4 py-2 border border-[#E5EDE8] text-[#566861] rounded-xl text-xs font-semibold hover:bg-[#F8FAF8] cursor-pointer text-center justify-center w-full sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#0B3326] hover:bg-[#07241A] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto"
                  >
                    <Send className="w-3.5 h-3.5 text-[#34D399]" />
                    <span>Send Report to Buyer</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Arbitration Modal */}
        {selectedDispute && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#E5EDE8] max-h-[90vh] overflow-y-auto text-left space-y-4">
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

                  <div className="pt-3 border-t border-[#E5EDE8] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedDispute(null)}
                      className="px-4 py-2 border border-[#E5EDE8] text-[#566861] rounded-xl text-xs font-semibold hover:bg-[#F8FAF8] cursor-pointer text-center justify-center w-full sm:w-auto"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#0B3326] hover:bg-[#07241A] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer text-center justify-center w-full sm:w-auto"
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
