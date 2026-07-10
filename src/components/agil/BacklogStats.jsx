import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Layers, BookOpen, Bug, Wrench, ListTodo, Boxes, Target, CheckCircle2, Ban } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <Card className="bg-slate-800/50 border-slate-700">
    <CardContent className="p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 truncate">{label}</p>
        <p className="text-xl font-bold text-white">{value}</p>
      </div>
    </CardContent>
  </Card>
);

export default function BacklogStats({ items }) {
  const total = items.length;
  const epics = items.filter(i => i.tipo === 'epic').length;
  const stories = items.filter(i => i.tipo === 'story').length;
  const bugs = items.filter(i => i.tipo === 'bug').length;
  const debitos = items.filter(i => i.tipo === 'debito_tecnico').length;
  const sprintBacklog = items.filter(i => i.sprint_id).length;
  const geralBacklog = items.filter(i => !i.sprint_id).length;
  const spTotais = items.reduce((s, i) => s + (i.story_points || 0), 0);
  const spConcluidos = items.filter(i => i.status === 'concluido').reduce((s, i) => s + (i.story_points || 0), 0);
  const bloqueados = items.filter(i => i.status === 'bloqueado').length;

  const cards = [
    { icon: ListTodo, label: 'Total de Itens', value: total, color: 'bg-slate-500/15 text-slate-300' },
    { icon: Layers, label: 'Epics', value: epics, color: 'bg-purple-500/15 text-purple-300' },
    { icon: BookOpen, label: 'Stories', value: stories, color: 'bg-green-500/15 text-green-300' },
    { icon: Bug, label: 'Bugs', value: bugs, color: 'bg-red-500/15 text-red-300' },
    { icon: Wrench, label: 'Débitos Técnicos', value: debitos, color: 'bg-slate-500/20 text-slate-300' },
    { icon: Boxes, label: 'Backlog da Sprint', value: sprintBacklog, color: 'bg-blue-500/15 text-blue-300' },
    { icon: ListTodo, label: 'Backlog Geral', value: geralBacklog, color: 'bg-cyan-500/15 text-cyan-300' },
    { icon: Target, label: 'Story Points Totais', value: spTotais, color: 'bg-indigo-500/15 text-indigo-300' },
    { icon: CheckCircle2, label: 'SP Concluídos', value: spConcluidos, color: 'bg-emerald-500/15 text-emerald-300' },
    { icon: Ban, label: 'Itens Bloqueados', value: bloqueados, color: 'bg-red-500/15 text-red-300' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c) => <StatCard key={c.label} {...c} />)}
    </div>
  );
}