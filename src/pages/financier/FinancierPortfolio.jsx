import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import {
  PieChart,
  Landmark,
  TrendingUp,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Calendar,
  DollarSign,
  AlertCircle,
  Lock,
  ArrowUpRight,
  Receipt
} from 'lucide-react';
import { getFinancingRequests, getDisbursements } from '../../utils/financing';

export default function FinancierPortfolio({ currentUser, onNavigate }) {
  const user = currentUser || {
    name: 'Kisan Capital Partners',
    role: 'financier',
    email: 'financier@agrolnk.com',
  };

  const [activeLoans, setActiveLoans] = useState([]);
  const [disbursements, setDisbursements] = useState([]);

  useEffect(() => {
    const all = getFinancingRequests();
    setActiveLoans(all.filter((r) => r.status === 'approved'));
    setDisbursements(getDisbursements().filter((d) => d.status === 'active'));
  }, []);

  const totalPrincipal = activeLoans.reduce(
    (sum, l) => sum + (Number(l.approvedAmount) || Number(l.requestedAmount) || 0),
    0
  );

  const totalExpectedReturn = disbursements.reduce(
    (sum, d) => sum + (Number(d.expectedReturn) || Number(d.amount) || 0),
    totalPrincipal * 1.025
  );

  const totalYieldEarned = Math.round(totalExpectedReturn - totalPrincipal);

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8 text-left">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-5 sm:p-8 rounded-3xl bg-[#0B3326] text-white border border-[#14624A] shadow-sm">
          <div className="space-y-1 sm:space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-[#0F4A37] text-[11px] sm:text-xs font-semibold text-[#34D399] border border-[#14624A]">
              <PieChart className="w-3.5 h-3.5" />
              <span className="sm:hidden">Live Portfolio</span>
              <span className="hidden sm:inline">Live Credit Portfolio & Performance</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold font-heading">
              Active Portfolio
            </h1>
            <p className="hidden sm:block text-xs sm:text-sm text-[#DCFCE7]/85">
              Live loan facilities backed by agricultural escrow liens and electronic warehouse receipts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              icon={Receipt}
              iconPosition="left"
              onClick={() => onNavigate('financier-disbursements')}
              className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white cursor-pointer py-2 px-3 sm:px-4"
            >
              <span className="sm:hidden">Ledger</span>
              <span className="hidden sm:inline">Disbursement Ledger</span>
            </Button>
          </div>
        </div>

        {/* 3 Overview Performance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
          <Card hoverEffect className="p-4 sm:p-6 bg-white border border-[#E5EDE8] space-y-1.5 sm:space-y-2 shadow-xs">
            <span className="text-[11px] sm:text-xs font-semibold text-[#566861] block">
              Active Principal Deployed
            </span>
            <div className="text-xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              ₹{totalPrincipal.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#10B981] font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>100% Escrow Lien Collateralized</span>
            </div>
          </Card>

          <Card hoverEffect className="p-4 sm:p-6 bg-white border border-[#E5EDE8] space-y-1.5 sm:space-y-2 shadow-xs">
            <span className="text-[11px] sm:text-xs font-semibold text-[#566861] block">
              Maturity Settlement Value
            </span>
            <div className="text-xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              ₹{Math.round(totalExpectedReturn).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#566861]">
              Automated payout deduction
            </div>
          </Card>

          <Card hoverEffect className="p-4 sm:p-6 bg-white border border-[#E5EDE8] space-y-1.5 sm:space-y-2 shadow-xs">
            <span className="text-[11px] sm:text-xs font-semibold text-[#566861] block">
              Net Projected Yield
            </span>
            <div className="text-xl sm:text-3xl font-extrabold text-[#10B981] font-heading">
              +₹{totalYieldEarned.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#10B981] font-bold">
              Avg IRR: 10.8% p.a.
            </div>
          </Card>
        </div>

        {/* Active Loan Contracts Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#0B3326] font-heading">
                Active Loan Facilities ({activeLoans.length})
              </h2>
              <p className="text-xs text-[#566861]">
                Real-time tracking of borrower agreements, maturity dates, and repayment escrows
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            {activeLoans.map((loan) => {
              const approvedAmt = loan.approvedAmount || loan.requestedAmount;
              const rate = loan.interestRate || 9.5;
              const tenor = loan.tenorDays || 30;
              const estInterest = Math.round(approvedAmt * (rate / 100) * (tenor / 365));

              return (
                <Card
                  key={loan.id}
                  hoverEffect
                  className="p-6 bg-white border border-[#E5EDE8] shadow-xs space-y-4"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-[#0B3326]">
                          {loan.requestNumber}
                        </span>
                        <span className="text-xs text-[#566861]">• Order {loan.orderNumber}</span>
                        <Badge variant="emerald" size="sm">
                          Active Facility
                        </Badge>
                      </div>
                      <h3 className="text-base font-bold text-[#14211D]">
                        {loan.applicantName} ({loan.applicantRole.toUpperCase()})
                      </h3>
                      <span className="text-xs text-[#566861]">
                        Commodity: <b>{loan.commodity} ({loan.grade})</b> • {loan.quantity} {loan.unit}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F8FAF8] p-3.5 rounded-2xl border border-[#E5EDE8] text-center text-xs">
                      <div>
                        <span className="text-[10px] text-[#566861] block">Principal</span>
                        <span className="font-bold text-[#0B3326] text-xs sm:text-sm">
                          ₹{approvedAmt.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#566861] block">Interest APR</span>
                        <span className="font-bold text-[#10B981] text-xs sm:text-sm">
                          {rate}% p.a.
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#566861] block">Tenor</span>
                        <span className="font-bold text-[#14211D] text-xs sm:text-sm">
                          {tenor} Days
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#566861] block">Est. Return</span>
                        <span className="font-bold text-[#0B3326] text-xs sm:text-sm">
                          ₹{(approvedAmt + estInterest).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E5EDE8] flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-[#566861]">
                      <Lock className="w-4 h-4 text-[#10B981]" />
                      <span>Collateral: <b>{loan.collateralType || 'Escrow Lien Locked'}</b></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#10B981] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Auto Escrow Deduction Scheduled</span>
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
