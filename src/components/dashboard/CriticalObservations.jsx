import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Target, CalendarDays, Users, Video } from 'lucide-react';
import { format, parseISO, isAfter, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const IMPACTO_CFG = {
  baixo: { label: 'Baixo', color: 'text-slate-400', bg: 'bg-slate-700/60' },
  medio: { label: 'Médio', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  alto:  { label: 'Alto',  color: 'text-red-400',    bg: 'bg-red-500/10' },
};
const DEC_STATUS = {
  pendente:     { label: 'Pendente',     color: 'text-slate-400' },
  em_andamento: { label: 'Em andamento', color: 'text-blue-400' },
  concluida:    { label: 'Concluída',    color: 'text-emerald-400' },
  cancelada:    { label: 'Cancelada',    color: 'text-red-400' },
};

export default function CriticalObservations({ projectId }) {
  const { data: decisoes = [] } = useQuery({
    queryKey: ['decisoes', projectId],
    queryFn: () => base44.entities.Decisao.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: reunioes = [] } = useQuery({
    queryKey: ['reunioes', projectId],
    queryFn: () => base44.entities.Reuniao.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const now = new Date();
  const proximas = reunioes
    .filter(r => r.status === 'agendada' && r.data && isAfter(parseISO(r.data), now))
    .sort((a, b) => a.data.localeCompare(b.data));
  const proxima = proximas[0] || null;

  const criticas = [...decisoes]
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''))
    .slice(0, 6);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Observações Críticas */}
      <Card className="bg-slate-800/50 border-slate-700/50 lg:col-span-2">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-semibold text-white">Observações Críticas</h3>
          </div>
          {criticas.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">Nenhuma observação registrada.</p>
          ) : (
            <div className="space-y-2">
              {criticas.map(d => {
                const icfg = IMPACTO_CFG[d.impacto] || IMPACTO_CFG.medio;
                const scfg = DEC_STATUS[d.status] || DEC_STATUS.pendente;
                return (
                  <div key={d.id} className="bg-slate-700/40 rounded-lg px-3 py-2.5">
                    <p className="text-sm text-white leading-relaxed line-clamp-2">{d.descricao}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {d.data && <span className="text-xs text-slate-500">{format(parseISO(d.data), 'dd/MM/yyyy')}</span>}
                      {d.responsavel && <span className="text-xs text-slate-400">• {d.responsavel}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${icfg.bg} ${icfg.color}`}>{icfg.label}</span>
                      <span className={`text-xs font-medium ${scfg.color}`}>{scfg.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Próxima Reunião */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-semibold text-white">Próxima Reunião</h3>
          </div>
          {!proxima ? (
            <p className="text-sm text-slate-500 py-6 text-center">Nenhuma reunião agendada.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-base font-semibold text-white">{proxima.titulo}</p>
                <p className="text-sm text-slate-400 mt-1">
                  {format(parseISO(proxima.data), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                  {proxima.horario && ` às ${proxima.horario}`}
                </p>
              </div>
              {(() => {
                const days = differenceInDays(parseISO(proxima.data), now);
                return (
                  <span className={`inline-block text-xs px-2.5 py-1 rounded-full border ${days === 0 ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : days <= 2 ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'}`}>
                    {days === 0 ? 'Hoje' : `Em ${days} dia${days > 1 ? 's' : ''}`}
                  </span>
                );
              })()}
              {proxima.responsavel && (
                <p className="text-xs text-slate-500">Responsável: <span className="text-slate-300">{proxima.responsavel}</span></p>
              )}
              {proxima.participantes && (
                <p className="text-xs text-slate-500 flex items-start gap-1">
                  <Users className="w-3 h-3 mt-0.5 flex-shrink-0" />{proxima.participantes}
                </p>
              )}
              {proxima.objetivo && <p className="text-xs text-slate-400 italic">🎯 {proxima.objetivo}</p>}
              {proxima.link_gravacao && (
                <a href={proxima.link_gravacao} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
                  <Video className="w-3.5 h-3.5" /> Link da reunião
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}