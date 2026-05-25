import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format } from 'date-fns';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CalendarIcon, Plus, MoreHorizontal, Pencil, Trash2, GripHorizontal } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { phaseLabels } from '@/components/timeline/phaseLabels';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const COLOR_OPTIONS = [
  { id: 'slate', name: 'Cinza', border: 'border-slate-500', bg: 'bg-slate-500/10' },
  { id: 'blue', name: 'Azul', border: 'border-blue-500', bg: 'bg-blue-500/10' },
  { id: 'green', name: 'Verde', border: 'border-green-500', bg: 'bg-green-500/10' },
  { id: 'red', name: 'Vermelho', border: 'border-red-500', bg: 'bg-red-500/10' },
  { id: 'purple', name: 'Roxo', border: 'border-purple-500', bg: 'bg-purple-500/10' },
  { id: 'orange', name: 'Laranja', border: 'border-orange-500', bg: 'bg-orange-500/10' },
];

export default function ActivityKanban({ activities, verticals, onEdit, projectId, isInternal = false }) {
  const queryClient = useQueryClient();
  const [selectedVertical, setSelectedVertical] = useState(verticals[0] || null);

  const [colModalOpen, setColModalOpen] = useState(false);
  const [editingCol, setEditingCol] = useState(null);
  const [colTitle, setColTitle] = useState('');
  const [colColor, setColColor] = useState('blue');

  const { data: dbColumns = [], isLoading: isLoadingCols } = useQuery({
    queryKey: ['kanbanColumns', projectId],
    queryFn: () => base44.entities.KanbanColumn.filter({ project_id: projectId }, "order", 100),
    enabled: !!projectId
  });

  // Flag para impedir múltiplas execuções simultâneas de inicialização/limpeza
  const initRef = useRef(false);

  useEffect(() => {
    if (isLoadingCols || !projectId || initRef.current) return;

    // 1) Caso vazio: criar as colunas padrão UMA única vez
    if (dbColumns.length === 0) {
      initRef.current = true;
      const defaults = [
        { project_id: projectId, key: 'todo', title: 'A Fazer', color: 'border-slate-500', bg: 'bg-slate-500/10', order: 0 },
        { project_id: projectId, key: 'in_progress', title: 'Em Andamento', color: 'border-blue-500', bg: 'bg-blue-500/10', order: 1 },
        { project_id: projectId, key: 'done', title: 'Concluído', color: 'border-green-500', bg: 'bg-green-500/10', order: 2 }
      ];
      Promise.all(defaults.map(c => base44.entities.KanbanColumn.create(c)))
        .then(() => queryClient.invalidateQueries({ queryKey: ['kanbanColumns', projectId] }))
        .catch(() => { initRef.current = false; });
      return;
    }

    // 2) Limpeza automática de duplicatas (mesmo key/title repetidos)
    const seen = new Map();
    const duplicates = [];
    for (const col of dbColumns) {
      const dedupKey = (col.key || col.title || '').toLowerCase().trim();
      if (!dedupKey) continue;
      if (seen.has(dedupKey)) {
        duplicates.push(col.id);
      } else {
        seen.set(dedupKey, col.id);
      }
    }
    if (duplicates.length > 0) {
      initRef.current = true;
      Promise.all(duplicates.map(id => base44.entities.KanbanColumn.delete(id)))
        .then(() => queryClient.invalidateQueries({ queryKey: ['kanbanColumns', projectId] }))
        .catch(() => { initRef.current = false; });
    }
  }, [isLoadingCols, dbColumns, projectId, queryClient]);

  const columns = dbColumns.length > 0 ? [...dbColumns].sort((a,b) => a.order - b.order) : [
    { id: 'todo', key: 'todo', title: 'A Fazer', color: 'border-slate-500', bg: 'bg-slate-500/10', order: 0 },
    { id: 'in_progress', key: 'in_progress', title: 'Em Andamento', color: 'border-blue-500', bg: 'bg-blue-500/10', order: 1 },
    { id: 'done', key: 'done', title: 'Concluído', color: 'border-green-500', bg: 'bg-green-500/10', order: 2 }
  ];

  const updateActivityStatus = useMutation({
    mutationFn: ({ id, status, order }) => base44.entities.ProjectActivity.update(id, { status, order }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activities', projectId] })
  });

  const updateColumnOrder = useMutation({
    mutationFn: async (cols) => Promise.all(cols.map((col, idx) => base44.entities.KanbanColumn.update(col.id, { order: idx }))),
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

    const sourceStatusId = source.droppableId;
    const destStatusId = destination.droppableId;
    const activityId = result.draggableId;

    if (sourceStatusId === destStatusId && source.index === destination.index) return;

    const destCol = columns.find(c => c.id === destStatusId);
    const saveStatus = destCol?.key || destCol?.id || destStatusId;

    updateActivityStatus.mutate({ 
      id: activityId, 
      status: saveStatus, 
      order: destination.index 
    });
  };

  const openColumnModal = (col = null) => {
    setEditingCol(col);
    if (col) {
      setColTitle(col.title);
      const matchedColor = COLOR_OPTIONS.find(c => c.border === col.color)?.id || 'blue';
      setColColor(matchedColor);
    } else {
      setColTitle('');
      setColColor('blue');
    }
    setColModalOpen(true);
  };

  const handleSaveColumn = () => {
    if (!colTitle.trim()) return;
    const selectedColor = COLOR_OPTIONS.find(c => c.id === colColor) || COLOR_OPTIONS[1];
    saveColumnMutation.mutate({
      title: colTitle.trim(),
      color: selectedColor.border,
      bg: selectedColor.bg
    });
  };

  const verticalActivities = isInternal ? activities : activities.filter(a => a.vertical === selectedVertical);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {!isInternal && verticals.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {verticals.map(v => (
              <button
                key={v}
                onClick={() => setSelectedVertical(v)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-colors capitalize",
                  selectedVertical === v ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        )}
        <Button onClick={() => openColumnModal()} variant="outline" className="ml-auto border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-300">
          <Plus className="w-4 h-4 mr-2" />
          Nova Coluna
        </Button>
      </div>

      {!isInternal && verticals.length === 0 ? (
        <div className="text-slate-400 py-4">Nenhuma vertical encontrada para este projeto. Adicione produtos para gerar verticais.</div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="board" type="column" direction="horizontal">
            {(provided) => (
              <div 
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[60vh] scrollbar-thin scrollbar-thumb-slate-600"
              >
                {columns.map((status, index) => {
                  const statusActivities = verticalActivities
                    .filter(a => a.status === status.id || (status.key && a.status === status.key))
                    .sort((a, b) => (a.order || 0) - (b.order || 0));

                  return (
                    <Draggable key={status.id} draggableId={status.id} index={index}>
                      {(provided, snapshot) => (
                        <div 
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(
                            "flex flex-col flex-shrink-0 w-80 rounded-xl border p-4", 
                            status.bg, 
                            status.color,
                            snapshot.isDragging && "shadow-2xl opacity-90 scale-[1.02]"
                          )}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 flex-1">
                              <div {...provided.dragHandleProps} className="text-slate-400 hover:text-slate-300 cursor-grab active:cursor-grabbing">
                                <GripHorizontal className="w-4 h-4" />
                              </div>
                              <h3 className="font-semibold text-white truncate flex-1" title={status.title}>
                                {status.title}
                              </h3>
                              <span className="text-xs bg-slate-800/80 px-2 py-1 rounded-full text-slate-300">
                                {statusActivities.length}
                              </span>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800/50">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40 border-slate-700 bg-slate-800 text-slate-300">
                                <DropdownMenuItem onClick={() => openColumnModal(status)} className="hover:bg-slate-700 cursor-pointer">
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    if(window.confirm(`Tem certeza que deseja deletar a coluna "${status.title}"?`)) {
                                      deleteColumnMutation.mutate(status.id);
                                    }
                                  }} 
                                  className="text-red-400 hover:bg-red-400/10 cursor-pointer focus:text-red-400"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Deletar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          <Droppable droppableId={status.id} type="task">
                            {(provided) => (
                              <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="flex-1 space-y-3 min-h-[150px]"
                              >
                                {statusActivities.map((activity, tIndex) => (
                                  <Draggable key={activity.id} draggableId={activity.id} index={tIndex}>
                                    {(provided, snapshot) => {
                                      let cardColors = "bg-slate-800 border-slate-700";
                                      if (status.key === 'done') {
                                        cardColors = "bg-slate-800/50 border-slate-700/50 opacity-70";
                                      } else if (activity.end_date) {
                                        const endDate = new Date(activity.end_date);
                                        endDate.setHours(23, 59, 59, 999);
                                        const now = new Date();
                                        if (endDate < now) {
                                          cardColors = "bg-red-900/40 border-red-500/50";
                                        } else {
                                          const diffTime = endDate.getTime() - now.getTime();
                                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                          if (diffDays <= 2) {
                                            cardColors = "bg-yellow-900/40 border-yellow-500/50";
                                          }
                                        }
                                      }

                                      const phaseLabel = activity.phase ? phaseLabels[activity.phase] : null;

                                      return (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          onClick={() => onEdit(activity)}
                                          className={cn(
                                            "border rounded-lg p-4 cursor-pointer hover:border-blue-500/50 transition-colors shadow-sm flex flex-col gap-3",
                                            cardColors,
                                            snapshot.isDragging && "shadow-xl shadow-blue-900/20 border-blue-500 z-50"
                                          )}
                                        >
                                          {phaseLabel && (
                                            <div className="text-[10px] font-medium bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded w-fit max-w-full truncate border border-blue-500/30">
                                              {phaseLabel}
                                            </div>
                                          )}
                                          <div className="font-medium text-white text-sm leading-tight">{activity.title}</div>
                                          
                                          <div className="flex flex-col gap-2 mt-auto pt-2 border-t border-slate-700/50">
                                            {activity.assignee && (
                                              <div className="flex items-center gap-2">
                                                <Avatar className="w-5 h-5 border border-slate-600">
                                                  <AvatarFallback className="bg-slate-700 text-[9px] text-white">
                                                    {activity.assignee.substring(0, 2).toUpperCase()}
                                                  </AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs font-medium text-slate-300 truncate" title={activity.assignee}>
                                                  {activity.assignee}
                                                </span>
                                              </div>
                                            )}
                                            
                                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                              <CalendarIcon className="w-3.5 h-3.5" />
                                              {activity.start_date ? format(new Date(activity.start_date), 'dd/MM') : '--'} a {activity.end_date ? format(new Date(activity.end_date), 'dd/MM') : '--'}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    }}
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

      <Dialog open={colModalOpen} onOpenChange={setColModalOpen}>
        <DialogContent className="sm:max-w-[425px] border-slate-800 bg-slate-900 text-slate-200">
          <DialogHeader>
            <DialogTitle>{editingCol ? 'Editar Coluna' : 'Nova Coluna'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-slate-400">Nome da Coluna</Label>
              <Input
                id="title"
                value={colTitle}
                onChange={(e) => setColTitle(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="Ex: Em Análise"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-slate-400 mb-2">Cor de Destaque</Label>
              <div className="flex flex-wrap gap-3">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color.id}
                    onClick={() => setColColor(color.id)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-transform",
                      color.bg,
                      color.border,
                      colColor === color.id ? "scale-110 ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900" : "hover:scale-105"
                    )}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setColModalOpen(false)} className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white">
              Cancelar
            </Button>
            <Button onClick={handleSaveColumn} disabled={saveColumnMutation.isPending || !colTitle.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saveColumnMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}