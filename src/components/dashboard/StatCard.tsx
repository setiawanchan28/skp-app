'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  color: 'sky' | 'emerald' | 'amber' | 'indigo' | 'rose';
}

const colorMap = {
  sky: 'bg-sky-50 text-sky-600 border-sky-100',
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  amber: 'bg-amber-50 text-amber-600 border-amber-100',
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  rose: 'bg-rose-50 text-rose-600 border-rose-100',
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}) => {
  return (
    <div className="p-5 bg-white rounded-2xl border border-slate-200/70 shadow-2xs hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl border ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-extrabold text-slate-900 tracking-tight">{value}</div>
        {subtitle && <p className="text-xs text-slate-500 mt-1 font-medium">{subtitle}</p>}
      </div>
    </div>
  );
};
