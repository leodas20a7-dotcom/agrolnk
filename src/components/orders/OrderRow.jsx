import React from 'react';
import { ArrowRight, User, MapPin, ShieldCheck, Clock, ShoppingBag } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import OrderStatus from './OrderStatus';
import FinancingStatusBadge from '../financing/FinancingStatusBadge';
import { getFinancingRequestForOrder } from '../../utils/financing';

export default function OrderRow({ order, viewerRole = 'farmer', onView }) {
  const [financingReq, setFinancingReq] = React.useState(null);

  React.useEffect(() => {
    let isMounted = true;
    if (order?.orderNumber || order?.id) {
      getFinancingRequestForOrder(order.orderNumber || order.id)
        .then((res) => {
          if (isMounted) setFinancingReq(res);
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [order?.orderNumber, order?.id]);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs hover:border-[#10B981]/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
      {/* Left: Order Identifier & Party (flex-1 min-w-0 prevents badge/text expansion from pushing columns) */}
      <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-0 md:pr-4">
        <div className="w-11 h-11 rounded-2xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center font-bold shrink-0 shadow-2xs">
          <ShoppingBag className="w-5 h-5 text-[#10B981]" />
        </div>

        <div className="space-y-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-sm font-extrabold text-[#0B3326] font-heading shrink-0">
              {order.orderNumber || 'Order'}
            </span>
            <Badge variant="dark" size="sm" className="shrink-0">
              Grade {order.grade || 'A'}
            </Badge>
            {financingReq && (
              <div className="shrink-0">
                <FinancingStatusBadge status={financingReq.status} size="sm" />
              </div>
            )}
          </div>

          <div 
            className="text-xs text-[#566861] flex items-center gap-1.5 min-w-0 truncate"
            title={`${order.commodity || 'Produce'} • ${viewerRole === 'farmer' ? (order.buyerName || 'Buyer') : (order.farmerName || 'Farmer')}`}
          >
            <span className="font-bold text-[#14211D] shrink-0">{order.commodity || 'Produce'}</span>
            <span>&bull;</span>
            <span className="flex items-center gap-1 shrink-0">
              <User className="w-3 h-3 text-[#10B981]" />
              <span className="truncate">{viewerRole === 'farmer' ? (order.buyerName || 'Buyer') : (order.farmerName || 'Farmer')}</span>
            </span>
            <span>&bull;</span>
            <span className="text-[11px] text-[#566861] shrink-0">
              {order.createdAt && !isNaN(new Date(order.createdAt).getTime())
                ? new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
                : 'Recent'}
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Lot Breakdown & Amount (Evenly locked 3-column bay) */}
      <div className="w-full md:w-[350px] lg:w-[380px] shrink-0 grid grid-cols-3 gap-2 sm:gap-4 py-2.5 md:py-0 border-y md:border-y-0 md:border-x border-[#E5EDE8] md:px-5 lg:px-6 text-xs">
        <div className="min-w-0">
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block truncate">Volume</span>
          <span className="font-extrabold text-sm text-[#0B3326] block truncate">
            {Number(order.quantity || 0).toLocaleString('en-IN')} {order.unit || 'kg'}
          </span>
        </div>

        <div className="min-w-0">
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block truncate">Rate</span>
          <span className="font-bold text-sm text-[#566861] block truncate">
            ₹{Number(order.pricePerUnit || 0).toLocaleString('en-IN')}/{order.unit || 'kg'}
          </span>
        </div>

        <div className="min-w-0">
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block truncate">
            {viewerRole === 'farmer' ? 'Payout' : 'Order Total'}
          </span>
          <span className="font-extrabold text-base text-[#10B981] font-heading block truncate">
            ₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Right: Status & Actions (Consistently anchored) */}
      <div className="w-full md:w-[220px] lg:w-[240px] flex items-center justify-between md:justify-end gap-3 shrink-0">
        <div className="shrink-0">
          <OrderStatus status={order.status} size="sm" />
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => onView(order)}
          icon={ArrowRight}
          iconPosition="right"
          className="text-xs font-bold py-2 border-[#E5EDE8] hover:border-[#10B981] hover:bg-[#F2FBF6] cursor-pointer whitespace-nowrap"
        >
          Manage
        </Button>
      </div>
    </div>
  );
}
