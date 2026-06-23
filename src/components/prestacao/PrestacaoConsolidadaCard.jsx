import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart2 } from 'lucide-react';
import { OBRIGACOES_ANUAIS, mesPertence } from './periodicidade';

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

// Mapeia status da obrigação para a cor do semáforo do quadro consolidado
const STATUS_COLOR = {
  enviado:   { fill: 'bg-emerald-500',  label: 'Enviado',          legend: 'bg-emerald-500' },
  aceito:    { fill: 'bg-emerald-500',  label: 'Enviado',          legend: 'bg-emerald-500' },
  rejeitado: { fill: 'bg-red-500',      label: 'Pendente envio',   legend: 'bg-red-500' },
  em_elaboracao: { fill: 'bg-yellow-400', label: 'Em elaboração',  legend: 'bg-yellow-400' },
};

function getCellState(o, mesIdx, mesAtual, anoExercicio, anoAtual) {
  // Sem registro válido
  const hasData = o && o.status && o.status !== 'nao_iniciado';
  if (hasData) {
    if (o.status === 'enviado') return 'enviado';
    if (o.status === 'aceito') return 'teste';
    if (o.status === 'rejeitado') return 'pendente';
    if (o.status === 'em_elaboracao') return 'elaboracao';
    return 'vazio';
  }
  // Mês atual sem dados → não marca como pendente (apenas a borda amarela o destaca)
  if (anoExercicio === anoAtual && mesIdx === mesAtual) return 'vazio';
  // Meses passados sem dados → pendente de envio
  if (anoExercicio < anoAtual) return 'pendente';
  if (anoExercicio === anoAtual && mesIdx < mesAtual) return 'pendente';
  return 'vazio';
}

const CELL_CLASS = {
  enviado:    'bg-emerald-500',
  teste:      'bg-blue-500',
  pendente:   'bg-red-500',
  elaboracao: 'bg-yellow-400',
  vazio:      'bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center',
  ausente:    'bg-transparent border border-slate-700/20',
};

