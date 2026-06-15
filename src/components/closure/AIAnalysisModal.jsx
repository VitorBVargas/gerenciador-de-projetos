import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Brain, Loader2, Copy, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import {
  extractCityFromProjectName,
  calculateISI,
  PORTFOLIO_LABELS,
  formatCurrencyBR,
  formatDateBR,
  diffInDays
} from './closureUtils';
import { calculateHealthScore } from '@/components/dashboard/ProjectHealthScore';

const AGENT_NAME = 'encerramento_executivo_ia';

function buildAnalysisPayload(project) {
  return async () => {
    const pid = project.id;
    const [products, timelineEvents, baselines, risks, healthSnapshots, editalItems, licoes, cronogramas, migrationTasks, homologationTasks] = await Promise.all([
      base44.entities.Product.filter({ project_id: pid }),
      base44.entities.TimelineEvent.filter({ project_id: pid }),
      base44.entities.ScheduleBaseline.filter({ project_id: pid }),
      base44.entities.Risk.filter({ project_id: pid }),
      base44.entities.HealthScoreSnapshot.filter({ project_id: pid }).catch(() => []),
      base44.entities.EditalItem.filter({ portfolio: project.portfolio }).catch(() => []),
      base44.entities.LicaoAprendida.filter({ project_id: pid }).catch(() => []),
      base44.entities.Cronograma.filter({ project_id: pid }).catch(() => []),
      base44.entities.MigrationTask.filter({ project_id: pid }).catch(() => []),
      base44.entities.HomologationTask.filter({ project_id: pid }).catch(() => [])
    ]);

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

    const cityNorm = (city || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const relatedEdital = editalItems.filter(item => {
      const proj = (item.projeto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return cityNorm && proj.includes(cityNorm);
    });
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
      }
    };
  };
}

export default function AIAnalysisModal({ project, open, onOpenChange }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [copied, setCopied] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    setAnalysis('');
    try {
      toast.info('Coletando dados do projeto...');
      const buildPayload = buildAnalysisPayload(project);
      const payload = await buildPayload();

      toast.info('Solicitando análise ao agente IA...');

      const conversation = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: {
          name: `Encerramento — ${project.name}`,
          description: `Análise executiva do projeto ${project.name}`
        }
      });

      const prompt = `Realize a análise executiva completa do projeto concluído abaixo, seguindo EXATAMENTE a estrutura de 8 seções definida nas suas instruções. Use apenas os dados fornecidos. Não invente números.\n\nDADOS DO PROJETO (JSON):\n\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``;

      await base44.agents.addMessage(conversation, { role: 'user', content: prompt });

      // Subscribe para receber a resposta em streaming
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
            setAnalysis(finalContent);
          }
          // Heurística de "completo": último é assistant com conteúdo e sem tool_calls pendentes
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

      toast.success('Análise gerada com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar análise: ' + (err.message || 'desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(analysis);
    setCopied(true);
    toast.success('Análise copiada!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            Análise IA — {project?.name}
          </DialogTitle>
        </DialogHeader>

        {!analysis && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-6">
            <Brain className="w-16 h-16 text-purple-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Agente de Encerramento Executivo
            </h3>
            <p className="text-slate-400 text-sm max-w-md mb-6">
              Gera parecer executivo completo com análise de cronograma, fatores de sucesso e risco,
              risco de renovação contratual e recomendações pós-projeto para Diretoria, PMO, Comercial e CS.
            </p>
            <Button onClick={runAnalysis} className="bg-purple-600 hover:bg-purple-700">
              <Brain className="w-4 h-4 mr-2" />
              Gerar Análise IA
            </Button>
          </div>
        )}

        {loading && !analysis && (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <Loader2 className="w-10 h-10 text-purple-400 animate-spin mb-4" />
            <p className="text-slate-300 text-sm">Analisando dados do projeto...</p>
            <p className="text-slate-500 text-xs mt-2">Isso pode levar alguns segundos</p>
          </div>
        )}

        {analysis && (
          <>
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <span className="text-xs text-slate-400">
                {loading ? 'Gerando análise...' : 'Análise concluída'}
              </span>
              <Button size="sm" variant="ghost" onClick={handleCopy} className="text-slate-300 hover:text-white">
                {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="prose prose-sm prose-invert max-w-none
                prose-headings:text-white prose-headings:font-semibold
                prose-h3:text-purple-300 prose-h3:mt-6 prose-h3:mb-3
                prose-p:text-slate-300 prose-p:leading-relaxed
                prose-strong:text-white
                prose-li:text-slate-300
                prose-ul:my-2">
                <ReactMarkdown>{analysis}</ReactMarkdown>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}