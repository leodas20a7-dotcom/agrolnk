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
import CreateDeliveryModal from '../../components/delivery/CreateDeliveryModal';
import DeliveryDetailModal from '../../components/delivery/DeliveryDetailModal';
import SelfTransportModal from '../../components/delivery/SelfTransportModal';
import OrderReceiptModal from '../../components/orders/OrderReceiptModal';
import {
  ShoppingBag,
  ArrowLeft,
  Check,
  Truck,
  CheckCircle2,
  Clock,
  X,
  Package,
  AlertCircle,
  Landmark,
  Info,
  Receipt
} from 'lucide-react';
import { getFarmerOrders, updateOrderStatus } from '../../utils/orders';
import { getDeliveryForOrder } from '../../utils/deliveries';
import { showGlobalLoader, hideGlobalLoader } from '../../context/LoadingContext';
import { subscribeToCrossTabSync } from '../../utils/syncChannel';

export default function FarmerOrders({ currentUser, onNavigate }) {
  const user = currentUser || { name: 'Farmer', id: '', role: 'farmer' };
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('agrolnk_farmer_orders_viewmode') || 'rows';
    } catch {
      return 'rows';
    }
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('agrolnk_farmer_orders_viewmode', mode);
    } catch {}
  };

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [linkedDelivery, setLinkedDelivery] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const ITEMS_PER_PAGE = 6;

  // In-order financing modals
  const [orderForFinancing, setOrderForFinancing] = useState(null);
  const [requestForReview, setRequestForReview] = useState(null);
  const [selectedOfferForAcceptance, setSelectedOfferForAcceptance] = useState(null);

  // In-order delivery modals
  const [orderForDelivery, setOrderForDelivery] = useState(null);
  const [orderForSelfTransport, setOrderForSelfTransport] = useState(null);
  const [deliveryForDetail, setDeliveryForDetail] = useState(null);
  const [orderForReceipt, setOrderForReceipt] = useState(null);

  const fetchOrders = async (showFlash = false) => {
    if (showFlash) {
      showGlobalLoader('Loading Procurement Inquiries...', 'Fetching incoming purchase agreements & delivery milestones...');
    }
    try {
      const data = await getFarmerOrders(user.id, user);
      setOrders(data || []);
      if (selectedOrder) {
        const updated = (data || []).find((o) => o.id === selectedOrder.id || o.orderNumber === selectedOrder.orderNumber);
        if (updated) {
          setSelectedOrder(updated);
          const dlv = await getDeliveryForOrder(updated.orderNumber || updated.id);
          setLinkedDelivery(dlv);
        }
      }
    } catch (err) {
      console.error('Error fetching farmer orders:', err);
    } finally {
      if (showFlash) {
        hideGlobalLoader();
      }
    }
  };

  useEffect(() => {
    fetchOrders(true);

    const handleUpdated = (payload) => {
      // Direct optimistic update if matching order is present in payload
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

  useEffect(() => {
    if (selectedOrder) {
      getDeliveryForOrder(selectedOrder.orderNumber || selectedOrder.id).then((dlv) => {
        setLinkedDelivery(dlv);
      });
    } else {
      setLinkedDelivery(null);
    }
  }, [selectedOrder?.id, selectedOrder?.orderNumber]);

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

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setCurrentPage(1);
  };

  const filteredOrders = safeOrders.filter((o) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return o.status === 'pending' || o.status === 'order_placed';
    if (activeTab === 'confirmed')
      return o.status === 'confirmed' || o.status === 'ready_for_delivery' || o.status === 'dispatched' || o.status === 'in_transit' || o.status === 'delivered';
    if (activeTab === 'completed')
      return o.status === 'completed';
    return true;
  });

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE) || 1;
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleAdvanceStatus = async (nextStatus) => {
    if (!selectedOrder) return;
    setIsUpdating(true);
    try {
      await updateOrderStatus(selectedOrder.id, nextStatus);
      await fetchOrders();
      setSelectedOrder((prev) => (prev ? { ...prev, status: nextStatus } : null));
      setIsUpdating(false);
    } catch (err) {
      console.error('Failed to update order status:', err);
      setIsUpdating(false);
    }
  };

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8 text-left">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <button
              onClick={() => onNavigate('farmer-dashboard')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#566861] hover:text-[#0B3326] transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              Orders Received
            </h1>
            <p className="text-xs sm:text-sm text-[#566861]">
              Manage procurement orders, arrange freight dispatch, and track physical delivery fulfillment.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="sm"
              icon={Truck}
              iconPosition="left"
              onClick={() => onNavigate('farmer-deliveries')}
              className="text-xs font-bold w-full sm:w-auto justify-center"
            >
              Deliveries Desk
            </Button>
            <Badge variant="emerald" size="md">
              {safeOrders.filter((o) => o.status === 'pending' || o.status === 'order_placed').length} Pending Action
            </Badge>
          </div>
        </div>

        {/* Tab Filters & View Mode Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-[#E5EDE8]">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
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

          <ViewModeToggle
            viewMode={viewMode}
            onViewModeChange={handleSetViewMode}
          />
        </div>

        {/* Orders Content: Row View vs Card Grid */}
        {filteredOrders.length > 0 ? (
          <div className="space-y-6">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {paginatedOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    viewerRole="farmer"
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
                    viewerRole="farmer"
                    onView={(item) => setSelectedOrder(item)}
                  />
                ))}
              </div>
            )}

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredOrders.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
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
              When buyers purchase your produce lots from the marketplace, incoming agreements will appear here.
            </p>
          </Card>
        )}

      </div>

      {/* Order Inspection & Action Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs p-4 sm:p-6 flex min-h-full items-start justify-center">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-[#E5EDE8] shadow-2xl space-y-6 text-left my-6 animate-in fade-in zoom-in-95 duration-200 relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-[#0B3326] font-heading">
                  Order Management: {selectedOrder.orderNumber}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Summary Spec with In-Order Financing & Delivery */}
            <OrderSummary
              order={selectedOrder}
              viewerRole="farmer"
              onRequestFinancing={(ord) => setOrderForFinancing(ord)}
              onViewFinancing={(req) => {
                if (req?.status === 'offer_sent' || req?.status === 'offer_received') {
                  setSelectedOfferForAcceptance(req);
                } else {
                  setRequestForReview(req);
                }
              }}
              onArrangeDelivery={(ord) => setOrderForDelivery(ord)}
              onViewDelivery={(dlv) => setDeliveryForDetail(dlv)}
            />

            {/* Order Fulfillment & Logistics Actions (Only for active / non-completed states) */}
            {(selectedOrder.status === 'pending' || selectedOrder.status === 'order_placed') && (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-3.5 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0B3326] uppercase tracking-wider flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-[#10B981]" />
                    Delivery & Fulfillment Setup
                  </span>
                  <Badge variant="teal" size="sm">
                    Escrow Locked
                  </Badge>
                </div>

                {/* Case A: Transporter Requested */}
                {linkedDelivery && linkedDelivery.status === 'transport_requested' && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-amber-950 block">
                          Platform Carrier Requested ({linkedDelivery.deliveryNumber})
                        </span>
                        <span className="text-[11px] text-amber-800">
                          Broadcasting load to transport network. Transporter will be assigned shortly.
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setDeliveryForDetail(linkedDelivery)}
                      className="text-xs font-bold py-1.5 px-3 shrink-0 cursor-pointer"
                    >
                      Track Request
                    </Button>
                  </div>
                )}

                {/* Case B: Transporter Assigned */}
                {linkedDelivery && linkedDelivery.status === 'assigned' && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-emerald-950 block">
                          Carrier Assigned: {linkedDelivery.transporterName || 'Platform Transporter'}
                        </span>
                        <span className="text-[11px] text-emerald-800">
                          Vehicle: <strong className="font-mono">{linkedDelivery.vehicleNumber || 'Assigned'}</strong> • Driver: {linkedDelivery.driverName || 'Assigned'}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setDeliveryForDetail(linkedDelivery)}
                      className="text-xs font-bold py-1.5 px-3 shrink-0 cursor-pointer"
                    >
                      View Manifest
                    </Button>
                  </div>
                )}

                {/* Case C: No Transport Selected Yet */}
                {(!linkedDelivery || (linkedDelivery.status !== 'transport_requested' && linkedDelivery.status !== 'assigned' && linkedDelivery.status !== 'in_transit')) && (
                  <div className="space-y-2.5">
                    <p className="text-xs text-[#566861]">
                      Buyer payment is secured in escrow. Choose how to fulfill this shipment:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Button
                        variant="secondary"
                        size="md"
                        onClick={() => setOrderForDelivery(selectedOrder)}
                        icon={Truck}
                        iconPosition="left"
                        className="w-full font-bold py-2.5 px-3 text-xs justify-center cursor-pointer"
                      >
                        Request Platform Carrier
                      </Button>

                      <Button
                        variant="accent"
                        size="md"
                        disabled={isUpdating}
                        onClick={() => setOrderForSelfTransport(selectedOrder)}
                        icon={Check}
                        iconPosition="left"
                        className="w-full font-bold py-2.5 px-3 text-xs justify-center cursor-pointer shadow-sm"
                      >
                        Self-Arranged Transport
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* In Transit Action Card */}
            {selectedOrder.status === 'in_transit' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0B3326] uppercase tracking-wider flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-[#10B981]" />
                    Consignment On The Way
                  </span>
                  <Badge variant="teal" size="sm">
                    In Transit
                  </Badge>
                </div>
                <p className="text-xs text-[#566861]">
                  Once your vehicle or transporter reaches the buyer's destination terminal, confirm delivery below.
                </p>
                <Button
                  variant="accent"
                  size="md"
                  disabled={isUpdating}
                  onClick={() => handleAdvanceStatus('delivered')}
                  icon={CheckCircle2}
                  iconPosition="left"
                  className="w-full font-bold py-3 px-5 shadow-md cursor-pointer text-xs justify-center"
                >
                  {isUpdating ? 'Updating...' : 'Mark as Delivered at Destination'}
                </Button>
              </div>
            )}

            {/* Delivered Status Note */}
            {selectedOrder.status === 'delivered' && (
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-left space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="text-xs font-bold text-emerald-950">
                    Delivered at Destination • Awaiting Final Settlement
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 pl-6 leading-relaxed">
                  Consignment is at the buyer's location. AgroLnk Operations will verify buyer quality inspection and release the escrow payout directly to your registered bank account.
                </p>
              </div>
            )}

            {/* Cancelled Status Note */}
            {selectedOrder.status === 'cancelled' && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-left">
                <span className="text-xs font-bold text-rose-950 block">
                  ✕ Order Cancelled
                </span>
                <p className="text-[11px] text-rose-800 mt-0.5">
                  This order trade agreement was cancelled.
                </p>
              </div>
            )}

          </div>
        </div>
      )}

      {/* In-order Financing Request Modal */}
      {orderForFinancing && (
        <FinancingRequestModal
          order={orderForFinancing}
          currentUser={user}
          onClose={() => setOrderForFinancing(null)}
          onSuccess={() => {
            setOrderForFinancing(null);
            fetchOrders();
          }}
        />
      )}

      {/* In-order Financing Review Modal */}
      {requestForReview && (
        <FinancingReviewModal
          request={requestForReview}
          viewerRole="farmer"
          onClose={() => setRequestForReview(null)}
          onStatusUpdated={() => fetchOrders()}
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

      {/* In-order Create Delivery Modal (Platform Carrier Request) */}
      {orderForDelivery && (
        <CreateDeliveryModal
          order={orderForDelivery}
          currentUser={user}
          onClose={() => setOrderForDelivery(null)}
          onSuccess={(dlv) => {
            setLinkedDelivery(dlv);
            fetchOrders();
            setDeliveryForDetail(dlv);
          }}
        />
      )}

      {/* In-order Self Transport Vehicle Input Modal */}
      {orderForSelfTransport && (
        <SelfTransportModal
          order={orderForSelfTransport}
          currentUser={user}
          onClose={() => setOrderForSelfTransport(null)}
          onSuccess={(dlv) => {
            setLinkedDelivery(dlv);
            fetchOrders();
          }}
        />
      )}

      {/* In-order Delivery Detail Modal */}
      {deliveryForDetail && (
        <DeliveryDetailModal
          delivery={deliveryForDetail}
          viewerRole="farmer"
          currentUser={user}
          onClose={() => setDeliveryForDetail(null)}
          onStatusUpdated={() => fetchOrders()}
        />
      )}

      {/* Official Trade Settlement Receipt Modal for Farmer */}
      {orderForReceipt && (
        <OrderReceiptModal
          isOpen={!!orderForReceipt}
          order={orderForReceipt}
          onClose={() => setOrderForReceipt(null)}
          viewerRole="farmer"
        />
      )}
    </DashboardLayout>
  );
}
