import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FolderOpen, Trash2, Calendar, GripVertical, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
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
import InternalProjectWizard from '@/components/internal/InternalProjectWizard';
import InternalTypeSelector from '@/components/internal/InternalTypeSelector';

const PRIORITY_LABEL = { baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica' };
const PRIORITY_STYLE = {
  baixa: 'bg-slate-600/40 text-slate-300',
  media: 'bg-blue-500/20 text-blue-300',
  alta: 'bg-amber-500/20 text-amber-300',
  critica: 'bg-red-500/20 text-red-300',
};

export default function InternalProjectsList() {
  const queryClient = useQueryClient();
  const [typeSelectorOpen, setTypeSelectorOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('implantacao');

  const handleSelectType = (type) => {
    setSelectedType(type);
    setTypeSelectorOpen(false);
    setModalOpen(true);
  };
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deletingProjectId, setDeletingProjectId] = useState(null);

  const { data: internalOnly = [], isLoading } = useQuery({
    queryKey: ['internalProjects'],
    queryFn: () => base44.entities.InternalProject.list('display_order')
  });

  // Projetos Ágeis internos vivem na entidade Project (is_internal) para usar as telas Ágeis completas
  const { data: agilInternal = [] } = useQuery({
    queryKey: ['internalAgilProjects'],
    queryFn: () => base44.entities.Project.filter({ is_internal: true }, 'display_order')
  });

  // Unifica as duas fontes marcando quais são ágeis (abrem no AgilDashboard)
  const projects = [
    ...internalOnly.map(p => ({ ...p, _isAgil: false })),
    ...agilInternal.map(p => ({ ...p, _isAgil: true })),
  ];

  const updateOrderMutation = useMutation({
    mutationFn: ({ project, display_order }) => project._isAgil
      ? base44.entities.Project.update(project.id, { display_order })
      : base44.entities.InternalProject.update(project.id, { display_order }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internalProjects'] });
      queryClient.invalidateQueries({ queryKey: ['internalAgilProjects'] });
    }
  });

  // createMutation not needed - wizard handles creation internally

  const deleteMutation = useMutation({
    mutationFn: (project) => project._isAgil
      ? base44.entities.Project.delete(project.id)
      : base44.entities.InternalProject.delete(project.id),
    onMutate: (project) => setDeletingProjectId(project.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internalProjects'] });
      queryClient.invalidateQueries({ queryKey: ['internalAgilProjects'] });
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
      setDeletingProjectId(null);
    },
    onError: () => {
      setDeletingProjectId(null);
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  });

  const handleDelete = (project) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const handleDragEnd = async (result, list) => {
    if (!result.destination) return;
    const items = Array.from(list);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    await Promise.all(items.map((p, i) => updateOrderMutation.mutateAsync({ project: p, display_order: i })));
  };

  const notCompleted = projects.filter(p => p.status !== 'concluido');
  const activeProjects = notCompleted.filter(p => !p._isAgil && p.project_type !== 'sustentacao');
  const sustentacaoProjects = notCompleted.filter(p => !p._isAgil && p.project_type === 'sustentacao');
  const agilProjects = notCompleted.filter(p => p._isAgil);
  const completedProjects = projects.filter(p => p.status === 'concluido');

  const renderCard = (project, index, draggable = false) => {
    const card = (
      <Card className={`bg-slate-800/50 border-slate-700 hover:bg-slate-800 transition-all group ${deletingProjectId === project.id ? 'opacity-50 pointer-events-none' : ''}`}>
        <CardHeader>
          <div className="flex items-start gap-2">
            {draggable && (
              <div className="pt-1 cursor-grab active:cursor-grabbing">
                <GripVertical className="w-5 h-5 text-slate-500" />
              </div>
            )}
            <div className="flex-1 flex items-start justify-between">
              <CardTitle className="text-white text-lg mb-2 flex items-center gap-2">
                {deletingProjectId === project.id ? 'Excluindo...' : project.name}
                {project._isAgil && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Ágil</span>
                )}
              </CardTitle>
              {deletingProjectId !== project.id && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(project); }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {project._isAgil ? (
            <>
              {(project.agil_responsavel || project.manager) && (
                <div className="text-sm text-slate-400">
                  <span className="text-slate-500">Responsável:</span> {project.agil_responsavel || project.manager}
                </div>
              )}
              {project.agil_descricao && (
                <div className="text-sm text-slate-400 line-clamp-2">{project.agil_descricao}</div>
              )}
              {(project.agil_product_owner || project.agil_scrum_master) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                  {project.agil_product_owner && <span><span className="text-slate-500">PO:</span> {project.agil_product_owner}</span>}
                  {project.agil_scrum_master && <span><span className="text-slate-500">SM:</span> {project.agil_scrum_master}</span>}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {project.agil_area && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">{project.agil_area}</span>
                )}
                {project.priority && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_STYLE[project.priority] || 'bg-slate-700 text-slate-300'}`}>
                    {PRIORITY_LABEL[project.priority] || project.priority}
                  </span>
                )}
              </div>
              {project.agil_start_date && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Calendar className="w-4 h-4" />
                  <span>Início: {format(new Date(project.agil_start_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                </div>
              )}
            </>
          ) : (
            <>
              {project.manager && (
                <div className="text-sm text-slate-400">
                  <span className="text-slate-500">Responsável:</span> {project.manager}
                </div>
              )}
              {project.description && (
                <div className="text-sm text-slate-400 line-clamp-2">{project.description}</div>
              )}
              {project.deadline && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Calendar className="w-4 h-4" />
                  <span>Prazo: {format(new Date(project.deadline), 'dd/MM/yyyy', { locale: ptBR })}</span>
                </div>
              )}
            </>
          )}
          <Link to={createPageUrl(`${project._isAgil ? 'AgilDashboard' : 'InternalDashboard'}?project_id=${project.id}`)}>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 mt-4" disabled={deletingProjectId === project.id}>
              <FolderOpen className="w-4 h-4 mr-2" />
              Abrir Projeto
            </Button>
          </Link>
        </CardContent>
      </Card>
    );

    if (draggable) {
      return (
        <Draggable key={project.id} draggableId={project.id} index={index}>
          {(provided) => (
            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
              {card}
            </div>
          )}
        </Draggable>
      );
    }
    return <div key={project.id}>{card}</div>;
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Top Bar */}
      <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to={createPageUrl('Home')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xl">B</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Gerenciador</p>
              <p className="text-slate-500 text-xs">Projetos Internos</p>
            </div>
          </Link>
          <Link to={createPageUrl('Home')}>
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
            <h1 className="text-3xl font-bold text-white">Projetos Internos</h1>
            <p className="text-slate-400 mt-1">{notCompleted.length} projeto(s) ativo(s)</p>
          </div>
          <Button onClick={() => setTypeSelectorOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Projeto Interno
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="active" className="data-[state=active]:bg-slate-700">
              Ativos ({activeProjects.length})
            </TabsTrigger>
            <TabsTrigger value="sustentacao" className="data-[state=active]:bg-slate-700">
              Sustentação ({sustentacaoProjects.length})
            </TabsTrigger>
            <TabsTrigger value="agil" className="data-[state=active]:bg-slate-700">
              Ágil ({agilProjects.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-slate-700">
              Concluídos ({completedProjects.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {activeProjects.length > 0 ? (
              <DragDropContext onDragEnd={(r) => handleDragEnd(r, activeProjects)}>
                <Droppable droppableId="active-internal">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {activeProjects.map((p, i) => renderCard(p, i, true))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            ) : (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="py-16 text-center">
                  <FolderOpen className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                  <h3 className="text-xl font-semibold text-white mb-2">Nenhum projeto interno</h3>
                  <p className="text-slate-400 mb-6">Crie o primeiro projeto interno da Betha</p>
                  <Button onClick={() => setTypeSelectorOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeiro Projeto
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="sustentacao" className="mt-6">
            {sustentacaoProjects.length > 0 ? (
              <DragDropContext onDragEnd={(r) => handleDragEnd(r, sustentacaoProjects)}>
                <Droppable droppableId="sustentacao-internal">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {sustentacaoProjects.map((p, i) => renderCard(p, i, true))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            ) : (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="py-16 text-center">
                  <h3 className="text-xl font-semibold text-white mb-2">Nenhum projeto de sustentação</h3>
                  <p className="text-slate-400">Os projetos internos de sustentação aparecerão aqui</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="agil" className="mt-6">
            {agilProjects.length > 0 ? (
              <DragDropContext onDragEnd={(r) => handleDragEnd(r, agilProjects)}>
                <Droppable droppableId="agil-internal">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {agilProjects.map((p, i) => renderCard(p, i, true))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            ) : (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="py-16 text-center">
                  <h3 className="text-xl font-semibold text-white mb-2">Nenhum projeto ágil</h3>
                  <p className="text-slate-400">Os projetos internos ágeis (Scrum/Kanban) aparecerão aqui</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            {completedProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedProjects.map((p, i) => renderCard(p, i, false))}
              </div>
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

      {/* Seletor de Tipo */}
      <InternalTypeSelector
        open={typeSelectorOpen}
        onOpenChange={setTypeSelectorOpen}
        onSelect={handleSelectType}
      />

      {/* Wizard Criar Projeto */}
      <InternalProjectWizard
        open={modalOpen}
        onOpenChange={setModalOpen}
        projectType={selectedType}
        onComplete={() => queryClient.invalidateQueries({ queryKey: ['internalProjects'] })}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja excluir o projeto "{projectToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700" disabled={deleteMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => projectToDelete && deleteMutation.mutate(projectToDelete)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}