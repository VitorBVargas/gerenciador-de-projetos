import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, AlertTriangle, TrendingUp, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { analisarKpisIA } from './kpiAnalysisAI';

const statusMeta = {
  saudavel: { label: 'Saudável', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' },
  atencao: { label: 'Atenção', color: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40' },
  critico: { label: 'Crítico', color: 'bg-red-500/15 text-red-300 border-red-500/40' },
};

const sevColor = { alta: 'text-red-300', media: 'text-yellow-300', baixa: 'text-slate-300' };

export default function KpiAIPanel({ projectName, kpis, history }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const analisar = async () => {
    setLoading(true);
    try {
      const r = await analisarKpisIA({ projectName, kpis, history });
      setResult(r);
    } catch (e) {
      toast.error('Não foi possível gerar a análise da IA.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-xl p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-indigo-300" />
          </div>
          <div>
            <h2 className="text-white font-semibold">Análise da IA</h2>
            <p className="text-xs text-slate-400">Diagnóstico dos indicadores e recomendações</p>
          </div>
        </div>
        <Button onClick={analisar} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
          {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
          {result ? 'Reanalisar' : 'Analisar Indicadores'}
        </Button>
      </div>

      {!result && !loading && (
        <p className="text-sm text-slate-500">Clique em "Analisar Indicadores" para obter um diagnóstico do fluxo, alertas e recomendações práticas.</p>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Badge variant="outline" className={statusMeta[result.status_geral]?.color || statusMeta.atencao.color}>
              {statusMeta[result.status_geral]?.label || 'Análise'}
            </Badge>
            <p className="text-sm text-slate-200 flex-1">{result.resumo}</p>
          </div>

          {result.alertas?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Alertas</p>
              <div className="space-y-1.5">
                {result.alertas.map((a, i) => (
                  <div key={i} className="text-sm text-slate-300 bg-slate-800/60 rounded-lg px-3 py-2">
                    <span className={`font-medium ${sevColor[a.severidade] || 'text-slate-300'}`}>{a.kpi}</span>
                    <span className="text-slate-400"> — {a.causa}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.tendencias?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Tendências</p>
              <ul className="space-y-1">
                {result.tendencias.map((t, i) => <li key={i} className="text-sm text-slate-300">• {t}</li>)}
              </ul>
            </div>
          )}

          {result.recomendacoes?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Recomendações</p>
              <ul className="space-y-1">
                {result.recomendacoes.map((r, i) => <li key={i} className="text-sm text-slate-200">✓ {r}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}