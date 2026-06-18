import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Plus, Trash2, Wand2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from 'sonner';

export default function ObjetivoCard({ objetivo, iniciativas, projectId, onAddIniciativa, onDeleteObjetivo }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(true);
  const [newItem, setNewItem] = useState('');
  const [adding, setAdding] = useState(false);

  const total = iniciativas.length;
  const done = iniciativas.filter(i => i.concluido).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const statusColors = {
    pendente: 'border-slate-600 text-slate-400',
    em_andamento: 'border-blue-500 text-blue-400',
    concluido: 'border-green-500 text-green-400',
  };

  const toggleIniciativa = useMutation({
    mutationFn: ({ id, concluido }) => base44.entities.RoadmapIniciativa.update(id, { concluido }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roadmapIniciativas', projectId] })
  });

  const deleteIniciativa = useMutation({
    mutationFn: (id) => base44.entities.RoadmapIniciativa.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roadmapIniciativas', projectId] })
  });

  const addIniciativa = async () => {
    if (!newItem.trim()) return;
    await base44.entities.RoadmapIniciativa.create({
      project_id: projectId,
      ciclo_id: objetivo.ciclo_id,
      objetivo_id: objetivo.id,
      titulo: newItem.trim(),
      concluido: false
    });
    queryClient.invalidateQueries({ queryKey: ['roadmapIniciativas', projectId] });
    setNewItem('');
    setAdding(false);
  };

  const generateIniciativas = useMutation({
    mutationFn: async () => {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um consultor de sustentação de sistemas públicos.
Crie 4 iniciativas práticas e objetivas para o seguinte objetivo de sustentação guiada:

Objetivo: "${objetivo.titulo}"
Período: ${objetivo.periodo === '30dias' ? '30 dias' : objetivo.periodo === '60dias' ? '60 dias' : '90 dias'}

Responda apenas com um array JSON: [{"titulo": "..."}]`,
        response_json_schema: {
          type: "object",
          properties: {
            iniciativas: { type: "array", items: { type: "object", properties: { titulo: { type: "string" } } } }
          }
        }
      });
      const items = result.iniciativas || [];
      await Promise.all(items.map(item => base44.entities.RoadmapIniciativa.create({
        project_id: projectId,
        ciclo_id: objetivo.ciclo_id,
        objetivo_id: objetivo.id,
        titulo: item.titulo,
        concluido: false
      })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmapIniciativas', projectId] });
      toast.success('Iniciativas geradas pela IA!');
    }
  });

  return (
    <div className={cn("border rounded-xl bg-slate-800/60 overflow-hidden", statusColors[objetivo.status])}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-3 flex-1 text-left">
          <div className="flex-1">
            <p className="text-white font-medium text-sm">{objetivo.titulo}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden max-w-[120px]">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-slate-400">{done}/{total} · {pct}%</span>
            </div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </button>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-purple-400 hover:bg-purple-500/10"
            onClick={() => generateIniciativas.mutate()} disabled={generateIniciativas.isPending} title="Gerar com IA">
            <Wand2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:bg-red-500/10"
            onClick={() => onDeleteObjetivo(objetivo.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Iniciativas */}
      {expanded && (
        <div className="border-t border-slate-700/50 px-4 py-3 space-y-2">
          {iniciativas.map(ini => (
            <div key={ini.id} className="flex items-center gap-2.5 group">
              <button onClick={() => toggleIniciativa.mutate({ id: ini.id, concluido: !ini.concluido })} className="flex-shrink-0">
                {ini.concluido
                  ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                  : <Circle className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />}
              </button>
              <span className={cn("text-sm flex-1", ini.concluido ? "line-through text-slate-500" : "text-slate-300")}>{ini.titulo}</span>
              <button onClick={() => deleteIniciativa.mutate(ini.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}

          {adding ? (
            <div className="flex gap-2 mt-2">
              <Input value={newItem} onChange={e => setNewItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addIniciativa()}
                className="bg-slate-700 border-slate-600 text-white h-7 text-xs" placeholder="Nome da iniciativa..." autoFocus />
              <Button size="sm" onClick={addIniciativa} className="h-7 text-xs bg-blue-600 hover:bg-blue-700 px-3">Ok</Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)} className="h-7 text-xs text-slate-400">✕</Button>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-400 transition-colors mt-1">
              <Plus className="w-3 h-3" /> Adicionar iniciativa
            </button>
          )}
        </div>
      )}
    </div>
  );
}