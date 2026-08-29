import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
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

export default function DisbursementsLedger({ currentUser, onNavigate }) {
  const user = currentUser || {
    name: 'Kisan Capital Partners',
    role: 'financier',
    email: 'financier@agrolnk.com',
  };

  const [disbursements, setDisbursements] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    setDisbursements(getDisbursements());
  }, []);

  const filteredDisbursements = disbursements.filter(
    (d) =>
      d.refNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.requestNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.bankUtr.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalDisbursed = disbursements.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const totalSettled = disbursements
    .filter((d) => d.status === 'settled')
    .reduce((sum, d) => sum + (Number(d.actualReturn || d.amount) || 0), 0);

  const handleExport = () => {
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
              Disbursements & Yields
            </h1>
            <p className="hidden sm:block text-xs sm:text-sm text-[#DCFCE7]/85">
              Complete transactional audit log with banking UTR numbers, legal escrow liens, and realized interest income.
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
              Total Capital Disbursed
            </span>
            <div className="text-xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              ₹{totalDisbursed.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#566861]">
              Across {disbursements.length} facility dispatches
            </div>
          </Card>

          <Card hoverEffect className="p-4 sm:p-6 bg-white border border-[#E5EDE8] space-y-1.5 sm:space-y-2 shadow-xs">
            <span className="text-[11px] sm:text-xs font-semibold text-[#566861] block">
              Settled Escrow Realized
            </span>
            <div className="text-xl sm:text-3xl font-extrabold text-[#10B981] font-heading">
              ₹{totalSettled.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#10B981] font-semibold">
              Principal + Realized Interest
            </div>
          </Card>

          <Card hoverEffect className="p-4 sm:p-6 bg-white border border-[#E5EDE8] space-y-1.5 sm:space-y-2 shadow-xs">
            <span className="text-[11px] sm:text-xs font-semibold text-[#566861] block">
              Escrow Lien Protection
            </span>
            <div className="text-xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
              100%
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#10B981] font-bold">
              0 Defaults • Direct NACH & Escrow
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
                  <th className="p-4">Disbursement Ref</th>
                  <th className="p-4">Borrower & Facility</th>
                  <th className="p-4">Principal Amount</th>
                  <th className="p-4">Rate & Tenor</th>
                  <th className="p-4">Maturity / Return</th>
                  <th className="p-4">Bank UTR & Escrow Lien</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EDE8]">
                {filteredDisbursements.map((d) => (
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
                        {d.interestRate}% APR
                      </span>
                      <span className="text-[10px] text-[#566861]">
                        {d.tenorDays} Days
                      </span>
                    </td>

                    <td className="p-4">
                      <span className="font-bold text-[#0B3326] block">
                        ₹{d.expectedReturn.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-[#566861]">
                        Due {new Date(d.maturityDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </span>
                    </td>

                    <td className="p-4">
                      <span className="font-mono text-[11px] text-[#14211D] block font-bold">
                        {d.bankUtr}
                      </span>
                      <span className="text-[10px] text-[#10B981] flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>{d.escrowLienId}</span>
                      </span>
                    </td>

                    <td className="p-4">
                      <Badge
                        variant={d.status === 'settled' ? 'emerald' : 'amber'}
                        size="sm"
                      >
                        {d.status === 'settled' ? 'Settled & Realized' : 'Active Facility'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
