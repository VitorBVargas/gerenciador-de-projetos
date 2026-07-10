import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Rocket, Calendar, Target } from 'lucide-react';
import AgilPageHeader from '@/components/agil/AgilPageHeader';
import { computeSprintMetrics } from '@/components/agil/boardMetrics';

const statusMeta = {
  planejada: { label: 'Planejada', color: 'bg-slate-500/15 text-slate-300' },
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-500/15 text-blue-300' },
  concluida: { label: 'Concluída', color: 'bg-emerald-500/15 text-emerald-300' },
};

export default function AgilReleases() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');

  const { data: project } = useQuery({
    queryKey: ['agilProject', projectId],
    enabled: !!projectId,
    queryFn: async () => (await base44.entities.Project.filter({ id: projectId }))?.[0] || null,
  });

  const { data: sprints = [] } = useQuery({
    queryKey: ['agileSprints', projectId],
    enabled: !!projectId,
    queryFn: () => base44.entities.AgileSprint.filter({ project_id: projectId }, 'ordem'),
  });

  const { data: items = [] } = useQuery({
    queryKey: ['agileBacklog', projectId],
    enabled: !!projectId,
    queryFn: () => base44.entities.AgileBacklog.filter({ project_id: projectId }, '-updated_date', 500),
  });

  const releases = useMemo(() => sprints.map(s => {
    const sprintItems = items.filter(i => i.sprint_id === s.id);
    const m = computeSprintMetrics(sprintItems, s);
    return { sprint: s, metrics: m };
  }), [sprints, items]);

  if (!projectId) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Projeto não informado.</div>;

  return (
    <div className="min-h-screen bg-slate-900 p-6 lg:p-8 space-y-6">
      <AgilPageHeader icon={Rocket} title="Releases" projectName={project?.name} />

      {releases.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700"><CardContent className="py-12 text-center text-slate-400">Nenhuma release/sprint cadastrada. Crie sprints no Product Backlog.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {releases.map(({ sprint, metrics }) => {
            const meta = statusMeta[sprint.status] || statusMeta.planejada;
            return (
              <Card key={sprint.id} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-white font-semibold flex items-center gap-2"><Rocket className="w-4 h-4 text-emerald-400" /> {sprint.nome}</h3>
                      {sprint.objetivo && <p className="text-sm text-slate-400 mt-0.5">{sprint.objetivo}</p>}
                    </div>
                    <Badge className={`${meta.color} border-0`}>{meta.label}</Badge>
                  </div>
                  {(sprint.data_inicio || sprint.data_fim) && (
                    <p className="text-sm text-slate-300 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-500" /> {sprint.data_inicio || '?'} → {sprint.data_fim || '?'}</p>
                  )}
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span className="flex items-center gap-1"><Target className="w-3 h-3" /> Progresso</span>
                      <span>{metrics.percentSprint}% · {metrics.done}/{metrics.total} itens</span>
                    </div>
                    <Progress value={metrics.percentSprint} className="h-2 bg-slate-700" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div><p className="text-lg font-bold text-white">{metrics.sp}</p><p className="text-[11px] text-slate-500">SP Total</p></div>
                    <div><p className="text-lg font-bold text-emerald-300">{metrics.spDone}</p><p className="text-[11px] text-slate-500">SP Entregue</p></div>
                    <div><p className="text-lg font-bold text-indigo-300">{metrics.velocity}</p><p className="text-[11px] text-slate-500">Velocity</p></div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}