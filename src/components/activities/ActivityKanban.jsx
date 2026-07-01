import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, MoreHorizontal, Pencil, Trash2, GripHorizontal, Calendar } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ActivityCard from './ActivityCard';

const COLOR_OPTIONS = [
  { id: 'slate',  name: 'Cinza',    border: 'border-slate-500',  bg: 'bg-slate-500/10' },
  { id: 'blue',   name: 'Azul',     border: 'border-blue-500',   bg: 'bg-blue-500/10' },
  { id: 'green',  name: 'Verde',    border: 'border-green-500',  bg: 'bg-green-500/10' },
  { id: 'red',    name: 'Vermelho', border: 'border-red-500',    bg: 'bg-red-500/10' },
  { id: 'purple', name: 'Roxo',     border: 'border-purple-500', bg: 'bg-purple-500/10' },
  { id: 'orange', name: 'Laranja',  border: 'border-orange-500', bg: 'bg-orange-500/10' },
  { id: 'yellow', name: 'Amarelo',  border: 'border-yellow-500', bg: 'bg-yellow-500/10' },
];

const SUSTENTACAO_DEFAULTS = [
  { key: 'backlog',           title: 'Backlog',             color: 'border-slate-500',  bg: 'bg-slate-500/10',  order: 0 },
  { key: 'priorizado',        title: 'Priorizado',          color: 'border-blue-500',   bg: 'bg-blue-500/10',   order: 1 },
  { key: 'in_progress',       title: 'Em Andamento',        color: 'border-yellow-500', bg: 'bg-yellow-500/10', order: 2 },
  { key: 'aguardando_cliente',title: 'Aguardando Cliente',  color: 'border-orange-500', bg: 'bg-orange-500/10', order: 3 },
  { key: 'validacao',         title: 'Validação',           color: 'border-purple-500', bg: 'bg-purple-500/10', order: 4 },
  { key: 'done',              title: 'Concluído',           color: 'border-green-500',  bg: 'bg-green-500/10',  order: 5 },
];

const IMPLANTACAO_DEFAULTS = [
  { key: 'todo',        title: 'A Fazer',      color: 'border-slate-500', bg: 'bg-slate-500/10', order: 0 },
  { key: 'in_progress', title: 'Em Andamento', color: 'border-blue-500',  bg: 'bg-blue-500/10',  order: 1 },
  { key: 'done',        title: 'Concluído',    color: 'border-green-500', bg: 'bg-green-500/10', order: 2 },
];

