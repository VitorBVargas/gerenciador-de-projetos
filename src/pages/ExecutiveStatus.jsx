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
  DollarSign,
  Loader2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { createPageUrl } from '../utils';
import { Link } from 'react-router-dom';

import PasswordReleasesChart from '../components/executive/PasswordReleasesChart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import RecognizedRevenueModal from '../components/modals/RecognizedRevenueModal';
import RecognizeAllVerticalModal from '../components/modals/RecognizeAllVerticalModal';
import ProjectRecognitionsModal from '../components/modals/ProjectRecognitionsModal';
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
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
  const [isRecognizeAllModalOpen, setIsRecognizeAllModalOpen] = useState(false);
  const [selectedVertical, setSelectedVertical] = useState(null);
  const [selectedVerticalProducts, setSelectedVerticalProducts] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedMonthType, setSelectedMonthType] = useState(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [recognitionsModalProject, setRecognitionsModalProject] = useState(null);
  const [isWeeklySummaryOpen, setIsWeeklySummaryOpen] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [visibleCharts, setVisibleCharts] = useState({
    implantacao: true,
    recorrente: true,
    password: true
  });
  const [isAnalyzingPortfolio, setIsAnalyzingPortfolio] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [recorrenteProductsMap, setRecorrenteProductsMap] = useState({});
  const queryClient = useQueryClient();

  // Inicializar conversa IA
  useEffect(() => {
    const initConversation = async () => {
      try {
        const conv = await base44.agents.createConversation({
          agent_name: 'ia_projetos_betha',
          metadata: { type: 'executive' }
        });
        setConversation(conv);
      } catch (error) {
        console.error('Erro ao criar conversa:', error);
      }
    };
    initConversation();
  }, []);

  const handleChartVisibility = (chart, visible) => {
    setVisibleCharts(prev => ({
      ...prev,
      [chart]: visible
    }));
  };

  const analyzePortfolioStatus = async () => {
    if (!conversation) return;
    
    setIsAnalyzingPortfolio(true);
    try {
      const completedCount = allProjectsData.filter(p => p.status === 'concluido').length;
      const releasedPasswords = allProducts.filter(p => p.production_password).length;
      const totalRecognized = allRecognizedRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);

      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: `Faça uma análise inteligente do status atual do portfólio de clientes Premium SC/MG.

Dados do Portfólio:
- Projetos concluídos: ${completedCount}
- Projetos ativos: ${projects.length}
- Produtos em implantação: ${allProducts.filter(p => {
          const project = allProjectsData.find(proj => proj.id === p.project_id);
          return project && project.status !== 'concluido';
        }).length}
- Licenças de produção liberadas: ${releasedPasswords}
- Total reconhecido em receita: R$ ${totalRecognized.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
- Cronogramas em dia: ${statusData.counts.em_dia}
- Cronogramas com atenção: ${statusData.counts.atencao}
- Cronogramas atrasados: ${statusData.counts.atrasado}
- Cronogramas concluídos: ${statusData.counts.concluido}

Analise:
1. **Status Geral**: Como está a saúde do portfólio
2. **Avanços**: Quais foram os principais avanços (projetos concluídos, licenças, receita)
3. **Atenção**: Cronogramas ou projetos que precisam atenção imediata
4. **Próximas Prioridades**: O que deve ser focado
5. **Métricas**: Resumo das principais métricas

Seja conciso e executivo.`
      });

      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Erro ao analisar portfólio:', error);
    } finally {
      setIsAnalyzingPortfolio(false);
    }
  };

  // Fetch all projects
  const { data: allProjectsData = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
  });
  
  // Filter out completed projects from overview
  const projects = allProjectsData.filter(p => p.status !== 'concluido');
  


  // Fetch all cronogramas
  const { data: allCronogramas = [] } = useQuery({
    queryKey: ['allCronogramas'],
    queryFn: () => base44.entities.Cronograma.list()
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

  // Status counts - count cronogramas from Cronograma entity
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
    
    const now = new Date();
    
    // Contar cronogramas reais + calcular status baseado em TimelineEvents
    allCronogramas.forEach(cronograma => {
      // Buscar TimelineEvents associados a este cronograma
      const events = allTimelineEvents.filter(e => e.cronograma_id === cronograma.id);
      
      let status = cronograma.status || 'nao_iniciado';
      
      // Recalcular status baseado nas etapas vinculadas
      if (events.length > 0) {
        if (events.every(e => e.status === 'concluido')) {
          status = 'concluido';
        }
        else if (events.some(e => e.status === 'atrasado')) {
          status = 'atrasado';
        }
        else if (events.some(e => {
          if (e.end_date && e.status !== 'concluido') {
            const endDate = new Date(e.end_date);
            const daysUntil = (endDate - now) / (1000 * 60 * 60 * 24);
            return daysUntil >= 0 && daysUntil <= 7;
          }
          return false;
        })) {
          status = 'atencao';
        }
        else if (events.every(e => e.status === 'nao_iniciado')) {
          status = 'nao_iniciado';
        }
        else {
          status = 'em_dia';
        }
      }
      
      counts[status]++;
      cronogramasByStatus[status].push({
        ...cronograma,
        status,
        title: cronograma.vertical,
        projectName: allProjectsData.find(p => p.id === cronograma.project_id)?.name || 'Sem nome',
        events
      });
    });
    

    
    return { counts, cronogramasByStatus };
  }, [allCronogramas, allTimelineEvents, allProjectsData]);

  // Recalcular mapa de produtos recorrentes sempre que os dados mudarem
  useEffect(() => {
    const map = {};
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const key = format(addMonths(now, i), 'yyyy-MM');
      map[key] = [];
    }
    projects.forEach(project => {
      const projectProducts = allProducts.filter(p => p.project_id === project.id);
      if (!projectProducts.length) return;
      if (project.scheduling_type === 'por_vertical') {
        const verticalGroups = {};
        projectProducts.forEach(prod => {
          const v = prod.vertical || 'outros';
          if (!verticalGroups[v]) verticalGroups[v] = [];
          verticalGroups[v].push(prod);
        });
        Object.entries(verticalGroups).forEach(([vertical, prods]) => {
          const cronograma = allCronogramas.find(c => c.project_id === project.id && c.vertical === vertical);
          
          // Se cronograma existe com evento, usa para todos
          if (cronograma) {
            const migEvent = allTimelineEvents.find(e => e.cronograma_id === cronograma.id && e.phase === 'migracao_prd_blackout');
            if (migEvent && migEvent.start_date) {
              const migMonth = migEvent.start_date.substring(0, 7);
              if (map[migMonth]) {
                prods.forEach(prod => {
                  map[migMonth].push({ product: prod, project, vertical, startDate: migEvent.start_date, inclusionValue: prod.inclusion_value || 0 });
                });
              }
              return;
            }
          }
          
          // Se não encontrou por cronograma, busca cada produto individualmente
          prods.forEach(prod => {
            const migEvent = allTimelineEvents.find(e => e.product_id === prod.id && e.phase === 'migracao_prd_blackout');
            if (!migEvent || !migEvent.start_date) return;
            const migMonth = migEvent.start_date.substring(0, 7);
            if (!map[migMonth]) return;
            map[migMonth].push({ product: prod, project, vertical, startDate: migEvent.start_date, inclusionValue: prod.inclusion_value || 0 });
          });
        });
      } else {
        projectProducts.forEach(prod => {
          const migEvent = allTimelineEvents.find(e => e.product_id === prod.id && e.phase === 'migracao_prd_blackout');
          if (!migEvent || !migEvent.start_date) return;
          const migMonth = migEvent.start_date.substring(0, 7);
          if (!map[migMonth]) return;
          map[migMonth].push({ product: prod, project, startDate: migEvent.start_date, inclusionValue: prod.inclusion_value || 0 });
        });
      }
    });
    setRecorrenteProductsMap(map);
  }, [allProducts, allTimelineEvents, allCronogramas, projects]);

  // Calculate project with health status
  const projectsWithMetrics = useMemo(() => {
    return projects.map(project => {
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
  }, [projects, allTimelineEvents, allHomologationTasks, allMigrationTasks, allRisks, allExpenses, allRecognizedRevenues]);

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

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <Link to={createPageUrl('ProjectsList')}>
            <button className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Voltar para Projetos</span>
            </button>
          </Link>
          <Button 
            onClick={() => analyzePortfolioStatus()}
            disabled={isAnalyzingPortfolio}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isAnalyzingPortfolio ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Análise Inteligente
              </>
            )}
          </Button>
        </div>
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
          <TabsTrigger value="financeiro" className="data-[state=active]:bg-blue-600">
            Financeiro
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Cards com dados adicionais + Farois */}
          <div className="flex gap-2 items-stretch flex-wrap">
            <Card 
              className={cn("bg-slate-800 border-slate-600 flex-1 min-w-[120px] cursor-pointer hover:bg-slate-700 transition-colors", !selectedStatusFilter && 'ring-2 ring-blue-500')}
              onClick={() => setSelectedStatusFilter(null)}
            >
              <CardContent className="p-2 text-center flex flex-col items-center justify-center h-full">
                <div className="text-base font-bold text-white mb-0.5">{projects.length}</div>
                <div className="text-xs text-slate-300">Total Programas</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-600 flex-1 min-w-[140px]">
              <CardContent className="p-2 text-center flex flex-col items-center justify-center h-full">
                <div className="text-base font-bold text-white mb-0.5">
                  {allProducts.filter(p => {
                    const project = allProjectsData.find(proj => proj.id === p.project_id);
                    return project && project.status !== 'concluido';
                  }).length}
                </div>
                <div className="text-xs text-slate-300">Prod. Implantação</div>
              </CardContent>
            </Card>

            {(() => {
              const emDias = projectsWithMetrics.filter(p => p.healthScore > 60).length;
              const emAlerta = projectsWithMetrics.filter(p => p.healthScore >= 50 && p.healthScore <= 60).length;
              const atrasado = projectsWithMetrics.filter(p => p.healthScore < 50).length;
              const concluidos = allProjectsData.filter(p => p.status === 'concluido').length;

              return (
                <>
                  <Card 
                    className={cn("bg-slate-800 border-slate-600 flex-1 min-w-[100px] cursor-pointer hover:bg-slate-700 transition-colors", selectedStatusFilter === 'emDias' && 'ring-2 ring-green-500')}
                    onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'emDias' ? null : 'emDias')}
                  >
                    <CardContent className="p-2 text-center flex flex-col items-center justify-center h-full">
                      <div className="text-base font-bold text-green-400 mb-0.5">{emDias}</div>
                      <div className="text-xs text-green-300">Em Dia</div>
                    </CardContent>
                  </Card>

                  <Card 
                    className={cn("bg-slate-800 border-slate-600 flex-1 min-w-[100px] cursor-pointer hover:bg-slate-700 transition-colors", selectedStatusFilter === 'emAlerta' && 'ring-2 ring-yellow-500')}
                    onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'emAlerta' ? null : 'emAlerta')}
                  >
                    <CardContent className="p-2 text-center flex flex-col items-center justify-center h-full">
                      <div className="text-base font-bold text-yellow-400 mb-0.5">{emAlerta}</div>
                      <div className="text-xs text-yellow-300">Alerta</div>
                    </CardContent>
                  </Card>

                  <Card 
                    className={cn("bg-slate-800 border-slate-600 flex-1 min-w-[100px] cursor-pointer hover:bg-slate-700 transition-colors", selectedStatusFilter === 'atrasado' && 'ring-2 ring-red-500')}
                    onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'atrasado' ? null : 'atrasado')}
                  >
                    <CardContent className="p-2 text-center flex flex-col items-center justify-center h-full">
                      <div className="text-base font-bold text-red-400 mb-0.5">{atrasado}</div>
                      <div className="text-xs text-red-300">Atrasado</div>
                    </CardContent>
                  </Card>

                  <Card 
                    className={cn("bg-slate-800 border-slate-600 flex-1 min-w-[100px] cursor-pointer hover:bg-slate-700 transition-colors", selectedStatusFilter === 'concluidos' && 'ring-2 ring-purple-500')}
                    onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'concluidos' ? null : 'concluidos')}
                  >
                    <CardContent className="p-2 text-center flex flex-col items-center justify-center h-full">
                      <div className="text-base font-bold text-purple-400 mb-0.5">{concluidos}</div>
                      <div className="text-xs text-purple-300">Concluídos</div>
                    </CardContent>
                  </Card>
                </>
              );
            })()}
          </div>

           {/* Projects Grid */}
           <div>
             <h2 className="text-xl font-bold text-white mb-4">
               {selectedStatusFilter ? (
                 <>
                   Projetos {
                     selectedStatusFilter === 'emDias' ? 'Em Dia' :
                     selectedStatusFilter === 'emAlerta' ? 'Em Alerta' :
                     selectedStatusFilter === 'atrasado' ? 'Atrasados' :
                     'Concluídos'
                   }
                   <button 
                     onClick={() => setSelectedStatusFilter(null)}
                     className="ml-3 text-sm text-slate-400 hover:text-white"
                   >
                     ✕ Limpar filtro
                   </button>
                 </>
               ) : (
                 'Projetos Ativos'
               )}
             </h2>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {projectsWithMetrics.filter(project => {
             if (!selectedStatusFilter) return true;
             if (selectedStatusFilter === 'emDias') return project.healthScore > 60;
             if (selectedStatusFilter === 'emAlerta') return project.healthScore >= 50 && project.healthScore <= 60;
             if (selectedStatusFilter === 'atrasado') return project.healthScore < 50;
             if (selectedStatusFilter === 'concluidos') return project.status === 'concluido';
             return true;
           }).map(project => (
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
                      <div className="flex items-center gap-1">
                        {allRecognizedRevenues.some(r => r.project_id === project.id) && (
                          <Button
                            size="icon"
                            onClick={(e) => {
                              e.preventDefault();
                              setRecognitionsModalProject(project);
                            }}
                            className="h-8 w-8 bg-purple-800/50 hover:bg-purple-700 border border-purple-600/40 shrink-0"
                            title="Ver reconhecimentos"
                          >
                            <Sparkles className="w-4 h-4 text-purple-300" />
                          </Button>
                        )}

                      </div>
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

          {/* Projetos Concluídos */}
          {allProjectsData.filter(p => p.status === 'concluido').length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Projetos Concluídos</h2>
              <Card className="bg-slate-800 border-slate-600">
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-700">
                    {allProjectsData.filter(p => p.status === 'concluido').map((project) => (
                      <div key={project.id} className="p-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors">
                        <span className="text-white font-medium">{project.name}</span>
                        {project.deadline && (
                          <span className="text-sm text-slate-400">
                            {format(new Date(project.deadline), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Completed Cronogramas Summary */}
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
                  {statusData.cronogramasByStatus.concluido.map(cronograma => {
                    const project = allProjectsData.find(p => p.id === cronograma.project_id);
                    return (
                      <div key={`${cronograma.project_id}-${cronograma.vertical}`} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                        <span className="text-white">{cronograma.title}</span>
                        <span className="text-slate-400 text-xs">({project?.name})</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Financeiro Tab */}
        <TabsContent value="financeiro" className="space-y-6">
          {/* Controles de Visibilidade */}
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm">Gráficos do Financeiro</h3>
            <div className="flex items-center gap-4 ml-auto pl-4">
              <div className="flex items-center gap-1.5">
                <input 
                  type="checkbox"
                  id="implantacao-chart"
                  checked={visibleCharts?.implantacao !== false}
                  onChange={(e) => handleChartVisibility('implantacao', e.target.checked)}
                  className="w-4 h-4 rounded cursor-pointer"
                />
                <label htmlFor="implantacao-chart" className="text-xs text-slate-300 cursor-pointer whitespace-nowrap">
                  Implantação
                </label>
              </div>
              <div className="flex items-center gap-1.5">
                <input 
                  type="checkbox"
                  id="recorrente-chart"
                  checked={visibleCharts?.recorrente !== false}
                  onChange={(e) => handleChartVisibility('recorrente', e.target.checked)}
                  className="w-4 h-4 rounded cursor-pointer"
                />
                <label htmlFor="recorrente-chart" className="text-xs text-slate-300 cursor-pointer whitespace-nowrap">
                  Recorrente
                </label>
              </div>
              <div className="flex items-center gap-1.5">
                <input 
                  type="checkbox"
                  id="password-chart"
                  checked={visibleCharts?.password !== false}
                  onChange={(e) => handleChartVisibility('password', e.target.checked)}
                  className="w-4 h-4 rounded cursor-pointer"
                />
                <label htmlFor="password-chart" className="text-xs text-slate-300 cursor-pointer whitespace-nowrap">
                  Senhas de Produção
                </label>
              </div>
            </div>
          </div>

           {useMemo(() => {
                      // ─── CONFIGURAÇÃO DE DATAS ────────────────────────────────────────────
                      // Para alterar de onde buscamos a data de implantação de cada projeto,
                      // edite APENAS esta função:
                      const getImplantacaoMonth = (project) => {
               // FONTE ATUAL: Fim da Operação Assistida
               let operacaoAssistidaEvent = null;

               // Se é por vertical, busca nos cronogramas
               if (project.scheduling_type === 'por_vertical') {
                 const projectCronogramas = allCronogramas.filter(c => c.project_id === project.id);
                 for (const cron of projectCronogramas) {
                   const event = allTimelineEvents.find(e => 
                     e.cronograma_id === cron.id && e.phase === 'operacao_assistida' && e.end_date
                   );
                   if (event) {
                     operacaoAssistidaEvent = event;
                     break;
                   }
                 }
               } 
               // Se é por produto, busca nos produtos
               else if (project.scheduling_type === 'por_produto') {
                 const projectProducts = allProducts.filter(p => p.project_id === project.id);
                 for (const prod of projectProducts) {
                   const event = allTimelineEvents.find(e => 
                     e.product_id === prod.id && e.phase === 'operacao_assistida' && e.end_date
                   );
                   if (event) {
                     operacaoAssistidaEvent = event;
                     break;
                   }
                 }
               }

               // Fallback: buscar por project_id direto
               if (!operacaoAssistidaEvent) {
                 operacaoAssistidaEvent = allTimelineEvents.find(e => 
                   e.project_id === project.id && e.phase === 'operacao_assistida' && e.end_date
                 );
               }

               if (operacaoAssistidaEvent && operacaoAssistidaEvent.end_date) {
                 return operacaoAssistidaEvent.end_date.substring(0, 7);
               }

               return null;
             };
             // ─────────────────────────────────────────────────────────────────────

             // Calcular valores por mês
             const monthlyData = {};
             // monthlyRecorrenteProducts: { [monthKey]: [{product, project, cronograma, startDate}] }
             const monthlyRecorrenteProducts = {};

             // Começar do janeiro do ano atual/corrente
             const currentYear = new Date().getFullYear();
             const janFirst = new Date(currentYear, 0, 1); // Janeiro do ano atual

             // Gerar 12 meses começando de janeiro
             for (let i = 0; i < 12; i++) {
               const month = addMonths(janFirst, i);
               const key = format(month, 'yyyy-MM');
               monthlyData[key] = {
                 month: format(month, 'MMM/yy', { locale: ptBR }),
                 implantacao: 0,
                 a_receber: 0,
                 recorrente: 0,
                 reconhecido: 0
               };
               monthlyRecorrenteProducts[key] = [];
             }

            // Pré-calcular total reconhecido por projeto
            const activeProjectIds = new Set(projects.map(p => p.id));
            const totalRecognizedByProject = {};
            allRecognizedRevenues.forEach(recognized => {
              if (!activeProjectIds.has(recognized.project_id)) return;
              if (!totalRecognizedByProject[recognized.project_id]) {
                totalRecognizedByProject[recognized.project_id] = { implantacao: 0, recorrente: 0 };
              }
              if (recognized.type === 'implantacao') {
                totalRecognizedByProject[recognized.project_id].implantacao += recognized.amount;
              } else {
                totalRecognizedByProject[recognized.project_id].recorrente += recognized.amount;
              }
            });

            // Processar implantação (por prazo contratual do projeto)
            projects.forEach(project => {
              const implantacaoMonth = getImplantacaoMonth(project);
              if (!implantacaoMonth || !monthlyData[implantacaoMonth]) return;

              const recognized = totalRecognizedByProject[project.id] || { implantacao: 0, recorrente: 0 };

              // Somar implementation_value dos produtos do projeto
              const projectProducts = allProducts.filter(p => p.project_id === project.id);
              const totalImplValue = projectProducts.reduce((sum, p) => sum + (p.implementation_value || 0), 0);

              if (totalImplValue > 0) {
                const pendente = Math.max(0, totalImplValue - recognized.implantacao);
                monthlyData[implantacaoMonth].implantacao += totalImplValue;
                monthlyData[implantacaoMonth].a_receber += pendente;
              }
            });

            // Processar recorrente: por data de início da etapa migracao_prd_blackout por produto
            // Se projeto for por vertical: todos os produtos daquela vertical entram juntos
            // Se for por produto: cada produto tem seu próprio timeline
            projects.forEach(project => {
              const projectProducts = allProducts.filter(p => p.project_id === project.id);
              if (!projectProducts.length) return;

              if (project.scheduling_type === 'por_vertical') {
                // Agrupar produtos por vertical
                const verticalGroups = {};
                projectProducts.forEach(prod => {
                  const v = prod.vertical || 'outros';
                  if (!verticalGroups[v]) verticalGroups[v] = [];
                  verticalGroups[v].push(prod);
                });

                Object.entries(verticalGroups).forEach(([vertical, prods]) => {
                  // Buscar cronograma da vertical
                  const cronograma = allCronogramas.find(c => c.project_id === project.id && c.vertical === vertical);
                  
                  // Se cronograma existe com evento, usa para todos os produtos
                  if (cronograma) {
                    const migEvent = allTimelineEvents.find(e => 
                      e.cronograma_id === cronograma.id && e.phase === 'migracao_prd_blackout'
                    );
                    
                    if (migEvent && migEvent.start_date) {
                      const migMonth = migEvent.start_date.substring(0, 7);
                      if (monthlyData[migMonth]) {
                        const totalInclusao = prods.reduce((sum, p) => sum + (p.inclusion_value || 0), 0);
                        monthlyData[migMonth].recorrente += totalInclusao;

                        prods.forEach(prod => {
                          monthlyRecorrenteProducts[migMonth].push({
                            product: prod,
                            project,
                            vertical,
                            startDate: migEvent.start_date,
                            inclusionValue: prod.inclusion_value || 0
                          });
                        });
                      }
                      return;
                    }
                  }
                  
                  // Se não encontrou por cronograma, busca cada produto individualmente
                  prods.forEach(prod => {
                    const migEvent = allTimelineEvents.find(e => 
                      e.product_id === prod.id && e.phase === 'migracao_prd_blackout'
                    );
                    
                    if (!migEvent || !migEvent.start_date) return;
                    
                    const migMonth = migEvent.start_date.substring(0, 7);
                    if (!monthlyData[migMonth]) return;

                    monthlyData[migMonth].recorrente += (prod.inclusion_value || 0);
                    monthlyRecorrenteProducts[migMonth].push({
                      product: prod,
                      project,
                      vertical,
                      startDate: migEvent.start_date,
                      inclusionValue: prod.inclusion_value || 0
                    });
                  });
                });
              } else {
                // Por produto: cada produto tem seu próprio cronograma/timeline
                projectProducts.forEach(prod => {
                  // Buscar TimelineEvents do produto com fase migracao_prd_blackout
                  const migEvent = allTimelineEvents.find(e =>
                    e.product_id === prod.id && e.phase === 'migracao_prd_blackout'
                  );
                  if (!migEvent || !migEvent.start_date) return;

                  const migMonth = migEvent.start_date.substring(0, 7);
                  if (!monthlyData[migMonth]) return;

                  monthlyData[migMonth].recorrente += (prod.inclusion_value || 0);
                  monthlyRecorrenteProducts[migMonth].push({
                    product: prod,
                    project,
                    startDate: migEvent.start_date,
                    inclusionValue: prod.inclusion_value || 0
                  });
                });
              }
            });

            // Roxo = cada reconhecimento de implantação aparece no seu próprio mês
            allRecognizedRevenues.forEach(recognized => {
              if (recognized.type !== 'implantacao') return;
              const project = allProjectsData.find(p => p.id === recognized.project_id);
              if (!project || project.status === 'concluido') return;

              const recMonth = recognized.recognition_month.substring(0, 7);
              if (monthlyData[recMonth]) {
                monthlyData[recMonth].reconhecido += recognized.amount;
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
                       onClick={(data) => {
                         if (data && data.activeLabel) {
                           const monthKey = Object.keys(monthlyData).find(
                             key => monthlyData[key].month === data.activeLabel
                           );
                           if (monthKey) {
                             setSelectedMonth(monthKey);
                             setSelectedMonthType('implantacao');
                           }
                         }
                       }}
                       style={{ cursor: 'pointer' }}
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
                           content={({ active, payload, label }) => {
                             if (!active || !payload || !payload.length) return null;
                             const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
                             return (
                               <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13 }}>
                                 <div style={{ marginBottom: 4, fontWeight: 600 }}>{label}</div>
                                 {payload.map((entry) => (
                                   <div key={entry.dataKey} style={{ color: entry.fill }}>
                                     {entry.name} : {fmt(entry.value)}
                                   </div>
                                 ))}
                               </div>
                             );
                           }}
                         />
                         <Bar 
                           dataKey="a_receber" 
                           fill="#10b981" 
                           name="A Receber" 
                           cursor="pointer"
                         onClick={(data) => {
                           const monthKey = Object.keys(monthlyData).find(
                             key => monthlyData[key].month === data.month
                           );
                           if (monthKey) {
                             setSelectedMonth(monthKey);
                             setSelectedMonthType('implantacao');
                           }
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
                    <CardTitle className="text-white">Previsão de Inclusão (Recorrente)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart 
                       data={chartData}
                       onClick={(data) => {
                         if (data && data.activeLabel) {
                           const monthKey = Object.keys(monthlyData).find(
                             key => monthlyData[key].month === data.activeLabel
                           );
                           if (monthKey) {
                             setSelectedMonth(monthKey);
                             setSelectedMonthType('recorrente');
                           }
                         }
                       }}
                       style={{ cursor: 'pointer' }}
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
                          dataKey="recorrente" 
                          fill="#3b82f6" 
                          name="Previsão Inclusão" 
                          cursor="pointer"
                          onClick={(data) => {
                            const monthKey = Object.keys(monthlyData).find(
                              key => monthlyData[key].month === data.month
                            );
                            if (monthKey) {
                              setSelectedMonth(monthKey);
                              setSelectedMonthType('recorrente');
                            }
                          }}
                        />
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
                  }, [projects, allProducts, allTimelineEvents, allCronogramas, allRecognizedRevenues, allProjectsData, visibleCharts])}

                  {/* Gráfico de Senhas */}
                  <PasswordReleasesChart 
                  products={allProducts}
                  projects={allProjectsData}
                  visibleCharts={visibleCharts}
                  onVisibilityChange={handleChartVisibility}
                  />

                  {/* Lista de produtos do mês selecionado */}
                  {selectedMonth && selectedMonthType === 'recorrente' && (() => {
                  const monthLabel = format(new Date(selectedMonth + '-01'), 'MMMM/yyyy', { locale: ptBR });
                  let recorrenteProds = recorrenteProductsMap[selectedMonth] || [];

                  if (recorrenteProds.length === 0) {
                    recorrenteProds = [];
                    projects.forEach(project => {
                      const projectProducts = allProducts.filter(p => p.project_id === project.id && (p.inclusion_value || 0) > 0);
                      projectProducts.forEach(prod => {
                        recorrenteProds.push({
                          product: prod,
                          project,
                          vertical: prod.vertical,
                          startDate: null,
                          inclusionValue: prod.inclusion_value || 0
                        });
                      });
                    });
                  }

                  if (recorrenteProds.length === 0) return null;

                  return (
                  <Card className="bg-slate-800 border-slate-600">
                  <CardHeader>
                   <div className="flex items-center justify-between">
                     <CardTitle className="text-white">Previsão de Inclusão — {monthLabel}</CardTitle>
                     <Button variant="ghost" size="sm" onClick={() => { setSelectedMonth(null); setSelectedMonthType(null); }} className="text-slate-400 hover:text-white">Fechar</Button>
                   </div>
                  </CardHeader>
                  <CardContent>
                   <div className="space-y-2">
                     {recorrenteProds.map(({ product, project, vertical, startDate, inclusionValue }, idx) => (
                       <div key={`${product.id}-${idx}`} className="p-3 bg-blue-900/20 rounded-lg border border-blue-700/50">
                         <div className="flex items-start justify-between gap-4">
                           <div className="flex-1">
                             <div className="font-semibold text-white text-sm">{product.name}</div>
                             <div className="text-xs text-slate-400">Projeto: {project.name}</div>
                             {vertical && <div className="text-xs text-blue-400">Vertical: {vertical}</div>}
                             {startDate && <div className="text-xs text-slate-500">Início migração prd: {format(new Date(startDate), 'dd/MM/yyyy', { locale: ptBR })}</div>}
                           </div>
                           <div className="text-right shrink-0">
                             <div className="text-sm font-semibold text-blue-400">
                               {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(inclusionValue)}/mês
                             </div>
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                   <div className="mt-3 pt-3 border-t border-slate-600 flex justify-end">
                     <div className="text-sm text-blue-300 font-semibold">
                       Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(recorrenteProds.reduce((s, r) => s + r.inclusionValue, 0))}/mês
                     </div>
                   </div>
                  </CardContent>
                  </Card>
                  );
                  })()}

                  {selectedMonth && (selectedMonthType === 'reconhecido_implantacao' || selectedMonthType === 'reconhecido_recorrente') && (() => {
                  const monthLabel = format(new Date(selectedMonth + '-01'), 'MMMM/yyyy', { locale: ptBR });
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
                  })()}

                  {selectedMonth && selectedMonthType === 'implantacao' && (() => {
                  const monthLabel = format(new Date(selectedMonth + '-01'), 'MMMM/yyyy', { locale: ptBR });
                  const productsInMonth = [];

                  const totalRecognizedByProjectLocal = {};
                  allRecognizedRevenues.forEach(r => {
                  if (!totalRecognizedByProjectLocal[r.project_id]) {
                  totalRecognizedByProjectLocal[r.project_id] = { implantacao: 0, recorrente: 0 };
                  }
                  if (r.type === 'implantacao') totalRecognizedByProjectLocal[r.project_id].implantacao += r.amount;
                  else totalRecognizedByProjectLocal[r.project_id].recorrente += r.amount;
                  });

                  projects.forEach(project => {
                  const implMonth = getImplantacaoMonth(project);
                  if (!implMonth || implMonth !== selectedMonth) return;

                  const recognized = totalRecognizedByProjectLocal[project.id] || { implantacao: 0, recorrente: 0 };

                  const projectProducts = allProducts.filter(p => p.project_id === project.id && (p.implementation_value || 0) > 0);
                  const totalImplValue = projectProducts.reduce((sum, p) => sum + (p.implementation_value || 0), 0);
                  const pendente = Math.max(0, totalImplValue - recognized.implantacao);

                  let operacaoEvent = null;
                  if (project.scheduling_type === 'por_vertical') {
                  const cronograma = allCronogramas.find(c => c.project_id === project.id);
                  if (cronograma) {
                  operacaoEvent = allTimelineEvents.find(e => 
                    e.cronograma_id === cronograma.id && e.phase === 'operacao_assistida'
                  );
                  }
                  } else {
                  operacaoEvent = projectProducts.length > 0 ? 
                  allTimelineEvents.find(e => 
                    e.product_id === projectProducts[0].id && e.phase === 'operacao_assistida'
                  ) : null;
                  }

                  projectProducts.forEach(product => {
                  productsInMonth.push({
                  product,
                  project,
                  deadline: operacaoEvent?.end_date,
                  tipo: 'a_receber',
                  pendente
                  });
                  });
                  });

                  const activeProjectIdsLocal = new Set(projects.map(p => p.id));
                  const recognizedInMonth = allRecognizedRevenues.filter(r => {
                  const recMonth = r.recognition_month.substring(0, 7);
                  return recMonth === selectedMonth && r.type === 'implantacao' && activeProjectIdsLocal.has(r.project_id);
                  });

                  if (productsInMonth.length === 0 && recognizedInMonth.length === 0) return null;

                  return (
                  <Card className="bg-slate-800 border-slate-600">
                  <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">
                      Implantação — {monthLabel}
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
                  <CardContent className="space-y-4">
                  {/* A Receber (verde) */}
                  {productsInMonth.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">A Receber (Prazo Contratual)</div>
                      <div className="space-y-2">
                        {productsInMonth.map(({ product, project, deadline }) => (
                          <div 
                            key={product.id}
                            className="p-3 bg-emerald-900/20 rounded-lg border border-emerald-700/50"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="font-semibold text-white text-sm">{product.name}</div>
                                <div className="text-xs text-slate-400">Projeto: {project.name}</div>
                              </div>
                              {deadline && (
                                <div className="text-right shrink-0">
                                  <div className="text-xs text-slate-500">Prazo</div>
                                  <div className="text-xs text-white">
                                    {format(new Date(deadline), 'dd/MM/yyyy', { locale: ptBR })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reconhecidos (roxo) */}
                  {recognizedInMonth.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">Reconhecidos neste mês</div>
                      <div className="space-y-2">
                        {recognizedInMonth.map((rec) => {
                          const product = allProducts.find(p => p.id === rec.product_id);
                          const project = allProjectsData.find(p => p.id === rec.project_id);
                          return (
                            <div key={rec.id} className="p-3 bg-purple-900/20 rounded-lg border border-purple-700/50">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="font-semibold text-white text-sm">{product?.name || rec.vertical_name || 'N/A'}</div>
                                  <div className="text-xs text-slate-400">Projeto: {project?.name || 'N/A'}</div>
                                  {rec.vertical_name && <div className="text-xs text-purple-400">Vertical: {rec.vertical_name}</div>}
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-sm font-semibold text-purple-400">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(rec.amount)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
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

      {/* Project Recognitions Modal */}
      {recognitionsModalProject && (
        <ProjectRecognitionsModal
          open={!!recognitionsModalProject}
          onOpenChange={(v) => { if (!v) setRecognitionsModalProject(null); }}
          project={recognitionsModalProject}
          recognitions={allRecognizedRevenues.filter(r => r.project_id === recognitionsModalProject.id)}
          products={allProducts.filter(p => p.project_id === recognitionsModalProject.id)}
        />
      )}

      {/* AI Assistant Modal */}
      <AIAssistantModal 
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        conversation={conversation}
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