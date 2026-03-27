import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  Calendar,
  TrendingUp,
  AlertTriangle,
  Plus,
  ExternalLink,
  Upload
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { createPageUrl } from '../utils';
import { completeProjectCronogramas } from '../functions/syncProjectCronogramas';

import StatCard from '../components/dashboard/StatCard.jsx';
import ProgressChart from '../components/dashboard/ProgressChart.jsx';
import MigrationProgressChart from '../components/dashboard/MigrationProgressChart.jsx';
import HomologationProgressChart from '../components/dashboard/HomologationProgressChart.jsx';
import ProjectHealthScore, { calculateHealthScore } from '../components/dashboard/ProjectHealthScore.jsx';
import ProjectModal from '../components/modals/ProjectModal.jsx';
import ExcelImporter from '../components/import/ExcelImporter.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ProjectInsightsModal from '../components/dashboard/ProjectInsightsModal.jsx';
import AIAssistantModal from '../components/modals/AIAssistantModal.jsx';
import AIWelcomeModal from '../components/modals/AIWelcomeModal.jsx';
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles } from 'lucide-react';
import EntityFilter from '../components/filters/EntityFilter';
import KeyDocuments from '../components/dashboard/KeyDocuments.jsx';

export default function Dashboard() {
  const queryClient = useQueryClient();
  
  // Get project_id from URL
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');
  const isNewProject = urlParams.get('isNewProject') === 'true';

  const [selectedEntity, setSelectedEntity] = useState(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [insightsModalOpen, setInsightsModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isAIWelcomeOpen, setIsAIWelcomeOpen] = useState(isNewProject);
  const [hasShownInsights, setHasShownInsights] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Fetch all data with staleTime to reduce re-fetches
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Redirect to projects list if no project selected
  React.useEffect(() => {
    if (!projectId && projects.length === 0) {
      window.location.href = createPageUrl('ProjectsList');
    }
  }, [projectId, projects.length]);

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers', projectId],
    queryFn: () => projectId ? base44.entities.TeamMember.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
    staleTime: 3 * 60 * 1000
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products', projectId],
    queryFn: () => projectId ? base44.entities.Product.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
    staleTime: 3 * 60 * 1000
  });

  const { data: timelineEvents = [], isLoading: loadingTimelineEvents } = useQuery({
    queryKey: ['timelineEvents', projectId],
    queryFn: () => projectId ? base44.entities.TimelineEvent.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000
  });

  const { data: migrationTasks = [], isLoading: loadingMigration } = useQuery({
    queryKey: ['migrationTasks', projectId],
    queryFn: () => projectId ? base44.entities.MigrationTask.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
    staleTime: 3 * 60 * 1000
  });

  const { data: homologationTasks = [], isLoading: loadingHomolog } = useQuery({
    queryKey: ['homologationTasks', projectId],
    queryFn: () => projectId ? base44.entities.HomologationTask.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  const { data: risks = [], isLoading: loadingRisks } = useQuery({
    queryKey: ['risks', projectId],
    queryFn: () => projectId ? base44.entities.Risk.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000
  });

  const { data: milestones = [], isLoading: isLoadingMilestones } = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => projectId ? base44.entities.ProjectMilestone.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000
  });

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenses', projectId],
    queryFn: () => projectId ? base44.entities.Expense.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000
  });

  const { data: cronogramas = [], isLoading: loadingCronogramas } = useQuery({
    queryKey: ['cronogramas', projectId],
    queryFn: () => projectId ? base44.entities.Cronograma.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
    staleTime: 3 * 60 * 1000
  });

  // Track initial load completion
  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    const criticalDataLoaded = 
      !loadingProjects && 
      projectId && 
      projects.length > 0 &&
      !loadingProducts &&
      !loadingTimelineEvents &&
      !loadingHomolog &&
      !loadingMigration &&
      !loadingRisks &&
      !loadingExpenses &&
      !loadingCronogramas;

    if (criticalDataLoaded && !initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true;
      setTimeout(() => setIsInitialLoading(false), 800);
    }
  }, [loadingProjects, projectId, projects.length, loadingProducts, loadingTimelineEvents, loadingHomolog, loadingMigration, loadingRisks, loadingExpenses, loadingCronogramas]);

  // Active project
  const activeProject = projects.find(p => p.id === projectId);

  // Entity filter with full names
  const entityMap = new Map();
  products.forEach(p => {
    if (p.entity) {
      entityMap.set(p.entity, p.entity_full_name || p.entity);
    }
  });
  const allEntities = Array.from(entityMap.entries())
    .map(([code, fullName]) => ({ code, fullName }))
    .sort((a, b) => {
      const aFullName = a.fullName.toLowerCase();
      const bFullName = b.fullName.toLowerCase();
      const aCode = a.code.toLowerCase();
      const bCode = b.code.toLowerCase();
      
      // Prefeitura primeiro
      if (aFullName.includes('prefeitura') && !bFullName.includes('prefeitura')) return -1;
      if (!aFullName.includes('prefeitura') && bFullName.includes('prefeitura')) return 1;
      
      // Câmara segundo (inclui CM que é sinônimo)
      if ((aFullName.includes('câmara') || aCode === 'cm') && !((bFullName.includes('câmara') || bCode === 'cm'))) return -1;
      if (!((aFullName.includes('câmara') || aCode === 'cm')) && (bFullName.includes('câmara') || bCode === 'cm')) return 1;
      
      // Outras em ordem alfabética
      return aFullName.localeCompare(bFullName);
    });
  
  // Auto-select first entity if not selected and entities exist
  React.useEffect(() => {
    if (allEntities.length > 0 && selectedEntity === null) {
      // Select first entity (which will be Prefeitura if it exists)
      const entityToSelect = allEntities[0].code;
      setSelectedEntity(entityToSelect);
    }
  }, [allEntities.length, selectedEntity]);
  
  const filteredProducts = selectedEntity ? products.filter(p => p.entity === selectedEntity) : products;
  const filteredMigrationTasks = migrationTasks.filter(t => filteredProducts.some(p => p.id === t.product_id));
  const filteredHomologationTasks = homologationTasks.filter(t => filteredProducts.some(p => p.id === t.product_id));



  // Mutations
  const createProjectMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setProjectModalOpen(false);
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      // Salva o projeto PRIMEIRO (sempre), depois tenta completar cronogramas
      const result = await base44.entities.Project.update(id, data);
      // Se está concluindo o projeto, tenta marcar cronogramas (mas não bloqueia o save)
      if (data.status === 'concluido') {
        completeProjectCronogramas(id).catch(err => console.warn('Erro ao completar cronogramas:', err));
      }
      return result;
    },
    onSuccess: (_, { data }) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setProjectModalOpen(false);
      setSelectedProject(null);
      // Se concluiu o projeto, redirecionar para a lista
      if (data.status === 'concluido') {
        const portfolio = projects.find(p => p.id === projectId)?.portfolio || 'grandes_contas_sc_mg';
        window.location.href = createPageUrl(`ProjectsList?portfolio=${portfolio}`);
      }
    }
  });

  const toggleMilestoneMutation = useMutation({
    mutationFn: ({ id, completed }) => base44.entities.ProjectMilestone.update(id, { completed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', projectId] });
    }
  });

  const handleSaveProject = (data) => {
    if (selectedProject) {
      updateProjectMutation.mutate({ id: selectedProject.id, data });
    } else {
      createProjectMutation.mutate(data);
    }
  };

  const handleEditProject = () => {
    setSelectedProject(activeProject);
    setProjectModalOpen(true);
  };

  const handleImportSuccess = () => {
    queryClient.invalidateQueries();
  };

  const handleProductSave = (data) => {
    queryClient.invalidateQueries({ queryKey: ['products', projectId] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  };

  // Atualizar prazo estimado sempre que entra na Visão Geral
  React.useEffect(() => {
    if (projectId) {
      base44.functions.invoke('updateEstimatedDeadline', { project_id: projectId })
        .then(() => queryClient.invalidateQueries({ queryKey: ['projectProgressCache', projectId] }))
        .catch(err => console.error('Erro ao atualizar prazo estimado:', err));
    }
  }, [projectId, queryClient]);

  // Inicializa os marcos padrão se não existirem
  const milestonesInitializedRef = React.useRef(false);
  
  React.useEffect(() => {
    if (isLoadingMilestones || !projectId || milestones.length > 0 || milestonesInitializedRef.current) return;
    milestonesInitializedRef.current = true;

    const defaultMilestones = [
      'Planejamento e Monitoramento',
      'Kickoff',
      'Diagnóstico',
      'Migração de Homologação',
      'Homologação e Configuração da migração',
      'Migração em Produção',
      'Configuração de PRD',
      'Treinamento e simulação da operação',
      'Operação assistida'
    ];

    base44.entities.ProjectMilestone.bulkCreate(
      defaultMilestones.map((title, index) => ({
        project_id: projectId,
        title,
        completed: false,
        order: index
      }))
    ).then(() => queryClient.invalidateQueries({ queryKey: ['milestones', projectId] }));
  }, [isLoadingMilestones, projectId, milestones.length, queryClient]);



  // Calculate stats
  // Filter timeline events by vertical (based on filtered products)
  const filteredVerticals = selectedEntity
    ? [...new Set(filteredProducts.map(p => p.vertical).filter(Boolean))]
    : null;
  const filteredTimelineEvents = filteredVerticals
    ? timelineEvents.filter(e => !e.vertical || filteredVerticals.includes(e.vertical))
    : timelineEvents;

  const calcEventProgressDash = (e) => {
    if (e.status === 'concluido') return 100;
    if (e.status === 'nao_iniciado') return 0;
    if (e.progress !== undefined && e.progress !== null) return e.progress;
    if (e.start_date && e.end_date) {
      const now = new Date();
      const start = new Date(e.start_date);
      const end = new Date(e.end_date);
      if (now <= start) return 0;
      if (now >= end) return 99;
      return Math.round(((now - start) / (end - start)) * 100);
    }
    return 0;
  };

  // Fetch cached data PRIMEIRO
  const { data: overallProgressCache = null } = useQuery({
    queryKey: ['overallProgressCache', projectId],
    queryFn: () => projectId ? base44.entities.ProjectOverallProgressCache.filter({ project_id: projectId }).then(r => r[0] || null) : null,
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000
  });

  // Usar APENAS cache, sem cálculo manual
  const allEntitiesProgress = overallProgressCache?.overall_progress 
    ? Math.round(overallProgressCache.overall_progress) 
    : 0;

  // Progresso por entidade também vem do cache (filtrado no frontend)
  const projectProgress = selectedEntity && overallProgressCache?.overall_progress
    ? Math.round(overallProgressCache.overall_progress)
    : 0;

  const { data: progressCache = null } = useQuery({
    queryKey: ['progressCache', projectId],
    queryFn: () => projectId ? base44.entities.ProjectProgressCache.filter({ project_id: projectId }).then(r => r[0] || null) : null,
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000
  });

  const { data: healthCache = null } = useQuery({
    queryKey: ['healthCache', projectId],
    queryFn: () => projectId ? base44.entities.ProjectHealthCache.filter({ project_id: projectId }).then(r => r[0] || null) : null,
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000
  });

  // Calculate health score
  const { score: healthScore } = calculateHealthScore({ 
    timeline: filteredTimelineEvents, 
    budget: activeProject?.budget || 0, 
    spent: expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
    migrationTasks, 
    homologationTasks, 
    risks, 
    products,
    cronogramas
  });

  // Recalcular cache ao entrar no Dashboard
  React.useEffect(() => {
    if (projectId) {
      base44.functions.invoke('recalculateAllCaches', {}).then(() => {
        // Invalidar queries para forçar reload do cache atualizado
        queryClient.invalidateQueries({ queryKey: ['overallProgressCache', projectId] });
        queryClient.invalidateQueries({ queryKey: ['progressCache', projectId] });
      }).catch(err => console.error('Erro ao recalcular caches:', err));
    }
  }, [projectId, queryClient]);

  React.useEffect(() => {
    if (projectId && healthScore >= 0) {
      base44.functions.invoke('updateProjectHealthCache', {
        project_id: projectId,
        health_score: healthScore
      }).catch(err => console.error('Failed to update health cache:', err));
    }
  }, [projectId, healthScore]);

  // Get estimated deadline from cache (atualizado automaticamente)
  const estimatedDeadline = progressCache?.estimated_deadline;

  const tasksCompleted = filteredHomologationTasks.filter(t => t.completed).length;
  const totalTasks = filteredHomologationTasks.length;

  const highRisks = risks.filter(r => (r.probability >= 4 || r.impact >= 4) && (r.status === 'em_monitoramento' || r.status === 'em_andamento')).length;

  const daysToDeadline = activeProject?.deadline 
    ? differenceInDays(new Date(activeProject.deadline), new Date())
    : null;

  // Timeline progress by vertical - sempre por produto
  const eventsByVertical = {};
  
  const verticalGroups = {};
  filteredProducts.forEach(p => {
    const v = p.vertical || 'outros';
    if (!verticalGroups[v]) verticalGroups[v] = [];
    verticalGroups[v].push(p);
  });
  
  Object.entries(verticalGroups).forEach(([vertical, prods]) => {
    const eventIds = new Set();
    const events = [];
    
    prods.forEach(product => {
      const productEvents = filteredTimelineEvents.filter(e => e.product_id === product.id);
      productEvents.forEach(e => {
        if (!eventIds.has(e.id)) {
          eventIds.add(e.id);
          events.push(e);
        }
      });
    });
    
    // Fallback: se não encontrou eventos por product_id, busca por cronograma_id
    if (events.length === 0) {
      const cronogramaVert = cronogramas.find(c => c.vertical === vertical);
      if (cronogramaVert) {
        filteredTimelineEvents.filter(e => e.cronograma_id === cronogramaVert.id).forEach(e => {
          if (!eventIds.has(e.id)) {
            eventIds.add(e.id);
            events.push(e);
          }
        });
      }
    }
    
    if (events.length > 0) {
      eventsByVertical[vertical] = events;
    }
  });

  const verticalLabels = {
    arrecadacao: 'Arrecadação',
    compras: 'Compras/Contratos',
    contabil: 'Contábil',
    pessoal: 'Pessoal',
    educacao: 'Educação',
    iss: 'ISS',
    parceiros: 'Parceiros',
    plataforma: 'Plataforma',
    atendimento: 'Atendimento'
  };

  const verticalColors = {
    arrecadacao: '#3b82f6',
    compras: '#8b5cf6',
    contabil: '#10b981',
    pessoal: '#f59e0b',
    educacao: '#ec4899',
    iss: '#06b6d4',
    parceiros: '#6366f1',
    plataforma: '#14b8a6',
    atendimento: '#f97316'
  };

  const timelineProgressData = Object.entries(eventsByVertical)
    .map(([vertical, events]) => {
      const totalProgress = events.reduce((sum, event) => sum + calcEventProgressDash(event), 0);
      const avgProgress = events.length > 0 ? Math.round(totalProgress / events.length) : 0;
      const hasActiveEvents = events.some(e => e.status === 'em_andamento' || e.status === 'concluido' || e.status === 'atrasado');
      return {
        name: verticalLabels[vertical] || vertical,
        progress: avgProgress,
        color: verticalColors[vertical] || '#3b82f6',
        hasActiveEvents
      };
    })
    .filter(d => d.progress > 0 || d.hasActiveEvents)
    .sort((a, b) => b.progress - a.progress);

  // Homologation progress by vertical
  const homologationByVertical = filteredProducts.reduce((acc, product) => {
    const vertical = product.vertical || 'outros';
    const productTasks = filteredHomologationTasks.filter(t => t.product_id === product.id);
    const completed = productTasks.filter(t => t.completed).length;
    
    if (!acc[vertical]) {
      acc[vertical] = { total: 0, completed: 0 };
    }
    acc[vertical].total += productTasks.length;
    acc[vertical].completed += completed;
    
    return acc;
  }, {});

  const homologationData = Object.entries(homologationByVertical)
    .map(([vertical, data]) => ({
      name: vertical.charAt(0).toUpperCase() + vertical.slice(1),
      value: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0
    }))
    .filter(d => d.value > 0);

  const statusColors = {
    planejamento: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    em_andamento: 'bg-green-500/20 text-green-400 border-green-500/30',
    pausado: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    concluido: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
  };

  const statusLabels = {
    planejamento: 'Planejamento',
    em_andamento: 'Em Andamento',
    pausado: 'Pausado',
    concluido: 'Concluído'
  };

  // Loading screen similar to ExecutiveStatus
  if (isInitialLoading) {
    const loadingSteps = [
      { label: 'Projetos', done: !loadingProjects },
      { label: 'Produtos', done: !loadingProducts },
      { label: 'Cronograma', done: !loadingCronogramas },
      { label: 'Etapas', done: !loadingTimelineEvents },
      { label: 'Homologação', done: !loadingHomolog },
      { label: 'Migração', done: !loadingMigration },
      { label: 'Riscos', done: !loadingRisks },
      { label: 'Despesas', done: !loadingExpenses },
      { label: 'Sincronizando...', done: false },
    ];

    const completedSteps = loadingSteps.filter(s => s.done).length;
    const progressPercent = Math.round((completedSteps / loadingSteps.length) * 100);

    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900">
        <div className="w-full max-w-md px-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">B</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Carregando Projeto</h2>
            <p className="text-slate-400 text-sm">Aguarde, buscando todos os dados...</p>
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-400">{completedSteps} de {loadingSteps.length} etapas</span>
              <span className="text-sm font-semibold text-white">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            {loadingSteps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-3">
                {step.done ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-600 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-slate-500" />
                  </div>
                )}
                <span className={`text-sm ${step.done ? 'text-slate-300 line-through' : 'text-slate-400'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Visão Geral</h1>
          <p className="text-slate-400 mt-1">Acompanhe o progresso do seu projeto</p>
        </div>
        {activeProject && (
          <div className="flex gap-2 flex-wrap">
            <a
              href="https://betha-road-map.base44.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white transition-colors text-sm font-medium"
            >
              🗺️ Bug / Melhoria
            </a>
            <Button 
              onClick={handleEditProject}
              className="bg-slate-700 hover:bg-slate-600"
            >
              Editar Projeto
            </Button>
            <Button 
              onClick={() => setInsightsModalOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              title="Análise Inteligente"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Análise Inteligente
            </Button>
            <Button 
              onClick={() => setIsAIModalOpen(true)}
              className="bg-slate-700 hover:bg-slate-600"
              size="icon"
              title="Assistente IA"
            >
              <Sparkles className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Entity Filter */}
      {allEntities.length > 0 && (
        <EntityFilter entities={allEntities} selectedEntity={selectedEntity} onEntityChange={setSelectedEntity} />
      )}

      {/* Project Info Row */}
      {activeProject && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Project Card */}
          <div className="lg:col-span-2">
            <Card className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-slate-700/50 h-full">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4">
                  {/* Header with title and contract link */}
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-white mb-4">{activeProject.name}</h2>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {activeProject.manager && (
                          <div className="text-slate-400">
                            <span className="text-slate-500">Gerente:</span> <span className="text-white">{activeProject.manager}</span>
                          </div>
                        )}
                        {activeProject.coordinator && (
                          <div className="text-slate-400">
                            <span className="text-slate-500">Coordenador:</span> <span className="text-white">{activeProject.coordinator}</span>
                          </div>
                        )}
                        {activeProject.portfolio_manager && (
                          <div className="text-slate-400">
                            <span className="text-slate-500">Gerente de Portfólio:</span> <span className="text-white">{activeProject.portfolio_manager}</span>
                          </div>
                        )}
                        {activeProject?.implementation_value > 0 && (
                         <div className="text-slate-400">
                           <span className="text-slate-500">Implantação:</span> <span className="text-emerald-400">
                             {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(activeProject.implementation_value)}
                           </span>
                         </div>
                        )}
                        {activeProject?.recurring_value > 0 && (
                          <div className="text-slate-400">
                            <span className="text-slate-500">Inclusão:</span> <span className="text-emerald-400">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(activeProject.recurring_value)}
                            </span>
                          </div>
                        )}

                        {activeProject.deadline && (
                           <div className="text-slate-400">
                             <span className="text-slate-500">Prazo Contratual:</span> <span className={cn(
                               daysToDeadline < 0 ? "text-red-400" : daysToDeadline < 30 ? "text-yellow-400" : "text-white"
                             )}>
                               {format(new Date(activeProject.deadline), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                             </span>
                           </div>
                         )}
                         {estimatedDeadline && (
                           <div className="text-slate-400">
                             <span className="text-slate-500">Prazo Estimado:</span> <span className="text-blue-400">
                               {format(parseISO(estimatedDeadline), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                             </span>
                           </div>
                         )}
                      </div>
                    </div>
                    {activeProject?.contract_link && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        onClick={() => window.open(activeProject.contract_link, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Contrato
                      </Button>
                    )}
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Progresso Geral</p>
                        <p className="text-2xl font-bold text-white">{allEntitiesProgress}%</p>
                        {selectedEntity && (
                          <p className="text-xs text-slate-500 mt-0.5">Todas as entidades</p>
                        )}
                      </div>
                    </div>
                    {selectedEntity && (
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <TrendingUp className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Progresso Entidade</p>
                          <p className="text-2xl font-bold text-white">{projectProgress}%</p>
                          <p className="text-xs text-slate-500 mt-0.5">{allEntities.find(e => e.code === selectedEntity)?.fullName}</p>
                        </div>
                      </div>
                    )}
                    {!selectedEntity && (
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-12 h-12 rounded-lg flex items-center justify-center",
                          highRisks > 0 ? "bg-red-500/20" : "bg-green-500/20"
                        )}>
                          <AlertTriangle className={cn(
                            "w-6 h-6",
                            highRisks > 0 ? "text-red-400" : "text-green-400"
                          )} />
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Riscos Altos</p>
                          <p className="text-2xl font-bold text-white">{highRisks}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Health Score */}
          <ProjectHealthScore
            timeline={filteredTimelineEvents}
            budget={activeProject?.budget || 0}
            spent={expenses.reduce((sum, e) => sum + (e.amount || 0), 0)}
            migrationTasks={migrationTasks}
            homologationTasks={homologationTasks}
            risks={risks}
            products={products}
            cronogramas={cronogramas}
          />
        </div>
      )}

      {!activeProject && (
        <EmptyState
          icon={LayoutDashboard}
          title="Nenhum projeto cadastrado"
          description="Crie seu primeiro projeto para começar a gerenciar"
          action={
            <Button onClick={() => setProjectModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Criar Projeto
            </Button>
          }
        />
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {timelineProgressData.length > 0 ? (
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white">Progresso do Cronograma por Vertical</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timelineProgressData.map((item) => (
                  <div key={item.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">{item.name}</span>
                      <span className="text-white font-semibold">{item.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${item.progress}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="py-12">
              <EmptyState
                icon={Calendar}
                title="Nenhuma etapa cadastrada"
                description="Adicione etapas no cronograma para visualizar o progresso"
              />
            </CardContent>
          </Card>
        )}

        {filteredProducts.length > 0 && filteredHomologationTasks.length > 0 ? (
          <HomologationProgressChart products={filteredProducts} tasks={filteredHomologationTasks} />
        ) : (
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="py-12">
              <EmptyState
                icon={Calendar}
                title="Nenhuma tarefa de homologação"
                description="Adicione tarefas de homologação para visualizar o gráfico"
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Migration Progress Chart */}
      {filteredProducts.length > 0 && (
        <MigrationProgressChart products={filteredProducts} tasks={filteredMigrationTasks} />
      )}

      {/* Documentos Chave */}
      <KeyDocuments projectId={projectId} project={activeProject} products={products} />

      {/* Project Modal */}
      <ProjectModal
        open={projectModalOpen}
        onOpenChange={setProjectModalOpen}
        project={selectedProject}
        onSave={handleSaveProject}
      />

      {/* Excel Importer */}
      <ExcelImporter
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onSuccess={handleImportSuccess}
      />

      {/* Project Insights Modal */}
      <ProjectInsightsModal
        open={insightsModalOpen}
        onClose={() => setInsightsModalOpen(false)}
        projectId={projectId}
      />

      {/* AI Assistant Modal */}
      <AIAssistantModal 
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        projectId={projectId}
        projectData={{
          project: activeProject,
          products,
          timelineEvents,
          risks,
          milestones,
          expenses,
          migrationTasks,
          homologationTasks
        }}
      />

      {/* AI Welcome Modal */}
      <AIWelcomeModal 
        isOpen={isAIWelcomeOpen}
        onClose={() => setIsAIWelcomeOpen(false)}
        projectName={activeProject?.name || 'Seu Projeto'}
      />


    </div>
  );
}