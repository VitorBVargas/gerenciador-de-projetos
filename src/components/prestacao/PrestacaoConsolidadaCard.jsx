import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart2 } from 'lucide-react';
import { OBRIGACOES_ANUAIS, mesPertence } from './periodicidade';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { entityMatchesObligation, getAvailableEntities } from '@/lib/entityRegistry';

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

function getCellState(o, mesIdx, mesAtual, anoExercicio, anoAtual) {
  const hasData = o && o.status && o.status !== 'nao_iniciado';
  if (hasData) {
    if (o.status === 'enviado') return 'enviado';
    if (o.status === 'aceito') return 'teste';
    if (o.status === 'rejeitado') return 'pendente';
    if (o.status === 'em_elaboracao') return 'elaboracao';
    return 'vazio';
  }
  if (anoExercicio === anoAtual && mesIdx === mesAtual) return 'vazio';
  if (anoExercicio < anoAtual) return 'pendente';
  if (anoExercicio === anoAtual && mesIdx < mesAtual) return 'pendente';
  return 'vazio';
}

const CELL_CLASS = {
  enviado: 'bg-emerald-500',
  teste: 'bg-blue-500',
  pendente: 'bg-red-500',
  elaboracao: 'bg-yellow-400',
  vazio: 'bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center',
};

const FLAG_CLASS = {
  enviado: 'bg-emerald-500 text-white',
  teste: 'bg-blue-500 text-white',
  pendente: 'bg-red-500 text-white',
  elaboracao: 'bg-yellow-400 text-slate-900',
  vazio: 'bg-indigo-500/40 text-indigo-100 border border-indigo-400/60',
};

function aggregateState(states) {
  if (states.includes('pendente')) return 'pendente';
  if (states.includes('elaboracao')) return 'elaboracao';
  if (states.includes('vazio')) return 'vazio';
  if (states.includes('teste')) return 'teste';
  if (states.includes('enviado')) return 'enviado';
  return 'vazio';
}

