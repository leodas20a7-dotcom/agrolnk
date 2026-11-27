import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import CopyButton from '../../components/ui/CopyButton';
import ReceiptDownloadButton from '../../components/ui/ReceiptDownloadButton';
import Pagination from '../../components/ui/Pagination';
import { buildLoanDisbursementReceipt, buildLoanRepaymentReceipt } from '../../utils/paymentReceipt';
import {
  Receipt,
  Download,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search,
  Landmark,
  ArrowDownRight,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { getDisbursements } from '../../utils/financing';
import { showGlobalLoader, hideGlobalLoader } from '../../context/LoadingContext';

export default function DisbursementsLedger({ currentUser, onNavigate }) {
  const user = currentUser || {
    name: 'Financial Institution',
    role: 'financier',
    id: '',
    email: '',
  };

  const [disbursements, setDisbursements] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    let isMounted = true;
    showGlobalLoader('Loading Institutional Settlement Ledger...', 'Auditing banking UTRs, yield payouts & legal liens...');
    const loadDisb = async () => {
      try {
        const data = await getDisbursements(user);
        if (isMounted) setDisbursements(data || []);
      } catch (err) {
        console.error('Error loading disbursements:', err);
      } finally {
        hideGlobalLoader();
      }
    };
    loadDisb();

    const handleUpdated = () => {
      loadDisb();
    };

    window.addEventListener('agrolnk_financing_updated', handleUpdated);
    window.addEventListener('agrolnk_orders_updated', handleUpdated);
    window.addEventListener('storage', handleUpdated);

    return () => {
      isMounted = false;
      hideGlobalLoader();
      window.removeEventListener('agrolnk_financing_updated', handleUpdated);
      window.removeEventListener('agrolnk_orders_updated', handleUpdated);
      window.removeEventListener('storage', handleUpdated);
    };
  }, [user.id, user.email]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const filteredDisbursements = disbursements.filter((d) => {
    const q = (searchQuery || '').toLowerCase().trim();
    if (!q) return true;
    return (
      (d.refNumber || '').toLowerCase().includes(q) ||
      (d.applicantName || '').toLowerCase().includes(q) ||
      (d.requestNumber || '').toLowerCase().includes(q) ||
      (d.bankUtr || '').toLowerCase().includes(q) ||
      (d.commodity || '').toLowerCase().includes(q) ||
      (d.orderNumber || '').toLowerCase().includes(q)
    );
  });

  const totalDisbursed = disbursements.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const totalSettled = disbursements
    .filter((d) => d.status === 'settled')
    .reduce((sum, d) => sum + (Number(d.actualReturn || d.amount) || 0), 0);

  const handleExport = () => {
    const rowsToExport = filteredDisbursements.length > 0 ? filteredDisbursements : disbursements;
    const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const headers = [
      'Payout ID',
      'Date',
      'Loan Request #',
      'Borrower Name',
      'Crop / Purpose',
      'Loan Principal (INR)',
      'Rate (%/mo)',
      'Duration (Days)',
      'Interest Profit (INR)',
      'Total Return (INR)',
      'Bank UTR / Payment Ref',
      'Status',
    ];

    const csvRows = [
      headers.map(escapeCsv).join(','),
      ...rowsToExport.map((d) => {
        const principal = Number(d.amount || 0);
        const totalReturn = Number(d.status === 'settled' ? d.actualReturn : d.expectedReturn) || principal;
        const profit = d.status === 'settled' ? Number(d.realizedYield || 0) : Math.max(0, Math.round(totalReturn - principal));
        const dateStr = d.disbursedAt
          ? new Date(d.disbursedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          : '';
        return [
          d.refNumber || '',
          dateStr,
          d.requestNumber || '',
          d.applicantName || '',
          d.commodity || 'Trade Credit',
          principal,
          d.interestRate || 0.85,
          d.tenorDays || 30,
          profit,
          totalReturn,
          d.bankUtr || d.repaymentTransactionId || 'Pending',
          d.status === 'settled' ? 'Settled & Realized' : 'Active Facility',
        ]
          .map(escapeCsv)
          .join(',');
      }),
    ];

    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `AgrowLink_Loans_Ledger_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="space-y-8 text-left">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-5 sm:p-8 rounded-3xl bg-[#0B3326] text-white border border-[#14624A] shadow-sm">
          <div className="space-y-1 sm:space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-[#0F4A37] text-[11px] sm:text-xs font-semibold text-[#34D399] border border-[#14624A]">
              <Receipt className="w-3.5 h-3.5" />
              <span className="sm:hidden">Ledger & Audit</span>
              <span className="hidden sm:inline">Institutional Settlement & Escrow Audit Ledger</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold font-heading">
              Loans Sent &amp; Profit
            </h1>
            <p className="hidden sm:block text-xs sm:text-sm text-[#DCFCE7]/85">
              Full record of loans sent, bank payment IDs, collateral security, and interest earned.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              iconPosition="left"
              onClick={handleExport}
              className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white cursor-pointer font-semibold py-2 px-3 sm:px-4"
            >
              <span className="sm:hidden">Export</span>
              <span className="hidden sm:inline">Export CSV / Audit</span>
            </Button>
          </div>
        </div>

        {downloadSuccess && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Audit statement downloaded successfully (Bank reconciliation format ready).</span>
          </div>
        )}

        {/* 3 Overview Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
          <Card hoverEffect className="p-4 sm:p-6 bg-white border border-[#E5EDE8] space-y-1.5 sm:space-y-2 shadow-xs">
            <span className="text-[11px] sm:text-xs font-semibold text-[#566861] block">
              Total Money Sent
            </span>
            <div className="text-xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              ₹{totalDisbursed.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#566861]">
              Across {disbursements.length} loan payouts
            </div>
          </Card>

          <Card hoverEffect className="p-4 sm:p-6 bg-white border border-[#E5EDE8] space-y-1.5 sm:space-y-2 shadow-xs">
            <span className="text-[11px] sm:text-xs font-semibold text-[#566861] block">
              Money Returned + Profit
            </span>
            <div className="text-xl sm:text-3xl font-extrabold text-[#10B981] font-heading">
              ₹{totalSettled.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#10B981] font-semibold">
              Loan Amount + Interest Earned
            </div>
          </Card>

          <Card hoverEffect className="p-4 sm:p-6 bg-white border border-[#E5EDE8] space-y-1.5 sm:space-y-2 shadow-xs">
            <span className="text-[11px] sm:text-xs font-semibold text-[#566861] block">
              Collateral Protection
            </span>
            <div className="text-xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              100%
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#10B981] font-bold">
              Secured by Crop &amp; Escrow Hold
            </div>
          </Card>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5EDE8] shadow-xs">
          <div className="relative">
            <Search className="w-4 h-4 text-[#566861] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by disbursement reference, UTR, borrower, or #FIN request..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-medium text-[#14211D] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
            />
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-white rounded-3xl border border-[#E5EDE8] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAF8] border-b border-[#E5EDE8] text-[#566861] font-bold uppercase text-[10px] tracking-wider">
                  <th className="p-4">Payout ID</th>
                  <th className="p-4">Borrower &amp; Crop</th>
                  <th className="p-4">Loan Amount</th>
                  <th className="p-4">Rate &amp; Duration</th>
                  <th className="p-4">Due / Return</th>
                  <th className="p-4">Payment Ref &amp; Security</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EDE8]">
                {filteredDisbursements.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-xs text-[#566861]">
                      No disbursement transactions found.
                    </td>
                  </tr>
                ) : (
                  filteredDisbursements
                    .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                    .map((d) => (
                      <tr key={d.id} className="hover:bg-[#F2FBF6]/50 transition-colors">
                        <td className="p-4">
                          <span className="font-extrabold text-[#0B3326] block">
                            {d.refNumber}
                          </span>
                          <span className="text-[10px] text-[#566861]">
                            {new Date(d.disbursedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </td>

                        <td className="p-4">
                          <span className="font-bold text-[#14211D] block">
                            {d.applicantName}
                          </span>
                          <span className="text-[10px] text-[#10B981]">
                            Linked: {d.requestNumber}
                          </span>
                        </td>

                        <td className="p-4">
                          <span className="font-extrabold text-[#0B3326] text-sm">
                            ₹{d.amount.toLocaleString('en-IN')}
                          </span>
                        </td>

                        <td className="p-4">
                          <span className="font-bold text-[#14211D] block">
                            {d.interestRate}% / month
                          </span>
                          <span className="text-[10px] text-[#566861]">
                            {d.tenorDays} Days
                          </span>
                        </td>

                        <td className="p-4">
                          <span className="font-bold text-[#0B3326] block">
                            ₹{(d.status === 'settled' ? d.actualReturn : d.expectedReturn).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-semibold block">
                            {d.status === 'settled'
                              ? `+₹${d.realizedYield.toLocaleString('en-IN')} Realized Yield`
                              : `Est. Yield: +₹${Math.round(d.expectedReturn - d.amount).toLocaleString('en-IN')}`}
                          </span>
                        </td>

                        <td className="p-4">
                          {d.bankUtr ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[11px] text-[#14211D] font-bold">
                                {d.bankUtr}
                              </span>
                              <CopyButton
                                text={d.bankUtr}
                                label="Bank UTR"
                                title="Copy Bank UTR"
                              />
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#566861] italic">
                              Pending Settlement
                            </span>
                          )}
                          <span className="text-[10px] text-[#10B981] flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>{d.status === 'settled' ? `Cleared (${d.paymentMethod || 'Razorpay'})` : 'Escrow Lien Active'}</span>
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center justify-between gap-2">
                            <Badge
                              variant={d.status === 'settled' ? 'emerald' : 'blue'}
                              size="sm"
                            >
                              {d.status === 'settled' ? 'Settled & Realized ✓' : 'Active Facility'}
                            </Badge>
                            <ReceiptDownloadButton
                              title={d.status === 'settled' ? 'Download loan repayment receipt' : 'Download loan disbursement receipt'}
                              buildReceipt={() =>
                                d.status === 'settled'
                                  ? buildLoanRepaymentReceipt(d, {
                                      loanNumber: d.requestNumber || d.refNumber,
                                      principal: d.amount,
                                      interest: d.realizedYield,
                                      totalPaid: d.actualReturn,
                                      txnId: d.repaymentTransactionId || d.bankUtr,
                                      paymentMethod: d.paymentMethod,
                                      paidAt: d.settledAt || d.repaidAt || d.disbursedAt,
                                    })
                                  : buildLoanDisbursementReceipt({
                                      ...d,
                                      approvedAmount: d.amount,
                                      requestNumber: d.requestNumber || d.refNumber,
                                    })
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {filteredDisbursements.length > pageSize && (
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredDisbursements.length / pageSize)}
            onPageChange={setCurrentPage}
            totalItems={filteredDisbursements.length}
            pageSize={pageSize}
          />
        )}

      </div>
    </DashboardLayout>
  );
}
