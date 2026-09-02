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
import DeliveryDetailModal from '../../components/delivery/DeliveryDetailModal';
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
  Truck
} from 'lucide-react';
import { getBuyerOrders, confirmOrderReceipt } from '../../utils/orders';
import { confirmBuyerReceipt } from '../../utils/deliveries';

export default function BuyerOrders({ currentUser, onNavigate, navState }) {
  const user = currentUser || { name: 'Ananya Agro Foods', id: 'usr_buyer_02', role: 'buyer' };
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(navState?.newOrder || null);

  // In-order financing modals
  const [orderForFinancing, setOrderForFinancing] = useState(null);
  const [requestForReview, setRequestForReview] = useState(null);

  // In-order delivery modals
  const [deliveryForDetail, setDeliveryForDetail] = useState(null);

  const fetchOrders = async () => {
    try {
      const data = await getBuyerOrders(user.id);
      setOrders(data || []);
      if (selectedOrder) {
        const updated = (data || []).find((o) => o.id === selectedOrder.id || o.orderNumber === selectedOrder.orderNumber);
        if (updated) setSelectedOrder(updated);
      }
    } catch (err) {
      console.error('Error fetching buyer orders:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user.id]);

  const tabs = [
    { id: 'all', label: 'All Orders', count: orders.length },
    {
      id: 'pending',
      label: 'Pending',
      count: orders.filter((o) => o.status === 'pending').length,
    },
    {
      id: 'confirmed',
      label: 'In Progress',
      count: orders.filter((o) => o.status === 'confirmed' || o.status === 'ready_for_delivery' || o.status === 'delivered').length,
    },
    {
      id: 'completed',
      label: 'Completed',
      count: orders.filter((o) => o.status === 'completed').length,
    },
  ];

  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return o.status === 'pending';
    if (activeTab === 'confirmed')
      return o.status === 'confirmed' || o.status === 'ready_for_delivery' || o.status === 'delivered';
    if (activeTab === 'completed')
      return o.status === 'completed';
    return true;
  });

  const handleConfirmOrderReceipt = (orderOrDelivery) => {
    const orderKey = orderOrDelivery?.orderNumber || orderOrDelivery?.id;
    confirmOrderReceipt(orderKey);
    confirmBuyerReceipt(orderKey);
    fetchOrders();
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

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="md"
              icon={Truck}
              iconPosition="left"
              onClick={() => onNavigate('buyer-deliveries')}
              className="text-xs font-bold"
            >
              Inbound Deliveries
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon={CreditCard}
              iconPosition="left"
              onClick={() => onNavigate('buyer-financing')}
              className="text-xs font-bold"
            >
              Trade Credit
            </Button>
            <Button
              variant="accent"
              size="md"
              icon={Compass}
              iconPosition="left"
              onClick={() => onNavigate('buyer-marketplace')}
              className="font-bold py-2.5 px-5 shadow-xs cursor-pointer text-xs"
            >
              Marketplace
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
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
                viewerRole="buyer"
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
              Browse available produce lots in the marketplace and place your first direct order.
            </p>
            <div className="pt-2">
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

            {/* Order Summary Spec with In-Order Financing & Delivery */}
            <OrderSummary
              order={selectedOrder}
              viewerRole="buyer"
              onRequestFinancing={(ord) => setOrderForFinancing(ord)}
              onViewFinancing={(req) => setRequestForReview(req)}
              onViewDelivery={(dlv) => setDeliveryForDetail(dlv)}
              onConfirmReceipt={(dlv) => handleConfirmOrderReceipt(dlv)}
            />

            {/* 5-Step Status Progression Timeline */}
            <div className="p-6 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-4">
              <h4 className="text-xs font-bold text-[#0B3326] uppercase tracking-wider">
                Real-Time Fulfillment Timeline
              </h4>
              <OrderTimeline currentStatus={selectedOrder.status} />
            </div>

            {/* Action Bar when Delivered */}
            {selectedOrder.status === 'delivered' ? (
              <div className="p-5 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-0.5 text-xs">
                  <span className="font-bold text-[#34D399] uppercase tracking-wider block">
                    Consignment Arrived at Destination
                  </span>
                  <span className="text-white/80">
                    Verify quality and confirm receipt to complete order and release escrow.
                  </span>
                </div>

                <Button
                  variant="accent"
                  size="md"
                  onClick={() => handleConfirmOrderReceipt(selectedOrder)}
                  icon={CheckCircle2}
                  iconPosition="left"
                  className="w-full sm:w-auto font-bold py-2.5 px-6 shadow-xs cursor-pointer"
                >
                  Confirm Receipt
                </Button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[#34D399] uppercase tracking-wider block">
                    Fulfillment Status
                  </span>
                  <span className="text-xs text-white/80">
                    {selectedOrder.status === 'pending' && 'Awaiting farmer lot agreement confirmation.'}
                    {selectedOrder.status === 'confirmed' && 'Farmer has confirmed order. Producer arranging freight pickup.'}
                    {selectedOrder.status === 'ready_for_delivery' && 'Produce is in transit with assigned carrier.'}
                    {selectedOrder.status === 'completed' && 'Order fully fulfilled and escrow payment settled.'}
                  </span>
                </div>

                <Badge variant="accent" size="sm">
                  Escrow Protected
                </Badge>
              </div>
            )}

          </div>
        </div>
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
