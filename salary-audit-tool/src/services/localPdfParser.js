// src/services/localPdfParser.js
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const parsePdfLocal = async (file, updateStatus) => {
  updateStatus("Extracting PDF text matrix...");
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(item => item.str).join(' ') + " \n";
  }

  updateStatus("Running Deterministic Extraction...");
  
  // Split into employee blocks
  const employees = fullText.split('This is certified that').slice(1);
  const oldData = [];
  const newData = [];

  // The exact 26 standard parameters found in your PDFs
  const keys = [
    'Basic', 'Spl', 'PGT', 'NPA', 'DA', 'HRA', 'FMA', 'Arear', 'SHP', 'PFP', 'Misc Earn',
    'T.Pay', 'Sec', 'ITax', 'PFD', 'Elect', 'Adv', 'Misc Ded', 'Ins', 'T/INS', 'Wel', 'HRD', 'ESI', 'PTax',
    'T.DD', 'Net Pay'
  ];

  employees.forEach(emp => {
    const nameMatch = emp.match(/(.*?)\s+Emp No\.\s+(\d+)/);
    if (!nameMatch) return;
    const name = nameMatch[1].trim();
    const empId = nameMatch[2].trim();

    const tableArea = emp.split('Net Pay')[1];
    if (!tableArea) return;

    // Strip out all text, leaving only numbers, decimals, and negative signs
    const cleanText = tableArea.replace(/[a-zA-Z]/g, '');
    const numbers = [...cleanText.matchAll(/-?\d+(?:\.\d+)?/g)].map(m => parseFloat(m[0]));

    // A complete financial matrix for 2 months + Totals row contains at least 78 distinct numbers
    if (numbers.length >= 78) {
      const len = numbers.length;
      
      // CRITICAL UPGRADE: By indexing the array backwards, we perfectly bypass any misaligned dates or text formatting at the beginning of the row.
      // The last 26 numbers are the Totals. The 26 before that are Month 2. The 26 before that are Month 1.
      const month2Vals = numbers.slice(len - 52, len - 26);
      const month1Vals = numbers.slice(len - 78, len - 52);

      const month1Obj = { 'Employee ID': empId, 'Name': name };
      const month2Obj = { 'Employee ID': empId, 'Name': name };

      // Map values directly to their exact column
      keys.forEach((k, i) => {
        month1Obj[k] = month1Vals[i] || 0;
        month2Obj[k] = month2Vals[i] || 0;
      });

      oldData.push(month1Obj);
      newData.push(month2Obj);
    }
  });

  return { oldData, newData };
};