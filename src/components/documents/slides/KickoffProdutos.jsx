import React from 'react';

const VERTICAL_LABELS = {
  arrecadacao: 'Arrecadação', compras: 'Compras / Contratos', contabil: 'Soluções Contábeis',
  pessoal: 'Pessoal / Folha', educacao: 'Educação', iss: 'ISS', parceiros: 'Parceiros',
  plataforma: 'Plataforma', saude: 'Saúde', atendimento: 'Atendimento', extensoes: 'Extensões', outros: 'Outros',
};

// SLIDE — Produtos agrupados por vertical. Só dados, layout fixo do motor.
export default function KickoffProdutos({ products, Slide, SlideHeader, values }) {
  if (!products || products.length === 0) return null;

  const porVertical = {};
  products.forEach(p => {
    const v = p.vertical || 'outros';
    if (!porVertical[v]) porVertical[v] = [];
    porVertical[v].push(p);
  });
  const grupos = Object.entries(porVertical);

  return (
    <Slide className="bg-gradient-to-br from-blue-50 to-cyan-50">
      <SlideHeader title="Produtos" subtitle="Soluções contratadas por vertical" values={values} />
      <div className="grid grid-cols-3 gap-4 mt-8 flex-1 content-start overflow-hidden">
        {grupos.map(([vertical, items]) => (
          <div key={vertical} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-sm font-bold text-blue-700 mb-3 border-b border-slate-100 pb-2">{VERTICAL_LABELS[vertical] || vertical}</p>
            <ul className="space-y-1.5">
              {items.map((p, i) => (
                <li key={p.id || i} className="text-xs text-slate-700 flex items-start gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />{p.name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Slide>
  );
}