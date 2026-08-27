import React from 'react';
import Card from '../ui/Card';

export default function StatCard({ label, value, subtext, icon: Icon, iconColor = '#10B981', iconBg = '#EBF5F0' }) {
  return (
    <Card hoverEffect className="p-6 bg-white border border-[#E5EDE8] space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#566861] uppercase tracking-wider">
          {label}
        </span>
        {Icon && (
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-2xs"
            style={{ backgroundColor: iconBg, color: iconColor }}
          >
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="text-3xl font-extrabold text-[#0B3326] font-heading tracking-tight">
        {value}
      </div>

      {subtext && (
        <div className="text-[11px] text-[#566861] flex items-center gap-1 font-medium">
          {subtext}
        </div>
      )}
    </Card>
  );
}
