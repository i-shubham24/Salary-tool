// src/components/AuditTable.jsx
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle } from 'lucide-react';

export default function AuditTable({ changes }) {
  const [expandedRow, setExpandedRow] = useState(null);

  const toggleRow = (empId) => {
    setExpandedRow(expandedRow === empId ? null : empId);
  };

  if (!changes || changes.length === 0) {
    return (
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden h-full flex flex-col items-center justify-center p-12 text-center min-h-[300px]">
        <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
        <h3 className="text-xl font-bold text-slate-800 mb-2">Payroll Structures are Identical</h3>
        <p className="text-slate-500 max-w-sm text-sm leading-relaxed">
          No variances, new hires, or departed employees were detected between the documented months.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b bg-slate-50 flex-shrink-0">
        <h3 className="font-bold text-md text-slate-700">Detailed Variance Registry</h3>
      </div>
      
      <div className="overflow-y-auto flex-grow max-h-[500px]">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm">
            <tr className="text-slate-500 uppercase text-xs font-semibold tracking-wider border-b">
              <th className="p-3 w-10"></th>
              <th className="p-3">ID / Name</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right text-indigo-600">Gross Shift (T.Pay)</th>
              <th className="p-3 text-right text-emerald-600">Net Pay Shift</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {changes.map((change) => (
              <React.Fragment key={change.empId}>
                <tr 
                  onClick={() => toggleRow(change.empId)}
                  className={`hover:bg-slate-50 cursor-pointer transition-colors ${expandedRow === change.empId ? 'bg-blue-50/50' : ''}`}
                >
                  <td className="p-3 text-slate-400">
                    {expandedRow === change.empId ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </td>
                  <td className="p-3">
                    <div className="font-medium text-slate-800">{change.name}</div>
                    <div className="font-mono text-[10px] text-slate-500">{change.empId}</div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider 
                      ${change.type === 'NEW_EMPLOYEE' ? 'bg-emerald-100 text-emerald-700' : 
                        change.type === 'DEPARTED' ? 'bg-rose-100 text-rose-700' : 
                        'bg-blue-100 text-blue-700'}`}>
                      {change.type}
                    </span>
                  </td>
                  <td className={`p-3 text-right font-bold ${change.grossDelta > 0 ? 'text-indigo-600' : change.grossDelta < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                    {change.grossDelta > 0 ? '+' : ''}{change.grossDelta.toLocaleString()}
                  </td>
                  <td className={`p-3 text-right font-bold ${change.netDelta > 0 ? 'text-emerald-600' : change.netDelta < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                    {change.netDelta > 0 ? '+' : ''}{change.netDelta.toLocaleString()}
                  </td>
                </tr>

                {expandedRow === change.empId && (
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <td colSpan="5" className="p-0">
                      <div className="p-4 pl-12 bg-slate-50/80 border-l-4 border-blue-400 m-2 rounded-r-lg">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3"/> Component Level Changes
                        </h4>
                        
                        {Object.keys(change.breakdown).length === 0 ? (
                          <p className="text-sm text-slate-500 italic">
                            {change.type === 'DEPARTED' ? 'Employee removed from current payroll cycle.' : 'No internal components shifted.'}
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-3">
                            {Object.entries(change.breakdown).map(([component, data]) => (
                              <div key={component} className="bg-white p-3 rounded border shadow-sm flex flex-col min-w-[140px] flex-1 max-w-[200px]">
                                <span className="font-semibold text-slate-700 text-xs mb-1 truncate" title={component}>{component}</span>
                                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                                  <span>Old: <span className="font-mono">{data.old.toLocaleString()}</span></span>
                                  <span>New: <span className="font-mono">{data.new.toLocaleString()}</span></span>
                                </div>
                                <div className={`text-right text-xs font-bold mt-2 pt-2 border-t ${data.delta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  Diff: {data.delta > 0 ? '+' : ''}{data.delta.toLocaleString()} 
                                  <span className="text-[9px] ml-1 text-slate-400">({data.pct}%)</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}