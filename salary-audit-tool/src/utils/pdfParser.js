import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const parseSalaryPdf = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = "";

  // Extract raw text from all pages
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    
    // THE FIX: Spatial Sorting Algorithm
    // Forces the PDF reader to read top-to-bottom, left-to-right like a human
    const items = content.items.sort((a, b) => {
      // PDF coordinate system (0,0) is bottom-left. Higher Y means higher on page.
      const yDiff = b.transform[5] - a.transform[5];
      // If text is roughly on the same horizontal line (within 5 pixels), sort by X
      if (Math.abs(yDiff) < 5) {
        return a.transform[4] - b.transform[4];
      }
      return yDiff;
    });

    fullText += items.map(item => item.str).join(' ') + " ";
  }

  // Split text into individual employee blocks
  const employees = fullText.split('This is certified that').slice(1);
  
  const oldData = [];
  const newData = [];

  const mapToObj = (empId, name, arr) => ({
    'Employee ID': empId,
    'Name': name,
    'Basic': arr[0],
    'Spl.': arr[1],
    'PGT': arr[2],
    'NPA': arr[3],
    'DA': arr[4],
    'HRA': arr[5],
    'FMA': arr[6],
    'Arear': arr[7],
    'SHP': arr[8],
    'PFP': arr[9],
    'Misc_Earn': arr[10],
    'T.Pay': arr[11], 
    'Sec.': arr[12],
    'I.Tax': arr[13],
    'PFD': arr[14],
    'Elect.': arr[15],
    'Adv.': arr[16],
    'Misc_Ded': arr[17],
    'Ins.': arr[18],
    'T/INS': arr[19],
    'Wel': arr[20],
    'HRD': arr[21],
    'ESI': arr[22],
    'P.Tax': arr[23],
    'T.DD': arr[24],
    'Net Pay': arr[25]
  });

  employees.forEach(emp => {
    const nameMatch = emp.match(/(.*?)\s+Emp No\.\s+(\d+)/);
    if (!nameMatch) return;
    const name = nameMatch[1].trim();
    const empId = nameMatch[2].trim();

    const tableArea = emp.split('Net Pay')[1];
    if (!tableArea) return;

    // Clean string: Remove months and years
    const cleanText = tableArea.replace(/JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC/g, '')
                               .replace(/202[4-9]/g, '');

    const numbers = [...cleanText.matchAll(/-?\b\d+(?:\.\d+)?\b/g)].map(m => parseFloat(m[0]));

    // A complete table block has exactly 80 numbers.
    // By enforcing this, we safely grab the true Month 1 and Month 2 rows.
    if (numbers.length >= 80) { 
      const month1 = numbers.slice(1, 27);
      const month2 = numbers.slice(28, 54);
      
      oldData.push(mapToObj(empId, name, month1));
      newData.push(mapToObj(empId, name, month2));
    }
  });

  return { oldData, newData };
};