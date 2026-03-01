import React, { useState, useEffect } from 'react';
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
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { createPageUrl } from '../utils';
import { completeProjectCronogramas } from '../functions/syncProjectCronogramas';

import EmptyState from '../components/ui/EmptyState.jsx';
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Loader2 } from 'lucide-react';
import EntityFilter from '../components/filters/EntityFilter';

// Lazy-loaded components (not needed on initial render)
const StatCard = React.lazy(() => import('../components/dashboard/StatCard.jsx'));
const ProgressChart = React.lazy(() => import('../components/dashboard/ProgressChart.jsx'));
const MigrationProgressChart = React.lazy(() => import('../components/dashboard/MigrationProgressChart.jsx'));
const HomologationProgressChart = React.lazy(() => import('../components/dashboard/HomologationProgressChart.jsx'));
const ProjectHealthScore = React.lazy(() => import('../components/dashboard/ProjectHealthScore.jsx'));
const ProjectModal = React.lazy(() => import('../components/modals/ProjectModal.jsx'));
const ExcelImporter = React.lazy(() => import('../components/import/ExcelImporter.jsx'));
const ProjectInsightsModal = React.lazy(() => import('../components/dashboard/ProjectInsightsModal.jsx'));
const AIAssistantModal = React.lazy(() => import('../components/modals/AIAssistantModal.jsx'));
const AIWelcomeModal = React.lazy(() => import('../components/modals/AIWelcomeModal.jsx'));
const KeyDocuments = React.lazy(() => import('../components/dashboard/KeyDocuments.jsx'));

const LazyFallback = () => <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>;

