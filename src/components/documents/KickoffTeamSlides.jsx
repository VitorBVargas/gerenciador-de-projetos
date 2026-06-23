import React from 'react';

// Mapeia código de entidade para nome completo exibido
const ENTITY_LABELS = {
  PM: 'Prefeitura Municipal',
  CM: 'Câmara Municipal',
  IPASI: 'Inst. de Previdência',
  IPREV: 'Inst. de Previdência',
  PREV: 'Inst. de Previdência',
};

// Verticais que entram nos slides técnicos (exclui papéis de gestão)
const GESTAO_VERTICALS = ['gestao_projetos', 'gestao_operacoes', 'coordenacao_tecnica', 'gerenciamento'];

const VERTICAL_LABELS = {
  arrecadacao: 'Arrecadação',
  compras: 'Compras / Contratos',
  contabil: 'Soluções Contábeis',
  pessoal: 'Pessoal / Folha',
  educacao: 'Educação',
  iss: 'ISS',
  parceiros: 'Parceiros',
  plataforma: 'Plataforma',
  saude: 'Saúde',
  atendimento: 'Atendimento',
  extensoes: 'Extensões',
  outros: 'Outros',
};

function entityLabel(code) {
  if (!code) return 'Geral';
  const key = code.trim().toUpperCase();
  return ENTITY_LABELS[key] || code;
}

function Avatar({ name }) {
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-200 to-cyan-200 border border-white shadow flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
      {name ? name.charAt(0).toUpperCase() : '?'}
    </div>
  );
}

function PersonChip({ name }) {
  return (
    <div className="flex items-center gap-2">
      <Avatar name={name} />
      <span className="bg-slate-100 border border-slate-200 rounded-full px-3 py-1 text-xs font-semibold text-slate-700 whitespace-nowrap">{name}</span>
    </div>
  );
}

// Gera slides técnicos por vertical. Cada slide tem colunas por entidade.
export default function KickoffTeamSlides({ team, products, gestao, Slide, SlideHeader }) {
  const tecnicos = team.filter(m => !GESTAO_VERTICALS.includes(m.vertical));
  if (tecnicos.length === 0) return null;

  // Agrupa técnicos por vertical
  const porVertical = {};
  tecnicos.forEach(m => {
    const v = m.vertical || 'outros';
    if (!porVertical[v]) porVertical[v] = [];
    porVertical[v].push(m);
  });

  // Produtos da vertical agrupados por entidade (para as responsabilidades)
  const produtosPorVerticalEntidade = (vertical, entity) => {
    return (products || [])
      .filter(p => p.vertical === vertical && (entityLabel(p.entity) === entityLabel(entity)))
      .map(p => p.name);
  };

  return (
    <>
      {Object.entries(porVertical).map(([vertical, membros]) => {
        // Agrupa membros desta vertical por entidade
        const porEntidade = {};
        membros.forEach(m => {
          const e = entityLabel(m.entity);
          if (!porEntidade[e]) porEntidade[e] = { entityCode: m.entity, membros: [] };
          porEntidade[e].membros.push(m);
        });
        const entidades = Object.entries(porEntidade);

        return (
          <Slide key={vertical} className="bg-gradient-to-br from-blue-50 to-cyan-50">
            <SlideHeader title="Equipe BETHA" subtitle="Implantação" />
            <div className="flex gap-4 mt-6 flex-1 min-h-0">
              {/* Coluna lateral — Gestão */}
              <div className="w-44 flex-shrink-0">
                <div className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-center mb-4">
                  <p className="text-[11px] font-bold text-slate-700">Gestão Operação + Projeto</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  {gestao.map((g, i) => (
                    <React.Fragment key={i}>
                      <PersonChip name={g} />
                      {i < gestao.length - 1 && <span className="text-slate-400 font-bold">+</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Bloco técnico */}
              <div className="flex-1 border-l-2 border-blue-300 pl-4 min-w-0">
                <div className="bg-gradient-to-r from-slate-100 to-slate-50 border border-slate-200 rounded-lg px-4 py-2 mb-5">
                  <p className="text-sm font-bold text-slate-700 text-center">
                    Técnicos de Implantação — <span className="text-blue-700">{VERTICAL_LABELS[vertical] || vertical}</span>
                  </p>
                </div>
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(entidades.length, 3)}, minmax(0, 1fr))` }}>
                  {entidades.map(([entLabel, { entityCode, membros: ms }]) => {
                    const resp = produtosPorVerticalEntidade(vertical, entityCode);
                    return (
                      <div key={entLabel} className="flex flex-col items-center">
                        <p className="text-xs font-bold text-slate-800 mb-3">{entLabel}</p>
                        <div className="flex flex-col gap-2 items-center mb-3">
                          {ms.map((m, i) => (
                            <React.Fragment key={m.id || i}>
                              <PersonChip name={m.name} />
                              {i < ms.length - 1 && <span className="text-slate-400 text-xs font-bold">+</span>}
                            </React.Fragment>
                          ))}
                        </div>
                        <ul className="space-y-1 self-start pl-2">
                          {(resp.length > 0 ? resp : ms.map(m => m.role).filter(Boolean)).map((r, i) => (
                            <li key={i} className="text-[10px] text-slate-600 flex items-start gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />{r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Slide>
        );
      })}
    </>
  );
}