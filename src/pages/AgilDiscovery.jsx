import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import InternalDiscoveryTab from '@/components/internal/InternalDiscoveryTab';
import AgilPageHeader from '@/components/agil/AgilPageHeader';
import AgilDiscoveryPanel from '@/components/agil/AgilDiscoveryPanel';

// Discovery do módulo Ágil — reaproveita a listagem existente e adiciona
// Health Score, Análise IA, estimativas, ações de backlog/roadmap/projeto e histórico de versões.
export default function AgilDiscovery() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');
  const [selectedId, setSelectedId] = useState(null);

  const { data: project } = useQuery({
    queryKey: ['agilProject', projectId],
    enabled: !!projectId,
    queryFn: async () => (await base44.entities.Project.filter({ id: projectId }))?.[0] || null,
  });

  const { data: discoveries = [] } = useQuery({
    queryKey: ['discoveries', projectId],
    enabled: !!projectId,
    queryFn: () => base44.entities.Discovery.filter({ project_id: projectId }, '-updated_date'),
  });

  useEffect(() => {
    if (!selectedId && discoveries.length > 0) setSelectedId(discoveries[0].id);
  }, [discoveries, selectedId]);

  const selected = useMemo(
    () => discoveries.find(d => d.id === selectedId) || discoveries[0] || null,
    [discoveries, selectedId]
  );

  if (!projectId) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Projeto não informado.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6 lg:p-8 space-y-6">
      <AgilPageHeader icon={Search} title="Discovery" projectName={project?.name}>
        {discoveries.length > 1 && (
          <Select value={selected?.id || ''} onValueChange={setSelectedId}>
            <SelectTrigger className="h-9 w-56 bg-slate-800 border-slate-700 text-slate-200"><SelectValue placeholder="Discovery" /></SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
              {discoveries.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </AgilPageHeader>

      <AgilDiscoveryPanel project={project} discovery={selected} onChanged={() => {}} />

      <InternalDiscoveryTab projectId={projectId} />
    </div>
  );
}