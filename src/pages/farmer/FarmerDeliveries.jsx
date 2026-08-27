import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import DeliveryCard from '../../components/delivery/DeliveryCard';
import CreateDeliveryModal from '../../components/delivery/CreateDeliveryModal';
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
  Plus
} from 'lucide-react';
import { getFarmerOrders } from '../../utils/orders';
import { getFarmerDeliveries, getDeliveryForOrder } from '../../utils/deliveries';

export default function FarmerDeliveries({ currentUser, onNavigate, navState }) {
  const user = currentUser || { name: 'Sakthi Vel', id: 'usr_farmer_01', role: 'farmer' };

  const [orders, setOrders] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState(
    navState?.orderForDelivery || null
  );
  const [selectedDeliveryForDetail, setSelectedDeliveryForDetail] = useState(null);

  const loadData = () => {
    const farmerOrders = getFarmerOrders(user.id);
    setOrders(farmerOrders);
    const farmerDeliveries = getFarmerDeliveries(user.id);
    setDeliveries(farmerDeliveries);
  };

  useEffect(() => {
    loadData();
  }, [user.id]);

  // Confirmed orders that need transport
  const confirmedOrdersNeedingTransport = orders.filter(
    (o) => o.status === 'confirmed' || o.status === 'ready_for_delivery'
  );

  const activeDeliveries = deliveries.filter(
    (d) => d.status !== 'completed'
  );

  const completedDeliveries = deliveries.filter(
    (d) => d.status === 'completed'
  );

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8 text-left">
        
        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-[#0B3326] text-white border border-[#14624A] shadow-md">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F4A37] text-xs font-semibold text-[#34D399] border border-[#14624A]">
              <Truck className="w-3.5 h-3.5" /> Produce Dispatch & Logistics Desk
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-white tracking-tight">
              Deliveries & Dispatch
            </h1>
            <p className="text-sm sm:text-base text-[#DCFCE7]/90 leading-relaxed">
              Arrange verified farmgate transport for confirmed buyer orders and track physical delivery progress in real time.
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

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          
          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Active Outbound Shipments</span>
              <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#1E40AF] flex items-center justify-center">
                <Navigation className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
              {activeDeliveries.length}
            </div>
            <div className="text-[11px] text-[#566861]">
              In transit or awaiting pickup
            </div>
          </Card>

          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Pending Transport Booking</span>
              <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0B3326] font-heading">
              {confirmedOrdersNeedingTransport.filter((o) => !getDeliveryForOrder(o.orderNumber)).length}
            </div>
            <div className="text-[11px] text-[#566861]">
              Confirmed orders ready for dispatch
            </div>
          </Card>

          <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566861]">Completed Deliveries</span>
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

        {/* Section 1: Confirmed Orders Needing Transport */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#0B3326] font-heading">
                Confirmed Orders Awaiting Transport Arrangement
              </h2>
              <p className="text-xs text-[#566861]">
                Book freight carriers for verified sales agreements
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {confirmedOrdersNeedingTransport.map((order) => {
              const existingDelivery = getDeliveryForOrder(order.orderNumber);

              return (
                <Card key={order.id} className="p-5 bg-white border border-[#E5EDE8] shadow-xs space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="dark" size="sm">
                        {order.orderNumber}
                      </Badge>
                      <span className="text-xs text-[#566861]">
                        Buyer: {order.buyerName || 'Ananya Agro'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-[#14211D]">
                        {order.commodity} ({order.quantity} {order.unit})
                      </h4>
                      <span className="text-xs text-[#566861]">
                        Destination: {order.deliveryLocation?.district || 'Chennai'}, {order.deliveryLocation?.state || 'Tamil Nadu'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] flex items-center justify-between text-xs">
                      <span className="text-[#566861]">Consignment Value:</span>
                      <span className="font-extrabold text-[#0B3326]">
                        ₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E5EDE8]">
                    {existingDelivery ? (
                      <div className="flex items-center justify-between gap-2">
                        <DeliveryStatusBadge status={existingDelivery.status} size="sm" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedDeliveryForDetail(existingDelivery)}
                          className="text-xs font-bold text-[#0B3326] hover:bg-[#F2FBF6] cursor-pointer"
                        >
                          Track Trip →
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="accent"
                        size="sm"
                        onClick={() => setSelectedOrderForDelivery(order)}
                        icon={Truck}
                        iconPosition="left"
                        className="w-full font-bold text-xs py-2.5 shadow-xs cursor-pointer"
                      >
                        Arrange Delivery
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Section 2: Active & Historical Outbound Deliveries */}
        <div className="space-y-4 pt-4 border-t border-[#E5EDE8]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#0B3326] font-heading">
                Outbound Delivery Shipments ({deliveries.length})
              </h2>
              <p className="text-xs text-[#566861]">
                Real-time tracking of consignments from farmgate to wholesale destination
              </p>
            </div>
          </div>

          {deliveries.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {deliveries.map((item) => (
                <DeliveryCard
                  key={item.id}
                  delivery={item}
                  viewerRole="farmer"
                  onView={(d) => setSelectedDeliveryForDetail(d)}
                />
              ))}
            </div>
          ) : (
            <Card className="p-10 text-center border-2 border-dashed border-[#E5EDE8] rounded-3xl space-y-2">
              <Truck className="w-8 h-8 text-[#10B981] mx-auto" />
              <h4 className="text-sm font-bold text-[#0B3326]">No delivery manifests yet</h4>
              <p className="text-xs text-[#566861]">
                Click "Arrange Delivery" on any confirmed order above to dispatch your produce.
              </p>
            </Card>
          )}
        </div>

      </div>

      {/* Create Delivery Modal */}
      {selectedOrderForDelivery && (
        <CreateDeliveryModal
          order={selectedOrderForDelivery}
          currentUser={user}
          onClose={() => setSelectedOrderForDelivery(null)}
          onSuccess={(newDlv) => {
            loadData();
            setSelectedDeliveryForDetail(newDlv);
          }}
        />
      )}

      {/* Delivery Inspection Modal */}
      {selectedDeliveryForDetail && (
        <DeliveryDetailModal
          delivery={selectedDeliveryForDetail}
          viewerRole="farmer"
          currentUser={user}
          onClose={() => setSelectedDeliveryForDetail(null)}
          onStatusUpdated={() => loadData()}
        />
      )}
    </DashboardLayout>
  );
}
