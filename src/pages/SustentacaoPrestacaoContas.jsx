import React, { useState, useMemo, useEffect } from 'react';
import { ClipboardList, Layers } from 'lucide-react';
import ObrigacoesLegais from '../components/prestacao/ObrigacoesLegais';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getPrestacaoVerticals } from '../components/prestacao/prestacaoVerticals';

export default function SustentacaoPrestacaoContas() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => base44.entities.Project.filter({ id: projectId }).then(r => r[0] || null),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['products', projectId],
    queryFn: () => projectId ? base44.entities.Product.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  const verticais = useMemo(() => getPrestacaoVerticals(produtos), [produtos]);
  const [activeVertical, setActiveVertical] = useState(null);

  useEffect(() => {
    if (verticais.length > 0 && !verticais.some(v => v.key === activeVertical)) {
      setActiveVertical(verticais[0].key);
    }
  }, [verticais, activeVertical]);

  // Quando há mais de uma vertical, filtramos por vertical. Com apenas uma (ou nenhuma),
  // mostramos tudo junto (vertical=null) para manter compatibilidade com dados antigos.
  const verticalProp = verticais.length > 1 ? activeVertical : null;

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
        <>
          {/* Sub-abas por vertical (apenas quando há mais de uma prestação de contas) */}
          {verticais.length > 1 && (
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <Layers className="w-4 h-4 text-slate-400" />
              {verticais.map(v => (
                <button
                  key={v.key}
                  onClick={() => setActiveVertical(v.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
                    activeVertical === v.key
                      ? 'bg-yellow-500 text-slate-900'
                      : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                  }`}
                  title={v.productName}
                >
                  {v.label}
                </button>
              ))}
            </div>
          )}

          <ObrigacoesLegais
            key={verticalProp || 'all'}
            projectId={projectId}
            project={project}
            vertical={verticalProp}
          />
        </>
      )}
    </div>
  );
}