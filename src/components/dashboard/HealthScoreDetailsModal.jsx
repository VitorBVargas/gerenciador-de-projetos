import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function HealthScoreDetailsModal({ open, onOpenChange, alert }) {
  const verticals = alert?.verticals || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">{alert?.text}</DialogTitle>
          <DialogDescription className="text-slate-400">
            Lista completa dos itens por vertical.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-800">
              <tr className="border-b border-slate-700">
                <th className="px-4 py-3 text-left font-medium text-slate-300">Vertical</th>
                <th className="px-4 py-3 text-left font-medium text-slate-300">Itens</th>
              </tr>
            </thead>
            <tbody>
              {verticals.map((vertical) => (
                <tr key={vertical.name} className="border-b border-slate-800 align-top">
                  <td className="px-4 py-3 text-slate-200 font-medium whitespace-nowrap">{vertical.name}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-2">
                      {vertical.items.map((item, index) => (
                        <div key={`${vertical.name}-${index}`} className="text-slate-300">
                          {item}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}