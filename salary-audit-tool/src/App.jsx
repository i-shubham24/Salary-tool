// src/App.jsx
import React, { useState } from 'react';
import { parsePdfWithAI } from './services/aiPdfParser';
import { performSalaryAudit } from './utils/auditEngine';
import { generateAIAuditReport } from './services/gemini';
import { RefreshCw, Cpu, BrainCircuit } from 'lucide-react';

import PdfUploader from './components/PdfUploader';
import SummaryCards from './components/SummaryCards';
import VarianceChart from './components/VarianceChart';
import AuditTable from './components/AuditTable';

export default function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [auditData, setAuditData] = useState(null);
  const [aiReport, setAiReport] = useState('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(''); // Stores real-time batch status

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setPdfFile(file);
  };

  const processAudit = async () => {
    if (!pdfFile) return;
    setLoadingStatus('Initializing Hybrid Parser...');
    setAuditData(null);
    setAiReport('');
    
    try {
      // Pass setLoadingStatus to the parser so it updates the UI during long documents
      const { oldData, newData } = await parsePdfWithAI(pdfFile, setLoadingStatus);
      
      setLoadingStatus('Calculating Variances...');
      const results = performSalaryAudit(oldData, newData);
      setAuditData(results);
      setLoadingStatus(''); // Clear status when done
      
      setIsLoadingAi(true);
      const report = await generateAIAuditReport(results);
      setAiReport(report);
      setIsLoadingAi(false);

    } catch (error) {
      console.error("PDF Parsing Error:", error);
      alert(error.message || "Failed to process PDF.");
      setLoadingStatus('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <header className="mb-8 border-b pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Credex Salary Audit Platform</h1>
          <p className="text-sm text-slate-500 mt-1">Enterprise Hybrid Batching Engine & Generative Variance Tracking</p>
        </div>
        {pdfFile && (
          <button 
            onClick={processAudit} 
            disabled={!!loadingStatus}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm disabled:opacity-50 min-w-[280px] justify-center">
            {loadingStatus ? <BrainCircuit className="w-4 h-4 animate-pulse" /> : <RefreshCw className="w-4 h-4" />}
            {loadingStatus ? loadingStatus : 'Execute Audit Engine'}
          </button>
        )}
      </header>

      {!auditData && (
        <div className="mt-16">
          <PdfUploader fileData={pdfFile} onFileChange={handleFileChange} />
        </div>
      )}

      {auditData && (
        <div className="space-y-6">
          <SummaryCards summary={auditData.summary} anomalyCount={auditData.changes.length} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <VarianceChart changes={auditData.changes} />
            </div>
            <div className="lg:col-span-2">
              <AuditTable changes={auditData.changes} />
            </div>
          </div>

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