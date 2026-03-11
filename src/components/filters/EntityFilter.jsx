import React from 'react';
import { Building2 } from 'lucide-react';
import EntityBadge from '../EntityBadge';

export default function EntityFilter({ entities = [], selectedEntity, onEntityChange, showAllButton = true }) {
  if (entities.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2">
      <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
      <span className="text-sm text-slate-400 flex-shrink-0">Entidade:</span>
      {showAllButton && (
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
      )}
      {[...entities].sort((a, b) => {
        if (a === 'PM') return -1;
        if (b === 'PM') return 1;
        return a.localeCompare(b);
      }).map(entity => (
        <button
          key={entity}
          onClick={() => onEntityChange(entity)}
          className={`transition-all ${
            selectedEntity === entity
              ? 'ring-2 ring-blue-600'
              : 'hover:opacity-80'
          }`}
        >
          <EntityBadge 
            code={entity}
            variant={selectedEntity === entity ? 'primary' : 'default'}
            size="sm"
          />
        </button>
      ))}
    </div>
  );
}