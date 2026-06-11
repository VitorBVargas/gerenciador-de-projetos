import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, AlertTriangle, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import HealthScoreDetailsModal from './HealthScoreDetailsModal';

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

export const calculateHealthScore = ({ timeline, budget, spent, migrationTasks, homologationTasks, risks, products, cronogramas, deadline, overallProgress, projectStatus }) => {
  let score = 100;
  const alerts = []; // { severity: 'high'|'medium'|'good', text, detail }

  // Mapas por produto
  const productEntityMap = {};
  const productNameMap = {};
  (products || []).forEach(p => {
    if (p.id && p.entity) productEntityMap[p.id] = p.entity;
    if (p.id && p.name) productNameMap[p.id] = p.name;
  });

  const productsById = {};
  (products || []).forEach((product) => {
    if (product?.id) productsById[product.id] = product;
  });

  // Helper: para cada cronograma_id, busca o nome da vertical
  const getCronogramaLabel = (event) => {
    if (cronogramas && event.cronograma_id) {
      const cron = cronogramas.find(c => c.id === event.cronograma_id);
      if (cron) return cron.vertical;
    }
    return verticalLabels[event.vertical] || event.vertical || 'Geral';
  };

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const validProjectProductIds = new Set((products || []).map((product) => product.id));
  const activeTimelineEvents = timeline.filter((event) => {
    if (!event.end_date || event.status === 'concluido') return false;
    if (!event.product_id) return true;
    return validProjectProductIds.has(event.product_id);
  });
  const allAlertEvents = activeTimelineEvents.filter((e) => {
    const endDate = new Date(e.end_date);
    return endDate >= startOfToday && endDate < startOfTomorrow;
  });
  const allOverdueEvents = activeTimelineEvents.filter((e) => {
    const endDate = new Date(e.end_date);
    return endDate < startOfToday;
  });

  // Deduplica por (vertical, título, entidade) para não colapsar eventos de entidades diferentes
  const dedupeEvents = (events) => {
    const seenVerticalTitle = new Set();
    return events.filter(e => {
      const entity = productEntityMap[e.product_id] || '';
      const key = `${getCronogramaLabel(e)}||${e.title}||${entity}`;
      if (seenVerticalTitle.has(key)) return false;
      seenVerticalTitle.add(key);
      return true;
    });
  };

  const alertEvents = dedupeEvents(allAlertEvents);
  const overdueEvents = dedupeEvents(allOverdueEvents);

  // Peso por fase para eventos em atraso
  const getPhaseWeight = (phase) => {
    if (phase === 'diagnostico' || phase === 'migracao_prd_blackout' || phase === 'treinamento') return 3;
    if (phase === 'go_live' || phase === 'operacao_assistida') return 2;
    return 1;
  };

  // Alertas (vencendo hoje) NÃO descontam pontos, apenas informam
  const delayCost = overdueEvents.reduce((sum, e) => sum + getPhaseWeight(e.phase), 0);
  const timelineDeduction = Math.min(40, delayCost);
  score -= timelineDeduction;

  const buildTimelineAlert = (events, type) => {
    if (events.length === 0) return null;

    const byVertical = {};
    events.forEach(e => {
      const v = getCronogramaLabel(e);
      if (!byVertical[v]) byVertical[v] = { count: 0, titles: [] };
      byVertical[v].count++;
      const entity = productEntityMap[e.product_id];
      const productName = productNameMap[e.product_id];
      const meta = [productName, entity].filter(Boolean).join(' • ');
      const titleWithMeta = meta ? `${e.title} (${meta})` : e.title;
      byVertical[v].titles.push(titleWithMeta);
    });

    const verticalEntries = Object.entries(byVertical);
    const summary = verticalEntries.map(([v, d]) => `${v} (${d.count})`).join(', ');
    const verticals = verticalEntries.map(([v, d]) => ({
      name: v,
      count: d.count,
      previewItems: d.titles.slice(0, 3),
      remainingCount: Math.max(0, d.titles.length - 3),
      items: d.titles
    }));

    return {
      type,
      severity: type === 'overdue' ? (events.length >= 3 ? 'high' : 'medium') : 'medium',
      text: type === 'overdue'
        ? `${events.length} data${events.length > 1 ? 's' : ''} em atraso no cronograma`
        : `${events.length} data${events.length > 1 ? 's' : ''} em alerta no cronograma`,
      detail: `Verticais: ${summary}`,
      verticals,
      hasMoreItems: verticals.some(vertical => vertical.remainingCount > 0)
    };
  };

  const timelineAlert = buildTimelineAlert(alertEvents, 'alert');
  const timelineOverdue = buildTimelineAlert(overdueEvents, 'overdue');
  if (timelineAlert) alerts.push(timelineAlert);
  if (timelineOverdue) alerts.push(timelineOverdue);

  // --- 2. RISKS (35 pts) ---
  if (risks.length > 0) {
    // Considera ativos: identificado, em_monitoramento, em_andamento (mitigado fica de fora)
    const isActive = (r) => r.status === 'identificado' || r.status === 'em_monitoramento' || r.status === 'em_andamento';
    // Critério severidade: usa score = probability * impact quando disponível, senão probability
    const severityOf = (r) => (r.probability || 0) * (r.impact || 1);
    // Críticos: score >= 16 (ex: 4x4) OU probability >= 4
    const criticalRisks = risks.filter(r => isActive(r) && (severityOf(r) >= 16 || r.probability >= 4));
    // Altos: score entre 9 e 15 OU probability === 3
    const highRisks = risks.filter(r => isActive(r) && !(severityOf(r) >= 16 || r.probability >= 4) && (severityOf(r) >= 9 || r.probability === 3));
    
    const riskDeduction = Math.min(35, criticalRisks.length * 8 + highRisks.length * 3);
    score -= riskDeduction;

    if (criticalRisks.length > 0) {
      const names = criticalRisks.slice(0, 2).map(r => r.title).join(', ');
      alerts.push({
        severity: 'high',
        text: `${criticalRisks.length} risco${criticalRisks.length > 1 ? 's' : ''} crítico${criticalRisks.length > 1 ? 's' : ''} em atividade`,
        detail: names + (criticalRisks.length > 2 ? ` e mais ${criticalRisks.length - 2}` : '')
      });
    }
    if (highRisks.length > 0) {
      const names = highRisks.slice(0, 2).map(r => r.title).join(', ');
      alerts.push({
        severity: 'medium',
        text: `${highRisks.length} risco${highRisks.length > 1 ? 's' : ''} alto${highRisks.length > 1 ? 's' : ''} em atividade`,
        detail: names + (highRisks.length > 2 ? ` e mais ${highRisks.length - 2}` : '')
      });
    }
  }



  // --- 3. PRAZO CONTRATUAL ---
  // Só avalia se houver deadline e o projeto NÃO estiver concluído
  if (deadline && projectStatus !== 'concluido') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysToDeadline = Math.round((deadlineDate - today) / msPerDay);
    const progress = Number(overallProgress) || 0;
    const deadlineStr = deadlineDate.toLocaleDateString('pt-BR');

    if (daysToDeadline < 0) {
      score -= 15;
      alerts.push({
        severity: 'high',
        text: 'Prazo contratual vencido',
        detail: `Venceu em ${deadlineStr} (${Math.abs(daysToDeadline)} dia${Math.abs(daysToDeadline) !== 1 ? 's' : ''} atrás) — projeto ${progress}% concluído`
      });
    } else if (daysToDeadline <= 30 && progress < 80) {
      score -= 8;
      alerts.push({
        severity: 'medium',
        text: 'Prazo contratual próximo com progresso baixo',
        detail: `Faltam ${daysToDeadline} dia${daysToDeadline !== 1 ? 's' : ''} (${deadlineStr}) e projeto está em ${progress}%`
      });
    } else if (daysToDeadline <= 60 && progress < 50) {
      score -= 5;
      alerts.push({
        severity: 'medium',
        text: 'Risco de atraso no prazo contratual',
        detail: `Faltam ${daysToDeadline} dias (${deadlineStr}) e projeto está em ${progress}%`
      });
    } else {
      // Tudo ok — alerta informativo (não desconta)
      alerts.push({
        severity: 'good',
        text: 'Prazo contratual em dia',
        detail: `Faltam ${daysToDeadline} dia${daysToDeadline !== 1 ? 's' : ''} (${deadlineStr}) — projeto em ${progress}%`
      });
    }
  }

  const finalScore = Math.max(0, Math.round(score));

  // "Projeto em dia" só se NÃO houver nenhum alerta de risco (ignora os 'good' já adicionados)
  const hasRiskAlerts = alerts.some(a => a.severity === 'high' || a.severity === 'medium');
  if (finalScore >= 85 && !hasRiskAlerts && alerts.length === 0) {
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

export default function ProjectHealthScore({ timeline = [], budget = 0, spent = 0, migrationTasks = [], homologationTasks = [], risks = [], products = [], cronogramas = [], deadline = null, overallProgress = 0, projectStatus = null }) {
  const [expanded, setExpanded] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const { score, alerts } = calculateHealthScore({ timeline, migrationTasks, homologationTasks, risks, products, cronogramas, deadline, overallProgress, projectStatus });
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
  const getAlertStyle = (alert) => {
    if (alert.type === 'overdue') return { icon: sevIcon.high, bg: sevBg.high };
    if (alert.type === 'alert') return { icon: sevIcon.medium, bg: sevBg.medium };
    return { icon: sevIcon[alert.severity], bg: sevBg[alert.severity] };
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
            {alerts.map((alert, idx) => {
              const alertStyle = getAlertStyle(alert);
              return (
              <div key={idx} className={`rounded-lg border p-2 cursor-pointer transition-colors ${alertStyle.bg}`}
                onClick={() => setExpanded(expanded === idx ? null : idx)}>
                <div className="flex items-center gap-2">
                  {alertStyle.icon}
                  <span className="text-sm text-slate-200 flex-1">{alert.text}</span>
                  {alert.detail && (
                    expanded === idx ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>
                {expanded === idx && (alert.detail || alert.verticals) && (
                  <div className="mt-1.5 ml-6 space-y-2">
                    {alert.detail && <p className="text-xs text-slate-400">{alert.detail}</p>}
                    {alert.verticals?.map((vertical) => (
                      <div key={vertical.name} className="text-xs text-slate-500">
                        <span className="text-slate-400 font-medium">• {vertical.name}:</span>{' '}
                        {vertical.previewItems.join(', ')}
                        {vertical.remainingCount > 0 ? ` +${vertical.remainingCount}` : ''}
                      </div>
                    ))}
                    {alert.hasMoreItems && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-1 border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAlert(alert);
                        }}
                      >
                        Ver todos
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )})}
          </div>
        )}
      </CardContent>
      <HealthScoreDetailsModal
        open={!!selectedAlert}
        onOpenChange={(open) => !open && setSelectedAlert(null)}
        alert={selectedAlert}
      />
    </Card>
  );
}