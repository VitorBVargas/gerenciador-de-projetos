import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { phaseLabels } from '@/components/timeline/phaseLabels';
import { formatDateForDisplay } from '@/components/timeline/dateFormatter';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner"; // MELHORIA 2 (20/03/2026): Importando toast para feedback visual

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
const [isProcessing, setIsProcessing] = useState(false);

React.useEffect(() => {
  if (open) {
    setSelectedEntities([]);
    setSelectedVertical('');
    setExpandedPhases([]);
    setPhaseEdits({});
    setEditAllMode(false);
    setConfirmOpen(false);
    setIsProcessing(false);
  }
}, [open]);

// 🚀 OTIMIZAÇÃO 1: useMemo nos cálculos.
// Isso impede que o React refaça os filtros toda vez que o usuário digitar uma data.
const filteredVerticals = useMemo(() => {
  if (selectedEntities.length === 0) return [];
  return [...new Set(products
    .filter(p => selectedEntities.includes(p.entity))
    .map(p => p.vertical))].sort();
}, [selectedEntities, products]);

const filteredEvents = useMemo(() => {
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
      if (e.product_id) {
        return entityProducts.some(p => p.id === e.product_id);
      }
      return true; 
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}, [editAllMode, selectedVertical, selectedEntities, timelineEvents, products]);

const eventsToUpdate = useMemo(() => {
  const updates = [];
  
  // Otimização: Iteramos os eventos apenas uma vez
  filteredEvents.forEach(event => {
    // Busca na memória (O(1)) se existe edição para a fase deste evento
    const edits = phaseEdits[event.phase];
    if (!edits) return; 

    const hasStartDate = edits.start_date && edits.start_date.trim();
    const hasEndDate = edits.end_date && edits.end_date.trim();
    const hasStatus = edits.status && edits.status.trim();
    
    if (!hasStartDate && !hasEndDate && !hasStatus) return;
    
    // Constrói o objeto de atualização
    updates.push({
      id: event.id,
      start_date: hasStartDate ? edits.start_date : event.start_date,
      end_date: hasEndDate ? edits.end_date : event.end_date,
      // Adiciona o status apenas se ele existir (Spread condicional)
      ...(hasStatus && { status: edits.status })
    });
  });

  return updates;
}, [phaseEdits, filteredEvents]);

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
      ...(prev[phase] || {}),
      [field]: value
    }
  }));
};

const handleApplyClick = () => {
  setConfirmOpen(true);
};

const handleConfirm = async () => {
  if (eventsToUpdate.length === 0) {
    setConfirmOpen(false);
    return;
  }

  setIsProcessing(true);
  setConfirmOpen(false);

  // Usa spread para copiar os eventos (mais seguro que structuredClone em alguns browsers)
  const updates = [...eventsToUpdate]; 

  // Cria um toast com ID fixo para podermos atualizar a mensagem dele em tempo real
  const toastId = toast.loading(`Iniciando atualização de ${updates.length} etapas em background...`);

  // Fecha o modal principal após 1.5s para o usuário ver o toast e entender que está em background
  setTimeout(() => {
    onOpenChange(false);
    setIsProcessing(false);
  }, 1500);

  try {
      const CHUNK_SIZE = 5; 
      const batches = Math.ceil(updates.length / CHUNK_SIZE);
      
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < batches; i++) {
        // Atualiza a notificação em tempo real informando o progresso!
        toast.loading(`Processando lote ${i + 1} de ${batches}...`, { id: toastId });
        
        const chunk = updates.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        
        // O Try/Catch DENTRO do loop é o segredo. 
        // Se um lote falhar, o loop não é interrompido. Ele tenta o próximo.
        try {
          await onApply(chunk);
          successCount += chunk.length;
        } catch (chunkError) {
          console.error(`Erro ao salvar lote ${i + 1}:`, chunkError);
          errorCount += chunk.length;
        }
      }

      // Feedback final inteligente
      if (errorCount === 0) {
        toast.success(`${successCount} etapas atualizadas com sucesso!`, { id: toastId, duration: 4000 });
      } else {
        toast.error(`${successCount} salvas, mas falhamos em ${errorCount}. Verifique os erros.`, { id: toastId, duration: 6000 });
      }

    } catch (error) {
      console.error("Erro crítico no background:", error);
      toast.error('Ocorreu um erro crítico ao processar os dados.', { id: toastId });
    }
  };

