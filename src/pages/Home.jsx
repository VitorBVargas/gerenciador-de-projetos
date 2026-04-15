import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowRight, FolderOpen, BarChart3, Database, ClipboardList } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [activeButton, setActiveButton] = useState(null);

  const handleNavigation = (page) => {
    navigate(createPageUrl(page));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-blue-800 flex items-center justify-center overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl px-6 py-12">
        {/* Logo/Header */}
        <div className="text-center mb-16">
          <div className="text-5xl font-black text-blue-400 mb-2">BETHA</div>
          <p className="text-slate-300 text-lg">Gerenciador de Projetos</p>
        </div>

        {/* Main heading */}
        <div className="text-center mb-20">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Tudo que <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              seus projetos
            </span>
            <br />
            precisam
          </h1>
          <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto">
            Gerencie seus projetos, acompanhe o progresso e mantenha sua equipe alinhada em um só lugar.
          </p>
        </div>

        {/* Button Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {/* Projetos Internos */}
          <button
            onClick={() => handleNavigation('InternalProjectsList')}
            onMouseEnter={() => setActiveButton(0)}
            onMouseLeave={() => setActiveButton(null)}
            className="group relative h-40 rounded-2xl overflow-hidden transition-all duration-300 transform hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-indigo-700 group-hover:from-indigo-500 group-hover:to-indigo-600 transition-all duration-300"></div>
            <div className="relative h-full flex flex-col items-center justify-center p-6">
              <FolderOpen className="w-12 h-12 text-indigo-200 mb-3 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="text-xl font-bold text-white text-center">Projetos Internos</h3>
            </div>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
          </button>

          {/* Projetos - Portfólios */}
          <button
            onClick={() => {
              handleNavigation('PortfolioSelect?mode=projects');
            }}
            onMouseEnter={() => setActiveButton(1)}
            onMouseLeave={() => setActiveButton(null)}
            className="group relative h-40 rounded-2xl overflow-hidden transition-all duration-300 transform hover:scale-105 md:row-span-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-600 to-blue-600 group-hover:from-cyan-500 group-hover:to-blue-500 transition-all duration-300"></div>
            <div className="relative h-full flex flex-col items-center justify-center p-6">
              <div className="flex items-center gap-3 mb-3">
                <ArrowRight className="w-6 h-6 text-cyan-200 group-hover:-translate-x-1 transition-transform duration-300" />
                <ArrowRight className="w-6 h-6 text-cyan-300 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="text-xl font-bold text-white text-center">Projetos</h3>
              <p className="text-xs text-cyan-100 mt-1">Selecione portfólio</p>
            </div>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
          </button>

          {/* Status Executivo */}
          <button
            onClick={() => handleNavigation('PortfolioSelect?mode=executive')}
            onMouseEnter={() => setActiveButton(2)}
            onMouseLeave={() => setActiveButton(null)}
            className="group relative h-40 rounded-2xl overflow-hidden transition-all duration-300 transform hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-700 to-blue-800 group-hover:from-blue-600 group-hover:to-blue-700 transition-all duration-300"></div>
            <div className="relative h-full flex flex-col items-center justify-center p-6">
              <BarChart3 className="w-12 h-12 text-blue-200 mb-3 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="text-xl font-bold text-white text-center">Status Executivo</h3>
            </div>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
          </button>

          {/* Pendência Edital */}
          <button
            onClick={() => handleNavigation('PortfolioSelect?mode=edital')}
            onMouseEnter={() => setActiveButton(3)}
            onMouseLeave={() => setActiveButton(null)}
            className="group relative h-40 rounded-2xl overflow-hidden transition-all duration-300 transform hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-600 to-orange-700 group-hover:from-orange-500 group-hover:to-orange-600 transition-all duration-300"></div>
            <div className="relative h-full flex flex-col items-center justify-center p-6">
              <ClipboardList className="w-12 h-12 text-orange-200 mb-3 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="text-xl font-bold text-white text-center">Pendência Edital</h3>
            </div>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
          </button>
        </div>

        {/* Footer hint */}
        <div className="text-center mt-16 text-slate-400 text-sm flex flex-col items-center gap-3">
          <p>Clique em qualquer opção para começar</p>
          <div className="flex items-center gap-3">
            <a
              href="https://betha-road-map.base44.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/60 border border-slate-600 text-slate-300 hover:bg-slate-600/60 hover:text-white transition-colors text-sm font-medium"
            >
              🗺️ Roadmap — Reportar Bug / Sugestão
            </a>
            <button
              onClick={() => handleNavigation('BackupManagement')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/60 border border-slate-600 text-slate-300 hover:bg-slate-600/60 hover:text-white transition-colors text-sm font-medium"
            >
              <Database className="w-4 h-4" />
              Backups
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}