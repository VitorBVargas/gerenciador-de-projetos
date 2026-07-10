import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Lock, Link2, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { effectiveColumn } from '@/components/agil/boardMeta';

const tipoColor = {
  epic: 'text-purple-300', feature: 'text-cyan-300', story: 'text-slate-200',
  bug: 'text-red-300', debito_tecnico: 'text-yellow-300', spike: 'text-blue-300', melhoria: 'text-emerald-300',
};

// Linha de item do roadmap (feature ou story), indentável.
export default function RoadmapItemRow({ item, depth = 0, riscos = 0 }) {
  const col = effectiveColumn(item);
  const done = col === 'concluido';
  return (
    <div
      className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-800/50"
      style={{ paddingLeft: `${8 + depth * 18}px` }}
    >
      {depth > 0 && <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />}
      {done
        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
        : <span className="w-3.5 h-3.5 rounded-full border border-slate-600 flex-shrink-0" />}
      <span className={`text-sm truncate ${done ? 'text-slate-500 line-through' : tipoColor[item.tipo] || 'text-slate-200'}`}>
        {item.titulo}
      </span>
      <div className="flex items-center gap-1 ml-auto flex-shrink-0">
        {item.bloqueado && <Badge className="bg-red-500/15 text-red-300 border-0 text-[10px]"><Lock className="w-2.5 h-2.5 mr-0.5" />Bloq.</Badge>}
        {(item.dependencias || []).length > 0 && <Badge className="bg-slate-600/40 text-slate-300 border-0 text-[10px]"><Link2 className="w-2.5 h-2.5 mr-0.5" />{item.dependencias.length}</Badge>}
        {riscos > 0 && <Badge className="bg-orange-500/15 text-orange-300 border-0 text-[10px]"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />{riscos}</Badge>}
        <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400 capitalize">{item.tipo}</Badge>
        {item.story_points > 0 && <Badge className="bg-indigo-500/15 text-indigo-300 border-0 text-[10px]">{item.story_points} SP</Badge>}
      </div>
    </div>
  );
}