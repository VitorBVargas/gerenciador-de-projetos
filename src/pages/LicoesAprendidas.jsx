import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';

export default function LicoesAprendidasPage() {
  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
            <BookOpen className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold text-white">Lições Aprendidas</h1>
          <p className="mt-2 text-sm text-slate-400">
            Página criada e pronta para receber a estrutura de lições aprendidas.
          </p>
        </div>
      </div>
    </div>
  );
}