export default function ActivityKanban({ activities, verticals, onEdit, projectId, isInternal = false, isSustentacao = false }) {
  const queryClient = useQueryClient();
  const [selectedVertical, setSelectedVertical] = useState(verticals[0] || null);
  const [colModalOpen, setColModalOpen] = useState(false);
  const [editingCol, setEditingCol] = useState(null);
  const [colTitle, setColTitle] = useState('');
  const [colColor, setColColor] = useState('blue');
  const initRef = useRef(false);
  // Modal para data prevista ao mover para "em andamento"
  const [endDateModal, setEndDateModal] = useState({ open: false, pendingMove: null, endDate: '' });

  const { data: dbColumns = [], isLoading: isLoadingCols } = useQuery({
    queryKey: ['kanbanColumns', projectId],
    queryFn: () => base44.entities.KanbanColumn.filter({ project_id: projectId }, "order", 100),
    enabled: !!projectId
  });

  useEffect(() => {
    if (isLoadingCols || !projectId || initRef.current) return;

    const existingKeys = dbColumns.map(c => c.key || c.id || '');
    const sustentacaoKeys = SUSTENTACAO_DEFAULTS.map(d => d.key);
    const isOldImplantacaoBoard = isSustentacao &&
      dbColumns.length > 0 &&
      existingKeys.every(k => ['todo', 'in_progress', 'done'].includes(k)) &&
      !existingKeys.some(k => sustentacaoKeys.includes(k));

    // Se for sustentação mas tem colunas antigas de implantação: apaga e recria
    if (isOldImplantacaoBoard) {
      initRef.current = true;
      Promise.all(dbColumns.map(c => base44.entities.KanbanColumn.delete(c.id)))
        .then(() => {
          const defaults = SUSTENTACAO_DEFAULTS.map(d => ({ ...d, project_id: projectId }));
          return Promise.all(defaults.map(c => base44.entities.KanbanColumn.create(c)));
        })
        .then(() => queryClient.invalidateQueries({ queryKey: ['kanbanColumns', projectId] }))
        .catch(() => { initRef.current = false; });
      return;
    }

    if (dbColumns.length === 0) {
      initRef.current = true;
      const defaults = (isSustentacao ? SUSTENTACAO_DEFAULTS : IMPLANTACAO_DEFAULTS)
        .map(d => ({ ...d, project_id: projectId }));
      Promise.all(defaults.map(c => base44.entities.KanbanColumn.create(c)))
        .then(() => queryClient.invalidateQueries({ queryKey: ['kanbanColumns', projectId] }))
        .catch(() => { initRef.current = false; });
      return;
    }

    // Dedup
    const seen = new Map();
    const dups = [];
    for (const col of dbColumns) {
      const k = (col.key || col.title || '').toLowerCase().trim();
      if (!k) continue;
      if (seen.has(k)) dups.push(col.id);
      else seen.set(k, col.id);
    }
    if (dups.length > 0) {
      initRef.current = true;
      Promise.all(dups.map(id => base44.entities.KanbanColumn.delete(id)))
        .then(() => queryClient.invalidateQueries({ queryKey: ['kanbanColumns', projectId] }))
        .catch(() => { initRef.current = false; });
    }
  }, [isLoadingCols, dbColumns, projectId, queryClient, isSustentacao]);

  const fallback = isSustentacao ? SUSTENTACAO_DEFAULTS : IMPLANTACAO_DEFAULTS;
  const columns = dbColumns.length > 0
    ? [...dbColumns].sort((a, b) => a.order - b.order)
    : fallback.map((d, i) => ({ ...d, id: d.key }));

  const updateActivityStatus = useMutation({
    mutationFn: ({ id, status, order }) => base44.entities.ProjectActivity.update(id, { status, order }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activities', projectId] })
  });

  const updateColumnOrder = useMutation({
    mutationFn: (cols) => Promise.all(cols.map((col, idx) => base44.entities.KanbanColumn.update(col.id, { order: idx }))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kanbanColumns', projectId] })
  });

  const saveColumnMutation = useMutation({
    mutationFn: (data) => editingCol?.id
      ? base44.entities.KanbanColumn.update(editingCol.id, data)
      : base44.entities.KanbanColumn.create({ ...data, project_id: projectId, order: columns.length }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanbanColumns', projectId] });
      setColModalOpen(false);
    }
  });

  const deleteColumnMutation = useMutation({
    mutationFn: (id) => base44.entities.KanbanColumn.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kanbanColumns', projectId] })
  });

  const IN_PROGRESS_KEYS = ['in_progress', 'em_andamento'];

  const doMove = (activityId, saveStatus, destIndex, extra = {}) => {
    updateActivityStatus.mutate({ id: activityId, status: saveStatus, order: destIndex, ...extra });
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination, type } = result;

    if (type === 'column') {
      if (source.index === destination.index) return;
      const newCols = Array.from(columns);
      const [removed] = newCols.splice(source.index, 1);
      newCols.splice(destination.index, 0, removed);
      queryClient.setQueryData(['kanbanColumns', projectId], newCols.map((c, i) => ({ ...c, order: i })));
      updateColumnOrder.mutate(newCols);
      return;
    }

    const sourceId = source.droppableId;
    const destId = destination.droppableId;
    const activityId = result.draggableId;
    if (sourceId === destId && source.index === destination.index) return;

    const destCol = columns.find(c => c.id === destId);
    const saveStatus = destCol?.key || destCol?.id || destId;
    const isDone = saveStatus === 'done';
    const isInProgress = IN_PROGRESS_KEYS.includes(saveStatus);

    const extra = {};
    if (isDone) extra.completed_date = new Date().toISOString().split('T')[0];

    // Append history
    const act = activities.find(a => a.id === activityId);
    if (act && act.status !== saveStatus) {
      extra.history = [...(act.history || []), { date: new Date().toISOString(), from: act.status, to: saveStatus }];
    }

    // Auto start_date + pedir data prevista ao mover para em andamento
    if (isInProgress) {
      extra.start_date = new Date().toISOString().split('T')[0];
      setEndDateModal({ open: true, pendingMove: { activityId, saveStatus, destIndex: destination.index, extra }, endDate: act?.end_date || '' });
      return;
    }

    doMove(activityId, saveStatus, destination.index, extra);
  };

  const openColumnModal = (col = null) => {
    setEditingCol(col);
    if (col) {
      setColTitle(col.title);
      setColColor(COLOR_OPTIONS.find(c => c.border === col.color)?.id || 'blue');
    } else {
      setColTitle(''); setColColor('blue');
    }
    setColModalOpen(true);
  };

  const handleSaveColumn = () => {
    if (!colTitle.trim()) return;
    const sel = COLOR_OPTIONS.find(c => c.id === colColor) || COLOR_OPTIONS[1];
    saveColumnMutation.mutate({ title: colTitle.trim(), color: sel.border, bg: sel.bg });
  };

  const verticalActivities = isInternal || isSustentacao || !selectedVertical
    ? activities
    : activities.filter(a => !a.vertical || a.vertical === selectedVertical);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!isInternal && !isSustentacao && verticals.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {verticals.map(v => (
              <button key={v} onClick={() => setSelectedVertical(v)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-colors capitalize",
                  selectedVertical === v ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                )}>
                {v}
              </button>
            ))}
          </div>
        )}
        <Button onClick={() => openColumnModal()} variant="outline"
          className="ml-auto border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-300 h-8 text-sm">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Nova Coluna
        </Button>
      </div>

      {!isInternal && verticals.length === 0 && !isSustentacao ? (
        <div className="text-slate-400 py-4">Nenhuma vertical encontrada. Adicione produtos para gerar verticais.</div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="board" type="column" direction="horizontal">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}
                className="flex gap-3 overflow-x-auto pb-4 items-start min-h-[65vh]">
                {columns.map((col, index) => {
                  const colActivities = verticalActivities
                    .filter(a => a.status === col.id || (col.key && a.status === col.key))
                    .sort((a, b) => (a.order || 0) - (b.order || 0));
                  const isDone = col.key === 'done';

                  return (
                    <Draggable key={col.id} draggableId={col.id} index={index}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.draggableProps}
                          className={cn(
                            "flex flex-col flex-shrink-0 w-72 rounded-xl border p-3",
                            col.bg, col.color,
                            snapshot.isDragging && "shadow-2xl opacity-90 scale-[1.01]"
                          )}>
                          {/* Column Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 flex-1">
                              <div {...provided.dragHandleProps} className="text-slate-400 hover:text-slate-300 cursor-grab">
                                <GripHorizontal className="w-4 h-4" />
                              </div>
                              <h3 className="font-semibold text-white text-sm truncate flex-1">{col.title}</h3>
                              <span className="text-xs bg-slate-800/80 px-2 py-0.5 rounded-full text-slate-300 flex-shrink-0">
                                {colActivities.length}
                              </span>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36 border-slate-700 bg-slate-800 text-slate-300">
                                <DropdownMenuItem onClick={() => openColumnModal(col)} className="hover:bg-slate-700 cursor-pointer">
                                  <Pencil className="w-4 h-4 mr-2" />Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => window.confirm(`Deletar "${col.title}"?`) && deleteColumnMutation.mutate(col.id)}
                                  className="text-red-400 hover:bg-red-400/10 cursor-pointer">
                                  <Trash2 className="w-4 h-4 mr-2" />Deletar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Cards */}
                          <Droppable droppableId={col.id} type="task">
                            {(provided) => (
                              <div {...provided.droppableProps} ref={provided.innerRef}
                                className="flex-1 space-y-2 min-h-[120px]">
                                {colActivities.map((activity, tIndex) => (
                                  <Draggable key={activity.id} draggableId={activity.id} index={tIndex}>
                                    {(provided, snapshot) => (
                                      <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                        <ActivityCard
                                          activity={activity}
                                          isDragging={snapshot.isDragging}
                                          isDone={isDone}
                                          onClick={() => onEdit(activity)}
                                        />
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Modal data prevista ao mover para Em Andamento */}
      <Dialog open={endDateModal.open} onOpenChange={(v) => {
        if (!v) {
          // Confirmar sem data
          const { activityId, saveStatus, destIndex, extra } = endDateModal.pendingMove || {};
          if (activityId) doMove(activityId, saveStatus, destIndex, extra);
          setEndDateModal({ open: false, pendingMove: null, endDate: '' });
        }
      }}>
        <DialogContent className="sm:max-w-[360px] border-slate-800 bg-slate-900 text-slate-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              Data Prevista de Conclusão
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-2">
            <p className="text-sm text-slate-400">Atividade movida para <span className="text-yellow-400 font-medium">Em Andamento</span>. Informe a data prevista de conclusão (opcional).</p>
            <Input
              type="date"
              value={endDateModal.endDate}
              onChange={e => setEndDateModal(prev => ({ ...prev, endDate: e.target.value }))}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" className="text-slate-400" onClick={() => {
              const { activityId, saveStatus, destIndex, extra } = endDateModal.pendingMove || {};
              if (activityId) doMove(activityId, saveStatus, destIndex, extra);
              setEndDateModal({ open: false, pendingMove: null, endDate: '' });
            }}>Pular</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
              const { activityId, saveStatus, destIndex, extra } = endDateModal.pendingMove || {};
              if (activityId) doMove(activityId, saveStatus, destIndex, { ...extra, end_date: endDateModal.endDate || undefined });
              setEndDateModal({ open: false, pendingMove: null, endDate: '' });
            }}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Column edit modal */}
      <Dialog open={colModalOpen} onOpenChange={setColModalOpen}>
        <DialogContent className="sm:max-w-[400px] border-slate-800 bg-slate-900 text-slate-200">
          <DialogHeader><DialogTitle>{editingCol ? 'Editar Coluna' : 'Nova Coluna'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="text-slate-400">Nome da Coluna</Label>
              <Input value={colTitle} onChange={e => setColTitle(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white" placeholder="Ex: Em Análise" autoFocus />
            </div>
            <div className="grid gap-2">
              <Label className="text-slate-400 mb-1">Cor</Label>
              <div className="flex flex-wrap gap-3">
                {COLOR_OPTIONS.map(c => (
                  <button key={c.id} onClick={() => setColColor(c.id)}
                    className={cn("w-8 h-8 rounded-full border-2 transition-transform", c.bg, c.border,
                      colColor === c.id ? "scale-110 ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900" : "hover:scale-105"
                    )} title={c.name} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setColModalOpen(false)} className="border-slate-700 bg-transparent text-slate-300">Cancelar</Button>
            <Button onClick={handleSaveColumn} disabled={saveColumnMutation.isPending || !colTitle.trim()} className="bg-blue-600 hover:bg-blue-700">
              {saveColumnMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}