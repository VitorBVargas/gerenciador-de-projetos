import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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

export default function Timeline() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState('');

  // Get project_id from URL
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
  });

  const { data: timelineEvents = [] } = useQuery({
    queryKey: ['timelineEvents', projectId],
    queryFn: () => projectId ? base44.entities.TimelineEvent.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const activeProject = projects.find(p => p.id === projectId);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TimelineEvent.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timelineEvents', projectId] });
      setModalOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TimelineEvent.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timelineEvents', projectId] });
      setModalOpen(false);
      setSelectedEvent(null);
    }
  });

  const handleStatusChange = (eventId, newStatus) => {
    const event = timelineEvents.find(e => e.id === eventId);
    if (event) {
      updateMutation.mutate({ 
        id: eventId, 
        data: { ...event, status: newStatus } 
      });
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TimelineEvent.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timelineEvents', projectId] });
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

  // Group events by vertical
  const eventsByVertical = {};
  const usedVerticals = [...new Set(timelineEvents.map(e => e.vertical).filter(Boolean))].sort();
  
  usedVerticals.forEach(vertical => {
    eventsByVertical[vertical] = timelineEvents.filter(e => e.vertical === vertical);
  });

  // Set initial tab to first vertical if not set
  React.useEffect(() => {
    if (usedVerticals.length > 0 && !activeTab) {
      setActiveTab(usedVerticals[0]);
    }
  }, [usedVerticals.length]);

  const sortEvents = (events) => {
    return [...events].sort((a, b) => {
      // Sort by order field (from Excel import), then by created_date
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      // Fallback to created_date for manually added events
      if (a.created_date && b.created_date) {
        return a.created_date.localeCompare(b.created_date);
      }
      return 0;
    });
  };

  // Calcula o progresso de uma vertical (média do progresso de todas as etapas)
  const getVerticalProgress = (vertical) => {
    const events = eventsByVertical[vertical] || [];
    if (events.length === 0) return 0;
    const totalProgress = events.reduce((sum, event) => {
      // Usar 100% se status for concluído, caso contrário usar o valor de progress
      if (event.status === 'concluido') return sum + 100;
      return sum + (event.progress || 0);
    }, 0);
    return Math.round(totalProgress / events.length);
  };

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
        usedVerticals.length > 0 ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-slate-800 border border-slate-700">
              {usedVerticals.map(vertical => (
                <TabsTrigger key={vertical} value={vertical} className="data-[state=active]:bg-blue-600">
                  {verticalLabels[vertical] || vertical}
                </TabsTrigger>
              ))}
            </TabsList>

            {usedVerticals.map(vertical => {
              const verticalProgress = getVerticalProgress(vertical);
              return (
                <TabsContent key={vertical} value={vertical} className="space-y-4">
                  {/* Barra de Progresso da Vertical */}
                  <div className="flex items-center gap-4 bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <div className="text-sm text-slate-400 min-w-[140px]">
                      Progresso {verticalLabels[vertical] || vertical}
                    </div>
                    <div className="flex-1">
                      <Progress value={verticalProgress} className="h-3" />
                    </div>
                    <div className="text-lg font-bold text-white min-w-[50px] text-right">
                      {verticalProgress}%
                    </div>
                  </div>

                  <GanttTimeline
                    events={sortEvents(eventsByVertical[vertical])}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                  />
                </TabsContent>
              );
            })}
          </Tabs>
        ) : (
          <GanttTimeline
            events={sortEvents(timelineEvents)}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
        )
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