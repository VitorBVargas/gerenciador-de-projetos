import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AgilPageHeader from '@/components/agil/AgilPageHeader';
import ScrumSuggestionCard from '@/components/agil/ScrumSuggestionCard';
import AgenteScrumChat from '@/components/agil/AgenteScrumChat';
import { Button } from '@/components/ui/button';
import { Bot, Sparkles, Loader2, Brain, Check, X, Clock, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const DIMENSIONS = [
  { key: 'todas', label: 'Todas' },
  { key: 'velocity', label: 'Velocity' },
  { key: 'sprint', label: 'Sprint' },
  { key: 'roadmap', label: 'Roadmap' },
  { key: 'backlog', label: 'Backlog' },
  { key: 'equipe', label: 'Equipe' },
  { key: 'riscos', label: 'Riscos' },
  { key: 'kpis', label: 'KPIs' },
  { key: 'discovery', label: 'Discovery' },
  { key: 'releases', label: 'Releases' },
];

export default function AgilAgenteScrum() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('sugestoes');
  const [filterDim, setFilterDim] = useState('todas');
  const [filterStatus, setFilterStatus] = useState('pendente');

  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list('-created_date') });
  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['scrum_suggestions', projectId],
    queryFn: () => projectId ? base44.entities.ScrumSuggestion.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
  });
  const { data: backlog = [] } = useQuery({ queryKey: ['agil_backlog', projectId], queryFn: () => projectId ? base44.entities.AgileBacklog.filter({ project_id: projectId }) : [], enabled: !!projectId });
  const { data: sprints = [] } = useQuery({ queryKey: ['agil_sprints', projectId], queryFn: () => projectId ? base44.entities.AgileSprint.filter({ project_id: projectId }) : [], enabled: !!projectId });
  const { data: risks = [] } = useQuery({ queryKey: ['agil_risks', projectId], queryFn: () => projectId ? base44.entities.Risk.filter({ project_id: projectId }) : [], enabled: !!projectId });

  const activeProject = projects.find((p) => p.id === projectId);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('generateScrumSuggestionsAI', { project_id: projectId });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scrum_suggestions', projectId] });
      setTab('sugestoes');
      setFilterStatus('pendente');
      toast.success(`${data?.suggestions_created || 0} sugestões geradas`, { description: data?.executive_summary || 'Análise concluída.' });
    },
    onError: (err) => toast.error('Falha na análise', { description: err.message }),
  });

  const decideMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.ScrumSuggestion.update(id, { status, decided_at: status === 'pendente' ? null : new Date().toISOString() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scrum_suggestions', projectId] }),
  });

  // Contexto resumido para o chat
  const chatContext = useMemo(() => {
    const main = backlog.filter((i) => !i.is_subtask);
    const active = sprints.find((s) => s.status === 'em_andamento');
    const activeRisks = risks.filter((r) => !['encerrado', 'mitigado'].includes(r.status));
    return [
      `Projeto: ${activeProject?.name || '—'}`,
      `Sprint ativa: ${active?.nome || 'nenhuma'}`,
      `Backlog: ${main.length} itens | Bugs abertos: ${main.filter((i) => i.tipo === 'bug' && i.status !== 'concluido').length}`,
      `Riscos ativos: ${activeRisks.length}`,
      `Sprints: ${sprints.length} (concluídas: ${sprints.filter((s) => s.status === 'concluida').length})`,
    ].join('\n');
  }, [activeProject, backlog, sprints, risks]);

  const pending = suggestions.filter((s) => s.status === 'pendente');
  const accepted = suggestions.filter((s) => s.status === 'aceita');
  const rejected = suggestions.filter((s) => s.status === 'rejeitada');

  const filtered = suggestions
    .filter((s) => filterStatus === 'todas' || s.status === filterStatus)
    .filter((s) => filterDim === 'todas' || s.dimension === filterDim)
    .sort((a, b) => {
      const order = { critica: 0, alta: 1, media: 2, baixa: 3 };
      return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
    });

  if (!projectId) {
    return (
      <div className="p-8 text-center">
        <Bot className="w-12 h-12 mx-auto text-slate-600 mb-4" />
        <p className="text-slate-400">Selecione um projeto ágil para usar o Agente Scrum IA.</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-5 min-h-screen">
      <AgilPageHeader icon={Bot} title="Agente Scrum IA" projectName={activeProject?.name}>
        <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
          {generateMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analisando...</> : <><Sparkles className="w-4 h-4 mr-2" /> Analisar projeto</>}
        </Button>
      </AgilPageHeader>

      <p className="text-sm text-slate-400 flex items-center gap-1.5">
        <Brain className="w-3.5 h-3.5 text-emerald-400" />
        Especialista em Scrum, Kanban, Lean, PMBOK, Lean Inception, Product Discovery, Roadmapping, DDD, Gestão de Produtos e Engenharia de Software. Analisa Velocity, Sprint, Roadmap, Backlog, Equipe, Riscos, KPIs, Discovery e Releases. <span className="text-slate-500">Nunca altera dados — você aceita ou rejeita cada sugestão.</span>
      </p>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pendentes', value: pending.length, icon: Clock, color: 'text-yellow-400' },
          { label: 'Aceitas', value: accepted.length, icon: Check, color: 'text-emerald-400' },
          { label: 'Rejeitadas', value: rejected.length, icon: X, color: 'text-slate-400' },
        ].map((k) => (
          <div key={k.label} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1"><k.icon className={cn('w-4 h-4', k.color)} /><p className="text-xs text-slate-400">{k.label}</p></div>
            <p className={cn('text-2xl font-bold', k.color)}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/60 rounded-lg p-1 w-fit">
        {[{ key: 'sugestoes', label: 'Sugestões', icon: ListChecks }, { key: 'chat', label: 'Chat', icon: Bot }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5', tab === t.key ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white')}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'sugestoes' ? (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 flex-wrap">
              {['pendente', 'aceita', 'rejeitada', 'todas'].map((s) => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={cn('px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors', filterStatus === s ? 'bg-slate-700 text-white' : 'bg-slate-800/60 text-slate-400 hover:text-white')}>
                  {s === 'pendente' ? 'Pendentes' : s === 'aceita' ? 'Aceitas' : s === 'rejeitada' ? 'Rejeitadas' : 'Todas'}
                </button>
              ))}
            </div>
            <span className="text-slate-600">·</span>
            <div className="flex gap-1 flex-wrap">
              {DIMENSIONS.map((d) => (
                <button key={d.key} onClick={() => setFilterDim(d.key)}
                  className={cn('px-2.5 py-1 rounded-full text-xs font-medium transition-colors', filterDim === d.key ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/40' : 'bg-slate-800/60 text-slate-400 hover:text-white border border-transparent')}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 bg-slate-800/40 rounded-xl border border-slate-700/40">
              <Bot className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
              <h3 className="text-white font-semibold mb-1">Nenhuma sugestão {filterStatus !== 'todas' ? `(${filterStatus})` : ''}</h3>
              <p className="text-slate-400 text-sm mb-4">Clique em "Analisar projeto" para o Agente Scrum IA gerar recomendações.</p>
              <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                {generateMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analisando...</> : <><Sparkles className="w-4 h-4 mr-2" /> Analisar projeto</>}
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {filtered.map((s) => (
                <ScrumSuggestionCard
                  key={s.id}
                  suggestion={s}
                  onAccept={(x) => decideMutation.mutate({ id: x.id, status: 'aceita' })}
                  onReject={(x) => decideMutation.mutate({ id: x.id, status: 'rejeitada' })}
                  onReset={(x) => decideMutation.mutate({ id: x.id, status: 'pendente' })}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <AgenteScrumChat project={activeProject} context={chatContext} />
      )}
    </div>
  );
}