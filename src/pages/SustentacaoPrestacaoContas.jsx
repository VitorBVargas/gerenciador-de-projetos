import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import ObrigacoesLegais from '../components/prestacao/ObrigacoesLegais';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAvailableEntities } from '@/lib/entityRegistry';

export default function SustentacaoPrestacaoContas() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');
  const [selectedEntityId, setSelectedEntityId] = useState('');

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => base44.entities.Project.filter({ id: projectId }).then(r => r[0] || null),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: entities = [] } = useQuery({
    queryKey: ['entities', projectId],
    queryFn: () => base44.entities.Entidade.filter({ project_id: projectId }),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['products', projectId],
    queryFn: () => base44.entities.Product.filter({ project_id: projectId }),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  const availableEntities = useMemo(() => getAvailableEntities(entities, produtos), [entities, produtos]);

  useEffect(() => {
    if (availableEntities.length > 0 && !availableEntities.some(entity => entity.id === selectedEntityId)) {
      setSelectedEntityId(availableEntities[0].id);
    }
  }, [availableEntities, selectedEntityId]);

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
      ) : availableEntities.length === 0 ? (
        <ObrigacoesLegais projectId={projectId} project={project} />
      ) : (
        <Tabs value={selectedEntityId} onValueChange={setSelectedEntityId} className="space-y-4">
          {availableEntities.map((entity) => (
            <TabsContent key={entity.id} value={entity.id} className="mt-0">
              <ObrigacoesLegais
                projectId={projectId}
                project={project}
                entity={entity}
                allEntities={availableEntities}
                entityTabs={
                  <TabsList className="h-auto justify-start overflow-x-auto bg-slate-800/70 p-1 mb-4">
                    {availableEntities.map((e) => (
                      <TabsTrigger
                        key={e.id}
                        value={e.id}
                        className="min-w-fit bg-transparent text-slate-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                      >
                        {e.nome}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                }
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}