import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Plus, Calendar } from 'lucide-react';
import TimelineEventModal from '../components/modals/TimelineEventModal';
import GanttTimeline from '../components/timeline/GanttTimeline';
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

export default function Timeline() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
  });

  const { data: timelineEvents = [] } = useQuery({
    queryKey: ['timelineEvents'],
    queryFn: () => base44.entities.TimelineEvent.list()
  });

  const activeProject = projects[0];

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TimelineEvent.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timelineEvents'] });
      setModalOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TimelineEvent.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timelineEvents'] });
      setModalOpen(false);
      setSelectedEvent(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TimelineEvent.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timelineEvents'] });
      setDeleteDialogOpen(false);
      setEventToDelete(null);
    }
  });

  const handleSave = (data) => {
    if (selectedEvent) {
      updateMutation.mutate({ id: selectedEvent.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (event) => {
    setSelectedEvent(event);
    setModalOpen(true);
  };

  const handleDelete = (eventId) => {
    const event = timelineEvents.find(e => e.id === eventId);
    setEventToDelete(event);
    setDeleteDialogOpen(true);
  };

  // Sort events by phase order
  const phaseOrder = [
    'planejamento', 'kickoff', 'diagnostico', 'migracao_hml', 'configuracao_hml',
    'homologacao_hml', 'migracao_producao', 'treinamento', 'configuracao_producao',
    'estabilizacao', 'operacao_assistida'
  ];

  const sortedEvents = [...timelineEvents].sort((a, b) => {
    const aIndex = phaseOrder.indexOf(a.phase);
    const bIndex = phaseOrder.indexOf(b.phase);
    if (aIndex !== bIndex) return aIndex - bIndex;
    if (a.start_date && b.start_date) return a.start_date.localeCompare(b.start_date);
    return 0;
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Cronograma</h1>
          <p className="text-slate-400 mt-1">Visualize e gerencie as etapas do projeto</p>
        </div>
        <Button 
          onClick={() => { setSelectedEvent(null); setModalOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Etapa
        </Button>
      </div>

      {/* Timeline */}
      {timelineEvents.length > 0 ? (
        <GanttTimeline
          events={sortedEvents}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ) : (
        <EmptyState
          icon={Calendar}
          title="Nenhuma etapa cadastrada"
          description="Adicione as etapas do cronograma do projeto"
          action={
            <Button onClick={() => setModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Etapa
            </Button>
          }
        />
      )}

      {/* Modal */}
      <TimelineEventModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        event={selectedEvent}
        onSave={handleSave}
        projectId={activeProject?.id}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja excluir a etapa "{eventToDelete?.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(eventToDelete?.id)}
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