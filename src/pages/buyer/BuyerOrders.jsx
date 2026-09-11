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
  AlertTriangle
} from 'lucide-react';
import { getBuyerOrders, confirmOrderReceipt } from '../../utils/orders';
import { confirmBuyerReceipt } from '../../utils/deliveries';
import { showGlobalLoader, hideGlobalLoader } from '../../context/LoadingContext';

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

  // In-order inspection modal
  const [orderForInspection, setOrderForInspection] = useState(null);

  const fetchOrders = async (showFlash = false) => {
    if (showFlash) {
      showGlobalLoader('Loading Procurement Agreements...', 'Fetching order contracts & delivery OTP milestones...');
    }
    try {
      const data = await getBuyerOrders(user.id);
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
    return () => {
      hideGlobalLoader();
    };
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
      label: 'In Progress',
      count: safeOrders.filter((o) => o.status === 'confirmed' || o.status === 'ready_for_delivery' || o.status === 'dispatched' || o.status === 'in_transit' || o.status === 'delivered').length,
    },
    {
      id: 'completed',
      label: 'Completed',
      count: safeOrders.filter((o) => o.status === 'completed').length,
    },
  ];

  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'row'
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

  const handleConfirmOrderReceipt = async (orderOrDelivery) => {
    const orderKey = orderOrDelivery?.id || orderOrDelivery?.orderNumber;
    try {
      await confirmOrderReceipt(orderKey);
      try {
        await confirmBuyerReceipt(orderKey);
      } catch {}
      await fetchOrders();
      setSelectedOrder((prev) => (prev ? { ...prev, status: 'completed' } : null));
    } catch (err) {
      console.error('Error confirming order receipt:', err);
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

            {/* Order Summary Spec with In-Order Delivery and Quality Inspection */}
            <OrderSummary
              order={selectedOrder}
              viewerRole="buyer"
              onRequestFinancing={(ord) => setOrderForFinancing(ord)}
              onViewFinancing={(req) => setRequestForReview(req)}
              onViewDelivery={(dlv) => setDeliveryForDetail(dlv)}
              onConfirmReceipt={(dlv) => handleConfirmOrderReceipt(dlv)}
              onInspectQuality={(ord) => setOrderForInspection(ord)}
            />

            {/* Action Bar when Delivered */}
            {selectedOrder.status === 'delivered' ? (
              <div className="p-5 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-0.5 text-xs">
                  <span className="font-bold text-[#34D399] uppercase tracking-wider block">
                    Consignment Arrived at Destination
                  </span>
                  <span className="text-white/80">
                    Verify quality assay & weight or confirm receipt to complete order and release escrow.
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setOrderForInspection(selectedOrder)}
                    icon={ClipboardCheck}
                    iconPosition="left"
                    className="w-full sm:w-auto font-bold py-2.5 px-4 bg-white/10 text-white hover:bg-white/20 border-white/20 shadow-xs cursor-pointer"
                  >
                    Inspect Quality
                  </Button>
                  <Button
                    variant="accent"
                    size="md"
                    onClick={() => handleConfirmOrderReceipt(selectedOrder)}
                    icon={CheckCircle2}
                    iconPosition="left"
                    className="w-full sm:w-auto font-bold py-2.5 px-6 shadow-xs cursor-pointer"
                  >
                    Confirm & Release Escrow
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[#34D399] uppercase tracking-wider block">
                    Fulfillment Status & Next Step
                  </span>
                  <span className="text-xs text-white/80">
                    {(selectedOrder.status === 'pending' || selectedOrder.status === 'order_placed') &&
                      'Your escrow payment is safely locked. Awaiting Farmer to click "Confirm Order".'}
                    {selectedOrder.status === 'confirmed' &&
                      'Farmer has confirmed the trade agreement. Carrier logistics dispatch is being arranged.'}
                    {selectedOrder.status === 'ready_for_delivery' &&
                      'Consignment is with carrier and in transit to your destination facility.'}
                    {selectedOrder.status === 'completed' &&
                      'Order is 100% completed and settled.'}
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
