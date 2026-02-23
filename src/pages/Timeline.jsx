import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Plus, Calendar, Edit3 } from 'lucide-react';
import TimelineEventModal from '../components/modals/TimelineEventModal';
import BulkEditDatesModal from '../components/modals/BulkEditDatesModal';
import EmptyState from '../components/ui/EmptyState';
import EntityFilter from '../components/filters/EntityFilter';
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

const phaseLabels = {
  planejamento_contrato: 'Planejamento/Contrato',
  kickoff: 'Kickoff',
  diagnostico: 'Diagnóstico',
  onboarding_cliente: 'Onboarding Cliente',
  configuracao_migracao_hml: 'Configuração/Migração de Homologação',
  homologacao_base: 'Homologação da Base',
  migracao_prd_blackout: 'Migração de PRD (Blackout)',
  configuracao_prd: 'Configuração de PRD',
  treinamento: 'Treinamento',
  go_live: 'Go-Live',
  operacao_assistida: 'Operação Assistida',
  encerramento_bastao: 'Encerramento/Passagem de Bastão'
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
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkEditMode, setBulkEditMode] = useState('vertical'); // 'vertical' or 'all'

  // Get project_id from URL
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
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
      setBulkEditOpen(false);
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

  const getEventsForBulkEdit = () => {
    if (bulkEditMode === 'vertical') {
      // Get all events for all products in the current vertical
      return timelineEvents.filter(e => {
        const product = productsInVertical.find(p => p.id === e.product_id);
        return !!product;
      }).sort((a, b) => (a.order || 0) - (b.order || 0));
    } else {
      // Get all events for all products in selected entity
      return timelineEvents.filter(e => {
        const product = entityProducts.find(p => p.id === e.product_id);
        return !!product;
      }).sort((a, b) => (a.order || 0) - (b.order || 0));
    }
  };

  const handleBulkEditApply = async (updatedEvents) => {
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
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="timeline" className="data-[state=active]:bg-blue-600">
            Cronograma do Projeto
          </TabsTrigger>
          <TabsTrigger value="delivery" className="data-[state=active]:bg-blue-600">
            Linha do Tempo de Entregas
          </TabsTrigger>
        </TabsList>

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
          ) : (
            <>
              {/* Vertical Tabs */}
              <Tabs value={activeVertical} onValueChange={setActiveVertical} className="space-y-4">
                <TabsList className="bg-slate-800 border border-slate-700 flex-wrap h-auto p-2 gap-2">
                  {verticals.map(vertical => (
                    <TabsTrigger key={vertical} value={vertical} className="data-[state=active]:bg-blue-600">
                      {verticalLabels[vertical] || vertical}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {verticals.map(vertical => {
                  const verticalProgress = getVerticalProgress();
                  const productsInVert = entityProducts.filter(p => p.vertical === vertical);

                  return (
                    <TabsContent key={vertical} value={vertical} className="space-y-4">
                      {/* Vertical Progress Bar */}
                      <div className="flex items-center gap-4 bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                        <div className="text-sm text-slate-400 min-w-[160px]">
                          Progresso {verticalLabels[vertical] || vertical}
                        </div>
                        <div className="flex-1">
                          <Progress value={verticalProgress} className="h-3" />
                        </div>
                        <div className="text-lg font-bold text-white min-w-[50px] text-right">
                          {verticalProgress}%
                        </div>
                      </div>

                      {/* Products Tabs */}
                      {productsInVert.length > 0 && (
                       <div className="space-y-4">
                         {/* Product Tabs */}
                         <Tabs value={selectedProductId} onValueChange={setSelectedProductId} className="space-y-4">
                           <TabsList className="bg-slate-800 border border-slate-700 flex-wrap h-auto p-2 gap-2">
                             {productsInVert.map(product => (
                               <TabsTrigger key={product.id} value={product.id} className="data-[state=active]:bg-blue-600 text-sm">
                                 {product.name}
                               </TabsTrigger>
                             ))}
                           </TabsList>

                           {productsInVert.map(product => (
                             <TabsContent key={product.id} value={product.id} className="space-y-4">

                              {(() => {
                                const productEvents = timelineEvents
                                  .filter(e => e.product_id === product.id)
                                  .sort((a, b) => (a.order || 0) - (b.order || 0));

                                return (
                                  <div className="overflow-x-auto bg-slate-800 rounded-lg border border-slate-700">
                                    <table className="w-full">
                                      <thead>
                                        <tr className="border-b border-slate-700 bg-slate-900/50">
                                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Atividade</th>
                                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Status</th>
                                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Progresso</th>
                                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Ações</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {productEvents.map((event) => (
                                          <tr key={event.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                                            <td className="px-4 py-3 text-sm text-white">
                                              {phaseLabels[event.phase] || event.title}
                                            </td>
                                            <td className="px-4 py-3">
                                              <select
                                                value={event.status}
                                                onChange={(e) => handleStatusChange(event.id, e.target.value)}
                                                className={`px-3 py-1 rounded text-xs font-medium text-white border-0 ${statusColors[event.status]} cursor-pointer hover:opacity-80`}
                                              >
                                                {Object.entries(statusLabels).map(([key, label]) => (
                                                  <option key={key} value={key}>{label}</option>
                                                ))}
                                              </select>
                                            </td>
                                            <td className="px-4 py-3">
                                              <div className="flex items-center gap-2 max-w-xs">
                                                <Progress value={event.progress || 0} className="h-2 flex-1" />
                                                <span className="text-xs text-slate-400 min-w-[35px] text-right">
                                                  {event.progress || 0}%
                                                </span>
                                              </div>
                                            </td>
                                            <td className="px-4 py-3">
                                              <div className="flex gap-2">
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => handleEdit(event, product.id)}
                                                  className="text-slate-400 hover:text-blue-400"
                                                >
                                                  Editar
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => handleDelete(event.id)}
                                                  className="text-slate-400 hover:text-red-400"
                                                >
                                                  Deletar
                                                </Button>
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                );
                              })()}
                            </TabsContent>
                            ))}
                          </Tabs>
                        </div>
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>
            </>
          )}
        </TabsContent>

        {/* Delivery Tab */}
        <TabsContent value="delivery" className="space-y-4">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <p className="text-slate-400">Linha do Tempo de Entregas em desenvolvimento</p>
          </div>
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
    </div>
  );
}