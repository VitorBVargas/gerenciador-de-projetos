import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Headphones, ChevronRight, AlertOctagon } from 'lucide-react';
import { createPageUrl } from '../../utils';

const ABERTOS_STATUS = ['aberto', 'em_andamento', 'aguardando_cliente'];

export default function ChamadosResumo({ chamados = [], projectId }) {
  const total = chamados.length;
  const internos = chamados.filter(c => c.tipo === 'interno');
  const externos = chamados.filter(c => c.tipo === 'externo');
  const abertos = chamados.filter(c => ABERTOS_STATUS.includes(c.status));
  const bloqueadores = chamados.filter(c => c.is_bloqueador && ABERTOS_STATUS.includes(c.status));

  const cards = [
    { label: 'Total', value: total, color: 'text-white', bg: 'bg-slate-700/50' },
    { label: 'Internos', value: internos.length, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Externos', value: externos.length, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Em Aberto', value: abertos.length, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  ];

  return (
    <Card className="bg-slate-800/60 border-slate-700/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Headphones className="w-4 h-4 text-cyan-400" /> Chamados
          </span>
          <a href={createPageUrl(`SustentacaoProdutos?project_id=${projectId}`)}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-normal">
            Ver chamados <ChevronRight className="w-3 h-3" />
          </a>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cards.map(c => (
            <div key={c.label} className={`rounded-xl p-4 text-center ${c.bg}`}>
              <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>

        {bloqueadores.length > 0 && (
          <div className="mt-3 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            <AlertOctagon className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-sm text-red-300">
              {bloqueadores.length} chamado(s) bloqueador(es) em aberto
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}