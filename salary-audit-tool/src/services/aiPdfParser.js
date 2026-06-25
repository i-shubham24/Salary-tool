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
    systemInstruction: "You are a high-speed, deterministic data extraction API. Your only purpose is to output strictly formatted JSON. Strip all commas from numeric values. Never output conversational text or error messages.",
    generationConfig: { 
      responseMimeType: "application/json",
      temperature: 0.0, 
      topK: 1, 
    }
  });

  const prompt = `
    Read this payroll certificate PDF. 
    For EVERY employee listed:
    1. Extract Name and Employee ID.
    2. Extract FIRST month data to "oldData" array.
    3. Extract SECOND month data to "newData" array.
    4. IGNORE the "Total" row.
    
    Output Format: { "oldData": [...], "newData": [...] }
    Use the exact column headers found in the document. 
    Output raw numbers only (e.g. 29650, not "29,650").
  `;

  try {
    const pdfPart = await fileToGenerativePart(file);
    const result = await model.generateContent([prompt, pdfPart]);
    let rawText = result.response.text();

    // SAFETY NET 1: Strip Markdown formatting if the AI accidentally adds it
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    // SAFETY NET 2: Catch if the AI literally wrote an "Error" message instead of JSON
    if (rawText.startsWith("Error") || rawText.startsWith("I cannot")) {
      console.warn("AI generated a text response instead of JSON:", rawText);
      throw new Error(`AI Engine Refusal: ${rawText.substring(0, 50)}...`);
    }

    // Attempt to safely parse the cleaned string
    return JSON.parse(rawText);

  } catch (error) {
    console.error("AI Parsing Error Details:", error);
    
    // If it STILL fails to parse, it means the JSON was truncated or malformed
    if (error instanceof SyntaxError) {
      throw new Error("The AI returned a malformed data structure. The PDF might be too large for a single extraction. Please try again.");
    }
    
    throw new Error(error.message || "The AI Engine failed to read the document due to network timeout or quota limits.");
  }
};
