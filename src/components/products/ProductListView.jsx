import React from 'react';
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { cn } from "@/lib/utils";
import { VERTICAL_BADGE_COLORS } from '../verticalColors';
import EntityBadge from '../EntityBadge';

const verticalLabels = {
  arrecadacao: 'Arrecadação',
  compras: 'Compras/Contratos',
  contabil: 'Contábil',
  pessoal: 'Pessoal',
  educacao: 'Educação',
  iss: 'ISS',
  parceiros: 'Parceiros',
  plataforma: 'Plataforma',
  atendimento: 'Atendimento',
  saude: 'Saúde'
};

const fmtBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v);

/**
 * Visão em lista/tabela dos produtos, agrupados por vertical.
 * Props:
 * - productsByVertical: { [vertical]: Product[] }
 * - usedVerticals: string[]
 * - recognizedRevenues: RecognizedRevenue[]
 * - onEdit, onDelete, onTogglePassword, onToggleAcceptance, onOpenRecognition, onRemoveRecognition
 */
export default function ProductListView({
  productsByVertical,
  usedVerticals,
  recognizedRevenues,
  onEdit,
  onDelete,
  onTogglePassword,
  onToggleAcceptance,
  onOpenRecognition,
  onRemoveRecognition
}) {
  const hasRecognition = (productId) => recognizedRevenues.some(r => r.product_id === productId);

  return (
    <div className="space-y-6">
      {usedVerticals.map((vertical) => {
        const list = productsByVertical[vertical] || [];
        if (list.length === 0) return null;
        return (
          <div key={vertical} className="border border-slate-700 rounded-lg overflow-hidden">
            <div className={cn(
              "px-4 py-2 flex items-center justify-between border-b",
              VERTICAL_BADGE_COLORS[vertical] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'
            )}>
              <h3 className="font-semibold text-sm">{verticalLabels[vertical] || vertical}</h3>
              <span className="text-xs opacity-75">{list.length} produtos</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/60">
                  <tr className="text-left text-cyan-400 text-xs uppercase tracking-wider">
                    <th className="px-4 py-2.5">Produto</th>
                    <th className="px-3 py-2.5">Entidade</th>
                    <th className="px-3 py-2.5">Chamado</th>
                    <th className="px-3 py-2.5 text-right">Implantação</th>
                    <th className="px-3 py-2.5 text-right">Inclusão</th>
                    <th className="px-3 py-2.5 text-center">Senha</th>
                    <th className="px-3 py-2.5 text-center">Aceite</th>
                    <th className="px-3 py-2.5 text-center">Reconhec.</th>
                    <th className="px-3 py-2.5 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => {
                    const recognized = hasRecognition(p.id);
                    return (
                      <tr key={p.id} className="border-t border-slate-800/60 hover:bg-slate-800/40 group transition-colors">
                        <td className="px-4 py-2 text-white font-medium">{p.name}</td>
                        <td className="px-3 py-2">
                          {p.entity ? <EntityBadge code={p.entity} size="sm" /> : <span className="text-slate-500">—</span>}
                        </td>
                        <td className="px-3 py-2 text-slate-400 text-xs">{p.ticket_number || '—'}</td>
                        <td className="px-3 py-2 text-right text-slate-300 text-xs">
                          {p.implementation_value > 0 ? fmtBRL(p.implementation_value) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-300 text-xs">
                          {p.inclusion_value > 0 ? fmtBRL(p.inclusion_value) : '—'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => onTogglePassword(p)}
                            className={cn(
                              "px-2 py-1 rounded text-[10px] font-medium border inline-flex items-center gap-1",
                              p.production_password
                                ? p.password_grace_period_until
                                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30"
                                  : "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
                                : "bg-slate-700/50 text-slate-400 border-slate-600/50 hover:bg-slate-600/50"
                            )}
                          >
                            {p.production_password && <Check className="w-3 h-3" />}
                            {p.production_password ? (p.password_grace_period_until ? 'Carência' : 'Liberada') : 'Liberar'}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => onToggleAcceptance(p)}
                            className={cn(
                              "px-2 py-1 rounded text-[10px] font-medium border inline-flex items-center gap-1",
                              p.implementation_accepted
                                ? "bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30"
                                : "bg-slate-700/50 text-slate-400 border-slate-600/50 hover:bg-slate-600/50"
                            )}
                          >
                            {p.implementation_accepted && <Check className="w-3 h-3" />}
                            {p.implementation_accepted ? 'Sim' : 'Não'}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onOpenRecognition(p)}
                              className={cn(
                                "px-2 py-1 rounded text-[10px] font-medium border inline-flex items-center gap-1",
                                recognized
                                  ? "bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30"
                                  : "bg-slate-700/50 text-slate-400 border-slate-600/50 hover:bg-slate-600/50"
                              )}
                            >
                              {recognized && <Check className="w-3 h-3" />}
                              {recognized ? 'Sim' : 'Não'}
                            </button>
                            {recognized && (
                              <button
                                onClick={() => onRemoveRecognition(p)}
                                title="Desreconhecer"
                                className="px-1.5 py-1 rounded text-[10px] font-medium border bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-white hover:bg-slate-700" onClick={() => onEdit(p)}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/20" onClick={() => onDelete(p)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}