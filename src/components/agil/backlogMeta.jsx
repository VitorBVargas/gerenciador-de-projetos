import {
  Layers,
  Boxes,
  BookOpen,
  Bug,
  Zap,
  Sparkles,
  Wrench
} from 'lucide-react';

// Tipos de item do backlog: ícone + cores
export const TIPO_META = {
  epic: {
    label: 'Epic',
    icon: Layers,
    color: 'text-purple-400',
    bg: 'bg-purple-500/15',
    border: 'border-purple-500/40',
    dot: 'bg-purple-500',
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/40'
  },
  feature: {
    label: 'Feature',
    icon: Boxes,
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/40',
    dot: 'bg-blue-500',
    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/40'
  },
  story: {
    label: 'Tarefa',
    icon: BookOpen,
    color: 'text-green-400',
    bg: 'bg-green-500/15',
    border: 'border-green-500/40',
    dot: 'bg-green-500',
    badge: 'bg-green-500/15 text-green-300 border-green-500/40'
  },
  bug: {
    label: 'Bug',
    icon: Bug,
    color: 'text-red-400',
    bg: 'bg-red-500/15',
    border: 'border-red-500/40',
    dot: 'bg-red-500',
    badge: 'bg-red-500/15 text-red-300 border-red-500/40'
  },
  spike: {
    label: 'Spike',
    icon: Zap,
    color: 'text-orange-400',
    bg: 'bg-orange-500/15',
    border: 'border-orange-500/40',
    dot: 'bg-orange-500',
    badge: 'bg-orange-500/15 text-orange-300 border-orange-500/40'
  },
  melhoria: {
    label: 'Melhoria',
    icon: Sparkles,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/15',
    border: 'border-cyan-500/40',
    dot: 'bg-cyan-500',
    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
  },
  debito_tecnico: {
    label: 'Débito Técnico',
    icon: Wrench,
    color: 'text-slate-300',
    bg: 'bg-slate-500/15',
    border: 'border-slate-500/40',
    dot: 'bg-slate-400',
    badge: 'bg-slate-500/20 text-slate-300 border-slate-500/40'
  }
};

export const TIPO_OPTIONS = Object.entries(TIPO_META).map(([value, m]) => ({ value, label: m.label }));

export const PRIORIDADE_META = {
  baixa: { label: 'Baixa', badge: 'bg-slate-500/15 text-slate-300 border-slate-500/40' },
  media: { label: 'Média', badge: 'bg-blue-500/15 text-blue-300 border-blue-500/40' },
  alta: { label: 'Alta', badge: 'bg-orange-500/15 text-orange-300 border-orange-500/40' },
  critica: { label: 'Crítica', badge: 'bg-red-500/15 text-red-300 border-red-500/40' }
};

export const STATUS_META = {
  backlog: { label: 'Backlog', badge: 'bg-slate-500/15 text-slate-300 border-slate-500/40' },
  to_do: { label: 'A Fazer', badge: 'bg-blue-500/15 text-blue-300 border-blue-500/40' },
  em_andamento: { label: 'Em Andamento', badge: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40' },
  em_revisao: { label: 'Em Revisão', badge: 'bg-purple-500/15 text-purple-300 border-purple-500/40' },
  bloqueado: { label: 'Bloqueado', badge: 'bg-red-500/15 text-red-300 border-red-500/40' },
  concluido: { label: 'Concluído', badge: 'bg-green-500/15 text-green-300 border-green-500/40' }
};

export const PRIORIDADE_OPTIONS = Object.entries(PRIORIDADE_META).map(([value, m]) => ({ value, label: m.label }));
export const STATUS_OPTIONS = Object.entries(STATUS_META).map(([value, m]) => ({ value, label: m.label }));