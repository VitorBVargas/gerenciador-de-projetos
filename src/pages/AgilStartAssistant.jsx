import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Rocket, CheckCircle2, ArrowRight, Circle, Search, ListTodo, LayoutDashboard,
  Star, Lightbulb, Loader2, Check
} from 'lucide-react';

const cardBenefit = (text) => (
  <li key={text} className="flex items-start gap-2 text-sm text-slate-300">
    <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
    <span>{text}</span>
  </li>
);

const idealItem = (text) => (
  <li key={text} className="flex items-center gap-2 text-sm text-slate-400">
    <span className="w-1 h-1 rounded-full bg-slate-500 flex-shrink-0" />
    <span>{text}</span>
  </li>
);

export default function AgilStartAssistant() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');
  const navigate = useNavigate();
  const [busy, setBusy] = useState(null);

  const { data: project } = useQuery({
    queryKey: ['agilProject', projectId],
    enabled: !!projectId,
    queryFn: async () => (await base44.entities.Project.filter({ id: projectId }))?.[0] || null,
  });

  const withPid = (page) => createPageUrl(`${page}?project_id=${projectId}`);

  // Card 1 → Discovery. Cria um Discovery vazio vinculado se ainda não existir.
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

  const goBacklog = () => navigate(withPid('AgilBacklog'));
  const goDashboard = () => navigate(withPid('AgilDashboard'));

  if (!projectId) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Projeto não informado.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6 lg:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Topo */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-3"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="w-16 h-16 mx-auto rounded-2xl bg-emerald-600/20 flex items-center justify-center"
          >
            <Rocket className="w-8 h-8 text-emerald-400" />
          </motion.div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">🚀 Projeto criado com sucesso!</h1>
          <p className="text-slate-400 max-w-xl mx-auto">
            Seu Projeto Ágil{project?.name ? ` "${project.name}"` : ''} está pronto.
            Agora escolha a melhor forma de iniciar o trabalho.
          </p>
        </motion.div>

        {/* Barra de etapas */}
        <div className="flex items-center justify-center gap-3 text-sm">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <CheckCircle2 className="w-4 h-4" /> Projeto Criado
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600" />
          <div className="flex items-center gap-1.5 text-white font-medium">
            <ArrowRight className="w-4 h-4 text-emerald-400" /> Escolha o Fluxo
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600" />
          <div className="flex items-center gap-1.5 text-slate-500">
            <Circle className="w-4 h-4" /> Execução
          </div>
        </div>

        {/* Três opções */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CARD 1 — Discovery */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            whileHover={{ y: -6 }}
            onClick={() => !busy && goDiscovery()}
            className="cursor-pointer rounded-2xl bg-slate-800/60 border-2 border-emerald-600/40 hover:border-emerald-500 transition-colors p-6 flex flex-col relative overflow-hidden"
          >
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-emerald-600/20 text-emerald-300 border border-emerald-600/30">
                <Star className="w-3 h-3" /> Recomendado
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">🔍 Iniciar pelo Discovery</h3>
            <p className="text-sm text-slate-400 mb-4">
              Utilize o Discovery para compreender o problema antes de iniciar o desenvolvimento.
            </p>
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Ideal para</p>
            <ul className="space-y-1 mb-4">
              {['novos produtos', 'melhorias complexas', 'processos desconhecidos', 'inovação'].map(idealItem)}
            </ul>
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Benefícios</p>
            <ul className="space-y-1 mb-5 flex-1">
              {['Diagnóstico estruturado', 'Personas', 'Problema', 'Causa raiz', 'AS IS', 'TO BE', 'Plano de ações', 'Discovery Health Score', 'IA gera Product Backlog'].map(cardBenefit)}
            </ul>
            <Button onClick={(e) => { e.stopPropagation(); goDiscovery(); }} disabled={busy === 'discovery'} className="w-full bg-emerald-600 hover:bg-emerald-700">
              {busy === 'discovery' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Iniciar Discovery
            </Button>
          </motion.div>

          {/* CARD 2 — Product Backlog */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            whileHover={{ y: -6 }}
            onClick={goBacklog}
            className="cursor-pointer rounded-2xl bg-slate-800/60 border-2 border-slate-700 hover:border-indigo-500 transition-colors p-6 flex flex-col"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center mb-4">
              <ListTodo className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">📋 Ir direto para o Product Backlog</h3>
            <p className="text-sm text-slate-400 mb-4">
              Quando os requisitos já estão definidos e o time deseja iniciar imediatamente o planejamento das Sprints.
            </p>
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Ideal para</p>
            <ul className="space-y-1 mb-4">
              {['pequenas melhorias', 'correções', 'demandas já detalhadas'].map(idealItem)}
            </ul>
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Benefícios</p>
            <ul className="space-y-1 mb-5 flex-1">
              {['Criar Épicos', 'Criar Features', 'Criar Stories', 'Criar Sprint', 'Planejamento imediato', 'Roadmap'].map(cardBenefit)}
            </ul>
            <Button onClick={(e) => { e.stopPropagation(); goBacklog(); }} className="w-full bg-indigo-600 hover:bg-indigo-700">
              <ListTodo className="w-4 h-4 mr-2" /> Abrir Product Backlog
            </Button>
          </motion.div>

          {/* CARD 3 — Explorar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            whileHover={{ y: -6 }}
            onClick={goDashboard}
            className="cursor-pointer rounded-2xl bg-slate-800/60 border-2 border-slate-700 hover:border-slate-500 transition-colors p-6 flex flex-col"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-600/20 flex items-center justify-center mb-4">
              <LayoutDashboard className="w-6 h-6 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">📊 Explorar o Projeto</h3>
            <p className="text-sm text-slate-400 mb-4">
              Desejo apenas visualizar o projeto antes de começar.
            </p>
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Ideal para</p>
            <ul className="space-y-1 mb-5 flex-1">
              {['revisar equipe', 'cadastrar produtos', 'verificar configurações', 'navegar pelo projeto'].map(idealItem)}
            </ul>
            <Button onClick={(e) => { e.stopPropagation(); goDashboard(); }} variant="outline" className="w-full border-slate-600 text-slate-200 hover:bg-slate-700">
              <LayoutDashboard className="w-4 h-4 mr-2" /> Ir para Dashboard
            </Button>
          </motion.div>
        </div>

        {/* Rodapé — dica */}
        <div className="flex items-start gap-3 rounded-xl bg-slate-800/40 border border-slate-700 p-4 max-w-3xl mx-auto">
          <Lightbulb className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-white">Dica:</span> Você poderá alternar entre Discovery e Product Backlog a qualquer momento durante o ciclo do projeto. O Discovery nunca será obrigatório.
          </p>
        </div>
      </div>
    </div>
  );
}