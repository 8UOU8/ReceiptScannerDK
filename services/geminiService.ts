import { GoogleGenAI, Type } from "@google/genai";
import { Provider, type ExtractedData } from "../types";

const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const SYSTEM_PROMPT = `Extract the following details from this Danish receipt: Shop Name, Purchase Date, Total Amount, and MOMS (VAT). 

CRITICAL DATE EXTRACTION RULE (DANISH CONVENTION):
Danish receipts strictly use the format: DAY MONTH YEAR (DD MM YY or DD MM YYYY).
Example: If the text says "23 12 25", this is the 23rd of December, 2025. 
- You MUST return this as "2025-12-23".
- Never interpret the first two digits as a year (e.g., "23" is always the Day if the third number is 24 or 25).
- Always assume the order is [Day] [Month] [Year].

MOMS (VAT) RULE:
- In Denmark, MOMS is 25% of the Net Amount.
- Mathematically: Total Amount = MOMS * 5.
- If Total is missing or appears to be the Net amount (MOMS * 4), calculate/correct it using MOMS * 5.

Return valid JSON with keys: "shopName", "purchaseDate" (YYYY-MM-DD), "totalAmount", "moms".`;

const validateAndSanitizeData = (rawInput: any): ExtractedData => {
  // 1. Handle case where AI returns an array of one object instead of just the object
  const raw = Array.isArray(rawInput) ? rawInput[0] : rawInput;
  
  // 2. Explicitly cast and provide fallbacks to prevent 'undefined'
  const data: ExtractedData = {
    shopName: String(raw?.shopName || "Unknown Shop"),
    purchaseDate: String(raw?.purchaseDate || new Date().toISOString().split('T')[0]),
    // Use parseFloat to handle strings like "12.00" returned by AI
    totalAmount: parseFloat(String(raw?.totalAmount || 0)) || 0,
    moms: parseFloat(String(raw?.moms || 0)) || 0,
  };

  // 3. Danish Tax Logic check
  if (data.moms > 0) {
    const expectedTotalFromMoms = data.moms * 5;
    const diff = Math.abs(data.totalAmount - expectedTotalFromMoms);
    if (diff > 0.05 && diff < 5.0) { // Wider tolerance for sanity
      data.totalAmount = Number(expectedTotalFromMoms.toFixed(2));
    }
  }
  return data;
};

// Helper to extract JSON from markdown if present
const cleanJsonResponse = (text: string): any => {
  try {
    const cleaned = text.replace(/```json|```/gi, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse AI response as JSON", text);
    throw new Error("The AI returned an invalid data format. Please try again.");
  }
};

export const extractReceiptData = async (
  file: File, 
  apiKey: string, 
  provider: Provider,
  model: string = 'gemini-3-flash-preview'
): Promise<ExtractedData> => {
  const base64Data = await fileToGenerativePart(file);

  if (provider === Provider.GEMINI) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || apiKey });
    
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        shopName: { type: Type.STRING },
        purchaseDate: { type: Type.STRING },
        totalAmount: { type: Type.NUMBER },
        moms: { type: Type.NUMBER },
      },
      required: ["shopName", "purchaseDate", "totalAmount", "moms"],
    };

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { inlineData: { mimeType: file.type, data: base64Data } },
          { text: SYSTEM_PROMPT },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1,
      },
    });

    if (response.text) {
      return validateAndSanitizeData(cleanJsonResponse(response.text));
    }
    throw new Error("Empty response from Gemini.");
  } else {
    // OpenRouter Implementation
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "Danish Receipt Scanner",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: SYSTEM_PROMPT + "\nReturn valid JSON object strictly." },
              {
                type: "image_url",
                image_url: { url: `data:${file.type};base64,${base64Data}` },
              },
            ],
          },
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `OpenRouter failed: ${response.status}`);
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content in OpenRouter response");
    
    return validateAndSanitizeData(cleanJsonResponse(content));
  }
};