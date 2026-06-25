import React, { useState, useMemo } from 'react';
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
import BaselineButton from '../components/baseline/BaselineButton';
import { useCurrentUser, canEditStructure } from '@/lib/permissions';

import { phaseLabels } from '../components/timeline/phaseLabels';
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

export default function Timeline() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useCurrentUser();
  const canEdit = canEditStructure(currentUser);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [activeVertical, setActiveVertical] = useState('');
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [editDatesOpen, setEditDatesOpen] = useState(false);

  // Get project_id from URL
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');

  // 🚀 OTIMIZAÇÃO 1: Buscando APENAS o projeto necessário, em vez de baixar todos do banco
  const { data: projectData = [] } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectId ? base44.entities.Project.filter({ id: projectId }) : [],
    enabled: !!projectId
  });
  const activeProject = projectData[0]; // Como filtramos por ID, será o primeiro

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

  // 🚀 MELHORIA 1: Redução do paralelismo para evitar falhas silenciosas e rate limits.
  const bulkUpdateMutation = useMutation({
    mutationFn: async (events) => {
      const chunkSize = 4; // Lotes pequenos para evitar sobrecarga
      for (let i = 0; i < events.length; i += chunkSize) {
        const chunk = events.slice(i, i + chunkSize);
        await Promise.all(chunk.map(event => base44.entities.TimelineEvent.update(event.id, event)));
        // Adiciona um delay entre os lotes para evitar rate limit (ex: max 100 requests / 10s)
        if (i + chunkSize < events.length) {
          await new Promise(resolve => setTimeout(resolve, 600));
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timelineEvents', projectId] });
    }
  });

  const handleSave = (data) => {
    const adjustedData = { ...data, start_date: data.start_date, end_date: data.end_date };
    if (selectedEvent) {
      updateMutation.mutate({ 
        id: selectedEvent.id, 
        data: {
          ...selectedEvent,
          title: adjustedData.title,
          phase: adjustedData.phase,
          start_date: adjustedData.start_date,
          end_date: adjustedData.end_date,
          status: adjustedData.status,
          progress: adjustedData.progress,
        }
      });
    } else {
      createMutation.mutate(adjustedData);
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
      updateMutation.mutate({ id: eventId, data: { ...event, status: newStatus } });
    }
  };

  // Edição inline direto no quadro (título, datas)
  const handleFieldChange = (eventId, field, value) => {
    const event = timelineEvents.find(e => e.id === eventId);
    if (event && event[field] !== value) {
      updateMutation.mutate({ id: eventId, data: { ...event, [field]: value } });
    }
  };

  // 🚀 OTIMIZAÇÃO 3: useMemo nas renderizações pesadas.
  // Essa lógica de filtro e ordenação rodava a cada clique/tecla. Agora, só roda quando 'products' muda.
  const allEntities = useMemo(() => {
    const entityMap = new Map();
    products.forEach(p => {
      if (p.entity) entityMap.set(p.entity, p.entity_full_name || p.entity);
    });
    
    return Array.from(entityMap.entries())
      .map(([code, fullName]) => ({ code, fullName }))
      .sort((a, b) => {
        const aFullName = a.fullName.toLowerCase();
        const bFullName = b.fullName.toLowerCase();
        const aCode = a.code.toLowerCase();
        const bCode = b.code.toLowerCase();
        
        if (aFullName.includes('prefeitura') && !bFullName.includes('prefeitura')) return -1;
        if (!aFullName.includes('prefeitura') && bFullName.includes('prefeitura')) return 1;
        if (aFullName.includes('câmara') && !bFullName.includes('câmara')) return -1;
        if (!aFullName.includes('câmara') && bFullName.includes('câmara')) return 1;
        if (aCode === 'cm' && bCode !== 'cm') return -1;
        if (aCode !== 'cm' && bCode === 'cm') return 1;
        
        return aFullName.localeCompare(bFullName);
      });
  }, [products]);

  const entityProducts = useMemo(() => {
    return selectedEntity ? products.filter(p => p.entity === selectedEntity) : [];
  }, [products, selectedEntity]);

  const verticals = useMemo(() => {
    return [...new Set(entityProducts.map(p => p.vertical).filter(Boolean))].sort();
  }, [entityProducts]);

  const productsInVertical = useMemo(() => {
    return activeVertical ? entityProducts.filter(p => p.vertical === activeVertical) : [];
  }, [entityProducts, activeVertical]);

  const uniqueEntitiesCodes = useMemo(() => allEntities.map(e => e.code), [allEntities]);

  // Initialize: Auto-select first valid entity
  React.useEffect(() => {
    if (isInitialized || products.length === 0 || allEntities.length === 0) return;
    
    for (const entity of allEntities) {
      const entProds = products.filter(p => p.entity === entity.code);
      if (entProds.length > 0) {
        const verts = [...new Set(entProds.map(p => p.vertical).filter(Boolean))];
        if (verts.length > 0) {
          const firstVertProds = entProds.filter(p => p.vertical === verts[0]);
          if (firstVertProds.length > 0) {
            setSelectedEntity(entity.code);
            setActiveVertical(verts[0]);
            setSelectedProductId(firstVertProds[0].id);
            setIsInitialized(true);
            return;
          }
        }
      }
    }
    setIsInitialized(true);
  }, [products, allEntities, isInitialized]);

  const handleEditDatesApply = async (updatedEvents) => {
    await bulkUpdateMutation.mutateAsync(updatedEvents);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Cronograma</h1>
          <p className="text-slate-400 mt-1">Visualize e gerencie as etapas por produto</p>
        </div>
      </div>

      {allEntities.length > 0 && (
        <EntityFilter entities={allEntities} selectedEntity={selectedEntity} onEntityChange={setSelectedEntity} showAllButton={false} />
      )}

      <Tabs defaultValue="timeline" className="space-y-4">
       <div className="flex items-center justify-between">
         <TabsList className="bg-slate-800 border border-slate-700">
           <TabsTrigger value="timeline" className="data-[state=active]:bg-blue-600">
             Cronograma do Projeto
           </TabsTrigger>
         </TabsList>
         {canEdit && (
           <div className="flex items-center gap-2">
             <BaselineButton
               projectId={projectId}
               timelineEvents={timelineEvents}
               products={products}
             />
             <Button
               size="sm"
               onClick={() => setEditDatesOpen(true)}
               className="bg-blue-600 hover:bg-blue-700 gap-2"
             >
               <Edit3 className="w-4 h-4" />
               Editar datas
             </Button>
           </div>
         )}
       </div>

        <TabsContent value="timeline" className="space-y-6">
          {entityProducts.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Nenhuma entidade com produtos"
              description="Adicione produtos para visualizar o cronograma"
              action={
                <Button onClick={() => window.location.href = 'Dashboard?project_id=' + projectId} className="bg-blue-600 hover:bg-blue-700">
                  Ir para Produtos
                </Button>
              }
            />
          ) : (
            <TimelineByProduct
              verticals={verticals}
              entityProducts={entityProducts}
              timelineEvents={timelineEvents}
              onStatusChange={canEdit ? handleStatusChange : undefined}
              onFieldChange={canEdit ? handleFieldChange : undefined}
              onEdit={canEdit ? handleEdit : undefined}
              onDelete={canEdit ? handleDelete : undefined}
              readOnly={!canEdit}
            />
          )}
        </TabsContent>
      </Tabs>

      <TimelineEventModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        event={selectedEvent}
        onSave={handleSave}
        projectId={projectId}
        productId={selectedProductId}
      />

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

      <BulkEditDatesModal
        open={editDatesOpen}
        onOpenChange={setEditDatesOpen}
        entities={uniqueEntitiesCodes}
        verticals={verticals}
        timelineEvents={timelineEvents}
        products={products}
        onApply={handleEditDatesApply}
      />
    </div>
  );
}