// src/services/gemini.js
import { GoogleGenerativeAI } from "@google/generative-ai";

export const generateAIAuditReport = async (auditResults) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return "AI Features Offline: Please supply VITE_GEMINI_API_KEY in your .env.local file.";
  }

  // Corrected Class Name
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Using gemini-2.5-flash for real-time data analysis summary
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
    1. The core factor driving the change (e.g., across-the-board HRA hikes, base pay increases, or new hires).
    2. Any potential compliance or cost anomalies detected in individual structures.
    3. An actionable takeaway for management.
  `;

  try {
    const result = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
    return result.response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to compile AI insights. Check API keys or quota limits.";
  }
};