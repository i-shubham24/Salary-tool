// src/services/gemini.js
import { GoogleGenerativeAI } from "@google/generative-ai";

export const generateAIAuditReport = async (auditResults) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return "AI Features Offline: Please supply VITE_GEMINI_API_KEY in your .env.local file.";
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Filter out anomalies or major shifts to save context window tokens
  const majorShifts = auditResults.changes
    .filter(c => Math.abs(c.grossDelta) > 0)
    .slice(0, 15)
    .map(c => ({
      name: c.name,
      delta: c.grossDelta,
      factors: Object.keys(c.breakdown).map(k => `${k}: ${c.breakdown[k].delta}`)
    }));

  const prompt = `
    You are an expert financial payroll auditor. Analyze this data summary of an organizational payroll structure shift:
    - Overall Net Variance: ${auditResults.summary.netVariance}
    - Percent Shift: ${auditResults.summary.pctChange}%
    - Top Change Outliers: ${JSON.stringify(majorShifts)}

    Provide a concise, 3-bullet executive summary highlighting:
    1. The core factor driving the change (e.g., across-the-board hikes, base pay increases, or new hires).
    2. Any potential compliance or cost anomalies detected in individual structures.
    3. An actionable takeaway for management.
  `;

  const primaryModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const backupModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  try {
    const result = await primaryModel.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
    return result.response.text;
    
  } catch (error) {
    console.warn("Primary AI model busy, attempting backup...", error.message);
    
    try {
      const backupResult = await backupModel.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
      return backupResult.response.text;
      
    } catch (backupError) {
      console.error("AI API Error:", backupError.message);
      
      // Specifically catch the 429 Quota Exceeded error
      if (backupError.message.includes('429') || backupError.message.includes('Quota')) {
         return "API Rate Limit Exceeded: The free AI engine is receiving requests too quickly. Please wait 60 seconds before executing another generative report.";
      }
      
      // Specifically catch the 503 Server Demand error
      if (backupError.message.includes('503')) {
         return "The AI Analysis servers are currently experiencing unusually high global demand. Your mathematical audit is fully complete. Please try generating the AI summary again later.";
      }
      
      return "Failed to compile AI insights due to an unexpected network error. Please check your connection or try again later.";
    }
  }
};