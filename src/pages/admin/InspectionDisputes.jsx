import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { 
  AlertTriangle, ShieldCheck, CheckCircle2, 
  XCircle, ArrowRight, ArrowLeft, DollarSign, Scale, Filter, Send, Clock, UserCheck, FileCheck, RefreshCw, Info
} from 'lucide-react';
import { getInspectionRecords, arbitrateDispute, sendInspectionReportToBuyer, subscribeToInspections } from '../../utils/inspection';
import { formatINR } from '../../utils/commission';
import InspectionStatusBadge from '../../components/inspection/InspectionStatusBadge';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import CopyButton from '../../components/ui/CopyButton';
import { showGlobalLoader, hideGlobalLoader } from '../../context/LoadingContext';
import { toast } from '../../context/ToastContext';

const formatShortId = (id) => {
  if (!id) return '';
  if (id.startsWith('insp_')) {
    return `#INSP-${id.slice(-6).toUpperCase()}`;
  }
  return `#${id.slice(0, 8).toUpperCase()}`;
};

export default function InspectionDisputes({ currentUser, onNavigate }) {
  const user = currentUser || {};

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

    try {
      await arbitrateDispute(selectedDispute.id, {
        action: resolutionAction,
        refundAmount: resolutionAction === 'partial_refund' ? Number(refundAmount) : (resolutionAction === 'full_refund' ? selectedDispute.orderAmount : 0),
        notes: arbitrationNotes,
        arbitratedBy: 'AgroLnk Platform Ombudsman'
      });

      toast.success('Dispute arbitrated and escrow ruling recorded successfully!');
      setSelectedDispute(null);
      loadInspections();
    } catch (err) {
      console.error('Failed to arbitrate dispute:', err);
      toast.error(err?.message || 'Failed to submit arbitration ruling.');
    }
  };

  const handleSendReport = async (e) => {
    e.preventDefault();
    if (!selectedRequestToInspect) return;

    try {
      await sendInspectionReportToBuyer(selectedRequestToInspect.id, {
        inspectorName,
        grade: assayGrade,
        moisture: Number(assayMoisture),
        foreignMatter: Number(assayForeign),
        inspectionFee: Number(inspectionFee) || 500,
        inspectorNotes: assayNotes,
        verdict: 'approved',
      });

      toast.success('Inspection report and assay grade delivered to buyer!');
      setSelectedRequestToInspect(null);
      loadInspections();
    } catch (err) {
      console.error('Failed to send inspection report:', err);
      toast.error(err?.message || 'Failed to send inspection report.');
    }
  };

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-6 text-left max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('admin-dashboard')}
              title="Return to Dashboard"
              aria-label="Back to Dashboard"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white border border-[#E5EDE8] shadow-2xs hover:bg-[#F8FAF8] text-[#0B3326] flex items-center justify-center shrink-0 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <ArrowLeft className="w-5 h-5 text-[#0B3326]" />
            </button>
            <div className="space-y-0.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#0B3326] font-heading tracking-tight">
                  Quality & Assay Desk
                </h1>
                <span className="bg-[#EBF5F0] text-[#0B3326] border border-[#A7F3D0] text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" /> Verified Lab Assays
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#566861] hidden sm:block">
                Manage pre-purchase quality checks, dispatch certified assayers, and arbitrate dispute cases.
              </p>
            </div>
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

        {/* At-a-Glance KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white border border-[#E5EDE8] rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#566861] uppercase tracking-wider">Awaiting Assayer</p>
              <p className="text-2xl font-extrabold text-amber-600 font-heading mt-0.5">
                {inspections.filter(i => i.status === 'requested').length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-[#E5EDE8] rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#566861] uppercase tracking-wider">Assays Certified</p>
              <p className="text-2xl font-extrabold text-emerald-700 font-heading mt-0.5">
                {inspections.filter(i => i.status === 'passed' || i.status === 'resolved').length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-[#E5EDE8] rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#566861] uppercase tracking-wider">Active Disputes</p>
              <p className="text-2xl font-extrabold text-red-600 font-heading mt-0.5">
                {inspections.filter(i => i.status === 'disputed').length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Discreet Workflow Hint */}
        <div className="bg-[#F8FAF8] border border-[#E5EDE8] rounded-xl px-4 py-2.5 flex items-center gap-2.5 text-xs text-[#566861]">
          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px] shrink-0">i</span>
          <span>
            <strong className="text-[#0B3326]">Workflow:</strong> When a buyer requests a quality check before purchase, dispatch an official assayer. Once certified, the buyer verifies grade and unlocks escrow checkout.
          </span>
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
                      <th className="py-3.5 px-4">Produce & Reference</th>
                      <th className="py-3.5 px-4">Parties</th>
                      <th className="py-3.5 px-4">Lot Value</th>
                      <th className="py-3.5 px-4">Assay Status</th>
                      <th className="py-3.5 px-4 text-right">Admin Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EDE8]">
                    {paginatedInspections.map((item) => (
                      <tr key={item.id} className="hover:bg-[#F8FAF8]/60 transition-colors">
                        {/* 1. Produce & Reference */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#0B3326] text-sm flex items-center gap-2">
                            <span>{item.cropName || 'Produce Lot'}</span>
                            <span className="text-[11px] font-semibold text-[#0B3326] bg-[#F2FBF6] px-2 py-0.5 rounded-full border border-[#A7F3D0]">
                              {item.quantity} MT
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#566861]">
                            <span className="font-mono font-semibold text-[#0B3326]" title={`Full ID: ${item.id}`}>
                              {formatShortId(item.id)}
                            </span>
                            <CopyButton text={item.id} title="Copy inspection ID" className="text-[#566861] hover:text-[#0B3326]" />
                            {item.orderId && (
                              <span className="text-[#566861]/70 truncate max-w-[120px]" title={`Order ID: ${item.orderId}`}>
                                &bull; Ord #{item.orderId.slice(0, 8)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. Parties */}
                        <td className="py-3.5 px-4 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-[#0B3326]">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                                Buyer
                              </span>
                              <span className="font-semibold truncate max-w-[180px]">{item.buyerName || 'Verified Buyer'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-[#566861]">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                                Farmer
                              </span>
                              <span className="truncate max-w-[180px]" title={item.sellerName}>{item.sellerName || 'Verified Farmer'}</span>
                            </div>
                          </div>
                        </td>

                        {/* 3. Lot Value */}
                        <td className="py-3.5 px-4 font-bold text-[#0B3326] text-sm whitespace-nowrap">
                          {formatINR(item.orderAmount || 0)}
                        </td>

                        {/* 4. Assay Status */}
                        <td className="py-3.5 px-4 text-xs">
                          {item.status === 'requested' ? (
                            <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-bold">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Awaiting Assayer</span>
                            </div>
                          ) : item.status === 'disputed' ? (
                            <div className="inline-flex items-center gap-1.5 bg-red-50 text-red-800 border border-red-200 px-2.5 py-1 rounded-full text-xs font-bold">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                              <span>Disputed Quality</span>
                            </div>
                          ) : item.grade ? (
                            <div>
                              <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Grade {item.grade} Certified</span>
                              </div>
                              <div className="text-[11px] text-[#566861] mt-1">
                                Moisture: {item.moisture || '11.0'}% &bull; Foreign: {item.foreignMatter || '0.4'}%
                              </div>
                            </div>
                          ) : (
                            <InspectionStatusBadge status={item.status} />
                          )}
                        </td>

                        {/* 5. Admin Action */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {item.status === 'requested' ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => setSelectedRequestToInspect(item)}
                              icon={FileCheck}
                              iconPosition="left"
                              className="text-xs font-bold py-1.5 px-3.5 ml-auto"
                            >
                              Dispatch Assayer
                            </Button>
                          ) : item.status === 'disputed' ? (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleOpenArbitration(item)}
                              className="text-xs font-bold py-1.5 px-3.5 ml-auto"
                            >
                              Arbitrate
                            </Button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-bold border border-emerald-200">
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
                    <p className="text-[11px] text-[#566861]">
                      {selectedRequestToInspect.cropName} &bull; {selectedRequestToInspect.quantity} MT &bull; {formatShortId(selectedRequestToInspect.id)}
                    </p>
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
