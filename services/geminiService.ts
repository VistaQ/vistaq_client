import { GoogleGenAI, Type } from "@google/genai";

// Lazy-initialize Gemini client so missing API key doesn't crash the app on load.
let _ai: GoogleGenAI | null = null;
const getAI = (): GoogleGenAI | null => {
  if (!process.env.API_KEY) return null;
  if (!_ai) _ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return _ai;
};

// Fallback messages for when API Quota is exceeded
const FALLBACK_CHAT_MSG = "I apologize, but I am currently experiencing high traffic (Quota Exceeded). Here is a general tip: Focus on building rapport during your first appointment to increase conversion rates.";
const FALLBACK_MARKET_MSG = "Live market data is currently unavailable. General Insight: The Malaysian insurance market is currently seeing a trend towards Investment-Linked Products (ILP) and higher medical coverage limits due to medical inflation.";
const FALLBACK_ANALYSIS_MSG = "AI Analysis Unavailable (Quota Limit Reached).\n\nStrategic Recommendation:\n1. Review your 'Appointment' stage prospects.\n2. Focus on follow-ups for prospects who haven't responded in 3 days.\n3. Ensure all recent sales are logged to update your points.";

/**
 * 1. AI Chatbot for Agent Coaching (Fast Response)
 * Uses gemini-2.5-flash-lite for speed.
 */
export const getChatResponse = async (history: {role: string, parts: string[]}[], message: string): Promise<string> => {
  try {
    const ai = getAI();
    if (!ai) return "AI Configuration Error: API Key missing.";

    const model = 'gemini-2.5-flash-lite-latest';

    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: "You are an expert sales coach for insurance agents in Malaysia. Provide concise, encouraging, and actionable advice.",
      },
      history: history.map(h => ({
        role: h.role,
        parts: h.parts.map(p => ({ text: p }))
      }))
    });

    const result = await chat.sendMessage({ message });
    return result.text || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.warn("Gemini Chat Error (Using Fallback):", error);
    return FALLBACK_CHAT_MSG;
  }
};

/**
 * 2. Market Insights (Search Grounding)
 * Uses gemini-3-flash-preview with googleSearch tool.
 */
export const getMarketInsights = async (query: string): Promise<string> => {
  try {
    const ai = getAI();
    if (!ai) return "AI Configuration Error: API Key missing.";

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a financial analyst. Provide a summary of the latest insurance market trends in Malaysia. Always cite your sources.",
      },
    });

    let text = response.text || "No insights found.";
    
    // Append grounding sources if available
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks && chunks.length > 0) {
      text += "\n\n**Sources:**\n";
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
          text += `- [${chunk.web.title}](${chunk.web.uri})\n`;
        }
      });
    }

    return text;
  } catch (error) {
    console.warn("Gemini Market Insights Error (Using Fallback):", error);
    return FALLBACK_MARKET_MSG;
  }
};

/**
 * 3. Strategic Analysis (Thinking Mode)
 * Uses gemini-3-pro-preview with thinkingBudget for deep analysis of performance.
 */
export const analyzePerformance = async (dataContext: string): Promise<string> => {
  try {
    const ai = getAI();
    if (!ai) return "AI Configuration Error: API Key missing.";

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Analyze this agent's performance data and suggest specific improvements strategy: ${dataContext}`,
      config: {
        thinkingConfig: { thinkingBudget: 1024 }, // Reduced budget to save tokens if possible, or use 0 to disable
      },
    });

    return response.text || "Analysis incomplete.";
  } catch (error) {
    console.warn("Gemini Analysis Error (Using Fallback):", error);
    return FALLBACK_ANALYSIS_MSG;
  }
};