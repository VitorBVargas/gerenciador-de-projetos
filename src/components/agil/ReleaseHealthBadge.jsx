import React from 'react';
import { Heart } from 'lucide-react';

export default function ReleaseHealthBadge({ score }) {
  let meta;
  if (score >= 70) meta = { label: 'Saudável', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' };
  else if (score >= 50) meta = { label: 'Atenção', cls: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40' };
  else meta = { label: 'Crítico', cls: 'bg-red-500/15 text-red-300 border-red-500/40' };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-semibold ${meta.cls}`}>
      <Heart className="w-3 h-3" /> {meta.label} · {score}
    </span>
  );
}