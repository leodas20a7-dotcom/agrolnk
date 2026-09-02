import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import InstitutionalUnderwriteModal from '../../components/financing/InstitutionalUnderwriteModal';
import {
  Landmark,
  Search,
  Filter,
  FileText,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  User,
  MapPin,
  Lock,
  ArrowUpRight
} from 'lucide-react';
import { getFinancingRequests } from '../../utils/financing';

export default function UnderwritingDesk({ currentUser, onNavigate }) {
  const user = currentUser || {
    name: 'Kisan Capital Partners',
    role: 'financier',
    email: 'financier@agrolnk.com',
  };

  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all'); // 'all' | 'farmer' | 'buyer'
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('pending'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [selectedCommodity, setSelectedCommodity] = useState('all');
  const [selectedRequestForReview, setSelectedRequestForReview] = useState(null);

  const loadRequests = async () => {
    try {
      const data = await getFinancingRequests();
      setRequests(data || []);
    } catch (err) {
      console.error('Error loading requests:', err);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const commodities = ['all', ...new Set(requests.map((r) => r.commodity?.split(' ')[0] || r.commodity))];

  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.commodity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.requestNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.orderNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = selectedRoleFilter === 'all' || r.applicantRole === selectedRoleFilter;
    const matchesStatus =
      selectedStatusFilter === 'all' ||
      (selectedStatusFilter === 'pending' && (r.status === 'pending' || r.status === 'under_review')) ||
      r.status === selectedStatusFilter;
    const matchesCommodity = selectedCommodity === 'all' || r.commodity.includes(selectedCommodity);

    return matchesSearch && matchesRole && matchesStatus && matchesCommodity;
  });

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8 text-left">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-5 sm:p-8 rounded-3xl bg-[#0B3326] text-white border border-[#14624A] shadow-sm">
          <div className="space-y-1 sm:space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-[#0F4A37] text-[11px] sm:text-xs font-semibold text-[#34D399] border border-[#14624A]">
              <Landmark className="w-3.5 h-3.5" />
              <span className="sm:hidden">Credit Desk</span>
              <span className="hidden sm:inline">Credit Assessment & Risk Underwriting</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold font-heading">
              Underwriting Queue
            </h1>
            <p className="hidden sm:block text-xs sm:text-sm text-[#DCFCE7]/85">
              Review NABL assay test parameters, evaluate LTV collateral coverage, and issue institutional term-sheets.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="emerald" size="sm">
              <span className="sm:hidden">Auto-Escrow</span>
              <span className="hidden sm:inline">Auto-Escrow Settlement Active</span>
            </Badge>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5EDE8] shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-[#566861] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by applicant, commodity, #FIN or order number..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              />
            </div>

            {/* Role Filter */}
            <div className="flex items-center gap-1.5 bg-[#F8FAF8] p-1 rounded-xl border border-[#E5EDE8] shrink-0">
              <button
                onClick={() => setSelectedRoleFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedRoleFilter === 'all'
                    ? 'bg-[#0B3326] text-white shadow-xs'
                    : 'text-[#566861] hover:text-[#0B3326]'
                }`}
              >
                All Roles
              </button>
              <button
                onClick={() => setSelectedRoleFilter('farmer')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedRoleFilter === 'farmer'
                    ? 'bg-[#0B3326] text-white shadow-xs'
                    : 'text-[#566861] hover:text-[#0B3326]'
                }`}
              >
                Farmers
              </button>
              <button
                onClick={() => setSelectedRoleFilter('buyer')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedRoleFilter === 'buyer'
                    ? 'bg-[#0B3326] text-white shadow-xs'
                    : 'text-[#566861] hover:text-[#0B3326]'
                }`}
              >
                Buyers
              </button>
            </div>
          </div>

          {/* Secondary Filter Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E5EDE8]/60 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-[#566861] text-[11px] uppercase tracking-wider">Status:</span>
              <button
                onClick={() => setSelectedStatusFilter('pending')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  selectedStatusFilter === 'pending'
                    ? 'bg-[#EBF5F0] text-[#0B3326] font-bold'
                    : 'text-[#566861] hover:bg-gray-100'
                }`}
              >
                Pending & Under Review ({requests.filter((r) => r.status === 'pending' || r.status === 'under_review').length})
              </button>
              <button
                onClick={() => setSelectedStatusFilter('approved')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  selectedStatusFilter === 'approved'
                    ? 'bg-[#EBF5F0] text-[#0B3326] font-bold'
                    : 'text-[#566861] hover:bg-gray-100'
                }`}
              >
                Approved ({requests.filter((r) => r.status === 'approved').length})
              </button>
              <button
                onClick={() => setSelectedStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  selectedStatusFilter === 'all'
                    ? 'bg-[#EBF5F0] text-[#0B3326] font-bold'
                    : 'text-[#566861] hover:bg-gray-100'
                }`}
              >
                All Records ({requests.length})
              </button>
            </div>

            <span className="text-[11px] text-[#566861]">
              Showing <b>{filteredRequests.length}</b> applications
            </span>
          </div>
        </div>

        {/* Requests Grid */}
        {filteredRequests.length === 0 ? (
          <Card className="p-12 bg-white border border-[#E5EDE8] text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EBF5F0] text-[#10B981] flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#0B3326] font-heading">
              No matching applications found
            </h3>
            <p className="text-xs text-[#566861] max-w-sm mx-auto">
              Try adjusting your search keywords or switching filter criteria.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredRequests.map((req) => {
              const ltv = Number(((req.requestedAmount / req.transactionValue) * 100).toFixed(1));

              return (
                <Card
                  key={req.id}
                  hoverEffect
                  className="p-6 bg-white border border-[#E5EDE8] shadow-xs space-y-5 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Card Top */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-[#0B3326]">
                            {req.requestNumber}
                          </span>
                          <span className="text-xs text-[#566861]">• Order {req.orderNumber}</span>
                        </div>
                        <h3 className="text-base font-bold text-[#14211D]">
                          {req.applicantName}
                        </h3>
                        <span className="text-xs text-[#566861] flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#10B981]" />
                          <span>{req.applicantLocation || 'Tamil Nadu'}</span>
                        </span>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <Badge
                          variant={req.applicantRole === 'farmer' ? 'emerald' : 'blue'}
                          size="sm"
                        >
                          <span className="capitalize">{req.applicantRole}</span>
                        </Badge>
                        <Badge
                          variant={
                            req.status === 'approved'
                              ? 'emerald'
                              : req.status === 'rejected'
                              ? 'rose'
                              : 'amber'
                          }
                          size="sm"
                        >
                          <span className="capitalize">{req.status.replace('_', ' ')}</span>
                        </Badge>
                      </div>
                    </div>

                    {/* Financial Metrics Box */}
                    <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#566861]">Commodity Lot:</span>
                        <span className="font-bold text-[#14211D]">
                          {req.commodity} ({req.grade})
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#566861]">Underlying Trade Value:</span>
                        <span className="font-bold text-[#14211D]">
                          ₹{req.transactionValue.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E5EDE8]">
                        <span className="text-[#0B3326] font-bold">Requested Advance:</span>
                        <span className="text-sm font-extrabold text-[#0B3326]">
                          ₹{req.requestedAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#566861]">LTV Collateral Ratio:</span>
                        <span className="font-bold text-[#10B981]">{ltv}%</span>
                      </div>
                    </div>

                    {/* Collateral & Credit Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#566861]">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                        <span>Credit Score: <b className="text-[#10B981]">{req.creditScore || 780}</b></span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-[#10B981]" />
                        <span>{req.collateralType || 'Escrow Lien'}</span>
                      </span>
                    </div>

                    {req.notes && (
                      <p className="text-xs text-[#566861] italic bg-[#F8FAF8] p-2.5 rounded-xl border border-[#E5EDE8]">
                        "{req.notes}"
                      </p>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="pt-3 border-t border-[#E5EDE8] flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[#566861]">
                      Proposed Rate: <b>{req.interestRate || 9.5}% APR</b>
                    </span>

                    <Button
                      variant={req.status === 'approved' ? 'secondary' : 'accent'}
                      size="sm"
                      onClick={() => setSelectedRequestForReview(req)}
                      className="font-bold text-xs cursor-pointer"
                    >
                      {req.status === 'approved' ? 'View Term Sheet' : 'Underwrite & Approve'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

      </div>

      {/* Underwriting Modal */}
      {selectedRequestForReview && (
        <InstitutionalUnderwriteModal
          isOpen={Boolean(selectedRequestForReview)}
          onClose={() => setSelectedRequestForReview(null)}
          request={selectedRequestForReview}
          onUpdated={loadRequests}
        />
      )}
    </DashboardLayout>
  );
}
