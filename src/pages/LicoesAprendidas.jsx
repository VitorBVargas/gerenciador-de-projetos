import React from 'react';
import LicoesAprendidas from '@/components/licoes/LicoesAprendidas';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function LicoesAprendidasPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 5 * 60 * 1000,
  });

  const activeProject = projects.find(p => p.id === projectId);

  if (!projectId) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">Selecione um projeto para ver as lições aprendidas.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <LicoesAprendidas
        projectId={projectId}
        portfolio={activeProject?.portfolio}
      />
    </div>
  );
}