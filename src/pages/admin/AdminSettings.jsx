import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import {
  Settings,
  Users,
  MessageSquare,
  Trash2,
  Edit,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Building2,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  Zap,
  ArrowRight,
  Database,
  Lock,
  UserCheck,
  UserX,
  X
} from 'lucide-react';
import {
  getAllKYCUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  resetPlatformDemoData
} from '../../utils/admin';
import {
  getChatDiagnostics,
  clearAllChatHistory,
  clearThreadHistory
} from '../../utils/chat';
import { showGlobalLoader, hideGlobalLoader } from '../../context/LoadingContext';

export default function AdminSettings({ currentUser, onNavigate }) {
  const user = currentUser || { name: 'Platform Admin', role: 'admin' };

  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'chat_reset' | 'platform'
  const [usersList, setUsersList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [kycFilter, setKycFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Chat diagnostics state
  const [chatDiag, setChatDiag] = useState({
    threadCount: 0,
    localMessageCount: 0,
    dbMessageCount: 0,
    threads: [],
  });

  // Modal States
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [isResetChatModalOpen, setIsResetChatModalOpen] = useState(false);
  const [isResetDraftsModalOpen, setIsResetDraftsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Form states for Add / Edit user
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    role: 'farmer',
    phone: '',
    companyName: '',
    state: 'Tamil Nadu',
    district: 'Salem',
    verificationStatus: 'verified',
  });

  const ITEMS_PER_PAGE = 8;

  const loadData = async () => {
    try {
      const [users, diag] = await Promise.all([
        getAllKYCUsers(),
        getChatDiagnostics(),
      ]);
      setUsersList(Array.isArray(users) ? users : []);
      setChatDiag(diag || { threadCount: 0, localMessageCount: 0, dbMessageCount: 0, threads: [] });
    } catch (err) {
      console.error('Failed to load admin settings data:', err);
    }
  };

  useEffect(() => {
    loadData();

    const handleKycUpdate = () => loadData();
    const handleChatUpdate = () => {
      getChatDiagnostics().then(setChatDiag);
    };

    window.addEventListener('agrolnk_kyc_updated', handleKycUpdate);
    window.addEventListener('agrolnk_chat_threads_updated', handleChatUpdate);
    return () => {
      window.removeEventListener('agrolnk_kyc_updated', handleKycUpdate);
      window.removeEventListener('agrolnk_chat_threads_updated', handleChatUpdate);
    };
  }, []);

  // Filtered Users list
  const filteredUsers = usersList.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q)) ||
      (u.orgName && u.orgName.toLowerCase().includes(q)) ||
      (u.district && u.district.toLowerCase().includes(q));

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesKyc = kycFilter === 'all' || u.verificationStatus === kycFilter;

    return matchesSearch && matchesRole && matchesKyc;
  });

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) || 1;
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // User Actions
  const handleOpenAddUser = () => {
    setUserFormData({
      name: '',
      email: '',
      role: 'farmer',
      phone: '',
      companyName: '',
      state: 'Tamil Nadu',
      district: 'Salem',
      verificationStatus: 'verified',
    });
    setActionError('');
    setIsAddUserModalOpen(true);
  };

  const handleOpenEditUser = (targetUser) => {
    setSelectedUser(targetUser);
    setUserFormData({
      name: targetUser.name || '',
      email: targetUser.email || '',
      role: targetUser.role || 'farmer',
      phone: targetUser.phone || '',
      companyName: targetUser.orgName || targetUser.company_name || '',
      state: targetUser.state || 'Tamil Nadu',
      district: targetUser.district || 'Salem',
      verificationStatus: targetUser.verificationStatus || 'pending',
    });
    setActionError('');
    setIsEditUserModalOpen(true);
  };

  const handleOpenDeleteUser = (targetUser) => {
    setSelectedUser(targetUser);
    setIsDeleteUserModalOpen(true);
  };

  const handleSaveNewUser = async (e) => {
    e.preventDefault();
    if (!userFormData.name.trim() || !userFormData.email.trim()) {
      setActionError('User name and email address are required.');
      return;
    }

    try {
      showGlobalLoader('Creating User...', 'Saving new partner to platform registry...');
      await createAdminUser(userFormData);
      setIsAddUserModalOpen(false);
      setActionSuccess(`User "${userFormData.name}" created successfully.`);
      setTimeout(() => setActionSuccess(''), 4000);
      loadData();
    } catch (err) {
      setActionError('Failed to create user. Please try again.');
    } finally {
      hideGlobalLoader();
    }
  };

  const handleSaveEditUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      showGlobalLoader('Updating User...', 'Applying changes to platform registry...');
      await updateAdminUser(selectedUser.id, userFormData);
      setIsEditUserModalOpen(false);
      setActionSuccess(`User "${userFormData.name}" updated successfully.`);
      setTimeout(() => setActionSuccess(''), 4000);
      loadData();
    } catch (err) {
      setActionError('Failed to update user. Please try again.');
    } finally {
      hideGlobalLoader();
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      showGlobalLoader('Deleting User...', 'Removing user profile from database...');
      await deleteAdminUser(selectedUser.id);
      setIsDeleteUserModalOpen(false);
      setActionSuccess(`User account deleted.`);
      setTimeout(() => setActionSuccess(''), 4000);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      hideGlobalLoader();
    }
  };

  const handleQuickStatusChange = async (targetUser, newStatus) => {
    try {
      await updateAdminUser(targetUser.id, { verificationStatus: newStatus });
      setActionSuccess(`Status for ${targetUser.name} changed to ${newStatus}.`);
      setTimeout(() => setActionSuccess(''), 3000);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Chat Reset Actions
  const handleConfirmResetAllChat = async () => {
    try {
      showGlobalLoader('Resetting Chat Database...', 'Wiping all message logs and active threads across system...');
      await clearAllChatHistory();
      setIsResetChatModalOpen(false);
      setActionSuccess('All AgroLnk chat history has been permanently wiped and reset to factory clean state.');
      setTimeout(() => setActionSuccess(''), 5000);
      const updatedDiag = await getChatDiagnostics();
      setChatDiag(updatedDiag);
    } catch (err) {
      console.error('Chat wipe error:', err);
      setActionError('Failed to reset chat database. Please try again.');
    } finally {
      hideGlobalLoader();
    }
  };

  // Drafts & Local Cache Reset Actions
  const handleConfirmResetDrafts = async () => {
    try {
      showGlobalLoader('Resetting Drafts & Cache...', 'Clearing unpublished produce drafts and session buffers...');
      await resetPlatformDemoData();
      setIsResetDraftsModalOpen(false);
      setActionSuccess('All unpublished produce drafts and local platform caches have been cleared.');
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err) {
      console.error('Draft reset error:', err);
      setActionError('Failed to clear drafts. Please try again.');
    } finally {
      hideGlobalLoader();
    }
  };

  const handleClearSingleThread = async (threadKey) => {
    try {
      await clearThreadHistory(threadKey);
      setActionSuccess(`Thread "${threadKey}" cleared.`);
      setTimeout(() => setActionSuccess(''), 3000);
      const updatedDiag = await getChatDiagnostics();
      setChatDiag(updatedDiag);
    } catch (err) {
      console.error(err);
    }
  };

  const roleBadgeVariants = {
    farmer: 'emerald',
    buyer: 'blue',
    financier: 'amber',
    transporter: 'dark',
    warehouse: 'emerald',
    admin: 'red',
  };

  const roles = [
    { value: 'farmer', label: 'Farmer (Producer)' },
    { value: 'buyer', label: 'Buyer (Wholesale / Institutional)' },
    { value: 'financier', label: 'Financier (NBFC / Credit Desk)' },
    { value: 'transporter', label: 'Transporter (Freight Logistics)' },
    { value: 'warehouse', label: 'Warehouse Operator (Storage)' },
    { value: 'admin', label: 'Platform Administrator' },
  ];

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8 text-left max-w-7xl mx-auto">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-[#0B3326] text-white border border-[#14624A] shadow-sm">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge variant="rose" size="sm">System Administration</Badge>
              <span className="text-xs text-[#34D399] font-semibold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> Root Operations Desk
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-white">
              Platform Settings & Control Center
            </h1>
            <p className="text-xs sm:text-sm text-white/80">
              Manage platform users across all 5 roles, control CRUD permissions, and execute safe factory communication resets.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="accent"
              size="md"
              onClick={handleOpenAddUser}
              icon={Plus}
              iconPosition="left"
              className="font-bold py-2.5 px-5 shadow-xs cursor-pointer"
            >
              Add New User
            </Button>
          </div>
        </div>

        {/* Action Success / Error Notifications */}
        {actionSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess('')} className="p-1 text-emerald-700 hover:text-emerald-900 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 3 Main Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#E5EDE8]">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-[#0B3326] text-white shadow-xs'
                : 'bg-white text-[#566861] hover:bg-[#F2FBF6] hover:text-[#0B3326] border border-[#E5EDE8]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Management (CRUD)</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'users' ? 'bg-[#10B981] text-white' : 'bg-[#F8FAF8] text-[#566861]'}`}>
              {usersList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chat_reset')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'chat_reset'
                ? 'bg-[#0B3326] text-white shadow-xs'
                : 'bg-white text-[#566861] hover:bg-[#F2FBF6] hover:text-[#0B3326] border border-[#E5EDE8]'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat Factory Reset</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'chat_reset' ? 'bg-[#10B981] text-white' : 'bg-[#F8FAF8] text-[#566861]'}`}>
              {chatDiag.localMessageCount} msgs
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('platform')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'platform'
                ? 'bg-[#0B3326] text-white shadow-xs'
                : 'bg-white text-[#566861] hover:bg-[#F2FBF6] hover:text-[#0B3326] border border-[#E5EDE8]'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>System Health & Cache</span>
          </button>
        </div>

        {/* TAB 1: User Management (CRUD) */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="p-4 bg-white border border-[#E5EDE8] space-y-1 text-left">
                <span className="text-xs text-[#566861]">Total Platform Users</span>
                <span className="text-2xl font-extrabold text-[#0B3326] block font-heading">{usersList.length}</span>
              </Card>
              <Card className="p-4 bg-white border border-[#E5EDE8] space-y-1 text-left">
                <span className="text-xs text-[#566861]">Verified KYC</span>
                <span className="text-2xl font-extrabold text-[#10B981] block font-heading">
                  {usersList.filter((u) => u.verificationStatus === 'verified').length}
                </span>
              </Card>
              <Card className="p-4 bg-white border border-[#E5EDE8] space-y-1 text-left">
                <span className="text-xs text-[#566861]">Pending Review</span>
                <span className="text-2xl font-extrabold text-[#D97706] block font-heading">
                  {usersList.filter((u) => u.verificationStatus === 'pending').length}
                </span>
              </Card>
              <Card className="p-4 bg-white border border-[#E5EDE8] space-y-1 text-left">
                <span className="text-xs text-[#566861]">Administrators</span>
                <span className="text-2xl font-extrabold text-[#E11D48] block font-heading">
                  {usersList.filter((u) => u.role === 'admin').length}
                </span>
              </Card>
            </div>

            {/* Search & Filters */}
            <div className="p-4 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#566861]" />
                <input
                  type="text"
                  placeholder="Search by name, email, phone, business, district..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E5EDE8] text-xs focus:outline-none focus:ring-2 focus:ring-[#10B981] bg-[#F8FAF8]"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 rounded-xl border border-[#E5EDE8] text-xs font-semibold text-[#0B3326] bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                >
                  <option value="all">All Roles</option>
                  <option value="farmer">Farmers</option>
                  <option value="buyer">Buyers</option>
                  <option value="financier">Financiers</option>
                  <option value="transporter">Transporters</option>
                  <option value="warehouse">Warehouses</option>
                  <option value="admin">Admins</option>
                </select>

                <select
                  value={kycFilter}
                  onChange={(e) => {
                    setKycFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 rounded-xl border border-[#E5EDE8] text-xs font-semibold text-[#0B3326] bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                >
                  <option value="all">All KYC Statuses</option>
                  <option value="verified">Verified</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>

                <button
                  type="button"
                  onClick={loadData}
                  className="p-2 rounded-xl border border-[#E5EDE8] text-[#566861] hover:text-[#0B3326] hover:bg-[#F2FBF6] transition-colors cursor-pointer"
                  title="Refresh Users"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Users Data Table */}
            <div className="bg-white rounded-3xl border border-[#E5EDE8] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAF8] border-b border-[#E5EDE8] text-[#566861] font-bold">
                      <th className="py-3.5 px-4">User / Entity</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Contact Info</th>
                      <th className="py-3.5 px-4">Location</th>
                      <th className="py-3.5 px-4">KYC Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EDE8]">
                    {paginatedUsers.length > 0 ? (
                      paginatedUsers.map((u) => {
                        const isVerified = u.verificationStatus === 'verified';
                        return (
                          <tr key={u.id || u.email} className="hover:bg-[#F2FBF6]/40 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#0B3326] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                  {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div>
                                  <span className="font-bold text-[#0B3326] block">{u.name || 'Anonymous User'}</span>
                                  <span className="text-[11px] text-[#566861] block">
                                    {u.orgName || u.company_name || 'Individual Trader'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <Badge variant={roleBadgeVariants[u.role] || 'dark'} size="sm">
                                <span className="capitalize">{u.role}</span>
                              </Badge>
                            </td>

                            <td className="py-3.5 px-4 space-y-0.5">
                              <div className="flex items-center gap-1.5 text-[#14211D]">
                                <Mail className="w-3 h-3 text-[#566861] shrink-0" />
                                <span className="truncate max-w-[170px]">{u.email || '—'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[#566861] text-[11px]">
                                <Phone className="w-3 h-3 shrink-0" />
                                <span>{u.phone || '—'}</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1 text-[#566861]">
                                <MapPin className="w-3 h-3 shrink-0 text-[#10B981]" />
                                <span>{u.district || 'Salem'}, {u.state || 'Tamil Nadu'}</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  isVerified
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : u.verificationStatus === 'rejected'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {isVerified ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                <span className="capitalize">{u.verificationStatus || 'Pending'}</span>
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Quick KYC Toggle */}
                                {u.verificationStatus !== 'verified' ? (
                                  <button
                                    type="button"
                                    onClick={() => handleQuickStatusChange(u, 'verified')}
                                    className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                                    title="Verify KYC"
                                  >
                                    <UserCheck className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleQuickStatusChange(u, 'pending')}
                                    className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                                    title="Mark Pending"
                                  >
                                    <UserX className="w-4 h-4" />
                                  </button>
                                )}

                                {/* Edit Button */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditUser(u)}
                                  className="p-1.5 rounded-lg text-[#566861] hover:text-[#0B3326] hover:bg-[#F2FBF6] transition-colors cursor-pointer"
                                  title="Edit User"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>

                                {/* Delete Button */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenDeleteUser(u)}
                                  className="p-1.5 rounded-lg text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors cursor-pointer"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#566861]">
                          <Users className="w-8 h-8 mx-auto text-[#566861]/40 mb-2" />
                          <p className="font-bold">No users match your filters.</p>
                          <p className="text-xs mt-1">Try resetting search criteria or add a new user.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-[#E5EDE8]">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Chat & Communication Factory Reset */}
        {activeTab === 'chat_reset' && (
          <div className="space-y-6">
            
            {/* Warning Card */}
            <Card className="p-6 bg-gradient-to-r from-red-50/70 via-rose-50/40 to-white border border-red-200 text-left space-y-4 shadow-xs">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center shrink-0 shadow-sm">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-red-950 font-heading">
                    AgroLnk Communication Factory Reset & Message Purge
                  </h3>
                  <p className="text-xs text-red-900 leading-relaxed max-w-3xl">
                    This administrative action clears and purges all live chat messages and thread histories across both local cached storage and the remote Supabase database. Use this tool during testing, staging resets, or maintenance cycles.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-red-100">
                <div className="p-3.5 rounded-xl bg-white border border-red-200">
                  <span className="text-xs text-[#566861] block">Active Conversation Threads</span>
                  <span className="text-xl font-extrabold text-[#0B3326] font-heading">{chatDiag.threadCount}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-red-200">
                  <span className="text-xs text-[#566861] block">Local Stored Messages</span>
                  <span className="text-xl font-extrabold text-[#0B3326] font-heading">{chatDiag.localMessageCount}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-red-200">
                  <span className="text-xs text-[#566861] block">Database Recorded Rows</span>
                  <span className="text-xl font-extrabold text-[#0B3326] font-heading">{chatDiag.dbMessageCount}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setIsResetChatModalOpen(true)}
                  icon={Trash2}
                  iconPosition="left"
                  className="bg-red-700 hover:bg-red-800 border-red-800 text-white font-bold py-2.5 px-6 shadow-md shadow-red-700/20 cursor-pointer"
                >
                  Factory Reset All Chat History
                </Button>

                <button
                  type="button"
                  onClick={() => getChatDiagnostics().then(setChatDiag)}
                  className="px-4 py-2.5 rounded-xl border border-[#E5EDE8] text-xs font-semibold text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Diagnostics
                </button>
              </div>
            </Card>

            {/* Individual Thread Management */}
            <Card className="p-6 bg-white border border-[#E5EDE8] text-left space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#0B3326] font-heading">
                    Active Conversation Threads ({chatDiag.threads.length})
                  </h3>
                  <p className="text-xs text-[#566861]">
                    Purge individual conversation channels without wiping global chat history.
                  </p>
                </div>
              </div>

              {chatDiag.threads.length > 0 ? (
                <div className="divide-y divide-[#E5EDE8] border border-[#E5EDE8] rounded-2xl overflow-hidden">
                  {chatDiag.threads.map((t) => (
                    <div key={t.threadKey} className="p-4 flex items-center justify-between gap-4 hover:bg-[#F8FAF8] transition-colors">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#0B3326] font-mono">{t.threadKey}</span>
                          <Badge variant="dark" size="sm">{t.messageCount} messages</Badge>
                        </div>
                        {t.lastMessage && (
                          <p className="text-[11px] text-[#566861] truncate max-w-md">
                            Latest: "{t.lastMessage.text || t.lastMessage.rawText || '—'}"
                          </p>
                        )}
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleClearSingleThread(t.threadKey)}
                        icon={Trash2}
                        className="text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 cursor-pointer shrink-0"
                      >
                        Clear Thread
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-[#566861]">
                  <CheckCircle2 className="w-8 h-8 text-[#10B981] mx-auto mb-2" />
                  <p className="font-bold">No active chat threads recorded.</p>
                  <p className="text-xs text-[#566861]">All messaging threads are clean and empty.</p>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* TAB 3: System Health & Cache */}
        {activeTab === 'platform' && (
          <div className="space-y-6">
            
            {/* Unpublished Drafts & Local Storage Cache */}
            <Card className="p-6 bg-white border border-[#E5EDE8] text-left space-y-4 shadow-xs">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-[#0B3326] font-heading">
                      Produce Listing Drafts & Form Buffers
                    </h3>
                  </div>
                  <p className="text-xs text-[#566861] max-w-2xl">
                    Safely purges any unpublished produce listing drafts (`agrolnk_draft_listing_*`) and clears temporary wizard progress without touching user accounts, published lots, or escrow contracts.
                  </p>
                </div>

                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setIsResetDraftsModalOpen(true)}
                  icon={RefreshCw}
                  iconPosition="left"
                  className="text-xs font-bold border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 cursor-pointer shrink-0"
                >
                  Reset Produce Drafts
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#E5EDE8] text-xs">
                <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
                  <span className="font-bold text-[#0B3326] block">Farmer Drafts</span>
                  <span className="text-[11px] text-[#566861]">Uncommitted produce assays & step forms</span>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
                  <span className="font-bold text-[#0B3326] block">Local Sync State</span>
                  <span className="text-[11px] text-[#566861]">Temporary filter state & draft triggers</span>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
                  <span className="font-bold text-emerald-700 block">✓ Safe Action</span>
                  <span className="text-[11px] text-[#566861]">Active accounts & live lots remain intact</span>
                </div>
              </div>
            </Card>

          </div>
        )}

      </div>

      {/* MODAL 1: Add User Modal */}
      <Modal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        title="Add New Platform User"
        subtitle="Register a new actor in the AgroLnk directory with pre-assigned role & KYC status"
        icon={Plus}
        iconColor="text-[#10B981]"
        iconBg="bg-[#EBF5F0]"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveNewUser} className="space-y-4 text-left">
          {actionError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#14211D]">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kumar"
                value={userFormData.name}
                onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E5EDE8] text-xs focus:ring-2 focus:ring-[#10B981] bg-[#F8FAF8]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#14211D]">Email Address *</label>
              <input
                type="email"
                required
                placeholder="e.g. ramesh@kisanfarms.com"
                value={userFormData.email}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E5EDE8] text-xs focus:ring-2 focus:ring-[#10B981] bg-[#F8FAF8]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#14211D]">Platform Role *</label>
              <select
                value={userFormData.role}
                onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E5EDE8] text-xs font-semibold text-[#0B3326] bg-white cursor-pointer"
              >
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#14211D]">Phone Number</label>
              <input
                type="text"
                placeholder="e.g. +91 98400 12345"
                value={userFormData.phone}
                onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E5EDE8] text-xs focus:ring-2 focus:ring-[#10B981] bg-[#F8FAF8]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#14211D]">Farm / Business / Organization Name</label>
            <input
              type="text"
              placeholder="e.g. Ramesh Organic Orchards Pvt Ltd"
              value={userFormData.companyName}
              onChange={(e) => setUserFormData({ ...userFormData, companyName: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-[#E5EDE8] text-xs focus:ring-2 focus:ring-[#10B981] bg-[#F8FAF8]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#14211D]">District</label>
              <input
                type="text"
                placeholder="e.g. Salem"
                value={userFormData.district}
                onChange={(e) => setUserFormData({ ...userFormData, district: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E5EDE8] text-xs bg-[#F8FAF8]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#14211D]">State</label>
              <input
                type="text"
                placeholder="e.g. Tamil Nadu"
                value={userFormData.state}
                onChange={(e) => setUserFormData({ ...userFormData, state: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E5EDE8] text-xs bg-[#F8FAF8]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#14211D]">Initial KYC Status</label>
              <select
                value={userFormData.verificationStatus}
                onChange={(e) => setUserFormData({ ...userFormData, verificationStatus: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#E5EDE8] text-xs font-semibold text-[#0B3326] bg-white cursor-pointer"
              >
                <option value="verified">Verified (Approved)</option>
                <option value="pending">Pending Review</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E5EDE8]">
            <Button variant="secondary" size="md" onClick={() => setIsAddUserModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" className="font-bold">
              Create User Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Edit User Modal */}
      <Modal
        isOpen={isEditUserModalOpen}
        onClose={() => setIsEditUserModalOpen(false)}
        title="Edit User Profile"
        subtitle={`Update account details and role permissions for ${selectedUser?.name || 'User'}`}
        icon={Edit}
        iconColor="text-[#10B981]"
        iconBg="bg-[#EBF5F0]"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveEditUser} className="space-y-4 text-left">
          {actionError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#14211D]">Full Name *</label>
              <input
                type="text"
                required
                value={userFormData.name}
                onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E5EDE8] text-xs focus:ring-2 focus:ring-[#10B981] bg-[#F8FAF8]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#14211D]">Email Address *</label>
              <input
                type="email"
                required
                value={userFormData.email}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E5EDE8] text-xs focus:ring-2 focus:ring-[#10B981] bg-[#F8FAF8]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#14211D]">Platform Role *</label>
              <select
                value={userFormData.role}
                onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E5EDE8] text-xs font-semibold text-[#0B3326] bg-white cursor-pointer"
              >
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#14211D]">Phone Number</label>
              <input
                type="text"
                value={userFormData.phone}
                onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E5EDE8] text-xs focus:ring-2 focus:ring-[#10B981] bg-[#F8FAF8]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#14211D]">Farm / Business / Organization Name</label>
            <input
              type="text"
              value={userFormData.companyName}
              onChange={(e) => setUserFormData({ ...userFormData, companyName: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-[#E5EDE8] text-xs focus:ring-2 focus:ring-[#10B981] bg-[#F8FAF8]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#14211D]">District</label>
              <input
                type="text"
                value={userFormData.district}
                onChange={(e) => setUserFormData({ ...userFormData, district: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E5EDE8] text-xs bg-[#F8FAF8]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#14211D]">State</label>
              <input
                type="text"
                value={userFormData.state}
                onChange={(e) => setUserFormData({ ...userFormData, state: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E5EDE8] text-xs bg-[#F8FAF8]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#14211D]">KYC Status</label>
              <select
                value={userFormData.verificationStatus}
                onChange={(e) => setUserFormData({ ...userFormData, verificationStatus: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#E5EDE8] text-xs font-semibold text-[#0B3326] bg-white cursor-pointer"
              >
                <option value="verified">Verified (Approved)</option>
                <option value="pending">Pending Review</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E5EDE8]">
            <Button variant="secondary" size="md" onClick={() => setIsEditUserModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" className="font-bold">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteUserModalOpen}
        onClose={() => setIsDeleteUserModalOpen(false)}
        title="Delete User?"
        icon={Trash2}
        iconColor="text-red-600"
        iconBg="bg-red-50"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4 text-left">
          <p className="text-sm text-[#14211D]">
            Are you sure you want to delete <strong className="text-[#0B3326]">{selectedUser?.name || 'this user'}</strong>?
          </p>
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E5EDE8]">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsDeleteUserModalOpen(false)}
              className="font-semibold cursor-pointer"
            >
              No, Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleConfirmDeleteUser}
              className="bg-red-600 hover:bg-red-700 border-red-700 text-white font-bold cursor-pointer"
            >
              Yes, Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: Factory Reset All Chat Modal */}
      <Modal
        isOpen={isResetChatModalOpen}
        onClose={() => setIsResetChatModalOpen(false)}
        title="Reset All Chat History?"
        icon={AlertTriangle}
        iconColor="text-red-600"
        iconBg="bg-red-100"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4 text-left">
          <p className="text-sm text-[#14211D]">
            Are you sure you want to permanently delete all chat history across the platform?
          </p>
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E5EDE8]">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsResetChatModalOpen(false)}
              className="font-semibold cursor-pointer"
            >
              No, Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleConfirmResetAllChat}
              className="bg-red-600 hover:bg-red-700 border-red-700 text-white font-bold cursor-pointer shadow-sm"
            >
              Yes, Reset All
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 5: Reset Produce Drafts Modal */}
      <Modal
        isOpen={isResetDraftsModalOpen}
        onClose={() => setIsResetDraftsModalOpen(false)}
        title="Reset Listing Drafts?"
        icon={RefreshCw}
        iconColor="text-amber-600"
        iconBg="bg-amber-100"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4 text-left">
          <p className="text-sm text-[#14211D]">
            Are you sure you want to clear all uncommitted produce drafts and local cache?
          </p>
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E5EDE8]">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsResetDraftsModalOpen(false)}
              className="font-semibold cursor-pointer"
            >
              No, Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleConfirmResetDrafts}
              className="bg-amber-600 hover:bg-amber-700 border-amber-700 text-white font-bold cursor-pointer shadow-sm"
            >
              Yes, Clear Drafts
            </Button>
          </div>
        </div>
      </Modal>

    </DashboardLayout>
  );
}
