import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Rocket, User, Zap, Users, Package, Target } from 'lucide-react';

const priorityLabels = { baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica' };

export default function AgilDashboard() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');

  const { data: project } = useQuery({
    queryKey: ['agilProject', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const res = await base44.entities.Project.filter({ id: projectId });
      return res?.[0] || null;
    },
  });

  const { data: team = [] } = useQuery({
    queryKey: ['agilTeam', projectId],
    enabled: !!projectId,
    queryFn: () => base44.entities.AgilTeamMember.filter({ project_id: projectId }),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['agilProducts', projectId],
    enabled: !!projectId,
    queryFn: () => base44.entities.AgilProduct.filter({ project_id: projectId }),
  });

  const { data: stakeholders = [] } = useQuery({
    queryKey: ['agilStakeholders', projectId],
    enabled: !!projectId,
    queryFn: () => base44.entities.Stakeholder.filter({ project_id: projectId }),
  });

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  const stats = [
    { label: 'Membros da Equipe', value: team.length, icon: Users },
    { label: 'Produtos', value: products.length, icon: Package },
    { label: 'Stakeholders', value: stakeholders.length, icon: Target },
  ];

  return (
    <div className="min-h-screen bg-slate-900 p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-emerald-600/20 flex items-center justify-center flex-shrink-0">
          <Rocket className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-white">{project.name}</h1>
            <Badge className="bg-emerald-600/20 text-emerald-300 border border-emerald-600/30">Ágil</Badge>
          </div>
          {project.agil_descricao && <p className="text-slate-400 mt-1">{project.agil_descricao}</p>}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader><CardTitle className="text-white text-base">Informações do Projeto</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {project.agil_objetivo && <p className="text-slate-300"><span className="text-slate-500">Objetivo:</span> {project.agil_objetivo}</p>}
            <p className="text-slate-300"><span className="text-slate-500">Área:</span> {project.agil_area || '—'}</p>
            <p className="text-slate-300"><span className="text-slate-500">Responsável:</span> {project.agil_responsavel || '—'}</p>
            <p className="text-slate-300 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-500" /><span className="text-slate-500">PO:</span> {project.agil_product_owner || '—'}</p>
            <p className="text-slate-300 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-slate-500" /><span className="text-slate-500">Scrum Master:</span> {project.agil_scrum_master || '—'}</p>
            <p className="text-slate-300"><span className="text-slate-500">Início previsto:</span> {project.agil_start_date || '—'}</p>
            <p className="text-slate-300"><span className="text-slate-500">Prioridade:</span> {priorityLabels[project.priority] || '—'}</p>
            {(project.agil_tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {project.agil_tags.map(t => <Badge key={t} className="bg-slate-700 text-slate-300 text-xs">{t}</Badge>)}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          {stats.map(s => (
            <Card key={s.label} className="bg-slate-800/50 border-slate-700">
              <CardContent className="flex items-center gap-4 py-5">
                <div className="w-11 h-11 rounded-lg bg-emerald-600/20 flex items-center justify-center">
                  <s.icon className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-sm text-slate-400">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="py-8 text-center">
          <p className="text-slate-400">As demais áreas (Product Backlog, Sprint Board, Roadmap, Cerimônias, Métricas Ágeis) serão implementadas nas próximas fases.</p>
        </CardContent>
      </Card>
    </div>
  );
}