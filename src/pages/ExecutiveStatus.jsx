import React, { useMemo, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Pause,
  XCircle,
  LayoutDashboard,
  ArrowLeft,
  Loader2,
  Sparkles,
  Pencil
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { createPageUrl } from '../utils';
import { Link } from 'react-router-dom';

import PasswordReleasesChart from '../components/executive/PasswordReleasesChart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, addMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import RecognizedRevenueModal from '../components/modals/RecognizedRevenueModal';
import RecognizeAllVerticalModal from '../components/modals/RecognizeAllVerticalModal';
import ProjectRecognitionsModal from '../components/modals/ProjectRecognitionsModal';
import EditProjectRecurringModal from '../components/modals/EditProjectRecurringModal';
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
  const [recognitionsModalProject, setRecognitionsModalProject] = useState(null);
  const [visibleCharts, setVisibleCharts] = useState({
    implantacao: true,
    recorrente: true,
    password: true
  });
  const [expandedRecognitions, setExpandedRecognitions] = useState({});
  const [expandedProjectGroups, setExpandedProjectGroups] = useState({});
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [isEditRecurringModalOpen, setIsEditRecurringModalOpen] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(true);
  const [financialProjectFilters, setFinancialProjectFilters] = useState([]);
  const [financialDropdownOpen, setFinancialDropdownOpen] = useState(false);
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const portfolioFilter = urlParams.get('portfolio') || 'grandes_contas_sc_mg';

  React.useEffect(() => {
    setIsRecalculating(true);
    setTimeout(() => setIsRecalculating(false), 500);
  }, [queryClient]);

  const portfolioLabels = {
    grandes_contas_sc_mg: 'Grandes Contas SC/MG',
    grandes_contas_sc_sp: 'Grandes Contas SC/SP',
    medias_contas: 'Médias Contas',
  };

  const handleChartVisibility = (chart, visible) => {
    setVisibleCharts(prev => ({ ...prev, [chart]: visible }));
  };

  // 🚀 OTIMIZAÇÃO 1: Fim do Waterfall. Todas as queries agora disparam JUNTAS (removido o 'enabled').
  // O tempo de download de dados vai ser reduzido para o tempo da query mais lenta, em vez da soma de todas.
  const { data: allProjectsData = [], isLoading: loadingProjects, isError } = useQuery({
    queryKey: ['projects', portfolioFilter],
    queryFn: () => base44.entities.Project.filter({ portfolio: portfolioFilter }, '-created_date', 10000),
    staleTime: 1 * 60 * 1000, gcTime: 30 * 60 * 1000, retry: 2,
  });

  const { data: allCronogramas = [], isLoading: loadingCronogramas } = useQuery({
    queryKey: ['allCronogramas', portfolioFilter],
    queryFn: () => base44.entities.Cronograma.list('-created_date', 10000),
    staleTime: 1 * 60 * 1000, gcTime: 30 * 60 * 1000,
  });

  const { data: allTimelineEvents = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['allTimelineEvents', portfolioFilter],
    queryFn: () => base44.entities.TimelineEvent.list('-created_date', 10000),
    staleTime: 1 * 60 * 1000, gcTime: 30 * 60 * 1000,
  });

  const { data: allProducts = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['allProducts', portfolioFilter],
    queryFn: () => base44.entities.Product.list('-created_date', 10000),
    staleTime: 1 * 60 * 1000, gcTime: 30 * 60 * 1000,
  });

  const { data: allRecognizedRevenues = [], isLoading: loadingRevenues } = useQuery({
    queryKey: ['allRecognizedRevenues', portfolioFilter],
    queryFn: () => base44.entities.RecognizedRevenue.list('-created_date', 10000),
    staleTime: 1 * 60 * 1000, gcTime: 30 * 60 * 1000,
  });

  const { data: allProductFinancialDates = [], isLoading: loadingFinancialDates } = useQuery({
    queryKey: ['allProductFinancialDates', portfolioFilter],
    queryFn: () => base44.entities.ProductFinancialDates.list('-last_updated', 10000),
    staleTime: 1 * 60 * 1000, gcTime: 30 * 60 * 1000,
  });

  const { data: allProgressCache = [], isLoading: loadingProgressCache } = useQuery({
    queryKey: ['allProgressCache', portfolioFilter],
    queryFn: () => base44.entities.ProjectProgressCache.list('-updated_date', 10000),
    staleTime: 1 * 60 * 1000, gcTime: 30 * 60 * 1000,
  });

  const { data: allOverallProgressCache = [], isLoading: loadingOverallProgressCache } = useQuery({
    queryKey: ['allOverallProgressCache', portfolioFilter],
    queryFn: () => base44.entities.ProjectOverallProgressCache.list('-updated_date', 10000),
    staleTime: 1 * 60 * 1000, gcTime: 30 * 60 * 1000,
  });

  const { data: allHealthCaches = [], isLoading: loadingHealthCaches } = useQuery({
    queryKey: ['allHealthCaches', portfolioFilter],
    queryFn: () => base44.entities.ProjectHealthCache.list('-updated_date', 10000),
    staleTime: 1 * 60 * 1000, gcTime: 30 * 60 * 1000,
  });

  const isLoading = isRecalculating || loadingProjects || loadingCronogramas || loadingEvents || loadingProducts || loadingRevenues || loadingProgressCache || loadingOverallProgressCache || loadingFinancialDates || loadingHealthCaches;

  const projects = allProjectsData.filter(p => p.status !== 'concluido');

  const filteredProjectsForFinance = useMemo(() => {
    if (financialProjectFilters.length === 0) return projects;
    return projects.filter(p => financialProjectFilters.includes(p.id));
  }, [projects, financialProjectFilters]);

  // 🚀 OTIMIZAÇÃO 2: Dicionários em Memória (Hash Maps).
  // Em vez de fazer .find() e .filter() milhões de vezes na renderização, 
  // indexamos tudo uma única vez. Consultas passam de O(N) para O(1).
  const dictionaries = useMemo(() => {
    const projectById = {};
    const productsByProjectId = {};
    const eventsByCronogramaId = {};
    const financialDatesByProductId = {};
    const revenuesByProductId = {};
    const revenuesByProjectId = {};
    const progressCacheByProjectId = {};
    const overallProgressCacheByProjectId = {};
    const healthCacheByProjectId = {};

    allProjectsData.forEach(p => {
      projectById[p.id] = p;
      productsByProjectId[p.id] = [];
      revenuesByProjectId[p.id] = [];
    });

    allProducts.forEach(p => {
      if (productsByProjectId[p.project_id]) {
        productsByProjectId[p.project_id].push(p);
      }
    });

    allTimelineEvents.forEach(e => {
      if (!eventsByCronogramaId[e.cronograma_id]) eventsByCronogramaId[e.cronograma_id] = [];
      eventsByCronogramaId[e.cronograma_id].push(e);
    });

    allProductFinancialDates.forEach(d => {
      financialDatesByProductId[d.product_id] = d;
    });

    allRecognizedRevenues.forEach(r => {
      if (!revenuesByProductId[r.product_id]) revenuesByProductId[r.product_id] = [];
      revenuesByProductId[r.product_id].push(r);

      if (revenuesByProjectId[r.project_id]) revenuesByProjectId[r.project_id].push(r);
    });

    allProgressCache.forEach(c => progressCacheByProjectId[c.project_id] = c);
    allOverallProgressCache.forEach(c => overallProgressCacheByProjectId[c.project_id] = c);
    allHealthCaches.forEach(c => healthCacheByProjectId[c.project_id] = c);

    return {
      projectById,
      productsByProjectId,
      eventsByCronogramaId,
      financialDatesByProductId,
      revenuesByProductId,
      revenuesByProjectId,
      progressCacheByProjectId,
      overallProgressCacheByProjectId,
      healthCacheByProjectId
    };
  }, [allProjectsData, allProducts, allTimelineEvents, allProductFinancialDates, allRecognizedRevenues, allProgressCache, allOverallProgressCache, allHealthCaches]);


  // Mutações (Mantidas intactas)
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
    mutationFn: async (recognitions) => await base44.entities.RecognizedRevenue.bulkCreate(recognitions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allRecognizedRevenues'] });
      setIsRecognizeAllModalOpen(false);
      setSelectedProject(null);
      setSelectedVertical(null);
      setSelectedVerticalProducts([]);
      toast.success('Reconhecimentos criados com sucesso!');
    }
  });

  const updateProjectRecurringMutation = useMutation({
    mutationFn: ({ id, recurringValue, notes }) => base44.entities.Project.update(id, { contract_recurring_value: recurringValue, contract_recurring_notes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', portfolioFilter] });
      setIsEditRecurringModalOpen(false);
      setEditingProjectId(null);
      toast.success('Valor recorrente atualizado com sucesso!');
    }
  });


  // Status counts (Otimizado com Dicionários)
  const statusData = useMemo(() => {
    const counts = { nao_iniciado: 0, em_dia: 0, atencao: 0, atrasado: 0, pausado: 0, concluido: 0 };
    const cronogramasByStatus = { nao_iniciado: [], em_dia: [], atencao: [], atrasado: [], pausado: [], concluido: [] };
    const now = new Date();
    
    allCronogramas.forEach(cronograma => {
      // Usando Dicionário em vez de filter
      const events = dictionaries.eventsByCronogramaId[cronograma.id] || [];
      let status = cronograma.status || 'nao_iniciado';
      
      if (events.length > 0) {
        if (events.every(e => e.status === 'concluido')) status = 'concluido';
        else if (events.some(e => e.status === 'atrasado')) status = 'atrasado';
        else if (events.some(e => {
          if (e.end_date && e.status !== 'concluido') {
            const daysUntil = (new Date(e.end_date) - now) / (1000 * 60 * 60 * 24);
            return daysUntil >= 0 && daysUntil <= 7;
          }
          return false;
        })) status = 'atencao';
        else if (events.every(e => e.status === 'nao_iniciado')) status = 'nao_iniciado';
        else status = 'em_dia';
      }
      
      counts[status]++;
      cronogramasByStatus[status].push({
        ...cronograma,
        status,
        title: cronograma.vertical,
        projectName: dictionaries.projectById[cronograma.project_id]?.name || 'Sem nome',
        events
      });
    });
    return { counts, cronogramasByStatus };
  }, [allCronogramas, dictionaries]);

  // Mapa de produtos recorrentes (Otimizado)
  const recorrenteProductsMap = useMemo(() => {
    const map = {};
    const relevantMonths = new Set();
    
    allProductFinancialDates.forEach(d => {
      if (d.operacao_assistida_end_date) relevantMonths.add(d.operacao_assistida_end_date.substring(0, 7));
      if (d.go_live_date) relevantMonths.add(d.go_live_date.substring(0, 7));
    });
    allRecognizedRevenues.forEach(r => {
      if (r.recognition_month) relevantMonths.add(r.recognition_month.substring(0, 7));
    });
    
    const currentYear = new Date().getFullYear();
    const defaultStart = `${currentYear}-01`;
    const minMonth = relevantMonths.size > 0 ? [...relevantMonths].sort()[0] : defaultStart;
    const maxMonth = relevantMonths.size > 0 ? [...relevantMonths].sort().reverse()[0] : `${currentYear}-12`;
    const minDate = new Date(minMonth + '-01');
    const maxDate = new Date(maxMonth + '-01');
    const diffMonths = (maxDate.getFullYear() - minDate.getFullYear()) * 12 + (maxDate.getMonth() - minDate.getMonth());
    const totalMonths = Math.max(diffMonths + 1, 12);
    
    for (let i = 0; i < totalMonths; i++) {
      const key = format(addMonths(minDate, i), 'yyyy-MM');
      map[key] = [];
    }

    filteredProjectsForFinance.forEach(project => {
      const projectProducts = dictionaries.productsByProjectId[project.id] || [];
      projectProducts.forEach(prod => {
        const dates = dictionaries.financialDatesByProductId[prod.id];
        if (!dates || !dates.go_live_date) return;
        
        const goLiveMonth = dates.go_live_date.substring(0, 7);
        if (!map[goLiveMonth]) return;
        
        map[goLiveMonth].push({ 
          product: prod, project, startDate: dates.go_live_date, inclusionValue: prod.inclusion_value || 0 
        });
      });
    });
    return map;
  }, [filteredProjectsForFinance, dictionaries, allProductFinancialDates, allRecognizedRevenues]);

  // Financeiro chart data (Otimizado)
  const financeiroChartContent = useMemo(() => {
    const monthlyData = {};
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    
    for (let i = 0; i < 10; i++) {
      const month = addMonths(startDate, i);
      const key = format(month, 'yyyy-MM');
      monthlyData[key] = { month: format(month, 'MMM/yy', { locale: ptBR }), implantacao: 0, a_receber: 0, recorrente: 0, reconhecido: 0 };
    }
    
    const implantacaoProductsMap = {};
    
    filteredProjectsForFinance.forEach(project => {
      const projectProducts = dictionaries.productsByProjectId[project.id] || [];

      projectProducts.forEach(prod => {
        const dates = dictionaries.financialDatesByProductId[prod.id];
        const implEndDate = dates?.operacao_assistida_end_date;
        const goLiveStart = dates?.go_live_date;
        
        // Implantação
        if (implEndDate) {
          const implMonth = implEndDate.substring(0, 7);
          if (monthlyData[implMonth]) {
            const totalImplValue = prod.implementation_value || 0;
            if (totalImplValue > 0) {
              monthlyData[implMonth].implantacao += totalImplValue;
              if (!implantacaoProductsMap[implMonth]) implantacaoProductsMap[implMonth] = [];
              implantacaoProductsMap[implMonth].push({ product: prod, project, end_date: implEndDate, amount: totalImplValue });
            }
          }
        }

        // Recorrente
        if (goLiveStart && (prod.inclusion_value || 0) > 0) {
          const goLiveMonth = goLiveStart.substring(0, 7);
          if (monthlyData[goLiveMonth]) {
            monthlyData[goLiveMonth].recorrente += prod.inclusion_value;
          }
        }
      });
    });

    // Calcular a_receber e reconhecido
    Object.keys(monthlyData).forEach(monthKey => {
      const productsThisMonth = implantacaoProductsMap[monthKey] || [];
      let totalImplValue = 0;
      let totalRecognized = 0;
      
      productsThisMonth.forEach(({ product, amount }) => {
        totalImplValue += amount;
        const productRevs = (dictionaries.revenuesByProductId[product.id] || []).filter(r => r.type === 'implantacao');
        totalRecognized += productRevs.reduce((sum, r) => sum + r.amount, 0);
      });
      monthlyData[monthKey].a_receber = Math.max(0, totalImplValue - totalRecognized);
    });

    allRecognizedRevenues.forEach(recognized => {
      if (recognized.type !== 'implantacao') return;
      const project = dictionaries.projectById[recognized.project_id];
      if (!project || project.status === 'concluido') return;
      if (financialProjectFilters.length > 0 && !financialProjectFilters.includes(project.id)) return;
      
      const recMonth = recognized.recognition_month?.substring(0, 7);
      if (recMonth && monthlyData[recMonth]) monthlyData[recMonth].reconhecido += recognized.amount;
    });

    const chartData = Object.entries(monthlyData).sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value);
    return { monthlyData, chartData };
  }, [filteredProjectsForFinance, dictionaries, allRecognizedRevenues, financialProjectFilter]);

  // Métricas do Projeto (Otimizado com Dicionários)
  const getStatusFromHealthScore = (healthScore) => {
    if (healthScore > 60) return 'em_dia';
    if (healthScore >= 50 && healthScore <= 60) return 'atencao';
    return 'atrasado';
  };

  const projectsWithMetrics = useMemo(() => {
    return projects.map(project => {
      const projectRevenues = dictionaries.revenuesByProjectId[project.id] || [];
      const totalRecognized = projectRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);

      const healthCache = dictionaries.healthCacheByProjectId[project.id];
      const healthScore = healthCache?.health_score ?? 0;
      
      const progressCache = dictionaries.overallProgressCacheByProjectId[project.id];
      const progress = progressCache?.overall_progress ? Math.round(progressCache.overall_progress) : 0;

      return {
        ...project,
        healthScore,
        progress,
        dynamicStatus: getStatusFromHealthScore(healthScore),
        totalRecognized,
        totalBudget: project.budget || 0
      };
    }).sort((a, b) => b.totalBudget !== a.totalBudget ? b.totalBudget - a.totalBudget : a.healthScore - b.healthScore);
  }, [projects, dictionaries]);

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

  const loadingSteps = [
    { label: 'Projetos', done: !loadingProjects },
    { label: 'Cronogramas', done: !loadingCronogramas },
    { label: 'Timeline', done: !loadingEvents },
    { label: 'Produtos', done: !loadingProducts },
    { label: 'Receitas', done: !loadingRevenues },
    { label: 'Datas Financeiras', done: !loadingFinancialDates },
    { label: 'Health Scores', done: !loadingHealthCaches },
    { label: 'Sincronizando', done: !isRecalculating },
  ];
  const loadedCount = loadingSteps.filter(s => s.done).length;
  const loadingPercent = Math.round((loadedCount / loadingSteps.length) * 100);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 w-80">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-2xl">B</span>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-white mb-1">Carregando Portfólio</h2>
            <p className="text-slate-400 text-sm">Aguarde, buscando todos os dados...</p>
          </div>
          <div className="w-full space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>{loadedCount} de {loadingSteps.length} etapas</span>
              <span>{loadingPercent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${loadingPercent}%` }} />
            </div>
          </div>
          <div className="w-full space-y-1.5">
            {loadingSteps.map((step) => (
              <div key={step.label} className="flex items-center gap-2 text-sm">
                {step.done ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" /> : <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />}
                <span className={step.done ? 'text-slate-400 line-through' : 'text-slate-300'}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 lg:p-8 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400 text-lg">Erro ao carregar dados.</p>
          <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 lg:p-8 space-y-6 relative">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl(`ProjectsList?portfolio=${portfolioFilter}`)}>
              <button className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm">Voltar para Projetos</span>
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <a href="https://betha-road-map.base44.app/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white transition-colors text-xs font-medium">
                🗺️ Reportar Bug / Melhoria
              </a>
              <Button
                onClick={async () => {
                  setIsRecalculating(true);
                  try {
                    // Dispara as duas funções juntas e aguarda ambas terminarem
                    await Promise.all([
                      base44.functions.invoke('populateProductFinancialDates', {}),
                      base44.functions.invoke('recalculateAllCaches', {})
                    ]);

                    setTimeout(() => {
                      queryClient.invalidateQueries();
                      setIsRecalculating(false);
                      toast.success('Dados sincronizados com sucesso!');
                    }, 2000);

                  } catch (err) {
                    setIsRecalculating(false);
                    toast.error('Erro ao sincronizar dados');
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-xs"
                disabled={isRecalculating}
              >
                {isRecalculating ? <Loader2 className="w-3 h-3 animate-spin" /> : '🔄'} Sincronizar Dados
              </Button>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Portfólio {portfolioLabels[portfolioFilter]}</h1>
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
          <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600">Visão Geral</TabsTrigger>
          <TabsTrigger value="financeiro" className="data-[state=active]:bg-blue-600">Financeiro</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="flex gap-2 items-stretch flex-wrap">
            <Card onClick={() => setSelectedStatusFilter(null)} className={cn("bg-slate-800 border-slate-600 flex-1 min-w-[120px] cursor-pointer hover:bg-slate-700 transition-colors", !selectedStatusFilter && 'ring-2 ring-blue-500')}>
              <CardContent className="p-2 text-center flex flex-col items-center justify-center h-full">
                <div className="text-base font-bold text-white mb-0.5">{projects.length}</div>
                <div className="text-xs text-slate-300">Total Programas</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-600 flex-1 min-w-[140px]">
              <CardContent className="p-2 text-center flex flex-col items-center justify-center h-full">
                <div className="text-base font-bold text-white mb-0.5">
                  {allProducts.filter(p => dictionaries.projectById[p.project_id] && dictionaries.projectById[p.project_id].status !== 'concluido').length}
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
                  <Card onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'emDias' ? null : 'emDias')} className={cn("bg-slate-800 border-slate-600 flex-1 min-w-[100px] cursor-pointer hover:bg-slate-700 transition-colors", selectedStatusFilter === 'emDias' && 'ring-2 ring-green-500')}>
                    <CardContent className="p-2 text-center flex flex-col items-center justify-center h-full"><div className="text-base font-bold text-green-400 mb-0.5">{emDias}</div><div className="text-xs text-green-300">Em Dia</div></CardContent>
                  </Card>
                  <Card onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'emAlerta' ? null : 'emAlerta')} className={cn("bg-slate-800 border-slate-600 flex-1 min-w-[100px] cursor-pointer hover:bg-slate-700 transition-colors", selectedStatusFilter === 'emAlerta' && 'ring-2 ring-yellow-500')}>
                    <CardContent className="p-2 text-center flex flex-col items-center justify-center h-full"><div className="text-base font-bold text-yellow-400 mb-0.5">{emAlerta}</div><div className="text-xs text-yellow-300">Alerta</div></CardContent>
                  </Card>
                  <Card onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'atrasado' ? null : 'atrasado')} className={cn("bg-slate-800 border-slate-600 flex-1 min-w-[100px] cursor-pointer hover:bg-slate-700 transition-colors", selectedStatusFilter === 'atrasado' && 'ring-2 ring-red-500')}>
                    <CardContent className="p-2 text-center flex flex-col items-center justify-center h-full"><div className="text-base font-bold text-red-400 mb-0.5">{atrasado}</div><div className="text-xs text-red-300">Atrasado</div></CardContent>
                  </Card>
                  <Card onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'concluidos' ? null : 'concluidos')} className={cn("bg-slate-800 border-slate-600 flex-1 min-w-[100px] cursor-pointer hover:bg-slate-700 transition-colors", selectedStatusFilter === 'concluidos' && 'ring-2 ring-purple-500')}>
                    <CardContent className="p-2 text-center flex flex-col items-center justify-center h-full"><div className="text-base font-bold text-purple-400 mb-0.5">{concluidos}</div><div className="text-xs text-purple-300">Concluídos</div></CardContent>
                  </Card>
                </>
              );
            })()}
          </div>

           <div>
             <h2 className="text-xl font-bold text-white mb-4">
               {selectedStatusFilter ? `Projetos ${selectedStatusFilter === 'emDias' ? 'Em Dia' : selectedStatusFilter === 'emAlerta' ? 'Em Alerta' : selectedStatusFilter === 'atrasado' ? 'Atrasados' : 'Concluídos'} ` : 'Projetos Ativos'}
               {selectedStatusFilter && <button onClick={() => setSelectedStatusFilter(null)} className="ml-3 text-sm text-slate-400 hover:text-white">✕ Limpar filtro</button>}
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
                <Link to={createPageUrl(`Dashboard?project_id=${project.id}`)} className="block">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-lg text-white group-hover:text-blue-400 transition-colors">{project.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("border", getHealthBg(project.healthScore))}><span className={getHealthColor(project.healthScore)}>{project.healthScore}</span></Badge>
                      <div className="flex items-center gap-1">
                        <Button size="icon" onClick={(e) => { e.preventDefault(); setEditingProjectId(project.id); setIsEditRecurringModalOpen(true); }} className="h-8 w-8 bg-blue-800/50 hover:bg-blue-700 border border-blue-600/40 shrink-0" title="Editar Recorrente do Contrato"><Pencil className="w-4 h-4 text-blue-300" /></Button>
                        {(dictionaries.revenuesByProjectId[project.id]?.length > 0) && (
                          <Button size="icon" onClick={(e) => { e.preventDefault(); setRecognitionsModalProject(project); }} className="h-8 w-8 bg-purple-800/50 hover:bg-purple-700 border border-purple-600/40 shrink-0" title="Ver reconhecimentos"><Sparkles className="w-4 h-4 text-purple-300" /></Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2.5 h-2.5 rounded-full", statusColors[project.dynamicStatus])} />
                    <span className="text-sm text-slate-300 font-medium">{statusLabels[project.dynamicStatus]}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm"><span className="text-slate-300 font-medium">Progresso Geral</span><span className="text-white font-bold">{project.progress}%</span></div>
                    <Progress value={project.progress} className="h-3 bg-slate-700" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-600">
                    {project.manager && <div><div className="text-xs text-slate-400 font-medium">Gerente</div><div className="text-sm text-white truncate">{project.manager}</div></div>}
                    {(() => {
                       const estDeadline = dictionaries.progressCacheByProjectId[project.id]?.estimated_deadline;
                       return <div><div className="text-xs text-slate-400 font-medium">Prazo Estimado</div><div className="text-sm text-white">{estDeadline ? format(parseISO(estDeadline), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</div></div>;
                    })()}
                    {project.deadline && <div><div className="text-xs text-slate-400 font-medium">Prazo Contratual</div><div className="text-sm text-white">{format(parseISO(project.deadline), 'dd/MM/yyyy', { locale: ptBR })}</div></div>}
                    {(() => {
                                           const totalImplantacao = project.implementation_value || 0;
                                           const totalInclusao = project.recurring_value || 0;
                                           return (
                                             <>
                                               {totalImplantacao > 0 && <div><div className="text-xs text-slate-400 font-medium">Implantação</div><div className="text-sm text-emerald-400 font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalImplantacao)}</div></div>}
                                               {totalInclusao > 0 && <div><div className="text-xs text-slate-400 font-medium">Inclusão</div><div className="text-sm text-emerald-400 font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalInclusao)}</div></div>}
                                             </>
                                           );
                                         })()}
                    {(project.contract_recurring_value > 0 || project.contract_recurring_notes) && (
                      <div className="col-span-2">
                        {project.contract_recurring_value > 0 && <><div className="text-xs text-slate-400 font-medium">Recorrente (contrato)</div><div className="text-sm text-blue-400 font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(project.contract_recurring_value)}</div></>}
                        {project.contract_recurring_notes && <div className="text-xs text-slate-300 mt-0.5">{project.contract_recurring_notes}</div>}
                      </div>
                    )}
                  </div>
                  {project.totalRecognized > 0 && (() => {
                    const projectRevenues = dictionaries.revenuesByProjectId[project.id] || [];
                    const groupedRevenues = {};
                    projectRevenues.forEach(rev => {
                      if (rev.vertical_name) {
                        const key = `${rev.vertical_name}_${rev.recognition_month}_${rev.type}`;
                        if (!groupedRevenues[key]) groupedRevenues[key] = { vertical_name: rev.vertical_name, recognition_month: rev.recognition_month, type: rev.type, amount: 0, count: 0 };
                        groupedRevenues[key].amount += rev.amount;
                        groupedRevenues[key].count += 1;
                      }
                    });
                    const individualRevenues = projectRevenues.filter(r => !r.vertical_name);
                    const bulkRevenues = Object.values(groupedRevenues);
                    const allItems = [
                      ...bulkRevenues.map((bulk, idx) => ({ key: `bulk-${idx}`, label: `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(bulk.amount)} - ${bulk.recognition_month ? format(new Date(bulk.recognition_month.split('-')[0], parseInt(bulk.recognition_month.split('-')[1]) - 1, 1), 'MMM/yy', { locale: ptBR }) : 'N/A'} - ${bulk.vertical_name} (Todos)` })),
                      ...individualRevenues.map(rev => ({ key: rev.id, label: `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(rev.amount)} - ${rev.recognition_month ? format(new Date(rev.recognition_month.split('-')[0], parseInt(rev.recognition_month.split('-')[1]) - 1, 1), 'MMM/yy', { locale: ptBR }) : 'N/A'} - ${allProducts.find(p => p.id === rev.product_id)?.name || 'N/A'}` }))
                    ];
                    const isExpanded = expandedRecognitions[project.id];
                    const visibleItems = isExpanded ? allItems : allItems.slice(0, 1);
                    return (
                      <div className="pt-3 border-t border-slate-600">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs text-slate-400 font-medium">Reconhecido</div>
                          <div className="flex items-center gap-2">
                            {allItems.length > 3 && <button onClick={(e) => { e.preventDefault(); setExpandedRecognitions(prev => ({ ...prev, [project.id]: !prev[project.id] })); }} className="text-xs text-yellow-400 hover:text-yellow-300">{isExpanded ? '★' : '☆'} {!isExpanded && allItems.length}</button>}
                            <button onClick={(e) => { e.preventDefault(); if (projectRevenues.length > 0 && window.confirm('Deletar todos os reconhecimentos deste projeto?')) projectRevenues.forEach(r => deleteRecognizedRevenueMutation.mutate(r.id)); }} className="text-xs text-red-400 hover:text-red-300">Limpar</button>
                          </div>
                        </div>
                        <div className="space-y-1">{visibleItems.map(item => <div key={item.key} className="text-xs text-purple-400">{item.label}</div>)}{!isExpanded && allItems.length > 1 && <div className="text-xs text-slate-500">+{allItems.length - 1} mais...</div>}</div>
                      </div>
                    );
                  })()}
                </CardContent>
                </Link>
              </Card>
            </div>
          ))}
        </div>
        {projectsWithMetrics.length === 0 && <Card className="bg-slate-800 border-slate-600"><CardContent className="py-12 text-center"><LayoutDashboard className="w-12 h-12 text-slate-500 mx-auto mb-3" /><p className="text-slate-300">Nenhum projeto ativo no momento</p></CardContent></Card>}
        </div>

        {allProjectsData.filter(p => p.status === 'concluido').length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Projetos Concluídos</h2>
            <Card className="bg-slate-800 border-slate-600"><CardContent className="p-0"><div className="divide-y divide-slate-700">{allProjectsData.filter(p => p.status === 'concluido').map(project => <div key={project.id} className="p-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors"><span className="text-white font-medium">{project.name}</span>{project.deadline && <span className="text-sm text-slate-400">{format(new Date(project.deadline), 'dd/MM/yyyy', { locale: ptBR })}</span>}</div>)}</div></CardContent></Card>
          </div>
        )}

        {statusData.counts.concluido > 0 && (
          <Card className="bg-slate-800 border-slate-600">
            <CardHeader><CardTitle className="text-white flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-purple-400" />Cronogramas Concluídos</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-400 mb-3">{statusData.counts.concluido}</div><div className="text-sm text-slate-300 mb-4">cronogramas finalizados com sucesso</div>
              <div className="space-y-2 pt-3 border-t border-slate-600">
                {statusData.cronogramasByStatus.concluido.map(cronograma => <div key={`${cronograma.project_id}-${cronograma.vertical}`} className="flex items-center gap-2 text-sm"><div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" /><span className="text-white">{cronograma.title}</span><span className="text-slate-400 text-xs">({dictionaries.projectById[cronograma.project_id]?.name || 'Sem nome'})</span></div>)}
              </div>
            </CardContent>
          </Card>
        )}
        </TabsContent>

        {/* Financeiro Tab */}
        <TabsContent value="financeiro" className="space-y-6">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h3 className="text-white font-semibold text-sm">Gráficos do Financeiro</h3>
              <div className="relative">
                <button
                  onClick={() => setFinancialDropdownOpen(o => !o)}
                  className="w-[250px] h-8 bg-slate-900 border border-slate-700 text-slate-300 rounded-md px-3 text-sm flex items-center justify-between gap-2"
                >
                  <span className="truncate">
                    {financialProjectFilters.length === 0
                      ? 'Todos os Projetos'
                      : financialProjectFilters.length === 1
                        ? projects.find(p => p.id === financialProjectFilters[0])?.name
                        : `${financialProjectFilters.length} projetos`}
                  </span>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {financialDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-[250px] bg-slate-800 border border-slate-700 rounded-md shadow-lg py-1 max-h-64 overflow-y-auto">
                    <label className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={financialProjectFilters.length === 0}
                        onChange={() => setFinancialProjectFilters([])}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm text-slate-300">Todos os Projetos</span>
                    </label>
                    {projects.map(p => (
                      <label key={p.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={financialProjectFilters.includes(p.id)}
                          onChange={() => setFinancialProjectFilters(prev =>
                            prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                          )}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm text-slate-300 truncate">{p.name}</span>
                      </label>
                    ))}
                  </div>
                )}
                {financialDropdownOpen && <div className="fixed inset-0 z-40" onClick={() => setFinancialDropdownOpen(false)} />}
              </div>
            </div>
            <div className="flex items-center gap-4 ml-auto md:pl-4">
              {['implantacao', 'recorrente', 'password'].map(chart => (
                <div key={chart} className="flex items-center gap-1.5">
                  <input type="checkbox" id={`${chart}-chart`} checked={visibleCharts[chart] !== false} onChange={(e) => handleChartVisibility(chart, e.target.checked)} className="w-4 h-4 rounded cursor-pointer" />
                  <label htmlFor={`${chart}-chart`} className="text-xs text-slate-300 cursor-pointer whitespace-nowrap">{chart === 'password' ? 'Senhas de Produção' : chart.charAt(0).toUpperCase() + chart.slice(1)}</label>
                </div>
              ))}
            </div>
          </div>

          {(() => {
            const { monthlyData, chartData } = financeiroChartContent;
            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {visibleCharts.implantacao !== false && (
                <Card className="bg-slate-800 border-slate-600">
                  <CardHeader><CardTitle className="text-white">Receita de Implantação</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData} style={{ cursor: 'pointer' }}>
                       <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                       <XAxis dataKey="month" stroke="#94a3b8" style={{ fontSize: '12px' }} interval={0} angle={-45} textAnchor="end" height={80} />
                       <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} tickFormatter={(value) => new Intl.NumberFormat('pt-BR', { notation: 'compact', compactDisplay: 'short' }).format(value)} />
                       <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} formatter={(v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)} />
                       <Legend wrapperStyle={{ paddingTop: '15px' }} />
                       <Bar dataKey="a_receber" fill="#10b981" name="A Receber" onClick={(data) => { const monthKey = Object.keys(monthlyData).find(key => monthlyData[key].month === data.month); if (monthKey) { setSelectedMonth(monthKey); setSelectedMonthType('implantacao'); } }} />
                       <Bar dataKey="reconhecido" fill="#a855f7" name="Reconhecido" onClick={(data) => { const monthKey = Object.keys(monthlyData).find(key => monthlyData[key].month === data.month); if (monthKey) { setSelectedMonth(monthKey); setSelectedMonthType('reconhecido_implantacao'); } }} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 text-center"><div className="text-2xl font-bold text-emerald-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(chartData.reduce((sum, d) => sum + d.a_receber, 0))}</div><div className="text-sm text-slate-400">Total A Receber (12 meses)</div></div>
                  </CardContent>
                </Card>
                )}
                {visibleCharts.recorrente !== false && (
                <Card className="bg-slate-800 border-slate-600">
                  <CardHeader><CardTitle className="text-white">Previsão de Inicio de inclusão (Recorrente)</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData} style={{ cursor: 'pointer' }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="month" stroke="#94a3b8" style={{ fontSize: '12px' }} interval={0} angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} tickFormatter={(value) => new Intl.NumberFormat('pt-BR', { notation: 'compact', compactDisplay: 'short' }).format(value)} />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} formatter={(v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)} />
                        <Bar dataKey="recorrente" fill="#3b82f6" name="Previsão Inclusão" onClick={(data) => { const monthKey = Object.keys(monthlyData).find(key => monthlyData[key].month === data.month); if (monthKey) { setSelectedMonth(monthKey); setSelectedMonthType('recorrente'); } }} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 text-center"><div className="text-2xl font-bold text-blue-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(chartData.reduce((sum, d) => sum + d.recorrente, 0))}</div><div className="text-sm text-slate-400">Total Recorrente (12 meses)</div></div>
                  </CardContent>
                </Card>
                )}
              </div>
            );
          })()}

          <PasswordReleasesChart products={allProducts.filter(p => dictionaries.projectById[p.project_id] && (financialProjectFilters.length === 0 || financialProjectFilters.includes(p.project_id)))} projects={filteredProjectsForFinance} visibleCharts={visibleCharts} onVisibilityChange={handleChartVisibility} />

          {selectedMonth && (() => {
            const [year, month] = selectedMonth.split('-');
            const monthLabel = format(new Date(year, parseInt(month) - 1, 1), 'MMMM/yyyy', { locale: ptBR });
            
            // Usando dicionários para otimizar os cards detalhados
            const aReceberProds = [];
            filteredProjectsForFinance.forEach(project => {
              const projectProducts = dictionaries.productsByProjectId[project.id] || [];
              projectProducts.forEach(product => {
                const dates = dictionaries.financialDatesByProductId[product.id];
                if (!dates?.operacao_assistida_end_date) return;
                
                const implMonth = dates.operacao_assistida_end_date.substring(0, 7);
                if (implMonth !== selectedMonth) return;

                const productRevs = dictionaries.revenuesByProductId[product.id] || [];
                const totalRecognized = productRevs.filter(r => r.type === 'implantacao').reduce((sum, r) => sum + r.amount, 0);
                const pendente = Math.max(0, (product.implementation_value || 0) - totalRecognized);
                if (pendente > 0) aReceberProds.push({ product, project, deadline: dates.operacao_assistida_end_date, amount: pendente });
              });
            });

            const recognizedProds = allRecognizedRevenues.filter(r => r.recognition_month?.substring(0, 7) === selectedMonth && r.type === 'implantacao' && (financialProjectFilters.length === 0 || financialProjectFilters.includes(r.project_id))).map(rec => ({ rec, product: allProducts.find(p => p.id === rec.product_id), project: dictionaries.projectById[rec.project_id] })).filter(x => x.product && x.project);
            const recorrenteProds = recorrenteProductsMap[selectedMonth] || [];

            if (!selectedMonthType && aReceberProds.length === 0 && recognizedProds.length === 0 && recorrenteProds.length === 0) return null;

            if (selectedMonthType === 'recorrente') {
              return (
                <Card className="bg-slate-800 border-slate-600">
                  <CardHeader><div className="flex items-center justify-between"><CardTitle className="text-white">Previsão de Inclusão (Recorrente) — {monthLabel}</CardTitle><Button variant="ghost" size="sm" onClick={() => { setSelectedMonth(null); setSelectedMonthType(null); }} className="text-slate-400">Fechar</Button></div></CardHeader>
                  <CardContent className="space-y-4">
                     <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Produtos Iniciando</div>
                     <div className="space-y-2">
                       {Object.values(recorrenteProds.reduce((acc, item) => { if (!acc[item.project.id]) acc[item.project.id] = { project: item.project, items: [] }; acc[item.project.id].items.push(item); return acc; }, {})).map(({ project: proj, items }) => {
                         const isExpanded = expandedProjectGroups[`recorrente-${selectedMonth}-${proj.id}`];
                         return (
                           <div key={proj.id} className="rounded-lg border border-blue-700/50 overflow-hidden">
                             <button className="w-full flex items-center justify-between p-3 bg-blue-900/30 text-left" onClick={() => setExpandedProjectGroups(p => ({ ...p, [`recorrente-${selectedMonth}-${proj.id}`]: !p[`recorrente-${selectedMonth}-${proj.id}`] }))}>
                               <span className="text-white font-semibold text-sm">{proj.name} ({items.length})</span>
                               <span className="text-sm font-semibold text-blue-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(items.reduce((s, i) => s + i.inclusionValue, 0))}</span>
                             </button>
                             {isExpanded && items.map(({ product, startDate, inclusionValue }) => (
                               <div key={product.id} className="flex justify-between px-4 py-2.5 bg-blue-900/10 border-t border-blue-800/30">
                                 <div><div className="font-medium text-white text-sm">{product.name}</div></div>
                                 <div className="text-right"><div className="text-sm font-semibold text-blue-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(inclusionValue)}</div>{startDate && <div className="text-xs text-slate-500">{format(new Date(startDate), 'dd/MM/yyyy')}</div>}</div>
                               </div>
                             ))}
                           </div>
                         );
                       })}
                     </div>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card className="bg-slate-800 border-slate-600">
                <CardHeader><div className="flex items-center justify-between"><CardTitle className="text-white">Implantação — {monthLabel}</CardTitle><Button variant="ghost" size="sm" onClick={() => { setSelectedMonth(null); setSelectedMonthType(null); }} className="text-slate-400">Fechar</Button></div></CardHeader>
                <CardContent className="space-y-4">
                  {aReceberProds.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">A Receber</div>
                      <div className="space-y-2">
                         {Object.values(aReceberProds.reduce((acc, item) => { if (!acc[item.project.id]) acc[item.project.id] = { project: item.project, items: [] }; acc[item.project.id].items.push(item); return acc; }, {})).map(({ project: proj, items }) => {
                           const isExpanded = expandedProjectGroups[`areceber-${selectedMonth}-${proj.id}`];
                           return (
                             <div key={proj.id} className="rounded-lg border border-emerald-700/50 overflow-hidden">
                               <button className="w-full flex items-center justify-between p-3 bg-emerald-900/30 text-left" onClick={() => setExpandedProjectGroups(p => ({ ...p, [`areceber-${selectedMonth}-${proj.id}`]: !p[`areceber-${selectedMonth}-${proj.id}`] }))}>
                                 <span className="text-white font-semibold text-sm">{proj.name} ({items.length})</span>
                                 <span className="text-sm font-semibold text-emerald-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(items.reduce((s, i) => s + i.amount, 0))}</span>
                               </button>
                               {isExpanded && items.map(({ product, deadline, amount }) => (
                                 <div key={product.id} className="flex justify-between px-4 py-2.5 bg-emerald-900/10 border-t border-emerald-800/30">
                                   <div><div className="font-medium text-white text-sm">{product.name}</div></div>
                                   <div className="text-right"><div className="text-sm font-semibold text-emerald-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(amount)}</div>{deadline && <div className="text-xs text-slate-500">{format(new Date(deadline), 'dd/MM/yyyy')}</div>}</div>
                                 </div>
                               ))}
                             </div>
                           );
                         })}
                      </div>
                    </div>
                  )}
                  {recognizedProds.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">Reconhecidos</div>
                      <div className="space-y-2">
                        {recognizedProds.map(({ rec, product, project }) => (
                          <div key={rec.id} className="p-3 bg-purple-900/20 rounded-lg border border-purple-700/50 flex justify-between">
                            <div><div className="font-semibold text-white text-sm">{product?.name || 'N/A'}</div><div className="text-xs text-slate-400">{project?.name || 'N/A'}</div></div>
                            <div className="text-sm font-semibold text-purple-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(rec.amount)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* Modais (Mantidos intactos) */}
      {recognitionsModalProject && <ProjectRecognitionsModal open={!!recognitionsModalProject} onOpenChange={(v) => { if (!v) setRecognitionsModalProject(null); }} project={recognitionsModalProject} recognitions={dictionaries.revenuesByProjectId[recognitionsModalProject.id] || []} products={dictionaries.productsByProjectId[recognitionsModalProject.id] || []} />}
      {editingProjectId && allProjectsData && <EditProjectRecurringModal open={isEditRecurringModalOpen} onOpenChange={setIsEditRecurringModalOpen} project={dictionaries.projectById[editingProjectId]} onSave={(value, notes) => updateProjectRecurringMutation.mutate({ id: editingProjectId, recurringValue: value, notes })} />}
      {selectedProject && <><RecognizedRevenueModal isOpen={isRevenueModalOpen} onClose={() => { setIsRevenueModalOpen(false); setSelectedProject(null); }} onSave={(data) => createRecognizedRevenueMutation.mutate(data)} onRecognizeAll={(vertical, products, data) => { if (data) { const amountPerProduct = data.amount / products.length; const recognitions = products.map(product => ({ project_id: selectedProject.id, product_id: product.id, amount: amountPerProduct, recognition_month: data.recognition_month, type: data.type, vertical_name: vertical })); createBulkRecognizedRevenueMutation.mutate(recognitions); setIsRevenueModalOpen(false); } }} project={selectedProject} products={dictionaries.productsByProjectId[selectedProject.id] || []} /><RecognizeAllVerticalModal isOpen={isRecognizeAllModalOpen} onClose={() => { setIsRecognizeAllModalOpen(false); setSelectedVertical(null); setSelectedVerticalProducts([]); }} onSave={(recognitions) => createBulkRecognizedRevenueMutation.mutate(recognitions)} project={selectedProject} vertical={selectedVertical} products={selectedVerticalProducts} /></>}
    </div>
  );
}