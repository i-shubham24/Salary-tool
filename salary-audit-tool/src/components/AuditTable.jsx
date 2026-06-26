// src/components/AuditTable.jsx
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle, Maximize2, Minimize2 } from 'lucide-react';

export default function AuditTable({ changes }) {
  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleRow = (empId) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
  };

  const toggleAll = () => {
    if (expandedRows.size === changes.length) setExpandedRows(new Set());
    else setExpandedRows(new Set(changes.map(c => c.empId)));
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
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden h-full flex flex-col print:border-none print:shadow-none">
      <div className="p-4 border-b bg-slate-50 flex-shrink-0 flex justify-between items-center print:bg-white print:border-b-2 print:border-slate-800">
        <h3 className="font-bold text-md text-slate-700 print:text-xl print:text-black">Detailed Variance Registry</h3>
        <button 
          onClick={toggleAll}
          className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded flex items-center gap-1 hover:bg-indigo-100 transition-colors print:hidden"
        >
          {expandedRows.size === changes.length ? <Minimize2 className="w-3 h-3"/> : <Maximize2 className="w-3 h-3"/>}
          {expandedRows.size === changes.length ? 'Collapse All' : 'Expand All'}
        </button>
      </div>
      
      <div className="overflow-y-auto flex-grow max-h-[500px] print:max-h-none print:overflow-visible">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm print:static print:bg-white print:shadow-none">
            <tr className="text-slate-500 uppercase text-xs font-semibold tracking-wider border-b print:text-black print:border-b-2">
              <th className="p-3 w-10 print:hidden"></th>
              <th className="p-3">ID / Name</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right text-indigo-600 print:text-black">Gross Shift (T.Pay)</th>
              <th className="p-3 text-right text-emerald-600 print:text-black">Net Pay Shift</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 print:divide-slate-300">
            {changes.map((change) => (
              <React.Fragment key={change.empId}>
                <tr 
                  onClick={() => toggleRow(change.empId)}
                  className={`hover:bg-slate-50 cursor-pointer transition-colors ${expandedRows.has(change.empId) ? 'bg-blue-50/50 print:bg-white' : 'print:bg-white'}`}
                >
                  <td className="p-3 text-slate-400 print:hidden">
                    {expandedRows.has(change.empId) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
                  <td className={`p-3 text-right font-bold ${change.grossDelta > 0 ? 'text-indigo-600 print:text-black' : change.grossDelta < 0 ? 'text-rose-600 print:text-black' : 'text-slate-400 print:text-slate-600'}`}>
                    {change.grossDelta > 0 ? '+' : ''}{change.grossDelta.toLocaleString()}
                  </td>
                  <td className={`p-3 text-right font-bold ${change.netDelta > 0 ? 'text-emerald-600 print:text-black' : change.netDelta < 0 ? 'text-rose-600 print:text-black' : 'text-slate-400 print:text-slate-600'}`}>
                    {change.netDelta > 0 ? '+' : ''}{change.netDelta.toLocaleString()}
                  </td>
                </tr>

                {expandedRows.has(change.empId) && (
                  <tr className="bg-slate-50 border-b border-slate-200 print:bg-white print:border-b-2">
                    <td colSpan="5" className="p-0">
                      <div className="p-4 pl-12 bg-slate-50/80 border-l-4 border-blue-400 m-2 rounded-r-lg print:pl-4 print:bg-slate-50 print:border-l-4 print:border-slate-800">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1 print:text-black">
                          <AlertCircle className="w-3 h-3 print:hidden"/> Component Level Changes
                        </h4>
                        
                        <div className="flex flex-wrap gap-3">
                          
                          {/* DYNAMIC WORKING DAYS CARD - Only renders if days differ */}
                          {change.oldDays !== change.newDays && (
                            <div className="bg-amber-50 p-3 rounded border border-amber-200 shadow-sm flex flex-col min-w-[140px] flex-1 max-w-[200px] print:break-inside-avoid print:bg-white print:border-slate-300">
                              <span className="font-semibold text-amber-900 text-xs mb-1 truncate print:text-black">📅 Working Days</span>
                              <div className="flex justify-between text-[10px] text-amber-700 mt-1 print:text-slate-600">
                                <span>Old: <span className="font-mono">{change.oldMonth} ({change.oldDays}d)</span></span>
                                <span>New: <span className="font-mono">{change.newMonth} ({change.newDays}d)</span></span>
                              </div>
                              <div className={`text-right text-xs font-bold mt-2 pt-2 border-t border-amber-200 print:border-slate-300 ${change.newDays > change.oldDays ? 'text-emerald-600 print:text-black' : 'text-rose-600 print:text-black'}`}>
                                Diff: {change.newDays > change.oldDays ? '+' : ''}{change.newDays - change.oldDays} Days
                              </div>
                            </div>
                          )}

                          {Object.keys(change.breakdown).length === 0 && change.oldDays === change.newDays ? (
                            <p className="text-sm text-slate-500 italic w-full">
                              {change.type === 'DEPARTED' ? 'Employee removed from current payroll cycle.' : 'No internal components shifted.'}
                            </p>
                          ) : (
                            Object.entries(change.breakdown).map(([component, data]) => (
                              <div key={component} className="bg-white p-3 rounded border shadow-sm flex flex-col min-w-[140px] flex-1 max-w-[200px] print:break-inside-avoid print:border-slate-300">
                                <span className="font-semibold text-slate-700 text-xs mb-1 truncate print:text-black" title={component}>{component}</span>
                                <div className="flex justify-between text-[10px] text-slate-500 mt-1 print:text-slate-600">
                                  <span>Old: <span className="font-mono">{data.old.toLocaleString()}</span></span>
                                  <span>New: <span className="font-mono">{data.new.toLocaleString()}</span></span>
                                </div>
                                <div className={`text-right text-xs font-bold mt-2 pt-2 border-t print:border-slate-300 print:text-black ${data.delta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  Diff: {data.delta > 0 ? '+' : ''}{data.delta.toLocaleString()} 
                                  <span className="text-[9px] ml-1 text-slate-400">({data.pct}%)</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
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