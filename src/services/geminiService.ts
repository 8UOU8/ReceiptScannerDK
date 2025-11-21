import { GoogleGenAI, Type } from "@google/genai";
import type { ExtractedData } from "../types";

/**
 * Converts a File object to a Base64 string.
 */
const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Extracts receipt data using Gemini 2.5 Flash.
 * Requires apiKey to be passed dynamically.
 */
export const extractReceiptData = async (file: File, apiKey: string): Promise<ExtractedData> => {
  // Initialize Gemini Client with the user-provided key
  const ai = new GoogleGenAI({ apiKey });

  const base64Data = await fileToGenerativePart(file);

  // Define the schema for the extracted data
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      shopName: {
        type: Type.STRING,
        description: "The name of the shop or company issuing the receipt.",
      },
      purchaseDate: {
        type: Type.STRING,
        description: "The purchase date formatted strictly as YYYY-MM-DD.",
      },
      totalAmount: {
        type: Type.NUMBER,
        description: "The total amount paid (Total).",
      },
      moms: {
        type: Type.NUMBER,
        description: "The total VAT (MOMS) amount included in the receipt.",
      },
    },
    required: ["shopName", "purchaseDate", "totalAmount", "moms"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: file.type,
              data: base64Data,
            },
          },
          {
            text: `Extract the following details from this Danish receipt: Shop Name, Purchase Date, Total Amount, and MOMS (VAT). 
            
            Important Verification Rules:
            1. In Denmark, MOMS (VAT) is 25% of the Net Amount. This means MOMS is 20% of the Total Amount (Gross).
            2. Mathematically: Total Amount = MOMS * 5.
            3. Please double check the extracted Total Amount against the MOMS amount. 
            4. If the explicit "Total" on the receipt does not match MOMS * 5 roughly, check if you have accidentally extracted the Net Amount instead of the Total. 
            5. Prioritize the visually explicit "Total" or "At Betale" line.
            6. If the extracted Total equals MOMS * 4, it is INCORRECT (Net Amount). You MUST use MOMS * 5.
            
            Ensure the date is in YYYY-MM-DD format. If a field is missing, make a reasonable guess or return 0/empty.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1, // Low temperature for more deterministic extraction
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text) as ExtractedData;

      // Post-processing validation (Double Check Logic)
      // Enforce Total = Moms * 5 relationship
      if (data.moms > 0) {
        const expectedTotalFromMoms = data.moms * 5;
        const expectedNet = data.moms * 4;
        
        // If Total is 0 or missing, assume derived from Moms
        if (!data.totalAmount || data.totalAmount === 0) {
            console.log(`Missing Total Amount. Inferred ${expectedTotalFromMoms} from MOMS.`);
            data.totalAmount = Number(expectedTotalFromMoms.toFixed(2));
        } else {
            const diff = Math.abs(data.totalAmount - expectedTotalFromMoms);

            // If the difference is significant (more than 0.10 DKK)
            if (diff > 0.1) {
              // Case 1: It matches the Net Amount (Moms * 4) -> Definite Error, Fix it.
              if (Math.abs(data.totalAmount - expectedNet) < 1.0) {
                console.log(`Correction applied: Total Amount updated from ${data.totalAmount} to ${expectedTotalFromMoms} (was Net Amount).`);
                data.totalAmount = Number(expectedTotalFromMoms.toFixed(2));
              } 
              // Case 2: It's close enough (e.g. rounding error) -> Align to Moms * 5
              else if (diff < 2.0) {
                 // If it's within 2 DKK, we trust the MOMS * 5 math as ground truth for clean data
                 console.log(`Minor discrepancy correction: Total updated from ${data.totalAmount} to ${expectedTotalFromMoms}`);
                 data.totalAmount = Number(expectedTotalFromMoms.toFixed(2));
              }
              // Case 3: Large discrepancy -> Keep OCR value but warn. (e.g. mixed VAT rates)
              else {
                console.warn(`Major discrepancy detected: Total (${data.totalAmount}) != Moms * 5 (${expectedTotalFromMoms}). Keeping original OCR value.`);
              }
            }
        }
      }

      return data;
    } else {
      throw new Error("No text response received from Gemini.");
    }
  } catch (error) {
    console.error("Error extracting receipt data:", error);
    throw error;
  }
};