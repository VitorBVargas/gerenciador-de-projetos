import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, AlertTriangle, Activity, ChevronDown, ChevronUp } from 'lucide-react';

const verticalLabels = {
  arrecadacao: 'Arrecadação',
  compras: 'Contratos',
  contabil: 'Contábil',
  pessoal: 'Pessoal',
  educacao: 'Educação',
  iss: 'ISS',
  parceiros: 'Parceiros',
  plataforma: 'Plataforma',
  atendimento: 'Atendimento',
  gerenciamento: 'Gerenciamento',
  saude: 'Saúde',
  outros: 'Outros'
};

export const calculateHealthScore = ({ timeline, budget, spent, migrationTasks, homologationTasks, risks, products, cronogramas }) => {
  let score = 100;
  const alerts = []; // { severity: 'high'|'medium'|'good', text, detail }

  // --- 1. TIMELINE (40 pts) ---
  // IMPORTANTE: Conta APENAS etapas com status === 'atrasado' explícito
  const delayedEvents = timeline.filter(e => e.status === 'atrasado');

  const delayCost = delayedEvents.length * 3;
  const timelineDeduction = Math.min(40, delayCost);
  score -= timelineDeduction;

  // Helper: para cada cronograma_id, busca o nome da vertical (cronograma)
  const getCronogramaLabel = (event) => {
    if (cronogramas && event.cronograma_id) {
      const cron = cronogramas.find(c => c.id === event.cronograma_id);
      if (cron) return cron.vertical;
    }
    return verticalLabels[event.vertical] || event.vertical || 'Geral';
  };

  // Group delayed by vertical + cronograma name
  if (delayedEvents.length > 0) {
    const byVertical = {};
    delayedEvents.forEach(e => {
      const v = getCronogramaLabel(e);
      if (!byVertical[v]) byVertical[v] = { count: 0, titles: [] };
      byVertical[v].count++;
      byVertical[v].titles.push(e.title);
    });
    const summary = Object.entries(byVertical).map(([v, d]) => `${v} (${d.count})`).join(', ');
    const details = Object.entries(byVertical).map(([v, d]) => `• ${v}: ${d.titles.slice(0, 3).join(', ')}${d.titles.length > 3 ? ` +${d.titles.length - 3}` : ''}`).join('\n');
    alerts.push({
      severity: delayedEvents.length >= 3 ? 'high' : 'medium',
      text: `${delayedEvents.length} etapa${delayedEvents.length > 1 ? 's' : ''} atrasada${delayedEvents.length > 1 ? 's' : ''}`,
      detail: `Verticais: ${summary}`,
      lines: details
    });
  }

  // --- 2. MIGRATION & HOMOLOGATION (35 pts) ---
  const allTasks = [...migrationTasks, ...homologationTasks];
  if (allTasks.length > 0) {
    const completedTasks = allTasks.filter(t => t.completed).length;
    const rate = completedTasks / allTasks.length;
    const progressDeduction = Math.round((1 - rate) * 35);
    score -= progressDeduction;

    // Find products with 0% completion
    if (products && products.length > 0) {
      const laggingProducts = products.filter(p => {
        const pMig = migrationTasks.filter(t => t.product_id === p.id);
        const pHom = homologationTasks.filter(t => t.product_id === p.id);
        const pAll = [...pMig, ...pHom];
        if (pAll.length === 0) return false;
        const done = pAll.filter(t => t.completed).length;
        return done === 0;
      });

      if (laggingProducts.length > 0) {
        const names = laggingProducts.slice(0, 3).map(p => p.name).join(', ');
        alerts.push({
          severity: 'medium',
          text: `${laggingProducts.length} produto${laggingProducts.length > 1 ? 's' : ''} sem progresso`,
          detail: names + (laggingProducts.length > 3 ? ` e mais ${laggingProducts.length - 3}` : '')
        });
      }
    }
  }

  // --- 4. RISKS (20 pts) ---
  if (risks.length > 0) {
    const criticalRisks = risks.filter(r => r.probability >= 5 && r.impact >= 5 && (r.status === 'em_monitoramento' || r.status === 'em_andamento'));
    const highRisks = risks.filter(r => !criticalRisks.includes(r) && (r.probability >= 4 || r.impact >= 4) && (r.status === 'em_monitoramento' || r.status === 'em_andamento'));
     const riskDeduction = Math.min(20, criticalRisks.length * 6 + highRisks.length * 2);
     score -= riskDeduction;

     if (criticalRisks.length > 0) {
       const names = criticalRisks.slice(0, 2).map(r => r.title).join(', ');
       alerts.push({
         severity: 'high',
         text: `${criticalRisks.length} risco${criticalRisks.length > 1 ? 's' : ''} crítico${criticalRisks.length > 1 ? 's' : ''}`,
         detail: names + (criticalRisks.length > 2 ? ` e mais ${criticalRisks.length - 2}` : '')
       });
     } else if (highRisks.length > 0) {
       alerts.push({
         severity: 'medium',
         text: `${highRisks.length} risco${highRisks.length > 1 ? 's' : ''} em monitoramento`,
         detail: highRisks.slice(0, 2).map(r => r.title).join(', ')
       });
     }
   }

  const finalScore = Math.max(0, Math.round(score));

  if (finalScore >= 85 && alerts.length === 0) {
    alerts.push({ severity: 'good', text: 'Projeto em dia', detail: 'Todas as métricas dentro do esperado' });
  }

  return { score: finalScore, alerts };
};

