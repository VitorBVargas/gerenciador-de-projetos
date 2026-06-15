import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FolderOpen, Trash2, Upload, Calendar, DollarSign, TrendingUp, GripVertical, ArrowLeft, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ExcelImporter from '../components/import/ExcelImporter';
import RecognitionImporter from '../components/import/RecognitionImporter';
import CrmImporter from '../components/import/CrmImporter';
import ProjectSetupWizard from '../components/modals/ProjectSetupWizard';
import ProjectCard from '../components/projects/ProjectCard';
import ClosureReportButton from '../components/closure/ClosureReportButton';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { deleteProjectCronogramas, completeProjectCronogramas } from '../functions/syncProjectCronogramas';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statusColors = {
  planejamento: 'bg-slate-500',
  em_andamento: 'bg-blue-500',
  pausado: 'bg-yellow-500',
  concluido: 'bg-green-500'
};

const statusLabels = {
  planejamento: 'Planejamento',
  em_andamento: 'Em Andamento',
  pausado: 'Pausado',
  concluido: 'Concluído'
};

const portfolioLabels = {
  grandes_contas_sc_mg: 'Grandes Contas SC/MG',
  grandes_contas_sc_sp: 'Grandes Contas SC/SP',
  medias_contas: 'Médias Contas',
};

