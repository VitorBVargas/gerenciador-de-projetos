import React, { useState, useRef, useEffect } from 'react';
import { Check, X, ChevronDown } from 'lucide-react';

const DEFAULT_OPTIONS = [
  'Aguardando Análise',
  'Aguardando Avaliação',
  'Melhoria Aprovada',
  'Em desenvolvimento',
  'Aguardando Aprovação',
  'Recusada',
  'Finalizada',
];

const getStatusCls = (s = '') => {
  const sl = s.toLowerCase();
  if (sl.includes('finaliz') || sl.includes('conclu') || sl.includes('entregue') || sl.includes('aprovad') && !sl.includes('aguardando')) return 'text-green-300 bg-green-500/20 border-green-500/40';
  if (sl.includes('desenvolvimento') || sl.includes('análise') || sl.includes('analise') || sl.includes('avaliação') || sl.includes('avaliacao')) return 'text-blue-300 bg-blue-500/20 border-blue-500/40';
  if (sl.includes('recusad') || sl.includes('cancel')) return 'text-slate-400 bg-slate-500/20 border-slate-500/40';
  if (sl.includes('aguardando')) return 'text-yellow-300 bg-yellow-500/20 border-yellow-500/40';
  return 'text-yellow-300 bg-yellow-500/20 border-yellow-500/40';
};

export default function StatusCell({ status, onSave, allStatuses = [] }) {
  const [editing, setEditing] = useState(false);
  const ref = useRef(null);

  // Merge default options with any custom ones found in data
  const options = [...new Set([...DEFAULT_OPTIONS, ...allStatuses.filter(s => s && !DEFAULT_OPTIONS.includes(s))])];

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setEditing(false); };
    if (editing) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [editing]);

  if (editing) {
    return (
      <div ref={ref} className="relative z-20">
        <div className="absolute top-0 left-0 bg-slate-800 border border-slate-600 rounded-lg shadow-xl w-52 py-1">
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => { onSave(opt); setEditing(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 transition-colors ${opt === status ? 'font-semibold' : ''}`}
            >
              <span className={`inline-block rounded border px-1.5 py-0.5 ${getStatusCls(opt)}`}>{opt}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`group flex items-center gap-1 text-xs rounded border px-2 py-0.5 hover:opacity-80 transition-opacity ${getStatusCls(status)}`}
      title="Clique para alterar"
    >
      <span className="truncate max-w-[150px]">{status || '—'}</span>
      <ChevronDown className="w-3 h-3 flex-shrink-0 opacity-60" />
    </button>
  );
}