export default function PrestacaoConsolidadaCard({ obrigacoes = [], produtos = [] }) {
  // Tipos de obrigação que possuem registros
  const tipos = useMemo(() => {
    const set = new Set(obrigacoes.map(o => o.nome).filter(Boolean));
    return Array.from(set).sort();
  }, [obrigacoes]);

  // Anos disponíveis (exercícios). Anuais contam para o exercício anterior à sua competência.
  const anos = useMemo(() => {
    const set = new Set();
    obrigacoes.forEach(o => {
      const [, y] = (o.competencia || '').split('/');
      if (!y) return;
      const ano = OBRIGACOES_ANUAIS.includes(o.nome) ? Number(y) - 1 : Number(y);
      set.add(ano);
    });
    set.add(new Date().getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [obrigacoes]);

  const [selectedTipo, setSelectedTipo] = useState('__todos__');
  const [selectedAno, setSelectedAno] = useState(anos[0]);

  const isTodos = selectedTipo === '__todos__';
  const tipo = !isTodos && tipos.includes(selectedTipo) ? selectedTipo : tipos[0];
  const ano = anos.includes(selectedAno) ? selectedAno : anos[0];

  // Entidades = produtos com prestação de contas (uma linha por entidade)
  const entidades = useMemo(() => {
    const seen = new Map();
    produtos
      .filter(p => p.prestacao_contas)
      .forEach(p => {
        const key = p.entity_full_name || p.entity || p.name;
        if (key && !seen.has(key)) seen.set(key, p);
      });
    return Array.from(seen.keys());
  }, [produtos]);

  const now = new Date();
  const mesAtual = now.getMonth(); // 0-11
  const anoAtual = now.getFullYear();

  // Obrigações do tipo/ano selecionado, indexadas por mês (0-11)
  const obrigacoesPorMes = useMemo(() => {
    if (!tipo) return {};
    const isAnual = OBRIGACOES_ANUAIS.includes(tipo);
    const map = {};
    obrigacoes
      .filter(o => o.nome === tipo)
      .forEach(o => {
        const [m, y] = (o.competencia || '').split('/');
        if (!m || !y) return;
        const exercicio = isAnual ? Number(y) - 1 : Number(y);
        if (exercicio !== ano) return;
        const mesIdx = isAnual ? 0 : Number(m) - 1;
        map[mesIdx] = o;
      });
    return map;
  }, [obrigacoes, tipo, ano]);

  // Para o modo "Todos": uma linha por tipo, indexada por mês (0-11)
  const todosPorTipo = useMemo(() => {
    return tipos.map(t => {
      const isAnual = OBRIGACOES_ANUAIS.includes(t);
      const map = {};
      obrigacoes
        .filter(o => o.nome === t)
        .forEach(o => {
          const [m, y] = (o.competencia || '').split('/');
          if (!m || !y) return;
          const exercicio = isAnual ? Number(y) - 1 : Number(y);
          if (exercicio !== ano) return;
          const mesIdx = isAnual ? 0 : Number(m) - 1;
          map[mesIdx] = o;
        });
      return { tipo: t, porMes: map };
    });
  }, [obrigacoes, tipos, ano]);

  // "Mês consolidado" = último mês com tudo enviado/aceito
  const mesConsolidado = useMemo(() => {
    let last = -1;
    for (let i = 0; i < 12; i++) {
      const o = obrigacoesPorMes[i];
      if (o && (o.status === 'enviado' || o.status === 'aceito')) last = i;
    }
    return last;
  }, [obrigacoesPorMes]);

  if (tipos.length === 0) {
    return (
      <Card className="bg-slate-800/60 border-slate-700/50">
        <CardContent className="py-10 text-center text-slate-500 text-sm">
          Nenhuma obrigação legal cadastrada para consolidar.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/60 border-slate-700/50 overflow-hidden">
      {/* Cabeçalho com legenda */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-700/60 to-slate-800/40 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-blue-400" />
          <span className="text-white font-bold text-lg">Quadro Consolidado — Prestação de Contas</span>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-[11px] font-semibold">
          <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> ENVIADO OFICIAL</span>
          <span className="flex items-center gap-1.5 text-blue-400"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> ENVIADO TESTE</span>
          <span className="flex items-center gap-1.5 text-red-400"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> PENDENTE ENVIO</span>
          <span className="flex items-center gap-1.5 text-yellow-400"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> EM ELABORAÇÃO</span>
          <span className="flex items-center gap-1.5 text-indigo-300"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500/40 border border-indigo-400/60" /> AGUARDANDO</span>
          <span className="flex items-center gap-1.5 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> NÃO SE APLICA</span>
        </div>
      </div>

      <CardContent className="p-5 space-y-4">
        {/* Seletores: tipo de obrigação e exercício */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedTipo('__todos__')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              isTodos ? 'bg-emerald-600 text-white' : 'bg-slate-600/60 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Todos
          </button>
          {tipos.map(t => (
            <button
              key={t}
              onClick={() => setSelectedTipo(t)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                !isTodos && t === tipo ? 'bg-emerald-600 text-white' : 'bg-slate-600/60 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {t}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            {anos.map(a => (
              <button
                key={a}
                onClick={() => setSelectedAno(a)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  a === ano ? 'bg-blue-600 text-white' : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Título do mês consolidado */}
        <p className="text-blue-300 font-bold uppercase tracking-wide text-sm">
          {isTodos
            ? <>Todas as Obrigações <span className="text-slate-500">({ano})</span></>
            : <>Mês Consolidado: {mesConsolidado >= 0 ? MESES[mesConsolidado] : '—'} <span className="text-slate-500">({ano})</span></>
          }
        </p>

        {/* Grade de meses */}
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Header de meses */}
            <div className="grid grid-cols-[180px_repeat(12,1fr)] gap-1 mb-1">
              <div />
              {MESES.map((m, i) => (
                <div key={m} className={`text-center text-xs font-bold ${i === mesAtual && ano === anoAtual ? 'text-yellow-400' : 'text-slate-400'}`}>
                  {m}
                </div>
              ))}
            </div>

            {/* Modo Todos: uma linha por tipo de obrigação */}
            {isTodos && todosPorTipo.map(({ tipo: t, porMes }, rowIdx) => (
              <div key={rowIdx} className="grid grid-cols-[180px_repeat(12,1fr)] gap-1 mb-1.5 items-stretch">
                <div className="flex items-center pr-2">
                  <span className="text-xs text-slate-300 font-medium truncate bg-slate-700/40 rounded-full px-3 py-2 w-full" title={t}>
                    {t}
                  </span>
                </div>
                {MESES.map((m, i) => {
                  const o = porMes[i];
                  // Mês fora da periodicidade da obrigação → isento (não se aplica)
                  if (!mesPertence(t, i)) {
                    return (
                      <div
                        key={i}
                        className="h-8 rounded-md bg-transparent border border-slate-700/20"
                        title={`${t} — ${m}/${ano}: não se aplica`}
                      />
                    );
                  }
                  const state = getCellState(o, i, mesAtual, ano, anoAtual);
                  return (
                    <div
                      key={i}
                      className={`h-8 rounded-md ${CELL_CLASS[state]} transition-colors`}
                      title={`${t} — ${m}/${ano}${o?.status ? ` — ${o.status}` : state === 'vazio' ? ' — aguardando' : ''}`}
                    >
                      {state === 'vazio' && <span className="text-indigo-300 text-xs font-bold">—</span>}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Modo por tipo: linhas por entidade (ou linha única do tipo) */}
            {!isTodos && (entidades.length > 0 ? entidades : [tipo]).map((ent, rowIdx) => (
              <div key={rowIdx} className="grid grid-cols-[180px_repeat(12,1fr)] gap-1 mb-1.5 items-stretch">
                <div className="flex items-center pr-2">
                  <span className="text-xs text-slate-300 font-medium truncate bg-slate-700/40 rounded-full px-3 py-2 w-full" title={ent}>
                    {ent}
                  </span>
                </div>
                {MESES.map((m, i) => {
                  const o = obrigacoesPorMes[i];
                  // Mês fora da periodicidade da obrigação → isento (não se aplica)
                  if (!mesPertence(tipo, i)) {
                    return (
                      <div
                        key={i}
                        className="h-8 rounded-md bg-transparent border border-slate-700/20"
                        title={`${m}/${ano}: não se aplica`}
                      />
                    );
                  }
                  const state = getCellState(o, i, mesAtual, ano, anoAtual);
                  return (
                    <div
                      key={i}
                      className={`h-8 rounded-md ${CELL_CLASS[state]} transition-colors`}
                      title={`${m}/${ano}${o?.status ? ` — ${o.status}` : state === 'vazio' ? ' — aguardando' : ''}`}
                    >
                      {state === 'vazio' && <span className="text-indigo-300 text-xs font-bold">—</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}