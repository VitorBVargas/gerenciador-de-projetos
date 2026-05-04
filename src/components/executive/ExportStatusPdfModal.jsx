import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

function formatVerticalName(value) {
  return (value || '').replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

export default function ExportStatusPdfModal({ open, entities, defaultEntity, products, onClose, onExport }) {
  const [selectedEntity, setSelectedEntity] = useState(defaultEntity || '');
  const [verticalObservations, setVerticalObservations] = useState({});

  const verticals = useMemo(() => {
    return [...new Set(
      products
        .filter(product => (product.entity || 'Sem entidade') === selectedEntity)
        .map(product => product.vertical || 'Sem vertical')
    )].sort();
  }, [products, selectedEntity]);

  useEffect(() => {
    if (open) {
      setSelectedEntity(defaultEntity || entities[0] || '');
      setVerticalObservations({});
    }
  }, [open, defaultEntity, entities]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-xl border border-slate-700 bg-slate-900 shadow-2xl" onClick={event => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-700 bg-slate-800 px-5 py-4">
          <div>
            <h4 className="font-bold text-white">Exportar Status Semanal</h4>
            <p className="text-xs text-slate-400">Selecione a entidade e preencha os pontos de atenção por vertical.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-700 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-auto p-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">Entidade do projeto</label>
            <select
              value={selectedEntity}
              onChange={(event) => {
                setSelectedEntity(event.target.value);
                setVerticalObservations({});
              }}
              className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-blue-500"
            >
              {entities.map(entity => (
                <option key={entity} value={entity}>{entity}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-300">Verticais e observações</label>
            {verticals.length === 0 ? (
              <div className="rounded-lg border border-slate-700 bg-slate-950 p-4 text-sm text-slate-400">
                Nenhuma vertical encontrada para esta entidade.
              </div>
            ) : verticals.map(vertical => (
              <div key={vertical} className="rounded-lg border border-slate-700 bg-slate-950 p-4">
                <div className="mb-2 text-sm font-bold text-blue-300">{formatVerticalName(vertical)}</div>
                <textarea
                  value={verticalObservations[vertical] || ''}
                  onChange={(event) => setVerticalObservations(prev => ({ ...prev, [vertical]: event.target.value }))}
                  placeholder="Digite o ponto de atenção desta vertical..."
                  className="min-h-24 w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-700 bg-slate-800 px-5 py-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => onExport(selectedEntity, verticalObservations)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            <Printer className="h-4 w-4" /> Gerar PDF
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}