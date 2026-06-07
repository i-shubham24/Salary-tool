import React from 'react';

export default function AuditTable({ changes }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b bg-slate-50 flex-shrink-0">
        <h3 className="font-bold text-md text-slate-700">Detailed Variance Registry</h3>
      </div>
      <div className="overflow-y-auto flex-grow max-h-80">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="sticky top-0 bg-slate-100 z-10">
            <tr className="text-slate-500 uppercase text-xs font-semibold tracking-wider border-b">
              <th className="p-3">ID</th>
              <th className="p-3">Name</th>
              <th className="p-3">Type</th>
              <th className="p-3 text-right">Gross Shift ($\Delta$)</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {changes.map((change, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="p-3 font-mono text-xs text-slate-500">{change.empId}</td>
                <td className="p-3 font-medium text-slate-800">{change.name}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${change.type === 'NEW_EMPLOYEE' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                    {change.type}
                  </span>
                </td>
                <td className={`p-3 text-right font-bold ${change.grossDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {change.grossDelta >= 0 ? '+' : ''}{change.grossDelta.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}