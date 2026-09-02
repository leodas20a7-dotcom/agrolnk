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
  Landmark
} from 'lucide-react';
import { getFarmerOrders, updateOrderStatus } from '../../utils/orders';

export default function FarmerOrders({ currentUser, onNavigate }) {
  const user = currentUser || { name: 'Sakthi Vel', id: 'usr_farmer_01', role: 'farmer' };
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // In-order financing modals
  const [orderForFinancing, setOrderForFinancing] = useState(null);
  const [requestForReview, setRequestForReview] = useState(null);

  // In-order delivery modals
  const [orderForDelivery, setOrderForDelivery] = useState(null);
  const [deliveryForDetail, setDeliveryForDetail] = useState(null);

  const fetchOrders = async () => {
    try {
      const data = await getFarmerOrders(user.id);
      setOrders(data || []);
      if (selectedOrder) {
        const updated = (data || []).find((o) => o.id === selectedOrder.id || o.orderNumber === selectedOrder.orderNumber);
        if (updated) setSelectedOrder(updated);
      }
    } catch (err) {
      console.error('Error fetching farmer orders:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user.id]);

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

  const handleAdvanceStatus = (nextStatus) => {
    if (!selectedOrder) return;
    setIsUpdating(true);
    try {
      updateOrderStatus(selectedOrder.id, nextStatus);
      fetchOrders();
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

            {/* Farmer Lifecycle Action Buttons */}
            <div className="p-5 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-[#34D399] uppercase tracking-wider block">
                  Seller Actions
                </span>
                <span className="text-xs text-white/80">
                  {selectedOrder.status === 'pending' && 'Accept lot agreement to proceed with order.'}
                  {selectedOrder.status === 'confirmed' && 'Prepare produce batch and arrange transporter pickup.'}
                  {selectedOrder.status === 'ready_for_delivery' && 'Confirm load handover to logistics transport.'}
                  {selectedOrder.status === 'delivered' && 'Consignment dropped off at destination. Awaiting buyer verification.'}
                  {selectedOrder.status === 'completed' && 'Order is fully fulfilled and escrow payout settled.'}
                </span>
              </div>

              <div className="shrink-0 w-full sm:w-auto flex items-center gap-2">
                {selectedOrder.status === 'pending' && (
                  <Button
                    variant="accent"
                    size="md"
                    disabled={isUpdating}
                    onClick={() => handleAdvanceStatus('confirmed')}
                    icon={Check}
                    iconPosition="left"
                    className="w-full sm:w-auto font-bold py-2.5 px-5 shadow-xs cursor-pointer"
                  >
                    Confirm Order
                  </Button>
                )}

                {selectedOrder.status === 'confirmed' && (
                  <Button
                    variant="accent"
                    size="md"
                    onClick={() => setOrderForDelivery(selectedOrder)}
                    icon={Truck}
                    iconPosition="left"
                    className="w-full sm:w-auto font-bold py-2.5 px-5 shadow-xs cursor-pointer"
                  >
                    Arrange Delivery
                  </Button>
                )}

                {selectedOrder.status === 'ready_for_delivery' && (
                  <Button
                    variant="accent"
                    size="md"
                    disabled={isUpdating}
                    onClick={() => handleAdvanceStatus('delivered')}
                    icon={CheckCircle2}
                    iconPosition="left"
                    className="w-full sm:w-auto font-bold py-2.5 px-5 shadow-xs cursor-pointer"
                  >
                    Mark as Delivered
                  </Button>
                )}

                {selectedOrder.status === 'delivered' && (
                  <Badge variant="teal" size="md">
                    ✓ Delivered (Buyer Verifying)
                  </Badge>
                )}

                {selectedOrder.status === 'completed' && (
                  <Badge variant="accent" size="md">
                    ✓ Completed & Settled
                  </Badge>
                )}
              </div>
            </div>

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
            setDeliveryForDetail(dlv);
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
    </DashboardLayout>
  );
}
