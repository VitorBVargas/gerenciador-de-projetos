import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { phaseLabels } from '@/components/timeline/phaseLabels';
import { ChevronDown, ChevronUp } from 'lucide-react';

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
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedVertical, setSelectedVertical] = useState('');
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [editedEvents, setEditedEvents] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editAllMode, setEditAllMode] = useState(false);
  const [globalStartDate, setGlobalStartDate] = useState('');
  const [globalEndDate, setGlobalEndDate] = useState('');

  React.useEffect(() => {
    if (open) {
      setSelectedEntity('');
      setSelectedVertical('');
      setExpandedEvent(null);
      setEditedEvents({});
      setEditAllMode(false);
      setGlobalStartDate('');
      setGlobalEndDate('');
    }
  }, [open]);

  const getFilteredVerticals = () => {
    if (!selectedEntity) return [];
    return [...new Set(products
      .filter(p => p.entity === selectedEntity)
      .map(p => p.vertical))].sort();
  };

  const getFilteredEvents = () => {
    if (editAllMode) {
      // Get all unique events by ID
      const seenIds = new Set();
      return timelineEvents
        .filter(e => {
          if (seenIds.has(e.id)) return false;
          seenIds.add(e.id);
          return true;
        })
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    
    if (!selectedVertical) return [];
    
    const entityProducts = products.filter(
      p => p.entity === selectedEntity && p.vertical === selectedVertical
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

  const handleDateChange = (eventId, field, value) => {
    setEditedEvents(prev => ({
      ...prev,
      [eventId]: {
        ...(prev[eventId] || {}),
        id: eventId,
        [field]: value
      }
    }));
  };

  const handleApplyClick = () => {
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    const filteredEvents = getFilteredEvents();
    
    // Se há datas globais definidas, aplica a todos os eventos filtrados
    if (globalStartDate || globalEndDate) {
      const eventsToUpdate = filteredEvents.map(event => ({
        id: event.id,
        start_date: globalStartDate || event.start_date,
        end_date: globalEndDate || event.end_date
      }));
      
      if (eventsToUpdate.length > 0) {
        await onApply(eventsToUpdate);
      }
    } else {
      // Caso contrário, aplica apenas as alterações individuais
      const eventsToUpdate = Object.values(editedEvents).map(event => {
        const originalEvent = timelineEvents.find(e => e.id === event.id);
        if (!originalEvent) return null;
        
        return {
          id: originalEvent.id,
          start_date: event.start_date !== undefined ? event.start_date : originalEvent.start_date,
          end_date: event.end_date !== undefined ? event.end_date : originalEvent.end_date
        };
      }).filter(Boolean);

      if (eventsToUpdate.length > 0) {
        await onApply(eventsToUpdate);
      }
    }
    
    setConfirmOpen(false);
    onOpenChange(false);
  };

  const filteredEvents = getFilteredEvents();
  const filteredVerticals = getFilteredVerticals();
  const changedCount = globalStartDate || globalEndDate ? filteredEvents.length : Object.keys(editedEvents).length;
  const hasChanges = changedCount > 0 && (globalStartDate || globalEndDate || Object.keys(editedEvents).length > 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Datas</DialogTitle>
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
                  setExpandedEvent(null);
                  setEditedEvents({});
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
                {/* Entity Selection */}
                <div>
                  <label className="text-sm text-slate-300 block mb-2">Entidade</label>
                  <select
                    value={selectedEntity}
                    onChange={(e) => {
                      setSelectedEntity(e.target.value);
                      setSelectedVertical('');
                      setExpandedEvent(null);
                      setEditedEvents({});
                    }}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 text-sm"
                  >
                    <option value="">Selecione uma entidade</option>
                    {entities.map(entity => (
                      <option key={entity} value={entity}>{entity}</option>
                    ))}
                  </select>
                </div>

                {/* Vertical Selection */}
                {selectedEntity && (
                  <div>
                    <label className="text-sm text-slate-300 block mb-2">Vertical</label>
                    <select
                      value={selectedVertical}
                      onChange={(e) => {
                        setSelectedVertical(e.target.value);
                        setExpandedEvent(null);
                        setEditedEvents({});
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
              </>
            )}

            {/* Global Dates (when entity + vertical selected) */}
            {!editAllMode && selectedVertical && (
              <div className="bg-slate-700/30 p-3 rounded border border-slate-600 space-y-3">
                <p className="text-sm text-slate-300 font-medium">Aplicar a todas as etapas:</p>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Data Início</label>
                  <Input
                    type="date"
                    value={globalStartDate}
                    onChange={(e) => setGlobalStartDate(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Data Fim</label>
                  <Input
                    type="date"
                    value={globalEndDate}
                    onChange={(e) => setGlobalEndDate(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
            )}

            {/* Global Dates (when edit all selected) */}
            {editAllMode && (
              <div className="bg-slate-700/30 p-3 rounded border border-slate-600 space-y-3">
                <p className="text-sm text-slate-300 font-medium">Aplicar a todas as etapas do projeto:</p>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Data Início</label>
                  <Input
                    type="date"
                    value={globalStartDate}
                    onChange={(e) => setGlobalStartDate(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Data Fim</label>
                  <Input
                    type="date"
                    value={globalEndDate}
                    onChange={(e) => setGlobalEndDate(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
            )}

            {/* Events List */}
            {(editAllMode || selectedVertical) && (!globalStartDate && !globalEndDate) && (
              <div>
                <label className="text-sm text-slate-300 block mb-2">Ou editar individualmente:</label>
                <div className="space-y-2">
                  {filteredEvents.length === 0 ? (
                    <p className="text-slate-400 text-sm py-4 text-center">Nenhuma etapa encontrada</p>
                  ) : (
                    filteredEvents.map(event => (
                      <div key={event.id} className="bg-slate-700/50 border border-slate-600 rounded">
                        <button
                          onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                          className="w-full flex items-center justify-between p-3 hover:bg-slate-700/70 transition"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-white text-sm">
                              {phaseLabels[event.phase] || event.title}
                            </span>
                            {editedEvents[event.id] && (
                              <span className="text-xs bg-blue-600/30 text-blue-300 px-2 py-1 rounded">
                                Alterado
                              </span>
                            )}
                          </div>
                          {expandedEvent === event.id ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </button>

                        {expandedEvent === event.id && (
                          <div className="border-t border-slate-600 p-3 bg-slate-800/50 space-y-3">
                            <div>
                              <label className="text-xs text-slate-400 block mb-1">Data Início</label>
                              <Input
                                type="date"
                                value={editedEvents[event.id]?.start_date || event.start_date || ''}
                                onChange={(e) => handleDateChange(event.id, 'start_date', e.target.value)}
                                className="bg-slate-700 border-slate-600 text-white"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-400 block mb-1">Data Fim</label>
                              <Input
                                type="date"
                                value={editedEvents[event.id]?.end_date || event.end_date || ''}
                                onChange={(e) => handleDateChange(event.id, 'end_date', e.target.value)}
                                className="bg-slate-700 border-slate-600 text-white"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
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
              disabled={!hasChanges || (!editAllMode && !selectedVertical)}
            >
              Aplicar {changedCount > 0 && `(${changedCount})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar alterações</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja alterar as datas de {changedCount} etapa(s)?
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