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
  nao_iniciado: 'Não Iniciado',
  em_dia: 'Em Dia',
  atencao: 'Atenção',
  atrasado: 'Atrasado',
  pausado: 'Pausado',
  concluido: 'Concluído'
};

const statusIcons = {
  nao_iniciado: Clock,
  em_dia: CheckCircle2,
  atencao: AlertTriangle,
  atrasado: XCircle,
  pausado: Pause,
  concluido: CheckCircle2
};

const statusColors = {
  nao_iniciado: 'bg-slate-500',
  em_dia: 'bg-green-500',
  atencao: 'bg-yellow-500',
  atrasado: 'bg-red-500',
  pausado: 'bg-orange-500',
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

  // Classify project status based on timeline and health
  const classifyProjectStatus = (project) => {
    // If project is completed
    if (project.status === 'concluido') return 'concluido';
    
    const projectEvents = allTimelineEvents.filter(e => e.project_id === project.id);
    
    // Check if project hasn't started
    const hasStartedEvents = projectEvents.some(e => 
      e.status === 'em_andamento' || e.status === 'concluido' || e.status === 'atrasado'
    );
    if (!hasStartedEvents && projectEvents.length > 0) return 'nao_iniciado';
    if (projectEvents.length === 0) return 'nao_iniciado';
    
    // Check for paused timeline events
    const hasPausedEvents = projectEvents.some(e => e.status === 'pausado');
    if (hasPausedEvents) return 'pausado';
    
    // Check for delayed events (past deadline)
    const now = new Date();
    const hasDelayedEvents = projectEvents.some(e => {
      if (e.end_date) {
        const endDate = new Date(e.end_date);
        return endDate < now && e.status !== 'concluido';
      }
      return false;
    });
    if (hasDelayedEvents) return 'atrasado';
    
    // Check for attention (health < 60% AND events ending this week)
    const healthScore = calculateHealthScore(project);
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const hasEventsThisWeek = projectEvents.some(e => {
      if (e.end_date && e.status !== 'concluido') {
        const endDate = new Date(e.end_date);
        return endDate >= now && endDate <= oneWeekFromNow;
      }
      return false;
    });
    if (healthScore < 60 && hasEventsThisWeek) return 'atencao';
    
    // Default: Em dia
    return 'em_dia';
  };

  // Active projects (exclude completed)
  const activeProjects = projects.filter(p => p.status !== 'concluido');

  // Status counts
  const statusCounts = useMemo(() => {
    const counts = {
      nao_iniciado: 0,
      em_dia: 0,
      atencao: 0,
      atrasado: 0,
      pausado: 0,
      concluido: 0
    };
    
    projects.forEach(project => {
      const status = classifyProjectStatus(project);
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    });
    
    return counts;
  }, [projects, allTimelineEvents]);

  // Calculate project with health status
  const projectsWithMetrics = useMemo(() => {
    return activeProjects.map(project => ({
      ...project,
      healthScore: calculateHealthScore(project),
      progress: calculateProjectProgress(project),
      dynamicStatus: classifyProjectStatus(project)
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
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white">Clientes Premium SC/MG</h1>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-400">
          <span><span className="text-slate-500">Gerente de Portfólio:</span> Leandro de Faveri</span>
          <span><span className="text-slate-500">Coordenador:</span> Maxwell Santos</span>
          <span><span className="text-slate-500">Gerentes de Projetos:</span> Vitor Vargas, Marcos Bergamaschi</span>
        </div>
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
                    <div className={cn("w-2 h-2 rounded-full", statusColors[project.dynamicStatus])} />
                    <span className="text-sm text-slate-400">{statusLabels[project.dynamicStatus]}</span>
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