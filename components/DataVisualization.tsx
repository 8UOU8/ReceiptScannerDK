import React, { useMemo } from 'react';
import { ProcessingStatus, ReceiptItem } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DataVisualizationProps {
  items: ReceiptItem[];
}

export const DataVisualization: React.FC<DataVisualizationProps> = ({ items }) => {
  
  const validData = useMemo(() => {
    return items
      .filter(item => item.status === ProcessingStatus.COMPLETED && item.data)
      .map(item => item.data!);
  }, [items]);

  const totalSpent = useMemo(() => validData.reduce((sum, item) => sum + (parseFloat(String(item.totalAmount)) || 0), 0), [validData]);
  const totalMoms = useMemo(() => validData.reduce((sum, item) => sum + (parseFloat(String(item.moms)) || 0), 0), [validData]);
  const itemCount = validData.length;

  const shopData = useMemo(() => {
    const map = new Map<string, number>();
    validData.forEach(d => {
      const shop = d.shopName || "Unknown";
      const amount = parseFloat(String(d.totalAmount)) || 0;
      map.set(shop, (map.get(shop) || 0) + amount);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [validData]);

  const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#6366f1'];

  if (itemCount === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 transition-all hover:border-blue-200">
          <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wide mb-1">Total Spent</h3>
          <div className="text-3xl font-bold text-slate-800">{(totalSpent || 0).toFixed(2)} <span className="text-sm font-normal text-slate-400">DKK</span></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 transition-all hover:border-emerald-200">
          <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wide mb-1">Total MOMS (VAT)</h3>
          <div className="text-3xl font-bold text-slate-800">{(totalMoms || 0).toFixed(2)} <span className="text-sm font-normal text-slate-400">DKK</span></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wide mb-1">Receipts Processed</h3>
          <div className="text-3xl font-bold text-slate-800">{itemCount}</div>
        </div>
      </div>

      <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-[300px]">
        <h3 className="text-slate-700 font-semibold mb-6">Spending by Shop (DKK)</h3>
        <div className="flex-grow">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={shopData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                stroke="#94a3b8" 
                tick={{ fill: '#64748b', fontSize: 11 }} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#94a3b8" 
                tick={{ fill: '#64748b', fontSize: 11 }} 
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip 
                cursor={{ fill: '#f1f5f9' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [`${(value || 0).toFixed(2)} DKK`, 'Amount']}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                {shopData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};