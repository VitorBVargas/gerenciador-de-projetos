import React, { useMemo, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { createPageUrl } from '../utils';
import { Link } from 'react-router-dom';
import ProjectsDeliveryTimeline from '../components/timeline/ProjectsDeliveryTimeline';
import PasswordReleasesChart from '../components/executive/PasswordReleasesChart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import RecognizedRevenueModal from '../components/modals/RecognizedRevenueModal';
import RecognizeAllVerticalModal from '../components/modals/RecognizeAllVerticalModal';
import AIAssistantModal from '../components/modals/AIAssistantModal';
import { Sparkles } from 'lucide-react';
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
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedMonthType, setSelectedMonthType] = useState(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isWeeklySummaryOpen, setIsWeeklySummaryOpen] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [visibleCharts, setVisibleCharts] = useState({
    implantacao: true,
    recorrente: true,
    password: true
  });
  const queryClient = useQueryClient();

  // Check if it's the first time accessing ExecutiveStatus today
  useEffect(() => {
    const lastVisitKey = 'executiveStatus_lastVisit';
    const today = new Date().toDateString();
    const lastVisit = localStorage.getItem(lastVisitKey);

    if (lastVisit !== today) {
      localStorage.setItem(lastVisitKey, today);
      setIsWeeklySummaryOpen(true);
    }
  }, []);

  const handleChartVisibility = (chart, visible) => {
    setVisibleCharts(prev => ({
      ...prev,
      [chart]: visible
    }));
  };

  // Fetch all projects
  const { data: allProjectsData = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
  });
  
  // Filter out completed projects from overview
  const projects = allProjectsData.filter(p => p.status !== 'concluido');
  
  // Debug log
  useEffect(() => {
    console.log('Total projects:', allProjectsData.length);
    console.log('Active projects:', projects.length);
    console.log('Projects:', allProjectsData.map(p => ({ name: p.name, status: p.status, id: p.id })));
  }, [allProjectsData, projects]);

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

  // Status counts - count cronogramas (project + vertical combinations)
  const statusData = useMemo(() => {
    const counts = {
      nao_iniciado: 0,
      em_dia: 0,
      atencao: 0,
      atrasado: 0,
      pausado: 0,
      concluido: 0
    };
    
    const cronogramasByStatus = {
      nao_iniciado: [],
      em_dia: [],
      atencao: [],
      atrasado: [],
      pausado: [],
      concluido: []
    };
    
    // Agrupar TimelineEvents por (project_id + vertical)
    const cronogramas = {};
    
    allTimelineEvents.forEach(event => {
      const key = event.vertical ? `${event.project_id}|${event.vertical}` : event.project_id;
      
      if (!cronogramas[key]) {
        cronogramas[key] = {
          project_id: event.project_id,
          vertical: event.vertical || null,
          title: event.vertical || allProjectsData.find(p => p.id === event.project_id)?.name || 'Sem nome',
          events: []
        };
      }
      cronogramas[key].events.push(event);
    });
    
    // Calcular status para cada cronograma
    const now = new Date();
    
    Object.values(cronogramas).forEach(cronograma => {
      let status = 'em_dia';
      const events = cronograma.events;
      
      if (events.length === 0) {
        status = 'nao_iniciado';
      } else if (events.every(e => e.status === 'concluido')) {
        status = 'concluido';
      } else if (events.some(e => e.status === 'pausado')) {
        status = 'pausado';
      } else if (events.some(e => {
        if (e.end_date) {
          const endDate = new Date(e.end_date);
          return endDate < now && e.status !== 'concluido';
        }
        return false;
      })) {
        status = 'atrasado';
      } else if (events.some(e => {
        if (e.end_date && e.status === 'nao_iniciado') {
          const endDate = new Date(e.end_date);
          return endDate >= now && endDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
        return false;
      })) {
        status = 'atencao';
      }
      
      counts[status]++;
      cronogramasByStatus[status].push(cronograma);
    });
    
    return { counts, cronogramasByStatus };
  }, [allTimelineEvents, allProjectsData]);

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

  // Generate weekly summary when ready
  useEffect(() => {
    if (isWeeklySummaryOpen && !weeklySummary && allTimelineEvents.length > 0) {
      generateWeeklySummary();
    }
  }, [isWeeklySummaryOpen, weeklySummary, allTimelineEvents]);

  const generateWeeklySummary = async () => {
    try {
      const thisWeek = new Date();
      const weekAgo = new Date(thisWeek.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      // Projetos concluídos esta semana
      const completedThisWeek = allProjectsData.filter(p => {
        if (!p.updated_date) return false;
        const updated = new Date(p.updated_date);
        return p.status === 'concluido' && updated >= weekAgo && updated <= thisWeek;
      });

      // Licenças liberadas esta semana
      const licensesReleasedThisWeek = allProducts.filter(p => {
        if (!p.updated_date) return false;
        const updated = new Date(p.updated_date);
        return p.production_password && updated >= weekAgo && updated <= thisWeek;
      });

      // Receitas reconhecidas esta semana
      const revenuesThisWeek = allRecognizedRevenues.filter(r => {
        if (!r.created_date) return false;
        const created = new Date(r.created_date);
        return created >= weekAgo && created <= thisWeek;
      });
      const totalRevenueThisWeek = revenuesThisWeek.reduce((sum, r) => sum + (r.amount || 0), 0);

      // Contar cronogramas por status manualmente (sem depender de statusData)
      const cronogramasMae = {};
      const now = new Date();
      
      allTimelineEvents.forEach(event => {
        const key = event.vertical ? `${event.project_id}|${event.vertical}` : event.project_id;
        if (!cronogramasMae[key]) {
          cronogramasMae[key] = { events: [] };
        }
        cronogramasMae[key].events.push(event);
      });

      const statusCounts = {
        em_dia: 0,
        atencao: 0,
        atrasado: 0
      };

      Object.values(cronogramasMae).forEach(cronograma => {
        const events = cronograma.events;
        
        if (events.some(e => {
          if (e.end_date) {
            const endDate = new Date(e.end_date);
            return endDate < now && e.status !== 'concluido';
          }
          return false;
        })) {
          statusCounts.atrasado++;
        } else if (events.some(e => {
          if (e.end_date && e.status === 'nao_iniciado') {
            const endDate = new Date(e.end_date);
            return endDate >= now && endDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          }
          return false;
        })) {
          statusCounts.atencao++;
        } else {
          statusCounts.em_dia++;
        }
      });

      // Usar IA para gerar resumo
      const summaryPrompt = `
Gere um resumo executivo semanal BREVE e DIRETO da situação do portfólio Betha.

DADOS DA SEMANA:
- Total de projetos ativos: ${allProjectsData.filter(p => p.status !== 'concluido').length}
- Projetos concluídos esta semana: ${completedThisWeek.length}
${completedThisWeek.length > 0 ? `  Projetos: ${completedThisWeek.map(p => p.name).join(', ')}` : ''}
- Licenças de produção liberadas: ${licensesReleasedThisWeek.length}
- Valores reconhecidos: R$ ${totalRevenueThisWeek.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
- Status dos cronogramas: ${statusCounts.em_dia} em dia, ${statusCounts.atencao} em atenção, ${statusCounts.atrasado} atrasados

Forneça:
1. Uma frase de abertura sobre a semana
2. Highlights dos 3 principais pontos (projetos concluídos, licenças, receitas)
3. Uma recomendação de ação imediata

Seja conciso, profissional e em português.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: summaryPrompt
      });

      setWeeklySummary(response);
    } catch (err) {
      console.error('Erro ao gerar resumo semanal:', err);
      setWeeklySummary('Resumo semanal indisponível no momento.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 p-6 lg:p-8 flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 lg:p-8 space-y-6 relative">
      {/* Botão flutuante da IA */}
      <button
        onClick={() => setIsAIModalOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all z-50"
        title="Abrir Assistente IA"
      >
        <Sparkles className="w-6 h-6" />
      </button>
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
          {/* Status Cards - Cronogramas por Status */}
          <div className="grid grid-cols-6 gap-2">
            <Card className="bg-slate-800 border-slate-600">
              <CardContent className="p-3 text-center flex flex-col items-center justify-center h-full">
                <div className="text-xl font-bold text-white mb-0.5">{Object.values(statusData.cronogramasByStatus).flat().length}</div>
                <div className="text-xs text-slate-300">Total</div>
              </CardContent>
            </Card>

            <TooltipProvider>
              {Object.entries(statusData.counts).filter(([status]) => status !== 'concluido').map(([status, count], idx) => {
                const Icon = statusIcons[status];
                const iconColorMap = {
                  'nao_iniciado': 'text-slate-400',
                  'em_dia': 'text-green-400',
                  'atencao': 'text-yellow-400',
                  'atrasado': 'text-red-400',
                  'pausado': 'text-orange-400'
                };
                
                const cronogramasInStatus = statusData.cronogramasByStatus[status] || [];
                
                return (
                  <Tooltip key={`status-${status}-${idx}`} delayDuration={200}>
                    <TooltipTrigger asChild>
                      <Card className="bg-slate-800 border-slate-600 hover:bg-slate-700 cursor-pointer transition-colors">
                        <CardContent className="p-3 text-center flex flex-col items-center justify-center h-full">
                          <div className="flex items-center justify-center mb-1">
                            <Icon className={cn("w-4 h-4", iconColorMap[status])} />
                          </div>
                          <div className="text-xl font-bold text-white mb-0.5">{count}</div>
                          <div className="text-xs text-slate-300">{statusLabels[status]}</div>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    {cronogramasInStatus.length > 0 && (
                      <TooltipContent 
                        side="bottom" 
                        className="bg-slate-800 border-slate-700 p-3 max-w-xs max-h-64 overflow-y-auto"
                      >
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-slate-400 mb-2">
                            {statusLabels[status]} ({cronogramasInStatus.length})
                          </div>
                          {cronogramasInStatus.map(cronograma => {
                            const project = allProjectsData.find(p => p.id === cronograma.project_id);
                            return (
                              <div 
                                key={`${cronograma.project_id}-${cronograma.vertical}`}
                                className="text-sm text-white py-1 border-b border-slate-700/50 last:border-0"
                              >
                                <div className="font-medium">{cronograma.title}</div>
                                <div className="text-xs text-slate-400">{project?.name}</div>
                              </div>
                            );
                          })}
                        </div>
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>

          {/* Status Cards - Segunda linha com dados adicionais */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-slate-800 border-slate-600">
              <CardContent className="p-3 text-center flex flex-col items-center justify-center h-full">
                <div className="text-lg font-bold text-white mb-0.5">{projects.length}</div>
                <div className="text-xs text-slate-300">Total Programas</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-600">
              <CardContent className="p-3 text-center flex flex-col items-center justify-center h-full">
                <div className="text-lg font-bold text-white mb-0.5">
                  {allProducts.filter(p => p.status === 'em_homologacao' || p.status === 'homologado').length}
                </div>
                <div className="text-xs text-slate-300">Produtos em Implantação</div>
              </CardContent>
            </Card>
          </div>

           {/* Projects Grid */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Projetos Ativos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectsWithMetrics.map(project => (
            <div key={project.id} className="relative">
              <Card className="bg-slate-800 border-slate-600 hover:bg-slate-700 transition-all h-full group">
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
                    <div className={cn("w-2.5 h-2.5 rounded-full", statusColors[project.dynamicStatus])} />
                    <span className="text-sm text-slate-300 font-medium">{statusLabels[project.dynamicStatus]}</span>
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300 font-medium">Progresso Geral</span>
                      <span className="text-white font-bold">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-3 bg-slate-700" />
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-600">
                    {project.manager && (
                      <div>
                        <div className="text-xs text-slate-400 font-medium">Gerente</div>
                        <div className="text-sm text-white truncate">{project.manager}</div>
                      </div>
                    )}
                    {project.deadline && (
                      <div>
                        <div className="text-xs text-slate-400 font-medium">Prazo</div>
                        <div className="text-sm text-white">
                          {new Date(project.deadline).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    )}
                    {project.implementation_value > 0 && (
                      <div>
                        <div className="text-xs text-slate-400 font-medium">Implantação</div>
                        <div className="text-sm text-emerald-400 font-semibold">
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
                        <div className="text-xs text-slate-400 font-medium">Recorrente</div>
                        <div className="text-sm text-emerald-400 font-semibold">
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
                      <div className="pt-3 border-t border-slate-600">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs text-slate-400 font-medium">Reconhecido</div>
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
                            const [year, month] = bulk.recognition_month.split('-');
                            const monthYear = format(new Date(year, parseInt(month) - 1, 1), 'MMM/yy', { locale: ptBR });
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
                            const [year, month] = rev.recognition_month.split('-');
                            const monthYear = format(new Date(year, parseInt(month) - 1, 1), 'MMM/yy', { locale: ptBR });
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
              <Card className="bg-slate-800 border-slate-600">
                <CardContent className="py-12 text-center">
                  <LayoutDashboard className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-300">Nenhum projeto ativo no momento</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Completed Projects Summary */}
          {statusData.counts.concluido > 0 && (
            <Card className="bg-slate-800 border-slate-600">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-purple-400" />
                  Cronogramas Concluídos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-400 mb-3">{statusData.counts.concluido}</div>
                <div className="text-sm text-slate-300 mb-4">cronogramas finalizados com sucesso</div>
                <div className="space-y-2 pt-3 border-t border-slate-600">
                  {statusData.projectsByStatus.concluido.map(project => (
                    <div key={project.id} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                      <span className="text-white">{project.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <ProjectsDeliveryTimeline 
            projects={allProjectsData}
            timelineEvents={allTimelineEvents}
            products={allProducts}
          />
        </TabsContent>

        {/* Financeiro Tab */}
        <TabsContent value="financeiro" className="space-y-6">
          {/* Controles de Visibilidade */}
          <PasswordReleasesChart 
            products={allProducts}
            visibleCharts={visibleCharts}
            onVisibilityChange={handleChartVisibility}
          />

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

            // Processar cada projeto ativo
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
              // Extrair mês diretamente da string (formato YYYY-MM-DD)
              const recognizedMonth = recognized.recognition_month.substring(0, 7); // YYYY-MM
              
              // Encontrar o projeto correspondente
              const project = allProjectsData.find(p => p.id === recognized.project_id);
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
                {visibleCharts.implantacao !== false && (
                <Card className="bg-slate-800 border-slate-600">
                  <CardHeader>
                    <CardTitle className="text-white">Receita de Implantação</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart 
                       data={chartData}
                      >
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
                       <RechartsTooltip
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
                       <Bar 
                         dataKey="implantacao" 
                         fill="#10b981" 
                         name="Implantação" 
                         cursor="pointer"
                         onClick={(data) => {
                           const monthKey = Object.keys(monthlyData).find(
                             key => monthlyData[key].month === data.month
                           );
                           setSelectedMonth(monthKey);
                           setSelectedMonthType('implantacao');
                         }}
                       />
                       <Bar 
                         dataKey="reconhecido" 
                         fill="#a855f7" 
                         name="Reconhecido" 
                         cursor="pointer"
                         onClick={(data) => {
                           const monthKey = Object.keys(monthlyData).find(
                             key => monthlyData[key].month === data.month
                           );
                           setSelectedMonth(monthKey);
                           setSelectedMonthType('reconhecido_implantacao');
                         }}
                       />
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
                  )}

                  {/* Gráfico de Recorrente */}
                  {visibleCharts.recorrente !== false && (
                  <Card className="bg-slate-800 border-slate-600">
                  <CardHeader>
                    <CardTitle className="text-white">Receita Recorrente (MRR)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart 
                       data={chartData}
                       onClick={(data) => {
                         if (data && data.activePayload && data.activePayload[0]) {
                           const monthKey = Object.keys(monthlyData).find(
                             key => monthlyData[key].month === data.activePayload[0].payload.month
                           );
                           setSelectedMonth(monthKey);
                           setSelectedMonthType('recorrente');
                         }
                       }}
                      >
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
                        <RechartsTooltip
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
                        <Bar dataKey="recorrente" fill="#3b82f6" name="Recorrente" cursor="pointer" />
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
                  )}
                  </div>
                  );
                  })()}

                  {/* Lista de produtos do mês selecionado */}
          {selectedMonth && (() => {
            const monthLabel = format(new Date(selectedMonth + '-01'), 'MMMM/yyyy', { locale: ptBR });
            
            // Se clicou em reconhecido
            if (selectedMonthType === 'reconhecido_implantacao' || selectedMonthType === 'reconhecido_recorrente') {
              // Buscar receitas reconhecidas neste mês
              const recognizedInMonth = allRecognizedRevenues.filter(r => {
                const recMonth = r.recognition_month.substring(0, 7);
                const typeMatch = selectedMonthType === 'reconhecido_implantacao' ? r.type === 'implantacao' : r.type === 'recorrente';
                return recMonth === selectedMonth && typeMatch;
              });
              
              if (recognizedInMonth.length === 0) return null;
              
              return (
                <Card className="bg-slate-800 border-slate-600">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white">
                        Reconhecido em {monthLabel} - {selectedMonthType === 'reconhecido_implantacao' ? 'Implantação' : 'Recorrente'}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedMonth(null);
                          setSelectedMonthType(null);
                        }}
                        className="text-slate-400 hover:text-white"
                      >
                        Fechar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recognizedInMonth.map((recognized) => {
                        const product = allProducts.find(p => p.id === recognized.product_id);
                        const project = allProjectsData.find(p => p.id === recognized.project_id);
                        
                        return (
                          <div 
                            key={recognized.id}
                            className="p-4 bg-purple-900/20 rounded-lg border border-purple-700/50 hover:border-purple-600 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge className="bg-purple-600 text-white text-xs">Reconhecido</Badge>
                                  <div className="font-semibold text-white">{product?.name || 'Produto deletado'}</div>
                                </div>
                                <div className="text-sm text-slate-400">Projeto: {project?.name || 'N/A'}</div>
                                {recognized.vertical_name && (
                                  <div className="text-xs text-purple-400 mt-1">Vertical: {recognized.vertical_name}</div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-purple-400">
                                  {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                    minimumFractionDigits: 0
                                  }).format(recognized.amount)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            }
            
            // Se clicou na barra normal (implantação ou recorrente do mês)
            const productsInMonth = [];
            
            allProjectsData.forEach(project => {
              const events = allTimelineEvents.filter(e => e.project_id === project.id);
              const goLiveEvent = events.find(e => 
                e.phase && (
                  e.phase === 'migracao_producao' || 
                  e.phase === 'operacao_assistida' ||
                  e.title?.toLowerCase().includes('go live') ||
                  e.title?.toLowerCase().includes('produção')
                )
              );
              
              if (goLiveEvent?.end_date) {
                const goLiveMonth = format(new Date(goLiveEvent.end_date), 'yyyy-MM');
                
                if (goLiveMonth === selectedMonth) {
                  const projectProducts = allProducts.filter(p => p.project_id === project.id);
                  
                  // Encontrar último evento (data de encerramento)
                  const sortedEvents = events
                    .filter(e => e.end_date)
                    .sort((a, b) => new Date(b.end_date) - new Date(a.end_date));
                  const endDate = sortedEvents[0]?.end_date;
                  
                  projectProducts.forEach(product => {
                    productsInMonth.push({
                      product,
                      project,
                      endDate
                    });
                  });
                }
              }
            });
            
            if (productsInMonth.length === 0) return null;
            
            return (
              <Card className="bg-slate-800 border-slate-600">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">
                      Produtos em {monthLabel} - {selectedMonthType === 'implantacao' ? 'Implantação (Go Live)' : 'Recorrente (Go Live)'}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedMonth(null);
                        setSelectedMonthType(null);
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      Fechar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {productsInMonth.map(({ product, project, endDate }) => (
                      <div 
                        key={product.id}
                        className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-emerald-600 text-white text-xs">Go Live</Badge>
                              <div className="font-semibold text-white">{product.name}</div>
                            </div>
                            <div className="text-sm text-slate-400">Projeto: {project.name}</div>
                          </div>
                          {endDate && (
                            <div className="text-right">
                              <div className="text-xs text-slate-500">Encerramento</div>
                              <div className="text-sm text-white">
                                {format(new Date(endDate), 'dd/MM/yyyy', { locale: ptBR })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* Weekly Summary Modal */}
      {weeklySummary && (
        <Dialog open={isWeeklySummaryOpen} onOpenChange={setIsWeeklySummaryOpen}>
          <DialogContent className="max-w-2xl bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white text-xl">Resumo Executivo Semanal</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Resumo IA */}
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <p className="text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">{weeklySummary}</p>
              </div>

              {/* Cards de Métricas */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-slate-700 border-slate-600">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400 mb-1">
                      {allProjectsData.filter(p => p.status === 'concluido').length}
                    </div>
                    <div className="text-xs text-slate-400">Projetos Concluídos</div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-700 border-slate-600">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-emerald-400 mb-1">
                      {allProducts.filter(p => p.production_password).length}
                    </div>
                    <div className="text-xs text-slate-400">Licenças Liberadas</div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-700 border-slate-600">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-400 mb-1">
                      {new Intl.NumberFormat('pt-BR', {
                        notation: 'compact',
                        compactDisplay: 'short'
                      }).format(allRecognizedRevenues.reduce((sum, r) => sum + (r.amount || 0), 0))}
                    </div>
                    <div className="text-xs text-slate-400">Reconhecido</div>
                  </CardContent>
                </Card>
              </div>

              {/* Status de Cronogramas */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-3">
                  <div className="font-semibold text-green-400 mb-1">Em Dia</div>
                  <div className="text-white text-lg">{statusData.counts.em_dia} cronogramas</div>
                </div>
                <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
                  <div className="font-semibold text-red-400 mb-1">Atrasados</div>
                  <div className="text-white text-lg">{statusData.counts.atrasado} cronogramas</div>
                </div>
                <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3">
                  <div className="font-semibold text-yellow-400 mb-1">Atenção</div>
                  <div className="text-white text-lg">{statusData.counts.atencao} cronogramas</div>
                </div>
                <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-3">
                  <div className="font-semibold text-purple-400 mb-1">Concluídos</div>
                  <div className="text-white text-lg">{statusData.counts.concluido} cronogramas</div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-700">
              <Button
                variant="outline"
                onClick={() => setIsWeeklySummaryOpen(false)}
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                Entendi
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* AI Assistant Modal */}
      <AIAssistantModal 
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
      />

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
            onRecognizeAll={(vertical, products, data) => {
              if (data) {
                // Criar reconhecimentos diretamente
                const verticalLabel = {
                  arrecadacao: 'Arrecadação',
                  compras: 'Compras/Contratos',
                  contabil: 'Contábil',
                  pessoal: 'Pessoal',
                  educacao: 'Educação',
                  iss: 'ISS',
                  parceiros: 'Parceiros',
                  plataforma: 'Plataforma',
                  atendimento: 'Atendimento',
                  outros: 'Outros'
                }[vertical] || vertical;
                
                const amountPerProduct = data.amount / products.length;
                
                const recognitions = products.map(product => ({
                  project_id: selectedProject.id,
                  product_id: product.id,
                  amount: amountPerProduct,
                  recognition_month: data.recognition_month,
                  type: data.type,
                  vertical_name: verticalLabel
                }));
                
                createBulkRecognizedRevenueMutation.mutate(recognitions);
                setIsRevenueModalOpen(false);
              }
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