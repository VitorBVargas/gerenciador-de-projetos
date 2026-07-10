import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Target, Zap, Bug, CheckCircle2, Layers, Wrench } from 'lucide-react';
import { computeSprintMetrics, computeBurndown } from '@/components/agil/boardMetrics';
import { releaseHealthScore } from '@/components/agil/kpiCatalog';
import { effectiveColumn } from '@/components/agil/boardMeta';
import ReleaseHealthBadge from './ReleaseHealthBadge';
import SprintBurndown from './SprintBurndown';

const Stat = ({ icon: Icon, label, value, tone = 'slate' }) => {
  const tones = {
    slate: 'text-slate-300', emerald: 'text-emerald-300', indigo: 'text-indigo-300',
    yellow: 'text-yellow-300', red: 'text-red-300', cyan: 'text-cyan-300',
  };
  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1"><Icon className="w-3.5 h-3.5" />{label}</div>
      <p className={`text-xl font-bold ${tones[tone]}`}>{value}</p>
    </div>
  );
};

const statusMeta = {
  planejada: { label: 'Planejada', color: 'bg-slate-500/15 text-slate-300' },
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-500/15 text-blue-300' },
  concluida: { label: 'Concluída', color: 'bg-emerald-500/15 text-emerald-300' },
};

export default function ReleaseDashboard({ open, onOpenChange, sprint, items }) {
  const releaseItems = useMemo(
    () => (items || []).filter(i => sprint && i.sprint_id === sprint.id),
    [items, sprint]
  );
  const main = releaseItems.filter(i => !i.is_subtask);
  const m = useMemo(() => computeSprintMetrics(releaseItems, sprint), [releaseItems, sprint]);
  const burndown = useMemo(() => computeBurndown(releaseItems, sprint), [releaseItems, sprint]);
  const health = useMemo(() => releaseHealthScore(m, sprint), [m, sprint]);

  if (!sprint) return null;

  const features = main.filter(i => i.tipo === 'feature');
  const stories = main.filter(i => i.tipo === 'story');
  const bugs = main.filter(i => i.tipo === 'bug');
  const debt = main.filter(i => i.tipo === 'debito_tecnico');
  const meta = statusMeta[sprint.status] || statusMeta.planejada;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {sprint.nome}
            <Badge className={`${meta.color} border-0`}>{meta.label}</Badge>
            <ReleaseHealthBadge score={health} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {sprint.objetivo && (
            <div className="bg-slate-800/40 rounded-lg p-3">
              <p className="text-xs text-slate-500 flex items-center gap-1 mb-1"><Target className="w-3 h-3" /> Objetivo</p>
              <p className="text-sm text-slate-200">{sprint.objetivo}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-slate-300 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-500" /> Prevista: {sprint.data_inicio || '?'} → {sprint.data_fim || '?'}</span>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Progresso</span>
              <span>{m.percentSprint}% · {m.done}/{m.total} itens</span>
            </div>
            <Progress value={m.percentSprint} className="h-2 bg-slate-700" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Stat icon={Target} label="SP Total" value={m.sp} tone="indigo" />
            <Stat icon={Zap} label="Velocity" value={m.velocity} tone="emerald" />
            <Stat icon={Layers} label="Features" value={features.length} tone="cyan" />
            <Stat icon={CheckCircle2} label="Stories" value={stories.length} tone="slate" />
            <Stat icon={Bug} label="Bugs" value={bugs.length} tone="red" />
            <Stat icon={Wrench} label="Débito Téc." value={debt.length} tone="yellow" />
          </div>

          <SprintBurndown data={burndown.data} totalSp={burndown.totalSp} />

          <div>
            <h3 className="text-sm font-semibold text-white mb-2">Itens da Release ({main.length})</h3>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {main.length === 0 && <p className="text-sm text-slate-500">Nenhum item vinculado a esta release.</p>}
              {main.map(i => {
                const done = effectiveColumn(i) === 'concluido';
                return (
                  <div key={i.id} className="flex items-center justify-between gap-2 bg-slate-800/40 rounded-lg px-3 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {done ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-600 flex-shrink-0" />}
                      <span className={`text-sm truncate ${done ? 'text-slate-400 line-through' : 'text-slate-200'}`}>{i.titulo}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {i.bloqueado && <Badge className="bg-red-500/15 text-red-300 border-0 text-[10px]">Bloqueado</Badge>}
                      <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">{i.tipo}</Badge>
                      {i.story_points > 0 && <Badge className="bg-indigo-500/15 text-indigo-300 border-0 text-[10px]">{i.story_points} SP</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}