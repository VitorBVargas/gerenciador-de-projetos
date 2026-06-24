import React from 'react';
import { EyeOff } from 'lucide-react';

export default function HideableSection({ hidden, onHide, children }) {
  if (hidden) return null;
  return (
    <div className="relative group">
      <button
        onClick={onHide}
        title="Ocultar quadro"
        className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-slate-700/70 text-slate-400 hover:text-white hover:bg-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <EyeOff className="w-4 h-4" />
      </button>
      {children}
    </div>
  );
}