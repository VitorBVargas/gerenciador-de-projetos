import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { History, AlertTriangle, User, Calendar } from 'lucide-react';
import { cn } from "@/lib/utils";
import {
  collectCurrentMilestones,
  computeDeviations,
  maxDeviation,
  colorForDeviation,
  BASELINE_PHASE_LABELS,
  BASELINE_PHASES,
  REASON_LABELS,
  formatDateBR
} from './baselineUtils';

const deviationColor = (days) => {
  const c = colorForDeviation(days);
  if (c === 'green') return 'text-emerald-400';
  if (c === 'yellow') return 'text-amber-400';
  return 'text-red-400';
};

export default function BaselineDetailsDrawer({ open, onOpenChange, baselines = [], timelineEvents = [], products = [] }) {
  const sorted = useMemo(() => [...baselines].sort((a, b) => (a.version || 0) - (b.version || 0)), [baselines]);
  const v1 = sorted[0];
  const last = sorted[sorted.length - 1];

  const current = useMemo(() => collectCurrentMilestones(timelineEvents, products), [timelineEvents, products]);

  // Comparativo: agregamos por phase, considerando o MAIOR atraso entre produtos.
  const phaseComparison = useMemo(() => {
    if (!v1) return [];
    return BASELINE_PHASES.map(phase => {
      const baselineItems = (v1.milestones || []).filter(m => m.phase === phase);
      const deviations = computeDeviations(baselineItems, current).filter(d => d.current_date);
      if (deviations.length === 0) return { phase, baseline: '—', current: '—', deviation: 0, hasData: false };
      // pega o de maior desvio para representar o marco
      const worst = deviations.reduce((acc, d) => (d.deviation_days > (acc?.deviation_days ?? -Infinity) ? d : acc), null);
      return {
        phase,
        baseline: worst.baseline_date,
        current: worst.current_date,
        deviation: worst.deviation_days,
        product: worst.product_name,
        hasData: true
      };
    });
  }, [v1, current]);

  const maxDev = useMemo(() => {
    if (!v1) return 0;
    const dev = computeDeviations(v1.milestones || [], current);
    return maxDeviation(dev);
  }, [v1, current]);

  // Evolução: para cada versão, calculamos o maior desvio em relação à V1
  const evolutionData = useMemo(() => {
    if (!v1) return [];
    return sorted.map(b => {
      const dev = computeDeviations(v1.milestones || [], b.milestones || []);
      const maxD = maxDeviation(dev);
      return {
        version: `V${b.version}`,
        desvio: maxD,
        date: b.created_date ? formatDateBR(b.created_date) : ''
      };
    });
  }, [sorted, v1]);

  if (!v1) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            Linha de Base — Controle Executivo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* 1. Resumo executivo */}
          <section>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Resumo executivo</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-3">
                  <p className="text-[11px] text-slate-400">Revisões</p>
                  <p className="text-xl font-bold text-white">{sorted.length}</p>
                </CardContent>
              </Card>
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-3">
                  <p className="text-[11px] text-slate-400">Maior atraso</p>
                  <p className={cn("text-xl font-bold", deviationColor(maxDev))}>
                    {maxDev > 0 ? '+' : ''}{maxDev}d
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-3">
                  <p className="text-[11px] text-slate-400">Status geral</p>
                  <Badge className={cn(
                    "border",
                    colorForDeviation(maxDev) === 'green' && "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                    colorForDeviation(maxDev) === 'yellow' && "bg-amber-500/20 text-amber-400 border-amber-500/30",
                    colorForDeviation(maxDev) === 'red' && "bg-red-500/20 text-red-400 border-red-500/30"
                  )}>
                    {colorForDeviation(maxDev) === 'green' ? 'No prazo' : colorForDeviation(maxDev) === 'yellow' ? 'Atenção' : 'Crítico'}
                  </Badge>
                </CardContent>
              </Card>
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-3">
                  <p className="text-[11px] text-slate-400">Última revisão</p>
                  <p className="text-sm font-medium text-white truncate">{last?.user_name || last?.user_email || '—'}</p>
                  <p className="text-[10px] text-slate-500 truncate">
                    V{last?.version} · {last?.created_date ? formatDateBR(last.created_date) : '—'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* 2. Comparativo Baseline */}
          <section>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Comparativo Baseline (V1) vs Atual</h3>
            <div className="overflow-x-auto bg-slate-800/40 rounded-lg border border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400">
                    <th className="px-3 py-2 text-left">Marco</th>
                    <th className="px-3 py-2 text-left">Baseline</th>
                    <th className="px-3 py-2 text-left">Atual</th>
                    <th className="px-3 py-2 text-left">Desvio</th>
                  </tr>
                </thead>
                <tbody>
                  {phaseComparison.map(row => (
                    <tr key={row.phase} className="border-b border-slate-800 last:border-0">
                      <td className="px-3 py-2 text-white">{BASELINE_PHASE_LABELS[row.phase]}</td>
                      <td className="px-3 py-2 text-slate-300">{row.hasData ? formatDateBR(row.baseline) : '—'}</td>
                      <td className="px-3 py-2 text-slate-300">{row.hasData ? formatDateBR(row.current) : '—'}</td>
                      <td className={cn("px-3 py-2 font-semibold", row.hasData ? deviationColor(row.deviation) : 'text-slate-500')}>
                        {row.hasData ? `${row.deviation > 0 ? '+' : ''}${row.deviation} dias` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {phaseComparison.some(r => r.hasData) && (
              <p className="text-[11px] text-slate-500 mt-2">
                * Quando há múltiplos produtos no mesmo marco, exibimos o de maior desvio.
              </p>
            )}
          </section>

          {/* 3. Histórico de Revisões */}
          <section>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Histórico de revisões</h3>
            <div className="overflow-x-auto bg-slate-800/40 rounded-lg border border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400">
                    <th className="px-3 py-2 text-left">Versão</th>
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-left">Usuário</th>
                    <th className="px-3 py-2 text-left">Motivo</th>
                    <th className="px-3 py-2 text-left">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(b => (
                    <tr key={b.id} className="border-b border-slate-800 last:border-0">
                      <td className="px-3 py-2">
                        <Badge className={cn(
                          "border",
                          b.is_active ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" : "bg-slate-700/50 text-slate-300 border-slate-600"
                        )}>V{b.version}</Badge>
                      </td>
                      <td className="px-3 py-2 text-slate-300">{b.created_date ? formatDateBR(b.created_date) : '—'}</td>
                      <td className="px-3 py-2 text-slate-300">{b.user_name || b.user_email || '—'}</td>
                      <td className="px-3 py-2 text-slate-300">{REASON_LABELS[b.reason] || b.reason || '—'}</td>
                      <td className="px-3 py-2 text-slate-400 max-w-xs truncate" title={b.observation}>{b.observation || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 4. Evolução da Baseline */}
          <section>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Evolução da baseline</h3>
            <Card className="bg-slate-800/40 border-slate-700">
              <CardContent className="p-4">
                {evolutionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={evolutionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="version" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} label={{ value: 'dias', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="desvio" name="Maior desvio vs V1 (dias)" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-500 text-sm">Sem dados suficientes para exibir evolução.</p>
                )}
                <p className="text-[11px] text-slate-500 mt-2">
                  Mostra a tendência do maior desvio entre cada revisão e a Baseline original.
                </p>
              </CardContent>
            </Card>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}