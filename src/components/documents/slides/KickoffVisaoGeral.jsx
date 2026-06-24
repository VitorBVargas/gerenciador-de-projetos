import React from 'react';

// SLIDE — Visão Geral (resumo executivo). Só dados, layout fixo do motor.
function fmtMoney(v) {
  if (!v && v !== 0) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}
function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export default function KickoffVisaoGeral({ project, products, risksCount, Slide, SlideHeader, values }) {
  const stats = [
    ['Município / Cliente', values?.CLIENTE || '—'],
    ['Portfólio', project?.portfolio_manager || '—'],
    ['Gerente do Projeto', project?.manager || '—'],
    ['Coordenador Técnico', project?.coordinator || '—'],
    ['Produtos contratados', String((products || []).length)],
    ['Riscos ativos', String(risksCount || 0)],
    ['Valor de implantação', fmtMoney(project?.implementation_value)],
    ['Receita recorrente', fmtMoney(project?.recurring_value || project?.contract_recurring_value)],
    ['Assinatura do contrato', fmtDate(project?.contract_signature_date)],
    ['Prazo contratual', fmtDate(project?.deadline)],
  ];

  return (
    <Slide className="bg-gradient-to-br from-blue-50 to-cyan-50">
      <SlideHeader title="Visão Geral" subtitle="Resumo executivo" values={values} />
      <div className="grid grid-cols-2 gap-4 mt-8 flex-1 content-start">
        {stats.map(([label, val]) => (
          <div key={label} className="bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
            <p className="text-lg font-bold text-slate-800 mt-1 truncate">{val}</p>
          </div>
        ))}
      </div>
    </Slide>
  );
}