import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import FinancingCard from '../../components/financing/FinancingCard';
import FinancingRow from '../../components/financing/FinancingRow';
import FinancingRequestModal from '../../components/financing/FinancingRequestModal';
import FinancingReviewModal from '../../components/financing/FinancingReviewModal';
import FinancingStatusBadge from '../../components/financing/FinancingStatusBadge';
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
  Gavel
} from 'lucide-react';
import { getBuyerOrders } from '../../utils/orders';
import { getBuyerFinancingRequests, getFinancingRequestForOrder } from '../../utils/financing';
import { showGlobalLoader, hideGlobalLoader } from '../../context/LoadingContext';

export default function BuyerFinancing({ currentUser, onNavigate, navState }) {
  const user = currentUser || { name: 'Buyer', id: '', role: 'buyer' };

  const [orders, setOrders] = useState([]);
  const [financingRequests, setFinancingRequests] = useState([]);
  const [selectedOrderForFinancing, setSelectedOrderForFinancing] = useState(
    navState?.orderForFinancing || null
  );
  const [selectedRequestForReview, setSelectedRequestForReview] = useState(null);

  const loadData = async () => {
    try {
      showGlobalLoader('Loading Trade Credit Facility...', 'Evaluating working capital lines & PO financing status...');
      const [orderData, requestData] = await Promise.all([
        getBuyerOrders(user.id),
        getBuyerFinancingRequests(user.id),
      ]);
      setOrders(orderData || []);
      setFinancingRequests(requestData || []);
    } catch (err) {
      console.error('Error loading buyer financing:', err);
    } finally {
      hideGlobalLoader();
    }
  };

  useEffect(() => {
    loadData();
  }, [user.id]);

  const safeRequests = Array.isArray(financingRequests) ? financingRequests : [];
  const safeOrders = Array.isArray(orders) ? orders : [];

  const requestByOrder = React.useMemo(() => {
    const map = new Map();
    safeRequests.forEach((req) => {
      if (req.orderNumber) map.set(req.orderNumber, req);
      if (req.orderId) map.set(req.orderId, req);
    });
    return map;
  }, [safeRequests]);

  const unfinancedOrders = React.useMemo(() => {
    return safeOrders.filter(
      (o) =>
        o.status !== 'completed' &&
        o.status !== 'cancelled' &&
        o.paymentMode !== 'trade_credit' &&
        !requestByOrder.has(o.orderNumber) &&
        !requestByOrder.has(o.id)
    );
  }, [safeOrders, requestByOrder]);

  const activeRequestsCount = safeRequests.filter(
    (r) => r.status === 'pending' || r.status === 'under_review'
  ).length;

  const totalApprovedFunding = safeRequests
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + (Number(r.approvedAmount) || Number(r.requestedAmount) || 0), 0);

  const totalPurchaseVolume = safeOrders.reduce(
    (sum, o) => sum + (Number(o.totalAmount) || 0), 0
  );

  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'row'
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
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F4A37] text-xs font-semibold text-[#34D399] border border-[#14624A]">
              <CreditCard className="w-3.5 h-3.5" /> Buyer Trade Credit
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-white tracking-tight">
              Trade Credit
            </h1>
            <p className="text-sm sm:text-base text-[#DCFCE7]/90 leading-relaxed font-normal">
              Get up to 80% financing from approved NBFCs to purchase produce with 30-day repayment.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="md"
              icon={Gavel}
              iconPosition="left"
              onClick={() => onNavigate('buyer-live-auctions')}
              className="font-semibold text-xs border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white cursor-pointer"
            >
              Live Auctions
            </Button>
            <Button
              variant="accent"
              size="md"
              icon={Compass}
              iconPosition="left"
              onClick={() => onNavigate('buyer-marketplace')}
              className="font-bold text-xs cursor-pointer"
            >
              Marketplace
            </Button>
          </div>
        </div>

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
                      onView={(item) => setSelectedRequestForReview(item)}
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
                      onView={(item) => setSelectedRequestForReview(item)}
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
                Select "Trade Credit (NBFC)" at purchase checkout or apply on eligible orders below.
              </p>
            </Card>
          )}
        </div>

        {/* Section 2: Other Eligible Purchases (Only show orders that don't have credit yet) */}
        {unfinancedOrders.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-[#E5EDE8]">
            <div>
              <h2 className="text-xl font-bold text-[#0B3326] font-heading">
                Apply Credit on Other Purchases ({unfinancedOrders.length})
              </h2>
              <p className="text-xs text-[#566861]">
                Orders placed via direct escrow that are eligible for 30-day NBFC refinancing
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {unfinancedOrders.map((order) => (
                <Card key={order.id} className="p-5 bg-white border border-[#E5EDE8] shadow-xs space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="dark" size="sm">
                        {order.orderNumber}
                      </Badge>
                      <span className="text-xs text-[#566861]">
                        {order.commodity?.includes('Auction') ? 'Auction Order' : 'Direct Marketplace'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-[#14211D]">
                        {order.commodity}
                      </h4>
                      <p className="text-xs text-[#566861] mt-0.5">
                        Seller: {order.farmerName || 'Verified Producer'} • {order.quantity} {order.unit || 'kg'}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] flex items-center justify-between">
                      <span className="text-xs text-[#566861] font-medium">Purchase Value:</span>
                      <span className="text-base font-extrabold text-[#0B3326]">
                        ₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E5EDE8]">
                    <Button
                      variant="accent"
                      size="sm"
                      onClick={() => setSelectedOrderForFinancing(order)}
                      icon={CreditCard}
                      iconPosition="left"
                      className="w-full font-bold text-xs py-2.5 shadow-xs cursor-pointer"
                    >
                      Request Trade Credit
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Credit Request Modal */}
      {selectedOrderForFinancing && (
        <FinancingRequestModal
          order={selectedOrderForFinancing}
          currentUser={user}
          onClose={() => setSelectedOrderForFinancing(null)}
          onSuccess={(newReq) => {
            loadData();
            setSelectedRequestForReview(newReq);
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
