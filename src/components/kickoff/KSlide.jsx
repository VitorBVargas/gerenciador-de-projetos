import React from 'react';

// Base do slide do novo Kick-Off.
// Proporção 16:9 EXATA (necessária para captura fiel em PDF/PPTX).
// O conteúdo é desenhado enxuto para nunca cortar.
export function KSlide({ children, className = '', style = {}, padded = true }) {
  return (
    <div
      className={`kickoff-slide relative w-full overflow-hidden rounded-2xl shadow-xl ${padded ? 'p-12' : ''} ${className}`}
      style={{ aspectRatio: '16 / 9', fontFamily: "'Inter', system-ui, sans-serif", ...style }}
    >
      {children}
    </div>
  );
}

// Cabeçalho padrão Betha (tarja azul + título).
export function KHeader({ kicker, title, light = false }) {
  return (
    <div className="flex flex-col gap-2">
      {kicker && (
        <span className={`text-xs font-bold uppercase tracking-[0.2em] ${light ? 'text-cyan-200' : 'text-blue-500'}`}>
          {kicker}
        </span>
      )}
      <div className="flex items-center gap-3">
        <span className={`block w-1.5 h-9 rounded-full ${light ? 'bg-cyan-300' : 'bg-blue-600'}`} />
        <h2 className={`text-3xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
      </div>
    </div>
  );
}

// Marca d'água "BETHA" discreta no rodapé.
export function KBrand({ light = false }) {
  return (
    <span className={`absolute bottom-6 right-10 text-sm font-extrabold italic tracking-tight ${light ? 'text-white/70' : 'text-blue-600/40'}`}>
      BETHA
    </span>
  );
}