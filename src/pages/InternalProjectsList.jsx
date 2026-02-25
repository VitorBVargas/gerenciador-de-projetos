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
import InternalProjectModal from '@/components/internal/InternalProjectModal';

export default function InternalProjectsList() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deletingProjectId, setDeletingProjectId] = useState(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['internalProjects'],
    queryFn: () => base44.entities.InternalProject.list('display_order')
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, display_order }) => base44.entities.InternalProject.update(id, { display_order }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['internalProjects'] })
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.InternalProject.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internalProjects'] });
      setModalOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.InternalProject.delete(id),
    onMutate: (id) => setDeletingProjectId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internalProjects'] });
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
    await Promise.all(items.map((p, i) => updateOrderMutation.mutateAsync({ id: p.id, display_order: i })));
  };

  const activeProjects = projects.filter(p => p.status !== 'concluido');
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
              <CardTitle className="text-white text-lg mb-2">
                {deletingProjectId === project.id ? 'Excluindo...' : project.name}
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
          <Link to={createPageUrl(`InternalDashboard?project_id=${project.id}`)}>
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
            <p className="text-slate-400 mt-1">{activeProjects.length} projeto(s) ativo(s)</p>
          </div>
          <Button onClick={() => setModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
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
                  <Button onClick={() => setModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeiro Projeto
                  </Button>
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

      {/* Modal Criar Projeto */}
      <InternalProjectModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={(data) => createMutation.mutate(data)}
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
              onClick={() => deleteMutation.mutate(projectToDelete?.id)}
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