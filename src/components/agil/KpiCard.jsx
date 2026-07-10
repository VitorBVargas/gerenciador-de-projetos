import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Info, TrendingUp, TrendingDown, Minus, ChevronDown } from 'lucide-react';
import { evaluateKpi } from './kpiCatalog';
import KpiHistoryChart from './KpiHistoryChart';

const statusMeta = {
  ok: { color: 'text-emerald-300', dot: 'bg-emerald-400', label: 'Na faixa' },
  atencao: { color: 'text-yellow-300', dot: 'bg-yellow-400', label: 'Atenção' },
  ruim: { color: 'text-red-300', dot: 'bg-red-400', label: 'Fora da faixa' },
  neutro: { color: 'text-slate-300', dot: 'bg-slate-500', label: '—' },
};

const chartColors = { ok: '#34d399', atencao: '#facc15', ruim: '#f87171', neutro: '#22d3ee' };

export default function KpiCard({ kpi, value, history }) {
  const [open, setOpen] = useState(false);
  const status = evaluateKpi(kpi, value);
  const meta = statusMeta[status];
  const TrendIcon = kpi.melhor === 'up' ? TrendingUp : kpi.melhor === 'down' ? TrendingDown : Minus;

  // tendência vs último ponto
  let delta = null;
  if (history && history.length >= 2) {
    const prev = history[history.length - 2]?.value;
    if (typeof prev === 'number' && typeof value === 'number') delta = value - prev;
  }

  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
          <h3 className="text-sm font-semibold text-white">{kpi.nome}</h3>
        </div>
        <button onClick={() => setOpen(o => !o)} className="text-slate-500 hover:text-slate-300 transition-colors">
          <Info className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-end gap-2 mt-2">
        <p className="text-2xl font-bold text-white">
          {value ?? '—'}<span className="text-sm font-normal text-slate-400 ml-1">{kpi.unidade}</span>
        </p>
        {delta !== null && delta !== 0 && (
          <span className={`text-xs mb-1 flex items-center gap-0.5 ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            <TrendIcon className="w-3 h-3" />{delta > 0 ? '+' : ''}{delta}
          </span>
        )}
      </div>
      <p className="text-[11px] text-slate-500 mt-0.5">{kpi.faixa}</p>

      <div className="mt-3">
        <KpiHistoryChart data={history} color={chartColors[status]} />
      </div>

      {open && (
        <div className="mt-3 pt-3 border-t border-slate-700/60 space-y-2 text-xs">
          <div>
            <span className="text-slate-500">Descrição: </span>
            <span className="text-slate-300">{kpi.desc}</span>
          </div>
          <div>
            <span className="text-slate-500">Fórmula: </span>
            <span className="text-slate-300 font-mono">{kpi.formula}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Situação:</span>
            <Badge variant="outline" className={`${meta.color} border-current/30`}>{meta.label}</Badge>
          </div>
        </div>
      )}
    </div>
  );
}