import React from 'react';
import { Package, Clock, CheckCircle2, ShieldCheck, MapPin, ArrowRight } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export default function OrderCard({ order, onView }) {
  const isPending = order.status === 'pending';

  return (
    <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] shadow-xs space-y-4 text-left">
      {/* Top Header: Order Number & Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold text-[#0B3326] font-heading">
            {order.orderNumber}
          </span>
          <span className="text-xs text-[#566861]">
            • {new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
          </span>
        </div>

        <Badge
          variant={isPending ? 'amber' : 'emerald'}
          size="sm"
          dot={isPending}
        >
          {isPending ? 'Pending Fulfillment' : 'Completed'}
        </Badge>
      </div>

      {/* Commodity & Quantity Breakdown */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8]">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-[#14211D]">
              {order.commodity}
            </h4>
            <Badge variant="dark" size="sm">
              Grade {order.grade}
            </Badge>
          </div>
          <p className="text-xs text-[#566861] mt-0.5">
            Seller: {order.farmerName || 'Verified Producer'}
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs text-[#566861] block font-medium">Order Total</span>
          <span className="text-lg font-extrabold text-[#0B3326] font-heading">
            ₹{order.totalAmount?.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-[#566861] block">
            {order.quantity} {order.unit} @ ₹{order.pricePerUnit}/{order.unit}
          </span>
        </div>
      </div>

      {/* Escrow and Action Footer */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5 text-xs text-[#10B981] font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>Escrow Protected</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onView(order)}
          icon={ArrowRight}
          iconPosition="right"
          className="text-xs font-bold text-[#0B3326] hover:text-[#10B981] p-0 hover:bg-transparent"
        >
          View Order Details
        </Button>
      </div>
    </Card>
  );
}
