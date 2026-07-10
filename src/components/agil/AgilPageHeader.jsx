import React from 'react';
import { Badge } from '@/components/ui/badge';

// Cabeçalho padrão das páginas do módulo Ágil (Dark Theme).
export default function AgilPageHeader({ icon: Icon, title, projectName, children }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-emerald-600/20 flex items-center justify-center flex-shrink-0">
          {Icon && <Icon className="w-5 h-5 text-emerald-400" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            <Badge className="bg-emerald-600/20 text-emerald-300 border border-emerald-600/30">Ágil</Badge>
          </div>
          {projectName && <p className="text-sm text-slate-400 mt-0.5">{projectName}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2 flex-shrink-0">{children}</div>}
    </div>
  );
}