import React, { useState, useEffect, useRef } from 'react';
import { ReceiptItem, ProcessingStatus, ExtractedData } from '../types';
import { Trash2, CheckCircle, AlertCircle, Loader2, Edit2, Save, X } from 'lucide-react';

interface ReceiptCardProps {
  item: ReceiptItem;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: ExtractedData) => void;
}

export const ReceiptCard: React.FC<ReceiptCardProps> = ({ item, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<ExtractedData>({
    shopName: '',
    purchaseDate: '',
    totalAmount: 0,
    moms: 0
  });

  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (item.data) {
      setEditForm(item.data);
    }
  }, [item.data]);

  const handleSave = () => {
    onUpdate(item.id, editForm);
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (item.data) setEditForm(item.data);
    setIsEditing(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const { left, top, width, height } = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col sm:flex-row transition-all hover:shadow-md">
      <div 
        ref={imageContainerRef}
        className="relative w-full sm:w-48 h-48 sm:h-auto bg-slate-100 flex-shrink-0 overflow-hidden cursor-crosshair group"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onMouseMove={handleMouseMove}
      >
        <img 
          src={item.previewUrl} 
          alt="Receipt preview" 
          className={`w-full h-full object-cover transition-transform duration-100 ease-out ${isHovering ? 'scale-[3.0]' : 'scale-100'}`}
          style={isHovering ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` } : undefined}
        />
        {!isHovering && (
           <div className="absolute inset-0 bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">Hover to zoom</span>
           </div>
        )}
      </div>

      <div className="p-4 flex-grow flex flex-col justify-between">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded truncate max-w-[120px]">
              {item.file.name}
            </span>
            {item.status === ProcessingStatus.PROCESSING && (
              <span className="flex items-center gap-1 text-xs text-blue-600 font-medium whitespace-nowrap">
                <Loader2 size={12} className="animate-spin" /> Processing...
              </span>
            )}
            {item.status === ProcessingStatus.COMPLETED && (
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium whitespace-nowrap">
                <CheckCircle size={12} /> Done
              </span>
            )}
            {item.status === ProcessingStatus.ERROR && (
              <span className="flex items-center gap-1 text-xs text-red-600 font-medium whitespace-nowrap">
                <AlertCircle size={12} /> Failed
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
             {item.status === ProcessingStatus.COMPLETED && !isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                title="Edit details"
              >
                <Edit2 size={16} />
              </button>
            )}
            <button 
              onClick={() => onDelete(item.id)}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
              title="Remove"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {item.status === ProcessingStatus.ERROR && (
          <div className="text-red-500 text-sm mt-2">
            {item.error || "Could not extract data."}
          </div>
        )}

        {item.status === ProcessingStatus.COMPLETED && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs text-slate-400 mb-1">Shop Name</label>
              {isEditing ? (
                <input 
                  type="text" 
                  value={editForm.shopName} 
                  onChange={(e) => setEditForm({...editForm, shopName: e.target.value})}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div className="font-semibold text-slate-800 truncate" title={item.data?.shopName}>{item.data?.shopName || "Unknown"}</div>
              )}
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs text-slate-400 mb-1">Date</label>
              {isEditing ? (
                <input 
                  type="date" 
                  value={editForm.purchaseDate} 
                  onChange={(e) => setEditForm({...editForm, purchaseDate: e.target.value})}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div className="font-semibold text-slate-800">{item.data?.purchaseDate || "N/A"}</div>
              )}
            </div>

            <div className="col-span-1">
              <label className="block text-xs text-slate-400 mb-1">Total (DKK)</label>
              {isEditing ? (
                <input 
                  type="number" 
                  step="0.01"
                  value={editForm.totalAmount} 
                  onChange={(e) => setEditForm({...editForm, totalAmount: parseFloat(e.target.value) || 0})}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div className="font-semibold text-slate-800">{(item.data?.totalAmount ?? 0).toFixed(2)}</div>
              )}
            </div>

            <div className="col-span-1">
              <label className="block text-xs text-slate-400 mb-1">Moms (DKK)</label>
               {isEditing ? (
                <input 
                  type="number" 
                  step="0.01"
                  value={editForm.moms} 
                  onChange={(e) => setEditForm({...editForm, moms: parseFloat(e.target.value) || 0})}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div className="font-semibold text-slate-800">{(item.data?.moms ?? 0).toFixed(2)}</div>
              )}
            </div>
          </div>
        )}
        
        {isEditing && (
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
             <button 
              onClick={handleCancel}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors"
            >
              <X size={14} /> Cancel
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors shadow-sm"
            >
              <Save size={14} /> Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
};