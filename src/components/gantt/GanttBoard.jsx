import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import TaskBar from './TaskBar';
import TimelineHeader from './TimelineHeader';
import TimelineScaler from './TimelineScaler';
import { TaskService } from './TaskService';
import { useTaskRecalculation } from './useTaskRecalculation';
import { format, startOfMonth } from 'date-fns';

export default function GanttBoard({ projectId, projectDeadline }) {
  const queryClient = useQueryClient();
  const [zoom, setZoom] = useState('month');
  const [editingTask, setEditingTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState(null);
  const [startDate, setStartDate] = useState(new Date());

  const zoomPixels = {
    day: 60,
    week: 30,
    month: 8,
    quarter: 2
  };
  const pixelsPerDay = zoomPixels[zoom];

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => TaskService.getTasks(projectId),
    enabled: !!projectId
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => TaskService.createTask(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      setIsModalOpen(false);
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }) => TaskService.updateTask(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId) => TaskService.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    }
  });

  const { handleDurationChange, handleOrderChange, handleDateChange } = useTaskRecalculation(
    projectId,
    () => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
  );

  const handleCreateTask = async (data) => {
    if (!data.title || !data.start_date || !data.end_date) return;
    await createTaskMutation.mutateAsync(data);
    setEditingTask(null);
  };

  const handleUpdateTask = async (data) => {
    if (!editingTask) return;
    await updateTaskMutation.mutateAsync({ taskId: editingTask.id, data });
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const sortedTasks = [...tasks].sort((a, b) => a.order_index - b.order_index);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg border border-slate-700">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between gap-4">
        <h3 className="text-white font-semibold">Cronograma Gantt</h3>
        <TimelineScaler zoom={zoom} onZoomChange={setZoom} />
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => {
            setEditingTask(null);
            setIsModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Etapa
        </Button>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Task List */}
        <div className="w-64 border-r border-slate-700 overflow-y-auto bg-slate-850 scrollbar-thin scrollbar-thumb-slate-700">
          <div className="space-y-2 p-3">
            {isLoading ? (
              <p className="text-slate-400 text-sm">Carregando...</p>
            ) : sortedTasks.length === 0 ? (
              <p className="text-slate-400 text-sm py-8 text-center">Nenhuma tarefa</p>
            ) : (
              sortedTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-slate-700/30 p-2 rounded border border-slate-600 cursor-pointer hover:bg-slate-700/50 transition text-xs"
                  onClick={() => {
                    setEditingTask(task);
                    setIsModalOpen(true);
                  }}
                >
                  <p className="text-white font-medium truncate">{task.title}</p>
                  <p className="text-slate-400 text-xs">{format(new Date(task.start_date), 'dd/MM/yy')} - {format(new Date(task.end_date), 'dd/MM/yy')}</p>
                  {TaskService.isTaskDelayed(task) && (
                    <div className="flex items-center gap-1 mt-1 text-red-400">
                      <AlertCircle className="w-3 h-3" />
                      <span>Atrasada</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Timeline */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <TimelineHeader
            startDate={startDate}
            endDate={endDate}
            viewType={viewType}
            onViewChange={setViewType}
            pixelsPerDay={pixelsPerDay}
          />

          {/* Timeline Content */}
          <div className="flex-1 overflow-x-auto overflow-y-auto relative scrollbar-thin scrollbar-thumb-slate-700">
            <div className="relative min-h-full p-4" style={{ minWidth: `${(endDate - startDate) / (1000 * 60 * 60 * 24) * pixelsPerDay}px` }}>
              {sortedTasks.map((task) => (
                <div key={task.id} className="relative h-12 mb-4">
                  <TaskBar
                    task={task}
                    projectStartDate={startDate}
                    pixelsPerDay={pixelsPerDay}
                    onEdit={(t) => {
                      setEditingTask(t);
                      setIsModalOpen(true);
                    }}
                    onDelete={(id) => setDeleteTaskId(id)}
                    onDurationChange={handleDurationChange}
                    onDateChange={handleDateChange}
                  />
                </div>
              ))}

              {/* Today Indicator */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none"
                style={{
                  left: `${((new Date() - startDate) / (1000 * 60 * 60 * 24)) * pixelsPerDay}px`
                }}
              >
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-red-400 whitespace-nowrap">
                  Hoje
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">{editingTask ? 'Editar Etapa' : 'Nova Etapa'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="text-slate-300">Título</Label>
              <Input
                id="title"
                defaultValue={editingTask?.title || ''}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Data Início</Label>
              <Input
                id="start_date"
                type="date"
                defaultValue={editingTask?.start_date || ''}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Data Fim</Label>
              <Input
                id="end_date"
                type="date"
                defaultValue={editingTask?.end_date || ''}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Duração (dias)</Label>
              <Input
                id="duration_days"
                type="number"
                min="1"
                defaultValue={editingTask?.duration_days || 1}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Status</Label>
              <select
                id="status"
                defaultValue={editingTask?.status || 'planned'}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
              >
                <option value="planned">Planejado</option>
                <option value="in_progress">Em Progresso</option>
                <option value="done">Concluído</option>
                <option value="delayed">Atrasado</option>
              </select>
            </div>
            <div>
              <Label className="text-slate-300">Progresso (%)</Label>
              <Input
                id="progress"
                type="number"
                min="0"
                max="100"
                defaultValue={editingTask?.progress || 0}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                const data = {
                  title: document.getElementById('title').value,
                  start_date: document.getElementById('start_date').value,
                  end_date: document.getElementById('end_date').value,
                  duration_days: parseInt(document.getElementById('duration_days').value),
                  status: document.getElementById('status').value,
                  progress: parseInt(document.getElementById('progress').value)
                };
                if (editingTask) {
                  handleUpdateTask(data);
                } else {
                  handleCreateTask(data);
                }
              }}
            >
              {editingTask ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={() => setDeleteTaskId(null)}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Deseja excluir esta etapa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                deleteTaskMutation.mutate(deleteTaskId);
                setDeleteTaskId(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}