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
      {/* Left: Order Identifier & Party */}
      <div className="flex items-start sm:items-center gap-3.5 min-w-[240px]">
        <div className="w-11 h-11 rounded-2xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center font-bold shrink-0 shadow-2xs">
          <ShoppingBag className="w-5 h-5 text-[#10B981]" />
        </div>

        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-extrabold text-[#0B3326] font-heading">
              {order.orderNumber || 'Order'}
            </span>
            <Badge variant="dark" size="sm">
              Grade {order.grade || 'A'}
            </Badge>
            {financingReq && (
              <FinancingStatusBadge status={financingReq.status} size="sm" />
            )}
          </div>

          <div className="text-xs text-[#566861] flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-[#14211D]">{order.commodity || 'Produce'}</span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <User className="w-3 h-3 text-[#10B981]" />
              {viewerRole === 'farmer' ? (order.buyerName || 'Buyer') : (order.farmerName || 'Farmer')}
            </span>
            <span>&bull;</span>
            <span className="text-[11px] text-[#566861]">
              {order.createdAt && !isNaN(new Date(order.createdAt).getTime())
                ? new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
                : 'Recent'}
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Lot Breakdown & Amount */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6 py-2 md:py-0 border-y md:border-y-0 md:border-x md:px-6 border-[#E5EDE8] text-xs">
        <div>
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">Volume</span>
          <span className="font-extrabold text-sm text-[#0B3326]">
            {Number(order.quantity || 0).toLocaleString('en-IN')} {order.unit || 'kg'}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">Rate</span>
          <span className="font-bold text-sm text-[#566861]">
            ₹{Number(order.pricePerUnit || 0).toLocaleString('en-IN')}/{order.unit || 'kg'}
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">
            {viewerRole === 'farmer' ? 'Receivable Payout' : 'Order Total'}
          </span>
          <span className="font-extrabold text-base text-[#10B981] font-heading">
            ₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Right: Status & Actions */}
      <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
        <OrderStatus status={order.status} size="sm" />

        <Button
          variant="secondary"
          size="sm"
          onClick={() => onView(order)}
          icon={ArrowRight}
          iconPosition="right"
          className="text-xs font-bold py-2 border-[#E5EDE8] hover:border-[#10B981] hover:bg-[#F2FBF6] cursor-pointer"
        >
          Manage
        </Button>
      </div>
    </div>
  );
}
