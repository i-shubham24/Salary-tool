// src/App.jsx
import React, { useState } from 'react';
import { parsePdfWithAI } from './services/aiPdfParser';
import { performSalaryAudit } from './utils/auditEngine';
import { RefreshCw, BrainCircuit, Download } from 'lucide-react';

import PdfUploader from './components/PdfUploader';
import SummaryCards from './components/SummaryCards';
import VarianceChart from './components/VarianceChart';
import AuditTable from './components/AuditTable';

export default function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [auditData, setAuditData] = useState(null);
  const [isParsing, setIsParsing] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setPdfFile(file);
  };

  const processAudit = async () => {
    if (!pdfFile) return;
    setIsParsing(true);
    setAuditData(null);
    
    try {
      const { oldData, newData } = await parsePdfWithAI(pdfFile);
      const results = performSalaryAudit(oldData, newData);
      setAuditData(results);
      setIsParsing(false);
    } catch (error) {
      console.error("AI Parsing Error Details:", error);
      alert(error.message || "Failed to process PDF.");
      setIsParsing(false);
    }
  };

  // Triggers native browser PDF generation
  const handleDownloadPdf = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8 print:bg-white print:p-0">
      <header className="mb-8 border-b pb-4 flex justify-between items-center print:border-b-2 print:border-black print:pb-2 print:mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Credex Salary Audit Platform</h1>
          <p className="text-sm text-slate-500 mt-1 print:text-black">Automated Variance & Anomaly Detection Report</p>
        </div>
        
        <div className="flex gap-3 print:hidden">
          {auditData && (
            <button 
              onClick={handleDownloadPdf}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm">
              <Download className="w-4 h-4" /> Export PDF
            </button>
          )}

          {pdfFile && (
            <button 
              onClick={processAudit} 
              disabled={isParsing}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm disabled:opacity-50 min-w-[240px] justify-center">
              {isParsing ? <BrainCircuit className="w-4 h-4 animate-pulse" /> : <RefreshCw className="w-4 h-4" />}
              {isParsing ? 'AI Reading Document...' : 'Execute Audit Engine'}
            </button>
          )}
        </div>
      </header>

      {!auditData && (
        <div className="mt-16 print:hidden">
          <PdfUploader fileData={pdfFile} onFileChange={handleFileChange} />
        </div>
      )}

      {auditData && (
        <div className="space-y-6 print:space-y-4">
          <SummaryCards summary={auditData.summary} anomalyCount={auditData.changes.length} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block">
            <div className="lg:col-span-1 print:mb-6">
              <VarianceChart changes={auditData.changes} />
            </div>
            <div className="lg:col-span-2">
              <AuditTable changes={auditData.changes} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}