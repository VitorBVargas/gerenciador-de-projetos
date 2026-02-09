import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Pause,
  XCircle,
  PlayCircle,
  LayoutDashboard,
  ArrowLeft,
  DollarSign
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { createPageUrl } from '../utils';
import { Link } from 'react-router-dom';
import ProjectsDeliveryTimeline from '../components/timeline/ProjectsDeliveryTimeline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import RecognizedRevenueModal from '../components/modals/RecognizedRevenueModal';
import RecognizeAllVerticalModal from '../components/modals/RecognizeAllVerticalModal';
import { toast } from 'sonner';

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
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProject, setSelectedProject] = useState(null);
  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
  const [isRecognizeAllModalOpen, setIsRecognizeAllModalOpen] = useState(false);
  const [selectedVertical, setSelectedVertical] = useState(null);
  const [selectedVerticalProducts, setSelectedVerticalProducts] = useState([]);
  const queryClient = useQueryClient();

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

  const { data: allProducts = [] } = useQuery({
    queryKey: ['allProducts'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: allRecognizedRevenues = [] } = useQuery({
    queryKey: ['allRecognizedRevenues'],
    queryFn: () => base44.entities.RecognizedRevenue.list()
  });

  const createRecognizedRevenueMutation = useMutation({
    mutationFn: (data) => base44.entities.RecognizedRevenue.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allRecognizedRevenues'] });
      setIsRevenueModalOpen(false);
      setSelectedProject(null);
      toast.success('Valor reconhecido registrado com sucesso!');
    }
  });

  const deleteRecognizedRevenueMutation = useMutation({
    mutationFn: (id) => base44.entities.RecognizedRevenue.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allRecognizedRevenues'] });
      toast.success('Reconhecimento deletado com sucesso!');
    }
  });

  const createBulkRecognizedRevenueMutation = useMutation({
    mutationFn: async (recognitions) => {
      return await base44.entities.RecognizedRevenue.bulkCreate(recognitions);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allRecognizedRevenues'] });
      setIsRecognizeAllModalOpen(false);
      setSelectedProject(null);
      setSelectedVertical(null);
      setSelectedVerticalProducts([]);
      toast.success('Reconhecimentos criados com sucesso!');
    }
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
    return activeProjects.map(project => {
      const recognizedRevenues = allRecognizedRevenues.filter(r => r.project_id === project.id);
      const totalRecognized = recognizedRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);
      
      return {
        ...project,
        healthScore: calculateHealthScore(project),
        progress: calculateProjectProgress(project),
        dynamicStatus: classifyProjectStatus(project),
        totalRecognized
      };
    }).sort((a, b) => {
      // Sort by health score (worst first)
      return a.healthScore - b.healthScore;
    });
  }, [activeProjects, allTimelineEvents, allHomologationTasks, allMigrationTasks, allRisks, allExpenses, allRecognizedRevenues]);

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
      <div className="space-y-4">
        <Link to={createPageUrl('ProjectsList')}>
          <button className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Voltar para Projetos</span>
          </button>
        </Link>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Clientes Premium SC/MG</h1>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-400">
            <span><span className="text-slate-500">Gerente de Portfólio:</span> Leandro de Faveri</span>
            <span><span className="text-slate-500">Coordenador:</span> Maxwell Santos</span>
            <span><span className="text-slate-500">Gerentes de Projetos:</span> Vitor Vargas, Marcos Bergamaschi</span>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600">
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="timeline" className="data-[state=active]:bg-blue-600">
            Linha do Tempo de Entregas
          </TabsTrigger>
          <TabsTrigger value="financeiro" className="data-[state=active]:bg-blue-600">
            Financeiro
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Status Cards */}
          <div className="grid grid-cols-7 gap-3">
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-white mb-0.5">{projects.length}</div>
            <div className="text-xs text-slate-400">Total</div>
          </CardContent>
        </Card>

        {Object.entries(statusCounts).map(([status, count]) => {
          const Icon = statusIcons[status];
          const iconColorMap = {
            'nao_iniciado': 'text-slate-400',
            'em_dia': 'text-green-400',
            'atencao': 'text-yellow-400',
            'atrasado': 'text-red-400',
            'pausado': 'text-orange-400',
            'concluido': 'text-purple-400'
          };
          return (
            <Card key={status} className="bg-slate-800/50 border-slate-700/50">
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <Icon className={cn("w-5 h-5", iconColorMap[status])} />
                </div>
                <div className="text-2xl font-bold text-white mb-0.5">{count}</div>
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
            <div key={project.id} className="relative">
              <Card className="bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 transition-all h-full group">
                <Link 
                  to={createPageUrl(`Dashboard?project_id=${project.id}`)}
                  className="block"
                >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-lg text-white group-hover:text-blue-400 transition-colors">
                      {project.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("border", getHealthBg(project.healthScore))}>
                        <span className={getHealthColor(project.healthScore)}>{project.healthScore}</span>
                      </Badge>
                      <Button
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedProject(project);
                          setIsRevenueModalOpen(true);
                        }}
                        className="h-8 w-8 bg-purple-600 hover:bg-purple-700 shrink-0"
                      >
                        <DollarSign className="w-4 h-4" />
                      </Button>
                    </div>
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

                  {/* Recognized Revenue Display */}
                  {project.totalRecognized > 0 && (() => {
                    const projectRevenues = allRecognizedRevenues.filter(r => r.project_id === project.id);
                    
                    // Agrupar por vertical_name + recognition_month + type
                    const groupedRevenues = {};
                    projectRevenues.forEach(rev => {
                      if (rev.vertical_name) {
                        const key = `${rev.vertical_name}_${rev.recognition_month}_${rev.type}`;
                        if (!groupedRevenues[key]) {
                          groupedRevenues[key] = {
                            vertical_name: rev.vertical_name,
                            recognition_month: rev.recognition_month,
                            type: rev.type,
                            amount: 0,
                            count: 0
                          };
                        }
                        groupedRevenues[key].amount += rev.amount;
                        groupedRevenues[key].count += 1;
                      }
                    });
                    
                    // Revenues individuais (sem vertical_name)
                    const individualRevenues = projectRevenues.filter(r => !r.vertical_name);
                    
                    // Revenues agrupados
                    const bulkRevenues = Object.values(groupedRevenues);
                    
                    return (
                      <div className="pt-3 border-t border-slate-700/50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs text-slate-500">Reconhecido</div>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              if (projectRevenues.length > 0 && window.confirm('Deletar todos os reconhecimentos deste projeto?')) {
                                projectRevenues.forEach(r => deleteRecognizedRevenueMutation.mutate(r.id));
                              }
                            }}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Limpar
                          </button>
                        </div>
                        <div className="space-y-1">
                          {/* Reconhecimentos em lote (verticais) */}
                          {bulkRevenues.map((bulk, idx) => {
                            const monthYear = new Date(bulk.recognition_month).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
                            return (
                              <div key={`bulk-${idx}`} className="text-xs text-purple-400">
                                {new Intl.NumberFormat('pt-BR', { 
                                  style: 'currency', 
                                  currency: 'BRL',
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0
                                }).format(bulk.amount)} - {monthYear} - {bulk.vertical_name} (Todos)
                              </div>
                            );
                          })}
                          
                          {/* Reconhecimentos individuais */}
                          {individualRevenues.map(rev => {
                            const product = allProducts.find(p => p.id === rev.product_id);
                            const monthYear = new Date(rev.recognition_month).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
                            return (
                              <div key={rev.id} className="text-xs text-purple-400">
                                {new Intl.NumberFormat('pt-BR', { 
                                  style: 'currency', 
                                  currency: 'BRL',
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0
                                }).format(rev.amount)} - {monthYear} - {product?.name || 'N/A'}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
                </Link>
              </Card>
            </div>
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
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <ProjectsDeliveryTimeline 
            projects={projects}
            timelineEvents={allTimelineEvents}
            products={allProducts}
          />
        </TabsContent>

        {/* Financeiro Tab */}
        <TabsContent value="financeiro" className="space-y-6">
          {(() => {
            // Calcular valores por mês
            const monthlyData = {};
            const now = new Date();
            
            // Gerar próximos 12 meses
            for (let i = 0; i < 12; i++) {
              const month = addMonths(now, i);
              const key = format(month, 'yyyy-MM');
              monthlyData[key] = {
                month: format(month, 'MMM/yy', { locale: ptBR }),
                implantacao: 0,
                recorrente: 0,
                reconhecido: 0
              };
            }

            // Processar cada projeto
            projects.forEach(project => {
              const events = allTimelineEvents.filter(e => e.project_id === project.id);
              
              // Encontrar Go Live (primeiro evento de produção/operação)
              const goLiveEvent = events.find(e => 
                e.phase && (
                  e.phase === 'migracao_producao' || 
                  e.phase === 'operacao_assistida' ||
                  e.title?.toLowerCase().includes('go live') ||
                  e.title?.toLowerCase().includes('produção')
                )
              );
              
              // Encontrar data de encerramento (último evento)
              const sortedEvents = events
                .filter(e => e.end_date)
                .sort((a, b) => new Date(b.end_date) - new Date(a.end_date));
              const endEvent = sortedEvents[0];

              // Implantação: acontece no mês do Go Live
              if (goLiveEvent?.end_date && project.implementation_value > 0) {
                const goLiveMonth = format(new Date(goLiveEvent.end_date), 'yyyy-MM');
                if (monthlyData[goLiveMonth]) {
                  monthlyData[goLiveMonth].implantacao += project.implementation_value;
                }
              }

              // Recorrente: entra apenas no mês do Go Live
              if (goLiveEvent?.end_date && project.recurring_value > 0) {
                const goLiveMonth = format(new Date(goLiveEvent.end_date), 'yyyy-MM');
                if (monthlyData[goLiveMonth]) {
                  monthlyData[goLiveMonth].recorrente += project.recurring_value;
                }
              }
            });

            // Processar valores reconhecidos - subtrair dos gráficos originais e adicionar na barra roxa do mês reconhecido
            allRecognizedRevenues.forEach(recognized => {
              const recognizedMonth = format(new Date(recognized.recognition_month), 'yyyy-MM');
              
              // Encontrar o projeto correspondente
              const project = projects.find(p => p.id === recognized.project_id);
              if (!project) return;
              
              const events = allTimelineEvents.filter(e => e.project_id === project.id);
              const goLiveEvent = events.find(e => 
                e.phase && (
                  e.phase === 'migracao_producao' || 
                  e.phase === 'operacao_assistida' ||
                  e.title?.toLowerCase().includes('go live') ||
                  e.title?.toLowerCase().includes('produção')
                )
              );
              
              // Subtrair do mês original (Go Live)
              if (goLiveEvent?.end_date) {
                const originalMonth = format(new Date(goLiveEvent.end_date), 'yyyy-MM');
                
                // Subtrair do mês original baseado no tipo
                if (monthlyData[originalMonth]) {
                  if (recognized.type === 'implantacao') {
                    monthlyData[originalMonth].implantacao = Math.max(0, monthlyData[originalMonth].implantacao - recognized.amount);
                  } else {
                    monthlyData[originalMonth].recorrente = Math.max(0, monthlyData[originalMonth].recorrente - recognized.amount);
                  }
                }
              }
              
              // Adicionar na barra roxa (reconhecido) do mês selecionado
              if (monthlyData[recognizedMonth]) {
                monthlyData[recognizedMonth].reconhecido += recognized.amount;
              }
            });

            const chartData = Object.values(monthlyData);

            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico de Implantação */}
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-white">Receita de Implantação</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis 
                          dataKey="month" 
                          stroke="#94a3b8"
                          style={{ fontSize: '12px' }}
                        />
                        <YAxis 
                          stroke="#94a3b8"
                          style={{ fontSize: '12px' }}
                          tickFormatter={(value) => 
                            new Intl.NumberFormat('pt-BR', {
                              notation: 'compact',
                              compactDisplay: 'short'
                            }).format(value)
                          }
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                          formatter={(value) =>
                            new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(value)
                          }
                        />
                        <Bar dataKey="implantacao" fill="#10b981" name="Implantação" />
                        <Bar dataKey="reconhecido" fill="#a855f7" name="Reconhecido" />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 text-center">
                      <div className="text-2xl font-bold text-emerald-400">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          minimumFractionDigits: 0
                        }).format(chartData.reduce((sum, d) => sum + d.implantacao + d.reconhecido, 0))}
                      </div>
                      <div className="text-sm text-slate-400">Total Implantação (12 meses)</div>
                    </div>
                  </CardContent>
                </Card>

                {/* Gráfico de Recorrente */}
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-white">Receita Recorrente (MRR)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis 
                          dataKey="month" 
                          stroke="#94a3b8"
                          style={{ fontSize: '12px' }}
                        />
                        <YAxis 
                          stroke="#94a3b8"
                          style={{ fontSize: '12px' }}
                          tickFormatter={(value) => 
                            new Intl.NumberFormat('pt-BR', {
                              notation: 'compact',
                              compactDisplay: 'short'
                            }).format(value)
                          }
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                          formatter={(value) =>
                            new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(value)
                          }
                        />
                        <Bar dataKey="recorrente" fill="#3b82f6" name="Recorrente" />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 text-center">
                      <div className="text-2xl font-bold text-blue-400">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          minimumFractionDigits: 0
                        }).format(chartData.reduce((sum, d) => sum + d.recorrente, 0))}
                      </div>
                      <div className="text-sm text-slate-400">Total Recorrente (12 meses)</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* Recognized Revenue Modal */}
      {selectedProject && (
        <>
          <RecognizedRevenueModal
            isOpen={isRevenueModalOpen}
            onClose={() => {
              setIsRevenueModalOpen(false);
              setSelectedProject(null);
            }}
            onSave={(data) => createRecognizedRevenueMutation.mutate(data)}
            onRecognizeAll={(vertical, products) => {
              setSelectedVertical(vertical);
              setSelectedVerticalProducts(products);
              setIsRecognizeAllModalOpen(true);
            }}
            project={selectedProject}
            products={allProducts.filter(p => p.project_id === selectedProject.id)}
          />
          
          <RecognizeAllVerticalModal
            isOpen={isRecognizeAllModalOpen}
            onClose={() => {
              setIsRecognizeAllModalOpen(false);
              setSelectedVertical(null);
              setSelectedVerticalProducts([]);
            }}
            onSave={(recognitions) => createBulkRecognizedRevenueMutation.mutate(recognitions)}
            project={selectedProject}
            vertical={selectedVertical}
            products={selectedVerticalProducts}
          />
        </>
      )}
    </div>
  );
}