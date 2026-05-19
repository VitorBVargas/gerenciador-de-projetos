import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Paginação compacta para a Lista Geral do Edital.
 * Mostra: << < [página atual de N] > >>
 */
export default function EditalPagination({
  page,
  totalPages,
  total,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  onChange,
}) {
  const goTo = (p) => onChange(Math.max(1, Math.min(totalPages, p)));

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // Esconde toda a barra apenas quando não há controle algum a mostrar
  if (totalPages <= 1 && !pageSizeOptions) return null;

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap py-2 px-1">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-slate-400">
          Exibindo <b className="text-slate-200">{from}–{to}</b> de <b className="text-slate-200">{total}</b>
        </span>
        {pageSizeOptions && onPageSizeChange && (
          <label className="flex items-center gap-1.5 text-xs text-slate-400">
            Itens por página:
            <select
              value={pageSize}
              onChange={e => onPageSizeChange(Number(e.target.value))}
              className="h-7 px-2 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs hover:border-slate-500 focus:border-orange-500 focus:outline-none"
            >
              {pageSizeOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {totalPages > 1 && (
      <div className="flex items-center gap-1">
        <button
          onClick={() => goTo(1)}
          disabled={page === 1}
          className="h-7 w-7 flex items-center justify-center rounded border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:border-slate-500 disabled:opacity-40 disabled:hover:border-slate-700 disabled:hover:text-slate-300"
          title="Primeira página"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => goTo(page - 1)}
          disabled={page === 1}
          className="h-7 w-7 flex items-center justify-center rounded border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:border-slate-500 disabled:opacity-40 disabled:hover:border-slate-700 disabled:hover:text-slate-300"
          title="Anterior"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <span className="text-xs text-slate-300 px-3 py-1 rounded border border-slate-700 bg-slate-800 min-w-[90px] text-center">
          Página <b className="text-white">{page}</b> de <b className="text-white">{totalPages}</b>
        </span>

        <button
          onClick={() => goTo(page + 1)}
          disabled={page === totalPages}
          className="h-7 w-7 flex items-center justify-center rounded border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:border-slate-500 disabled:opacity-40 disabled:hover:border-slate-700 disabled:hover:text-slate-300"
          title="Próxima"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => goTo(totalPages)}
          disabled={page === totalPages}
          className="h-7 w-7 flex items-center justify-center rounded border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:border-slate-500 disabled:opacity-40 disabled:hover:border-slate-700 disabled:hover:text-slate-300"
          title="Última página"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
      )}
    </div>
  );
}