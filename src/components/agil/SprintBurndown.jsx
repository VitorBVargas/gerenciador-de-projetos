import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingDown } from 'lucide-react';

export default function SprintBurndown({ data, totalSp }) {
  const hasData = data && data.length > 0;

  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingDown className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-white">Burndown em Tempo Real</h3>
        <span className="text-xs text-slate-500 ml-auto">{totalSp} SP planejados</span>
      </div>
      {!hasData ? (
        <div className="h-48 flex items-center justify-center text-sm text-slate-500">
          Defina as datas de início e fim da sprint para visualizar o burndown.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="dia" stroke="#64748b" fontSize={11} />
            <YAxis stroke="#64748b" fontSize={11} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#fff' }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="ideal" name="Ideal" stroke="#64748b" strokeDasharray="5 5" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="real" name="Real" stroke="#10b981" dot={{ r: 3 }} strokeWidth={2} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}