import React, { useMemo, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
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
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import RecognizedRevenueModal from '../components/modals/RecognizedRevenueModal';
import RecognizeAllVerticalModal from '../components/modals/RecognizeAllVerticalModal';
import ProjectRecognitionsModal from '../components/modals/ProjectRecognitionsModal';
import EditProjectRecurringModal from '../components/modals/EditProjectRecurringModal';
import { toast } from 'sonner';
import { calculateHealthScore } from '../components/dashboard/ProjectHealthScore';

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
  const [selectedEntity, setSelectedEntity] = useState(null);
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const portfolioFilter = urlParams.get('portfolio') || 'grandes_contas_sc_mg';

  // Forçar recalculo de caches ao entrar em ExecutiveStatus
  React.useEffect(() => {
    base44.functions.invoke('recalculateAllCaches', {}).then(() => {
      // Invalidar queries para forçar recarregamento
      queryClient.invalidateQueries({ queryKey: ['allProgressCache'] });
      queryClient.invalidateQueries({ queryKey: ['allOverallProgressCache'] });
      queryClient.invalidateQueries({ queryKey: ['allTimelineEvents'] });
    }).catch(err => {
      console.error('Erro ao recalcular caches:', err);
    });
  }, [queryClient]);

  const portfolioLabels = {
    grandes_contas_sc_mg: 'Grande Contas SC/MG',
    grandes_contas_sc_sp: 'Grande Contas SC/SP',
    medias_contas: 'Médias Contas',
  };

  const handleChartVisibility = (chart, visible) => {
    setVisibleCharts(prev => ({
      ...prev,
      [chart]: visible
    }));
  };

  // Fetch all projects
  const { data: allProjectsData = [], isLoading: loadingProjects, isError } = useQuery({
    queryKey: ['projects', portfolioFilter],
    queryFn: () => base44.entities.Project.filter({ portfolio: portfolioFilter }, '-created_date', 500),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });

   // Filter out completed projects from overview
   const projects = allProjectsData.filter(p => p.status !== 'concluido');

   // Fetch all cronogramas
    const { data: allCronogramas = [], isLoading: loadingCronogramas } = useQuery({
      queryKey: ['allCronogramas', portfolioFilter],
      queryFn: () => base44.entities.Cronograma.list('-created_date', 500),
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      enabled: !loadingProjects
    });

    // Fetch all timeline events
    const { data: allTimelineEvents = [], isLoading: loadingEvents } = useQuery({
      queryKey: ['allTimelineEvents', portfolioFilter],
      queryFn: () => base44.entities.TimelineEvent.list('-created_date', 1000),
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      enabled: !loadingCronogramas
    });

    // Fetch all tasks - necessário para calcular health score corretamente
    const { data: allHomologationTasks = [], isLoading: loadingHomolog } = useQuery({
      queryKey: ['allHomologationTasks', portfolioFilter],
      queryFn: () => base44.entities.HomologationTask.list('-created_date', 500),
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      enabled: !loadingEvents
    });

    const { data: allMigrationTasks = [], isLoading: loadingMigration } = useQuery({
      queryKey: ['allMigrationTasks', portfolioFilter],
      queryFn: () => base44.entities.MigrationTask.list('-created_date', 500),
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      enabled: !loadingHomolog
    });

    // Fetch all risks
    const { data: allRisks = [], isLoading: loadingRisks } = useQuery({
      queryKey: ['allRisks', portfolioFilter],
      queryFn: () => base44.entities.Risk.list('-created_date', 500),
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      enabled: !loadingMigration
    });

    const { data: allExpenses = [], isLoading: loadingExpenses } = useQuery({
      queryKey: ['allExpenses', portfolioFilter],
      queryFn: () => base44.entities.Expense.list('-created_date', 1000),
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      enabled: !loadingRisks
    });

    const { data: allProducts = [], isLoading: loadingProducts } = useQuery({
      queryKey: ['allProducts', portfolioFilter],
      queryFn: () => base44.entities.Product.list('-created_date', 1000),
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      enabled: !loadingExpenses
    });

    const { data: allRecognizedRevenues = [], isLoading: loadingRevenues } = useQuery({
      queryKey: ['allRecognizedRevenues', portfolioFilter],
      queryFn: () => base44.entities.RecognizedRevenue.list('-created_date', 1000),
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      enabled: !loadingProducts
    });

    const { data: allProgressCache = [], isLoading: loadingProgressCache } = useQuery({
      queryKey: ['allProgressCache', portfolioFilter],
      queryFn: () => base44.entities.ProjectProgressCache.list('-updated_date', 500),
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      enabled: !loadingRevenues
    });

    const { data: allOverallProgressCache = [], isLoading: loadingOverallProgressCache } = useQuery({
      queryKey: ['allOverallProgressCache', portfolioFilter],
      queryFn: () => base44.entities.ProjectOverallProgressCache.list('-updated_date', 500),
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      enabled: !loadingProgressCache
    });

  // Loading global: aguarda TODOS os dados críticos carregarem
  const isLoading = loadingProjects || loadingCronogramas || loadingEvents || loadingHomolog || loadingMigration || loadingRisks || loadingExpenses || loadingProducts || loadingRevenues || loadingProgressCache || loadingOverallProgressCache;

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

  const updateProjectRecurringMutation = useMutation({
    mutationFn: ({ id, recurringValue, notes }) => base44.entities.Project.update(id, { contract_recurring_value: recurringValue, contract_recurring_notes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', portfolioFilter] });
      setIsEditRecurringModalOpen(false);
      setEditingProjectId(null);
      toast.success('Valor recorrente atualizado com sucesso!');
    }
  });

  // Wrapper que chama a mesma lógica do componente ProjectHealthScore
  const getProjectHealthScore = (project) => {
    const timeline = allTimelineEvents.filter(e => e.project_id === project.id);
    const risks = allRisks.filter(r => r.project_id === project.id);
    const expenses = allExpenses.filter(e => e.project_id === project.id);
    const spent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const migrationTasks = allMigrationTasks.filter(t => t.project_id === project.id);
    const homologationTasks = allHomologationTasks.filter(t => t.project_id === project.id);
    const products = allProducts.filter(p => p.project_id === project.id);
    const { score } = calculateHealthScore({ timeline, budget: project.budget || 0, spent, migrationTasks, homologationTasks, risks, products });
    return score;
  };

  // Calculate overall progress for a project
  // Para projetos por_vertical: usa apenas os eventos do produto representativo de cada vertical
  // Para projetos por_produto: usa todos os eventos
  const calcEventProgress = (event) => {
    if (event.status === 'concluido') return 100;
    if (event.progress > 0) return event.progress;
    if (event.start_date && event.end_date) {
      const now = new Date();
      const start = new Date(event.start_date);
      const end = new Date(event.end_date);
      if (now <= start) return 0;
      if (now >= end) return 99;
      return Math.round(((now - start) / (end - start)) * 100);
    }
    return 0;
  };

  // Busca eventos do projeto: tenta project_id primeiro, fallback via product_ids e cronograma_ids
  const getProjectEvents = (project) => {
    const projectProducts = allProducts.filter(p => p.project_id === project.id);
    const productIds = new Set(projectProducts.map(p => p.id));
    const projectCronogramas = allCronogramas.filter(c => c.project_id === project.id);
    const cronogramaIds = new Set(projectCronogramas.map(c => c.id));
    
    // Busca por project_id, product_id ou cronograma_id
    return allTimelineEvents.filter(e => 
      e.project_id === project.id || 
      productIds.has(e.product_id) || 
      cronogramaIds.has(e.cronograma_id)
    );
  };

  const calculateProjectProgress = (project) => {
    // Buscar do cache primeiro (mais rápido e evita recálculos)
    const cache = allProgressCache.find(c => c.project_id === project.id);
    if (cache && typeof cache.overall_progress === 'number') {
      return Math.round(cache.overall_progress);
    }

    // Fallback: calcular se cache não existir
    const projectEvents = getProjectEvents(project);
    if (projectEvents.length === 0) return 0;
    const total = projectEvents.reduce((sum, e) => sum + calcEventProgress(e), 0);
    return Math.round(total / projectEvents.length);
  };

  const getProjectOverallProgress = (project) => {
    // Buscar do cache de progresso geral (todas as entidades) - mais rápido
    const cache = allOverallProgressCache.find(c => c.project_id === project.id);
    if (cache && typeof cache.overall_progress === 'number') {
      return Math.round(cache.overall_progress);
    }

    // Fallback: calcular com TODOS os eventos do projeto se cache não existir
    const projectEvents = getProjectEvents(project);
    if (projectEvents.length === 0) return 0;
    const total = projectEvents.reduce((sum, e) => sum + calcEventProgress(e), 0);
    return Math.round(total / projectEvents.length);
  };

  // Classify project status based on health score only (igual aos cards)
  const getStatusFromHealthScore = (healthScore) => {
    if (healthScore > 60) return 'em_dia';
    if (healthScore >= 50 && healthScore <= 60) return 'atencao';
    return 'atrasado';
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

  // Mapa de produtos recorrentes calculado via useMemo (evita loop infinito)
  const recorrenteProductsMap = useMemo(() => {
    const map = {};
    const relevantMonths = new Set();
    allTimelineEvents.forEach(e => {
      if (e.phase === 'operacao_assistida' && e.end_date) relevantMonths.add(e.end_date.substring(0, 7));
      if (e.phase === 'go_live' && e.start_date) relevantMonths.add(e.start_date.substring(0, 7));
      if (e.phase === 'go_live' && e.end_date) relevantMonths.add(e.end_date.substring(0, 7));
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

    // Helper: pegar a data go_live de um evento (start_date ou end_date)
    const getGoLiveDate = (event) => event.start_date || event.end_date;

    // Sempre por produto: cada produto tem seu próprio evento go_live via product_id
    allProjectsData.filter(p => p.status !== 'concluido').forEach(project => {
      const projectProducts = allProducts.filter(p => p.project_id === project.id);
      if (!projectProducts.length) return;
      
      projectProducts.forEach(prod => {
        const goLiveEvent = allTimelineEvents.find(e => e.product_id === prod.id && e.phase === 'go_live' && getGoLiveDate(e));
        if (!goLiveEvent) return;
        const goLiveDate = getGoLiveDate(goLiveEvent);
        const goLiveMonth = goLiveDate.substring(0, 7);
        if (!map[goLiveMonth]) return;
        map[goLiveMonth].push({ product: prod, project, startDate: goLiveDate, inclusionValue: prod.inclusion_value || 0 });
      });
    });
    return map;
  }, [allProducts, allTimelineEvents, allCronogramas, allRecognizedRevenues, allProjectsData]);

  // Financeiro chart data (must be a hook at top level, not inside JSX)
  const financeiroChartContent = useMemo(() => {
    const monthlyData = {};
    const monthlyRecorrenteProducts = {};

    const relevantMonths = new Set();
    allTimelineEvents.forEach(e => {
      if (e.phase === 'operacao_assistida' && e.end_date) relevantMonths.add(e.end_date.substring(0, 7));
      if (e.phase === 'go_live' && e.start_date) relevantMonths.add(e.start_date.substring(0, 7));
      if (e.phase === 'go_live' && e.end_date) relevantMonths.add(e.end_date.substring(0, 7));
    });
    allRecognizedRevenues.forEach(r => {
      if (r.recognition_month) relevantMonths.add(r.recognition_month.substring(0, 7));
    });

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYearMonth = `${currentYear}-${currentMonth}`;
    
    const defaultStart = `${currentYear}-01`;
    const defaultEnd = `${currentYear + 1}-12`;

    const minMonth = relevantMonths.size > 0 ? [...relevantMonths].sort()[0] : defaultStart;
    const maxMonth = relevantMonths.size > 0 ? [...relevantMonths].sort().reverse()[0] : defaultEnd;
    const minDate = new Date(minMonth + '-01');
    const maxDate = new Date(maxMonth + '-01');
    const diffMonths = (maxDate.getFullYear() - minDate.getFullYear()) * 12 + (maxDate.getMonth() - minDate.getMonth());
    const totalMonths = Math.max(diffMonths + 1, 12);

    for (let i = 0; i < totalMonths; i++) {
      const month = addMonths(minDate, i);
      const key = format(month, 'yyyy-MM');
      monthlyData[key] = { month: format(month, 'MMM/yy', { locale: ptBR }), implantacao: 0, a_receber: 0, recorrente: 0, reconhecido: 0 };
      monthlyRecorrenteProducts[key] = [];
    }

    const implantacaoProductsMap = {};
    projects.forEach(project => {
      const projectProducts = allProducts.filter(p => p.project_id === project.id);
      if (!projectProducts.length) return;

      // Sempre por produto
      projectProducts.forEach(prod => {
        const operacaoEvent = allTimelineEvents.find(e => e.product_id === prod.id && e.phase === 'operacao_assistida' && e.end_date);
        if (!operacaoEvent || !operacaoEvent.end_date) return;
        const implMonth = operacaoEvent.end_date.substring(0, 7);
        if (!monthlyData[implMonth]) return;
        const totalImplValue = prod.implementation_value || 0;
        if (totalImplValue > 0) {
          monthlyData[implMonth].implantacao += totalImplValue;
          if (!implantacaoProductsMap[implMonth]) implantacaoProductsMap[implMonth] = [];
          implantacaoProductsMap[implMonth].push({ product: prod, project, end_date: operacaoEvent.end_date, amount: totalImplValue });
        }
      });
    });

    Object.keys(monthlyData).forEach(monthKey => {
      const productsThisMonth = implantacaoProductsMap[monthKey] || [];
      let totalImplValue = 0;
      let totalRecognized = 0;
      productsThisMonth.forEach(({ product, amount }) => {
        totalImplValue += amount;
        const productRecognitions = allRecognizedRevenues.filter(r => r.product_id === product.id && r.type === 'implantacao');
        totalRecognized += productRecognitions.reduce((sum, r) => sum + r.amount, 0);
      });
      monthlyData[monthKey].a_receber = Math.max(0, totalImplValue - totalRecognized);
    });

    const getGoLiveDate2 = (e) => e.start_date || e.end_date;

    // Sempre por produto
    projects.forEach(project => {
      const projectProducts = allProducts.filter(p => p.project_id === project.id && (p.inclusion_value || 0) > 0);
      if (!projectProducts.length) return;
      
      projectProducts.forEach(prod => {
        const goLiveEvent = allTimelineEvents.find(e => e.product_id === prod.id && e.phase === 'go_live' && getGoLiveDate2(e));
        if (!goLiveEvent) return;
        const goLiveDate = getGoLiveDate2(goLiveEvent);
        const goLiveMonth = goLiveDate.substring(0, 7);
        if (!monthlyData[goLiveMonth]) return;
        monthlyData[goLiveMonth].recorrente += (prod.inclusion_value || 0);
        monthlyRecorrenteProducts[goLiveMonth].push({ product: prod, project, startDate: goLiveDate, inclusionValue: prod.inclusion_value || 0 });
      });
    });

    allRecognizedRevenues.forEach(recognized => {
      if (recognized.type !== 'implantacao') return;
      const project = allProjectsData.find(p => p.id === recognized.project_id);
      if (!project || project.status === 'concluido') return;
      const recMonth = recognized.recognition_month.substring(0, 7);
      if (monthlyData[recMonth]) monthlyData[recMonth].reconhecido += recognized.amount;
    });

    // Filter chartData to show only current month forward
    const chartData = Object.entries(monthlyData)
      .filter(([key]) => key >= currentYearMonth)
      .map(([, value]) => value);

    return { monthlyData, chartData };
  }, [projects, allProducts, allTimelineEvents, allCronogramas, allRecognizedRevenues, allProjectsData, allProgressCache]);

  // Calculate project with health status
  const projectsWithMetrics = useMemo(() => {
    return projects.map(project => {
      const recognizedRevenues = allRecognizedRevenues.filter(r => r.project_id === project.id);
      const totalRecognized = recognizedRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);

      const healthScore = getProjectHealthScore(project);
      const totalBudget = project.budget || 0;

      return {
        ...project,
        healthScore,
        progress: getProjectOverallProgress(project),
        dynamicStatus: getStatusFromHealthScore(healthScore),
        totalRecognized,
        totalBudget
      };
    }).sort((a, b) => {
      // Sort by budget (maior primeiro), then by health score
      if (b.totalBudget !== a.totalBudget) {
        return b.totalBudget - a.totalBudget;
      }
      return a.healthScore - b.healthScore;
    });
  }, [projects, allTimelineEvents, allHomologationTasks, allMigrationTasks, allRisks, allExpenses, allRecognizedRevenues, allProgressCache, allOverallProgressCache]);

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

  // Contagem de etapas carregadas para barra de progresso
  const loadingSteps = [
    { label: 'Projetos', done: !loadingProjects },
    { label: 'Cronogramas', done: !loadingCronogramas },
    { label: 'Etapas do cronograma', done: !loadingEvents },
    { label: 'Tarefas de homologação', done: !loadingHomolog },
    { label: 'Tarefas de migração', done: !loadingMigration },
    { label: 'Riscos', done: !loadingRisks },
    { label: 'Despesas', done: !loadingExpenses },
    { label: 'Produtos', done: !loadingProducts },
    { label: 'Receitas reconhecidas', done: !loadingRevenues },
  ];
  const loadedCount = loadingSteps.filter(s => s.done).length;
  const loadingPercent = Math.round((loadedCount / loadingSteps.length) * 100);

  // Early returns MUST come AFTER all hooks
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
          {/* Barra de progresso */}
          <div className="w-full space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>{loadedCount} de {loadingSteps.length} etapas</span>
              <span>{loadingPercent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${loadingPercent}%` }}
              />
            </div>
          </div>
          {/* Lista de etapas */}
          <div className="w-full space-y-1.5">
            {loadingSteps.map((step) => (
              <div key={step.label} className="flex items-center gap-2 text-sm">
                {step.done
                  ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  : <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
                }
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
            <a
              href="https://betha-road-map.base44.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white transition-colors text-xs font-medium"
            >
              🗺️ Reportar Bug / Melhoria
            </a>
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
                        <Button
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            setEditingProjectId(project.id);
                            setIsEditRecurringModalOpen(true);
                          }}
                          className="h-8 w-8 bg-blue-800/50 hover:bg-blue-700 border border-blue-600/40 shrink-0"
                          title="Editar Recorrente do Contrato"
                        >
                          <Pencil className="w-4 h-4 text-blue-300" />
                        </Button>
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
                    {(() => {
                       const projectCache = allProgressCache.find(c => c.project_id === project.id);
                       const estimatedDeadline = projectCache?.estimated_deadline;
                       return (
                         <div>
                           <div className="text-xs text-slate-400 font-medium">Prazo Estimado</div>
                           <div className="text-sm text-white">
                             {estimatedDeadline ? new Date(estimatedDeadline).toLocaleDateString('pt-BR') : '—'}
                           </div>
                         </div>
                       );
                    })()}
                    {project.deadline && (
                      <div>
                        <div className="text-xs text-slate-400 font-medium">Prazo Contratual</div>
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
                        <div className="text-xs text-slate-400 font-medium">Recorrente (calculado)</div>
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
                    {(project.contract_recurring_value > 0 || project.contract_recurring_notes) && (
                      <div className="col-span-2">
                        {project.contract_recurring_value > 0 && (
                          <>
                            <div className="text-xs text-slate-400 font-medium">Recorrente (contrato)</div>
                            <div className="text-sm text-blue-400 font-semibold">
                              {new Intl.NumberFormat('pt-BR', { 
                                style: 'currency', 
                                currency: 'BRL',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                              }).format(project.contract_recurring_value)}
                            </div>
                          </>
                        )}
                        {project.contract_recurring_notes && (
                          <div className="text-xs text-slate-300 mt-0.5">{project.contract_recurring_notes}</div>
                        )}
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
                    
                    const allItems = [
                      ...bulkRevenues.map((bulk, idx) => {
                        const [year, month] = bulk.recognition_month.split('-');
                        const monthYear = format(new Date(year, parseInt(month) - 1, 1), 'MMM/yy', { locale: ptBR });
                        return { key: `bulk-${idx}`, label: `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(bulk.amount)} - ${monthYear} - ${bulk.vertical_name} (Todos)` };
                      }),
                      ...individualRevenues.map(rev => {
                        const product = allProducts.find(p => p.id === rev.product_id);
                        const [year, month] = rev.recognition_month.split('-');
                        const monthYear = format(new Date(year, parseInt(month) - 1, 1), 'MMM/yy', { locale: ptBR });
                        return { key: rev.id, label: `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(rev.amount)} - ${monthYear} - ${product?.name || 'N/A'}` };
                      })
                    ];
                    const isExpanded = expandedRecognitions[project.id];
                    const visibleItems = isExpanded ? allItems : allItems.slice(0, 1);

                    return (
                      <div className="pt-3 border-t border-slate-600">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs text-slate-400 font-medium">Reconhecido</div>
                          <div className="flex items-center gap-2">
                            {allItems.length > 3 && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  setExpandedRecognitions(prev => ({ ...prev, [project.id]: !prev[project.id] }));
                                }}
                                className="text-xs text-yellow-400 hover:text-yellow-300"
                                title={isExpanded ? 'Recolher' : `Ver todos (${allItems.length})`}
                              >
                                {isExpanded ? '★' : '☆'} {!isExpanded && allItems.length}
                              </button>
                            )}
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
                        </div>
                        <div className="space-y-1">
                           {visibleItems.map(item => (
                             <div key={item.key} className="text-xs text-purple-400">{item.label}</div>
                           ))}
                           {!isExpanded && allItems.length > 1 && (
                             <div className="text-xs text-slate-500">+{allItems.length - 1} mais...</div>
                           )}
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

           {(() => {
            const { monthlyData, chartData } = financeiroChartContent;
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
                           const monthData = chartData.find(item => item.month === data.activeLabel);
                           if (monthData) {
                             const monthKey = Object.keys(monthlyData).find(
                               key => monthlyData[key].month === monthData.month && monthlyData[key].implantacao > 0
                             );
                             if (monthKey) {
                               setSelectedMonth(monthKey);
                               setSelectedMonthType('implantacao');
                             }
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
                         <Legend wrapperStyle={{ paddingTop: '15px' }} />
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
                           if (monthKey) {
                             setSelectedMonth(monthKey);
                             setSelectedMonthType('reconhecido_implantacao');
                           }
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
                         }).format(chartData.reduce((sum, d) => sum + d.a_receber, 0))}
                       </div>
                       <div className="text-sm text-slate-400">Total A Receber (12 meses)</div>
                     </div>
                  </CardContent>
                  </Card>
                  )}

                  {/* Gráfico de Recorrente */}
                  {visibleCharts.recorrente !== false && (
                  <Card className="bg-slate-800 border-slate-600">
                  <CardHeader>
                    <CardTitle className="text-white">Previsão de Inicio de inclusão (Recorrente)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart 
                       data={chartData}
                       onClick={(data) => {
                         if (data && data.activeLabel) {
                           const monthData = chartData.find(item => item.month === data.activeLabel);
                           if (monthData) {
                             const monthKey = Object.keys(monthlyData).find(
                               key => monthlyData[key].month === monthData.month && monthlyData[key].recorrente > 0
                             );
                             if (monthKey) {
                               setSelectedMonth(monthKey);
                               setSelectedMonthType('recorrente');
                             }
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
                  })()}

                  {/* Gráfico de Senhas */}
                  <PasswordReleasesChart 
                  products={allProducts.filter(p => projects.some(proj => proj.id === p.project_id))}
                  projects={projects}
                  visibleCharts={visibleCharts}
                  onVisibilityChange={handleChartVisibility}
                  />

                  {/* Lista de produtos do mês selecionado */}
                  {selectedMonth && (() => {
                    const [year, month] = selectedMonth.split('-');
                    const monthLabel = format(new Date(year, parseInt(month) - 1, 1), 'MMMM/yyyy', { locale: ptBR });

                    // Produtos a receber (verde) - operação assistida cai neste mês
                    const aReceberProds = [];
                    projects.forEach(project => {
                      const projectProducts = allProducts.filter(p => p.project_id === project.id && (p.implementation_value || 0) > 0);
                      if (!projectProducts.length) return;

                      // Sempre por produto
                      projectProducts.forEach(product => {
                        const operacaoEvent = allTimelineEvents.find(e => 
                          e.product_id === product.id && e.phase === 'operacao_assistida' && e.end_date
                        );

                        if (!operacaoEvent || !operacaoEvent.end_date) return;
                        const implMonth = operacaoEvent.end_date.substring(0, 7);
                        if (implMonth !== selectedMonth) return;

                        // Calcular quanto falta reconhecer (descontar de QUALQUER mês)
                        const totalRecognized = allRecognizedRevenues
                          .filter(r => r.product_id === product.id && r.type === 'implantacao')
                          .reduce((sum, r) => sum + r.amount, 0);
                        const implValue = product.implementation_value || 0;
                        const pendente = Math.max(0, implValue - totalRecognized);

                        if (pendente > 0) {
                          aReceberProds.push({
                            product,
                            project,
                            deadline: operacaoEvent?.end_date,
                            amount: pendente
                          });
                        }
                      });
                    });

                    // Produtos reconhecidos (roxo) - reconhecimento neste mês
                     const recognizedProds = allRecognizedRevenues.filter(r => {
                       const recMonth = r.recognition_month.substring(0, 7);
                       const product = allProducts.find(p => p.id === r.product_id);
                       const project = allProjectsData.find(p => p.id === r.project_id);
                       // Validar que produto e projeto existem
                       return recMonth === selectedMonth && r.type === 'implantacao' && product && project;
                     }).map(rec => {
                       const product = allProducts.find(p => p.id === rec.product_id);
                       const project = allProjectsData.find(p => p.id === rec.project_id);
                       return { rec, product, project };
                     });

                    // Produtos recorrente (azul) - go-live neste mês
                    const recorrenteProds = recorrenteProductsMap[selectedMonth] || [];

                    if (selectedMonthType === null && aReceberProds.length === 0 && recognizedProds.length === 0 && recorrenteProds.length === 0) return null;

                    // Mostrar qual card abrir
                    const showRecorrente = selectedMonthType === 'recorrente';

                    if (showRecorrente) {
                     return (
                       <Card className="bg-slate-800 border-slate-600">
                         <CardHeader>
                           <div className="flex items-center justify-between">
                             <CardTitle className="text-white">Previsão de Inclusão (Recorrente) — {monthLabel}</CardTitle>
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
                          <div>
                             <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Produtos Iniciando</div>
                             <div className="space-y-2">
                               {(() => {
                                 // Group by project
                                 const byProject = {};
                                 recorrenteProds.forEach(item => {
                                   const pid = item.project.id;
                                   if (!byProject[pid]) byProject[pid] = { project: item.project, items: [] };
                                   byProject[pid].items.push(item);
                                 });
                                 return Object.values(byProject).map(({ project: proj, items }) => {
                                   const isExpanded = expandedProjectGroups[`recorrente-${selectedMonth}-${proj.id}`];
                                   const total = items.reduce((s, i) => s + i.inclusionValue, 0);
                                   return (
                                     <div key={proj.id} className="rounded-lg border border-blue-700/50 overflow-hidden">
                                       <button
                                         className="w-full flex items-center justify-between p-3 bg-blue-900/30 hover:bg-blue-900/40 transition-colors text-left"
                                         onClick={() => setExpandedProjectGroups(prev => ({ ...prev, [`recorrente-${selectedMonth}-${proj.id}`]: !prev[`recorrente-${selectedMonth}-${proj.id}`] }))}
                                       >
                                         <div className="flex items-center gap-2">
                                           <span className="text-white font-semibold text-sm">{proj.name}</span>
                                           <span className="text-xs text-blue-300 bg-blue-900/50 px-1.5 py-0.5 rounded">{items.length} produto{items.length !== 1 ? 's' : ''}</span>
                                         </div>
                                         <div className="flex items-center gap-3">
                                           <span className="text-sm font-semibold text-blue-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(total)}</span>
                                           <span className="text-slate-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                                         </div>
                                       </button>
                                       {isExpanded && (
                                         <div className="divide-y divide-blue-800/30">
                                           {items.map(({ product, vertical, startDate, inclusionValue }) => (
                                             <div key={product.id} className="flex items-start justify-between gap-4 px-4 py-2.5 bg-blue-900/10">
                                               <div className="flex-1">
                                                 <div className="font-medium text-white text-sm">{product.name}</div>
                                                 <div className="text-xs text-slate-400">{product.entity ? `${product.entity}` : ''}{vertical ? ` · ${vertical}` : ''}</div>
                                               </div>
                                               <div className="text-right shrink-0">
                                                 <div className="text-sm font-semibold text-blue-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(inclusionValue)}</div>
                                                 {startDate && <div className="text-xs text-slate-500">{format(new Date(startDate), 'dd/MM/yyyy', { locale: ptBR })}</div>}
                                               </div>
                                             </div>
                                           ))}
                                         </div>
                                       )}
                                     </div>
                                   );
                                 });
                               })()}
                             </div>
                           </div>
                         </CardContent>
                       </Card>
                     );
                    }

                    return (
                     <Card className="bg-slate-800 border-slate-600">
                       <CardHeader>
                         <div className="flex items-center justify-between">
                           <CardTitle className="text-white">Implantação — {monthLabel}</CardTitle>
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
                          {/* A Receber */}
                          {aReceberProds.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">A Receber</div>
                              <div className="space-y-2">
                                {(() => {
                                  const byProject = {};
                                  aReceberProds.forEach(item => {
                                    const pid = item.project.id;
                                    if (!byProject[pid]) byProject[pid] = { project: item.project, items: [] };
                                    byProject[pid].items.push(item);
                                  });
                                  return Object.values(byProject).map(({ project: proj, items }) => {
                                    const isExpanded = expandedProjectGroups[`areceber-${selectedMonth}-${proj.id}`];
                                    const total = items.reduce((s, i) => s + i.amount, 0);
                                    return (
                                      <div key={proj.id} className="rounded-lg border border-emerald-700/50 overflow-hidden">
                                        <button
                                          className="w-full flex items-center justify-between p-3 bg-emerald-900/30 hover:bg-emerald-900/40 transition-colors text-left"
                                          onClick={() => setExpandedProjectGroups(prev => ({ ...prev, [`areceber-${selectedMonth}-${proj.id}`]: !prev[`areceber-${selectedMonth}-${proj.id}`] }))}
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className="text-white font-semibold text-sm">{proj.name}</span>
                                            <span className="text-xs text-emerald-300 bg-emerald-900/50 px-1.5 py-0.5 rounded">{items.length} produto{items.length !== 1 ? 's' : ''}</span>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <span className="text-sm font-semibold text-emerald-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(total)}</span>
                                            <span className="text-slate-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                                          </div>
                                        </button>
                                        {isExpanded && (
                                          <div className="divide-y divide-emerald-800/30">
                                            {items.map(({ product, deadline, amount }) => (
                                              <div key={product.id} className="flex items-start justify-between gap-4 px-4 py-2.5 bg-emerald-900/10">
                                                <div className="flex-1">
                                                  <div className="font-medium text-white text-sm">{product.name}</div>
                                                  {product.entity && <div className="text-xs text-slate-400">{product.entity}</div>}
                                                </div>
                                                <div className="text-right shrink-0">
                                                  <div className="text-sm font-semibold text-emerald-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(amount)}</div>
                                                  {deadline && <div className="text-xs text-slate-500">{format(new Date(deadline), 'dd/MM/yyyy', { locale: ptBR })}</div>}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            </div>
                          )}

                          {/* Reconhecidos */}
                          {recognizedProds.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">Reconhecidos</div>
                              <div className="space-y-2">
                                {recognizedProds.map(({ rec, product, project }) => (
                                  <div key={rec.id} className="p-3 bg-purple-900/20 rounded-lg border border-purple-700/50">
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1">
                                       <div className="font-semibold text-white text-sm">{product?.name || 'N/A'}</div>
                                       <div className="text-xs text-slate-400">{project?.name || 'N/A'}{product?.entity ? ` · ${product.entity}` : ''}</div>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <div className="text-sm font-semibold text-purple-400">
                                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(rec.amount)}
                                        </div>
                                      </div>
                                    </div>
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

      {/* Edit Recurring Modal */}
      {editingProjectId && allProjectsData && (
        <EditProjectRecurringModal
          open={isEditRecurringModalOpen}
          onOpenChange={setIsEditRecurringModalOpen}
          project={allProjectsData.find(p => p.id === editingProjectId)}
          onSave={(value, notes) => {
            updateProjectRecurringMutation.mutate({
              id: editingProjectId,
              recurringValue: value,
              notes
            });
          }}
        />
      )}

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