import React, { useState, useRef, useEffect } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Pencil, Check, X, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";

/**
 * Visualização em tabela: Etapa Macro | Ação | Check | Data
 * Props:
 * - sections: [{ name: string, tasks: [{ id, title, completed, completed_date, displayTitle? }] }]
 * - onToggle: (task) => void
 * - onDelete: (taskId) => void
 * - onRename: (task, newTitle) => void   // newTitle = apenas o nome da ação (sem prefixo ||seção||)
 * - onMarkAll: (sectionTasks, completed) => void   // opcional — habilita botão "Marcar todos" por seção
 * - markingDisabled: boolean   // opcional — desabilita o botão enquanto processa
 */
export default function TaskTableView({ sections, onToggle, onDelete, onRename, onMarkAll, onPercentageChange, markingDisabled = false }) {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const startEdit = (task) => {
    setEditingId(task.id);
    setEditValue(task.displayTitle || task.title);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = (task) => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === (task.displayTitle || task.title)) {
      cancelEdit();
      return;
    }
    if (onRename) onRename(task, trimmed);
    cancelEdit();
  };

  if (!sections || sections.length === 0) {
    return <p className="text-center text-slate-500 py-4 text-sm">Nenhuma tarefa cadastrada.</p>;
  }

  return (
    <div className="border border-slate-700/50 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-900/60">
          <tr className="text-left text-cyan-400 text-xs uppercase tracking-wider">
            <th className="px-4 py-3 w-1/4">Etapa Macro</th>
            <th className="px-4 py-3">Ação</th>
            <th className="px-4 py-3 w-24 text-center">%</th>
            <th className="px-4 py-3 w-20 text-center">Check</th>
            <th className="px-4 py-3 w-32">Data</th>
            <th className="px-4 py-3 w-20"></th>
          </tr>
        </thead>
        <tbody>
          {sections.map((section, sIdx) => (
            <React.Fragment key={`${section.name}-${sIdx}`}>
              {/* Header da etapa macro */}
              <tr className="bg-cyan-500/10 border-y border-cyan-500/20">
                <td colSpan={6} className="px-4 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-cyan-300 font-semibold text-xs uppercase tracking-wide">
                      {section.name}
                      <span className="ml-2 text-slate-400 normal-case font-normal">
                        ({section.tasks.filter(t => t.completed).length}/{section.tasks.length})
                      </span>
                    </div>
                    {onMarkAll && section.tasks.length > 0 && (() => {
                      const allDone = section.tasks.every(t => t.completed);
                      return (
                        <button
                          onClick={() => onMarkAll(section.tasks, !allDone)}
                          disabled={markingDisabled}
                          className="text-[10px] px-2 py-0.5 rounded border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 normal-case"
                        >
                          {markingDisabled ? (
                            <><Loader2 className="w-3 h-3 animate-spin" />Processando...</>
                          ) : (
                            allDone ? 'Desmarcar' : 'Marcar todos'
                          )}
                        </button>
                      );
                    })()}
                  </div>
                </td>
              </tr>
              {/* Linhas das tarefas */}
              {section.tasks.map((task, tIdx) => {
                const isEditing = editingId === task.id;
                return (
                  <tr
                    key={task.id}
                    className={cn(
                      "border-b border-slate-800/60 group hover:bg-slate-800/40 transition-colors",
                      tIdx === section.tasks.length - 1 && sIdx < sections.length - 1 && "border-b-slate-700/50"
                    )}
                  >
                    <td className="px-4 py-2.5 text-slate-500 text-xs">
                      {/* vazio — referência visual à seção acima */}
                    </td>
                    <td className={cn("px-4 py-2.5", task.completed ? "text-slate-400 line-through" : "text-white")}>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            ref={inputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(task);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="bg-slate-700 border-slate-600 text-white h-7 text-sm"
                          />
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-green-400 hover:text-green-300 hover:bg-green-500/20" onClick={() => saveEdit(task)}>
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-slate-300 hover:bg-slate-700" onClick={cancelEdit}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group/cell">
                          <span className="flex-1">{task.displayTitle || task.title}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-slate-400 hover:text-blue-300 hover:bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => startEdit(task)}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={task.percentage ?? 0}
                          onChange={(e) => {
                            let v = parseInt(e.target.value, 10);
                            if (isNaN(v)) v = 0;
                            v = Math.max(0, Math.min(100, v));
                            if (onPercentageChange) onPercentageChange(task, v);
                          }}
                          className="bg-slate-700 border-slate-600 text-white h-7 w-16 text-sm text-center px-1"
                        />
                        <span className="text-slate-400 text-xs">%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={() => onToggle(task)}
                        className="border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">
                      {task.completed && task.completed_date
                        ? new Date(task.completed_date).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onDelete(task.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}