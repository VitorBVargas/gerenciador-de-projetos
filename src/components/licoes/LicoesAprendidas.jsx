import React from 'react';
import { BookOpen, Lightbulb } from 'lucide-react';

export default function LicoesAprendidas({ projectId, portfolio }) {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
          <BookOpen className="h-7 w-7" />
        </div>

        <h1 className="text-3xl font-bold text-white">Lições Aprendidas</h1>
        <p className="mt-2 text-sm text-slate-400">
          Estrutura inicial criada para organizar aprendizados do projeto.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Projeto</p>
            <p className="mt-2 text-sm font-medium text-white">{projectId || 'Não informado'}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Portfólio</p>
            <p className="mt-2 text-sm font-medium text-white">{portfolio || 'Não informado'}</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
          <Lightbulb className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-white">Componente criado</h2>
        <p className="mt-2 text-sm text-slate-400">
          Este espaço está pronto para receber a listagem e os detalhes das lições aprendidas.
        </p>
      </div>
    </div>
  );
}