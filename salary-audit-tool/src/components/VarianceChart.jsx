import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function VarianceChart({ changes }) {
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
    <div className="bg-white p-6 rounded-xl border shadow-sm h-full">
      <h3 className="font-bold text-md mb-4 text-slate-700">Structural Driver Impact</h3>
      {/* Added w-full and min-h-[250px] to the parent div */}
      <div className="h-64 w-full min-h-[250px]">
        {/* Added minHeight and minWidth props directly to the container */}
        <ResponsiveContainer width="100%" height="100%" minHeight={250} minWidth={0}>
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