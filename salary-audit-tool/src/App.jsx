import React, { useState } from 'react';
import Papa from 'papaparse';
import { performSalaryAudit } from './utils/auditEngine';
import { generateAIAuditReport } from './services/gemini';
import { RefreshCw, Cpu } from 'lucide-react';

// Modular Components
import FileUploader from './components/FileUploader';
import SummaryCards from './components/SummaryCards';
import VarianceChart from './components/VarianceChart';
import AuditTable from './components/AuditTable';

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
    
    setIsLoadingAi(true);
    const report = await generateAIAuditReport(results);
    setAiReport(report);
    setIsLoadingAi(false);
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
          <button onClick={processAudit} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm">
            <RefreshCw className="w-4 h-4" /> Execute Audit Engine
          </button>
        )}
      </header>

      {/* Upload Zone Grid */}
      {!auditData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-12">
          <FileUploader type="old" fileData={oldCsv} onFileChange={handleFileChange} />
          <FileUploader type="new" fileData={newCsv} onFileChange={handleFileChange} />
        </div>
      )}

      {/* Main Results Dashboard Grid */}
      {auditData && (
        <div className="space-y-6">
          
          {/* Top Row: Statistical Highlights */}
          <SummaryCards summary={auditData.summary} anomalyCount={auditData.changes.length} />

          {/* Middle Row: Component Chart & Detailed Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <VarianceChart changes={auditData.changes} />
            </div>
            <div className="lg:col-span-2">
              <AuditTable changes={auditData.changes} />
            </div>
          </div>

          {/* Bottom Row: Intelligent Insights Panel via Gemini Layer */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-8 rounded-xl shadow-md mt-8">
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-6 h-6 text-indigo-400 animate-pulse" />
              <h2 className="text-xl font-bold tracking-wide">AI Executive Summary Report</h2>
            </div>
            {isLoadingAi ? (
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
                <p className="text-slate-300 text-sm">Compiling generative insights and structural anomalies...</p>
              </div>
            ) : (
              <div className="prose prose-invert max-w-none text-slate-200 text-sm leading-relaxed whitespace-pre-line">
                {aiReport}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}