import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Wrench, Rocket } from 'lucide-react';

export default function ProjectTypeSelector({ open, onOpenChange, onSelect }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Cadastrar Novo Projeto</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-400 mb-2">Selecione o tipo do projeto para continuar.</p>
        <div className="grid grid-cols-3 gap-4 py-2">
          <button
            onClick={() => onSelect('implantacao')}
            className="group flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-slate-700 hover:border-blue-500 hover:bg-blue-600/10 transition-all"
          >
            <div className="w-14 h-14 rounded-xl bg-blue-600/20 flex items-center justify-center group-hover:bg-blue-600/30 transition-colors">
              <Building2 className="w-7 h-7 text-blue-400" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-white text-sm">Implantação</p>
              <p className="text-xs text-slate-400 mt-1">Importação via CRM com cronograma completo</p>
            </div>
          </button>

          <button
            onClick={() => onSelect('sustentacao')}
            className="group flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-slate-700 hover:border-purple-500 hover:bg-purple-600/10 transition-all"
          >
            <div className="w-14 h-14 rounded-xl bg-purple-600/20 flex items-center justify-center group-hover:bg-purple-600/30 transition-colors">
              <Wrench className="w-7 h-7 text-purple-400" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-white text-sm">Sustentação</p>
              <p className="text-xs text-slate-400 mt-1">Cadastro manual, sem cronograma de implantação</p>
            </div>
          </button>

          <button
            onClick={() => onSelect('agil')}
            className="group flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-slate-700 hover:border-emerald-500 hover:bg-emerald-600/10 transition-all"
          >
            <div className="w-14 h-14 rounded-xl bg-emerald-600/20 flex items-center justify-center group-hover:bg-emerald-600/30 transition-colors">
              <Rocket className="w-7 h-7 text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-white text-sm">Projeto Ágil</p>
              <p className="text-xs text-slate-400 mt-1">Scrum / Kanban, cadastro manual</p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}