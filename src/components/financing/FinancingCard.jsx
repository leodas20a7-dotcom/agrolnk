import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import FinancingStatusBadge from './FinancingStatusBadge';
import { ArrowRight, Landmark, FileText, User, ShieldCheck, Tag } from 'lucide-react';

export default function FinancingCard({
  request,
  viewerRole = 'farmer', // 'farmer' | 'buyer' | 'financier'
  onView,
}) {
  const isApproved = request.status === 'approved';
  const displayAmount = isApproved && request.approvedAmount ? request.approvedAmount : request.requestedAmount;

  return (
    <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] shadow-xs space-y-4 text-left">
      {/* Top Header: Request ID, Date & Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center">
            <Landmark className="w-4 h-4 text-[#10B981]" />
          </div>
          <div>
            <span className="text-base font-extrabold text-[#0B3326] font-heading">
              {request.requestNumber}
            </span>
            <span className="text-xs text-[#566861] ml-2">
              • {new Date(request.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>

        <FinancingStatusBadge status={request.status} />
      </div>

      {/* Linked Transaction Breakdown */}
      <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#566861] block">
                Linked Transaction:
              </span>
              <Badge variant="dark" size="sm">
                {request.orderNumber}
              </Badge>
            </div>
            <h4 className="text-base font-bold text-[#14211D] mt-1">
              {request.commodity}
            </h4>
            <span className="text-xs text-[#566861]">
              {request.quantity} {request.unit} • Grade {request.grade}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-[#566861] block font-medium">
              {isApproved ? 'Approved Funding' : 'Requested Funding'}
            </span>
            <span className="text-xl font-extrabold text-[#0B3326] font-heading">
              ₹{displayAmount?.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-[#566861] block mt-0.5">
              Txn Value: ₹{request.transactionValue?.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-[#E5EDE8] flex flex-wrap items-center justify-between gap-2 text-xs text-[#566861]">
          <div className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-[#10B981]" />
            <span className="font-medium text-[#14211D]">
              {request.purposeLabel || 'Working Capital'}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#566861]" />
            <span>
              Applicant: <strong className="text-[#14211D] capitalize">{request.applicantRole} ({request.applicantName || 'Partner'})</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-[#E5EDE8]/80">
        <div className="flex items-center gap-1.5 text-xs text-[#10B981] font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>Underwritten by Trade Collateral</span>
        </div>

        <Button
          variant={viewerRole === 'financier' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => onView(request)}
          icon={ArrowRight}
          iconPosition="right"
          className="text-xs font-bold py-2 cursor-pointer"
        >
          {viewerRole === 'financier' ? 'Review Application' : 'View Details'}
        </Button>
      </div>
    </Card>
  );
}
