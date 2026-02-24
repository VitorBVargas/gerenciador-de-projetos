import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Calendar, Edit3 } from 'lucide-react';
import TimelineEventModal from '../components/modals/TimelineEventModal';
import BulkEditDatesModal from '../components/modals/BulkEditDatesModal';
import EmptyState from '../components/ui/EmptyState';
import EntityFilter from '../components/filters/EntityFilter';

import { phaseLabels } from '../components/timeline/phaseLabels';
import TimelineByVertical from '../components/timeline/TimelineByVertical';
import TimelineByProduct from '../components/timeline/TimelineByProduct';
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

const statusLabels = {
  nao_iniciado: 'Não Iniciado',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  atrasado: 'Atrasado'
};

const statusColors = {
  nao_iniciado: 'bg-slate-600',
  em_andamento: 'bg-blue-600',
  concluido: 'bg-green-600',
  atrasado: 'bg-red-600'
};

export default function Timeline() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [activeVertical, setActiveVertical] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('PM');
  const [editDatesOpen, setEditDatesOpen] = useState(false);

  // Get project_id from URL
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
  });

  const activeProject = projects.find(p => p.id === projectId);
  const schedulingType = activeProject?.scheduling_type || 'por_produto';

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

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TimelineEvent.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timelineEvents', projectId] });
      setDeleteDialogOpen(false);
      setEventToDelete(null);
    }
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: (events) => Promise.all(
      events.map(event => base44.entities.TimelineEvent.update(event.id, event))
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timelineEvents', projectId] });
      setEditDatesOpen(false);
    }
  });

  const handleSave = (data) => {
    if (selectedEvent) {
      updateMutation.mutate({ id: selectedEvent.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (event, productId) => {
    setSelectedEvent(event);
    setSelectedProductId(productId);
    setModalOpen(true);
  };

  const handleDelete = (eventId) => {
    const event = timelineEvents.find(e => e.id === eventId);
    setEventToDelete(event);
    setDeleteDialogOpen(true);
  };

  const handleStatusChange = (eventId, newStatus) => {
    const event = timelineEvents.find(e => e.id === eventId);
    if (event) {
      updateMutation.mutate({ 
        id: eventId, 
        data: { ...event, status: newStatus } 
      });
    }
  };

  // Entity filter
  const allEntities = [...new Set(products.map(p => p.entity).filter(Boolean))].sort();
  const entityProducts = selectedEntity
    ? products.filter(p => p.entity === selectedEntity)
    : [];
  
  // Get unique verticals from selected entity
  const verticals = [...new Set(entityProducts.map(p => p.vertical).filter(Boolean))].sort();

  // Set initial vertical
  React.useEffect(() => {
    if (verticals.length > 0 && !activeVertical) {
      setActiveVertical(verticals[0]);
    }
  }, [verticals.length]);

  // Get products for active vertical
  const productsInVertical = activeVertical 
    ? entityProducts.filter(p => p.vertical === activeVertical)
    : [];

  // Set initial product
  React.useEffect(() => {
    if (productsInVertical.length > 0 && !selectedProductId) {
      setSelectedProductId(productsInVertical[0].id);
    }
  }, [productsInVertical.length, activeVertical]);

  // Current product
  const currentProduct = productsInVertical.find(p => p.id === selectedProductId) || null;

  // Calculate vertical progress (average of all products' average progress)
  const getVerticalProgress = () => {
    if (productsInVertical.length === 0) return 0;
    
    const productProgresses = productsInVertical.map(product => {
      const productEvents = timelineEvents.filter(e => e.product_id === product.id);
      if (productEvents.length === 0) return 0;
      
      const totalProgress = productEvents.reduce((sum, event) => {
        if (event.status === 'concluido') return sum + 100;
        return sum + (event.progress || 0);
      }, 0);
      return Math.round(totalProgress / productEvents.length);
    });

    return Math.round(productProgresses.reduce((a, b) => a + b, 0) / productProgresses.length);
  };

  const getUniqueEntities = () => {
    return [...new Set(products.map(p => p.entity))].sort((a, b) => {
      if (a === 'PM') return -1;
      if (b === 'PM') return 1;
      return a.localeCompare(b);
    });
  };

  const handleEditDatesApply = async (updatedEvents) => {
    await bulkUpdateMutation.mutateAsync(updatedEvents);
  };



  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Cronograma</h1>
          <p className="text-slate-400 mt-1">Visualize e gerencie as etapas por produto</p>
        </div>
      </div>

      {/* Entity Filter */}
      {allEntities.length > 0 && (
        <EntityFilter entities={allEntities} selectedEntity={selectedEntity} onEntityChange={setSelectedEntity} />
      )}

      {/* Main Tabs - Cronograma do Projeto */}
      <Tabs defaultValue="timeline" className="space-y-4">
       <div className="flex items-center justify-between">
         <TabsList className="bg-slate-800 border border-slate-700">
           <TabsTrigger value="timeline" className="data-[state=active]:bg-blue-600">
             Cronograma do Projeto
           </TabsTrigger>
         </TabsList>
         <Button
           size="sm"
           onClick={() => setEditDatesOpen(true)}
           className="bg-blue-600 hover:bg-blue-700 gap-2"
         >
           <Edit3 className="w-4 h-4" />
           Editar datas
         </Button>
       </div>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          {timelineEvents.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Nenhuma etapa cadastrada"
              description="Adicione os produtos e as etapas serão criadas automaticamente"
              action={
                <Button onClick={() => window.location.href = 'Dashboard?project_id=' + projectId} className="bg-blue-600 hover:bg-blue-700">
                  Ir para Produtos
                </Button>
              }
            />
          ) : schedulingType === 'por_vertical' ? (
            <TimelineByVertical
              verticals={verticals}
              entityProducts={entityProducts}
              timelineEvents={timelineEvents}
              onStatusChange={handleStatusChange}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ) : (
            <TimelineByProduct
              verticals={verticals}
              entityProducts={entityProducts}
              timelineEvents={timelineEvents}
              onStatusChange={handleStatusChange}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </TabsContent>


      </Tabs>

      {/* Modal */}
      <TimelineEventModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        event={selectedEvent}
        onSave={handleSave}
        projectId={projectId}
        productId={selectedProductId}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja excluir a etapa "{eventToDelete?.title}"?
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

      {/* Edit Dates Modal */}
      <BulkEditDatesModal
        open={editDatesOpen}
        onOpenChange={setEditDatesOpen}
        entities={getUniqueEntities()}
        verticals={verticals}
        timelineEvents={timelineEvents}
        products={products}
        onApply={handleEditDatesApply}
      />
    </div>
  );
}