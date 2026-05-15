import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { Bookmark } from 'lucide-react';
import { cn } from "@/lib/utils";
import { collectCurrentMilestones, computeDeviations, maxDeviation, colorForDeviation, BASELINE_PHASE_LABELS } from './baselineUtils';
import BaselineDetailsDrawer from './BaselineDetailsDrawer';

const colorClasses = {
  green: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/15',
  yellow: 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/15',
  red: 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/15'
};

export default function BaselineKPICard({ projectId, timelineEvents, products }) {
  const [open, setOpen] = useState(false);

  const { data: baselines = [] } = useQuery({
    queryKey: ['scheduleBaselines', projectId],
    queryFn: () => projectId ? base44.entities.ScheduleBaseline.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const summary = useMemo(() => {
    if (!baselines.length) return null;
    const sorted = [...baselines].sort((a, b) => (a.version || 0) - (b.version || 0));
    const v1 = sorted[0];
    const last = sorted[sorted.length - 1];
    const current = collectCurrentMilestones(timelineEvents, products);
    const deviations = computeDeviations(v1.milestones || [], current);
    const top = deviations.reduce((acc, d) => (d.deviation_days > (acc?.deviation_days || -Infinity) ? d : acc), null);
    const maxDev = top?.deviation_days || 0;
    return {
      revisionsCount: sorted.length,
      maxDev,
      lastChangedPhase: top ? BASELINE_PHASE_LABELS[top.phase] : null,
      lastRevisionUser: last?.user_name || last?.user_email || '—',
      lastRevisionDate: last?.created_date || null
    };
  }, [baselines, timelineEvents, products]);

  if (!summary) {
    return null;
  }

  const color = colorForDeviation(summary.maxDev);
  const sign = summary.maxDev > 0 ? '+' : '';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left w-full"
      >
        <Card className={cn("p-4 border transition-colors cursor-pointer", colorClasses[color])}>
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs text-slate-300 font-medium">Desvio Executivo (Baseline)</p>
            <Bookmark className="w-4 h-4 opacity-70" />
          </div>
          <p className="text-2xl font-bold">
            {sign}{summary.maxDev} dias
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {summary.revisionsCount} {summary.revisionsCount === 1 ? 'revisão' : 'revisões'}
          </p>
          {summary.lastChangedPhase && (
            <p className="text-[11px] text-slate-500 mt-0.5">
              Última alteração: {summary.lastChangedPhase}
            </p>
          )}
        </Card>
      </button>

      <BaselineDetailsDrawer
        open={open}
        onOpenChange={setOpen}
        baselines={baselines}
        timelineEvents={timelineEvents}
        products={products}
      />
    </>
  );
}