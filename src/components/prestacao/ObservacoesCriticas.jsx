import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function ObservacoesCriticas({ projectId }) {
  const { data: decisoes = [] } = useQuery({
    queryKey: ['decisoes', projectId],
    queryFn: () => base44.entities.Decisao.filter({ project_id: projectId }),
    enabled: !!projectId,
    staleTime: 60000,
  });

  const observacoesCriticas = useMemo(() =>
    decisoes
      .filter(d => d.impacto === 'alto' && d.status !== 'cancelada' && d.status !== 'concluida')
      .sort((a, b) => (b.data || '').localeCompare(a.data || '')),
    [decisoes]
  );

  if (observacoesCriticas.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-red-400" />
        <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider">Observações Críticas</h3>
      </div>
      {observacoesCriticas.map(d => (
        <div key={d.id} className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <p className="text-sm text-white leading-relaxed">{d.descricao}</p>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400">
            {d.data && <span>{format(parseISO(d.data), 'dd/MM/yyyy')}</span>}
            {d.responsavel && <span className="font-medium text-red-300">{d.responsavel}</span>}
            <span className="capitalize">{d.status?.replace('_', ' ')}</span>
          </div>
        </div>
      ))}
    </div>
  );
}