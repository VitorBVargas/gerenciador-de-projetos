import React from 'react';

// SLIDE — Comunicação / matriz de contatos. Só dados, layout fixo do motor.
export default function KickoffComunicacao({ project, stakeholders, team, Slide, SlideHeader, values }) {
  const cliente = (stakeholders || []).slice(0, 4).map(s => s.name).filter(Boolean);
  const especialistas = (team || [])
    .filter(m => !['gestao_projetos', 'gestao_operacoes', 'coordenacao_tecnica', 'gerenciamento'].includes(m.vertical))
    .slice(0, 4).map(m => m.name).filter(Boolean);

  const cols = [
    { title: 'Gerente do Projeto', people: [project?.manager].filter(Boolean), cls: 'from-blue-500 to-blue-600' },
    { title: 'Coordenador Técnico', people: [project?.coordinator].filter(Boolean), cls: 'from-cyan-500 to-blue-500' },
    { title: 'Especialistas', people: especialistas, cls: 'from-sky-500 to-cyan-500' },
    { title: 'Cliente', people: cliente, cls: 'from-indigo-500 to-blue-600' },
  ];

  return (
    <Slide className="bg-gradient-to-br from-blue-50 to-cyan-50">
      <SlideHeader title="Comunicação" subtitle="Matriz de contatos do projeto" values={values} />
      <div className="grid grid-cols-4 gap-4 mt-8 flex-1 content-start">
        {cols.map(col => (
          <div key={col.title} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className={`bg-gradient-to-r ${col.cls} text-white text-center text-xs font-bold py-2.5 px-2`}>{col.title}</div>
            <div className="p-3 space-y-2">
              {col.people.length > 0 ? col.people.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs flex-shrink-0">{p.charAt(0).toUpperCase()}</div>
                  <span className="text-xs text-slate-700 truncate">{p}</span>
                </div>
              )) : <p className="text-xs text-slate-400 text-center py-2">—</p>}
            </div>
          </div>
        ))}
      </div>
    </Slide>
  );
}