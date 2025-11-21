import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Download, RefreshCw, Plus, Loader2, LogOut } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ReceiptItem, ProcessingStatus, ExtractedData } from './types';
import { extractReceiptData } from './services/geminiService';
import { ReceiptCard } from './components/ReceiptCard';
import { generateCSV } from './utils/csvGenerator';
import { DataVisualization } from './components/DataVisualization';
import { processFileForDisplay } from './utils/imageProcessing';

const App: React.FC = () => {
  // State for API Key
  const [apiKey, setApiKey] = useState(localStorage.getItem('danish_receipt_scanner_api_key') || '');
  
  // App State
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- API Key Management ---
  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const key = formData.get('apiKey') as string;
    if (key && key.trim()) {
      const trimmedKey = key.trim();
      localStorage.setItem('danish_receipt_scanner_api_key', trimmedKey);
      setApiKey(trimmedKey);
    }
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to remove your API key?")) {
      localStorage.removeItem('danish_receipt_scanner_api_key');
      setApiKey('');
      setReceipts([]);
    }
  };

  // --- File Processing ---

  const processReceipt = async (receipt: ReceiptItem) => {
    setReceipts(prev => prev.map(r => r.id === receipt.id ? { ...r, status: ProcessingStatus.PROCESSING } : r));

    try {
      // Pass the current apiKey to the service
      const data = await extractReceiptData(receipt.file, apiKey);
      setReceipts(prev => prev.map(r => r.id === receipt.id ? { ...r, status: ProcessingStatus.COMPLETED, data } : r));
    } catch (error) {
      setReceipts(prev => prev.map(r => r.id === receipt.id ? { ...r, status: ProcessingStatus.ERROR, error: 'Failed to extract data.' } : r));
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsConverting(true);
    
    try {
      // Process files to convert HEIC if necessary
      const processedFilesPromises = Array.from(files).map(async (file) => {
        const processedFile = await processFileForDisplay(file);
        return {
          id: uuidv4(),
          file: processedFile,
          previewUrl: URL.createObjectURL(processedFile),
          status: ProcessingStatus.IDLE,
        } as ReceiptItem;
      });

      const newReceipts = await Promise.all(processedFilesPromises);

      setReceipts(prev => [...prev, ...newReceipts]);
      setIsConverting(false);

      // Process files one by one
      for (const receipt of newReceipts) {
        await processReceipt(receipt);
      }
    } catch (error) {
      console.error("Error processing files:", error);
      setIsConverting(false);
    }
  };

  // --- Event Handlers ---

  const handleDelete = (id: string) => {
    setReceipts(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdate = (id: string, newData: ExtractedData) => {
      setReceipts(prev => prev.map(r => r.id === id ? {...r, data: newData} : r));
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleClearAll = () => {
    if(window.confirm("Are you sure you want to clear all receipts?")) {
        setReceipts([]);
    }
  };

  // --- Renders ---

  // 1. API Key Entry Screen
  if (!apiKey) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-200 p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 p-3 rounded-full">
              <FileText className="text-blue-600" size={32} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">ReceiptScanner DK</h1>
          <p className="text-center text-slate-500 mb-8">
            To use this app on GitHub Pages, please enter your Gemini API Key.
          </p>
          
          <form onSubmit={handleApiKeySubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Gemini API Key</label>
              <input 
                name="apiKey" 
                type="password" 
                placeholder="AIza..." 
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm">
              Start Scanning
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm text-slate-400">
            <p>Your API key is stored locally in your browser.</p>
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noreferrer" 
              className="text-blue-600 hover:underline mt-1 inline-block"
            >
              Get a free API Key
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 2. Main App Interface
  const completedCount = receipts.filter(r => r.status === ProcessingStatus.COMPLETED).length;
  const hasData = completedCount > 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <FileText className="text-white" size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Receipt<span className="text-blue-600">Scanner</span> DK</h1>
          </div>
          
          <div className="flex items-center gap-3">
             {receipts.length > 0 && (
                 <button 
                    onClick={handleClearAll}
                    className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                 >
                     <RefreshCw size={16} /> Clear
                 </button>
             )}
            <button
              onClick={() => generateCSV(receipts)}
              disabled={!hasData}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all shadow-sm
                ${hasData 
                  ? 'bg-green-600 text-white hover:bg-green-700 hover:shadow hover:-translate-y-0.5' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              <Download size={18} /> Export CSV
            </button>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Change API Key"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Intro / Empty State or Stats */}
        {!hasData && receipts.length === 0 ? (
            <div className="mb-10 text-center py-16">
                <h2 className="text-3xl font-bold text-slate-800 mb-3">Track your Danish expenses effortlessly.</h2>
                <p className="text-slate-500 max-w-2xl mx-auto text-lg">Upload your receipts (JPG, PNG, HEIC) to automatically extract dates, totals, and Moms (VAT).</p>
            </div>
        ) : (
           <DataVisualization items={receipts} />
        )}

        {/* File Upload Area */}
        <div 
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !isConverting && fileInputRef.current?.click()}
          className={`
            relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 ease-in-out
            flex flex-col items-center justify-center py-12 px-4 text-center mb-10
            ${isDragging 
              ? 'border-blue-500 bg-blue-50 scale-[1.01]' 
              : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50 bg-white'
            }
            ${isConverting ? 'opacity-75 cursor-wait' : ''}
          `}
        >
          <input 
            type="file" 
            multiple 
            accept="image/*,.heic,.heif"
            className="hidden" 
            ref={fileInputRef}
            onChange={(e) => handleFiles(e.target.files)}
            disabled={isConverting}
          />
          
          <div className={`p-4 rounded-full mb-4 transition-colors ${isDragging ? 'bg-blue-100' : 'bg-slate-100 group-hover:bg-blue-50'}`}>
            {isConverting ? (
              <Loader2 className="text-blue-600 animate-spin" size={32} />
            ) : isDragging ? (
              <Plus className="text-blue-600" size={32} />
            ) : (
              <UploadCloud className="text-slate-400 group-hover:text-blue-500" size={32} />
            )}
          </div>
          
          <h3 className="text-lg font-semibold text-slate-700 mb-1">
            {isConverting 
              ? 'Preparing files...' 
              : isDragging 
                ? 'Drop files here' 
                : 'Click to upload or drag & drop'
            }
          </h3>
          <p className="text-sm text-slate-500">Supports JPEG, PNG, HEIC receipts.</p>
        </div>

        {/* Receipt List */}
        {receipts.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Processed Receipts <span className="text-slate-400 font-normal ml-2">({completedCount}/{receipts.length})</span></h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {receipts.map(receipt => (
                <ReceiptCard 
                  key={receipt.id} 
                  item={receipt} 
                  onDelete={handleDelete}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;