import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, Download, Loader2, Key, Globe, ShieldCheck, ShieldAlert } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ProcessingStatus, Provider } from './types';
import type { ReceiptItem } from './types';
import { extractReceiptData } from './services/geminiService';
import { ReceiptCard } from './components/ReceiptCard';
import { generateCSV } from './utils/csvGenerator';
import { DataVisualization } from './components/DataVisualization';
import { processFileForDisplay } from './utils/imageProcessing';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('receipt_api_key') || '');
  const [provider, setProvider] = useState<Provider>(() => (localStorage.getItem('receipt_provider') as Provider) || Provider.GEMINI);
  
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('receipt_api_key', apiKey);
    localStorage.setItem('receipt_provider', provider);
  }, [apiKey, provider]);

  const processReceipt = async (receipt: ReceiptItem) => {
    setReceipts(prev => prev.map(r => r.id === receipt.id ? { ...r, status: ProcessingStatus.PROCESSING } : r));
    try {
      const data = await extractReceiptData(receipt.file, apiKey, provider);
      setReceipts(prev => prev.map(r => r.id === receipt.id ? { ...r, status: ProcessingStatus.COMPLETED, data } : r));
    } catch (error: any) {
      console.error(error);
      setReceipts(prev => prev.map(r => r.id === receipt.id ? { ...r, status: ProcessingStatus.ERROR, error: error?.message || 'Extraction failed.' } : r));
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsConverting(true);
    try {
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
      
      for (const receipt of newReceipts) {
        await processReceipt(receipt);
      }
    } catch (error) {
      setIsConverting(false);
    }
  };

  const completedCount = receipts.filter(r => r.status === ProcessingStatus.COMPLETED).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-auto sm:h-20 flex flex-col sm:flex-row items-center justify-between gap-4 py-4 sm:py-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-md"><FileText className="text-white" size={20} /></div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight whitespace-nowrap">ReceiptScanner <span className="text-blue-600">DK</span></h1>
          </div>
          
          <div className="flex flex-1 items-center justify-center sm:justify-end gap-3 w-full sm:w-auto">
            <div className="relative group min-w-[140px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Globe size={14} />
              </div>
              <select 
                value={provider}
                onChange={(e) => setProvider(e.target.value as Provider)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 border border-transparent rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value={Provider.GEMINI}>Google Gemini</option>
                <option value={Provider.OPENROUTER}>OpenRouter</option>
              </select>
            </div>

            <div className="relative group flex-grow sm:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Key size={14} />
              </div>
              <input 
                type="password"
                placeholder="Enter API Key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm bg-slate-100 border border-transparent rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                {apiKey || process.env.API_KEY ? <ShieldCheck size={14} className="text-emerald-500" /> : <ShieldAlert size={14} className="text-amber-500" />}
              </div>
            </div>

            <button 
              onClick={() => generateCSV(receipts)} 
              disabled={completedCount === 0} 
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all shadow-sm shrink-0 ${completedCount > 0 ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              <Download size={18} /> Export
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DataVisualization items={receipts} />
        
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => !isConverting && fileInputRef.current?.click()}
          className={`relative group rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center py-16 px-4 text-center mb-10 cursor-pointer border-slate-200 hover:border-blue-400 hover:bg-white bg-white/50 ${isDragging ? 'border-blue-500 bg-blue-50/50' : ''}`}
        >
          <input type="file" multiple accept="image/*,.heic,.heif" className="hidden" ref={fileInputRef} onChange={(e) => handleFiles(e.target.files)} disabled={isConverting} />
          <div className={`p-5 rounded-2xl mb-6 transition-all bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500`}>
            {isConverting ? <Loader2 className="animate-spin" size={40} /> : <UploadCloud size={40} />}
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">{isConverting ? 'Processing...' : 'Upload Danish Receipts'}</h3>
          <p className="text-slate-500 max-w-xs mx-auto text-sm">Drag and drop receipts here. Supports JPG, PNG, and HEIC.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {receipts.map(receipt => (
            <ReceiptCard 
              key={receipt.id} 
              item={receipt} 
              onDelete={(id) => setReceipts(p => p.filter(r => r.id !== id))} 
              onUpdate={(id, data) => setReceipts(p => p.map(r => r.id === id ? {...r, data} : r))} 
            />
          ))}
          {receipts.length === 0 && !isConverting && (
            <div className="col-span-full py-20 text-center text-slate-300">
              <p>Uploaded receipts will be processed automatically.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;