import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import DeliveryCard from '../../components/delivery/DeliveryCard';
import DeliveryDetailModal from '../../components/delivery/DeliveryDetailModal';
import DeliveryStatusBadge from '../../components/delivery/DeliveryStatusBadge';
import {
  Truck,
  ArrowLeft,
  ShoppingBag,
  Package,
  Navigation,
  Clock,
  CheckCircle2,
  MapPin,
  Calendar,
  ShieldCheck,
  Compass,
  AlertCircle
} from 'lucide-react';
import { getBuyerOrders } from '../../utils/orders';
import { getBuyerDeliveries, confirmBuyerReceipt } from '../../utils/deliveries';

export default function BuyerDeliveries({ currentUser, onNavigate }) {
  const user = currentUser || { name: 'Ananya Agro Foods', id: 'usr_buyer_02', role: 'buyer' };

  const [orders, setOrders] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [selectedDeliveryForDetail, setSelectedDeliveryForDetail] = useState(null);

  const loadData = () => {
    const buyerOrders = getBuyerOrders(user.id);
    setOrders(buyerOrders);
    const buyerDeliveries = getBuyerDeliveries(user.id);
    setDeliveries(buyerDeliveries);
  };

  useEffect(() => {
    loadData();
  }, [user.id]);

  const inTransitDeliveries = deliveries.filter(
    (d) => d.status === 'in_transit' || d.status === 'picked_up' || d.status === 'assigned'
  );

  const awaitingConfirmationDeliveries = deliveries.filter(
    (d) => d.status === 'delivered'
  );

  const completedDeliveries = deliveries.filter(
    (d) => d.status === 'completed'
  );

  const handleConfirmDirect = (delivery) => {
    confirmBuyerReceipt(delivery.id);
    loadData();
  };

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8 text-left">
        
        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-[#0B3326] text-white border border-[#14624A] shadow-md">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F4A37] text-xs font-semibold text-[#34D399] border border-[#14624A]">
              <Truck className="w-3.5 h-3.5" /> Inbound Logistics & Freight Tracking
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-white tracking-tight">
              Inbound Produce Shipments
            </h1>
            <p className="text-sm sm:text-base text-[#DCFCE7]/90 leading-relaxed">
              Track farmgate consignments, driver live milestones, and confirm produce receipt upon physical delivery.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="md"
              icon={ShoppingBag}
              iconPosition="left"
              onClick={() => onNavigate('buyer-orders')}
              className="font-semibold text-xs border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white cursor-pointer"
            >
              My Orders ({orders.length})
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
          
          {/* In-Transit Shipments */}
          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">In-Transit Consignments</span>
              <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#1E40AF] flex items-center justify-center">
                <Navigation className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
              {inTransitDeliveries.length}
            </div>
            <div className="text-[11px] text-[#566861]">
              Live logistics dispatch in progress
            </div>
          </Card>

          {/* Awaiting Confirmation */}
          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Arrived (Awaiting Verification)</span>
              <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#D97706] font-heading">
              {awaitingConfirmationDeliveries.length}
            </div>
            <div className="text-[11px] text-[#566861]">
              Produce dropped off at destination
            </div>
          </Card>

          {/* Completed & Verified */}
          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Delivered & Settled</span>
              <div className="w-8 h-8 rounded-lg bg-[#EBF5F0] text-[#10B981] flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#10B981] font-heading">
              {completedDeliveries.length}
            </div>
            <div className="text-[11px] text-[#10B981] font-semibold">
              100% Escrow Settled
            </div>
          </Card>

        </div>

        {/* Section 1: Delivered Consignments Requiring Confirmation */}
        {awaitingConfirmationDeliveries.length > 0 && (
          <div className="p-6 rounded-3xl bg-gradient-to-r from-[#FEF3C7]/90 via-[#F2FBF6] to-white border border-[#FDE68A] shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-[#92400E]">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-base font-bold font-heading">
                Action Required: Confirm Produce Receipt
              </h3>
            </div>
            <p className="text-xs text-[#566861]">
              The following produce shipments have arrived at your facility. Please verify quality and confirm receipt to release final escrow payment to the producer.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {awaitingConfirmationDeliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className="p-4 rounded-2xl bg-white border border-[#E5EDE8] flex items-center justify-between gap-3 shadow-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#0B3326]">
                        {delivery.commodity} ({delivery.quantity} {delivery.unit})
                      </span>
                      <Badge variant="emerald" size="sm">
                        {delivery.deliveryNumber}
                      </Badge>
                    </div>
                    <span className="text-xs text-[#566861] block mt-0.5">
                      Carrier: {delivery.transporterName || 'Freight Partner'} • {delivery.vehicleNumber || ''}
                    </span>
                  </div>

                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => handleConfirmDirect(delivery)}
                    icon={CheckCircle2}
                    iconPosition="left"
                    className="text-xs font-bold py-2 shadow-xs cursor-pointer shrink-0"
                  >
                    Confirm Receipt
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 2: Inbound Shipments Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#0B3326] font-heading">
                Inbound Shipments & Consignments ({deliveries.length})
              </h2>
              <p className="text-xs text-[#566861]">
                Real-time tracking of consignments from origin farmgate to your hub
              </p>
            </div>
          </div>

          {deliveries.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {deliveries.map((item) => (
                <DeliveryCard
                  key={item.id}
                  delivery={item}
                  viewerRole="buyer"
                  onView={(d) => setSelectedDeliveryForDetail(d)}
                  onConfirmReceipt={(d) => handleConfirmDirect(d)}
                />
              ))}
            </div>
          ) : (
            <Card className="p-10 text-center border-2 border-dashed border-[#E5EDE8] rounded-3xl space-y-2">
              <Truck className="w-8 h-8 text-[#10B981] mx-auto" />
              <h4 className="text-sm font-bold text-[#0B3326]">No inbound shipments</h4>
              <p className="text-xs text-[#566861]">
                When you purchase produce in the marketplace, freight dispatch updates will appear here.
              </p>
            </Card>
          )}
        </div>

      </div>

      {/* Delivery Inspection Modal */}
      {selectedDeliveryForDetail && (
        <DeliveryDetailModal
          delivery={selectedDeliveryForDetail}
          viewerRole="buyer"
          currentUser={user}
          onClose={() => setSelectedDeliveryForDetail(null)}
          onStatusUpdated={() => loadData()}
        />
      )}
    </DashboardLayout>
  );
}
