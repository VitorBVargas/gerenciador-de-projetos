import React from 'react';
import { Badge } from '@/components/ui/badge';
import { TIPO_META, PRIORIDADE_META } from './backlogMeta';
import { Lock, Clock, User, Timer, Layers } from 'lucide-react';
import { differenceInDays } from 'date-fns';

const PRIORIDADE_BAR = {
  baixa: 'bg-slate-500',
  media: 'bg-blue-500',
  alta: 'bg-orange-500',
  critica: 'bg-red-500',
};

export default function BoardCard({ item, epic, dragProps, dragHandle, innerRef, isDragging, onClick, onContextMenu }) {
  const meta = TIPO_META[item.tipo] || TIPO_META.story;
  const Icon = meta.icon;

  const checklist = item.checklist || [];
  const checkDone = checklist.filter(c => c.feito).length;
  const percent = checklist.length ? Math.round((checkDone / checklist.length) * 100) : null;

  let diasParado = null;
  if (item.coluna_entrou_em) {
    try { diasParado = differenceInDays(new Date(), new Date(item.coluna_entrou_em)); } catch { /* ignore */ }
  }

  return (
    <div
      ref={innerRef}
      {...dragProps}
      {...dragHandle}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`relative bg-slate-800 border border-slate-700 rounded-xl p-3 cursor-pointer transition-all hover:border-slate-500 hover:shadow-lg ${isDragging ? 'shadow-2xl ring-2 ring-emerald-500/50 rotate-1' : ''}`}
    >
      {/* Barra de prioridade */}
      <div className={`absolute left-0 top-2 bottom-2 w-1 rounded-full ${PRIORIDADE_BAR[item.prioridade] || 'bg-slate-500'}`} />

      {item.bloqueado && (
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 flex items-center justify-center shadow-lg" title={item.bloqueio_motivo || 'Bloqueado'}>
          <Lock className="w-3.5 h-3.5 text-white" />
        </div>
      )}

      <div className="pl-2 space-y-2">
        {/* Topo: tipo + SP */}
        <div className="flex items-center justify-between gap-2">
          <div className={`flex items-center gap-1 ${meta.color}`}>
            <Icon className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">{meta.label}</span>
          </div>
          {(item.story_points > 0) && (
            <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 rounded px-1.5 py-0.5">{item.story_points} SP</span>
          )}
        </div>

        {/* Título */}
        <p className="text-sm font-medium text-white leading-snug line-clamp-2">{item.titulo}</p>

        {/* Epic + produto */}
        {(epic || item.produto) && (
          <div className="flex flex-wrap gap-1">
            {epic && <span className="inline-flex items-center gap-1 text-[10px] text-purple-300 bg-purple-500/10 rounded px-1.5 py-0.5"><Layers className="w-3 h-3" />{epic.titulo}</span>}
            {item.produto && <span className="text-[10px] text-slate-400 bg-slate-700/50 rounded px-1.5 py-0.5">{item.produto}</span>}
          </div>
        )}

        {/* Tags */}
        {(item.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map((t, i) => <span key={i} className="text-[10px] text-cyan-300 bg-cyan-500/10 rounded px-1.5 py-0.5">{t}</span>)}
          </div>
        )}

        {/* Checklist progress */}
        {percent !== null && (
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5"><span>Subtarefas</span><span>{percent}%</span></div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${percent}%` }} />
            </div>
          </div>
        )}

        {/* Rodapé */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-700/50">
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span className="inline-flex items-center gap-1"><User className="w-3 h-3" />{item.responsavel || '—'}</span>
            <Badge variant="outline" className={`${PRIORIDADE_META[item.prioridade]?.badge} text-[9px] px-1 py-0`}>{PRIORIDADE_META[item.prioridade]?.label}</Badge>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            {item.tempo_gasto > 0 && <span className="inline-flex items-center gap-0.5"><Timer className="w-3 h-3" />{item.tempo_gasto}h</span>}
            {diasParado !== null && diasParado > 0 && <span className="inline-flex items-center gap-0.5" title="Dias parado"><Clock className="w-3 h-3" />{diasParado}d</span>}
          </div>
        </div>
      </div>
    </div>
  );
}