export default function ProjectsList() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const portfolioFilter = urlParams.get('portfolio') || 'grandes_contas_sc_mg';
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [recognitionImporterOpen, setRecognitionImporterOpen] = useState(false);
  const [crmImportModalOpen, setCrmImportModalOpen] = useState(false);
  const [setupWizardOpen, setSetupWizardOpen] = useState(false);
  const [wizardProject, setWizardProject] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deletingProjectId, setDeletingProjectId] = useState(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', portfolioFilter],
    queryFn: () => base44.entities.Project.filter({ portfolio: portfolioFilter }, 'display_order')
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, display_order }) => {
      await base44.entities.Project.update(id, { display_order });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (projectId) => {
      // Deleta o projeto - as entidades relacionadas serão limpas automaticamente
      await base44.entities.Project.delete(projectId);
      return projectId;
    },
    onMutate: async (projectId) => {
      setDeletingProjectId(projectId);
      await queryClient.cancelQueries({ queryKey: ['projects'] });
    },
    onSuccess: (deletedProjectId) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      queryClient.invalidateQueries({ queryKey: ['stakeholders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['timelineEvents'] });
      queryClient.invalidateQueries({ queryKey: ['kanbanTasks'] });
      queryClient.invalidateQueries({ queryKey: ['risks'] });
      queryClient.invalidateQueries({ queryKey: ['travels'] });
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      queryClient.invalidateQueries({ queryKey: ['migrationTasks'] });
      queryClient.invalidateQueries({ queryKey: ['homologationTasks'] });
    },
    onSettled: () => {
      setDeletingProjectId(null);
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    },
    onError: (error) => {
      console.error('Erro ao deletar projeto:', error);
      alert('Erro ao excluir o projeto. Tente novamente.');
      setDeletingProjectId(null);
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });

  const handleDelete = (project) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (projectToDelete?.id) {
      deleteMutation.mutate(projectToDelete.id);
    }
  };

  const handleImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    setImportModalOpen(false);
  };

  // Check on load if came from CRM import (needs wizard)
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const crmImport = urlParams.get('crmImport');
    const projectId = urlParams.get('project_id');
    if (crmImport === 'true' && projectId) {
      base44.entities.Project.filter({ id: projectId }).then(results => {
        if (results?.[0]) {
          setWizardProject(results[0]);
          setSetupWizardOpen(true);
        }
      });
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Filter projects by status
  const activeProjects = projects.filter(p => p.status !== 'concluido' && p.status !== 'pausado');
  const pausedProjects = projects.filter(p => p.status === 'pausado');
  const completedProjects = projects.filter(p => p.status === 'concluido');

  const handleDragEnd = async (result, projectsList) => {
    if (!result.destination) return;

    const items = Array.from(projectsList);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update display_order for all affected items
    const updates = items.map((project, index) => ({
      id: project.id,
      display_order: index
    }));

    // Update all projects
    await Promise.all(
      updates.map(update => updateOrderMutation.mutateAsync(update))
    );
  };

  const renderProjectCard = (project, index, isDraggable = false) => {
    const cardEl = <ProjectCard project={project} deletingProjectId={deletingProjectId} onDelete={handleDelete} />;

    if (isDraggable) {
      return (
        <Draggable key={project.id} draggableId={project.id} index={index}>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
            >
              {cardEl}
            </div>
          )}
        </Draggable>
      );
    }

    return <div key={project.id}>{cardEl}</div>;
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Top Navigation Bar */}
      <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to={createPageUrl('Home')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xl">B</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Gerenciador</p>
              <p className="text-slate-500 text-xs">de Projetos</p>
            </div>
          </Link>
          <Link to={createPageUrl('PortfolioSelect?mode=projects')}>
            <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Portfólio {portfolioLabels[portfolioFilter]}</h1>
            <p className="text-slate-400 mt-1">{activeProjects.length} projeto(s) ativo(s)</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <a
              href="https://betha-road-map.base44.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white transition-colors text-sm font-medium"
            >
              🗺️ Reportar Bug / Melhoria
            </a>
            <Link to={createPageUrl(`ExecutiveStatus?portfolio=${portfolioFilter}`)}>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <TrendingUp className="w-4 h-4 mr-2" />
                Status Executivo
              </Button>
            </Link>
            <Button
              onClick={() => setCrmImportModalOpen(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Cadastrar Novo Projeto
            </Button>
            <Button
              onClick={() => setRecognitionImporterOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <BarChart2 className="w-4 h-4 mr-2" />
              Reconhecimento
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="active" className="data-[state=active]:bg-slate-700">
              Ativos ({activeProjects.length})
            </TabsTrigger>
            <TabsTrigger value="paused" className="data-[state=active]:bg-slate-700">
              Pausados ({pausedProjects.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-slate-700">
              Concluídos ({completedProjects.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {activeProjects.length > 0 ? (
              <DragDropContext onDragEnd={(result) => handleDragEnd(result, activeProjects)}>
                <Droppable droppableId="active-projects">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                      {activeProjects.map((project, index) => renderProjectCard(project, index, true))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            ) : (
               <Card className="bg-slate-800/50 border-slate-700">
                 <CardContent className="py-16 text-center">
                   <Upload className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                   <h3 className="text-xl font-semibold text-white mb-2">Nenhum projeto ativo</h3>
                   <p className="text-slate-400 mb-6">Importe um projeto do Excel para começar</p>
                   <Button onClick={() => setCrmImportModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                     <Upload className="w-4 h-4 mr-2" />
                     Importar Primeiro Projeto
                   </Button>
                 </CardContent>
               </Card>
             )}
          </TabsContent>

          <TabsContent value="paused" className="mt-6">
            {pausedProjects.length > 0 ? (
              <DragDropContext onDragEnd={(result) => handleDragEnd(result, pausedProjects)}>
                <Droppable droppableId="paused-projects">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                      {pausedProjects.map((project, index) => renderProjectCard(project, index, true))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            ) : (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="py-16 text-center">
                  <h3 className="text-xl font-semibold text-white mb-2">Nenhum projeto pausado</h3>
                  <p className="text-slate-400">Os projetos pausados aparecerão aqui</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            {completedProjects.length > 0 ? (
              <DragDropContext onDragEnd={(result) => handleDragEnd(result, completedProjects)}>
                <Droppable droppableId="completed-projects">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                      {completedProjects.map((project, index) => (
                        <Draggable key={project.id} draggableId={project.id} index={index}>
                          {(dragProvided) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                            >
              <Card 
                className={`bg-slate-800/50 border-slate-700 hover:bg-slate-800 transition-all group ${
                  deletingProjectId === project.id ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <CardHeader>
                  <div className="flex items-start gap-2">
                    <div className="pt-1 cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="flex-1 flex items-start justify-between">
                      <CardTitle className="text-white text-lg mb-2">
                        {deletingProjectId === project.id ? 'Excluindo...' : project.name}
                      </CardTitle>
                      {deletingProjectId !== project.id && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(project);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {project.manager && (
                    <div className="text-sm text-slate-400">
                      <span className="text-slate-500">Gerente:</span> {project.manager}
                    </div>
                  )}
                  
                  {project.deadline && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Calendar className="w-4 h-4" />
                      <span>Prazo: {format(new Date(project.deadline), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    </div>
                  )}

                  {project.implementation_value > 0 && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <DollarSign className="w-4 h-4" />
                      <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(project.implementation_value)}</span>
                    </div>
                  )}

                  <Link to={createPageUrl(`Dashboard?project_id=${project.id}`)}>
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700 mt-4"
                      disabled={deletingProjectId === project.id}
                    >
                      <FolderOpen className="w-4 h-4 mr-2" />
                      Abrir Projeto
                    </Button>
                  </Link>
                  <ClosureReportButton project={project} />
                </CardContent>
              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            ) : (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="py-16 text-center">
                  <h3 className="text-xl font-semibold text-white mb-2">Nenhum projeto concluído</h3>
                  <p className="text-slate-400">Os projetos concluídos aparecerão aqui</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* CRM Import */}
      <CrmImporter
        open={crmImportModalOpen}
        onOpenChange={setCrmImportModalOpen}
        onSuccess={handleImportSuccess}
        portfolioFilter={portfolioFilter}
      />

      {/* Setup Wizard (after CRM import) */}
      <ProjectSetupWizard
        open={setupWizardOpen}
        onOpenChange={setSetupWizardOpen}
        project={wizardProject}
        onComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['projects'] });
          if (wizardProject) {
            window.location.href = `/dashboard?project_id=${wizardProject.id}`;
          }
        }}
      />

      {/* Import Modal (legado) */}
      <ExcelImporter
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onSuccess={handleImportSuccess}
      />

      {/* Recognition Importer */}
      <RecognitionImporter
        open={recognitionImporterOpen}
        onOpenChange={setRecognitionImporterOpen}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja excluir o projeto "{projectToDelete?.name}"? Todos os dados relacionados (equipe, produtos, cronograma, etc.) serão permanentemente removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              disabled={deleteMutation.isPending}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir Projeto'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}