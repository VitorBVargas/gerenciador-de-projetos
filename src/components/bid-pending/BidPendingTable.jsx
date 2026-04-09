import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '—' : format(date, 'dd/MM/yyyy', { locale: ptBR });
};

export default function BidPendingTable({ items, onOpenDescription, showProject = true }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900/40">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          <thead className="bg-slate-800">
            <tr className="border-b border-slate-700">
              {showProject && <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">Projeto</th>}
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">Chamado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">Vertical</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">Sistema</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">Nº Item</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">Item do Edital</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">Data Prevista</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className={`border-b border-slate-800 hover:bg-slate-800/60 ${item.isOverdue ? 'bg-red-500/10' : item.isUpcoming ? 'bg-yellow-500/10' : 'bg-slate-900/20'}`}>
                {showProject && <td className="px-4 py-3 text-sm font-medium text-white">{item.project_name}</td>}
                <td className="px-4 py-3 text-sm text-cyan-400">
                  {item.ticket_link ? <a href={item.ticket_link} target="_blank" rel="noopener noreferrer" className="hover:underline">{item.ticket_number || 'Abrir'}</a> : <span className="text-slate-300">{item.ticket_number || '—'}</span>}
                </td>
                <td className="px-4 py-3 text-sm text-slate-300">{item.vertical || '—'}</td>
                <td className="px-4 py-3 text-sm text-slate-300">{item.system_name || '—'}</td>
                <td className="px-4 py-3 text-sm text-white">{item.bid_item_number || '—'}</td>
                <td className="px-4 py-3 text-sm text-slate-300 max-w-[320px]">
                  <button onClick={() => onOpenDescription(item)} className="text-left hover:text-white hover:underline line-clamp-2">{item.bid_item_description || '—'}</button>
                </td>
                <td className="px-4 py-3 text-sm text-slate-300">{item.status || '—'}</td>
                <td className={`px-4 py-3 text-sm ${item.isOverdue ? 'text-red-300 font-semibold' : item.isUpcoming ? 'text-yellow-300 font-semibold' : 'text-slate-300'}`}>{formatDate(item.due_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}