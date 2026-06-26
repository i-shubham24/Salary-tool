// src/services/aiPdfParser.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PDFDocument } from "pdf-lib";

const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const delay = (ms) => new Promise(res => setTimeout(res, ms));

const enforceDailyQuota = (limit = 500) => {
  const today = new Date().toISOString().split('T')[0];
  const usageData = JSON.parse(localStorage.getItem('credex_gemini_usage')) || { date: today, count: 0 };

  if (usageData.date !== today) {
    usageData.date = today;
    usageData.count = 0;
  }

  if (usageData.count >= limit) {
    throw new Error(`Self-Limiter: Daily budget of ${limit} API requests exceeded. Please try again tomorrow.`);
  }

  usageData.count++;
  localStorage.setItem('credex_gemini_usage', JSON.stringify(usageData));
  
  return usageData.count;
};

export const parsePdfWithAI = async (file, updateStatus) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing VITE_GEMINI_API_KEY");

  const genAI = new GoogleGenerativeAI(apiKey);
  
  // FIXED: Using the actual stable high-capacity model
  const model = genAI.getGenerativeModel({ 
    model: "gemini-3.1-flash-lite",
    generationConfig: { responseMimeType: "application/json" }
  });

  // CRITICAL UPGRADE: Flat architecture. The AI simply grabs rows; JS handles the pairing later.
  const prompt = `
    You are an expert financial AI data extractor. 
    Read this payroll certificate PDF. Extract EVERY SINGLE employee salary row you see into a single flat array.
    
    For EVERY row found, extract:
    1. Employee Name and Employee ID (Emp No).
    2. The specific Month (String, e.g. "MAY 2026") and Days (Number).
    3. All financial parameters using the exact column headers found in the PDF.
    
    Format Requirements:
    - IGNORE "Total" rows completely.
    - Return RAW NUMBERS ONLY for financial values. Strip all commas.
    - Output STRICTLY in this JSON format:
      {
        "extractedData": [
          { "Employee ID": "123", "Name": "John", "Month": "MAY 2026", "Days": 31, "T.Pay": 50000, ... },
          { "Employee ID": "123", "Name": "John", "Month": "JUN 2026", "Days": 30, "T.Pay": 50000, ... }
        ]
      }
  `;

  try {
    if (updateStatus) updateStatus("Initializing AI Vision Engine...");
    const fileBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(fileBuffer);
    const totalPages = pdfDoc.getPageCount();

    const allExtractedData = [];
    const CHUNK_SIZE = 3;
    const totalChunks = Math.ceil(totalPages / CHUNK_SIZE);

    for (let i = 0; i < totalPages; i += CHUNK_SIZE) {
      const chunkNum = Math.floor(i / CHUNK_SIZE) + 1;
      if (updateStatus) updateStatus(`AI Processing Micro-Batch ${chunkNum} of ${totalChunks}...`);

      const miniPdf = await PDFDocument.create();
      const endPage = Math.min(i + CHUNK_SIZE, totalPages);
      const pageIndices = Array.from({ length: endPage - i }, (_, index) => i + index);
      const copiedPages = await miniPdf.copyPages(pdfDoc, pageIndices);
      copiedPages.forEach((page) => miniPdf.addPage(page));

      const miniPdfBytes = await miniPdf.save();
      const base64Data = arrayBufferToBase64(miniPdfBytes);

      const inlineData = {
        inlineData: { data: base64Data, mimeType: "application/pdf" },
      };

      let attempts = 0;
      let success = false;

      while (!success && attempts < 3) {
        try {
          enforceDailyQuota(500);

          const result = await model.generateContent([prompt, inlineData]);
          let jsonString = result.response.text();
          jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
          
          const parsed = JSON.parse(jsonString);

          // Push the flat rows into our master list
          if (parsed.extractedData) allExtractedData.push(...parsed.extractedData);
          success = true;
        } catch (err) {
          attempts++;
          if (err.message.includes("Self-Limiter")) throw err; 
          
          console.warn(`Chunk ${chunkNum} failed attempt ${attempts}:`, err.message);
          
          if (err.message.includes('429') || err.message.includes('503') || err.message.includes('Quota')) {
            if (updateStatus) updateStatus(`Google Network Limit. Pausing 30s to protect data...`);
            await delay(30000); 
          } else if (attempts >= 3) {
            throw err;
          } else {
            await delay(4000); 
          }
        }
      }

      if (endPage < totalPages) await delay(3000);
    }

    if (updateStatus) updateStatus("Compiling Variance Report...");

    // --- THE MAGIC: JAVASCRIPT ASSEMBLY ---
    // Group all the randomly scattered rows by Employee ID
    const employeeMap = new Map();
    
    allExtractedData.forEach(row => {
      const empId = String(row['Employee ID'] || row['Emp No'] || '').trim();
      if (!empId) return;
      
      if (!employeeMap.has(empId)) {
        employeeMap.set(empId, { name: row['Name'], records: [] });
      }
      employeeMap.get(empId).records.push(row);
    });

    const finalOldData = [];
    const finalNewData = [];

    // Because chunks are processed chronologically (Pages 1 to End), 
    // the records arrays are naturally in chronological order!
    employeeMap.forEach((empData) => {
      if (empData.records.length >= 2) {
        // Only grab the very first two months to ignore 3rd/4th quarters
        finalOldData.push(empData.records[0]);
        finalNewData.push(empData.records[1]);
      } else if (empData.records.length === 1) {
        // Handle new hires or departed employees with only 1 month
        finalOldData.push(empData.records[0]);
      }
    });

    return { oldData: finalOldData, newData: finalNewData };

  } catch (error) {
    console.error("AI Parsing Error Details:", error);
    throw new Error(error.message.includes("Self-Limiter") ? error.message : `Google API Error: ${error.message}`);
  }
};