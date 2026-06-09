import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart2 } from 'lucide-react';

export default function VarianceChart({ changes }) {
  
  if (!changes || changes.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl border shadow-sm h-full flex flex-col items-center justify-center text-center min-h-[300px]">
        <BarChart2 className="w-12 h-12 text-slate-200 mb-3" />
        <h3 className="font-bold text-md text-slate-700 mb-1">No Visual Data</h3>
        <p className="text-sm text-slate-500">There are no structural shifts to visualize.</p>
      </div>
    );
  }

  const getChartData = () => {
    const totals = {};
    changes.forEach(c => {
      Object.keys(c.breakdown).forEach(comp => {
        totals[comp] = (totals[comp] || 0) + c.breakdown[comp].delta;
      });
    });
    return Object.keys(totals).map(name => ({ name, NetChange: totals[name] }));
  };

  return (
    <div className="bg-white p-6 rounded-xl border shadow-sm h-full flex flex-col">
      <h3 className="font-bold text-md mb-4 text-slate-700">Structural Driver Impact</h3>
      
      <div className="w-full flex-grow mt-2">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={getChartData()}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{fontSize: 11}} />
            <YAxis tick={{fontSize: 11}} />
            <Tooltip cursor={{fill: '#f1f5f9'}} />
            <Bar dataKey="NetChange" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}