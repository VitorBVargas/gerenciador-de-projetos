import React from 'react';
import { ClipboardList } from 'lucide-react';
import ObrigacoesLegais from '../components/prestacao/ObrigacoesLegais';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function SustentacaoPrestacaoContas() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => base44.entities.Project.filter({ id: projectId }).then(r => r[0] || null),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });


  return (
    <div className="p-6 lg:p-8 min-h-screen text-white">
      <div className="flex items-center gap-3 mb-6">
        <ClipboardList className="w-6 h-6 text-yellow-400" />
        <div>
          <h1 className="text-2xl font-bold">Prestação de Contas</h1>
          <p className="text-sm text-slate-400">Gestão das obrigações legais e conformidade regulatória</p>
        </div>
      </div>

      {!projectId ? (
        <div className="bg-slate-800 rounded-xl p-8 text-center text-slate-400">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Projeto não selecionado</p>
        </div>
      ) : (
        <ObrigacoesLegais projectId={projectId} project={project} />
      )}
    </div>
  );
}