import React from 'react';
import { Building2 } from 'lucide-react';
import EntityBadge from '../EntityBadge';

/**
 * EntityFilter - Filtro de entidades que suporta códigos e nomes completos
 * 
 * @param {Array} entities - Lista de códigos de entidades OU objetos {code, fullName}
 * @param {string} selectedEntity - Código da entidade selecionada
 * @param {Function} onEntityChange - Callback ao trocar entidade
 * @param {boolean} showAllButton - Mostrar botão "Todas"
 */
export default function EntityFilter({ entities = [], selectedEntity, onEntityChange, showAllButton = true }) {
  if (entities.length === 0) return null;

  // Normaliza para array de objetos {code, fullName}
  const normalizedEntities = entities.map(e => 
    typeof e === 'string' ? { code: e, fullName: null } : e
  );

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
      {[...normalizedEntities].sort((a, b) => {
        if (a.code === 'PM') return -1;
        if (b.code === 'PM') return 1;
        return a.code.localeCompare(b.code);
      }).map(entity => (
        <button
          key={entity.code}
          onClick={() => onEntityChange(entity.code)}
          className={`transition-all ${
            selectedEntity === entity.code
              ? 'ring-2 ring-blue-600'
              : 'hover:opacity-80'
          }`}
        >
          <EntityBadge 
            code={entity.code}
            fullName={entity.fullName}
            variant={selectedEntity === entity.code ? 'primary' : 'default'}
            size="sm"
          />
        </button>
      ))}
    </div>
  );
}