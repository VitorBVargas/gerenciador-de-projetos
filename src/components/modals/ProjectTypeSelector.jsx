import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Rocket, LifeBuoy, ChevronRight } from 'lucide-react';

const OPTIONS = [
  {
    key: 'implantacao',
    title: 'Implantação',
    description: 'Novo projeto de implantação a partir da importação do CRM, com cronograma, produtos e equipe.',
    icon: Rocket,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'hover:border-blue-500/50',
  },
  {
    key: 'sustentacao',
    title: 'Sustentação',
    description: 'Projeto em sustentação guiada, com roadmap de ciclos, chamados, reuniões e prestação de contas.',
    icon: LifeBuoy,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'hover:border-purple-500/50',
  },
];

export default function ProjectTypeSelector({ open, onOpenChange, onSelect }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-slate-900 border-slate-700 text-slate-200">
        <DialogHeader>
          <DialogTitle>Qual tipo de projeto deseja criar?</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          {OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => onSelect(opt.key)}
              className={`text-left bg-slate-800/60 border border-slate-700 rounded-2xl p-5 transition-all ${opt.border} hover:bg-slate-800 group`}
            >
              <div className={`w-12 h-12 rounded-xl ${opt.bg} flex items-center justify-center mb-3`}>
                <opt.icon className={`w-6 h-6 ${opt.color}`} />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-base">{opt.title}</h3>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
              </div>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{opt.description}</p>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}