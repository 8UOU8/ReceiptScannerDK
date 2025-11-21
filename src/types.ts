export enum ProcessingStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

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

export interface ChartDataPoint {
  name: string;
  value: number;
}