// src/components/PdfUploader.jsx
import React from 'react';
import { FileText, CheckCircle } from 'lucide-react';

export default function PdfUploader({ fileData, onFileChange }) {
  return (
    <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 bg-white flex flex-col items-center justify-center text-center hover:border-indigo-500 transition-colors w-full max-w-2xl mx-auto shadow-sm">
      <FileText className="w-14 h-14 text-indigo-400 mb-4" />
      <h3 className="font-semibold text-xl text-slate-800">Upload Salary Certificate PDF</h3>
      <p className="text-sm text-slate-500 mb-6 mt-1">Select the consolidated multi-month PDF document</p>
      
      <input 
        type="file" 
        accept=".pdf" 
        onChange={onFileChange} 
        className="text-sm file:mr-4 file:py-2.5 file:px-5 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer transition-colors" 
      />
      
      {fileData && (
        <div className="mt-5 bg-emerald-50 px-4 py-2 rounded-lg text-emerald-700 flex items-center gap-2 text-sm font-bold">
          <CheckCircle className="w-5 h-5"/> PDF Loaded ({fileData.name})
        </div>
      )}
    </div>
  );
}