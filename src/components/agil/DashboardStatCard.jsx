import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

// Card compacto de indicador do dashboard executivo Ágil.
export default function DashboardStatCard({ icon: Icon, label, value, sub, color = 'bg-slate-500/15 text-slate-300' }) {
  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-400 truncate">{label}</p>
          <p className="text-xl font-bold text-white leading-tight">{value}</p>
          {sub && <p className="text-[11px] text-slate-500 truncate">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}