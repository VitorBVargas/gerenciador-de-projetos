import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Pause,
  XCircle,
  PlayCircle,
  LayoutDashboard
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { createPageUrl } from '../utils';
import { Link } from 'react-router-dom';

const statusLabels = {
  planejamento: 'Planejamento',
  em_andamento: 'Em Andamento',
  pausado: 'Pausado',
  concluido: 'Concluído'
};

const statusIcons = {
  planejamento: Clock,
  em_andamento: PlayCircle,
  pausado: Pause,
  concluido: CheckCircle2
};

const statusColors = {
  planejamento: 'bg-blue-500',
  em_andamento: 'bg-green-500',
  pausado: 'bg-yellow-500',
  concluido: 'bg-purple-500'
};

export default function ExecutiveStatus() {
  // Fetch all projects
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
  });

  // Fetch all timeline events
  const { data: allTimelineEvents = [] } = useQuery({
    queryKey: ['allTimelineEvents'],
    queryFn: async () => {
      const events = await base44.entities.TimelineEvent.list();
      return events;
    }
  });

  // Fetch all tasks
  const { data: allHomologationTasks = [] } = useQuery({
    queryKey: ['allHomologationTasks'],
    queryFn: () => base44.entities.HomologationTask.list()
  });

  const { data: allMigrationTasks = [] } = useQuery({
    queryKey: ['allMigrationTasks'],
    queryFn: () => base44.entities.MigrationTask.list()
  });

  // Fetch all risks
  const { data: allRisks = [] } = useQuery({
    queryKey: ['allRisks'],
    queryFn: () => base44.entities.Risk.list()
  });

  const { data: allExpenses = [] } = useQuery({
    queryKey: ['allExpenses'],
    queryFn: () => base44.entities.Expense.list()
  });

  // Calculate health score for a project
  const calculateHealthScore = (project) => {
    let score = 100;
    const projectEvents = allTimelineEvents.filter(e => e.project_id === project.id);
    const projectHomoTasks = allHomologationTasks.filter(t => t.project_id === project.id);
    const projectMigTasks = allMigrationTasks.filter(t => t.project_id === project.id);
    const projectRisks = allRisks.filter(r => r.project_id === project.id);
    const projectExpenses = allExpenses.filter(e => e.project_id === project.id);

    // Timeline delays
    const delayedEvents = projectEvents.filter(e => e.status === 'atrasado');
    if (delayedEvents.length > 0) {
      score -= Math.min(delayedEvents.length * 10, 30);
    }

    // Task completion
    const allTasks = [...projectHomoTasks, ...projectMigTasks];
    if (allTasks.length > 0) {
      const completionRate = allTasks.filter(t => t.completed).length / allTasks.length;
      if (completionRate < 0.3) score -= 20;
      else if (completionRate < 0.5) score -= 10;
    }

    // High risks
    const highRisks = projectRisks.filter(r => 
      (r.probability === 'alta' || r.impact === 'alto') && r.status !== 'mitigado'
    );
    score -= Math.min(highRisks.length * 15, 30);

    // Budget
    const spent = projectExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    if (project.budget && spent > project.budget) {
      score -= 20;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  };

  // Calculate overall progress for a project
  const calculateProjectProgress = (project) => {
    const projectEvents = allTimelineEvents.filter(e => e.project_id === project.id);
    if (projectEvents.length === 0) return 0;
    
    const totalProgress = projectEvents.reduce((sum, event) => {
      if (event.status === 'concluido') return sum + 100;
      return sum + (event.progress || 0);
    }, 0);
    
    return Math.round(totalProgress / projectEvents.length);
  };

  // Active projects (exclude completed)
  const activeProjects = projects.filter(p => p.status !== 'concluido');

  // Status counts
  const statusCounts = useMemo(() => {
    const counts = {
      planejamento: 0,
      em_andamento: 0,
      pausado: 0,
      concluido: 0
    };
    
    projects.forEach(p => {
      if (p.status && counts[p.status] !== undefined) {
        counts[p.status]++;
      }
    });
    
    return counts;
  }, [projects]);

  // Calculate project with health status
  const projectsWithMetrics = useMemo(() => {
    return activeProjects.map(project => ({
      ...project,
      healthScore: calculateHealthScore(project),
      progress: calculateProjectProgress(project)
    })).sort((a, b) => {
      // Sort by health score (worst first)
      return a.healthScore - b.healthScore;
    });
  }, [activeProjects, allTimelineEvents, allHomologationTasks, allMigrationTasks, allRisks, allExpenses]);

  const getHealthColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getHealthBg = (score) => {
    if (score >= 80) return 'bg-green-500/20 border-green-500/30';
    if (score >= 60) return 'bg-yellow-500/20 border-yellow-500/30';
    if (score >= 40) return 'bg-orange-500/20 border-orange-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 p-6 lg:p-8 flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Status Executivo</h1>
        <p className="text-slate-400 mt-1">Visão consolidada de todos os projetos</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-white mb-1">{projects.length}</div>
            <div className="text-sm text-slate-400">Total</div>
          </CardContent>
        </Card>

        {Object.entries(statusCounts).map(([status, count]) => {
          const Icon = statusIcons[status];
          return (
            <Card key={status} className="bg-slate-800/50 border-slate-700/50">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", statusColors[status] + '/20')}>
                    <Icon className={cn("w-5 h-5", statusColors[status].replace('bg-', 'text-'))} />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{count}</div>
                <div className="text-xs text-slate-400">{statusLabels[status]}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Projects Grid */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Projetos Ativos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectsWithMetrics.map(project => (
            <Link 
              key={project.id} 
              to={createPageUrl(`Dashboard?project_id=${project.id}`)}
              className="block"
            >
              <Card className="bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 transition-all h-full group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-lg text-white group-hover:text-blue-400 transition-colors">
                      {project.name}
                    </CardTitle>
                    <Badge className={cn("border", getHealthBg(project.healthScore))}>
                      <span className={getHealthColor(project.healthScore)}>{project.healthScore}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", statusColors[project.status])} />
                    <span className="text-sm text-slate-400">{statusLabels[project.status]}</span>
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Progresso Geral</span>
                      <span className="text-white font-semibold">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-700/50">
                    {project.manager && (
                      <div>
                        <div className="text-xs text-slate-500">Gerente</div>
                        <div className="text-sm text-white truncate">{project.manager}</div>
                      </div>
                    )}
                    {project.deadline && (
                      <div>
                        <div className="text-xs text-slate-500">Prazo</div>
                        <div className="text-sm text-white">
                          {new Date(project.deadline).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    )}
                    {project.implementation_value > 0 && (
                      <div>
                        <div className="text-xs text-slate-500">Implantação</div>
                        <div className="text-sm text-emerald-400">
                          {new Intl.NumberFormat('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          }).format(project.implementation_value)}
                        </div>
                      </div>
                    )}
                    {project.recurring_value > 0 && (
                      <div>
                        <div className="text-xs text-slate-500">Recorrente</div>
                        <div className="text-sm text-emerald-400">
                          {new Intl.NumberFormat('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          }).format(project.recurring_value)}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {projectsWithMetrics.length === 0 && (
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="py-12 text-center">
              <LayoutDashboard className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Nenhum projeto ativo no momento</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Completed Projects Summary */}
      {statusCounts.concluido > 0 && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-purple-400" />
              Projetos Concluídos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-400">{statusCounts.concluido}</div>
            <div className="text-sm text-slate-400 mt-1">projetos finalizados com sucesso</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}