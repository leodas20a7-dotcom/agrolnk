import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import FinancingCard from '../../components/financing/FinancingCard';
import FinancingRequestModal from '../../components/financing/FinancingRequestModal';
import FinancingReviewModal from '../../components/financing/FinancingReviewModal';
import FinancingStatusBadge from '../../components/financing/FinancingStatusBadge';
import {
  Landmark,
  ArrowLeft,
  ShoppingBag,
  TrendingUp,
  Clock,
  CheckCircle2,
  Plus,
  ShieldCheck,
  Package,
  FileText,
  DollarSign
} from 'lucide-react';
import { getFarmerOrders } from '../../utils/orders';
import { getFarmerFinancingRequests, getFinancingRequestForOrder } from '../../utils/financing';

export default function FarmerFinancing({ currentUser, onNavigate, navState }) {
  const user = currentUser || { name: 'Sakthi Vel', id: 'usr_farmer_01', role: 'farmer' };
  
  const [orders, setOrders] = useState([]);
  const [financingRequests, setFinancingRequests] = useState([]);
  const [selectedOrderForFinancing, setSelectedOrderForFinancing] = useState(
    navState?.orderForFinancing || null
  );
  const [selectedRequestForReview, setSelectedRequestForReview] = useState(null);

  const loadData = async () => {
    try {
      const [orderData, requestData] = await Promise.all([
        getFarmerOrders(user.id),
        getFarmerFinancingRequests(user.id),
      ]);
      setOrders(orderData || []);
      setFinancingRequests(requestData || []);
    } catch (err) {
      console.error('Error loading farmer financing:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [user.id]);

  const safeRequests = Array.isArray(financingRequests) ? financingRequests : [];
  const safeOrders = Array.isArray(orders) ? orders : [];

  // Derived metrics
  const activeRequestsCount = safeRequests.filter(
    (r) => r.status === 'pending' || r.status === 'under_review'
  ).length;

  const totalApprovedFunding = safeRequests
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + (Number(r.approvedAmount) || Number(r.requestedAmount) || 0), 0);

  const eligibleOrders = safeOrders.filter((o) => o.status !== 'cancelled');

  const totalEligibleValue = eligibleOrders.reduce(
    (sum, o) => sum + (Number(o.totalAmount) || 0), 0
  );

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8 text-left">
        
        {/* Top Welcome Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6 sm:p-8 rounded-3xl bg-[#0B3326] text-white border border-[#14624A] shadow-md">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F4A37] text-xs font-semibold text-[#34D399] border border-[#14624A]">
              <Landmark className="w-3.5 h-3.5" /> Agrolnk Trade Liquidity Desk
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-white tracking-tight">
              Producer Financing
            </h1>
            <p className="text-sm sm:text-base text-[#DCFCE7]/90 leading-relaxed font-normal">
              Access immediate post-trade liquidity and working capital against your confirmed Agrolnk produce transactions.
            </p>
          </div>

          <Button
            variant="secondary"
            size="md"
            icon={ShoppingBag}
            iconPosition="left"
            onClick={() => onNavigate('farmer-orders')}
            className="shrink-0 font-semibold text-xs border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white cursor-pointer"
          >
            View Orders ({orders.length})
          </Button>
        </div>

        {/* Core Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          
          {/* Available Eligible Liquidity */}
          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Eligible Trade Volume</span>
              <div className="w-8 h-8 rounded-lg bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              ₹{totalEligibleValue.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-[#566861]">
              Across {eligibleOrders.length} confirmed produce transactions
            </div>
          </Card>

          {/* Active Requests */}
          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Active Requests</span>
              <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              {activeRequestsCount}
            </div>
            <div className="text-[11px] text-[#566861]">
              Underwriting review in progress
            </div>
          </Card>

          {/* Approved & Active Funding */}
          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Approved Funding</span>
              <div className="w-8 h-8 rounded-lg bg-[#F2FBF6] text-[#0B3326] flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#10B981]" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#10B981] font-heading">
              ₹{totalApprovedFunding.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-[#10B981] font-semibold">
              100% Escrow Collateralized
            </div>
          </Card>

        </div>

        {/* Section 1: Eligible Transactions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#0B3326] font-heading">
                Eligible Transactions for Liquidity
              </h2>
              <p className="text-xs text-[#566861]">
                Request advances up to 85% of order value backed by verified Agrolnk trade agreements
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {eligibleOrders.map((order) => {
              const existingRequest = getFinancingRequestForOrder(order.orderNumber);

              return (
                <Card key={order.id} className="p-5 bg-white border border-[#E5EDE8] shadow-xs space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="dark" size="sm">
                        {order.orderNumber}
                      </Badge>
                      <span className="text-xs text-[#566861]">
                        {order.state || 'Tamil Nadu'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-[#14211D]">
                        {order.commodity} ({order.quantity} {order.unit})
                      </h4>
                      <p className="text-xs text-[#566861] mt-0.5">
                        Buyer: {order.buyerName || 'Ananya Agro Foods'}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] flex items-center justify-between">
                      <span className="text-xs text-[#566861] font-medium">Transaction Value:</span>
                      <span className="text-base font-extrabold text-[#0B3326]">
                        ₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E5EDE8]">
                    {existingRequest ? (
                      <div className="flex items-center justify-between gap-2">
                        <FinancingStatusBadge status={existingRequest.status} size="sm" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRequestForReview(existingRequest)}
                          className="text-xs font-bold text-[#0B3326] hover:bg-[#F2FBF6] cursor-pointer"
                        >
                          View Status →
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="accent"
                        size="sm"
                        onClick={() => setSelectedOrderForFinancing(order)}
                        icon={Landmark}
                        iconPosition="left"
                        className="w-full font-bold text-xs py-2.5 shadow-xs cursor-pointer"
                      >
                        Request Financing
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Section 2: Active Financing Requests */}
        <div className="space-y-4 pt-4 border-t border-[#E5EDE8]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#0B3326] font-heading">
                My Financing Requests & Facilities ({financingRequests.length})
              </h2>
              <p className="text-xs text-[#566861]">
                Real-time status of your underwriting and liquidity disbursements
              </p>
            </div>
          </div>

          {financingRequests.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {financingRequests.map((request) => (
                <FinancingCard
                  key={request.id}
                  request={request}
                  viewerRole="farmer"
                  onView={(item) => setSelectedRequestForReview(item)}
                />
              ))}
            </div>
          ) : (
            <Card className="p-10 text-center border-2 border-dashed border-[#E5EDE8] rounded-3xl space-y-2">
              <Landmark className="w-8 h-8 text-[#10B981] mx-auto" />
              <h4 className="text-sm font-bold text-[#0B3326]">No financing requests yet</h4>
              <p className="text-xs text-[#566861]">
                Select any eligible order above to request working capital liquidity.
              </p>
            </Card>
          )}
        </div>

      </div>

      {/* Financing Request Modal */}
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

      {/* Request Inspection Modal */}
      {selectedRequestForReview && (
        <FinancingReviewModal
          request={selectedRequestForReview}
          viewerRole="farmer"
          onClose={() => setSelectedRequestForReview(null)}
          onStatusUpdated={() => loadData()}
        />
      )}
    </DashboardLayout>
  );
}
