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

import StatCard from '../components/dashboard/StatCard.jsx';
import ProgressChart from '../components/dashboard/ProgressChart.jsx';
import MigrationProgressChart from '../components/dashboard/MigrationProgressChart.jsx';
import HomologationProgressChart from '../components/dashboard/HomologationProgressChart.jsx';
import ProjectHealthScore from '../components/dashboard/ProjectHealthScore.jsx';
import ProjectModal from '../components/modals/ProjectModal.jsx';
import ExcelImporter from '../components/import/ExcelImporter.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { Checkbox } from "@/components/ui/checkbox";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Get project_id from URL
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');

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

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: () => projectId ? base44.entities.ProjectDocument.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', projectId],
    queryFn: () => projectId ? base44.entities.Expense.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  // Active project
  const activeProject = projects.find(p => p.id === projectId);

  // Mutations
  const createProjectMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setProjectModalOpen(false);
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
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

  const toggleDocumentMutation = useMutation({
    mutationFn: ({ id, completed }) => base44.entities.ProjectDocument.update(id, { completed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
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
  const projectProgress = timelineEvents.length > 0
    ? Math.round(timelineEvents.reduce((sum, e) => sum + (e.progress || 0), 0) / timelineEvents.length)
    : 0;

  const tasksCompleted = homologationTasks.filter(t => t.completed).length;
  const totalTasks = homologationTasks.length;

  const highRisks = risks.filter(r => r.probability === 'alta' || r.impact === 'alto').length;

  const daysToDeadline = activeProject?.deadline 
    ? differenceInDays(new Date(activeProject.deadline), new Date())
    : null;

  // Milestone status distribution
  const milestoneStatusData = [
    { name: 'Não Iniciado', value: milestones.filter(m => !m.completed).length },
    { name: 'Concluído', value: milestones.filter(m => m.completed).length }
  ].filter(d => d.value > 0);

  // Homologation progress by vertical
  const homologationByVertical = products.reduce((acc, product) => {
    const vertical = product.vertical || 'outros';
    const productTasks = homologationTasks.filter(t => t.product_id === product.id);
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
      </div>

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
                        {activeProject.implementation_value > 0 && (
                          <div className="text-slate-400">
                            <span className="text-slate-500">Implantação:</span> <span className="text-emerald-400">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(activeProject.implementation_value)}
                            </span>
                          </div>
                        )}
                        {activeProject.recurring_value > 0 && (
                          <div className="text-slate-400">
                            <span className="text-slate-500">Recorrente:</span> <span className="text-emerald-400">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(activeProject.recurring_value)}
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
          <ProjectHealthScore
            timeline={timelineEvents}
            budget={activeProject?.budget || 0}
            spent={expenses.reduce((sum, e) => sum + (e.amount || 0), 0)}
            migrationTasks={migrationTasks}
            homologationTasks={homologationTasks}
            risks={risks}
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
        {milestoneStatusData.length > 0 ? (
          <ProgressChart 
            title="Status dos Marcos" 
            data={milestoneStatusData}
            colors={['#64748b', '#22c55e']}
          />
        ) : (
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="py-12">
              <EmptyState
                icon={Calendar}
                title="Nenhum marco cadastrado"
                description="Os marcos serão carregados automaticamente"
              />
            </CardContent>
          </Card>
        )}

        {products.length > 0 && homologationTasks.length > 0 ? (
          <HomologationProgressChart products={products} tasks={homologationTasks} />
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
      {products.length > 0 && (
        <MigrationProgressChart products={products} tasks={migrationTasks} />
      )}

      {/* Marcos e Documentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">Marcos do Projeto</CardTitle>
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

        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">Documentos Chave</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {documents.sort((a, b) => a.order - b.order).map((document) => (
              <div key={document.id} className="flex items-center gap-3">
                <Checkbox 
                  checked={document.completed}
                  onCheckedChange={(checked) => toggleDocumentMutation.mutate({ 
                    id: document.id, 
                    completed: checked 
                  })}
                  className="border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" 
                />
                {document.link ? (
                  <a
                    href={document.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "text-sm hover:underline flex items-center gap-1",
                      document.completed ? "text-slate-500 line-through" : "text-blue-400"
                    )}
                  >
                    {document.title}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className={cn(
                    "text-sm",
                    document.completed ? "text-slate-500 line-through" : "text-white"
                  )}>{document.title}</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
}