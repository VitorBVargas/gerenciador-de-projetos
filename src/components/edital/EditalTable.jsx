import React from 'react';
import StatusCell from '@/components/edital/StatusCell';

export default function EditalTable({ items = [] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700">
      <table className="w-full min-w-[720px]">
        <thead className="bg-slate-900">
          <tr className="border-b border-slate-700">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Edital</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Responsável</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Prazo</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                Nenhuma pendência cadastrada.
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} className="border-b border-slate-800 bg-slate-950/40">
                <td className="px-4 py-3 text-sm text-white">{item.nome}</td>
                <td className="px-4 py-3 text-sm text-slate-300">{item.responsavel}</td>
                <td className="px-4 py-3 text-sm text-slate-300">{item.prazo}</td>
                <td className="px-4 py-3 text-sm text-slate-300">
                  <StatusCell status={item.status} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}