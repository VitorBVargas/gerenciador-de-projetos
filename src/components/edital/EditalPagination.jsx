import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Paginação compacta para a Lista Geral do Edital.
 * Mostra: << < [página atual de N] > >>
 */
export default function EditalPagination({ page, totalPages, total, pageSize, onChange }) {
  if (totalPages <= 1) return null;

  const goTo = (p) => onChange(Math.max(1, Math.min(totalPages, p)));

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap py-2 px-1">
      <span className="text-xs text-slate-400">
        Exibindo <b className="text-slate-200">{from}–{to}</b> de <b className="text-slate-200">{total}</b>
      </span>

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
    </div>
  );
}