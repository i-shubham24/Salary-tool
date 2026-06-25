// src/services/aiPdfParser.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as pdfjsLib from 'pdfjs-dist';

// Vite worker configuration
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// Helper to pace the API to avoid free-tier Rate Limits (429 Error)
const delay = (ms) => new Promise(res => setTimeout(res, ms));

export const parsePdfWithAI = async (file, updateStatus) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing VITE_GEMINI_API_KEY");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    systemInstruction: "You are a strict data parsing API. Convert the provided messy payroll text into a perfect JSON object. Output RAW NUMBERS ONLY without commas. Never output conversational text.",
    generationConfig: { responseMimeType: "application/json", temperature: 0.0 }
  });

  // 1. FAST LOCAL EXTRACTION
  updateStatus("Extracting raw text payload from document...");
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(item => item.str).join(' ') + " \n";
  }

  // 2. CHUNKING THE DATA
  updateStatus("Structuring document into batch processors...");
  const employeeBlocks = fullText.split('This is certified that').filter(b => b.trim().length > 100);
  
  const oldDataMaster = [];
  const newDataMaster = [];

  // We process 15 employees at a time. This guarantees we NEVER hit the 8k output token limit.
  const BATCH_SIZE = 15;
  const totalBatches = Math.ceil(employeeBlocks.length / BATCH_SIZE);

  // 3. AI BATCH PROCESSING
  for (let i = 0; i < employeeBlocks.length; i += BATCH_SIZE) {
    const currentBatchNum = Math.floor(i / BATCH_SIZE) + 1;
    updateStatus(`AI Processing Batch ${currentBatchNum} of ${totalBatches}...`);

    const batchText = employeeBlocks.slice(i, i + BATCH_SIZE).join('\n\n---NEXT EMPLOYEE---\n\n');

    const prompt = `
      Extract the payroll data for these employees.
      1. Extract Name and Employee ID.
      2. Extract FIRST month data to "oldData".
      3. Extract SECOND month data to "newData".
      4. IGNORE the "Total" row.

      Raw Text to process:
      ${batchText}

      Output Format: { "oldData": [...], "newData": [...] }
    `;

    let success = false;
    let attempts = 0;

    // Built-in retry logic in case of network drops or rate limits
    while (!success && attempts < 3) {
      try {
        const result = await model.generateContent(prompt);
        const cleanText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        
        const parsed = JSON.parse(cleanText);
        if (parsed.oldData) oldDataMaster.push(...parsed.oldData);
        if (parsed.newData) newDataMaster.push(...parsed.newData);
        success = true;
      } catch (err) {
        attempts++;
        if (err.message.includes('429')) {
          updateStatus(`Rate limit reached. Pausing 30s before retrying Batch ${currentBatchNum}...`);
          await delay(30000); 
        } else if (attempts >= 3) {
          throw new Error(`Failed to process batch ${currentBatchNum}. The PDF is too complex or API quota exceeded.`);
        }
      }
    }
    
    // Pace the API so Google doesn't block the IP (1.5 seconds between batches)
    if (currentBatchNum < totalBatches) await delay(1500);
  }

  return { oldData: oldDataMaster, newData: newDataMaster };
};
