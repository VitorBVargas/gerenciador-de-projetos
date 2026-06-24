import React from 'react';

const NIVEL = {
  1: { l: 'Muito baixo', c: '#86efac' }, 2: { l: 'Baixo', c: '#bef264' },
  3: { l: 'Médio', c: '#fde047' }, 4: { l: 'Alto', c: '#fb923c' }, 5: { l: 'Crítico', c: '#ef4444' },
};
function nivel(n) { return NIVEL[n] || NIVEL[3]; }

// SLIDE — Riscos ativos. Só dados, layout fixo do motor.
export default function KickoffRiscos({ risks, Slide, SlideHeader, values }) {
  const ativos = (risks || []).filter(r => !['encerrado', 'mitigado'].includes(r.status)).slice(0, 6);
  if (ativos.length === 0) return null;

  return (
    <Slide className="bg-gradient-to-br from-blue-50 to-cyan-50">
      <SlideHeader title="Riscos" subtitle="Riscos ativos do projeto" values={values} />
      <div className="mt-7 flex-1 space-y-2.5 overflow-hidden">
        {ativos.map((r, i) => (
          <div key={r.id || i} className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{r.title}</p>
              {r.mitigation && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{r.mitigation}</p>}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <Tag label="Prob." value={r.probability} />
              <Tag label="Impacto" value={r.impact} />
              <span className="text-xs text-slate-600 w-24 truncate text-right">{r.responsavel || r.suggested_owner || '—'}</span>
            </div>
          </div>
        ))}
      </div>
    </Slide>
  );
}

function Tag({ label, value }) {
  const n = nivel(value);
  return (
    <div className="flex flex-col items-center">
      <span className="text-[9px] text-slate-400 uppercase">{label}</span>
      <span className="text-xs font-bold px-2 py-0.5 rounded-full text-slate-800" style={{ background: n.c }}>{value || '—'}</span>
    </div>
  );
}