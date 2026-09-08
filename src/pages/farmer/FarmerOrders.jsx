import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import OrderCard from '../../components/orders/OrderCard';
import OrderTimeline from '../../components/orders/OrderTimeline';
import OrderSummary from '../../components/orders/OrderSummary';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import FinancingRequestModal from '../../components/financing/FinancingRequestModal';
import FinancingReviewModal from '../../components/financing/FinancingReviewModal';
import CreateDeliveryModal from '../../components/delivery/CreateDeliveryModal';
import DeliveryDetailModal from '../../components/delivery/DeliveryDetailModal';
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
  Info
} from 'lucide-react';
import { getFarmerOrders, updateOrderStatus } from '../../utils/orders';
import { getDeliveryForOrder } from '../../utils/deliveries';

export default function FarmerOrders({ currentUser, onNavigate }) {
  const user = currentUser || { name: 'Sakthi Vel', id: 'usr_farmer_01', role: 'farmer' };
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // In-order financing modals
  const [orderForFinancing, setOrderForFinancing] = useState(null);
  const [requestForReview, setRequestForReview] = useState(null);

  // In-order delivery modals
  const [orderForDelivery, setOrderForDelivery] = useState(null);
  const [deliveryForDetail, setDeliveryForDetail] = useState(null);

  const fetchDeliveryForSelectedOrder = async (order) => {
    if (!order) {
      setSelectedDelivery(null);
      return;
    }
    try {
      const dlv = await getDeliveryForOrder(order.orderNumber || order.id);
      setSelectedDelivery(dlv || null);
    } catch (err) {
      console.warn('Error loading linked delivery for order:', err);
      setSelectedDelivery(null);
    }
  };

  const fetchOrders = async () => {
    try {
      const data = await getFarmerOrders(user.id);
      setOrders(data || []);
      if (selectedOrder) {
        const updated = (data || []).find((o) => o.id === selectedOrder.id || o.orderNumber === selectedOrder.orderNumber);
        if (updated) {
          setSelectedOrder(updated);
          fetchDeliveryForSelectedOrder(updated);
        }
      }
    } catch (err) {
      console.error('Error fetching farmer orders:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user.id]);

  useEffect(() => {
    if (selectedOrder) {
      fetchDeliveryForSelectedOrder(selectedOrder);
    } else {
      setSelectedDelivery(null);
    }
  }, [selectedOrder?.id, selectedOrder?.orderNumber, selectedOrder?.status]);

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
      label: 'Confirmed',
      count: safeOrders.filter((o) => o.status === 'confirmed' || o.status === 'ready_for_delivery' || o.status === 'dispatched' || o.status === 'in_transit').length,
    },
    {
      id: 'completed',
      label: 'Completed',
      count: safeOrders.filter((o) => o.status === 'completed' || o.status === 'delivered').length,
    },
  ];

  const filteredOrders = safeOrders.filter((o) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return o.status === 'pending' || o.status === 'order_placed';
    if (activeTab === 'confirmed')
      return o.status === 'confirmed' || o.status === 'ready_for_delivery' || o.status === 'dispatched' || o.status === 'in_transit';
    if (activeTab === 'completed')
      return o.status === 'completed' || o.status === 'delivered';
    return true;
  });

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

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={Truck}
              iconPosition="left"
              onClick={() => onNavigate('farmer-deliveries')}
              className="text-xs font-bold"
            >
              Deliveries Desk
            </Button>
            <Badge variant="emerald" size="md">
              {orders.filter((o) => o.status === 'pending').length} Pending Action
            </Badge>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#E5EDE8]">
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

        {/* Orders List Grid */}
        {filteredOrders.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                viewerRole="farmer"
                onView={(item) => setSelectedOrder(item)}
              />
            ))}
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
              onViewFinancing={(req) => setRequestForReview(req)}
              onArrangeDelivery={(ord) => setOrderForDelivery(ord)}
              onViewDelivery={(dlv) => setDeliveryForDetail(dlv)}
            />

            {/* 5-Step Status Progression Timeline */}
            <div className="p-6 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-4">
              <h4 className="text-xs font-bold text-[#0B3326] uppercase tracking-wider">
                Order Lifecycle Timeline
              </h4>
              <OrderTimeline currentStatus={selectedOrder.status} />
            </div>

            {/* Farmer Lifecycle Action Card */}
            {(() => {
              const hasPendingTransport =
                selectedDelivery &&
                (selectedDelivery.status === 'transport_requested' || selectedDelivery.status === 'pending');
              const isTransportAssigned =
                selectedDelivery &&
                ['assigned', 'picked_up', 'in_transit'].includes(selectedDelivery.status);

              return (
                <div className="p-5 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] shadow-md space-y-3.5">
                  {/* Top Row: Title with Hover Tooltip */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="relative group inline-flex items-center gap-1.5 cursor-help">
                      <span className="text-xs font-bold text-[#34D399] uppercase tracking-wider">
                        Seller Fulfillment Options
                      </span>
                      <Info className="w-3.5 h-3.5 text-[#34D399]/80 group-hover:text-[#34D399] transition-colors" />

                      {/* Floating Tooltip Bubble */}
                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:flex flex-col w-72 sm:w-80 p-3 rounded-2xl bg-[#061B14] text-[#DCFCE7] text-[11px] leading-relaxed shadow-2xl border border-[#14624A] z-50 pointer-events-none animate-in fade-in zoom-in-95">
                        <span className="font-medium">
                          {(selectedOrder.status === 'pending' || selectedOrder.status === 'order_placed') &&
                            (hasPendingTransport
                              ? 'Transport request has been broadcast. Transporter acceptance is pending.'
                              : isTransportAssigned
                              ? 'Transporter has confirmed the trip and will arrive for pickup.'
                              : 'Buyer escrow is secured. Choose to request a platform freight carrier or deliver using your own vehicle.')}
                          {selectedOrder.status === 'in_transit' &&
                            'Consignment is in transit. Click below once dropped off at the buyer terminal.'}
                          {selectedOrder.status === 'delivered' &&
                            'Consignment reached destination. Awaiting buyer quality check & receipt release.'}
                          {selectedOrder.status === 'completed' &&
                            'Order is 100% completed and escrow payout has been released.'}
                          {selectedOrder.status === 'cancelled' &&
                            'This order agreement has been cancelled.'}
                        </span>
                        <div className="absolute left-6 -bottom-1 w-2.5 h-2.5 bg-[#061B14] border-r border-b border-[#14624A] transform rotate-45" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Dynamic Pending Tag: Shown after submission, removed after transporter confirmation */}
                      {hasPendingTransport && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-900/60 px-2.5 py-0.5 rounded-full border border-amber-500/50 animate-pulse">
                          <Clock className="w-3 h-3 text-amber-400" />
                          Transport Request Pending
                        </span>
                      )}
                      {isTransportAssigned && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-300 bg-blue-900/60 px-2.5 py-0.5 rounded-full border border-blue-400/50">
                          <Truck className="w-3 h-3 text-blue-300" />
                          Transport Confirmed
                        </span>
                      )}
                      {(selectedOrder.status === 'pending' || selectedOrder.status === 'order_placed') && (
                        <span className="text-[11px] text-[#34D399] font-medium bg-[#0F4A37] px-2.5 py-0.5 rounded-full border border-[#14624A]">
                          Escrow Locked
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons Row Below */}
                  <div className="space-y-3 pt-0.5">
                    {(selectedOrder.status === 'pending' || selectedOrder.status === 'order_placed') && (
                      <>
                        {/* 1. If transport request is submitted and pending, do not allow clicking request again */}
                        {hasPendingTransport ? (
                          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                                  Transport Request Active ({selectedDelivery.deliveryNumber})
                                </span>
                              </div>
                              <p className="text-[11px] text-amber-100/80">
                                Request broadcast to carrier network. Waiting for a transporter to accept your load.
                              </p>
                            </div>

                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setDeliveryForDetail(selectedDelivery)}
                              className="text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border-white/20 py-1.5 shrink-0"
                            >
                              View Request
                            </Button>
                          </div>
                        ) : isTransportAssigned ? (
                          /* 2. After transport is confirmed, show assigned details */
                          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-blue-300 flex items-center gap-1.5">
                                  <Truck className="w-3.5 h-3.5 text-blue-300" />
                                  Transporter Confirmed: {selectedDelivery.transporterName || 'Assigned Carrier'}
                                </span>
                              </div>
                              <p className="text-[11px] text-blue-100/80">
                                Vehicle: <strong className="text-white font-mono">{selectedDelivery.vehicleNumber || 'Assigned'}</strong> • Driver: {selectedDelivery.driverName || 'Driver'} ({selectedDelivery.driverPhone || 'Contact'})
                              </p>
                            </div>

                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setDeliveryForDetail(selectedDelivery)}
                              className="text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border-white/20 py-1.5 shrink-0"
                            >
                              Trip & Pickup OTP
                            </Button>
                          </div>
                        ) : (
                          /* 3. When not yet requested, show both initial buttons */
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Button
                              variant="secondary"
                              size="md"
                              onClick={() => setOrderForDelivery(selectedOrder)}
                              icon={Truck}
                              iconPosition="left"
                              className="w-full font-bold py-3 px-4 bg-white/10 hover:bg-white/20 text-white border-white/20 cursor-pointer text-xs justify-center shadow-xs"
                            >
                              Request Platform Carrier
                            </Button>

                            <Button
                              variant="accent"
                              size="md"
                              disabled={isUpdating}
                              onClick={() => handleAdvanceStatus('in_transit')}
                              icon={Check}
                              iconPosition="left"
                              className="w-full font-bold py-3 px-4 shadow-md cursor-pointer text-xs justify-center"
                            >
                              {isUpdating ? 'Dispatching...' : 'Self-Arranged Transport'}
                            </Button>
                          </div>
                        )}
                      </>
                    )}

                    {selectedOrder.status === 'in_transit' && (
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
                    )}

                    {selectedOrder.status === 'delivered' && (
                      <div className="text-center p-3 rounded-xl bg-[#0F4A37] border border-[#14624A]">
                        <Badge variant="teal" size="md">
                          ✓ Delivered (Buyer Verifying Quality)
                        </Badge>
                      </div>
                    )}

                    {selectedOrder.status === 'completed' && (
                      <div className="text-center p-3 rounded-xl bg-[#0F4A37] border border-[#14624A]">
                        <Badge variant="accent" size="md">
                          ✓ Completed & Escrow Settled
                        </Badge>
                      </div>
                    )}

                    {selectedOrder.status === 'cancelled' && (
                      <div className="text-center p-3 rounded-xl bg-[#0F4A37] border border-[#14624A]">
                        <Badge variant="dark" size="md">
                          ✕ Order Cancelled
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      )}

      {/* In-order Financing Request Modal */}
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
          viewerRole="farmer"
          onClose={() => setRequestForReview(null)}
          onStatusUpdated={() => fetchOrders()}
        />
      )}

      {/* In-order Create Delivery Modal */}
      {orderForDelivery && (
        <CreateDeliveryModal
          order={orderForDelivery}
          currentUser={user}
          onClose={() => setOrderForDelivery(null)}
          onSuccess={(dlv) => {
            fetchOrders();
            setSelectedDelivery(dlv);
            setOrderForDelivery(null);
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
          onStatusUpdated={() => {
            fetchOrders();
            if (selectedOrder) fetchDeliveryForSelectedOrder(selectedOrder);
          }}
        />
      )}
    </DashboardLayout>
  );
}
