import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ShieldAlert, CheckCircle2, ExternalLink, Wrench } from 'lucide-react';
import { parseISO } from 'date-fns';
import { createPageUrl } from '../../utils';
import { avaliarRiscoCND } from '../prestacao/CNDStatus';

const MESES_NOMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Nomes das obrigações que compõem um "mês enviado"
const OBRIG_BALANCETE = ['balancete'];
const OBRIG_AM = ['am', 'ata'];

const matchNome = (nome = '', chaves) => {
  const n = nome.toLowerCase();
  return chaves.some(k => n.includes(k));
};

const foiEnviado = (o) => o.status === 'enviado' || o.status === 'aceito';

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

  // Meses enviados: um mês (competência) conta como enviado quando Balancete + AM estão entregues
  const mesesEnviados = useMemo(() => {
    // Agrupa por competência MM/AAAA
    const porComp = {};
    obrigacoes.forEach(o => {
      if (!o.competencia || !o.competencia.includes('/')) return;
      if (!porComp[o.competencia]) porComp[o.competencia] = [];
      porComp[o.competencia].push(o);
    });

    return Object.entries(porComp)
      .filter(([, lista]) => {
        const balancete = lista.find(o => matchNome(o.nome, OBRIG_BALANCETE));
        const am = lista.find(o => matchNome(o.nome, OBRIG_AM));
        return balancete && am && foiEnviado(balancete) && foiEnviado(am);
      })
      .map(([comp]) => {
        const [mesStr, anoStr] = comp.split('/');
        const mes = parseInt(mesStr, 10) - 1;
        return { comp, mes, ano: parseInt(anoStr, 10), nome: MESES_NOMES[mes] || comp };
      })
      .sort((a, b) => a.ano - b.ano || a.mes - b.mes);
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

        {/* Meses enviados da Prestação de Contas (Balancete + AM entregues) */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-slate-300 font-semibold uppercase tracking-wider">Meses Enviados</span>
          </div>
          {mesesEnviados.length === 0 ? (
            <p className="text-xs text-slate-500">Nenhum mês concluído ainda.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {mesesEnviados.map(m => (
                <span
                  key={m.comp}
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                >
                  {m.nome}
                </span>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}