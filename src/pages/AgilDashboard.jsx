import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Rocket, Zap, CheckCircle2, ClipboardList, Bug, Wrench, Timer, Gauge, TrendingUp,
  Kanban, ListTodo, Search, Plus, Sparkles, AlertTriangle, CalendarDays, Map,
  PackageCheck, MessageSquare, Ban, RefreshCw, Compass
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import HealthScoreGauge from '@/components/agil/HealthScoreGauge';
import DashboardStatCard from '@/components/agil/DashboardStatCard';
import GerarBacklogIAModal from '@/components/agil/GerarBacklogIAModal';
import StartGuidanceCards from '@/components/agil/StartGuidanceCards';
import { computeSprintMetrics, computeBurndown } from '@/components/agil/boardMetrics';
import { computeSprintHealth, detectIssues, classifyScore } from '@/components/agil/scrumMasterAnalysis';
import { effectiveColumn } from '@/components/agil/boardMeta';

const tooltipStyle = { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#fff' };

export default function AgilDashboard() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');
  const queryClient = useQueryClient();
  const [backlogModalOpen, setBacklogModalOpen] = useState(false);

  const withPid = (page) => createPageUrl(`${page}?project_id=${projectId}`);

  const { data: project } = useQuery({
    queryKey: ['agilProject', projectId],
    enabled: !!projectId,
    queryFn: async () => (await base44.entities.Project.filter({ id: projectId }))?.[0] || null,
  });

  const { data: discovery } = useQuery({
    queryKey: ['agilDiscovery', project?.discovery_id],
    enabled: !!project?.discovery_id,
    queryFn: async () => (await base44.entities.Discovery.filter({ id: project.discovery_id }))?.[0] || null,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['agileBacklog', projectId],
    enabled: !!projectId,
    queryFn: () => base44.entities.AgileBacklog.filter({ project_id: projectId }, '-updated_date', 500),
  });

  const { data: sprints = [] } = useQuery({
    queryKey: ['agileSprints', projectId],
    enabled: !!projectId,
    queryFn: () => base44.entities.AgileSprint.filter({ project_id: projectId }, 'ordem'),
  });

  const { data: riscos = [] } = useQuery({
    queryKey: ['agilRiscos', projectId],
    enabled: !!projectId,
    queryFn: () => base44.entities.Risk.filter({ project_id: projectId }, '-created_date', 5),
  });

  const { data: reunioes = [] } = useQuery({
    queryKey: ['agilReunioes', projectId],
    enabled: !!projectId,
    queryFn: () => base44.entities.Reuniao.filter({ project_id: projectId }, '-data', 5),
  });

  // Sprint atual: em andamento -> senão a última planejada
  const currentSprint = useMemo(() => {
    return sprints.find(s => s.status === 'em_andamento') || sprints.find(s => s.status === 'planejada') || sprints[sprints.length - 1] || null;
  }, [sprints]);

  const sprintItems = useMemo(
    () => (currentSprint ? items.filter(i => i.sprint_id === currentSprint.id) : []),
    [items, currentSprint]
  );

  const metrics = useMemo(() => computeSprintMetrics(sprintItems, currentSprint), [sprintItems, currentSprint]);
  const health = useMemo(() => computeSprintHealth(metrics, sprintItems), [metrics, sprintItems]);
  const issues = useMemo(() => detectIssues(sprintItems), [sprintItems]);
  const burndown = useMemo(() => computeBurndown(sprintItems, currentSprint), [sprintItems, currentSprint]);

  // Burnup resumido (SP concluídos acumulados x total)
  const burnup = useMemo(() => burndown.data.map(d => ({
    dia: d.dia,
    Concluído: d.real === null ? null : Math.round((burndown.totalSp - d.real) * 10) / 10,
    Escopo: burndown.totalSp,
  })), [burndown]);

  // Métricas gerais do produto (todo o backlog)
  const globais = useMemo(() => {
    const main = items.filter(i => !i.is_subtask);
    const done = main.filter(i => effectiveColumn(i) === 'concluido');
    return {
      storiesConcluidas: done.length,
      storiesPlanejadas: main.length,
      bugs: main.filter(i => i.tipo === 'bug' && effectiveColumn(i) !== 'concluido').length,
      debitoTecnico: main.filter(i => i.tipo === 'debito_tecnico' && effectiveColumn(i) !== 'concluido').length,
    };
  }, [items]);

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  const cls = classifyScore(health.score);
  const discoveryDone = !!project.discovery_id;

  return (
    <div className="min-h-screen bg-slate-900 p-6 lg:p-8 space-y-6">
      {/* Header + botões rápidos */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-600/20 flex items-center justify-center flex-shrink-0">
            <Rocket className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl lg:text-3xl font-bold text-white">{project.name}</h1>
              <Badge className="bg-emerald-600/20 text-emerald-300 border border-emerald-600/30">Ágil</Badge>
            </div>
            {project.agil_objetivo && <p className="text-slate-400 mt-1 max-w-2xl">{project.agil_objetivo}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={withPid('AgilStartAssistant')}><Button size="sm" variant="outline" className="border-emerald-700/50 text-emerald-300 hover:bg-emerald-600/10"><Compass className="w-4 h-4 mr-1.5" /> Assistente de Início</Button></Link>
          <Link to={withPid('AgilSprintBoard')}><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"><Kanban className="w-4 h-4 mr-1.5" /> Abrir Sprint</Button></Link>
          <Link to={withPid('AgilBacklog')}><Button size="sm" variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800"><ListTodo className="w-4 h-4 mr-1.5" /> Abrir Backlog</Button></Link>
          <Link to={withPid('AgilDiscovery')}><Button size="sm" variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800"><Search className="w-4 h-4 mr-1.5" /> Abrir Discovery</Button></Link>
          <Link to={withPid('AgilBacklog')}><Button size="sm" variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800"><Plus className="w-4 h-4 mr-1.5" /> Criar Sprint</Button></Link>
          <Button size="sm" onClick={() => setBacklogModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700"><Sparkles className="w-4 h-4 mr-1.5" /> Gerar IA</Button>
        </div>
      </div>

      {/* Guias de início: aparecem só quando falta Discovery ou Stories */}
      <StartGuidanceCards
        project={project}
        discovery={discovery}
        hasStories={globais.storiesPlanejadas > 0}
        onBacklogGenerated={() => {
          queryClient.invalidateQueries({ queryKey: ['agileBacklog', projectId] });
          queryClient.invalidateQueries({ queryKey: ['agileSprints', projectId] });
        }}
      />

      {/* Linha 1: Health + Sprint atual + Discovery */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Health Score */}
        <Card className={`border ${cls.bg}`}>
          <CardContent className="p-5 flex items-center gap-4">
            <HealthScoreGauge score={health.score} classification={cls} size={110} />
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">Health Score da Sprint</p>
              <p className={`text-lg font-bold ${cls.color}`}>{cls.label}</p>
              <p className="text-sm text-slate-400 mt-1">{currentSprint?.nome || 'Sem sprint ativa'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Sprint atual */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2"><CardTitle className="text-white text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-emerald-400" /> Sprint Atual</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <p className="text-white font-semibold">{currentSprint?.nome || '—'}</p>
            {currentSprint?.objetivo && <p className="text-slate-400 text-xs">{currentSprint.objetivo}</p>}
            <div className="flex justify-between text-slate-300"><span className="text-slate-500">Progresso</span><span>{metrics.percentSprint}%</span></div>
            <div className="flex justify-between text-slate-300"><span className="text-slate-500">Dias restantes</span><span>{metrics.diasRestantes ?? '—'}</span></div>
            <div className="flex justify-between text-slate-300"><span className="text-slate-500">Velocity</span><span>{metrics.velocity} SP</span></div>
          </CardContent>
        </Card>

        {/* Discovery */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2"><CardTitle className="text-white text-sm flex items-center gap-2"><Search className="w-4 h-4 text-emerald-400" /> Discovery</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {discoveryDone ? (
              <Badge className="bg-emerald-600/20 text-emerald-300 border border-emerald-600/30 flex items-center gap-1 w-fit"><CheckCircle2 className="w-3 h-3" /> Discovery realizado</Badge>
            ) : (
              <Badge className="bg-yellow-600/20 text-yellow-300 border border-yellow-600/30 flex items-center gap-1 w-fit"><AlertTriangle className="w-3 h-3" /> Discovery pendente</Badge>
            )}
            {discovery?.titulo && <p className="text-sm text-slate-300">{discovery.titulo}</p>}
            <Link to={withPid('AgilDiscovery')}><Button size="sm" variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800 mt-1"><Search className="w-3.5 h-3.5 mr-1.5" /> Ver Discovery</Button></Link>
          </CardContent>
        </Card>
      </div>

      {/* Linha 2: Indicadores-chave */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <DashboardStatCard icon={CheckCircle2} label="Stories Concluídas" value={globais.storiesConcluidas} color="bg-emerald-500/15 text-emerald-300" />
        <DashboardStatCard icon={ClipboardList} label="Stories Planejadas" value={globais.storiesPlanejadas} color="bg-indigo-500/15 text-indigo-300" />
        <DashboardStatCard icon={TrendingUp} label="Velocity" value={`${metrics.velocity} SP`} color="bg-green-500/15 text-green-300" />
        <DashboardStatCard icon={Bug} label="Bugs" value={globais.bugs} color="bg-red-500/15 text-red-300" />
        <DashboardStatCard icon={Wrench} label="Débito Técnico" value={globais.debitoTecnico} color="bg-orange-500/15 text-orange-300" />
        <DashboardStatCard icon={Timer} label="Lead Time" value={`${metrics.leadTime}h`} color="bg-blue-500/15 text-blue-300" />
        <DashboardStatCard icon={Gauge} label="Cycle Time" value={`${metrics.cycleTime}h`} color="bg-cyan-500/15 text-cyan-300" />
        <DashboardStatCard icon={PackageCheck} label="Throughput" value={metrics.throughput} color="bg-teal-500/15 text-teal-300" />
      </div>

      {/* Linha 3: Burnup + Burndown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-1"><CardTitle className="text-white text-sm">Burnup resumido</CardTitle></CardHeader>
          <CardContent>
            {burnup.length === 0 ? <p className="py-10 text-center text-slate-500 text-sm">Sem dados de sprint.</p> : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={burnup}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="dia" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="Escopo" stroke="#64748b" fill="#334155" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="Concluído" stroke="#10b981" fill="#10b981" fillOpacity={0.35} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-1"><CardTitle className="text-white text-sm">Burndown resumido</CardTitle></CardHeader>
          <CardContent>
            {burndown.data.length === 0 ? <p className="py-10 text-center text-slate-500 text-sm">Sem dados de sprint.</p> : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={burndown.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="dia" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="ideal" name="Ideal" stroke="#64748b" strokeDasharray="4 4" dot={false} />
                  <Line type="monotone" dataKey="real" name="Real" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Linha 4: Roadmap resumido + Próxima Release */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2"><CardTitle className="text-white text-sm flex items-center gap-2"><Map className="w-4 h-4 text-emerald-400" /> Roadmap resumido</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {sprints.length === 0 ? <p className="text-slate-500 text-sm py-4">Nenhuma sprint no roadmap.</p> : (
              sprints.slice(0, 5).map(s => (
                <div key={s.id} className="flex items-center justify-between text-sm p-2 rounded bg-slate-900/50 border border-slate-700/60">
                  <span className="text-slate-200">{s.nome}</span>
                  <Badge className="bg-slate-700 text-slate-300 border-0 text-xs">{s.status === 'em_andamento' ? 'Em andamento' : s.status === 'concluida' ? 'Concluída' : 'Planejada'}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2"><CardTitle className="text-white text-sm flex items-center gap-2"><PackageCheck className="w-4 h-4 text-emerald-400" /> Próxima Release</CardTitle></CardHeader>
          <CardContent>
            {(() => {
              const next = sprints.find(s => s.status === 'em_andamento') || sprints.find(s => s.status === 'planejada');
              if (!next) return <p className="text-slate-500 text-sm py-4">Nenhuma release planejada.</p>;
              return (
                <div className="space-y-1.5 text-sm">
                  <p className="text-white font-semibold">{next.nome}</p>
                  {next.data_fim && <p className="text-slate-400">Previsão: {next.data_fim}</p>}
                  {next.objetivo && <p className="text-slate-400 text-xs">{next.objetivo}</p>}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Linha 5: Impedimentos + Riscos + Reuniões */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2"><CardTitle className="text-white text-sm flex items-center gap-2"><Ban className="w-4 h-4 text-red-400" /> Últimos impedimentos</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {issues.bloqueados.length === 0 ? <p className="text-slate-500 text-sm py-2">Nenhum impedimento ativo.</p> : (
              issues.bloqueados.slice(0, 5).map(i => (
                <div key={i.id} className="text-sm text-slate-300 flex items-start gap-1.5"><Ban className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" /><span className="truncate">{i.titulo}</span></div>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2"><CardTitle className="text-white text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-400" /> Últimos riscos</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {riscos.length === 0 ? <p className="text-slate-500 text-sm py-2">Nenhum risco registrado.</p> : (
              riscos.slice(0, 5).map(r => (
                <div key={r.id} className="text-sm text-slate-300 flex items-start gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-yellow-400 mt-0.5 flex-shrink-0" /><span className="truncate">{r.descricao || r.titulo || r.nome || 'Risco'}</span></div>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2"><CardTitle className="text-white text-sm flex items-center gap-2"><CalendarDays className="w-4 h-4 text-blue-400" /> Últimas reuniões</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {reunioes.length === 0 ? <p className="text-slate-500 text-sm py-2">Nenhuma reunião registrada.</p> : (
              reunioes.slice(0, 5).map(m => (
                <div key={m.id} className="text-sm text-slate-300 flex items-start justify-between gap-2">
                  <span className="truncate flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" /> {m.titulo}</span>
                  {m.data && <span className="text-xs text-slate-500 flex-shrink-0">{m.data}</span>}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <GerarBacklogIAModal
        open={backlogModalOpen}
        onOpenChange={setBacklogModalOpen}
        project={project}
        discovery={discovery}
        onDone={() => {
          queryClient.invalidateQueries({ queryKey: ['agilProject', projectId] });
          queryClient.invalidateQueries({ queryKey: ['agileBacklog', projectId] });
          queryClient.invalidateQueries({ queryKey: ['agileSprints', projectId] });
        }}
      />
    </div>
  );
}