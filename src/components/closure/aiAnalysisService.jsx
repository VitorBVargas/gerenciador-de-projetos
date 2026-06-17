import { base44 } from '@/api/base44Client';
import {
  extractCityFromProjectName,
  calculateISI,
  PORTFOLIO_LABELS,
  formatCurrencyBR,
  formatDateBR,
  diffInDays
} from './closureUtils';
import { calculateHealthScore } from '@/components/dashboard/ProjectHealthScore';
import {
  calculateAccountHealth,
  calculateIRC,
  calculateRenewalProbability
} from './accountHealthCalculations';

const AGENT_NAME = 'encerramento_executivo_ia';

/**
 * Monta o payload consolidado do projeto para o agente IA.
 */
export function buildAnalysisPayload({
  project,
  products,
  timelineEvents,
  baselines,
  risks,
  healthSnapshots,
  editalItems,
  licoes,
  cronogramas,
  migrationTasks,
  homologationTasks
}) {
  const city = extractCityFromProjectName(project.name);
  const durationDays = project.contract_signature_date && project.deadline
    ? diffInDays(project.contract_signature_date, project.deadline) : 0;

  const risksMaterialized = risks.filter(r => r.status === 'em_andamento' || r.status === 'identificado').length;
  const risksMitigated = risks.filter(r => r.status === 'mitigado').length;

  let healthValues = healthSnapshots.map(s => s.score).filter(v => v !== undefined);
  if (healthValues.length === 0) {
    try {
      const calc = calculateHealthScore({
        timeline: timelineEvents, budget: project.budget || 0, spent: 0,
        migrationTasks, homologationTasks, risks, products, cronogramas,
        deadline: project.deadline, overallProgress: 100, projectStatus: 'concluido'
      });
      healthValues = [calc.score];
    } catch { healthValues = []; }
  }
  const healthAvg = healthValues.length ? Math.round(healthValues.reduce((a, b) => a + b, 0) / healthValues.length) : 0;
  const healthBest = healthValues.length ? Math.max(...healthValues) : 0;
  const healthWorst = healthValues.length ? Math.min(...healthValues) : 0;

  let delayDays = 0;
  if (baselines.length > 0 && timelineEvents.length > 0) {
    const v1 = [...baselines].sort((a, b) => (a.version || 0) - (b.version || 0))[0];
    if (v1?.milestones) {
      v1.milestones.forEach(m => {
        const cur = timelineEvents.find(ev => ev.product_id === m.product_id && ev.phase === m.phase);
        if (cur?.end_date && m.baseline_date) {
          const d = diffInDays(m.baseline_date, cur.end_date);
          if (d > delayDays) delayDays = d;
        }
      });
    }
  }

  // Correlação por nº do contrato do projeto. Se houver contrato cadastrado,
  // SÓ vincula pelo contrato. Fallback por cidade só quando não há contrato.
  const contractNumber = (project.contract_number || '').trim();
  let relatedEdital = [];
  if (contractNumber) {
    const cn = contractNumber.toLowerCase();
    relatedEdital = editalItems.filter(i => (i.numero_contrato || '').trim().toLowerCase() === cn);
  } else {
    const cityNorm = (city || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    relatedEdital = editalItems.filter(item => {
      const proj = (item.projeto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return cityNorm && proj.includes(cityNorm);
    });
  }
  const editalOpen = relatedEdital.filter(i => {
    const s = (i.status || '').toLowerCase();
    return !s.includes('concl') && !s.includes('atend');
  });
  const editalOverdue = relatedEdital.filter(i => {
    if (!i.data_prevista) return false;
    const s = (i.status || '').toLowerCase();
    if (s.includes('concl') || s.includes('atend')) return false;
    const days = diffInDays(new Date(), i.data_prevista);
    return days !== null && days < 0;
  });

  const isi = calculateISI({
    healthScoreAvg: healthAvg, delayDays,
    risksMaterialized, totalRisks: risks.length,
    editalPendingOpen: editalOpen.length, editalTotal: relatedEdital.length,
    baselinesCount: baselines.length || 1
  });

  // Indicadores executivos da gestão da conta
  const redPeriods = healthValues.filter(v => v < 60).length;
  const implementationAccepted = products.length > 0 && products.every(p => p.implementation_accepted === true);
  const healthFinal = healthSnapshots.length > 0
    ? [...healthSnapshots].sort((a, b) => new Date(a.captured_at || a.created_date) - new Date(b.captured_at || b.created_date)).slice(-1)[0].score
    : healthAvg;

  const accountHealth = calculateAccountHealth({
    healthAvg, healthWorst, redPeriods,
    risksMaterialized, editalPendingOpen: editalOpen.length,
    baselinesCount: baselines.length || 1, delayDays, implementationAccepted
  });
  const irc = calculateIRC({
    editalPendingOpen: editalOpen.length, editalTotal: relatedEdital.length,
    healthAvg, baselinesCount: baselines.length || 1, delayDays,
    risksMaterialized, totalRisks: risks.length, implementationAccepted
  });
  const renewal = calculateRenewalProbability({
    healthAvg, healthFinal,
    editalPendingOpen: editalOpen.length, editalTotal: relatedEdital.length,
    risksMaterialized, totalRisks: risks.length,
    baselinesCount: baselines.length || 1, delayDays,
    implementationAccepted, productsCount: products.length, isiScore: isi.score
  });

  return {
    projeto: {
      nome: project.name,
      cidade: city,
      portfolio: PORTFOLIO_LABELS[project.portfolio] || project.portfolio,
      gerente: project.manager || null,
      coordenador: project.coordinator || null,
      data_inicio: formatDateBR(project.contract_signature_date),
      data_encerramento: formatDateBR(project.deadline),
      duracao_dias: durationDays,
      valor_implantacao: project.implementation_value || 0,
      valor_recorrente: project.recurring_value || 0,
      qtd_produtos: products.length
    },
    cronograma: {
      atraso_acumulado_dias: delayDays,
      marcos: ['go_live', 'operacao_assistida', 'encerramento_bastao'].map(phase => {
        const events = timelineEvents.filter(e => e.phase === phase && e.end_date);
        if (events.length === 0) return null;
        const realizado = events.reduce((max, e) => !max || new Date(e.end_date) > new Date(max) ? e.end_date : max, null);
        const v1 = baselines.length > 0 ? [...baselines].sort((a, b) => (a.version || 0) - (b.version || 0))[0] : null;
        const planejado = v1?.milestones?.find(m => m.phase === phase)?.baseline_date;
        return {
          fase: phase,
          planejado: formatDateBR(planejado),
          realizado: formatDateBR(realizado),
          desvio_dias: planejado && realizado ? diffInDays(planejado, realizado) : null
        };
      }).filter(Boolean)
    },
    baselines: {
      total_revisoes: Math.max(0, baselines.length - 1),
      historico: [...baselines].sort((a, b) => (a.version || 0) - (b.version || 0)).map(b => ({
        versao: `V${b.version}`,
        data: formatDateBR(b.created_date),
        motivo: b.reason || null,
        observacao: b.observation || null,
        usuario: b.user_name || b.user_email || null
      }))
    },
    health_score: {
      media: healthAvg,
      melhor: healthBest,
      pior: healthWorst,
      qtd_snapshots: healthValues.length,
      periodos_verdes: healthValues.filter(v => v >= 80).length,
      periodos_amarelos: healthValues.filter(v => v >= 60 && v < 80).length,
      periodos_vermelhos: healthValues.filter(v => v < 60).length
    },
    kpis: {
      produtos_implantados: products.length,
      duracao_dias: durationDays,
      riscos_total: risks.length,
      riscos_materializados: risksMaterialized,
      riscos_mitigados: risksMitigated,
      baselines_total: baselines.length,
      pendencias_edital_abertas: editalOpen.length,
      pendencias_edital_atrasadas: editalOverdue.length,
      atraso_acumulado_dias: delayDays
    },
    riscos: {
      total: risks.length,
      materializados: risksMaterialized,
      mitigados: risksMitigated,
      top_5: [...risks]
        .map(r => ({ ...r, severity: (r.probability || 0) * (r.impact || 1) }))
        .sort((a, b) => b.severity - a.severity).slice(0, 5)
        .map(r => ({
          titulo: r.title, categoria: r.category,
          probabilidade: r.probability, impacto: r.impact,
          severidade: r.severity, status: r.status,
          mitigacao: r.mitigation || null
        }))
    },
    licoes_aprendidas: licoes.slice(0, 15).map(l => ({
      titulo: l.title, tipo: l.tipo, problema: l.problema, solucao: l.solucao
    })),
    pendencias_edital: {
      correlacionado_por: contractNumber ? 'numero_contrato' : 'cidade',
      numero_contrato: contractNumber || null,
      cidade_correlacionada: city,
      total: relatedEdital.length,
      concluidos: relatedEdital.length - editalOpen.length,
      em_aberto: editalOpen.length,
      atrasados: editalOverdue.length,
      itens_criticos: editalOpen.slice(0, 15).map(i => ({
        numero: i.numero_item,
        descricao: (i.item_edital || '').substring(0, 200),
        status: i.status,
        data_prevista: formatDateBR(i.data_prevista)
      }))
    },
    isi: {
      score: isi.score,
      classificacao: isi.classification,
      componentes: isi.components
    },
    saude_da_conta: {
      score: accountHealth.score,
      classificacao: accountHealth.classification,
      semaforo: accountHealth.semaforo,
      fatores_positivos: accountHealth.positives,
      fatores_negativos: accountHealth.negatives
    },
    irc: {
      score: irc.score,
      classificacao: irc.classification,
      semaforo: irc.semaforo,
      componentes: irc.components,
      principais_fatores: irc.topFactors
    },
    probabilidade_renovacao: {
      percentual: renewal.score,
      classificacao: renewal.classification,
      semaforo: renewal.semaforo
    },
    aceite_implantacao: implementationAccepted
  };
}

/**
 * Solicita ao agente IA a análise executiva.
 * Retorna o texto markdown final.
 */
export async function requestExecutiveAnalysis(project, payload) {
  const conversation = await base44.agents.createConversation({
    agent_name: AGENT_NAME,
    metadata: {
      name: `Encerramento — ${project.name}`,
      description: `Análise executiva do projeto ${project.name}`
    }
  });

  const prompt = `Realize a análise executiva completa do projeto concluído abaixo, seguindo EXATAMENTE a estrutura de 8 seções definida nas suas instruções. Use apenas os dados fornecidos. Não invente números.\n\nDADOS DO PROJETO (JSON):\n\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``;

  await base44.agents.addMessage(conversation, { role: 'user', content: prompt });

  const conversationId = conversation.id;
  let finalContent = '';

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe?.();
      reject(new Error('Tempo esgotado aguardando resposta do agente.'));
    }, 180000);

    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      const msgs = data.messages || [];
      const lastAssistant = [...msgs].reverse().find(m => m.role === 'assistant');
      if (lastAssistant?.content) {
        finalContent = lastAssistant.content;
      }
      if (lastAssistant && msgs[msgs.length - 1]?.role === 'assistant') {
        const pending = (lastAssistant.tool_calls || []).some(tc =>
          ['pending', 'running', 'in_progress'].includes(tc.status));
        if (!pending && finalContent.length > 100) {
          clearTimeout(timeout);
          unsubscribe();
          resolve();
        }
      }
    });
  });

  return finalContent;
}