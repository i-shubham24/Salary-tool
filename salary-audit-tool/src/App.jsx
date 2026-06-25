// src/App.jsx
import React, { useState } from 'react';
import { parsePdfWithAI } from './services/aiPdfParser';
import { performSalaryAudit } from './utils/auditEngine';
import { RefreshCw, BrainCircuit } from 'lucide-react';

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
      // 1. Send Document to Gemini for Data Extraction
      const { oldData, newData } = await parsePdfWithAI(pdfFile);
      
      // 2. Run Deterministic Mathematical Sweep Engine
      const results = performSalaryAudit(oldData, newData);
      setAuditData(results);
      setIsParsing(false);

    } catch (error) {
      console.error("PDF Parsing Error:", error);
      alert(error.message || "Failed to process PDF.");
      setIsParsing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <header className="mb-8 border-b pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Credex Salary Audit Platform</h1>
          <p className="text-sm text-slate-500 mt-1">AI-Powered PDF Data Extraction & Automated Variance Engine</p>
        </div>
        {pdfFile && (
          <button 
            onClick={processAudit} 
            disabled={isParsing}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm disabled:opacity-50 min-w-[240px] justify-center">
            {isParsing ? <BrainCircuit className="w-4 h-4 animate-pulse" /> : <RefreshCw className="w-4 h-4" />}
            {isParsing ? 'AI Reading Document...' : 'Execute Audit Engine'}
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
        </div>
      )}
    </div>
  );
}