const getHealthStatus = (score) => {
  if (score >= 80) return { label: 'Saudável', color: 'text-green-400', bgColor: 'bg-green-500', ringColor: 'text-green-400' };
  if (score >= 60) return { label: 'Atenção', color: 'text-yellow-400', bgColor: 'bg-yellow-500', ringColor: 'text-yellow-400' };
  if (score >= 40) return { label: 'Em Risco', color: 'text-orange-400', bgColor: 'bg-orange-500', ringColor: 'text-orange-400' };
  return { label: 'Crítico', color: 'text-red-400', bgColor: 'bg-red-500', ringColor: 'text-red-400' };
};

export default function ProjectHealthScore({ timeline = [], budget = 0, spent = 0, migrationTasks = [], homologationTasks = [], risks = [], products = [], cronogramas = [] }) {
  const [expanded, setExpanded] = useState(null);
  const { score, alerts } = calculateHealthScore({ timeline, migrationTasks, homologationTasks, risks, products, cronogramas });
  const status = getHealthStatus(score);

  const sevIcon = {
    high: <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />,
    medium: <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />,
    good: <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
  };
  const sevBg = {
    high: 'border-red-500/20 bg-red-500/5',
    medium: 'border-yellow-500/20 bg-yellow-500/5',
    good: 'border-green-500/20 bg-green-500/5'
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700/50 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          Health Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score */}
        <div className="flex items-center gap-4">
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" fill="none" className="text-slate-700" />
              <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" fill="none"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - score / 100)}`}
                className={status.ringColor} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-bold ${status.color}`}>{score}</span>
            </div>
          </div>
          <div className="flex-1">
            <p className={`font-semibold text-lg mb-2 ${status.color}`}>{status.label}</p>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div className={`h-2 rounded-full ${status.bgColor} transition-all duration-500`} style={{ width: `${score}%` }} />
            </div>
            <p className="text-xs text-slate-500 mt-1">{alerts.filter(a => a.severity !== 'good').length} ponto{alerts.filter(a => a.severity !== 'good').length !== 1 ? 's' : ''} de atenção</p>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-700">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Diagnóstico</p>
            {alerts.map((alert, idx) => (
              <div key={idx} className={`rounded-lg border p-2 cursor-pointer transition-colors ${sevBg[alert.severity]}`}
                onClick={() => setExpanded(expanded === idx ? null : idx)}>
                <div className="flex items-center gap-2">
                  {sevIcon[alert.severity]}
                  <span className="text-sm text-slate-200 flex-1">{alert.text}</span>
                  {alert.detail && (
                    expanded === idx ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>
                {expanded === idx && (alert.detail || alert.lines) && (
                  <div className="mt-1.5 ml-6 space-y-1">
                    {alert.detail && <p className="text-xs text-slate-400">{alert.detail}</p>}
                    {alert.lines && (
                      <pre className="text-xs text-slate-500 whitespace-pre-wrap font-sans">{alert.lines}</pre>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}