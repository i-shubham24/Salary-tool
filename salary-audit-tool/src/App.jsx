import React, { useState } from 'react';
import Papa from 'papaparse';
import FileUploader from './components/FileUploader';
import SummaryCards from './components/SummaryCards';
import VarianceChart from './components/VarianceChart';
import AuditTable from './components/AuditTable';
import { performSalaryAudit } from './utils/auditEngine';
import { generateAIAuditReport } from './services/gemini';
import { UploadCloud, FileSpreadsheet, Cpu, RefreshCw, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function App() {
  const [oldCsv, setOldCsv] = useState(null);
  const [newCsv, setNewCsv] = useState(null);
  const [auditData, setAuditData] = useState(null);
  const [aiReport, setAiReport] = useState('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (type === 'old') setOldCsv(results.data);
        if (type === 'new') setNewCsv(results.data);
      }
    });
  };

  const processAudit = async () => {
    if (!oldCsv || !newCsv) return;
    const results = performSalaryAudit(oldCsv, newCsv);
    setAuditData(results);
    
    // Trigger Gemini Layer
    setIsLoadingAi(true);
    const report = await generateAIAuditReport(results);
    setAiReport(report);
    setIsLoadingAi(false);
  };

  // Convert breakdown data into format friendly for Recharts visualizers
  const getChartData = () => {
    if (!auditData) return [];
    const totals = {};
    auditData.changes.forEach(c => {
      Object.keys(c.breakdown).forEach(comp => {
        totals[comp] = (totals[comp] || 0) + c.breakdown[comp].delta;
      });
    });
    return Object.keys(totals).map(name => ({ name, NetChange: totals[name] }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
      {/* Top Header */}
      <header className="mb-8 border-b pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Credex Salary Audit Platform</h1>
          <p className="text-sm text-slate-500 mt-1">Precise automated mathematical and generative payroll variance tracking</p>
        </div>
        {(oldCsv && newCsv) && (
          <button onClick={processAudit} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 font-medium transition-colors">
            <RefreshCw className="w-4 h-4" /> Execute Audit Engine
          </button>
        )}
      </header>

      {/* Upload Zone Grid */}
      {!auditData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-12">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 bg-white flex flex-col items-center justify-center text-center hover:border-blue-500 transition-colors">
            <UploadCloud className="w-12 h-12 text-slate-400 mb-4" />
            <h3 className="font-semibold text-lg">Upload Historical Payroll</h3>
            <p className="text-xs text-slate-400 mb-4">Select or drop old base structure CSV</p>
            <input type="file" accept=".csv" onChange={(e) => handleFileChange(e, 'old')} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            {oldCsv && <div className="mt-3 text-green-600 flex items-center gap-1 text-xs font-medium"><CheckCircle className="w-4 h-4"/> Loaded {oldCsv.length} rows</div>}
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 bg-white flex flex-col items-center justify-center text-center hover:border-blue-500 transition-colors">
            <FileSpreadsheet className="w-12 h-12 text-slate-400 mb-4" />
            <h3 className="font-semibold text-lg">Upload Revised Payroll</h3>
            <p className="text-xs text-slate-400 mb-4">Select or drop updated structural CSV</p>
            <input type="file" accept=".csv" onChange={(e) => handleFileChange(e, 'new')} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            {newCsv && <div className="mt-3 text-green-600 flex items-center gap-1 text-xs font-medium"><CheckCircle className="w-4 h-4"/> Loaded {newCsv.length} rows</div>}
          </div>
        </div>
      )}

      {/* Main Results Dashboard Grid */}
      {auditData && (
        <div className="space-y-6">
          {/* Statistical Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border shadow-sm">
              <span className="text-xs font-medium text-slate-400 block mb-1">Total Employees Audited</span>
              <span className="text-2xl font-bold">{auditData.summary.totalAudited}</span>
            </div>
            <div className="bg-white p-5 rounded-xl border shadow-sm">
              <span className="text-xs font-medium text-slate-400 block mb-1">Net Budgetary Change</span>
              <span className={`text-2xl font-bold ${auditData.summary.netVariance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {auditData.summary.netVariance >= 0 ? '+' : ''}{auditData.summary.netVariance.toLocaleString()}
              </span>
            </div>
            <div className="bg-white p-5 rounded-xl border shadow-sm">
              <span className="text-xs font-medium text-slate-400 block mb-1">Structure Shift Percentage</span>
              <span className="text-2xl font-bold text-blue-600">{auditData.summary.pctChange}%</span>
            </div>
            <div className="bg-white p-5 rounded-xl border shadow-sm">
              <span className="text-xs font-medium text-slate-400 block mb-1">Detected Delta Exceptions</span>
              <span className="text-2xl font-bold text-amber-500">{auditData.changes.length}</span>
            </div>
          </div>

          {/* Intelligent Insights Panel via Gemini Layer */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 rounded-xl shadow-md">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-5 h-5 text-indigo-400 animate-pulse" />
              <h2 className="text-lg font-bold tracking-wide">Gemini Cognitive Audit Layer</h2>
            </div>
            {isLoadingAi ? (
              <p className="text-slate-300 text-sm animate-pulse">Running data heuristics analysis and scanning patterns...</p>
            ) : (
              <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-line">{aiReport}</p>
            )}
          </div>

          {/* Component Multi-factor Impacts & Detailed Logs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white p-6 rounded-xl border shadow-sm">
              <h3 className="font-bold text-md mb-4 text-slate-700">Structural Driver Impact</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{fontSize: 11}} />
                    <YAxis tick={{fontSize: 11}} />
                    <Tooltip />
                    <Bar dataKey="NetChange" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-slate-50">
                <h3 className="font-bold text-md text-slate-700">Detailed Variance Registry</h3>
              </div>
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-500 uppercase text-xs font-semibold tracking-wider border-b">
                      <th className="p-3">ID</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Type</th>
                      <th className="p-3 text-right">Gross Shift ($\Delta$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {auditData.changes.map((change, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-xs">{change.empId}</td>
                        <td className="p-3 font-medium">{change.name}</td>
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
          </div>
        </div>
      )}
    </div>
  );
}