const hasChanges = eventsToUpdate.length > 0;
const isValidSelection = editAllMode || (selectedEntities.length > 0 && selectedVertical);

// Lógica de UI extraída do render para limpeza
const uniqueActivities = useMemo(() => {
  const unique = [];
  const seenPhases = new Set();
  filteredEvents.forEach(event => {
    if (!seenPhases.has(event.phase)) {
      seenPhases.add(event.phase);
      unique.push(event);
    }
  });
  return unique;
}, [filteredEvents]);

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
          <div className="flex items-center gap-2 p-3 bg-slate-700/30 rounded border border-slate-600">
            <Checkbox
              id="editAllMode"
              checked={editAllMode}
              onCheckedChange={(checked) => {
                setEditAllMode(checked);
                setSelectedEntities([]);
                setSelectedVertical('');
                setExpandedPhases([]);
                setPhaseEdits({});
              }}
              className="border-slate-500"
            />
            <Label htmlFor="editAllMode" className="text-sm text-slate-300 cursor-pointer flex-1">
              Editar todo o projeto
            </Label>
          </div>

          {!editAllMode && (
            <>
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
                      <Label htmlFor={`entity-${entity}`} className="text-sm text-slate-300 cursor-pointer">
                        {entity}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

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

          {isValidSelection && (
            <div>
              <label className="text-sm text-slate-300 block mb-2">Selecione a Atividade para editar:</label>
              <div className="space-y-2">
                {uniqueActivities.length === 0 ? (
                  <p className="text-slate-400 text-sm py-4 text-center">Nenhuma atividade encontrada</p>
                ) : (
                  uniqueActivities.map(event => {
                      const isExpanded = expandedPhases.includes(event.phase);
                      const phaseEvents = filteredEvents.filter(e => e.phase === event.phase);
                      const eventCount = phaseEvents.length;
                      const edit = phaseEdits[event.phase] || { start_date: '', end_date: '', status: '' };

                      return (
                        <div key={event.phase}>
                          <button
                            onClick={() => togglePhaseExpand(event.phase)}
                            className={`w-full flex items-center justify-between p-3 rounded border transition ${
                              isExpanded ? 'bg-blue-600/20 border-blue-600 text-blue-300' : 'bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700/70'
                            }`}
                          >
                            <div className="flex items-center gap-2 flex-1 text-left">
                              <span className="text-sm">{phaseLabels[event.phase] || event.phase}</span>
                              <span className="text-xs text-slate-500">({eventCount} produto{eventCount > 1 ? 's' : ''})</span>
                            </div>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>

                          {isExpanded && (
                          <div className="mt-2 p-3 bg-slate-700/30 rounded border border-slate-600 space-y-3">
                            <p className="text-xs text-slate-400">Editar datas e status para esta atividade em {eventCount} produto{eventCount > 1 ? 's' : ''}:</p>
                            <div>
                              <label className="text-xs text-slate-400 block mb-1">Data Início</label>
                              <Input type="date" value={edit.start_date} onChange={(e) => updatePhaseEdit(event.phase, 'start_date', e.target.value)} className="bg-slate-700 border-slate-600 text-white" />
                            </div>
                            <div>
                              <label className="text-xs text-slate-400 block mb-1">Data Fim</label>
                              <Input type="date" value={edit.end_date} onChange={(e) => updatePhaseEdit(event.phase, 'end_date', e.target.value)} className="bg-slate-700 border-slate-600 text-white" />
                            </div>
                            <div>
                              <label className="text-xs text-slate-400 block mb-1">Status</label>
                              <select value={edit.status} onChange={(e) => updatePhaseEdit(event.phase, 'status', e.target.value)} className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 text-sm">
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
                    })
                  )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing} className="border-slate-600">Cancelar</Button>
          <Button onClick={handleApplyClick} className="bg-blue-600 hover:bg-blue-700" disabled={!hasChanges || isProcessing}>
            {isProcessing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Aplicar em Lote {eventsToUpdate.length > 0 && `(${eventsToUpdate.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogContent className="bg-slate-800 border-slate-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">Confirmar alterações</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400 space-y-3">
            <div>Tem certeza que deseja alterar {eventsToUpdate.length} etapa(s)?</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-700">Aplicar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
);
}