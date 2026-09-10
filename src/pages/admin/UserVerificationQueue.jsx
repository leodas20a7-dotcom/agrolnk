import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import {
  UserCheck,
  Search,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  User,
  Building2,
  Truck,
  Landmark,
  FileText,
  Eye,
  X,
  ExternalLink,
  Download,
  LayoutGrid,
  List,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CalendarDays,
  Filter
} from 'lucide-react';
import { getAllKYCUsers, updateKYCStatus } from '../../utils/admin';
import DocumentViewerModal from '../../components/admin/DocumentViewerModal';
import Pagination from '../../components/ui/Pagination';

export default function UserVerificationQueue({ currentUser, onNavigate }) {
  const user = currentUser || {
    name: 'Platform Admin',
    role: 'admin',
    email: 'admin@agrolnk.com',
  };

  const [kycUsers, setKycUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'verified' | 'all'
  const [roleFilter, setRoleFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'week' | 'month' | 'custom'
  const [customDate, setCustomDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('agrolnk_admin_kyc_viewmode') || 'rows';
    } catch {
      return 'rows';
    }
  }); // default: 'rows'
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [selectedUserForDocs, setSelectedUserForDocs] = useState(null);
  const [inspectingDoc, setInspectingDoc] = useState(null); // { doc, user }

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('agrolnk_admin_kyc_viewmode', mode);
    } catch {}
  };

  const loadKYC = async () => {
    try {
      const data = await getAllKYCUsers();
      setKycUsers(data || []);
    } catch (err) {
      console.error('Failed to load KYC users:', err);
    }
  };

  useEffect(() => {
    loadKYC();

    const handleUpdate = () => {
      loadKYC();
    };

    window.addEventListener('agrolnk_kyc_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('agrolnk_kyc_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const handleApprove = async (userId, userName) => {
    try {
      await updateKYCStatus(userId, 'verified', 'Approved by Admin. All credentials verified.', 'Admin');
      setFeedbackMessage(`✓ Approved ${userName}. Verified badge awarded!`);
      setTimeout(() => setFeedbackMessage(''), 3500);
      setSelectedUserForDocs(null);
      await loadKYC();
    } catch (err) {
      console.error('Error approving user:', err);
    }
  };

  const handleReject = async (userId, userName) => {
    try {
      await updateKYCStatus(userId, 'rejected', 'Documents incomplete or mismatched.', 'Admin');
      setFeedbackMessage(`Rejected ${userName}.`);
      setTimeout(() => setFeedbackMessage(''), 3500);
      setSelectedUserForDocs(null);
      await loadKYC();
    } catch (err) {
      console.error('Error rejecting user:', err);
    }
  };

  const formatRequestDateTime = (dateStr) => {
    if (!dateStr) return '09 Sep 2026, 10:45 AM';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '09 Sep 2026, 10:45 AM';
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '09 Sep 2026, 10:45 AM';
    }
  };

  const safeUsers = Array.isArray(kycUsers) ? kycUsers : [];

  const pendingCount = safeUsers.filter((u) => u.verificationStatus === 'pending' || u.verificationStatus === 'action_required').length;
  const verifiedCount = safeUsers.filter((u) => u.verificationStatus === 'verified').length;

  const filteredUsers = safeUsers.filter((item) => {
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'pending' && (item.verificationStatus === 'pending' || item.verificationStatus === 'action_required')) ||
      (activeTab === 'verified' && item.verificationStatus === 'verified');

    const matchesRole = roleFilter === 'all' || item.role === roleFilter;

    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.orgName && item.orgName.toLowerCase().includes(searchQuery.toLowerCase()));

    // Date Filter Logic
    const matchesDate = (() => {
      if (dateFilter === 'all') return true;
      const userDate = new Date(item.submittedAt || item.created_at || item.createdAt || 0);
      if (isNaN(userDate.getTime())) return true;
      const now = new Date();
      if (dateFilter === 'today') {
        return userDate.toDateString() === now.toDateString();
      }
      if (dateFilter === 'week') {
        const pastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return userDate >= pastWeek;
      }
      if (dateFilter === 'month') {
        const pastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return userDate >= pastMonth;
      }
      if (dateFilter === 'custom' && customDate) {
        return userDate.toISOString().slice(0, 10) === customDate;
      }
      return true;
    })();

    return matchesTab && matchesRole && matchesSearch && matchesDate;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const timeA = new Date(a.submittedAt || a.created_at || a.createdAt || a.updated_at || 0).getTime();
    const timeB = new Date(b.submittedAt || b.created_at || b.createdAt || b.updated_at || 0).getTime();
    return timeB - timeA;
  });

  const totalPages = Math.ceil(sortedUsers.length / pageSize) || 1;
  const paginatedUsers = sortedUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getRoleIcon = (role) => {
    switch (role) {
      case 'farmer': return User;
      case 'buyer': return Building2;
      case 'transporter': return Truck;
      case 'warehouse': return Building2;
      case 'financier': return Landmark;
      default: return User;
    }
  };

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-6 text-left max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <button
              onClick={() => onNavigate('admin-dashboard')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#566861] hover:text-[#0B3326] transition-colors mb-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0B3326] font-heading">
                User KYC & Verification
              </h1>
              {pendingCount > 0 && (
                <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                  {pendingCount} Pending Review
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#566861]">
              Review newly registered participants, inspect credentials, and approve verified badges.
            </p>
          </div>

          {/* Feedback Toast */}
          {feedbackMessage && (
            <div className="p-3 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{feedbackMessage}</span>
            </div>
          )}
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Left: Tab Filter & Date Filter */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Tab Filter */}
            <div className="flex flex-wrap items-center gap-1.5 bg-[#F8FAF8] border border-[#E5EDE8] p-1 rounded-xl">
              <button
                onClick={() => { setActiveTab('pending'); setCurrentPage(1); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'pending'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-[#566861] hover:text-[#0B3326]'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => { setActiveTab('verified'); setCurrentPage(1); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'verified'
                    ? 'bg-[#0B3326] text-white shadow-xs'
                    : 'text-[#566861] hover:text-[#0B3326]'
                }`}
              >
                Verified ({verifiedCount})
              </button>
              <button
                onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-[#0B3326] text-white shadow-xs'
                    : 'text-[#566861] hover:text-[#0B3326]'
                }`}
              >
                All ({safeUsers.length})
              </button>
            </div>

            {/* Date Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#F8FAF8] border border-[#E5EDE8] p-1 rounded-xl">
              <div className="flex items-center gap-1 pl-2 pr-1 text-[#566861]">
                <Calendar className="w-3.5 h-3.5 text-[#10B981]" />
                <span className="text-[11px] font-bold text-[#0B3326] hidden sm:inline">Date:</span>
              </div>
              <select
                value={dateFilter}
                onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
                className="bg-white border border-[#E5EDE8] text-xs font-semibold text-[#0B3326] rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#10B981] cursor-pointer"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="week">Past 7 Days</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Date</option>
              </select>

              {dateFilter === 'custom' && (
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => { setCustomDate(e.target.value); setCurrentPage(1); }}
                  className="bg-white border border-[#E5EDE8] text-xs font-semibold text-[#0B3326] rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#10B981] cursor-pointer"
                />
              )}
            </div>
          </div>

          {/* Right Controls: View Mode Switch & Search */}
          <div className="flex items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end">
            {/* View Switch: Grid vs Rows */}
            <div className="flex items-center bg-[#F8FAF8] border border-[#E5EDE8] p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => handleSetViewMode('grid')}
                title="Grid View (2-Column Cards)"
                className={`p-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#0B3326] shadow-2xs font-bold border border-[#E5EDE8]'
                    : 'text-[#566861] hover:text-[#0B3326]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="text-[11px]">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetViewMode('rows')}
                title="Row-wise List View (Full Width Rows)"
                className={`p-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'rows'
                    ? 'bg-white text-[#0B3326] shadow-2xs font-bold border border-[#E5EDE8]'
                    : 'text-[#566861] hover:text-[#0B3326]'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="text-[11px]">Rows</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 lg:w-64">
              <Search className="w-4 h-4 text-[#566861] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search user, email or entity..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white border border-[#E5EDE8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              />
            </div>
          </div>
        </div>

        {/* Content Display: Empty State OR (Grid Mode vs Row Mode) */}
        {sortedUsers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5EDE8] p-12 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-bold text-[#0B3326]">
              No {activeTab} users found
            </h4>
            <p className="text-xs text-[#566861]">
              All participants matching this filter have been processed.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {viewMode === 'grid' ? (
              /* ================= GRID VIEW ================= */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedUsers.map((item) => {
                  const RoleIcon = getRoleIcon(item.role);
                  const isVerified = item.verificationStatus === 'verified';
                  const isPending = item.verificationStatus === 'pending' || item.verificationStatus === 'action_required';

                  return (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs space-y-4 hover:border-[#10B981]/40 transition-colors"
                    >
                      {/* Top: Avatar, Name, Role & Status Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center font-bold text-sm shrink-0">
                            {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-bold text-[#0B3326]">
                                {item.name}
                              </h3>
                              {item.pendingChanges ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 animate-pulse">
                                  ⚡ Revision Request
                                </span>
                              ) : isVerified ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  ✓ Verified
                                </span>
                              ) : isPending ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                  Pending
                                </span>
                              ) : null}
                            </div>
                            <span className="text-xs text-[#566861] block">
                              {item.orgName || item.email} &bull; <span className="capitalize font-semibold text-[#0B3326]">{item.role}</span>
                            </span>
                          </div>
                        </div>

                        <div className="text-right space-y-0.5">
                          <span className="text-[11px] font-medium text-[#0B3326] flex items-center justify-end gap-1">
                            <Clock className="w-3 h-3 text-[#10B981]" />
                            {formatRequestDateTime(item.submittedAt || item.created_at)}
                          </span>
                          <span className="text-[10px] text-[#566861] block">
                            {item.district ? `${item.district}, ${item.state || 'India'}` : 'Registered User'}
                          </span>
                        </div>
                      </div>

                      {/* Submitted Documents Box with Direct "View Document" button */}
                      <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#0B3326] text-[11px] uppercase tracking-wider">
                            Submitted Documents
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedUserForDocs(item)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#10B981] hover:text-[#0B3326] hover:underline cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Details
                          </button>
                        </div>

                        {item.documents && item.documents.length > 0 ? (
                          <div className="space-y-1.5">
                            {item.documents.map((doc, idx) => (
                              <div 
                                key={idx} 
                                onClick={() => setInspectingDoc({ doc, user: item })}
                                className="flex items-center justify-between text-[11px] bg-white p-2 rounded-lg border border-[#E5EDE8] hover:border-[#10B981] hover:bg-[#F2FBF6] transition-all cursor-pointer group"
                              >
                                <span className="text-[#566861] group-hover:text-[#0B3326] flex items-center gap-1.5 font-medium">
                                  <FileText className="w-3.5 h-3.5 text-[#10B981]" />
                                  {doc.type}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-semibold text-[#0B3326]">
                                    {doc.number || 'Submitted'}
                                  </span>
                                  <span
                                    className="p-1 text-[#566861] group-hover:text-[#10B981] rounded"
                                    title="Inspect Document"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-[#566861] italic">No document numbers uploaded</span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#E5EDE8]">
                        <button
                          type="button"
                          onClick={() => setSelectedUserForDocs(item)}
                          className="text-xs font-semibold text-[#566861] hover:text-[#0B3326] flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#10B981]" /> Full Dossier
                        </button>

                        <div className="flex items-center gap-2">
                          {isPending ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleReject(item.id, item.name)}
                                className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold cursor-pointer transition-colors"
                              >
                                Reject
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApprove(item.id, item.name)}
                                className="px-3.5 py-1.5 rounded-lg bg-[#0B3326] hover:bg-[#07241A] text-white text-xs font-bold shadow-2xs cursor-pointer transition-colors flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" />
                                <span>Approve</span>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleReject(item.id, item.name)}
                              className="px-3 py-1.5 rounded-lg border border-[#E5EDE8] text-[#566861] hover:text-red-600 hover:bg-red-50 text-xs font-medium cursor-pointer"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ================= ROW-WISE / LIST VIEW ================= */
              <div className="space-y-3">
                {paginatedUsers.map((item) => {
                  const RoleIcon = getRoleIcon(item.role);
                  const isVerified = item.verificationStatus === 'verified';
                  const isPending = item.verificationStatus === 'pending' || item.verificationStatus === 'action_required';

                  return (
                    <div
                      key={item.id}
                      className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs hover:border-[#10B981]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      {/* Left: User Identity & Details */}
                      <div className="flex items-start sm:items-center gap-3.5 min-w-[240px]">
                        <div className="w-11 h-11 rounded-2xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center font-extrabold text-base shrink-0 shadow-2xs">
                          {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-[#0B3326]">
                              {item.name}
                            </h3>
                            {item.pendingChanges ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 animate-pulse">
                                ⚡ Revision Request
                              </span>
                            ) : isVerified ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                ✓ Verified
                              </span>
                            ) : isPending ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                Pending
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs text-[#566861] flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-[#0B3326]">{item.orgName || item.email}</span>
                            <span>&bull;</span>
                            <span className="capitalize font-medium text-[#10B981] bg-[#EBF5F0] px-2 py-0.5 rounded-md text-[11px]">{item.role}</span>
                            <span>&bull;</span>
                            <span className="text-[11px] text-[#566861] flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3 text-[#10B981]" />
                              {formatRequestDateTime(item.submittedAt || item.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Quick Actions */}
                      <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E5EDE8] shrink-0 justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedUserForDocs(item)}
                          className="px-3.5 py-2 rounded-xl bg-white border border-[#E5EDE8] hover:bg-[#F8FAF8] text-[#566861] hover:text-[#0B3326] text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#10B981]" />
                          <span>Details</span>
                        </button>

                        {isPending ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleReject(item.id, item.name)}
                              className="px-3.5 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold cursor-pointer transition-colors"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApprove(item.id, item.name)}
                              className="px-4 py-2 rounded-xl bg-[#0B3326] hover:bg-[#07241A] text-white text-xs font-bold shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" />
                              <span>Approve</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleReject(item.id, item.name)}
                            className="px-3 py-1.5 rounded-lg border border-[#E5EDE8] text-[#566861] hover:text-red-600 hover:bg-red-50 text-xs font-medium cursor-pointer"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={sortedUsers.length}
              pageSize={pageSize}
            />
          </div>
        )}

        {/* Document Inspection & Verification Preview Modal */}
        {selectedUserForDocs && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#E5EDE8] max-h-[90vh] overflow-y-auto text-left space-y-5">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center font-bold">
                    {selectedUserForDocs.name ? selectedUserForDocs.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0B3326]">
                      {selectedUserForDocs.name}
                    </h3>
                    <p className="text-xs text-[#566861] capitalize">
                      {selectedUserForDocs.role} &bull; {selectedUserForDocs.orgName || selectedUserForDocs.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUserForDocs(null)}
                  className="p-1 rounded-xl text-[#566861] hover:text-[#0B3326] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Details */}
              <div className="grid grid-cols-2 gap-3 text-xs p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8]">
                <div>
                  <span className="text-[#566861] block text-[11px]">Contact Phone</span>
                  <span className="font-semibold text-[#0B3326]">{selectedUserForDocs.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[#566861] block text-[11px]">Email</span>
                  <span className="font-semibold text-[#0B3326]">{selectedUserForDocs.email}</span>
                </div>
                <div>
                  <span className="text-[#566861] block text-[11px]">Location</span>
                  <span className="font-semibold text-[#0B3326]">
                    {selectedUserForDocs.district ? `${selectedUserForDocs.district}, ${selectedUserForDocs.state || 'India'}` : 'Tamil Nadu'}
                  </span>
                </div>
                <div>
                  <span className="text-[#566861] block text-[11px]">Verification Status</span>
                  <span className="font-bold capitalize text-[#0B3326]">
                    {selectedUserForDocs.hasPendingReview ? 'Revision Under Review' : selectedUserForDocs.verificationStatus}
                  </span>
                </div>
              </div>

              {/* Facility Revision Request Diff Box (If warehouse operator edited protected fields) */}
              {selectedUserForDocs.pendingChanges && (
                <div className="p-4 rounded-2xl bg-[#EFF6FF] border-2 border-[#3B82F6]/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1E3A8A] flex items-center gap-1.5 uppercase tracking-wide">
                      <Clock className="w-4 h-4 text-[#2563EB]" />
                      Requested Protected Facility Revisions
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#1E40AF] text-[10px] font-extrabold uppercase">
                      Admin Review Required
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs bg-white p-3 rounded-xl border border-[#BFDBFE]">
                    <div className="space-y-0.5">
                      <span className="text-[11px] text-[#566861] block font-medium">Storage Capacity (Tonnes)</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[#566861] line-through text-[11px]">{selectedUserForDocs.orgCapacity || '2,000'} T (Live)</span>
                        <span className="font-extrabold text-[#2563EB]">➔ {selectedUserForDocs.pendingChanges.totalCapacityTonnes} T</span>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[11px] text-[#566861] block font-medium">WDRA License / Reg No.</span>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-[#2563EB]">{selectedUserForDocs.pendingChanges.wdraCode || 'Updated License'}</span>
                      </div>
                    </div>

                    <div className="space-y-0.5 sm:col-span-2 pt-1 border-t border-[#E5EDE8]">
                      <span className="text-[11px] text-[#566861] block font-medium">Enterprise Legal Name</span>
                      <span className="font-bold text-[#0B3326]">{selectedUserForDocs.pendingChanges.companyName || selectedUserForDocs.orgName}</span>
                    </div>

                    {selectedUserForDocs.pendingChanges.storageTypes && selectedUserForDocs.pendingChanges.storageTypes.length > 0 && (
                      <div className="space-y-1 sm:col-span-2 pt-1 border-t border-[#E5EDE8]">
                        <span className="text-[11px] text-[#566861] block font-medium">Requested Chamber Telemetry</span>
                        <div className="flex flex-wrap gap-1">
                          {selectedUserForDocs.pendingChanges.storageTypes.map((st, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#1E293B] text-[10px] font-semibold">
                              {st.name}: {st.capacity}T ({st.temp})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-[#1E40AF] leading-relaxed">
                    💡 Approving will update the live capacity and accreditation documents visible across the Agrolnk marketplace.
                  </p>
                </div>
              )}

              {/* Submitted Credentials & Certificate Previews */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#0B3326] uppercase tracking-wider">
                  Submitted Credentials & Document Files (PDF / Image)
                </h4>

                {selectedUserForDocs.documents && selectedUserForDocs.documents.length > 0 ? (
                  <div className="space-y-3">
                    {selectedUserForDocs.documents.map((doc, idx) => {
                      const isPdf = doc.fileName?.toLowerCase().endsWith('.pdf') || doc.format === 'PDF' || !doc.format;
                      const displayFileName = doc.fileName || `${doc.type.toLowerCase().replace(/[^a-z0-9]/g, '_')}_verified.pdf`;

                      return (
                        <div key={idx} className="p-4 rounded-2xl border border-[#E5EDE8] bg-white space-y-3 shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-[#0B3326] flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg text-white font-bold text-[10px] ${isPdf ? 'bg-red-600' : 'bg-blue-600'}`}>
                                {isPdf ? 'PDF' : 'IMG'}
                              </div>
                              <span>{doc.type}</span>
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {doc.fileSize || '1.8 MB'}
                            </span>
                          </div>

                          {/* Document Preview & Inspect Action Banner */}
                          <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="space-y-0.5 text-xs min-w-0 flex-1">
                              <span className="font-bold text-[#0B3326] block truncate">
                                📄 {displayFileName}
                              </span>
                              <span className="text-[11px] text-[#566861] font-mono block">
                                ID No: <strong>{doc.number}</strong>
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setInspectingDoc({ doc, user: selectedUserForDocs })}
                              className="px-3.5 py-2 rounded-xl bg-[#0B3326] hover:bg-[#07241A] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors w-full sm:w-auto shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#34D399]" />
                              <span>View & Inspect</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-center text-xs text-[#566861]">
                    No documents uploaded yet.
                  </div>
                )}
              </div>

              {/* Action Buttons inside Modal */}
              <div className="pt-3 border-t border-[#E5EDE8] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUserForDocs(null)}
                  className="text-xs justify-center w-full sm:w-auto"
                >
                  Close
                </Button>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleReject(selectedUserForDocs.id, selectedUserForDocs.name)}
                    className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold cursor-pointer text-center justify-center w-full sm:w-auto"
                  >
                    {selectedUserForDocs.pendingChanges ? 'Reject Revision' : 'Reject'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(selectedUserForDocs.id, selectedUserForDocs.name)}
                    className="px-5 py-2.5 rounded-xl bg-[#0B3326] hover:bg-[#07241A] text-white text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
                    <span>{selectedUserForDocs.pendingChanges ? 'Approve & Apply Revision' : 'Approve & Issue Badge'}</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* High-Definition Verifiable Document Inspector Modal */}
        {inspectingDoc && (
          <DocumentViewerModal
            isOpen={!!inspectingDoc}
            onClose={() => setInspectingDoc(null)}
            document={inspectingDoc.doc}
            user={inspectingDoc.user}
            onApprove={() => handleApprove(inspectingDoc.user.id, inspectingDoc.user.name)}
            onReject={() => handleReject(inspectingDoc.user.id, inspectingDoc.user.name)}
          />
        )}

      </div>
    </DashboardLayout>
  );
}