export default function PrestacaoConsolidadaCard({ obrigacoes = [], produtos = [], entidades = [] }) {
  const availableEntities = useMemo(() => getAvailableEntities(entidades, produtos), [entidades, produtos]);
  const [selectedTipo, setSelectedTipo] = useState('__todos__');
  const [selectedAno, setSelectedAno] = useState(new Date().getFullYear());
  const [selectedEntityId, setSelectedEntityId] = useState('');

  useEffect(() => {
    if (availableEntities.length > 0 && selectedEntityId !== '__todos__' && !availableEntities.some(entity => entity.id === selectedEntityId)) {
      setSelectedEntityId('__todos__');
    }
  }, [availableEntities, selectedEntityId]);

  const selectedEntity = useMemo(() => {
    if (selectedEntityId === '__todos__') return null;
    return availableEntities.find(entity => entity.id === selectedEntityId) || null;
  }, [availableEntities, selectedEntityId]);

  const isAllEntities = selectedEntityId === '__todos__';

  const filteredObrigacoes = useMemo(() => {
    if (!selectedEntity) return obrigacoes;
    return obrigacoes.filter(obrigacao => entityMatchesObligation(obrigacao, selectedEntity, availableEntities));
  }, [obrigacoes, selectedEntity, availableEntities]);

  const tipos = useMemo(() => {
    const set = new Set(filteredObrigacoes.map(o => o.nome).filter(Boolean));
    return Array.from(set).sort();
  }, [filteredObrigacoes]);

  const anos = useMemo(() => {
    const set = new Set();
    filteredObrigacoes.forEach(o => {
      const [, y] = (o.competencia || '').split('/');
      if (!y) return;
      const ano = OBRIGACOES_ANUAIS.includes(o.nome) ? Number(y) - 1 : Number(y);
      set.add(ano);
    });
    set.add(new Date().getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [filteredObrigacoes]);

  useEffect(() => {
    if (anos.length > 0 && !anos.includes(selectedAno)) {
      setSelectedAno(anos[0]);
    }
  }, [anos, selectedAno]);

  const isTodos = selectedTipo === '__todos__';
  const tipo = !isTodos && tipos.includes(selectedTipo) ? selectedTipo : tipos[0];
  const ano = anos.includes(selectedAno) ? selectedAno : anos[0];
  const now = new Date();
  const mesAtual = now.getMonth();
  const anoAtual = now.getFullYear();

  const obrigacoesPorMes = useMemo(() => {
    if (!tipo) return {};
    const isAnual = OBRIGACOES_ANUAIS.includes(tipo);
    const map = {};
    filteredObrigacoes
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
  }, [filteredObrigacoes, tipo, ano]);

  const todosPorTipo = useMemo(() => {
    const entitiesToUse = isAllEntities
      ? (availableEntities.length > 0 ? availableEntities : [null])
      : (selectedEntity ? [selectedEntity] : [null]);
    return tipos.map((tipoNome) => {
      const isAnual = OBRIGACOES_ANUAIS.includes(tipoNome);
      const porMesPorEntidade = {};
      entitiesToUse.forEach((ent) => {
        const entityKey = ent?.id || '__none__';
        porMesPorEntidade[entityKey] = { entity: ent, porMes: {} };
        filteredObrigacoes
          .filter(o => o.nome === tipoNome)
          .filter(o => entityMatchesObligation(o, ent, availableEntities))
          .forEach(o => {
            const [m, y] = (o.competencia || '').split('/');
            if (!m || !y) return;
            const exercicio = isAnual ? Number(y) - 1 : Number(y);
            if (exercicio !== ano) return;
            const mesIdx = isAnual ? 0 : Number(m) - 1;
            porMesPorEntidade[entityKey].porMes[mesIdx] = o;
          });
      });
      return { tipo: tipoNome, porMesPorEntidade };
    });
  }, [filteredObrigacoes, tipos, ano, availableEntities]);

  const mesConsolidado = useMemo(() => {
    let last = -1;
    for (let i = 0; i < 12; i++) {
      const obrigacao = obrigacoesPorMes[i];
      if (obrigacao && (obrigacao.status === 'enviado' || obrigacao.status === 'aceito')) last = i;
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
      <div className="px-5 py-4 bg-gradient-to-r from-slate-700/60 to-slate-800/40 border-b border-slate-700/50">
        <div className="flex items-center gap-2 mb-2">
          <BarChart2 className="w-5 h-5 text-blue-400" />
          <span className="text-white font-bold text-lg">Quadro Consolidado — Prestação de Contas</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold">
          <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> ENVIADO OFICIAL</span>
          <span className="flex items-center gap-1.5 text-blue-400"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> ENVIADO TESTE</span>
          <span className="flex items-center gap-1.5 text-red-400"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> PENDENTE ENVIO</span>
          <span className="flex items-center gap-1.5 text-yellow-400"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> EM ELABORAÇÃO</span>
          <span className="flex items-center gap-1.5 text-indigo-300"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500/40 border border-indigo-400/60" /> AGUARDANDO</span>
        </div>
      </div>

      <CardContent className="p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedTipo('__todos__')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${isTodos ? 'bg-emerald-600 text-white' : 'bg-slate-600/60 text-slate-300 hover:bg-slate-600'}`}
          >
            Todos
          </button>
          {tipos.map(tipoNome => (
            <button
              key={tipoNome}
              onClick={() => setSelectedTipo(tipoNome)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${!isTodos && tipoNome === tipo ? 'bg-emerald-600 text-white' : 'bg-slate-600/60 text-slate-300 hover:bg-slate-600'}`}
            >
              {tipoNome}
            </button>
          ))}
          {availableEntities.length > 0 && (
            <div className="ml-auto min-w-[220px]">
              <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                <SelectTrigger className="bg-slate-700/60 border-slate-600 text-white">
                  <SelectValue placeholder="Filtrar entidade" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  <SelectItem value="__todos__">Todas as entidades</SelectItem>
                  {availableEntities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>{entity.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            {anos.map(itemAno => (
              <button
                key={itemAno}
                onClick={() => setSelectedAno(itemAno)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${itemAno === ano ? 'bg-blue-600 text-white' : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'}`}
              >
                {itemAno}
              </button>
            ))}
          </div>
        </div>

        <p className="text-blue-300 font-bold uppercase tracking-wide text-sm">
          {isTodos
            ? <>{selectedEntity ? selectedEntity.nome : 'Todas as Obrigações'} <span className="text-slate-500">({ano})</span></>
            : <>Mês Consolidado: {mesConsolidado >= 0 ? MESES[mesConsolidado] : '—'} <span className="text-slate-500">({ano})</span></>
          }
        </p>

        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[180px_repeat(12,1fr)] gap-1 mb-1">
              <div />
              {MESES.map((mes, index) => (
                <div key={mes} className={`text-center text-xs font-bold ${index === mesAtual && ano === anoAtual ? 'text-yellow-400' : 'text-slate-400'}`}>
                  {mes}
                </div>
              ))}
            </div>

            {isTodos && todosPorTipo.map(({ tipo: tipoNome, porMesPorEntidade }) => {
              const entityEntries = Object.values(porMesPorEntidade);
              const multiEntity = isAllEntities && availableEntities.length > 1;
              return (
                <div key={tipoNome} className="grid grid-cols-[180px_repeat(12,1fr)] gap-1 mb-1.5 items-stretch">
                  <div className="flex items-center pr-2">
                    <span className="text-xs text-slate-300 font-medium truncate bg-slate-700/40 rounded-full px-3 py-2 w-full" title={tipoNome}>
                      {tipoNome}
                    </span>
                  </div>
                  {MESES.map((mes, index) => {
                    if (!mesPertence(tipoNome, index)) {
                      return <div key={index} className="h-8 rounded-md bg-transparent border border-slate-700/20" title={`${tipoNome} — ${mes}/${ano}: não se aplica`} />;
                    }
                    const perEntityStates = entityEntries.map(({ entity, porMes }) => ({
                      entity,
                      state: getCellState(porMes[index], index, mesAtual, ano, anoAtual),
                    }));
                    const aggState = aggregateState(perEntityStates.map(e => e.state));
                    const titleParts = perEntityStates
                      .map(({ entity, state }) => `${entity?.nome || '—'}: ${state}`)
                      .join(' · ');
                    return (
                      <div
                        key={index}
                        className={`relative h-8 rounded-md ${CELL_CLASS[aggState]} transition-colors`}
                        title={`${tipoNome} — ${mes}/${ano}${multiEntity ? ` — ${titleParts}` : ''}`}
                      >
                        {aggState === 'vazio' && !multiEntity && <span className="text-indigo-300 text-xs font-bold">—</span>}
                        {multiEntity && (
                          <div className="absolute top-0.5 left-0.5 flex gap-0.5">
                            {perEntityStates.filter(({ entity }) => entity?.nome).map(({ entity, state }) => (
                              <span
                                key={entity?.id || 'none'}
                                className={`text-[8px] leading-none font-bold px-1 py-0.5 rounded ${FLAG_CLASS[state]}`}
                                title={`${entity.nome}: ${state}`}
                              >
                                {entity.nome.slice(0, 3).toUpperCase()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {!isTodos && (() => {
              const tipoAtivo = tipo;
              const isAnualTipo = OBRIGACOES_ANUAIS.includes(tipoAtivo);
              const multiEntity = isAllEntities && availableEntities.length > 1;
              const entitiesToUse = isAllEntities
                ? (availableEntities.length > 0 ? availableEntities : [null])
                : (selectedEntity ? [selectedEntity] : [null]);

              const porMesPorEntidade = {};
              entitiesToUse.forEach(ent => {
                const entityKey = ent?.id || '__none__';
                porMesPorEntidade[entityKey] = { entity: ent, porMes: {} };
                obrigacoes
                  .filter(o => o.nome === tipoAtivo)
                  .filter(o => entityMatchesObligation(o, ent, availableEntities))
                  .forEach(o => {
                    const [m, y] = (o.competencia || '').split('/');
                    if (!m || !y) return;
                    const exercicio = isAnualTipo ? Number(y) - 1 : Number(y);
                    if (exercicio !== ano) return;
                    const mesIdx = isAnualTipo ? 0 : Number(m) - 1;
                    porMesPorEntidade[entityKey].porMes[mesIdx] = o;
                  });
              });

              const entityEntries = Object.values(porMesPorEntidade);

              return (
                <div className="grid grid-cols-[180px_repeat(12,1fr)] gap-1 mb-1.5 items-stretch">
                  <div className="flex items-center pr-2">
                    <span className="text-xs text-slate-300 font-medium truncate bg-slate-700/40 rounded-full px-3 py-2 w-full" title={tipoAtivo}>
                      {tipoAtivo}
                    </span>
                  </div>
                  {MESES.map((mes, index) => {
                    if (!mesPertence(tipoAtivo, index)) {
                      return <div key={index} className="h-8 rounded-md bg-transparent border border-slate-700/20" title={`${mes}/${ano}: não se aplica`} />;
                    }
                    const perEntityStates = entityEntries.map(({ entity, porMes }) => ({
                      entity,
                      state: getCellState(porMes[index], index, mesAtual, ano, anoAtual),
                    }));
                    const aggState = aggregateState(perEntityStates.map(e => e.state));
                    const titleParts = perEntityStates.map(({ entity, state }) => `${entity?.nome || '—'}: ${state}`).join(' · ');
                    return (
                      <div
                        key={index}
                        className={`relative h-8 rounded-md ${CELL_CLASS[aggState]} transition-colors`}
                        title={`${tipoAtivo} — ${mes}/${ano}${multiEntity ? ` — ${titleParts}` : ''}`}
                      >
                        {aggState === 'vazio' && !multiEntity && <span className="text-indigo-300 text-xs font-bold">—</span>}
                        {multiEntity && (
                          <div className="absolute top-0.5 left-0.5 flex gap-0.5">
                            {perEntityStates.filter(({ entity }) => entity?.nome).map(({ entity, state }) => (
                              <span
                                key={entity?.id || 'none'}
                                className={`text-[8px] leading-none font-bold px-1 py-0.5 rounded ${FLAG_CLASS[state]}`}
                                title={`${entity.nome}: ${state}`}
                              >
                                {entity.nome.slice(0, 3).toUpperCase()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}