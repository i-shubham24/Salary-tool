// src/services/aiPdfParser.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const fileToGenerativePart = async (file) => {
  const base64EncodedDataPromise = new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

export const parsePdfWithAI = async (file) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing VITE_GEMINI_API_KEY");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  });

  const prompt = `
    You are an expert financial AI data extractor. 
    Read this payroll certificate PDF carefully. It contains employee salary tables spanning two distinct months.
    
    For EVERY employee listed:
    1. Extract their Name and Employee ID (Emp No).
    2. Extract their data for the FIRST month into an "oldData" array.
    3. Extract their data for the SECOND month into a "newData" array.
    4. IGNORE the "Total" row completely.
    
    Format Requirements:
    - Return RAW NUMBERS ONLY. Strip all commas (e.g., return 29650 instead of "29,650").
    - Use the exact column headers found in the PDF (e.g., "Basic", "Spl.", "PGT", "T.Pay", "Net Pay", "PFD").
    - Output a single JSON object: { "oldData": [...], "newData": [...] }
  `;

  try {
    const pdfPart = await fileToGenerativePart(file);
    const result = await model.generateContent([prompt, pdfPart]);
    const jsonString = result.response.text();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("AI Parsing Error:", error);
    throw new Error("The AI Engine failed to read the document. Ensure it is a valid PDF and API quota is available.");
  }
};