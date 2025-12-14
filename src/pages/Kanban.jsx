import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Plus, Kanban as KanbanIcon } from 'lucide-react';
import KanbanBoard from '../components/kanban/KanbanBoard';
import KanbanTaskModal from '../components/modals/KanbanTaskModal';
import EmptyState from '../components/ui/EmptyState';
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

export default function Kanban() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [initialStatus, setInitialStatus] = useState('backlog');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['kanbanTasks'],
    queryFn: () => base44.entities.KanbanTask.list()
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list()
  });

  const activeProject = projects[0];

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.KanbanTask.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanbanTasks'] });
      setModalOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.KanbanTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanbanTasks'] });
      setModalOpen(false);
      setSelectedTask(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.KanbanTask.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanbanTasks'] });
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    }
  });

  const handleSave = (data) => {
    if (selectedTask) {
      updateMutation.mutate({ id: selectedTask.id, data });
    } else {
      createMutation.mutate({ ...data, status: initialStatus });
    }
  };

  const handleAddTask = (status) => {
    setSelectedTask(null);
    setInitialStatus(status);
    setModalOpen(true);
  };

  const handleEditTask = (task) => {
    setSelectedTask(task);
    setModalOpen(true);
  };

  const handleDeleteTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    // If dropped in same position, do nothing
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    // Update task status
    const task = tasks.find(t => t.id === draggableId);
    if (task) {
      updateMutation.mutate({
        id: draggableId,
        data: { 
          ...task, 
          status: destination.droppableId,
          order: destination.index
        }
      });
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Kanban</h1>
          <p className="text-slate-400 mt-1">Gerencie as tarefas do projeto</p>
        </div>
        <Button 
          onClick={() => { setSelectedTask(null); setInitialStatus('backlog'); setModalOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Tarefa
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto -mx-6 px-6">
        <KanbanBoard
          tasks={tasks}
          onDragEnd={handleDragEnd}
          onAddTask={handleAddTask}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
        />
      </div>

      {/* Modal */}
      <KanbanTaskModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        task={selectedTask}
        onSave={handleSave}
        projectId={activeProject?.id}
        teamMembers={teamMembers}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja excluir a tarefa "{taskToDelete?.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(taskToDelete?.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}