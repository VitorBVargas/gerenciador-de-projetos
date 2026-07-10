import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import AgilPageHeader from '@/components/agil/AgilPageHeader';
import { KPI_CATALOG, KPI_GRUPOS, computeAgilKpis } from '@/components/agil/kpiCatalog';
import KpiCard from '@/components/agil/KpiCard';
import KpiAIPanel from '@/components/agil/KpiAIPanel';

export default function AgilKPIs() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');
  const queryClient = useQueryClient();

  const [selectedSprintId, setSelectedSprintId] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: project } = useQuery({
    queryKey: ['agilProject', projectId],
    enabled: !!projectId,
    queryFn: async () => (await base44.entities.Project.filter({ id: projectId }))?.[0] || null,
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ['agileBacklog', projectId],
    enabled: !!projectId,
    queryFn: () => base44.entities.AgileBacklog.filter({ project_id: projectId }, '-updated_date', 500),
  });

  const { data: sprints = [] } = useQuery({
    queryKey: ['agileSprints', projectId],
    enabled: !!projectId,
    queryFn: () => base44.entities.AgileSprint.filter({ project_id: projectId }, 'ordem'),
  });

  const { data: discovery } = useQuery({
    queryKey: ['agilDiscovery', projectId],
    enabled: !!projectId,
    queryFn: async () => (await base44.entities.Discovery.filter({ project_id: projectId }, '-updated_date', 1))?.[0] || null,
  });

  const { data: snapshots = [] } = useQuery({
    queryKey: ['agilKpiSnapshots', projectId],
    enabled: !!projectId,
    queryFn: () => base44.entities.AgilKpiSnapshot.filter({ project_id: projectId }, 'captured_at', 50),
  });

  const activeSprint = useMemo(() => {
    if (selectedSprintId) return sprints.find(s => s.id === selectedSprintId) || null;
    return sprints.find(s => s.status === 'em_andamento') || sprints[sprints.length - 1] || null;
  }, [sprints, selectedSprintId]);

  const sprintItems = useMemo(
    () => allItems.filter(i => activeSprint && i.sprint_id === activeSprint.id),
    [allItems, activeSprint]
  );

  const kpis = useMemo(() => computeAgilKpis({
    sprint: activeSprint, sprintItems, allItems, sprints,
    discoveryScore: discovery?.discovery_score,
  }), [activeSprint, sprintItems, allItems, sprints, discovery]);

  // Histórico por KPI a partir dos snapshots
  const historyByKpi = useMemo(() => {
    const map = {};
    KPI_CATALOG.forEach(k => { map[k.id] = []; });
    snapshots.forEach((snap, idx) => {
      const label = snap.sprint_nome || `#${idx + 1}`;
      KPI_CATALOG.forEach(k => {
        const v = snap.metrics?.[k.id];
        if (typeof v === 'number') map[k.id].push({ label, value: v });
      });
    });
    return map;
  }, [snapshots]);

  const capturarSnapshot = async () => {
    setSaving(true);
    try {
      await base44.entities.AgilKpiSnapshot.create({
        project_id: projectId,
        sprint_id: activeSprint?.id || '',
        sprint_nome: activeSprint?.nome || '',
        captured_at: new Date().toISOString(),
        metrics: kpis,
      });
      toast.success('Snapshot dos indicadores capturado.');
      queryClient.invalidateQueries({ queryKey: ['agilKpiSnapshots', projectId] });
    } catch (e) {
      toast.error('Erro ao capturar snapshot.');
    } finally {
      setSaving(false);
    }
  };

  const grupos = useMemo(() => {
    const g = {};
    KPI_CATALOG.forEach(k => {
      if (!g[k.grupo]) g[k.grupo] = [];
      g[k.grupo].push(k);
    });
    return g;
  }, []);

  if (!projectId) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Projeto não informado.</div>;

  return (
    <div className="min-h-screen bg-slate-900 p-6 lg:p-8 space-y-6">
      <AgilPageHeader icon={Activity} title="KPI / Indicadores" projectName={project?.name}>
        {sprints.length > 0 && (
          <Select value={activeSprint?.id || ''} onValueChange={setSelectedSprintId}>
            <SelectTrigger className="h-9 w-44 bg-slate-800 border-slate-700 text-slate-200"><SelectValue placeholder="Sprint" /></SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
              {sprints.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Button onClick={capturarSnapshot} disabled={saving} variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800">
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Camera className="w-4 h-4 mr-1" />}Capturar Snapshot
        </Button>
      </AgilPageHeader>

      <KpiAIPanel projectName={project?.name} kpis={kpis} history={snapshots.map(s => ({ sprint: s.sprint_nome, ...s.metrics }))} />

      {Object.entries(grupos).map(([grupo, lista]) => (
        <div key={grupo}>
          <h2 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${KPI_GRUPOS[grupo]?.color || 'text-slate-300'}`}>
            {KPI_GRUPOS[grupo]?.label || grupo}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {lista.map(kpi => (
              <KpiCard key={kpi.id} kpi={kpi} value={kpis[kpi.id]} history={historyByKpi[kpi.id]} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}