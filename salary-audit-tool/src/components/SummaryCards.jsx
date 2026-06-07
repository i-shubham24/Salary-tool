import React from 'react';

export default function SummaryCards({ summary, anomalyCount }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-white p-5 rounded-xl border shadow-sm">
        <span className="text-xs font-medium text-slate-400 block mb-1">Total Audited</span>
        <span className="text-2xl font-bold">{summary.totalAudited}</span>
      </div>
      <div className="bg-white p-5 rounded-xl border shadow-sm">
        <span className="text-xs font-medium text-slate-400 block mb-1">Net Budgetary Change</span>
        <span className={`text-2xl font-bold ${summary.netVariance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {summary.netVariance >= 0 ? '+' : ''}{summary.netVariance.toLocaleString()}
        </span>
      </div>
      <div className="bg-white p-5 rounded-xl border shadow-sm">
        <span className="text-xs font-medium text-slate-400 block mb-1">Structure Shift</span>
        <span className="text-2xl font-bold text-blue-600">{summary.pctChange}%</span>
      </div>
      <div className="bg-white p-5 rounded-xl border shadow-sm">
        <span className="text-xs font-medium text-slate-400 block mb-1">Detected Exceptions</span>
        <span className="text-2xl font-bold text-amber-500">{anomalyCount}</span>
      </div>
    </div>
  );
}