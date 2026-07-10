import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Rocket, FolderOpen, Trash2, User, Zap, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

// Card específico para Projetos Ágeis (Scrum/Kanban).
// As métricas de sprint ainda serão calculadas em fases futuras — por ora exibem "—".
export default function AgilProjectCard({ project, deletingProjectId, onDelete, canDelete = true }) {
  const metrics = [
    { label: 'Sprint Atual', value: project.agil_sprint_atual || '—' },
    { label: 'Health Sprint', value: project.agil_health_sprint || '—' },
    { label: 'Velocity', value: project.agil_velocity ?? '—' },
    { label: 'Histórias', value: project.agil_total_stories ?? '—' },
    { label: 'Concluídas', value: project.agil_stories_done ?? '—' },
    { label: 'Abertas', value: project.agil_stories_open ?? '—' },
  ];

  const percentEntregue = project.agil_percent_entregue ?? 0;

  return (
    <Card
      className={`bg-slate-800/50 border-slate-700 hover:bg-slate-800 transition-all group ${
        deletingProjectId === project.id ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-600/20 flex items-center justify-center flex-shrink-0">
              <Rocket className="w-5 h-5 text-emerald-400" />
            </div>
            <CardTitle className="text-white text-lg leading-tight">
              {deletingProjectId === project.id ? 'Excluindo...' : project.name}
            </CardTitle>
          </div>
          {deletingProjectId !== project.id && canDelete && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(project);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-slate-400">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500">PO:</span>
            <span className="text-slate-300 truncate">{project.agil_product_owner || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Zap className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500">SM:</span>
            <span className="text-slate-300 truncate">{project.agil_scrum_master || '—'}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {metrics.map(m => (
            <div key={m.label} className="rounded-lg bg-slate-900/40 border border-slate-700/60 p-2 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">{m.label}</p>
              <p className="text-sm font-semibold text-white mt-0.5">{m.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Percentual entregue</span>
            <span className="text-emerald-400 font-medium">{percentEntregue}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(percentEntregue, 100)}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-500">Dias restantes da Sprint:</span>
          <span className="text-slate-300">{project.agil_dias_restantes ?? '—'}</span>
        </div>

        <Link to={createPageUrl(`AgilDashboard?project_id=${project.id}`)}>
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700 mt-2" disabled={deletingProjectId === project.id}>
            <FolderOpen className="w-4 h-4 mr-2" />
            Abrir Projeto
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}