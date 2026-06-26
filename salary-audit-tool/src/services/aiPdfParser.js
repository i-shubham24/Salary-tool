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

export const parsePdfWithAI = async (file) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing VITE_GEMINI_API_KEY");

  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Locked to 1.5-flash to completely bypass the 20-request daily limit of 2.5!
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash-latest",
    generationConfig: { responseMimeType: "application/json" }
  });

  // UPGRADE: The prompt now uses conditional logic so it doesn't crash on exactly 2 months.
  const prompt = `
    You are an expert financial AI data extractor. 
    Read this payroll certificate PDF carefully. It contains employee salary tables spanning 2 or more months.
    
    For EVERY employee listed:
    1. Extract their Name and Employee ID (Emp No).
    2. Extract their data for the FIRST (oldest) month into an "oldData" array.
    3. Extract their data for the SECOND month into a "newData" array.
    4. IF there are additional months (like a 3rd or 4th month), IGNORE them completely. Your output must strictly contain only the first two months.
    5. IGNORE the "Total" row completely.
    
    Format Requirements:
    - Return RAW NUMBERS ONLY for financial values. Strip all commas (e.g., return 29650 instead of "29,650").
    - Use the exact column headers found in the PDF.
    - **CRITICAL:** You MUST extract the timeline for each month into two explicit keys: "Month" (String, e.g. "MAY 2026") and "Days" (Number, e.g. 31).
    - Output a single JSON object: { "oldData": [...], "newData": [...] }
  `;

  try {
    const fileBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(fileBuffer);
    const totalPages = pdfDoc.getPageCount();

    const allOldData = [];
    const allNewData = [];

    const CHUNK_SIZE = 8;
    const totalChunks = Math.ceil(totalPages / CHUNK_SIZE);

    for (let i = 0; i < totalPages; i += CHUNK_SIZE) {
      const chunkNum = Math.floor(i / CHUNK_SIZE) + 1;
      console.log(`Processing AI Vision Chunk ${chunkNum} of ${totalChunks}...`);

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
          const result = await model.generateContent([prompt, inlineData]);
          const jsonString = result.response.text();
          const parsed = JSON.parse(jsonString);

          if (parsed.oldData) allOldData.push(...parsed.oldData);
          if (parsed.newData) allNewData.push(...parsed.newData);
          success = true;
        } catch (err) {
          attempts++;
          console.warn(`Chunk ${chunkNum} failed attempt ${attempts}:`, err);
          if (attempts >= 3) throw err;
          await delay(4000); 
        }
      }

      if (endPage < totalPages) await delay(2000);
    }

    return { oldData: allOldData, newData: allNewData };

  } catch (error) {
    console.error("AI Parsing Error Details:", error);
    throw new Error(`Google API Error: ${error.message}`);
  }
};