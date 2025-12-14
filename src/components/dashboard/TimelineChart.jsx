import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const phaseColors = {
  planejamento: '#6366f1',
  kickoff: '#8b5cf6',
  diagnostico: '#a855f7',
  migracao_hml: '#d946ef',
  configuracao_hml: '#ec4899',
  homologacao_hml: '#f43f5e',
  migracao_producao: '#f97316',
  treinamento: '#eab308',
  configuracao_producao: '#84cc16',
  estabilizacao: '#22c55e',
  operacao_assistida: '#14b8a6'
};

const phaseLabels = {
  planejamento: 'Planejamento',
  kickoff: 'Kick-off',
  diagnostico: 'Diagnóstico',
  migracao_hml: 'Migração HML',
  configuracao_hml: 'Config. HML',
  homologacao_hml: 'Homologação',
  migracao_producao: 'Migração Prod.',
  treinamento: 'Treinamento',
  configuracao_producao: 'Config. Prod.',
  estabilizacao: 'Estabilização',
  operacao_assistida: 'Op. Assistida'
};

export default function TimelineChart({ events }) {
  const chartData = events.map(event => ({
    name: phaseLabels[event.phase] || event.title,
    progress: event.progress || 0,
    phase: event.phase,
    startDate: event.start_date,
    endDate: event.end_date
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold">{data.name}</p>
          <p className="text-slate-300 text-sm">Progresso: {data.progress}%</p>
          {data.startDate && (
            <p className="text-slate-400 text-xs mt-1">
              {format(new Date(data.startDate), 'dd MMM', { locale: ptBR })} 
              {data.endDate && ` - ${format(new Date(data.endDate), 'dd MMM', { locale: ptBR })}`}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-white">Progresso das Fases</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8' }} />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fill: '#94a3b8', fontSize: 12 }} 
                width={100}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="progress" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={phaseColors[entry.phase] || '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}