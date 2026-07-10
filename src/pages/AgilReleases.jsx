import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Rocket, Calendar, Target, Layers, Bug } from 'lucide-react';
import AgilPageHeader from '@/components/agil/AgilPageHeader';
import { computeSprintMetrics } from '@/components/agil/boardMetrics';
import { releaseHealthScore } from '@/components/agil/kpiCatalog';
import ReleaseHealthBadge from '@/components/agil/ReleaseHealthBadge';
import ReleaseDashboard from '@/components/agil/ReleaseDashboard';

const statusMeta = {
  planejada: { label: 'Planejada', color: 'bg-slate-500/15 text-slate-300' },
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-500/15 text-blue-300' },
  concluida: { label: 'Concluída', color: 'bg-emerald-500/15 text-emerald-300' },
};

export default function AgilReleases() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');
  const [detail, setDetail] = useState(null);

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
    const main = sprintItems.filter(i => !i.is_subtask);
    return {
      sprint: s, metrics: m,
      health: releaseHealthScore(m, s),
      features: main.filter(i => i.tipo === 'feature').length,
      stories: main.filter(i => i.tipo === 'story').length,
      bugs: main.filter(i => i.tipo === 'bug').length,
    };
  }), [sprints, items]);

  if (!projectId) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Projeto não informado.</div>;

  return (
    <div className="min-h-screen bg-slate-900 p-6 lg:p-8 space-y-6">
      <AgilPageHeader icon={Rocket} title="Releases" projectName={project?.name} />

      {releases.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700"><CardContent className="py-12 text-center text-slate-400">Nenhuma release/sprint cadastrada. Crie sprints no Product Backlog.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {releases.map(({ sprint, metrics, health, features, stories, bugs }) => {
            const meta = statusMeta[sprint.status] || statusMeta.planejada;
            return (
              <Card
                key={sprint.id}
                onClick={() => setDetail(sprint)}
                className="bg-slate-800/50 border-slate-700 cursor-pointer hover:border-emerald-600/50 transition-colors"
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-white font-semibold flex items-center gap-2"><Rocket className="w-4 h-4 text-emerald-400" /> {sprint.nome}</h3>
                      {sprint.objetivo && <p className="text-sm text-slate-400 mt-0.5">{sprint.objetivo}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge className={`${meta.color} border-0`}>{meta.label}</Badge>
                      <ReleaseHealthBadge score={health} />
                    </div>
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
                  <div className="grid grid-cols-5 gap-2 text-center pt-1">
                    <div><p className="text-lg font-bold text-white">{metrics.sp}</p><p className="text-[10px] text-slate-500">SP</p></div>
                    <div><p className="text-lg font-bold text-emerald-300">{metrics.velocity}</p><p className="text-[10px] text-slate-500">Velocity</p></div>
                    <div><p className="text-lg font-bold text-cyan-300 flex items-center justify-center gap-1"><Layers className="w-3 h-3" />{features}</p><p className="text-[10px] text-slate-500">Features</p></div>
                    <div><p className="text-lg font-bold text-slate-200">{stories}</p><p className="text-[10px] text-slate-500">Stories</p></div>
                    <div><p className="text-lg font-bold text-red-300 flex items-center justify-center gap-1"><Bug className="w-3 h-3" />{bugs}</p><p className="text-[10px] text-slate-500">Bugs</p></div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ReleaseDashboard open={!!detail} onOpenChange={(o) => !o && setDetail(null)} sprint={detail} items={items} />
    </div>
  );
}