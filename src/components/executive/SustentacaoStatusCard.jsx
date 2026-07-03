import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ShieldAlert, ClipboardList, ExternalLink, Wrench } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { createPageUrl } from '../../utils';
import { avaliarRiscoCND } from '../prestacao/CNDStatus';

const RISCO_CFG = {
  baixo: { label: 'Baixo risco', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  medio: { label: 'Risco moderado', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  alto: { label: 'Risco alto', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  indefinido: { label: 'Sem dados', color: 'text-slate-400', bg: 'bg-slate-700/40 border-slate-600/30' },
};

export default function SustentacaoStatusCard({ project, obrigacoes = [] }) {
  const cndAtiva = project?.cnd_ativa !== false;
  const risco = useMemo(() => avaliarRiscoCND(obrigacoes), [obrigacoes]);
  const riscoCfg = RISCO_CFG[risco.nivel] || RISCO_CFG.indefinido;

  // Próximos envios: obrigações ainda não entregues, ordenadas pela data limite mais próxima
  const proximosEnvios = useMemo(() => {
    return obrigacoes
      .filter(o => o.status !== 'enviado' && o.status !== 'aceito' && o.data_limite)
      .map(o => ({ ...o, dias: differenceInDays(parseISO(o.data_limite), new Date()) }))
      .sort((a, b) => a.dias - b.dias)
      .slice(0, 4);
  }, [obrigacoes]);

  return (
    <Card className="bg-slate-800 border-purple-600/40 hover:bg-slate-700/70 transition-all h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Wrench className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
              <span className="text-[10px] uppercase tracking-wider text-purple-300 font-semibold">Sustentação</span>
            </div>
            <CardTitle className="text-lg text-white truncate">{project.name}</CardTitle>
            {project.manager && <p className="text-xs text-slate-400 mt-0.5">Resp.: {project.manager}</p>}
          </div>
          <Button
            size="icon"
            onClick={() => { window.location.href = createPageUrl(`SustentacaoDashboard?project_id=${project.id}`); }}
            className="h-8 w-8 bg-purple-800/50 hover:bg-purple-700 border border-purple-600/40 shrink-0"
            title="Abrir sustentação"
          >
            <ExternalLink className="w-4 h-4 text-purple-300" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* CND */}
        <div className={`rounded-lg border px-3 py-2 flex items-center gap-2 ${cndAtiva ? 'bg-emerald-900/10 border-emerald-500/40' : 'bg-red-900/10 border-red-500/40'}`}>
          {cndAtiva
            ? <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            : <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Certidão CND</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cndAtiva ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                {cndAtiva ? 'ATIVA' : 'INATIVA'}
              </span>
            </div>
            <span className={`text-xs ${riscoCfg.color}`}>{riscoCfg.label}</span>
          </div>
        </div>

        {/* Próximos envios da Prestação de Contas */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <ClipboardList className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs text-slate-300 font-semibold uppercase tracking-wider">Próximos Envios</span>
          </div>
          {proximosEnvios.length === 0 ? (
            <p className="text-xs text-emerald-400">Nenhum envio pendente.</p>
          ) : (
            <div className="space-y-1.5">
              {proximosEnvios.map(o => {
                const overdue = o.dias < 0;
                const soon = o.dias >= 0 && o.dias <= 7;
                const color = overdue ? 'text-red-400' : soon ? 'text-yellow-400' : 'text-slate-300';
                return (
                  <div key={o.id || `${o.nome}-${o.competencia}`} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-white truncate">{o.nome} <span className="text-slate-500">({o.competencia})</span></span>
                    <span className={`font-semibold flex-shrink-0 ${color}`}>
                      {overdue ? `${Math.abs(o.dias)}d atr.` : o.dias === 0 ? 'Hoje' : `${o.dias}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}