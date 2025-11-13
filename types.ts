
export interface ConversionSuggestion {
  format: string;
  extension: string;
}

export interface FileAnalysisResult {
  type: 'file';
  fileType: string;
  extension: string;
  description: string;
  commonUses: string[];
  potentialRisks: string[];
  conversionSuggestions: ConversionSuggestion[];
}

export interface ImageAnalysisResult {
  type: 'image';
  format: string;
  description: string;
  tags: string[];
  editSuggestions: string[];
  conversionSuggestions: ConversionSuggestion[];
}

export type AnalysisResult = FileAnalysisResult | ImageAnalysisResult;

export interface ConversionResult {
  content: string; // The new file content (text or base64 for binary)
  isBinary: boolean; // Flag to know if content is base64
  mimeType: string;
}

export interface ScanResult {
  status: 'clean' | 'threat_found';
  threatName?: string;
  scannedAt: string;
  engineVersion: string;
}

// User and History Types
export interface User {
  name: string;
  subscription: 'Free Trial' | 'Pro' | 'Expired';
  trialEndsAt?: number; // Timestamp
  settings: {
    darkMode: boolean;
    notifications: boolean;
  };
}

export interface ConversionHistoryEntry {
  id: string;
  originalName: string;
  fromFormat: string;
  toFormat: string;
  timestamp: string;
}