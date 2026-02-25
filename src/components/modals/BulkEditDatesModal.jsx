import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { phaseLabels } from '@/components/timeline/phaseLabels';
import { formatDateForDisplay } from '@/components/timeline/dateFormatter';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

export default function BulkEditDatesModal({ 
  open, 
  onOpenChange, 
  entities = [],
  verticals = [],
  timelineEvents = [],
  products = [],
  onApply,
  editAll = false
}) {
  const [selectedEntities, setSelectedEntities] = useState([]);
  const [selectedVertical, setSelectedVertical] = useState('');
  const [expandedPhases, setExpandedPhases] = useState([]);
  const [phaseEdits, setPhaseEdits] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editAllMode, setEditAllMode] = useState(false);
  const [applying, setApplying] = useState(false);

  React.useEffect(() => {
    if (open) {
      setSelectedEntities([]);
      setSelectedVertical('');
      setExpandedPhases([]);
      setPhaseEdits({});
      setEditAllMode(false);
      setApplying(false);
    }
  }, [open]);

  const getFilteredVerticals = () => {
    if (selectedEntities.length === 0) return [];
    return [...new Set(products
      .filter(p => selectedEntities.includes(p.entity))
      .map(p => p.vertical))].sort();
  };

  const getFilteredEvents = () => {
    if (editAllMode) {
      const seenIds = new Set();
      return timelineEvents
        .filter(e => {
          if (seenIds.has(e.id)) return false;
          seenIds.add(e.id);
          return true;
        })
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    
    if (!selectedVertical || selectedEntities.length === 0) return [];
    
    const entityProducts = products.filter(
      p => selectedEntities.includes(p.entity) && p.vertical === selectedVertical
    );
    
    const seenIds = new Set();
    return timelineEvents
      .filter(e => {
        if (seenIds.has(e.id)) return false;
        seenIds.add(e.id);
        return entityProducts.some(p => p.id === e.product_id);
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  const getEventsByPhase = (phase) => {
    const filteredEvents = getFilteredEvents();
    return filteredEvents.filter(e => e.phase === phase);
  };

  const togglePhaseExpand = (phase) => {
    setExpandedPhases(prev => 
      prev.includes(phase) 
        ? prev.filter(p => p !== phase)
        : [...prev, phase]
    );
  };

  const updatePhaseEdit = (phase, field, value) => {
    setPhaseEdits(prev => ({
      ...prev,
      [phase]: {
        ...prev[phase],
        [field]: value
      }
    }));
  };

  const getPhaseEdit = (phase) => {
    return phaseEdits[phase] || { start_date: '', end_date: '', status: '' };
  };

  const handleApplyClick = () => {
    setConfirmOpen(true);
  };

  const getEventsToUpdate = () => {
    const eventsToUpdate = [];
    
    Object.entries(phaseEdits).forEach(([phase, edits]) => {
      // Verifica se há alterações reais (não vazio)
      const hasStartDate = edits.start_date && edits.start_date.trim();
      const hasEndDate = edits.end_date && edits.end_date.trim();
      const hasStatus = edits.status && edits.status.trim();
      
      if (!hasStartDate && !hasEndDate && !hasStatus) return;
      
      const phaseEvents = getEventsByPhase(phase);
      phaseEvents.forEach(event => {
        const update = {
          id: event.id,
          start_date: hasStartDate ? edits.start_date : event.start_date,
          end_date: hasEndDate ? edits.end_date : event.end_date
        };
        if (hasStatus) {
          update.status = edits.status;
        }
        eventsToUpdate.push(update);
      });
    });

    return eventsToUpdate;
  };

  const handleConfirm = async () => {
    const eventsToUpdate = getEventsToUpdate();
    
    if (eventsToUpdate.length === 0) {
      setConfirmOpen(false);
      return;
    }

    setApplying(true);
    setConfirmOpen(false);

    await onApply(eventsToUpdate);

    setApplying(false);
    onOpenChange(false);
  };

  const filteredVerticals = getFilteredVerticals();
  const eventsToUpdate = getEventsToUpdate();
  const hasChanges = eventsToUpdate.length > 0;
  const isValidSelection = editAllMode || (selectedEntities.length > 0 && selectedVertical);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Datas em Lote</DialogTitle>
            {hasChanges && (
              <p className="text-xs text-slate-400 mt-1">
                Será alterado {eventsToUpdate.length} etapa(s)
              </p>
            )}
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-4">
            {/* Edit All Mode Toggle */}
            <div className="flex items-center gap-2 p-3 bg-slate-700/30 rounded border border-slate-600">
              <Checkbox
                id="editAllMode"
                checked={editAllMode}
                onCheckedChange={(checked) => {
                  setEditAllMode(checked);
                  setSelectedEntity('');
                  setSelectedVertical('');
                  setSelectedPhase(null);
                  setPhaseStartDate('');
                  setPhaseEndDate('');
                }}
                className="border-slate-500"
              />
              <Label
                htmlFor="editAllMode"
                className="text-sm text-slate-300 cursor-pointer flex-1"
              >
                Editar todo o projeto
              </Label>
            </div>

            {!editAllMode && (
              <>
                {/* Entity Selection - Multiple */}
                <div>
                  <label className="text-sm text-slate-300 block mb-2">Entidades <span className="text-red-400">*</span></label>
                  <div className="space-y-2">
                    {entities.map(entity => (
                      <div key={entity} className="flex items-center gap-2">
                        <Checkbox
                          id={`entity-${entity}`}
                          checked={selectedEntities.includes(entity)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedEntities([...selectedEntities, entity]);
                            } else {
                              setSelectedEntities(selectedEntities.filter(e => e !== entity));
                            }
                            setSelectedVertical('');
                            setExpandedPhases([]);
                            setPhaseEdits({});
                          }}
                          className="border-slate-500"
                        />
                        <Label
                          htmlFor={`entity-${entity}`}
                          className="text-sm text-slate-300 cursor-pointer"
                        >
                          {entity}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vertical Selection */}
                {selectedEntities.length > 0 && (
                  <div>
                    <label className="text-sm text-slate-300 block mb-2">Vertical <span className="text-red-400">*</span></label>
                    <select
                      value={selectedVertical}
                      onChange={(e) => {
                        setSelectedVertical(e.target.value);
                        setExpandedPhases([]);
                        setPhaseEdits({});
                      }}
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 text-sm"
                    >
                      <option value="">Selecione uma vertical</option>
                      {filteredVerticals.map(vertical => (
                        <option key={vertical} value={vertical}>{vertical}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Validation Message */}
                {selectedEntities.length === 0 && (
                  <div className="p-3 bg-amber-600/20 border border-amber-600/50 rounded text-xs text-amber-300">
                    ⚠️ Selecione uma ou mais entidades para continuar
                  </div>
                )}
                {selectedEntities.length > 0 && !selectedVertical && (
                  <div className="p-3 bg-amber-600/20 border border-amber-600/50 rounded text-xs text-amber-300">
                    ⚠️ Selecione uma vertical para ver as etapas
                  </div>
                )}
              </>
            )}

            {/* Activities List - Show one of each */}
            {isValidSelection && (
              <div>
                <label className="text-sm text-slate-300 block mb-2">Selecione a Atividade para editar:</label>
                <div className="space-y-2">
                  {(() => {
                    const filteredEvents = getFilteredEvents();

                    if (filteredEvents.length === 0) {
                      return <p className="text-slate-400 text-sm py-4 text-center">Nenhuma atividade encontrada</p>;
                    }

                    // Group by title and show one of each
                    const uniqueActivities = [];
                    const seenTitles = new Set();

                    filteredEvents.forEach(event => {
                      const activityTitle = event.title || phaseLabels[event.phase] || event.phase;
                      if (!seenTitles.has(activityTitle)) {
                        seenTitles.add(activityTitle);
                        uniqueActivities.push(event);
                      }
                    });

                    return uniqueActivities.map(event => {
                       const isExpanded = expandedPhases.includes(event.phase);
                       const eventCount = filteredEvents.filter(e => 
                         (e.title || phaseLabels[e.phase] || e.phase) === (event.title || phaseLabels[event.phase] || event.phase)
                       ).length;
                       const edit = getPhaseEdit(event.phase);

                       return (
                         <div key={event.id}>
                           <button
                             onClick={() => togglePhaseExpand(event.phase)}
                             className={`w-full flex items-center justify-between p-3 rounded border transition ${
                               isExpanded
                                 ? 'bg-blue-600/20 border-blue-600 text-blue-300'
                                 : 'bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700/70'
                             }`}
                           >
                             <div className="flex items-center gap-2 flex-1 text-left">
                               <span className="text-sm">
                                 {event.title || phaseLabels[event.phase] || event.phase}
                               </span>
                               <span className="text-xs text-slate-500">
                                 ({eventCount} produto{eventCount > 1 ? 's' : ''})
                               </span>
                             </div>
                             {isExpanded ? (
                               <ChevronUp className="w-4 h-4" />
                             ) : (
                               <ChevronDown className="w-4 h-4" />
                             )}
                           </button>

                           {isExpanded && (
                            <div className="mt-2 p-3 bg-slate-700/30 rounded border border-slate-600 space-y-3">
                              <p className="text-xs text-slate-400">Editar datas e status para esta atividade em {eventCount} produto{eventCount > 1 ? 's' : ''}:</p>
                              <div>
                                <label className="text-xs text-slate-400 block mb-1">Data Início</label>
                                <Input
                                  type="date"
                                  value={edit.start_date}
                                  onChange={(e) => updatePhaseEdit(event.phase, 'start_date', e.target.value)}
                                  className="bg-slate-700 border-slate-600 text-white"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-400 block mb-1">Data Fim</label>
                                <Input
                                  type="date"
                                  value={edit.end_date}
                                  onChange={(e) => updatePhaseEdit(event.phase, 'end_date', e.target.value)}
                                  className="bg-slate-700 border-slate-600 text-white"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-400 block mb-1">Status</label>
                                <select
                                  value={edit.status}
                                  onChange={(e) => updatePhaseEdit(event.phase, 'status', e.target.value)}
                                  className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 text-sm"
                                >
                                  <option value="">Não alterar</option>
                                  <option value="nao_iniciado">Não Iniciado</option>
                                  <option value="em_andamento">Em Andamento</option>
                                  <option value="concluido">Concluído</option>
                                  <option value="atrasado">Atrasado</option>
                                </select>
                              </div>
                            </div>
                           )}
                         </div>
                       );
                     });
                    })()}
                    </div>
                    </div>
                    )}


          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-600"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApplyClick}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!hasChanges || applying}
            >
              {applying ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Aplicando...</>
              ) : (
                <>Aplicar em Lote {eventsToUpdate.length > 0 && `(${eventsToUpdate.length})`}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar alterações</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja alterar {eventsToUpdate.length} etapa(s)?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Aplicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}