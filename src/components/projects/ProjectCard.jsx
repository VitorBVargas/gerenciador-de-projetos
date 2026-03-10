import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, FolderOpen, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function ProjectCard({ project, deletingProjectId, onDelete }) {
  const [projectProducts, setProjectProducts] = useState([]);
  const [timelineEvents, setTimelineEvents] = useState([]);

  useEffect(() => {
    if (project.id) {
      base44.entities.Product.filter({ project_id: project.id }).then(setProjectProducts);
      base44.entities.TimelineEvent.filter({ project_id: project.id }).then(setTimelineEvents);
    }
  }, [project.id]);

  const totalImplementation = projectProducts.reduce((sum, p) => sum + (p.implementation_value || 0), 0);
  const totalInclusion = projectProducts.reduce((sum, p) => sum + (p.inclusion_value || 0), 0);

  // Calcular progresso geral
  const calcEventProgress = (e) => {
    if (e.status === 'concluido') return 100;
    if (e.progress > 0) return e.progress;
    if (e.start_date && e.end_date) {
      const now = new Date();
      const start = new Date(e.start_date);
      const end = new Date(e.end_date);
      if (now <= start) return 0;
      if (now >= end) return 99;
      return Math.round(((now - start) / (end - start)) * 100);
    }
    return 0;
  };

  const projectProgress = timelineEvents.length > 0
    ? Math.round(timelineEvents.reduce((sum, e) => sum + calcEventProgress(e), 0) / timelineEvents.length)
    : 0;

  return (
    <Card 
      className={`bg-slate-800/50 border-slate-700 hover:bg-slate-800 transition-all group ${
        deletingProjectId === project.id ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      <CardHeader>
        <div className="flex items-start gap-2">
          <div className="flex-1 flex items-start justify-between">
            <CardTitle className="text-white text-lg mb-2">
              {deletingProjectId === project.id ? 'Excluindo...' : project.name}
            </CardTitle>
            {deletingProjectId !== project.id && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
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
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Progresso Geral</span>
              <span className="text-xl font-bold text-white">{projectProgress}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${projectProgress}%` }}
              />
            </div>
          </div>

          {project.manager && (
            <div className="text-sm text-slate-400">
              <span className="text-slate-500">Gerente:</span> {project.manager}
            </div>
          )}
          
          {project.deadline && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Calendar className="w-4 h-4" />
              <span className="text-slate-500">Prazo Estimado:</span> {format(new Date(project.deadline), 'dd/MM/yyyy', { locale: ptBR })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-sm pt-3 border-t border-slate-700">
          {totalImplementation > 0 && (
            <div className="text-emerald-400">
              <span className="text-slate-500">Implantação</span><br />
              <span className="font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(totalImplementation)}</span>
            </div>
          )}
          {totalInclusion > 0 && (
            <div className="text-blue-400">
              <span className="text-slate-500">Recorrente (calculado)</span><br />
              <span className="font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(totalInclusion)}</span>
            </div>
          )}
          {project.contract_recurring_value > 0 && (
            <div className="text-purple-400">
              <span className="text-slate-500">Recorrente (contrato)</span><br />
              <span className="font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(project.contract_recurring_value)}</span>
            </div>
          )}
        </div>

        <Link to={createPageUrl(`Dashboard?project_id=${project.id}`)}>
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 mt-4"
            disabled={deletingProjectId === project.id}
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Abrir Projeto
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}