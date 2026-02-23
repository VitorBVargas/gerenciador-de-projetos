import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ProjectRecognitionsModal({ open, onOpenChange, project, recognitions, products }) {
  const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v || 0);

  const total = recognitions.reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white">Reconhecimentos — {project?.name}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 py-2">
          {recognitions.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">Nenhum reconhecimento registrado.</p>
          ) : (
            <>
              <div className="bg-purple-600/20 border border-purple-600/30 rounded-lg px-4 py-2 flex items-center justify-between mb-3">
                <span className="text-sm text-purple-300">Total Reconhecido</span>
                <span className="text-lg font-bold text-purple-300">{fmt(total)}</span>
              </div>
              {recognitions.map((r) => {
                const product = products.find(p => p.id === r.product_id);
                const [year, month] = r.recognition_month.split('-');
                const monthYear = format(new Date(parseInt(year), parseInt(month) - 1, 1), 'MMM/yyyy', { locale: ptBR });
                return (
                  <div key={r.id} className="bg-slate-700/50 border border-slate-700 rounded-lg px-3 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{product?.name || r.vertical_name || 'Produto'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge className="bg-purple-600/30 text-purple-300 border-purple-600/40 text-[10px]">
                          {r.type === 'implantacao' ? 'Implantação' : 'Recorrente'}
                        </Badge>
                        <span className="text-[10px] text-slate-400">{monthYear}</span>
                        {product?.entity && <span className="text-[10px] text-slate-500">{product.entity}</span>}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-purple-400 ml-4">{fmt(r.amount)}</span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}