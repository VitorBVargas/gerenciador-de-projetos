import React from 'react';
import InternalDiscoveryTab from '@/components/internal/InternalDiscoveryTab';

// Discovery do módulo Ágil — reaproveita o Discovery já existente (mesma UX/componentes).
export default function AgilDiscovery() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');

  if (!projectId) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Projeto não informado.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6 lg:p-8">
      <InternalDiscoveryTab projectId={projectId} />
    </div>
  );
}