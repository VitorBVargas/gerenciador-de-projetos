import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2 } from 'lucide-react';
import { cn } from "@/lib/utils";

/**
 * Visualização em tabela: Etapa Macro | Ação | Check | Data
 * Props:
 * - sections: [{ name: string, tasks: [{ id, title, completed, completed_date }] }]
 * - onToggle: (task) => void
 * - onDelete: (taskId) => void
 */
export default function TaskTableView({ sections, onToggle, onDelete }) {
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
            <th className="px-4 py-3 w-20 text-center">Check</th>
            <th className="px-4 py-3 w-32">Data</th>
            <th className="px-4 py-3 w-12"></th>
          </tr>
        </thead>
        <tbody>
          {sections.map((section, sIdx) => (
            <React.Fragment key={`${section.name}-${sIdx}`}>
              {/* Header da etapa macro */}
              <tr className="bg-cyan-500/10 border-y border-cyan-500/20">
                <td colSpan={5} className="px-4 py-2 text-cyan-300 font-semibold text-xs uppercase tracking-wide">
                  {section.name}
                  <span className="ml-2 text-slate-400 normal-case font-normal">
                    ({section.tasks.filter(t => t.completed).length}/{section.tasks.length})
                  </span>
                </td>
              </tr>
              {/* Linhas das tarefas */}
              {section.tasks.map((task, tIdx) => (
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
                    {task.displayTitle || task.title}
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
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}