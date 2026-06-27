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
  
  const model = genAI.getGenerativeModel({ 
    model: "gemini-3.1-flash-lite",
    generationConfig: { responseMimeType: "application/json" }
  });

  // UPGRADE: Heavily fortified prompt to prevent "Column Drift" and handle duplicate headers
  const prompt = `
    You are an expert financial AI data extractor. 
    Read this payroll certificate PDF. Extract EVERY SINGLE employee salary row you see into a single flat array.
    
    For EVERY row found, extract:
    1. Employee Name and Employee ID (Emp No).
    2. The specific Month (String, e.g. "MAY 2026") and Days (Number).
    3. All financial parameters using the exact column headers found in the PDF.
    
    CRITICAL ANTI-DRIFT & LAYOUT INSTRUCTIONS:
    - AVOID COLUMN DRIFT: This table is very wide with many consecutive zeros (0). You MUST trace vertically down from each specific header to the exact number below it. Do not shift values left or right.
    - DUPLICATE HEADERS: Notice there is a "Misc" column BEFORE T.Pay, and a second "Misc." column AFTER Adv. You MUST name them "Misc 1" and "Misc 2" in your JSON to prevent data from being overwritten!
    - Verify that DA, HRA, FMA, and Arear values strictly align with their headers.
    
    Format Requirements:
    - IGNORE "Total" rows completely.
    - Return RAW NUMBERS ONLY for financial values. Strip all commas.
    - Output STRICTLY in this JSON format:
      {
        "extractedData": [
          { "Employee ID": "123", "Name": "John", "Month": "MAY 2026", "Days": 31, "T.Pay": 50000, "Misc 1": 0, "Misc 2": 120, ... }
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

    employeeMap.forEach((empData) => {
      if (empData.records.length >= 2) {
        finalOldData.push(empData.records[0]);
        finalNewData.push(empData.records[1]);
      } else if (empData.records.length === 1) {
        finalOldData.push(empData.records[0]);
      }
    });

    return { oldData: finalOldData, newData: finalNewData };

  } catch (error) {
    console.error("AI Parsing Error Details:", error);
    throw new Error(error.message.includes("Self-Limiter") ? error.message : `Google API Error: ${error.message}`);
  }
};
