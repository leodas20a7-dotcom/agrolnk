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
  FileText
} from 'lucide-react';
import { getAllKYCUsers, updateKYCStatus } from '../../utils/admin';

export default function UserVerificationQueue({ currentUser, onNavigate }) {
  const user = currentUser || {
    name: 'Platform Admin',
    role: 'admin',
    email: 'admin@agrolnk.com',
  };

  const [kycUsers, setKycUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'verified' | 'all'
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');

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
  }, []);

  const handleApprove = async (userId, userName) => {
    try {
      await updateKYCStatus(userId, 'verified', 'Approved by Admin. All credentials verified.', 'Admin');
      setFeedbackMessage(`✓ Approved ${userName}. Verified badge awarded!`);
      setTimeout(() => setFeedbackMessage(''), 3500);
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
      await loadKYC();
    } catch (err) {
      console.error('Error rejecting user:', err);
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

    return matchesTab && matchesRole && matchesSearch;
  });

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
              Review newly registered participants and approve trading verification badges.
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Tab Filter */}
          <div className="flex items-center gap-1.5 bg-[#F8FAF8] border border-[#E5EDE8] p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-[#566861] hover:text-[#0B3326]'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setActiveTab('verified')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'verified'
                  ? 'bg-[#0B3326] text-white shadow-xs'
                  : 'text-[#566861] hover:text-[#0B3326]'
              }`}
            >
              Verified ({verifiedCount})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#0B3326] text-white shadow-xs'
                  : 'text-[#566861] hover:text-[#0B3326]'
              }`}
            >
              All ({safeUsers.length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#566861] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user, email or entity..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white border border-[#E5EDE8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
            />
          </div>
        </div>

        {/* User Cards Grid */}
        {filteredUsers.length === 0 ? (
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredUsers.map((item) => {
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
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-[#0B3326]">
                            {item.name}
                          </h3>
                          {isVerified && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              ✓ Verified
                            </span>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              Pending
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[#566861] block">
                          {item.orgName || item.email} &bull; <span className="capitalize font-semibold text-[#0B3326]">{item.role}</span>
                        </span>
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-[#566861]">
                      {item.district ? `${item.district}, ${item.state || 'India'}` : 'Registered User'}
                    </div>
                  </div>

                  {/* Submitted Documents Box */}
                  <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs space-y-1.5">
                    <span className="font-bold text-[#0B3326] block text-[11px] uppercase tracking-wider">
                      Submitted Documents & Credentials
                    </span>
                    {item.documents && item.documents.length > 0 ? (
                      <div className="space-y-1">
                        {item.documents.map((doc, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[11px]">
                            <span className="text-[#566861] flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5 text-[#10B981]" />
                              {doc.type}
                            </span>
                            <span className="font-mono font-semibold text-[#0B3326]">
                              {doc.number || 'Submitted'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[#566861] text-[11px] italic">
                        Initial profile created. Awaiting first document submission.
                      </span>
                    )}

                    {item.phone && (
                      <div className="pt-1 border-t border-[#E5EDE8] flex items-center justify-between text-[11px] text-[#566861]">
                        <span>Phone: {item.phone}</span>
                        <span>Email: {item.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons: Simple Approve / Reject */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-[#566861]">
                      Status: <strong className="capitalize text-[#0B3326]">{item.verificationStatus}</strong>
                    </span>

                    <div className="flex items-center gap-2">
                      {isPending ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleReject(item.id, item.name)}
                            className="px-3.5 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold cursor-pointer transition-colors"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApprove(item.id, item.name)}
                            className="px-4 py-1.5 rounded-xl bg-[#0B3326] hover:bg-[#07241A] text-white text-xs font-bold shadow-xs cursor-pointer transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" />
                            Approve & Verify
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleReject(item.id, item.name)}
                          className="px-3 py-1 rounded-lg border border-[#E5EDE8] text-[#566861] hover:text-red-600 hover:bg-red-50 text-xs font-medium cursor-pointer"
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
        )}

      </div>
    </DashboardLayout>
  );
}
