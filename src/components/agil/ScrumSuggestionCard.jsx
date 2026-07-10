import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, Sparkles, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

const DIMENSION_CFG = {
  velocity:  { label: 'Velocity',  color: 'text-cyan-300',    bg: 'bg-cyan-500/15 border-cyan-500/30' },
  sprint:    { label: 'Sprint',    color: 'text-blue-300',    bg: 'bg-blue-500/15 border-blue-500/30' },
  roadmap:   { label: 'Roadmap',   color: 'text-indigo-300',  bg: 'bg-indigo-500/15 border-indigo-500/30' },
  backlog:   { label: 'Backlog',   color: 'text-purple-300',  bg: 'bg-purple-500/15 border-purple-500/30' },
  equipe:    { label: 'Equipe',    color: 'text-emerald-300', bg: 'bg-emerald-500/15 border-emerald-500/30' },
  riscos:    { label: 'Riscos',    color: 'text-red-300',     bg: 'bg-red-500/15 border-red-500/30' },
  kpis:      { label: 'KPIs',      color: 'text-yellow-300',  bg: 'bg-yellow-500/15 border-yellow-500/30' },
  discovery: { label: 'Discovery', color: 'text-pink-300',    bg: 'bg-pink-500/15 border-pink-500/30' },
  releases:  { label: 'Releases',  color: 'text-orange-300',  bg: 'bg-orange-500/15 border-orange-500/30' },
  geral:     { label: 'Geral',     color: 'text-slate-300',   bg: 'bg-slate-500/15 border-slate-500/30' },
};

const PRIORITY_CFG = {
  critica: { label: 'Crítica', bg: 'bg-red-600' },
  alta:    { label: 'Alta',    bg: 'bg-orange-500' },
  media:   { label: 'Média',   bg: 'bg-yellow-500' },
  baixa:   { label: 'Baixa',   bg: 'bg-slate-600' },
};

export default function ScrumSuggestionCard({ suggestion, onAccept, onReject, onReset }) {
  const dim = DIMENSION_CFG[suggestion.dimension] || DIMENSION_CFG.geral;
  const pri = PRIORITY_CFG[suggestion.priority] || PRIORITY_CFG.media;
  const decided = suggestion.status !== 'pendente';

  return (
    <div className={cn(
      'rounded-xl border p-4 transition-all',
      suggestion.status === 'aceita' ? 'border-emerald-500/40 bg-emerald-500/5'
        : suggestion.status === 'rejeitada' ? 'border-slate-700/50 bg-slate-800/30 opacity-70'
        : 'border-slate-700/50 bg-slate-800/60 hover:border-slate-600'
    )}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge className={cn('border text-xs', dim.bg, dim.color)}>{dim.label}</Badge>
          <Badge className={cn('text-white text-xs', pri.bg)}>{pri.label}</Badge>
          {suggestion.status === 'aceita' && <Badge className="bg-emerald-600 text-white text-xs gap-1"><Check className="w-2.5 h-2.5" /> Aceita</Badge>}
          {suggestion.status === 'rejeitada' && <Badge className="bg-slate-600 text-white text-xs gap-1"><X className="w-2.5 h-2.5" /> Rejeitada</Badge>}
        </div>
      </div>

      <h3 className="font-semibold text-white text-sm flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
        {suggestion.title}
      </h3>

      {suggestion.observation && (
        <p className="text-xs text-slate-400 mt-2"><span className="text-slate-500 font-medium">Observação: </span>{suggestion.observation}</p>
      )}
      <p className="text-xs text-slate-200 mt-1.5"><span className="text-emerald-400 font-medium">Ação sugerida: </span>{suggestion.action}</p>
      {suggestion.benefit && (
        <p className="text-xs text-slate-400 mt-1.5"><span className="text-slate-500 font-medium">Benefício: </span>{suggestion.benefit}</p>
      )}

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/40">
        {!decided ? (
          <>
            <Button size="sm" onClick={() => onAccept(suggestion)} className="bg-emerald-600 hover:bg-emerald-700 h-8">
              <Check className="w-3.5 h-3.5 mr-1" /> Aceitar
            </Button>
            <Button size="sm" variant="outline" onClick={() => onReject(suggestion)} className="border-slate-700 text-slate-300 hover:bg-slate-800 h-8">
              <X className="w-3.5 h-3.5 mr-1" /> Rejeitar
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => onReset(suggestion)} className="text-slate-400 hover:text-white h-8">
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reconsiderar
          </Button>
        )}
      </div>
    </div>
  );
}