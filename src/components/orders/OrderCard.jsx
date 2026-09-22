import React from 'react';
import { ArrowRight, User, MapPin, ShieldCheck, Clock, Landmark } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import OrderStatus from './OrderStatus';
import FinancingStatusBadge from '../financing/FinancingStatusBadge';
import { getFinancingRequestForOrder } from '../../utils/financing';

export default function OrderCard({ order, viewerRole = 'farmer', onView }) {
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
    <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] shadow-xs space-y-4 text-left">
      {/* Top Header: Order Number & Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-extrabold text-[#0B3326] font-heading">
            {order.orderNumber || 'Order'}
          </span>
          <span className="text-xs text-[#566861]">
            • {order.createdAt && !isNaN(new Date(order.createdAt).getTime())
              ? new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
              : 'Recent'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {financingReq && (
            <FinancingStatusBadge status={financingReq.status} size="sm" />
          )}
          <OrderStatus status={order.status} size="sm" />
        </div>
      </div>

      {/* Commodity & Quantity Breakdown */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8]">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-[#14211D]">
              {order.commodity || 'Produce Lot'}
            </h4>
            <Badge variant="dark" size="sm">
              Grade {order.grade || 'A'}
            </Badge>
          </div>
          <p className="text-xs text-[#566861] mt-1 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-[#10B981]" />
            <span>
              {viewerRole === 'farmer'
                ? `Buyer: ${order.buyerName || 'Wholesale Buyer'}`
                : `Farmer: ${order.farmerName || 'Verified Producer'}`}
            </span>
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs text-[#566861] block font-medium">
            {viewerRole === 'farmer' ? 'Receivable Payout' : 'Order Total'}
          </span>
          <span className="text-xl font-extrabold text-[#0B3326] font-heading">
            ₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-[#566861] block mt-0.5">
            {Number(order.quantity || 0).toLocaleString('en-IN')} {order.unit || 'kg'} @ ₹{Number(order.pricePerUnit || 0).toLocaleString('en-IN')}/{order.unit || 'kg'}
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-[#E5EDE8]/80">
        <div className="flex items-center gap-1.5 text-xs text-[#10B981] font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>100% Escrow Protected</span>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => onView(order)}
          icon={ArrowRight}
          iconPosition="right"
          className="text-xs font-bold py-2 border-[#E5EDE8] hover:border-[#10B981] hover:bg-[#F2FBF6]"
        >
          View Order Lifecycle
        </Button>
      </div>
    </Card>
  );
}
