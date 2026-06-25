// src/App.jsx
import React, { useState } from 'react';
import { parsePdfLocal } from './services/localPdfParser';
import { performSalaryAudit } from './utils/auditEngine';
import { RefreshCw, Zap } from 'lucide-react';

import PdfUploader from './components/PdfUploader';
import SummaryCards from './components/SummaryCards';
import VarianceChart from './components/VarianceChart';
import AuditTable from './components/AuditTable';

export default function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [auditData, setAuditData] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setPdfFile(file);
  };

  const processAudit = async () => {
    if (!pdfFile) return;
    setLoadingStatus('Initializing Engine...');
    setAuditData(null);
    
    try {
      const { oldData, newData } = await parsePdfLocal(pdfFile, setLoadingStatus);
      const results = performSalaryAudit(oldData, newData);
      
      setAuditData(results);
      setLoadingStatus(''); 

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
          <p className="text-sm text-slate-500 mt-1">High-Speed Deterministic PDF Matrix Parser</p>
        </div>
        {pdfFile && (
          <button 
            onClick={processAudit} 
            disabled={!!loadingStatus}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm disabled:opacity-50 min-w-[240px] justify-center">
            {loadingStatus ? <Zap className="w-4 h-4 animate-pulse text-yellow-300" /> : <RefreshCw className="w-4 h-4" />}
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
        </div>
      )}
    </div>
  );
}