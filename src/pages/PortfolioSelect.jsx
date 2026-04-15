import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Building2, BarChart3, ClipboardList } from 'lucide-react';

const portfolios = [
  {
    id: 'grandes_contas_sc_mg',
    label: 'Grandes Contas SC/MG',
    color: 'from-blue-600 to-blue-700',
    hoverColor: 'hover:from-blue-500 hover:to-blue-600',
  },
  {
    id: 'grandes_contas_sc_sp',
    label: 'Grandes Contas SC/SP',
    color: 'from-purple-600 to-purple-700',
    hoverColor: 'hover:from-purple-500 hover:to-purple-600',
  },
  {
    id: 'medias_contas',
    label: 'Médias Contas',
    color: 'from-cyan-600 to-cyan-700',
    hoverColor: 'hover:from-cyan-500 hover:to-cyan-600',
  },
];

export default function PortfolioSelect() {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode') || 'projects';

  const title = mode === 'executive' ? 'Status Executivo' : mode === 'edital' ? 'Pendência Edital' : 'Projetos';
  const subtitle = mode === 'executive'
    ? 'Selecione o portfólio para ver o status executivo'
    : mode === 'edital'
    ? 'Selecione o portfólio para acessar as pendências de edital'
    : 'Selecione o portfólio para ver os projetos';

  const getUrl = (portfolioId) => {
    if (mode === 'executive') return `ExecutiveStatus?portfolio=${portfolioId}`;
    if (mode === 'edital') return `PendenciaEdital?portfolio=${portfolioId}`;
    return `ProjectsList?portfolio=${portfolioId}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-blue-800 flex items-center justify-center">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-4xl px-6 py-12">
        {/* Back */}
        <Link to={createPageUrl('Home')} className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Voltar</span>
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/30 border border-blue-500/40 mb-4">
            {mode === 'executive' ? (
              <BarChart3 className="w-8 h-8 text-blue-300" />
            ) : mode === 'edital' ? (
              <ClipboardList className="w-8 h-8 text-orange-300" />
            ) : (
              <Building2 className="w-8 h-8 text-blue-300" />
            )}
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">{title}</h1>
          <p className="text-slate-400">{subtitle}</p>
        </div>

        {/* Portfolio Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {portfolios.map((portfolio) => (
            <Link
              key={portfolio.id}
              to={createPageUrl(getUrl(portfolio.id))}
              className={`group relative h-44 rounded-2xl overflow-hidden transition-all duration-300 transform hover:scale-105 bg-gradient-to-br ${portfolio.color} ${portfolio.hoverColor}`}
            >
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
              <div className="relative h-full flex flex-col items-center justify-center p-6 text-center">
                <Building2 className="w-10 h-10 text-white/70 mb-3 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-xl font-bold text-white">{portfolio.label}</h3>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-10 text-slate-500 text-sm">
          Clique em um portfólio para continuar
        </div>
      </div>
    </div>
  );
}