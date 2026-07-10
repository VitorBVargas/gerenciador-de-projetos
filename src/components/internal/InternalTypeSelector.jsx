import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Rocket, Wrench, Kanban } from 'lucide-react';

const TYPES = [
  {
    value: 'implantacao',
    label: 'Implantação',
    description: 'Projeto de implantação com cronograma, migração, homologação e checklist completo.',
    icon: Rocket,
    accent: 'from-blue-600/20 to-blue-500/5 border-blue-500/30 hover:border-blue-400',
    iconBg: 'bg-blue-500/20 text-blue-400',
  },
  {
    value: 'sustentacao',
    label: 'Sustentação',
    description: 'Projeto de sustentação com produtos, chamados, roadmap e prestação de contas.',
    icon: Wrench,
    accent: 'from-purple-600/20 to-purple-500/5 border-purple-500/30 hover:border-purple-400',
    iconBg: 'bg-purple-500/20 text-purple-400',
  },
  {
    value: 'agil',
    label: 'Ágil (Scrum/Kanban)',
    description: 'Projeto ágil com Discovery, Product Backlog gerado por IA e Sprint Board.',
    icon: Kanban,
    accent: 'from-emerald-600/20 to-emerald-500/5 border-emerald-500/30 hover:border-emerald-400',
    iconBg: 'bg-emerald-500/20 text-emerald-400',
  },
];

export default function InternalTypeSelector({ open, onOpenChange, onSelect }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Novo Projeto Interno</DialogTitle>
          <p className="text-sm text-slate-400 mt-1">Escolha o tipo de projeto que deseja criar.</p>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2">
          {TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => onSelect(t.value)}
              className={`text-left rounded-xl border bg-gradient-to-b p-5 transition-all ${t.accent}`}
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${t.iconBg}`}>
                <t.icon className="w-6 h-6" />
              </div>
              <h3 className="text-white font-semibold text-base mb-1.5">{t.label}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{t.description}</p>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}