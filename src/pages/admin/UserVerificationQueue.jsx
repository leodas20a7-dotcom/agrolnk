import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import KYCVerificationModal from '../../components/admin/KYCVerificationModal';
import {
  UserCheck,
  Search,
  Filter,
  ArrowLeft,
  FileText,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  User,
  Building2,
  Truck,
  Landmark
} from 'lucide-react';
import { getAllKYCUsers } from '../../utils/admin';

export default function UserVerificationQueue({ currentUser, onNavigate }) {
  const user = currentUser || {
    name: 'AgroLnk Operations Board',
    role: 'admin',
    email: 'admin@agrolnk.com',
  };

  const [kycUsers, setKycUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'verified' | 'all' | 'rejected'
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserForModal, setSelectedUserForModal] = useState(null);

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

  const safeUsers = Array.isArray(kycUsers) ? kycUsers : [];

  const tabs = [
    { id: 'pending', label: 'Pending Approval', count: safeUsers.filter((u) => u.verificationStatus === 'pending' || u.verificationStatus === 'action_required').length },
    { id: 'verified', label: 'Verified Active', count: safeUsers.filter((u) => u.verificationStatus === 'verified').length },
    { id: 'rejected', label: 'Rejected', count: safeUsers.filter((u) => u.verificationStatus === 'rejected').length },
    { id: 'all', label: 'All Participants', count: safeUsers.length },
  ];

  const filteredUsers = safeUsers.filter((item) => {
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'pending' && (item.verificationStatus === 'pending' || item.verificationStatus === 'action_required')) ||
      item.verificationStatus === activeTab;

    const matchesRole = roleFilter === 'all' || item.role === roleFilter;

    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.orgName && item.orgName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.district && item.district.toLowerCase().includes(searchQuery.toLowerCase()));

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
      <div className="space-y-8 text-left">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <button
              onClick={() => onNavigate('admin-dashboard')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#566861] hover:text-[#0B3326] transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Operations Dashboard
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              Participant KYC Verification Queue
            </h1>
            <p className="text-xs sm:text-sm text-[#566861]">
              Mandatory identity & business credential inspection before users can access exchange trading features.
            </p>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 w-full sm:w-auto">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? 'bg-[#0B3326] text-white shadow-xs'
                      : 'bg-white text-[#566861] hover:bg-[#F2FBF6] hover:text-[#0B3326] border border-[#E5EDE8]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-[#10B981] text-white' : 'bg-[#F8FAF8] text-[#566861]'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Role Filter */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white border border-[#E5EDE8] text-xs font-semibold text-[#14211D] focus:ring-2 focus:ring-[#10B981]"
            >
              <option value="all">All Roles (5 Pillars)</option>
              <option value="farmer">Farmer / Producer</option>
              <option value="buyer">Wholesale Buyer</option>
              <option value="transporter">Logistics Transporter</option>
              <option value="warehouse">Cold Storage Warehouse</option>
              <option value="financier">Financial Institution</option>
            </select>

            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-[#566861] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, GSTIN..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-[#E5EDE8] text-xs text-[#14211D] focus:ring-2 focus:ring-[#10B981] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Verification Cards Grid */}
        {filteredUsers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredUsers.map((item) => {
              const RoleIcon = getRoleIcon(item.role);

              return (
                <Card
                  key={item.id}
                  hoverEffect
                  className="p-5 bg-white border border-[#E5EDE8] shadow-xs space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center shrink-0">
                          <RoleIcon className="w-4 h-4 text-[#10B981]" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#0B3326]">
                            {item.name}
                          </h4>
                          <span className="text-[11px] text-[#566861] capitalize">
                            {item.role} • {item.district || item.state}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant={
                          item.verificationStatus === 'verified'
                            ? 'emerald'
                            : item.verificationStatus === 'rejected'
                            ? 'dark'
                            : 'amber'
                        }
                        size="sm"
                        dot={item.verificationStatus === 'pending'}
                      >
                        <span className="capitalize">{item.verificationStatus}</span>
                      </Badge>
                    </div>

                    <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[#566861]">
                        <span>Organization:</span>
                        <span className="font-bold text-[#14211D] truncate max-w-[140px]">
                          {item.orgName || 'Individual Producer'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[#566861]">
                        <span>Credentials:</span>
                        <span className="font-semibold text-[#0B3326]">
                          {(item.documents || []).length} Verified IDs
                        </span>
                      </div>
                    </div>

                    {item.auditNotes && (
                      <p className="text-[11px] text-[#566861] italic line-clamp-2">
                        "{item.auditNotes}"
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#E5EDE8] flex items-center justify-between">
                    <span className="text-[10px] text-[#566861]">
                      {new Date(item.submittedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </span>

                    <Button
                      variant={item.verificationStatus === 'pending' ? 'accent' : 'secondary'}
                      size="sm"
                      onClick={() => setSelectedUserForModal(item)}
                      icon={UserCheck}
                      iconPosition="left"
                      className="text-xs font-bold py-1.5"
                    >
                      {item.verificationStatus === 'pending' ? 'Review & Approve' : 'Inspect Dossier'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 text-center border-2 border-dashed border-[#E5EDE8] rounded-3xl space-y-2">
            <UserCheck className="w-8 h-8 text-[#10B981] mx-auto" />
            <h4 className="text-sm font-bold text-[#0B3326]">No participants found</h4>
            <p className="text-xs text-[#566861]">
              No user records match the selected status or role filter.
            </p>
          </Card>
        )}

      </div>

      {/* KYC Inspection Modal */}
      {selectedUserForModal && (
        <KYCVerificationModal
          user={selectedUserForModal}
          isOpen={!!selectedUserForModal}
          onClose={() => setSelectedUserForModal(null)}
          onStatusUpdated={() => loadKYC()}
        />
      )}
    </DashboardLayout>
  );
}