export default function Dashboard() {
  const queryClient = useQueryClient();
  
  // Get project_id from URL
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');
  const isNewProject = urlParams.get('isNewProject') === 'true';

  const [selectedEntity, setSelectedEntity] = useState('PM');
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [insightsModalOpen, setInsightsModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isAIWelcomeOpen, setIsAIWelcomeOpen] = useState(isNewProject);
  const [hasShownInsights, setHasShownInsights] = useState(false);

  // Fetch all data
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
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
    enabled: !!projectId
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products', projectId],
    queryFn: () => projectId ? base44.entities.Product.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const { data: timelineEvents = [] } = useQuery({
    queryKey: ['timelineEvents', projectId],
    queryFn: () => projectId ? base44.entities.TimelineEvent.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const { data: migrationTasks = [] } = useQuery({
    queryKey: ['migrationTasks', projectId],
    queryFn: () => projectId ? base44.entities.MigrationTask.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const { data: homologationTasks = [] } = useQuery({
    queryKey: ['homologationTasks', projectId],
    queryFn: () => projectId ? base44.entities.HomologationTask.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const { data: risks = [] } = useQuery({
    queryKey: ['risks', projectId],
    queryFn: () => projectId ? base44.entities.Risk.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const { data: milestones = [], isLoading: isLoadingMilestones } = useQuery({ // [!code ++]
    queryKey: ['milestones', projectId],
    queryFn: () => projectId ? base44.entities.ProjectMilestone.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', projectId],
    queryFn: () => projectId ? base44.entities.Expense.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const { data: cronogramas = [] } = useQuery({
    queryKey: ['cronogramas', projectId],
    queryFn: () => projectId ? base44.entities.Cronograma.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  // Active project
  const activeProject = projects.find(p => p.id === projectId);

  // Entity filter
  const allEntities = [...new Set(products.map(p => p.entity).filter(Boolean))].sort();
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
      // Se está concluindo o projeto, marcar cronogramas como concluídos
      if (data.status === 'concluido') {
        await completeProjectCronogramas(id);
      }
      return base44.entities.Project.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setProjectModalOpen(false);
      setSelectedProject(null);
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

  // Inicializa os marcos padrão se não existirem
  const [milestonesInitialized, setMilestonesInitialized] = React.useState(false);
  
  React.useEffect(() => {
    const initializeMilestones = async () => {
      // Adicionada a verificação !isLoadingMilestones para evitar duplicidade
      if (!isLoadingMilestones && projectId && milestones.length === 0 && !milestonesInitialized) {
        setMilestonesInitialized(true);
        
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
        
        await base44.entities.ProjectMilestone.bulkCreate(
          defaultMilestones.map((title, index) => ({
            project_id: projectId,
            title,
            completed: false,
            order: index
          }))
        );
        
        queryClient.invalidateQueries({ queryKey: ['milestones', projectId] });
      }
    };
    
    initializeMilestones();
  }, [projectId, milestones.length, milestonesInitialized, queryClient, isLoadingMilestones]);



  // Calculate stats
  // Filter timeline events by vertical (based on filtered products)
  const filteredVerticals = selectedEntity
    ? [...new Set(filteredProducts.map(p => p.vertical).filter(Boolean))]
    : null;
  const filteredTimelineEvents = filteredVerticals
    ? timelineEvents.filter(e => !e.vertical || filteredVerticals.includes(e.vertical))
    : timelineEvents;

  const projectProgress = filteredTimelineEvents.length > 0
    ? Math.round(filteredTimelineEvents.reduce((sum, e) => {
        // Usar 100% se status for concluído, caso contrário usar o valor de progress
        if (e.status === 'concluido') return sum + 100;
        return sum + (e.progress || 0);
      }, 0) / filteredTimelineEvents.length)
    : 0;

  const tasksCompleted = filteredHomologationTasks.filter(t => t.completed).length;
  const totalTasks = filteredHomologationTasks.length;

  const highRisks = risks.filter(r => (r.probability >= 4) || (r.impact >= 4)).length;

  const daysToDeadline = activeProject?.deadline 
    ? differenceInDays(new Date(activeProject.deadline), new Date())
    : null;

  // Timeline progress by vertical
  const eventsByVertical = {};
  const usedVerticals = [...new Set(filteredTimelineEvents.map(e => e.vertical).filter(Boolean))];
  
  usedVerticals.forEach(vertical => {
    eventsByVertical[vertical] = filteredTimelineEvents.filter(e => e.vertical === vertical);
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
      const totalProgress = events.reduce((sum, event) => {
        // Usar 100% se status for concluído, caso contrário usar o valor de progress
        if (event.status === 'concluido') return sum + 100;
        return sum + (event.progress || 0);
      }, 0);
      const avgProgress = events.length > 0 ? Math.round(totalProgress / events.length) : 0;
      return {
        name: verticalLabels[vertical] || vertical,
        progress: avgProgress,
        color: verticalColors[vertical] || '#3b82f6'
      };
    })
    .filter(d => d.progress > 0)
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

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Visão Geral</h1>
          <p className="text-slate-400 mt-1">Acompanhe o progresso do seu projeto</p>
        </div>
        {activeProject && (
          <div className="flex gap-2">
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
                        {products.reduce((sum, p) => sum + (p.implementation_value || 0), 0) > 0 && (
                         <div className="text-slate-400">
                           <span className="text-slate-500">Implantação:</span> <span className="text-emerald-400">
                             {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(products.reduce((sum, p) => sum + (p.implementation_value || 0), 0))}
                           </span>
                         </div>
                        )}
                        {products.reduce((sum, p) => sum + (p.inclusion_value || 0), 0) > 0 && (
                          <div className="text-slate-400">
                            <span className="text-slate-500">Inclusão:</span> <span className="text-emerald-400">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(products.reduce((sum, p) => sum + (p.inclusion_value || 0), 0))}
                            </span>
                          </div>
                        )}

                        {activeProject.deadline && (
                          <div className="text-slate-400">
                            <span className="text-slate-500">Prazo:</span> <span className={cn(
                              daysToDeadline < 0 ? "text-red-400" : daysToDeadline < 30 ? "text-yellow-400" : "text-white"
                            )}>
                              {format(new Date(activeProject.deadline), "dd 'de' MMMM, yyyy", { locale: ptBR })}
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
                        <p className="text-2xl font-bold text-white">{projectProgress}%</p>
                      </div>
                    </div>
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
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Health Score */}
          <React.Suspense fallback={<LazyFallback />}>
            <ProjectHealthScore
              timeline={timelineEvents}
              budget={activeProject?.budget || 0}
              spent={expenses.reduce((sum, e) => sum + (e.amount || 0), 0)}
              migrationTasks={migrationTasks}
              homologationTasks={homologationTasks}
              risks={risks}
              products={products}
              cronogramas={cronogramas}
            />
          </React.Suspense>
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
      <React.Suspense fallback={<LazyFallback />}>
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
      </React.Suspense>

      {/* Marcos e Documentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">Etapas Principais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {milestones.sort((a, b) => a.order - b.order).map((milestone) => (
              <div key={milestone.id} className="flex items-center gap-3">
                <Checkbox 
                  checked={milestone.completed}
                  onCheckedChange={(checked) => toggleMilestoneMutation.mutate({ 
                    id: milestone.id, 
                    completed: checked 
                  })}
                  className="border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" 
                />
                <span className={cn(
                  "text-sm",
                  milestone.completed ? "text-slate-500 line-through" : "text-white"
                )}>{milestone.title}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <React.Suspense fallback={<LazyFallback />}>
          <KeyDocuments projectId={projectId} project={activeProject} />
        </React.Suspense>
      </div>

      {/* Modals - only rendered when needed */}
      <React.Suspense fallback={null}>
        {projectModalOpen && (
          <ProjectModal
            open={projectModalOpen}
            onOpenChange={setProjectModalOpen}
            project={selectedProject}
            onSave={handleSaveProject}
          />
        )}

        {importModalOpen && (
          <ExcelImporter
            open={importModalOpen}
            onOpenChange={setImportModalOpen}
            onSuccess={handleImportSuccess}
          />
        )}

        {insightsModalOpen && (
          <ProjectInsightsModal
            open={insightsModalOpen}
            onClose={() => setInsightsModalOpen(false)}
            projectId={projectId}
          />
        )}

        {isAIModalOpen && (
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
        )}

        {isAIWelcomeOpen && (
          <AIWelcomeModal 
            isOpen={isAIWelcomeOpen}
            onClose={() => setIsAIWelcomeOpen(false)}
            projectName={activeProject?.name || 'Seu Projeto'}
          />
        )}
      </React.Suspense>


    </div>
  );
}