import React from 'react';
import { Building2 } from 'lucide-react';

export default function EntityFilter({ entities = [], selectedEntity, onEntityChange }) {
  if (entities.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2">
      <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
      <span className="text-sm text-slate-400 flex-shrink-0">Entidade:</span>
      <button
        onClick={() => onEntityChange(null)}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
          !selectedEntity
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-slate-700 text-slate-400 hover:text-white border-slate-600 hover:border-slate-500'
        }`}
      >
        Todas
      </button>
      {entities.map(entity => (
        <button
          key={entity}
          onClick={() => onEntityChange(entity)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
            selectedEntity === entity
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-slate-700 text-slate-400 hover:text-white border-slate-600 hover:border-slate-500'
          }`}
        >
          {entity}
        </button>
      ))}
    </div>
  );
}