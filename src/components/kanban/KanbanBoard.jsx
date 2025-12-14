import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, User, GripVertical, Pencil, Trash2 } from "lucide-react";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const columns = [
  { id: 'backlog', title: 'Backlog', color: 'bg-slate-500' },
  { id: 'todo', title: 'A Fazer', color: 'bg-blue-500' },
  { id: 'doing', title: 'Em Progresso', color: 'bg-yellow-500' },
  { id: 'review', title: 'Em Revisão', color: 'bg-purple-500' },
  { id: 'done', title: 'Concluído', color: 'bg-green-500' }
];

const priorityColors = {
  baixa: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  media: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  alta: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  critica: 'bg-red-500/20 text-red-400 border-red-500/30'
};

const priorityLabels = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica'
};

export default function KanbanBoard({ tasks, onDragEnd, onAddTask, onEditTask, onDeleteTask }) {
  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status).sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <div key={column.id} className="flex-shrink-0 w-80">
            <div className="bg-slate-800/50 rounded-xl p-4 min-h-[500px]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", column.color)} />
                  <h3 className="font-semibold text-white">{column.title}</h3>
                  <Badge variant="secondary" className="bg-slate-700 text-slate-300 ml-2">
                    {getTasksByStatus(column.id).length}
                  </Badge>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                  onClick={() => onAddTask(column.id)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div 
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "space-y-3 min-h-[400px] rounded-lg transition-colors p-1",
                      snapshot.isDraggingOver && "bg-slate-700/30"
                    )}
                  >
                    {getTasksByStatus(column.id).map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "bg-slate-700/50 border-slate-600/50 p-4 hover:bg-slate-700 transition-all cursor-pointer group",
                              snapshot.isDragging && "shadow-xl ring-2 ring-blue-500/50"
                            )}
                          >
                            <div className="flex items-start gap-2">
                              <div 
                                {...provided.dragHandleProps}
                                className="text-slate-500 hover:text-slate-300 mt-1 cursor-grab"
                              >
                                <GripVertical className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-white text-sm mb-2 line-clamp-2">
                                  {task.title}
                                </h4>
                                {task.description && (
                                  <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                                    {task.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className={cn("text-xs border", priorityColors[task.priority])}>
                                    {priorityLabels[task.priority]}
                                  </Badge>
                                  {task.due_date && (
                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                      <Calendar className="w-3 h-3" />
                                      {format(new Date(task.due_date), 'dd MMM', { locale: ptBR })}
                                    </div>
                                  )}
                                  {task.assignee && (
                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                      <User className="w-3 h-3" />
                                      <span className="truncate max-w-20">{task.assignee}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-slate-400 hover:text-white hover:bg-slate-600"
                                  onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                  onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}