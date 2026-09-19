import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import OrderCard from '../../components/orders/OrderCard';
import OrderRow from '../../components/orders/OrderRow';
import OrderTimeline from '../../components/orders/OrderTimeline';
import OrderSummary from '../../components/orders/OrderSummary';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Pagination from '../../components/ui/Pagination';
import ViewModeToggle from '../../components/ui/ViewModeToggle';
import FinancingRequestModal from '../../components/financing/FinancingRequestModal';
import FinancingReviewModal from '../../components/financing/FinancingReviewModal';
import BorrowerTermAcceptanceModal from '../../components/financing/BorrowerTermAcceptanceModal';
import DeliveryDetailModal from '../../components/delivery/DeliveryDetailModal';
import BuyerInspectionModal from '../../components/inspection/BuyerInspectionModal';
import {
  ShoppingBag,
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  Compass,
  ArrowRight,
  X,
  CreditCard,
  Truck,
  ClipboardCheck,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';
import { getBuyerOrders, confirmOrderReceipt } from '../../utils/orders';
import { confirmBuyerReceipt } from '../../utils/deliveries';
import { showGlobalLoader, hideGlobalLoader } from '../../context/LoadingContext';
import { subscribeToCrossTabSync } from '../../utils/syncChannel';

export default function BuyerOrders({ currentUser, onNavigate, navState }) {
  const user = currentUser || { name: 'Buyer', id: '', role: 'buyer' };
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedOrder, setSelectedOrder] = useState(navState?.newOrder || null);
  const [isUpdating, setIsUpdating] = useState(false);

  // In-order financing modals
  const [orderForFinancing, setOrderForFinancing] = useState(null);
  const [requestForReview, setRequestForReview] = useState(null);
  const [selectedOfferForAcceptance, setSelectedOfferForAcceptance] = useState(null);

  // In-order delivery modal
  const [deliveryForDetail, setDeliveryForDetail] = useState(null);

  // In-order physical arrival inspection & acceptance modal
  const [orderForInspection, setOrderForInspection] = useState(null);

  const fetchOrders = async (showFlash = false) => {
    if (showFlash) {
      showGlobalLoader('Loading Orders...', 'Fetching procurement records & escrow agreements...');
    }
    try {
      const data = await getBuyerOrders(user.id, user);
      setOrders(data || []);
      if (selectedOrder) {
        const updated = (data || []).find((o) => o.id === selectedOrder.id || o.orderNumber === selectedOrder.orderNumber);
        if (updated) setSelectedOrder(updated);
      }
    } catch (err) {
      console.error('Error fetching buyer orders:', err);
    } finally {
      if (showFlash) {
        hideGlobalLoader();
      }
    }
  };

  useEffect(() => {
    fetchOrders(true);

    const handleUpdated = (payload) => {
      const item = payload?.data || payload?.detail;
      if (item && (item.id || item.orderNumber)) {
        setOrders((prev) =>
          prev.map((o) => (o.id === item.id || o.orderNumber === item.orderNumber ? { ...o, ...item } : o))
        );
        setSelectedOrder((prev) =>
          prev && (prev.id === item.id || prev.orderNumber === item.orderNumber) ? { ...prev, ...item } : prev
        );
      }
      fetchOrders(false);
    };

    const unsubscribeCrossTab = subscribeToCrossTabSync((msg) => {
      if (msg.domain === 'orders' || msg.domain === 'deliveries' || msg.domain === 'financing') {
        handleUpdated(msg);
      }
    });

    window.addEventListener('agrolnk_orders_updated', handleUpdated);
    window.addEventListener('agrolnk_order_updated', handleUpdated);
    window.addEventListener('agrolnk_deliveries_updated', handleUpdated);
    window.addEventListener('agrolnk_delivery_updated', handleUpdated);
    window.addEventListener('agrolnk_financing_updated', handleUpdated);
    window.addEventListener('storage', handleUpdated);

    return () => {
      hideGlobalLoader();
      unsubscribeCrossTab();
      window.removeEventListener('agrolnk_orders_updated', handleUpdated);
      window.removeEventListener('agrolnk_order_updated', handleUpdated);
      window.removeEventListener('agrolnk_deliveries_updated', handleUpdated);
      window.removeEventListener('agrolnk_delivery_updated', handleUpdated);
      window.removeEventListener('agrolnk_financing_updated', handleUpdated);
      window.removeEventListener('storage', handleUpdated);
    };
  }, [user.id, user.email, user.name]);

  const safeOrders = Array.isArray(orders) ? orders : [];

  const tabs = [
    { id: 'all', label: 'All Orders', count: safeOrders.length },
    {
      id: 'pending',
      label: 'Pending',
      count: safeOrders.filter((o) => o.status === 'pending' || o.status === 'order_placed').length,
    },
    {
      id: 'confirmed',
      label: 'In Progress',
      count: safeOrders.filter((o) => o.status === 'confirmed' || o.status === 'ready_for_delivery' || o.status === 'dispatched' || o.status === 'in_transit' || o.status === 'delivered').length,
    },
    {
      id: 'completed',
      label: 'Completed',
      count: safeOrders.filter((o) => o.status === 'completed').length,
    },
  ];

  const [viewMode, setViewMode] = useState('row'); // 'grid' | 'row'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const filteredOrders = safeOrders.filter((o) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return o.status === 'pending' || o.status === 'order_placed';
    if (activeTab === 'confirmed')
      return o.status === 'confirmed' || o.status === 'ready_for_delivery' || o.status === 'dispatched' || o.status === 'in_transit' || o.status === 'delivered';
    if (activeTab === 'completed')
      return o.status === 'completed';
    return true;
  });

  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const isBuyerArrivalConfirmed = (ord) => {
    if (!ord) return false;
    if (ord.buyerConfirmedArrival || ord.buyerArrivalVerified || ord.status === 'completed') return true;
    if (typeof window !== 'undefined') {
      if (ord.id && localStorage.getItem(`agrolnk_buyer_verified_${ord.id}`) === 'true') return true;
      if (ord.orderNumber && localStorage.getItem(`agrolnk_buyer_verified_${ord.orderNumber}`) === 'true') return true;
    }
    return false;
  };

  const handleConfirmOrderReceipt = async (orderOrDelivery) => {
    const orderKey = orderOrDelivery?.id || orderOrDelivery?.orderNumber;
    try {
      showGlobalLoader('Confirming Arrival...', 'Logging arrival verification & notifying AgroLnk Admin...');
      if (typeof window !== 'undefined') {
        if (orderOrDelivery?.id) localStorage.setItem(`agrolnk_buyer_verified_${orderOrDelivery.id}`, 'true');
        if (orderOrDelivery?.orderNumber) localStorage.setItem(`agrolnk_buyer_verified_${orderOrDelivery.orderNumber}`, 'true');
        if (selectedOrder?.id) localStorage.setItem(`agrolnk_buyer_verified_${selectedOrder.id}`, 'true');
        if (selectedOrder?.orderNumber) localStorage.setItem(`agrolnk_buyer_verified_${selectedOrder.orderNumber}`, 'true');
      }
      await confirmOrderReceipt(orderKey);
      try {
        await confirmBuyerReceipt(orderKey);
      } catch {}
      await fetchOrders();
      setSelectedOrder((prev) => (prev ? {
        ...prev,
        status: 'delivered',
        adminVerificationStatus: 'pending',
        buyerConfirmedArrival: true,
        buyerArrivalVerified: true
      } : null));
    } catch (err) {
      console.error('Error confirming order arrival:', err);
    } finally {
      hideGlobalLoader();
    }
  };

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8 text-left">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <button
              onClick={() => onNavigate('buyer-dashboard')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#566861] hover:text-[#0B3326] transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              My Procurement Orders
            </h1>
            <p className="text-xs sm:text-sm text-[#566861]">
              Track purchase agreements, live physical dispatch milestones, and confirm produce delivery.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="sm"
              icon={Truck}
              iconPosition="left"
              onClick={() => onNavigate('buyer-deliveries')}
              className="flex-1 sm:flex-initial text-xs font-bold justify-center"
            >
              Inbound Deliveries
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={CreditCard}
              iconPosition="left"
              onClick={() => onNavigate('buyer-financing')}
              className="flex-1 sm:flex-initial text-xs font-bold justify-center"
            >
              Trade Credit
            </Button>
            <Button
              variant="accent"
              size="sm"
              icon={Compass}
              iconPosition="left"
              onClick={() => onNavigate('buyer-marketplace')}
              className="w-full sm:w-auto font-bold py-2 px-4 shadow-xs cursor-pointer text-xs justify-center"
            >
              Marketplace
            </Button>
          </div>
        </div>

        {/* Filter Tabs & View Mode Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5EDE8] pb-1">
          <div className="flex items-center gap-2 overflow-x-auto">
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
                      isActive
                        ? 'bg-[#10B981] text-white'
                        : 'bg-[#F8FAF8] text-[#566861]'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        {/* Orders List Content */}
        {filteredOrders.length > 0 ? (
          <div className="space-y-6">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {paginatedOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    viewerRole="buyer"
                    onView={(item) => setSelectedOrder(item)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedOrders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    viewerRole="buyer"
                    onView={(item) => setSelectedOrder(item)}
                  />
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredOrders.length}
              pageSize={pageSize}
            />
          </div>
        ) : (
          <Card className="p-12 text-center border-2 border-dashed border-[#E5EDE8] rounded-3xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center mx-auto">
              <ShoppingBag className="w-6 h-6 text-[#10B981]" />
            </div>
            <h3 className="text-base font-bold text-[#0B3326] font-heading">
              No {activeTab} orders found
            </h3>
            <p className="text-xs text-[#566861] max-w-sm mx-auto">
              Browse available produce lots in the marketplace and place your first direct order.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              {activeTab !== 'all' && (
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setActiveTab('all')}
                >
                  View All Orders
                </Button>
              )}
              <Button
                variant="primary"
                size="md"
                onClick={() => onNavigate('buyer-marketplace')}
                icon={Compass}
              >
                Browse Marketplace
              </Button>
            </div>
          </Card>
        )}

      </div>

      {/* Order Inspection Modal for Buyer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs p-4 sm:p-6 flex min-h-full items-start justify-center">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-[#E5EDE8] shadow-2xl space-y-6 text-left my-6 animate-in fade-in zoom-in-95 duration-200 relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-[#0B3326] font-heading">
                  Order Tracking: {selectedOrder.orderNumber}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Summary Spec with In-Order Delivery and Quality Inspection */}
            <OrderSummary
              order={selectedOrder}
              viewerRole="buyer"
              onRequestFinancing={(ord) => setOrderForFinancing(ord)}
              onViewFinancing={(req) => {
                if (req?.status === 'offer_received') {
                  setSelectedOfferForAcceptance(req);
                } else {
                  setRequestForReview(req);
                }
              }}
              onViewDelivery={(dlv) => setDeliveryForDetail(dlv)}
              onConfirmReceipt={(dlv) => handleConfirmOrderReceipt(dlv)}
              onInspectQuality={(ord) => setOrderForInspection(ord)}
            />

            {/* Action Bar when Delivered */}
            {selectedOrder.status === 'delivered' ? (
              isBuyerArrivalConfirmed(selectedOrder) ? (
                <div className="p-4 sm:p-5 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] space-y-3 shadow-sm text-left">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="accent" size="sm">
                        ✓ Arrival Verified by You
                      </Badge>
                      <Badge variant="amber" size="sm">
                        Awaiting Admin Call
                      </Badge>
                    </div>
                    <span className="text-[11px] text-[#34D399]">
                      100% Escrow Protected
                    </span>
                  </div>

                  <p className="text-xs text-white/90 leading-relaxed">
                    You have verified consignment arrival. AgroLnk Operations will make a quick call to your phone before releasing payment to the farmer.
                  </p>

                  <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-white/10 text-xs">
                    <span className="flex items-center gap-1.5 text-[#A7F3D0] text-[11px]">
                      <ShieldCheck className="w-4 h-4 text-[#34D399] shrink-0" />
                      Escrow is protected in bank trust account
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setOrderForInspection(selectedOrder)}
                      icon={ClipboardCheck}
                      iconPosition="left"
                      className="text-xs font-bold py-1 px-3 bg-white/10 text-white hover:bg-white/20 border-white/20 cursor-pointer shrink-0"
                    >
                      Inspect Assay Quality
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 sm:p-5 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] space-y-3 shadow-sm text-left">
                  <div className="space-y-1 w-full">
                    <span className="font-bold text-xs text-[#34D399] uppercase tracking-wider block">
                      Consignment Arrived at Destination
                    </span>
                    <p className="text-xs text-white/90 leading-relaxed">
                      Please verify produce and confirm arrival. (Escrow will only be released after AgroLnk calls you to confirm satisfaction).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-1">
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => setOrderForInspection(selectedOrder)}
                      icon={ClipboardCheck}
                      iconPosition="left"
                      className="w-full justify-center font-bold py-2.5 px-4 bg-white/10 text-white hover:bg-white/20 border-white/20 shadow-xs cursor-pointer text-xs"
                    >
                      Inspect Quality
                    </Button>
                    <Button
                      variant="accent"
                      size="md"
                      onClick={() => handleConfirmOrderReceipt(selectedOrder)}
                      icon={CheckCircle2}
                      iconPosition="left"
                      className="w-full justify-center font-bold py-2.5 px-4 shadow-xs cursor-pointer text-xs"
                    >
                      ✓ Confirm Goods Received
                    </Button>
                  </div>
                </div>
              )
            ) : selectedOrder.status !== 'completed' && (
              <div className="p-3.5 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-[#34D399] uppercase tracking-wider block text-[10px]">
                    Status
                  </span>
                  <span className="text-white/80">
                    {(selectedOrder.status === 'pending' || selectedOrder.status === 'order_placed') &&
                      'Escrow locked. Waiting for Farmer to confirm order.'}
                    {selectedOrder.status === 'confirmed' &&
                      'Order confirmed. Carrier dispatch is being scheduled.'}
                    {selectedOrder.status === 'ready_for_delivery' || selectedOrder.status === 'in_transit' &&
                      'Consignment is in transit on vehicle to your facility.'}
                  </span>
                </div>

                <Badge variant="accent" size="sm">
                  100% Escrow Secured
                </Badge>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Buyer Quality Assay Inspection Modal */}
      {orderForInspection && (
        <BuyerInspectionModal
          order={orderForInspection}
          currentUser={user}
          onClose={() => setOrderForInspection(null)}
          onSuccess={(record) => {
            fetchOrders();
            if (record.status === 'passed') {
              handleConfirmOrderReceipt(orderForInspection);
            }
          }}
        />
      )}

      {/* Borrower Term Sheet Review & Confirmation Modal */}
      {selectedOfferForAcceptance && (
        <BorrowerTermAcceptanceModal
          isOpen={!!selectedOfferForAcceptance}
          request={selectedOfferForAcceptance}
          onClose={() => setSelectedOfferForAcceptance(null)}
          onUpdated={() => {
            fetchOrders();
            setSelectedOfferForAcceptance(null);
          }}
        />
      )}

      {/* In-order Credit Request Modal */}
      {orderForFinancing && (
        <FinancingRequestModal
          order={orderForFinancing}
          currentUser={user}
          onClose={() => setOrderForFinancing(null)}
          onSuccess={(req) => {
            fetchOrders();
            setRequestForReview(req);
          }}
        />
      )}

      {/* In-order Financing Review Modal */}
      {requestForReview && (
        <FinancingReviewModal
          request={requestForReview}
          viewerRole="buyer"
          onClose={() => setRequestForReview(null)}
          onStatusUpdated={() => fetchOrders()}
        />
      )}

      {/* In-order Delivery Detail Modal */}
      {deliveryForDetail && (
        <DeliveryDetailModal
          delivery={deliveryForDetail}
          viewerRole="buyer"
          currentUser={user}
          onClose={() => setDeliveryForDetail(null)}
          onStatusUpdated={() => fetchOrders()}
        />
      )}
    </DashboardLayout>
  );
}
