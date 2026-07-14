import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckSquare, AlertTriangle, Target, TrendingUp, Users,
  Calendar, Clock, Flag, ChevronRight, Activity, BarChart2,
  Zap, Shield, ArrowUp, ArrowDown, Minus, ExternalLink, Edit, ShieldCheck, ShieldAlert, Eye, RotateCcw
} from 'lucide-react';
import CNDStatusCard from '../components/prestacao/CNDStatus';
import PrestacaoConsolidadaCard from '../components/prestacao/PrestacaoConsolidadaCard.jsx';
import ObservacoesCriticas from '../components/prestacao/ObservacoesCriticas.jsx';
import { format, subDays, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import SustentacaoProjectModal from '../components/modals/SustentacaoProjectModal.jsx';
import GlobalTracker from '@/components/horas/GlobalTracker.jsx';
import ChamadosResumo from '../components/sustentacao/ChamadosResumo.jsx';
import RelatoriosOperacionaisResumo from '../components/sustentacao/RelatoriosOperacionaisResumo.jsx';
import HideableSection from '../components/sustentacao/HideableSection.jsx';
import { useCurrentUser, canEditProject } from '@/lib/permissions';
import { getAvailableEntities } from '@/lib/entityRegistry';
import { createPageUrl } from '../utils';

const SECTION_LABELS = {
  cnd: 'Status CND',
  prestacao: 'Prestação de Contas',
  observacoes: 'Observações Críticas',
  kpis: 'KPI Cards',
  objetivos: 'Objetivos do Roadmap',
  chamados: 'Chamados',
  relatorios: 'Relatórios Operacionais',
  backlog: 'Backlog e Riscos',
  evolucao: 'Evolução das Atividades',
};

const PRIORITY_CONFIG = {
  alta:   { label: 'Alta',   color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30',    dot: 'bg-red-400' },
  media:  { label: 'Média',  color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', dot: 'bg-yellow-400' },
  baixa:  { label: 'Baixa',  color: 'text-slate-400',  bg: 'bg-slate-500/10 border-slate-500/30', dot: 'bg-slate-400' },
  critica:{ label: 'Crítica',color: 'text-red-500',    bg: 'bg-red-600/10 border-red-600/30',    dot: 'bg-red-500' },
};

const STATUS_ACTIVITY = {
  todo:        { label: 'Pendente',    color: 'text-slate-400', bg: 'bg-slate-700' },
  in_progress: { label: 'Em Andamento', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  done:        { label: 'Concluído',   color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  blocked:     { label: 'Bloqueado',   color: 'text-red-400',   bg: 'bg-red-500/10' },
};

function HealthBadge({ level }) {
  const cfg = {
    saudavel:  { label: 'Saudável',  cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    atencao:   { label: 'Atenção',   cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
    critico:   { label: 'Crítico',   cls: 'bg-red-500/20 text-red-300 border-red-500/40' },
  }[level] || { label: 'N/A', cls: 'bg-slate-700 text-slate-400 border-slate-600' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-semibold ${cfg.cls}`}>
      <span className="w-2 h-2 rounded-full bg-current" />
      {cfg.label}
    </span>
  );
}

function KPICard({ icon: Icon, label, value, sub, color = 'text-blue-400', bg = 'bg-blue-500/10' }) {
  return (
    <Card className="bg-slate-800/60 border-slate-700/50">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SustentacaoDashboard() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');
  const { user: currentUser } = useCurrentUser();
  const canEdit = canEditProject(currentUser);
  const [projectModalOpen, setProjectModalOpen] = React.useState(false);

  const storageKey = `dashHidden:${projectId}`;
  const [hiddenSections, setHiddenSections] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(`dashHidden:${projectId}`) || '[]'); } catch { return []; }
  });
  const persistHidden = (next) => {
    setHiddenSections(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch (e) { /* ignore */ }
  };
  const hideSection = (key) => persistHidden([...new Set([...hiddenSections, key])]);
  const showSection = (key) => persistHidden(hiddenSections.filter(k => k !== key));
  const isHidden = (key) => hiddenSections.includes(key);

  const { data: activeProject, isLoading: loadingProject } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => base44.entities.Project.filter({ id: projectId }).then(r => r[0] || null),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', projectId],
    queryFn: () => projectId ? base44.entities.ProjectActivity.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: risks = [] } = useQuery({
    queryKey: ['risks', projectId],
    queryFn: () => projectId ? base44.entities.Risk.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
    staleTime: 3 * 60 * 1000,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers', projectId],
    queryFn: () => projectId ? base44.entities.TeamMember.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: obrigacoes = [], isLoading: loadingObrigacoes } = useQuery({
    queryKey: ['obrigacoes', projectId],
    queryFn: () => projectId ? base44.entities.ObrigacaoLegal.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
    staleTime: 3 * 60 * 1000,
  });

  const { data: produtos = [], isLoading: loadingProdutos } = useQuery({
    queryKey: ['products', projectId],
    queryFn: () => projectId ? base44.entities.Product.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: entities = [], isLoading: loadingEntities } = useQuery({
    queryKey: ['entities', projectId],
    queryFn: () => projectId ? base44.entities.Entidade.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: ciclos = [] } = useQuery({
    queryKey: ['roadmapCiclos', projectId],
    queryFn: () => projectId ? base44.entities.RoadmapCiclo.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: objetivos = [] } = useQuery({
    queryKey: ['roadmapObjetivos', projectId],
    queryFn: () => projectId ? base44.entities.RoadmapObjetivo.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: iniciativas = [] } = useQuery({
    queryKey: ['roadmapIniciativas', projectId],
    queryFn: () => projectId ? base44.entities.RoadmapIniciativa.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: chamados = [] } = useQuery({
    queryKey: ['chamados', projectId],
    queryFn: () => projectId ? base44.entities.Chamado.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });

  const availableEntities = React.useMemo(() => getAvailableEntities(entities, produtos), [entities, produtos]);
  const hasPrestacaoContas = produtos.some(p => p.prestacao_contas) || availableEntities.length > 0;
  const prestacaoLoading = loadingObrigacoes || loadingEntities || loadingProdutos;

  if (loadingProject || !activeProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  // ---- Computed data ----
  const now = new Date();
  const last30 = subDays(now, 30);

  const activeRisks = risks.filter(r => r.status !== 'mitigado');
  const criticalRisks = risks.filter(r => (r.probability >= 4 || r.impact >= 4) && r.status !== 'mitigado');

  const backlogActivities = activities.filter(a => a.status !== 'done');
  const done30 = activities.filter(a => {
    if (a.status !== 'done') return false;
    try { return isWithinInterval(parseISO(a.end_date), { start: last30, end: now }); } catch { return false; }
  });

  const priorityCounts = { alta: 0, media: 0, baixa: 0, critica: 0 };
  backlogActivities.forEach(a => { if (a.priority) priorityCounts[a.priority] = (priorityCounts[a.priority] || 0) + 1; });

  const top5 = [...backlogActivities]
    .sort((a, b) => {
      const order = { critica: 0, alta: 1, media: 2, baixa: 3 };
      return (order[a.priority] ?? 99) - (order[b.priority] ?? 99);
    })
    .slice(0, 5);

  // Health level
  const healthLevel = criticalRisks.length > 2 ? 'critico'
    : criticalRisks.length > 0 || backlogActivities.filter(a => a.priority === 'alta').length > 3 ? 'atencao'
    : 'saudavel';

  // Responsible
  const responsible = activeProject.manager || teamMembers.find(m => m.is_leader)?.name || '—';

  // Last 6 weeks activity chart (simplified)
  const weeklyData = Array.from({ length: 6 }, (_, i) => {
    const weekEnd = subDays(now, i * 7);
    const weekStart = subDays(weekEnd, 7);
    const done = activities.filter(a => {
      if (a.status !== 'done') return false;
      try { return isWithinInterval(parseISO(a.end_date), { start: weekStart, end: weekEnd }); } catch { return false; }
    }).length;
    return { semana: format(weekEnd, 'dd/MM'), concluidas: done };
  }).reverse();

  const totalDone = activities.filter(a => a.status === 'done').length;
  const objPct = activities.length > 0 ? Math.round((totalDone / activities.length) * 100) : 0;

  // ---- Roadmap: ciclo ativo + objetivos por período ----
  const cicloAtivo = [...ciclos]
    .filter(c => c.status === 'ativo')
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0] || null;
  const objCiclo = cicloAtivo ? objetivos.filter(o => o.ciclo_id === cicloAtivo.id) : [];
  const iniCiclo = cicloAtivo ? iniciativas.filter(i => i.ciclo_id === cicloAtivo.id) : [];

  const objProgress = (obj) => {
    const inis = iniCiclo.filter(i => i.objetivo_id === obj.id);
    if (!inis.length) return obj.status === 'concluido' ? 100 : 0;
    return Math.round((inis.filter(i => i.concluido).length / inis.length) * 100);
  };

  const handleSaveProject = async (data) => {
    await base44.entities.Project.update(activeProject.id, data);
    window.location.reload();
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 text-white">

      {/* ── CABEÇALHO EXECUTIVO ───────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{activeProject.name}</h1>
              <HealthBadge level={healthLevel} />
              <span className="text-xs text-slate-500 bg-slate-700/60 px-2 py-1 rounded-full">Sustentação</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="text-slate-500 block text-xs">Responsável</span>
                <span className="text-white font-medium">{responsible}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Portfólio</span>
                <span className="text-white font-medium capitalize">{activeProject.portfolio?.replace(/_/g, ' ') || '—'}</span>
              </div>
              {availableEntities.length > 0 && (
                <div className="col-span-2 md:col-span-2">
                  <span className="text-slate-500 block text-xs">Entidades</span>
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {availableEntities.map((ent) => (
                      <span key={ent.id || ent.nome} className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 font-medium">
                        {ent.nome}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {activeProject.sustentacao_start_date && (
                <div>
                  <span className="text-slate-500 block text-xs">Início da Sustentação</span>
                  <span className="text-white font-medium">
                    {format(parseISO(activeProject.sustentacao_start_date), 'dd/MM/yyyy')}
                  </span>
                </div>
              )}
              {activeProject.last_meeting_date && (
                <div>
                  <span className="text-slate-500 block text-xs">Última Reunião</span>
                  <span className="text-white font-medium">
                    {format(parseISO(activeProject.last_meeting_date), 'dd/MM/yyyy')}
                  </span>
                </div>
              )}
              {activeProject.next_meeting_date && (
                <div>
                  <span className="text-slate-500 block text-xs">Próxima Reunião</span>
                  <span className="text-emerald-300 font-medium">
                    {format(parseISO(activeProject.next_meeting_date), 'dd/MM/yyyy')}
                  </span>
                </div>
              )}
              {activeProject.notes && (
                <div className="col-span-2 md:col-span-4">
                  <span className="text-slate-500 block text-xs">Observações</span>
                  <span className="text-slate-300 text-xs">{activeProject.notes}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="flex gap-2">
              {activeProject.contract_link && (
                <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  onClick={() => window.open(activeProject.contract_link, '_blank')}>
                  <ExternalLink className="w-4 h-4 mr-1" /> Contrato
                </Button>
              )}
              {canEdit && (
                <Button size="sm" className="bg-slate-700 hover:bg-slate-600"
                  onClick={() => setProjectModalOpen(true)}>
                  <Edit className="w-4 h-4 mr-1" /> Editar
                </Button>
              )}
            </div>
            {hiddenSections.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Ocultos:
                </span>
                {hiddenSections.map(key => (
                  <button key={key} onClick={() => showSection(key)}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300 hover:bg-slate-600 hover:text-white transition-colors flex items-center gap-1">
                    {SECTION_LABELS[key] || key} <RotateCcw className="w-2.5 h-2.5" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CND STATUS — só exibe se o projeto tem Prestação de Contas ── */}
      {hasPrestacaoContas && !isHidden('cnd') && (
        <HideableSection hidden={false} onHide={() => hideSection('cnd')}>
          <CNDStatusCard project={activeProject} obrigacoes={obrigacoes} />
        </HideableSection>
      )}

      {/* ── QUADRO CONSOLIDADO (Prestação de Contas) — logo abaixo da CND ── */}
      {hasPrestacaoContas && !isHidden('prestacao') && (
        <HideableSection hidden={false} onHide={() => hideSection('prestacao')}>
          {prestacaoLoading ? (
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardContent className="py-12 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
              </CardContent>
            </Card>
          ) : (
            <PrestacaoConsolidadaCard obrigacoes={obrigacoes} produtos={produtos} entidades={availableEntities} />
          )}
        </HideableSection>
      )}

      {/* ── OBSERVAÇÕES CRÍTICAS (impacto alto, não concluídas/canceladas) ── */}
      {!isHidden('observacoes') && (
        <HideableSection hidden={false} onHide={() => hideSection('observacoes')}>
          <ObservacoesCriticas projectId={projectId} />
        </HideableSection>
      )}

      {/* ── KPI CARDS ─────────────────────────────────────────────────── */}
      {!isHidden('kpis') && (
        <HideableSection hidden={false} onHide={() => hideSection('kpis')}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <KPICard icon={CheckSquare} label="Backlog Total" value={backlogActivities.length}
              color="text-blue-400" bg="bg-blue-500/10" />
            <KPICard icon={Activity} label="Concluídas (30d)" value={done30.length}
              color="text-emerald-400" bg="bg-emerald-500/10" />
            <KPICard icon={AlertTriangle} label="Riscos Ativos" value={activeRisks.length}
              sub={criticalRisks.length > 0 ? `${criticalRisks.length} crítico(s)` : 'Sem críticos'}
              color={criticalRisks.length > 0 ? "text-red-400" : "text-emerald-400"}
              bg={criticalRisks.length > 0 ? "bg-red-500/10" : "bg-emerald-500/10"} />
            <KPICard icon={Users} label="Equipe" value={teamMembers.length}
              color="text-purple-400" bg="bg-purple-500/10" />
            <KPICard icon={TrendingUp} label="Atividades Concluídas" value={`${objPct}%`}
              sub={`${totalDone} de ${activities.length}`}
              color="text-cyan-400" bg="bg-cyan-500/10" />
          </div>
        </HideableSection>
      )}

      {/* ── OBJETIVOS ATUAIS (Roadmap 30/60/90 dias) ─────────────────── */}
      {!isHidden('objetivos') && (
        <HideableSection hidden={false} onHide={() => hideSection('objetivos')}>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-slate-200">Objetivos do Roadmap</span>
                {cicloAtivo && <span className="text-xs text-slate-500">· {cicloAtivo.name}</span>}
              </div>
              <a href={createPageUrl(`SustentacaoRoadmap?project_id=${projectId}`)}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                Ver Roadmap <ChevronRight className="w-3 h-3" />
              </a>
            </div>

            {!cicloAtivo ? (
              <div className="text-center py-6">
                <p className="text-slate-500 text-sm">Nenhum ciclo ativo.</p>
                <p className="text-slate-600 text-xs mt-1">Crie um ciclo e objetivos na aba Roadmap.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {[
                  { key: '30dias', label: '30 dias', icon: '🎯', color: 'from-blue-600/20 to-cyan-600/10', border: 'border-blue-500/30' },
                  { key: '60dias', label: '60 dias', icon: '🚀', color: 'from-purple-600/20 to-pink-600/10', border: 'border-purple-500/30' },
                  { key: '90dias', label: '90 dias', icon: '🏁', color: 'from-emerald-600/20 to-teal-600/10', border: 'border-emerald-500/30' },
                ].map(({ key, label, icon, color, border }) => {
                  const objs = objCiclo.filter(o => o.periodo === key);
                  return (
                    <div key={key} className={`bg-gradient-to-br ${color} border ${border} rounded-xl p-4`}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">{icon}</span>
                        <span className="text-sm font-semibold text-slate-300">Objetivo — {label}</span>
                      </div>
                      {objs.length === 0 ? (
                        <p className="text-slate-500 text-sm py-2">Nenhum objetivo definido.</p>
                      ) : (
                        <div className="space-y-3">
                          {objs.map(obj => {
                            const pct = objProgress(obj);
                            return (
                              <div key={obj.id}>
                                <p className="text-white font-medium text-sm">{obj.titulo}</p>
                                <div className="mt-1.5">
                                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                                    <span>{obj.responsavel || 'Sem responsável'}</span>
                                    <span className="font-semibold text-white">{pct}%</span>
                                  </div>
                                  <div className="w-full bg-slate-700 rounded-full h-1.5">
                                    <div className="h-1.5 rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </HideableSection>
      )}

      {/* ── RESUMO DE CHAMADOS (internos e externos) ─────────────────── */}
      {!isHidden('chamados') && (
        <HideableSection hidden={false} onHide={() => hideSection('chamados')}>
          <ChamadosResumo chamados={chamados} projectId={projectId} />
        </HideableSection>
      )}

      {/* ── RELATÓRIOS OPERACIONAIS (histórico + download direto) ─────── */}
      {!isHidden('relatorios') && (
        <HideableSection hidden={false} onHide={() => hideSection('relatorios')}>
          <RelatoriosOperacionaisResumo projectId={projectId} projectName={activeProject.name} />
        </HideableSection>
      )}

      {/* ── RESUMO DO BACKLOG + TOP 5 ────────────────────────────────── */}
      {!isHidden('backlog') && (
        <HideableSection hidden={false} onHide={() => hideSection('backlog')}>
          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Flag className="w-4 h-4 text-blue-400" /> Resumo do Backlog
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { key: 'critica', label: 'Crítica', color: 'bg-red-500' },
                  { key: 'alta', label: 'Alta', color: 'bg-orange-500' },
                  { key: 'media', label: 'Média', color: 'bg-yellow-500' },
                  { key: 'baixa', label: 'Baixa', color: 'bg-slate-500' },
                ].map(({ key, label, color }) => (
                  <div key={key} className="text-center bg-slate-700/50 rounded-lg p-3">
                    <div className={`w-3 h-3 rounded-full ${color} mx-auto mb-1`} />
                    <p className="text-2xl font-bold text-white">{priorityCounts[key] || 0}</p>
                    <p className="text-xs text-slate-400">{label}</p>
                  </div>
                ))}
              </div>

              {/* Top 5 */}
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">5 próximos priorizados</p>
              {top5.length === 0 ? (
                <p className="text-slate-500 text-sm py-4 text-center">Nenhuma atividade no backlog.</p>
              ) : (
                <div className="space-y-2">
                  {top5.map(a => {
                    const pCfg = PRIORITY_CONFIG[a.priority] || PRIORITY_CONFIG.media;
                    const sCfg = STATUS_ACTIVITY[a.status] || STATUS_ACTIVITY.todo;
                    return (
                      <div key={a.id} className="flex items-center gap-3 bg-slate-700/40 rounded-lg px-3 py-2.5">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${pCfg.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{a.title}</p>
                          {a.assignee && <p className="text-xs text-slate-400">{a.assignee}</p>}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${sCfg.bg} ${sCfg.color} flex-shrink-0`}>
                          {sCfg.label}
                        </span>
                        <span className={`text-xs font-medium flex-shrink-0 ${pCfg.color}`}>{pCfg.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </HideableSection>
      )}

      {/* ── ALERTAS E RISCOS ─────────────────────────────────────────── */}
      {!isHidden('riscos') && (
        <HideableSection hidden={false} onHide={() => hideSection('riscos')}>
          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-400" /> Alertas e Riscos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {activeRisks.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="w-10 h-10 text-emerald-400/30 mx-auto mb-2" />
                  <p className="text-sm text-emerald-400">Nenhum risco ativo</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {activeRisks.slice(0, 6).map(r => {
                    const isCrit = r.probability >= 4 || r.impact >= 4;
                    return (
                      <div key={r.id} className={`rounded-lg px-3 py-2.5 border ${isCrit ? 'bg-red-500/10 border-red-500/30' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
                        <div className="flex items-start gap-2">
                          <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isCrit ? 'text-red-400' : 'text-yellow-400'}`} />
                          <div>
                            <p className="text-sm text-white font-medium leading-tight">{r.title}</p>
                            {r.description && (
                              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{r.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-slate-500">P:{r.probability} I:{r.impact}</span>
                              {r.suggested_owner && <span className="text-xs text-slate-400">• {r.suggested_owner}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {activeRisks.length > 6 && (
                <p className="text-xs text-slate-500 text-center">+{activeRisks.length - 6} riscos adicionais na aba Riscos</p>
              )}
            </CardContent>
          </Card>
        </HideableSection>
      )}

      {/* ── GRÁFICO EVOLUÇÃO — apenas projetos sem Prestação de Contas ── */}
      {!hasPrestacaoContas && !isHidden('evolucao') && (
        <HideableSection hidden={false} onHide={() => hideSection('evolucao')}>
          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-400" /> Evolução das Atividades (últimas 6 semanas)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyData.every(d => d.concluidas === 0) ? (
                <p className="text-slate-500 text-sm text-center py-8">Nenhuma atividade concluída com data de encerramento registrada.</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={weeklyData} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="semana" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#fff' }}
                      formatter={(v) => [v, 'Concluídas']}
                    />
                    <Bar dataKey="concluidas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </HideableSection>
      )}


      {/* Project Modal */}
      <SustentacaoProjectModal
        open={projectModalOpen}
        onOpenChange={setProjectModalOpen}
        project={activeProject}
        onSave={handleSaveProject}
      />

      {projectId && <GlobalTracker projectId={projectId} />}
    </div>
  );
}