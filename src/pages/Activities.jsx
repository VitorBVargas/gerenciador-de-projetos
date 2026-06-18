import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CheckCircle2, Clock, AlertTriangle, Users, Target, Hourglass, RotateCcw } from 'lucide-react';
import ActivityKanban from '../components/activities/ActivityKanban';
import ActivityTimeline from '../components/activities/ActivityTimeline';
import ActivityModal from '../components/modals/ActivityModal';
import GlobalTracker from '@/components/horas/GlobalTracker.jsx';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

export default function Activities() {
  const [activeTab, setActiveTab] = useState('kanban');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);

  // Filters
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectId ? base44.entities.Project.filter({ id: projectId }).then(r => r[0]) : null,
    enabled: !!projectId,
  });

  const isSustentacao = project?.project_type === 'sustentacao';

  const { data: activitiesRaw = [] } = useQuery({
    queryKey: ['activities', projectId],
    queryFn: () => projectId ? base44.entities.ProjectActivity.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
    staleTime: 60 * 1000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products', projectId],
    queryFn: () => projectId ? base44.entities.Product.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
    staleTime: 3 * 60 * 1000,
  });

  const verticals = useMemo(() => (
    [...new Set(products.map(p => p.vertical).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  ), [products]);

  const assignees = useMemo(() => (
    [...new Set(activitiesRaw.map(a => a.assignee).filter(Boolean))]
  ), [activitiesRaw]);

  // Apply filters
  const activities = useMemo(() => activitiesRaw.filter(a => {
    if (filterProduct !== 'all' && a.related_product_id !== filterProduct) return false;
    if (filterAssignee !== 'all' && a.assignee !== filterAssignee) return false;
    if (filterPriority !== 'all' && a.priority !== filterPriority) return false;
    if (filterType !== 'all' && a.activity_type !== filterType) return false;
    return true;
  }), [activitiesRaw, filterProduct, filterAssignee, filterPriority, filterType]);

  const hasFilters = filterProduct !== 'all' || filterAssignee !== 'all' || filterPriority !== 'all' || filterType !== 'all';

  const resetFilters = () => {
    setFilterProduct('all'); setFilterAssignee('all');
    setFilterPriority('all'); setFilterType('all');
  };

  // KPIs
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const kpis = useMemo(() => {
    const total = activitiesRaw.length;
    const inProgress = activitiesRaw.filter(a => a.status === 'in_progress').length;
    const waitingClient = activitiesRaw.filter(a => a.status === 'aguardando_cliente').length;
    const doneThisMonth = activitiesRaw.filter(a =>
      a.status === 'done' && a.completed_date &&
      isWithinInterval(parseISO(a.completed_date), { start: monthStart, end: monthEnd })
    ).length;
    const overdue = activitiesRaw.filter(a =>
      !['done'].includes(a.status) && a.end_date && new Date(a.end_date) < now
    ).length;
    const objectives = [...new Set(activitiesRaw.map(a => a.objective).filter(Boolean))].length;
    return { total, inProgress, waitingClient, doneThisMonth, overdue, objectives };
  }, [activitiesRaw]);

  const handleEdit = (act = null) => { setSelectedActivity(act); setIsModalOpen(true); };

  const ACTIVITY_TYPES = [
    'melhoria', 'treinamento', 'configuracao', 'processo', 'correcao',
    'indicador', 'documentacao', 'acompanhamento', 'integracao', 'reuniao'
  ];
  const TYPE_LABELS = {
    melhoria: 'Melhoria', treinamento: 'Treinamento', configuracao: 'Configuração',
    processo: 'Processo', correcao: 'Correção', indicador: 'Indicador',
    documentacao: 'Documentação', acompanhamento: 'Acompanhamento',
    integracao: 'Integração', reuniao: 'Reunião',
  };

  return (
    <div className="p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Atividades do time</h1>
          <p className="text-slate-400 mt-1">Gestão de tarefas e acompanhamento por vertical</p>
        </div>
        <Button onClick={() => handleEdit(null)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nova Atividade
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total',           value: kpis.total,           icon: CheckCircle2,   color: 'text-slate-300',   bg: 'border-slate-700 bg-slate-800/40' },
          { label: 'Em Andamento',    value: kpis.inProgress,      icon: Clock,          color: 'text-blue-400',    bg: 'border-blue-500/30 bg-blue-500/10' },
          { label: 'Aguard. Cliente', value: kpis.waitingClient,   icon: Users,          color: 'text-orange-400',  bg: 'border-orange-500/30 bg-orange-500/10' },
          { label: 'Concl. no Mês',   value: kpis.doneThisMonth,   icon: CheckCircle2,   color: 'text-emerald-400', bg: 'border-emerald-500/30 bg-emerald-500/10' },
          { label: 'Atrasadas',       value: kpis.overdue,         icon: AlertTriangle,  color: 'text-red-400',     bg: 'border-red-500/30 bg-red-500/10' },
          { label: 'Objetivos',       value: kpis.objectives,      icon: Target,         color: 'text-purple-400',  bg: 'border-purple-500/30 bg-purple-500/10' },
        ].map((kpi, i) => (
          <div key={i} className={`rounded-xl border p-3 ${kpi.bg}`}>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-slate-400 text-xs leading-tight">{kpi.label}</p>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-800/40 border border-slate-700 rounded-xl px-4 py-3">
        <span className="text-slate-500 text-xs font-medium mr-1">Filtros:</span>

        {products.length > 0 && (
          <Select value={filterProduct} onValueChange={setFilterProduct}>
            <SelectTrigger className="bg-slate-800 border-slate-600 text-white h-7 text-xs w-36">
              <SelectValue placeholder="Produto" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white text-xs">Todos os produtos</SelectItem>
              {products.map(p => <SelectItem key={p.id} value={p.id} className="text-white text-xs">{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {assignees.length > 0 && (
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="bg-slate-800 border-slate-600 text-white h-7 text-xs w-36">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white text-xs">Todos</SelectItem>
              {assignees.map(a => <SelectItem key={a} value={a} className="text-white text-xs">{a}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="bg-slate-800 border-slate-600 text-white h-7 text-xs w-32">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all" className="text-white text-xs">Todas</SelectItem>
            <SelectItem value="alta" className="text-white text-xs">🔴 Alta</SelectItem>
            <SelectItem value="media" className="text-white text-xs">🟡 Média</SelectItem>
            <SelectItem value="baixa" className="text-white text-xs">⚪ Baixa</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="bg-slate-800 border-slate-600 text-white h-7 text-xs w-36">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all" className="text-white text-xs">Todos os tipos</SelectItem>
            {ACTIVITY_TYPES.map(t => <SelectItem key={t} value={t} className="text-white text-xs">{TYPE_LABELS[t]}</SelectItem>)}
          </SelectContent>
        </Select>

        {hasFilters && (
          <button onClick={resetFilters} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white ml-1">
            <RotateCcw className="w-3 h-3" />
            Limpar
          </button>
        )}

        <span className="ml-auto text-slate-500 text-xs">{activities.length} atividades</span>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="kanban" className="data-[state=active]:bg-blue-600">Quadro Kanban</TabsTrigger>
          <TabsTrigger value="timeline" className="data-[state=active]:bg-blue-600">Timeline / Gantt</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          <ActivityKanban
            activities={activities}
            verticals={verticals}
            onEdit={handleEdit}
            projectId={projectId}
            isSustentacao={isSustentacao}
          />
        </TabsContent>

        <TabsContent value="timeline">
          <ActivityTimeline
            activities={activities}
            verticals={verticals}
            onEdit={handleEdit}
          />
        </TabsContent>
      </Tabs>

      <ActivityModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        activity={selectedActivity}
        projectId={projectId}
        verticals={verticals}
      />

      {projectId && <GlobalTracker projectId={projectId} />}
    </div>
  );
}