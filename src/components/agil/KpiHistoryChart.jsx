import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Gráfico temporal simples de um KPI ao longo dos snapshots/sprints.
export default function KpiHistoryChart({ data, color = '#22d3ee' }) {
  if (!data || data.length < 2) {
    return <div className="h-24 flex items-center justify-center text-[11px] text-slate-600">Histórico insuficiente — capture snapshots ao longo das sprints.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={100}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="label" stroke="#64748b" fontSize={9} tickLine={false} />
        <YAxis stroke="#64748b" fontSize={9} tickLine={false} width={30} />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#fff', fontSize: 12 }}
          labelStyle={{ color: '#94a3b8' }}
        />
        <Line type="monotone" dataKey="value" stroke={color} dot={{ r: 2 }} strokeWidth={2} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}