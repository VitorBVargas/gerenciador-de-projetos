import React from 'react';
import { BETHA, applyPlaceholders } from './bethaEngine';

// Componentes-base do Betha Presentation Engine.
// Layout mestre imutável: aplicam o design system (cores, raio 16px, sombra leve)
// de forma fixa. Documentos NÃO devem redefinir cores/raio aqui.

export function BethaSlide({ children, className = '', style = {} }) {
  return (
    <div
      className={`betha-slide kickoff-slide flex flex-col overflow-hidden p-10 ${className}`}
      style={{
        aspectRatio: BETHA.slide.ratio,
        borderRadius: BETHA.card.radius,
        boxShadow: BETHA.card.shadow,
        fontFamily: BETHA.font,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function BethaSlideHeader({ title, subtitle, values }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold"
        style={{ background: BETHA.colors.primary }}
      >
        B
      </div>
      <h2 className="text-2xl font-bold" style={{ color: BETHA.colors.secondary }}>
        {applyPlaceholders(title, values)}
        {subtitle && <span className="text-slate-500 font-normal"> – {applyPlaceholders(subtitle, values)}</span>}
      </h2>
    </div>
  );
}