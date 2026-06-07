import React from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle } from 'lucide-react';

export default function FileUploader({ type, fileData, onFileChange }) {
  const isOld = type === 'old';
  const Icon = isOld ? UploadCloud : FileSpreadsheet;
  const title = isOld ? 'Upload Historical Payroll' : 'Upload Revised Payroll';
  const desc = isOld ? 'Select old base structure CSV' : 'Select updated structural CSV';

  return (
    <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 bg-white flex flex-col items-center justify-center text-center hover:border-blue-500 transition-colors">
      <Icon className="w-12 h-12 text-slate-400 mb-4" />
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-xs text-slate-400 mb-4">{desc}</p>
      <input 
        type="file" 
        accept=".csv" 
        onChange={(e) => onFileChange(e, type)} 
        className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" 
      />
      {fileData && (
        <div className="mt-3 text-green-600 flex items-center gap-1 text-xs font-medium">
          <CheckCircle className="w-4 h-4"/> Loaded {fileData.length} rows
        </div>
      )}
    </div>
  );
}