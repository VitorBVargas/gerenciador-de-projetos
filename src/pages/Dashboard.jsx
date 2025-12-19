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
  Pencil,
  Upload
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { createPageUrl } from '../utils';

import StatCard from '../components/dashboard/StatCard';
import ProgressChart from '../components/dashboard/ProgressChart';
import MigrationProgressChart from '../components/dashboard/MigrationProgressChart';
import ProjectModal from '../components/modals/ProjectModal';
import ExcelImporter from '../components/import/ExcelImporter';
import EmptyState from '../components/ui/EmptyState';

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
    if (!projectId) {
      window.location.href = createPageUrl('ProjectsList');
    }
  }, [projectId]);

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

  const { data: kanbanTasks = [] } = useQuery({
    queryKey: ['kanbanTasks', projectId],
    queryFn: () => projectId ? base44.entities.KanbanTask.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const { data: risks = [] } = useQuery({
    queryKey: ['risks', projectId],
    queryFn: () => projectId ? base44.entities.Risk.filter({ project_id: projectId }) : [],
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

  // Calculate stats
  const projectProgress = timelineEvents.length > 0
    ? Math.round(timelineEvents.reduce((sum, e) => sum + (e.progress || 0), 0) / timelineEvents.length)
    : 0;

  const tasksCompleted = kanbanTasks.filter(t => t.status === 'done').length;
  const totalTasks = kanbanTasks.length;

  const highRisks = risks.filter(r => r.probability === 'alta' || r.impact === 'alto').length;

  const daysToDeadline = activeProject?.deadline 
    ? differenceInDays(new Date(activeProject.deadline), new Date())
    : null;

  // Product status distribution
  const productStatusData = [
    { name: 'Pendente', value: products.filter(p => p.status === 'pendente').length },
    { name: 'Homologação', value: products.filter(p => p.status === 'em_homologacao').length },
    { name: 'Homologado', value: products.filter(p => p.status === 'homologado').length },
    { name: 'Produção', value: products.filter(p => p.status === 'em_producao').length }
  ].filter(d => d.value > 0);

  // Task status distribution
  const taskStatusData = [
    { name: 'Backlog', value: kanbanTasks.filter(t => t.status === 'backlog').length },
    { name: 'A Fazer', value: kanbanTasks.filter(t => t.status === 'todo').length },
    { name: 'Em Progresso', value: kanbanTasks.filter(t => t.status === 'doing').length },
    { name: 'Revisão', value: kanbanTasks.filter(t => t.status === 'review').length },
    { name: 'Concluído', value: kanbanTasks.filter(t => t.status === 'done').length }
  ].filter(d => d.value > 0);

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
        <div className="flex gap-2">
          <Button 
            onClick={() => setImportModalOpen(true)}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            Importar Excel
          </Button>
          <Button 
            onClick={() => { setSelectedProject(null); setProjectModalOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Projeto
          </Button>
        </div>
      </div>

      {/* Active Project Card */}
      {activeProject ? (
        <Card className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-slate-700/50">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl lg:text-2xl font-bold text-white">{activeProject.name}</h2>
                  <Badge className={cn("border", statusColors[activeProject.status])}>
                    {statusLabels[activeProject.status]}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                  {activeProject.manager && (
                    <span>Gerente: <span className="text-white">{activeProject.manager}</span></span>
                  )}
                  {activeProject.value > 0 && (
                    <span>Valor: <span className="text-emerald-400">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(activeProject.value)}
                    </span></span>
                  )}
                  {activeProject.deadline && (
                    <span>Prazo: <span className={cn(
                      daysToDeadline < 0 ? "text-red-400" : daysToDeadline < 30 ? "text-yellow-400" : "text-white"
                    )}>
                      {format(new Date(activeProject.deadline), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                    </span></span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
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
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  onClick={handleEditProject}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Progresso Geral"
          value={`${projectProgress}%`}
          icon={TrendingUp}
          color="blue"
          trend={projectProgress > 50 ? "up" : undefined}
          trendValue={projectProgress > 50 ? "Bom progresso" : undefined}
        />
        <StatCard
          title="Equipe"
          value={teamMembers.length}
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Produtos"
          value={products.length}
          icon={Package}
          color="cyan"
        />
        <StatCard
          title="Riscos Altos"
          value={highRisks}
          icon={AlertTriangle}
          color={highRisks > 0 ? "red" : "green"}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {productStatusData.length > 0 ? (
          <ProgressChart 
            title="Status dos Produtos" 
            data={productStatusData}
            colors={['#64748b', '#f59e0b', '#22c55e', '#3b82f6']}
          />
        ) : (
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="py-12">
              <EmptyState
                icon={Package}
                title="Nenhum produto cadastrado"
                description="Adicione produtos para visualizar o gráfico"
              />
            </CardContent>
          </Card>
        )}

        {taskStatusData.length > 0 ? (
          <ProgressChart 
            title="Status das Tarefas" 
            data={taskStatusData}
            colors={['#64748b', '#3b82f6', '#f59e0b', '#8b5cf6', '#22c55e']}
          />
        ) : (
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="py-12">
              <EmptyState
                icon={Calendar}
                title="Nenhuma tarefa cadastrada"
                description="Adicione tarefas no Kanban para visualizar o gráfico"
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Migration Progress Chart */}
      {products.length > 0 && (
        <MigrationProgressChart products={products} tasks={migrationTasks} />
      )}

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