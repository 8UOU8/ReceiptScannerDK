export const ProcessingStatus = {
  IDLE: 'IDLE',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  ERROR: 'ERROR'
} as const;

export type ProcessingStatus = typeof ProcessingStatus[keyof typeof ProcessingStatus];

export const Provider = {
  GEMINI: 'GEMINI',
  OPENROUTER: 'OPENROUTER'
} as const;

export type Provider = typeof Provider[keyof typeof Provider];

export interface ExtractedData {
  shopName: string;
  purchaseDate: string; // YYYY-MM-DD
  totalAmount: number;
  moms: number;
}

export interface ReceiptItem {
  id: string;
  file: File;
  previewUrl: string;
  status: ProcessingStatus;
  data?: ExtractedData;
  error?: string;
}