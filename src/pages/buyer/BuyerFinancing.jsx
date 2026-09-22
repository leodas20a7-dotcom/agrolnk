import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import FinancingCard from '../../components/financing/FinancingCard';
import FinancingRow from '../../components/financing/FinancingRow';
import FinancingReviewModal from '../../components/financing/FinancingReviewModal';
import FinancingStatusBadge from '../../components/financing/FinancingStatusBadge';
import BorrowerTermAcceptanceModal from '../../components/financing/BorrowerTermAcceptanceModal';
import Pagination from '../../components/ui/Pagination';
import ViewModeToggle from '../../components/ui/ViewModeToggle';
import {
  CreditCard,
  Landmark,
  ArrowLeft,
  ShoppingBag,
  TrendingUp,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Compass,
  Gavel,
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { getBuyerOrders } from '../../utils/orders';
import { getBuyerFinancingRequests, getFinancingRequestForOrder } from '../../utils/financing';
import { getCurrentUser } from '../../utils/auth';
import { showGlobalLoader, hideGlobalLoader } from '../../context/LoadingContext';
import { subscribeToCrossTabSync } from '../../utils/syncChannel';
import { supabase } from '../../lib/supabase';

export default function BuyerFinancing({ currentUser, onNavigate }) {
  const user = (currentUser && (currentUser.id || currentUser.email))
    ? currentUser
    : (getCurrentUser() || { name: 'Buyer', id: '', role: 'buyer' });

  const [orders, setOrders] = useState([]);
  const [financingRequests, setFinancingRequests] = useState([]);
  const [selectedRequestForReview, setSelectedRequestForReview] = useState(null);
  const [selectedOfferForAcceptance, setSelectedOfferForAcceptance] = useState(null);

  const loadData = async (showFlash = false) => {
    try {
      if (showFlash) {
        showGlobalLoader('Loading Trade Credit...', 'Fetching approved loans & repayment status...');
      }
      const [orderData, requestData] = await Promise.all([
        getBuyerOrders(user.id, user),
        getBuyerFinancingRequests(user.id, user),
      ]);
      setOrders(orderData || []);
      setFinancingRequests(requestData || []);
    } catch (err) {
      console.error('Error loading buyer financing:', err);
    } finally {
      if (showFlash) hideGlobalLoader();
    }
  };

  useEffect(() => {
    loadData(true);

    const handleUpdated = () => {
      loadData(false);
    };

    const unsubscribeCrossTab = subscribeToCrossTabSync((msg) => {
      if (msg.domain === 'financing' || msg.domain === 'orders') {
        handleUpdated();
      }
    });

    const channel = supabase
      .channel('public:financing_requests:buyer')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'financing_requests' },
        () => handleUpdated()
      )
      .subscribe();

    window.addEventListener('agrolnk_financing_updated', handleUpdated);
    window.addEventListener('agrolnk_orders_updated', handleUpdated);
    window.addEventListener('storage', handleUpdated);
    return () => {
      hideGlobalLoader();
      unsubscribeCrossTab();
      supabase.removeChannel(channel);
      window.removeEventListener('agrolnk_financing_updated', handleUpdated);
      window.removeEventListener('agrolnk_orders_updated', handleUpdated);
      window.removeEventListener('storage', handleUpdated);
    };
  }, [user.id, user.email, user.name]);

  const safeRequests = Array.isArray(financingRequests) ? financingRequests : [];
  const safeOrders = Array.isArray(orders) ? orders : [];

  const activeRequestsCount = safeRequests.filter(
    (r) => r.status === 'pending' || r.status === 'under_review'
  ).length;

  const totalApprovedFunding = safeRequests
    .filter((r) => r.status === 'approved' || r.status === 'disbursed')
    .reduce((sum, r) => sum + (Number(r.approvedAmount) || Number(r.requestedAmount) || 0), 0);

  const totalPurchaseVolume = safeOrders.reduce(
    (sum, o) => sum + (Number(o.totalAmount) || 0), 0
  );

  const [viewMode, setViewMode] = useState('row'); // 'grid' | 'row'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const totalPages = Math.ceil(safeRequests.length / pageSize) || 1;
  const paginatedRequests = safeRequests.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8 text-left">
        
        {/* Top Welcome Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6 sm:p-8 rounded-3xl bg-[#0B3326] text-white border border-[#14624A] shadow-md">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F4A37] text-xs font-semibold text-[#34D399] border border-[#14624A]">
              <CreditCard className="w-3.5 h-3.5" /> Buyer Trade Credit
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-white tracking-tight">
              Trade Credit
            </h1>
            <p className="text-sm text-[#DCFCE7]/90 leading-relaxed font-normal">
              Get up to 80% financing from approved NBFCs to purchase produce with 30-day repayment.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full sm:w-auto">
            {/* BUTTON: MY LOAN DEADLINES & REPAY */}
            <Button
              variant="accent"
              size="md"
              icon={Calendar}
              iconPosition="left"
              onClick={() => onNavigate('buyer-loan-repayments')}
              className="font-bold text-xs py-2.5 px-4 shadow-md cursor-pointer justify-center"
            >
              My Deadlines & Repay
            </Button>

            <Button
              variant="secondary"
              size="md"
              icon={Compass}
              iconPosition="left"
              onClick={() => onNavigate('buyer-marketplace')}
              className="font-semibold text-xs border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white cursor-pointer"
            >
              Marketplace
            </Button>
          </div>
        </div>

        {/* Term-Sheet Offer Confirmation Alert Banner */}
        {safeRequests.filter(r => r.status === 'offer_received').length > 0 && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-900 to-emerald-950 text-white border-2 border-emerald-500/60 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-400/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/30 text-[11px] font-bold text-emerald-300">
                  ACTION REQUIRED
                </div>
                <h3 className="text-base font-bold text-white">
                  Institutional Trade Credit Offer Received!
                </h3>
                <p className="text-xs text-emerald-200/90 leading-relaxed max-w-2xl">
                  A lending institution has approved your trade credit and provided term-sheet quotes. Review interest rates & repayment deadlines to lock your lender and disburse.
                </p>
              </div>
            </div>

            <Button
              variant="accent"
              size="md"
              icon={ArrowRight}
              iconPosition="right"
              onClick={() => {
                const pendingOffer = safeRequests.find(r => r.status === 'offer_received');
                if (pendingOffer) setSelectedOfferForAcceptance(pendingOffer);
              }}
              className="shrink-0 font-extrabold text-xs py-2.5 px-5 shadow-md cursor-pointer whitespace-nowrap"
            >
              Review & Confirm Terms
            </Button>
          </div>
        )}

        {/* 3 Core Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          
          {/* Total Purchase Pipeline */}
          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Total Orders</span>
              <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#1E40AF] flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              ₹{totalPurchaseVolume.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-[#566861]">
              Across {orders.length} direct orders & auction lots
            </div>
          </Card>

          {/* Active Credit Requests */}
          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Pending Review</span>
              <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              {activeRequestsCount}
            </div>
            <div className="text-[11px] text-[#566861]">
              Applications being reviewed
            </div>
          </Card>

          {/* Active Credit Facility */}
          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Approved Credit</span>
              <div className="w-8 h-8 rounded-lg bg-[#F2FBF6] text-[#0B3326] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#10B981] font-heading">
              ₹{totalApprovedFunding.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-[#10B981] font-semibold">
              Ready for purchase settlement
            </div>
          </Card>

        </div>

        {/* Active Trade Credit Facilities & Applications (Primary Section) */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-[#0B3326] font-heading">
                Trade Credit Applications & Facilities ({safeRequests.length})
              </h2>
              <p className="text-xs text-[#566861]">
                Live institutional credit underwriting, status tracking, and repayment limits
              </p>
            </div>

            <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          </div>

          {safeRequests.length > 0 ? (
            <div className="space-y-6">
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {paginatedRequests.map((request) => (
                    <FinancingCard
                      key={request.id}
                      request={request}
                      viewerRole="buyer"
                      onView={(item) => {
                        if (item.status === 'offer_received') {
                          setSelectedOfferForAcceptance(item);
                        } else {
                          setSelectedRequestForReview(item);
                        }
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {paginatedRequests.map((request) => (
                    <FinancingRow
                      key={request.id}
                      request={request}
                      viewerRole="buyer"
                      onView={(item) => {
                        if (item.status === 'offer_received') {
                          setSelectedOfferForAcceptance(item);
                        } else {
                          setSelectedRequestForReview(item);
                        }
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Pagination Controls */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={safeRequests.length}
                pageSize={pageSize}
              />
            </div>
          ) : (
            <Card className="p-10 text-center border-2 border-dashed border-[#E5EDE8] rounded-3xl space-y-2">
              <CreditCard className="w-8 h-8 text-[#10B981] mx-auto" />
              <h4 className="text-sm font-bold text-[#0B3326]">No trade credit applications yet</h4>
              <p className="text-xs text-[#566861]">
                Select "Trade Credit (NBFC)" at purchase checkout in the Marketplace.
              </p>
            </Card>
          )}
        </div>

      </div>

      {/* Borrower Term Sheet Review & Confirmation Modal */}
      {selectedOfferForAcceptance && (
        <BorrowerTermAcceptanceModal
          isOpen={!!selectedOfferForAcceptance}
          request={selectedOfferForAcceptance}
          onClose={() => setSelectedOfferForAcceptance(null)}
          onUpdated={() => {
            loadData();
            setSelectedOfferForAcceptance(null);
          }}
        />
      )}

      {/* Review / Status Modal */}
      {selectedRequestForReview && (
        <FinancingReviewModal
          request={selectedRequestForReview}
          viewerRole="buyer"
          onClose={() => setSelectedRequestForReview(null)}
          onStatusUpdated={() => loadData()}
        />
      )}
    </DashboardLayout>
  );
}
