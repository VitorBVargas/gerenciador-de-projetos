import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Search, ListTodo, LayoutDashboard, Star, Loader2, Check } from 'lucide-react';

const benefit = (text) => (
  <li key={text} className="flex items-start gap-2 text-sm text-slate-300">
    <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
    <span>{text}</span>
  </li>
);

// Modal que abre automaticamente na primeira entrada no projeto Ágil (após criação).
// Deixa o usuário escolher o fluxo inicial: Discovery, Product Backlog ou apenas explorar.
export default function AgilWelcomeFlowModal({ open, onOpenChange, project }) {
  const projectId = project?.id;
  const navigate = useNavigate();
  const [busy, setBusy] = useState(null);

  const withPid = (page) => createPageUrl(`${page}?project_id=${projectId}`);

  const goDiscovery = async () => {
    setBusy('discovery');
    try {
      const existing = await base44.entities.Discovery.filter({ project_id: projectId }, '-updated_date');
      if (!existing || existing.length === 0) {
        await base44.entities.Discovery.create({
          project_id: projectId,
          name: `Discovery — ${project?.name || 'Projeto Ágil'}`,
          status: 'em_andamento',
        });
      }
      navigate(withPid('AgilDiscovery'));
    } catch (e) {
      console.error(e);
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">🚀 Projeto criado com sucesso!</DialogTitle>
        </DialogHeader>
        <p className="text-slate-400 -mt-2">
          Seu Projeto Ágil{project?.name ? ` "${project.name}"` : ''} está pronto. Escolha como deseja começar.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          {/* Discovery */}
          <div className="rounded-xl bg-slate-800/60 border-2 border-emerald-600/40 p-5 flex flex-col relative">
            <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-600/20 text-emerald-300 border border-emerald-600/30">
              <Star className="w-3 h-3" /> Recomendado
            </span>
            <div className="w-11 h-11 rounded-lg bg-emerald-600/20 flex items-center justify-center mb-3">
              <Search className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-white font-bold mb-1">Iniciar pelo Discovery</h3>
            <p className="text-sm text-slate-400 mb-3">Compreenda o problema antes de desenvolver.</p>
            <ul className="space-y-1 mb-4 flex-1">
              {['Diagnóstico e personas', 'Causa raiz, AS IS e TO BE', 'IA gera o Product Backlog'].map(benefit)}
            </ul>
            <Button onClick={goDiscovery} disabled={busy === 'discovery'} className="w-full bg-emerald-600 hover:bg-emerald-700">
              {busy === 'discovery' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Iniciar Discovery
            </Button>
          </div>

          {/* Backlog */}
          <div className="rounded-xl bg-slate-800/60 border-2 border-slate-700 p-5 flex flex-col">
            <div className="w-11 h-11 rounded-lg bg-indigo-600/20 flex items-center justify-center mb-3">
              <ListTodo className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-white font-bold mb-1">Ir para o Backlog</h3>
            <p className="text-sm text-slate-400 mb-3">Requisitos já definidos, planeje as Sprints.</p>
            <ul className="space-y-1 mb-4 flex-1">
              {['Criar Épicos e Features', 'Criar Tarefas e Sprints', 'Planejamento imediato'].map(benefit)}
            </ul>
            <Button onClick={() => navigate(withPid('AgilBacklog'))} className="w-full bg-indigo-600 hover:bg-indigo-700">
              <ListTodo className="w-4 h-4 mr-2" /> Abrir Backlog
            </Button>
          </div>

          {/* Explorar */}
          <div className="rounded-xl bg-slate-800/60 border-2 border-slate-700 p-5 flex flex-col">
            <div className="w-11 h-11 rounded-lg bg-slate-600/20 flex items-center justify-center mb-3">
              <LayoutDashboard className="w-5 h-5 text-slate-300" />
            </div>
            <h3 className="text-white font-bold mb-1">Explorar o Projeto</h3>
            <p className="text-sm text-slate-400 mb-3">Apenas visualizar antes de começar.</p>
            <ul className="space-y-1 mb-4 flex-1">
              {['Revisar equipe', 'Cadastrar produtos', 'Navegar pelo projeto'].map(benefit)}
            </ul>
            <Button onClick={() => onOpenChange(false)} variant="outline" className="w-full border-slate-600 text-slate-200 hover:bg-slate-700">
              <LayoutDashboard className="w-4 h-4 mr-2" /> Ver Dashboard
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}