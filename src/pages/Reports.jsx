import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Package,
  Calendar,
  Target,
  Activity,
  Gauge,
  Wallet,
  Plane,
  Info,
  CalendarDays,
  Users,
  CheckSquare
} from 'lucide-react';
import { cn } from "@/lib/utils";
import KPICard from '../components/reports/KPICard';
import ExportButton from '../components/reports/ExportButton';
import EmptyState from '../components/ui/EmptyState';
import { phaseLabels } from '../components/timeline/phaseLabels';

const verticalLabels = {
  arrecadacao: 'Arrecadação',
  compras: 'Compras',
  contabil: 'Contábil',
  pessoal: 'Pessoal',
  educacao: 'Educação',
  iss: 'ISS',
  parceiros: 'Parceiros',
  plataforma: 'Plataforma',
  saude: 'Saúde',
  gerenciamento: 'Gerenciamento'
};

const statusLabels = {
  pendente: 'Pendente',
  em_homologacao: 'Em Homologação',
  homologado: 'Homologado',
  em_producao: 'Em Produção'
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function Reports() {
  const [activeMainTab, setActiveMainTab] = useState('visao_geral');
  const [selectedKPI, setSelectedKPI] = useState(null);
  
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');

  // Fetch all data
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products', projectId],
    queryFn: () => projectId ? base44.entities.Product.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const { data: timelineEvents = [] } = useQuery({
    queryKey: ['timelineEvents', projectId],
    queryFn: () => projectId ? base44.entities.TimelineEvent.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const { data: homologationTasks = [] } = useQuery({
    queryKey: ['homologationTasks', projectId],
    queryFn: () => projectId ? base44.entities.HomologationTask.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const { data: migrationTasks = [] } = useQuery({
    queryKey: ['migrationTasks', projectId],
    queryFn: () => projectId ? base44.entities.MigrationTask.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const { data: risks = [] } = useQuery({
    queryKey: ['risks', projectId],
    queryFn: () => projectId ? base44.entities.Risk.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', projectId],
    queryFn: () => projectId ? base44.entities.ProjectActivity.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', projectId],
    queryFn: () => projectId ? base44.entities.Expense.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const { data: travels = [] } = useQuery({
    queryKey: ['travels', projectId],
    queryFn: () => projectId ? base44.entities.Travel.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const activeProject = projects.find(p => p.id === projectId);

  const filteredProducts = products;
  const filteredHomologationTasks = homologationTasks;
  const filteredMigrationTasks = migrationTasks;

  // Calculate KPIs
  const kpis = useMemo(() => {
    const completedTimeline = timelineEvents.filter(e => e.status === 'concluido').length;
    const totalTimeline = timelineEvents.length;
    const timelineProgress = totalTimeline > 0 ? Math.round((completedTimeline / totalTimeline) * 100) : 0;

    // SPI (Schedule Performance Index)
    const today = new Date().getTime();
    const plannedCompleted = timelineEvents.filter(e => e.end_date && new Date(e.end_date).getTime() <= today).length;
    const spi = plannedCompleted > 0 ? (completedTimeline / plannedCompleted).toFixed(2) : (completedTimeline > 0 ? '∞' : '1.00');

    // Aderência do Cronograma
    const onTimeCount = timelineEvents.filter(e => e.status === 'concluido' && (!e.end_date || new Date(e.end_date).getTime() >= today)).length; // Simplified adherence, assuming completed events that didn't pass today are on time, or basically check if they are late. Actually, checking if status is 'concluido' and not 'atrasado'
    const aderencia = completedTimeline > 0 ? Math.round((onTimeCount / completedTimeline) * 100) : 100;

    // Previsão de Término (Forecast)
    let forecastDate = 'N/A';
    if (totalTimeline > 0 && completedTimeline > 0 && completedTimeline < totalTimeline) {
      const minStart = Math.min(...timelineEvents.filter(e => e.start_date).map(e => new Date(e.start_date).getTime()));
      if (minStart) {
        const daysElapsed = (today - minStart) / (1000 * 60 * 60 * 24);
        const velocity = completedTimeline / daysElapsed; // stages per day
        const daysRemaining = (totalTimeline - completedTimeline) / velocity;
        const projectedEnd = new Date(today + (daysRemaining * 24 * 60 * 60 * 1000));
        forecastDate = projectedEnd.toLocaleDateString('pt-BR');
      }
    } else if (completedTimeline === totalTimeline && totalTimeline > 0) {
      forecastDate = 'Concluído';
    }

    // Burn Rate (Consumo Mensal)
    const expensesByMonth = {};
    let totalExpenses = 0;
    expenses.forEach(e => {
      if (!e.date || !e.amount) return;
      const amount = Number(e.amount);
      totalExpenses += amount;
      const monthYear = e.date.substring(0, 7); // YYYY-MM
      expensesByMonth[monthYear] = (expensesByMonth[monthYear] || 0) + amount;
    });
    const monthsActive = Object.keys(expensesByMonth).length;
    const burnRate = monthsActive > 0 ? (totalExpenses / monthsActive) : 0;

    // CPIs
    const estimatedBudget = activeProject?.implementation_estimated_budget || 0;
    const totalBudget = activeProject?.budget || 0;
    
    const earnedValueEst = estimatedBudget * (timelineProgress / 100);
    const earnedValueTot = totalBudget * (timelineProgress / 100);
    
    const cpiEst = totalExpenses > 0 ? (earnedValueEst / totalExpenses).toFixed(2) : (timelineProgress > 0 ? '∞' : 'N/A');
    const cpiTot = totalExpenses > 0 ? (earnedValueTot / totalExpenses).toFixed(2) : (timelineProgress > 0 ? '∞' : 'N/A');

    // Viagens por Fase
    const travelsByPhase = {};
    let totalTravelsMapped = 0;
    travels.forEach(t => {
      if (!t.start_date) return;
      const tDate = new Date(t.start_date).getTime();
      // Encontrar etapa que engloba essa data
      const phase = timelineEvents.find(e => e.start_date && e.end_date && new Date(e.start_date).getTime() <= tDate && new Date(e.end_date).getTime() >= tDate);
      if (phase && phase.phase) {
        travelsByPhase[phase.phase] = (travelsByPhase[phase.phase] || 0) + 1;
        totalTravelsMapped++;
      } else {
        travelsByPhase['Outros'] = (travelsByPhase['Outros'] || 0) + 1;
        totalTravelsMapped++;
      }
    });

    // Produtos em Produção
    const productsInProduction = filteredProducts.filter(p => p.production_password).length;
    const totalProducts = filteredProducts.length;

    // Velocidade Média de Implantação - com detalhes por produto
    const productImplDetails = filteredProducts.map(p => {
      const pEvents = timelineEvents.filter(e => e.product_id === p.id);
      if (pEvents.length === 0) return null;
      const allCompleted = pEvents.every(e => e.status === 'concluido');
      if (!allCompleted) return null;
      const startDates = pEvents.map(e => new Date(e.start_date).getTime()).filter(t => !isNaN(t));
      const endDates = pEvents.map(e => new Date(e.end_date).getTime()).filter(t => !isNaN(t));
      if (startDates.length === 0 || endDates.length === 0) return null;
      const minStart = Math.min(...startDates);
      const maxEnd = Math.max(...endDates);
      const days = Math.ceil((maxEnd - minStart) / (1000 * 60 * 60 * 24));
      return { id: p.id, name: p.name, vertical: p.vertical, days };
    }).filter(d => d !== null && d >= 0);

    const completedProductsTimeline = productImplDetails.map(d => d.days);
    const avgProductImplTime = completedProductsTimeline.length > 0 
      ? Math.round(completedProductsTimeline.reduce((a,b) => a+b, 0) / completedProductsTimeline.length) 
      : 0;

    const top5Fastest = [...productImplDetails].sort((a,b) => a.days - b.days).slice(0, 5);
    const top5Slowest = [...productImplDetails].sort((a,b) => b.days - a.days).slice(0, 5);

    // Tempo Médio por Fase - com detalhes por tipo de fase
    const completedPhases = timelineEvents.filter(e => e.status === 'concluido' && e.start_date && e.end_date);
    const phaseDetailsMap = {};
    completedPhases.forEach(phase => {
      const key = phase.phase || phase.title || 'Sem fase';
      const start = new Date(phase.start_date);
      const end = new Date(phase.end_date);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (!phaseDetailsMap[key]) phaseDetailsMap[key] = { total: 0, count: 0 };
      phaseDetailsMap[key].total += days;
      phaseDetailsMap[key].count += 1;
    });
    const phaseAvgDetails = Object.entries(phaseDetailsMap).map(([key, val]) => ({
      phase: key,
      label: phaseLabels[key] || key,
      avgDays: Math.round(val.total / val.count),
      count: val.count
    })).sort((a,b) => b.avgDays - a.avgDays);

    const avgDaysPerPhase = completedPhases.length > 0 
      ? Math.round(
          completedPhases.reduce((sum, phase) => {
            const start = new Date(phase.start_date);
            const end = new Date(phase.end_date);
            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            return sum + days;
          }, 0) / completedPhases.length
        )
      : 0;

    // Riscos Altos - com detalhes
    const highRisksList = risks.filter(r => 
      (r.probability >= 4 || r.impact >= 4) && 
      r.status !== 'mitigado'
    );
    const highRisks = highRisksList.length;

    return {
      timelineProgress,
      spi,
      aderencia,
      forecastDate,
      burnRate,
      cpiEst,
      cpiTot,
      estimatedBudget,
      totalBudget,
      totalExpenses,
      travelsByPhase,
      totalTravelsMapped,
      plannedCompleted,
      completedTimeline,
      productsInProduction,
      productsInProductionList: filteredProducts.filter(p => p.production_password),
      totalProducts,
      avgProductImplTime,
      top5Fastest,
      top5Slowest,
      avgDaysPerPhase,
      phaseAvgDetails,
      highRisks,
      highRisksList
    };
  }, [timelineEvents, expenses, activeProject, travels, filteredProducts, risks]);

  // Progress by Vertical
  const verticalProgress = useMemo(() => {
    const verticalMap = {};
    
    filteredProducts.forEach(product => {
      if (!product.vertical) return;
      if (!verticalMap[product.vertical]) {
        verticalMap[product.vertical] = { completed: 0, total: 0 };
      }
    });

    [...filteredHomologationTasks, ...filteredMigrationTasks].forEach(task => {
      const product = filteredProducts.find(p => p.id === task.product_id);
      if (!product?.vertical) return;
      
      if (!verticalMap[product.vertical]) {
        verticalMap[product.vertical] = { completed: 0, total: 0 };
      }
      
      verticalMap[product.vertical].total++;
      if (task.completed) {
        verticalMap[product.vertical].completed++;
      }
    });

    return Object.entries(verticalMap).map(([vertical, data]) => ({
      name: verticalLabels[vertical] || vertical,
      vertical,
      completed: data.completed,
      total: data.total,
      percentage: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0
    })).sort((a, b) => b.percentage - a.percentage);
  }, [filteredProducts, filteredHomologationTasks, filteredMigrationTasks]);

  // Progress by Product
  const productProgress = useMemo(() => {
    return filteredProducts.map(product => {
      const productTasks = [...filteredHomologationTasks, ...filteredMigrationTasks].filter(
        t => t.product_id === product.id
      );
      const completed = productTasks.filter(t => t.completed).length;
      const total = productTasks.length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        id: product.id,
        name: product.name,
        vertical: verticalLabels[product.vertical] || product.vertical,
        status: statusLabels[product.status] || product.status,
        progress,
        completed,
        total
      };
    }).sort((a, b) => b.progress - a.progress);
  }, [filteredProducts, filteredHomologationTasks, filteredMigrationTasks]);

  // Identify bottlenecks
  const bottlenecks = useMemo(() => {
    const issues = [];

    const delayedEvents = timelineEvents.filter(e => 
      e.status === 'atrasado' || 
      (e.end_date && new Date(e.end_date) < new Date() && e.status !== 'concluido')
    );
    
    if (delayedEvents.length > 0) {
      issues.push({
        area: 'Cronograma',
        description: `${delayedEvents.length} etapas atrasadas`,
        impact: 'Alto',
        severity: 'high'
      });
    }

    const stuckProducts = filteredProducts.filter(p => p.status === 'em_homologacao');
    if (stuckProducts.length > 3) {
      issues.push({
        area: 'Homologação',
        description: `${stuckProducts.length} produtos aguardando homologação`,
        impact: 'Médio',
        severity: 'medium'
      });
    }

    // Verticals with low progress
    const lowProgressVerticals = verticalProgress.filter(v => v.percentage < 30 && v.total > 5);
    if (lowProgressVerticals.length > 0) {
      issues.push({
        area: 'Verticais',
        description: `${lowProgressVerticals.map(v => v.name).join(', ')} com progresso abaixo de 30%`,
        impact: 'Médio',
        severity: 'medium'
      });
    }

    // High risks
    if (kpis.highRisks > 0) {
      issues.push({
        area: 'Riscos',
        description: `${kpis.highRisks} riscos de alta prioridade não mitigados`,
        impact: 'Alto',
        severity: 'high'
      });
    }

    return issues;
  }, [timelineEvents, filteredProducts, verticalProgress, kpis.highRisks]);

  const [kpiTimeVertical, setKpiTimeVertical] = useState('all');

  const kpiTimeVerticals = useMemo(() => {
    const verts = new Set();
    activities.forEach(a => { if (a.vertical) verts.add(a.vertical); });
    return Array.from(verts).sort();
  }, [activities]);

  // Activity KPIs
  const activityMetrics = useMemo(() => {
    const filteredActivities = kpiTimeVertical === 'all' 
      ? activities 
      : activities.filter(a => a.vertical === kpiTimeVertical);

    if (!filteredActivities.length) return { 
      leadTime: 0, cycleTime: 0, velocity: 0, 
      throughput: 0, analystsCount: 0, analystProductivity: [], avgProductivity: 0,
      burndownData: [], velocityData: [], sampleTasks: [], pessoasPorEtapa: [], avgPessoasPorEtapa: 0 
    };

    const doneActivities = filteredActivities.filter(a => a.status === 'done' || a.status === 'concluido');
    
    const phaseAssigneesMap = {};
    filteredActivities.forEach(a => {
      if (a.phase && a.assignee) {
        if (!phaseAssigneesMap[a.phase]) {
          phaseAssigneesMap[a.phase] = new Set();
        }
        phaseAssigneesMap[a.phase].add(a.assignee);
      }
    });

    const pessoasPorEtapa = Object.entries(phaseAssigneesMap)
      .map(([phase, assignees]) => ({ phase, count: assignees.size }))
      .sort((a,b) => b.count - a.count);
      
    const totalPessoasNasEtapas = pessoasPorEtapa.reduce((acc, curr) => acc + curr.count, 0);
    const avgPessoasPorEtapa = pessoasPorEtapa.length > 0 ? Math.round((totalPessoasNasEtapas / pessoasPorEtapa.length) * 10) / 10 : 0;
    const throughput = doneActivities.length;

    let totalLeadTime = 0;
    let leadTimeCount = 0;
    
    let totalCycleTime = 0;
    let cycleTimeCount = 0;

    const analystMap = {};
    const allAnalysts = new Set();
    filteredActivities.forEach(a => {
      if (a.assignee) allAnalysts.add(a.assignee);
    });

    doneActivities.forEach(act => {
      if (act.assignee) {
        analystMap[act.assignee] = (analystMap[act.assignee] || 0) + 1;
      }
      if (act.created_date && act.updated_date) {
        const lead = new Date(act.updated_date).getTime() - new Date(act.created_date).getTime();
        totalLeadTime += lead;
        leadTimeCount++;
      }
      if (act.start_date && act.end_date) {
        const cycle = new Date(act.end_date).getTime() - new Date(act.start_date).getTime();
        if (cycle >= 0) {
          totalCycleTime += cycle;
          cycleTimeCount++;
        }
      }
    });

    const analystProductivity = Object.entries(analystMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a,b) => b.count - a.count);
    const analystsCount = allAnalysts.size;
    const avgProductivity = analystsCount > 0 ? Math.round((throughput / analystsCount) * 10) / 10 : 0;

    const avgLeadTime = leadTimeCount ? Math.round(totalLeadTime / leadTimeCount / (1000 * 60 * 60 * 24)) : 0;
    const avgCycleTime = cycleTimeCount ? Math.round(totalCycleTime / cycleTimeCount / (1000 * 60 * 60 * 24)) : 0;

    const velocityMap = {};
    doneActivities.forEach(act => {
      if (act.updated_date) {
        const date = new Date(act.updated_date);
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        const weekKey = `Sem ${weekNum}`;
        
        velocityMap[weekKey] = (velocityMap[weekKey] || 0) + 1;
      }
    });

    const velocityData = Object.entries(velocityMap)
      .map(([week, count]) => ({ week, concluidas: count }))
      .sort((a, b) => {
         const aNum = parseInt(a.week.replace('Sem ', ''));
         const bNum = parseInt(b.week.replace('Sem ', ''));
         return aNum - bNum;
      });

    const avgVelocity = velocityData.length ? Math.round(doneActivities.length / velocityData.length) : 0;

    const dates = filteredActivities
      .map(a => a.created_date ? new Date(a.created_date).toISOString().split('T')[0] : null)
      .filter(Boolean)
      .sort();
      
    let burndownData = [];
    if (dates.length > 0) {
      const startDate = new Date(dates[0]);
      const endDate = new Date();
      let currentDate = new Date(startDate);
      let totalCreated = filteredActivities.length;
      
      const totalDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
      const dailyBurn = totalCreated / totalDays;
      
      let dayCount = 0;
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const doneUpToDate = doneActivities.filter(a => a.updated_date && a.updated_date.split('T')[0] <= dateStr).length;
        
        burndownData.push({
          date: currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          restantes: totalCreated - doneUpToDate,
          ideal: Math.max(0, Math.round(totalCreated - (dailyBurn * dayCount)))
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
        dayCount++;
      }
    }

    return {
      leadTime: avgLeadTime,
      cycleTime: avgCycleTime,
      velocity: avgVelocity,
      throughput,
      analystsCount,
      analystProductivity,
      avgProductivity,
      burndownData,
      velocityData,
      sampleTasks: doneActivities.slice(0, 5),
      pessoasPorEtapa,
      avgPessoasPorEtapa
    };
  }, [activities, kpiTimeVertical]);

  // Prepare export data
  const exportData = {
    kpis: [
      { title: 'Taxa de Conclusão', value: `${kpis.completionRate}%`, trend: null },
      { title: 'Progresso Timeline', value: `${kpis.timelineProgress}%`, trend: null },
      { title: 'Produtos em Produção', value: `${kpis.productsInProduction}/${kpis.totalProducts}`, trend: null },
      { title: 'Riscos Altos', value: kpis.highRisks, trend: null },
      { title: 'Tempo Médio/Fase', value: `${kpis.avgDaysPerPhase} dias`, trend: null },
      { title: 'Lead Time Médio', value: `${activityMetrics.leadTime} dias`, trend: null },
      { title: 'Cycle Time Médio', value: `${activityMetrics.cycleTime} dias`, trend: null },
      { title: 'Velocidade Média', value: `${activityMetrics.velocity} tarefas/semana`, trend: null }
    ],
    verticals: verticalProgress,
    products: productProgress,
    bottlenecks
  };

  if (!projectId || !activeProject) {
    return (
      <div className="p-6 lg:p-8">
        <EmptyState
          icon={Activity}
          title="Selecione um projeto"
          description="Escolha um projeto para visualizar relatórios e KPIs detalhados"
        />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Relatórios e KPIs</h1>
          <p className="text-slate-400 mt-1">Análise detalhada do progresso do projeto</p>
        </div>
        <ExportButton 
          projectName={activeProject.name}
          reportData={exportData}
        />
      </div>

      <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
        <TabsList className="bg-slate-800 border border-slate-700 flex flex-wrap h-auto mb-6">
          <TabsTrigger value="visao_geral" className="data-[state=active]:bg-blue-600">Visão Geral do Projeto</TabsTrigger>
          <TabsTrigger value="kpi_time" className="data-[state=active]:bg-blue-600">KPI do Time</TabsTrigger>
        </TabsList>

        <TabsContent value="visao_geral" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <KPICard
              title="Produtos em Produção"
              value={`${kpis.productsInProduction}/${kpis.totalProducts}`}
              subtitle="Senha Liberada"
              icon={Package}
              color="blue"
              onClick={() => setSelectedKPI(selectedKPI === 'produtos' ? null : 'produtos')}
              isSelected={selectedKPI === 'produtos'}
            />
            <KPICard
              title="Velocidade Média"
              value={`${kpis.avgProductImplTime}d`}
              subtitle="Tempo de implantação/produto"
              icon={TrendingUp}
              color="purple"
              onClick={() => setSelectedKPI(selectedKPI === 'velocidade' ? null : 'velocidade')}
              isSelected={selectedKPI === 'velocidade'}
            />
            <KPICard
              title="Riscos"
              value={kpis.highRisks}
              subtitle="Alto impacto/probabilidade"
              icon={AlertTriangle}
              color="red"
              onClick={() => setSelectedKPI(selectedKPI === 'riscos' ? null : 'riscos')}
              isSelected={selectedKPI === 'riscos'}
            />
            <KPICard
              title="Tempo Médio/Fase"
              value={`${kpis.avgDaysPerPhase}d`}
              subtitle="Por etapa concluída"
              icon={Clock}
              color="yellow"
              onClick={() => setSelectedKPI(selectedKPI === 'tempo_fase' ? null : 'tempo_fase')}
              isSelected={selectedKPI === 'tempo_fase'}
            />
            <KPICard
              title="SPI"
              value={kpis.spi}
              subtitle="Schedule Performance Index"
              icon={Gauge}
              color={Number(kpis.spi) >= 1 ? "green" : "red"}
              onClick={() => setSelectedKPI(selectedKPI === 'spi' ? null : 'spi')}
              isSelected={selectedKPI === 'spi'}
            />
            <KPICard
              title="Aderência"
              value={`${kpis.aderencia}%`}
              subtitle="Cronograma no prazo"
              icon={CalendarDays}
              color={kpis.aderencia >= 90 ? "green" : kpis.aderencia >= 70 ? "yellow" : "red"}
              onClick={() => setSelectedKPI(selectedKPI === 'aderencia' ? null : 'aderencia')}
              isSelected={selectedKPI === 'aderencia'}
            />
            <KPICard
              title="Forecast"
              value={kpis.forecastDate}
              subtitle="Previsão de Término"
              icon={Target}
              color="blue"
              onClick={() => setSelectedKPI(selectedKPI === 'forecast' ? null : 'forecast')}
              isSelected={selectedKPI === 'forecast'}
            />
            <KPICard
              title="Burn Rate"
              value={`R$ ${Math.round(kpis.burnRate).toLocaleString('pt-BR')}`}
              subtitle="Consumo Mensal"
              icon={Wallet}
              color="orange"
              onClick={() => setSelectedKPI(selectedKPI === 'burnrate' ? null : 'burnrate')}
              isSelected={selectedKPI === 'burnrate'}
            />
            <KPICard
              title="CPI"
              value={kpis.cpiEst}
              subtitle="Cost Performance Index"
              icon={Activity}
              color={Number(kpis.cpiEst) >= 1 ? "green" : "red"}
              onClick={() => setSelectedKPI(selectedKPI === 'cpi' ? null : 'cpi')}
              isSelected={selectedKPI === 'cpi'}
            />
            <KPICard
              title="Viagens"
              value={kpis.totalTravelsMapped}
              subtitle="Por fase do projeto"
              icon={Plane}
              color="cyan"
              onClick={() => setSelectedKPI(selectedKPI === 'viagens' ? null : 'viagens')}
              isSelected={selectedKPI === 'viagens'}
            />
          </div>

          {/* Details Panel */}
          {selectedKPI && (
            <Card className="bg-slate-800/80 border-blue-500/30 ring-1 ring-blue-500/20">
              <CardContent className="p-6">
                {selectedKPI === 'produtos' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Package className="w-5 h-5 text-blue-400" />
                      <h3 className="text-lg font-medium text-white">Produtos em Produção — Senha Liberada</h3>
                    </div>
                    <p className="text-slate-300 text-sm">Lista de produtos com a senha de produção liberada.</p>
                    <div className="space-y-2 mt-2">
                      {kpis.productsInProductionList.length > 0 ? (
                        kpis.productsInProductionList.map(p => (
                          <div key={p.id} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                            <div>
                              <p className="text-white font-medium">{p.name}</p>
                              <p className="text-xs text-slate-400">{verticalLabels[p.vertical] || p.vertical}</p>
                            </div>
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Em Produção</Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-500 text-center py-4">Nenhum produto em produção ainda.</p>
                      )}
                    </div>
                  </div>
                )}

                {selectedKPI === 'velocidade' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-5 h-5 text-purple-400" />
                      <h3 className="text-lg font-medium text-white">Velocidade de Implantação por Produto</h3>
                    </div>
                    <p className="text-slate-300 text-sm">Apenas produtos com todas as etapas de cronograma concluídas são considerados. Tempo medido do início à última etapa.</p>
                    {kpis.top5Fastest.length === 0 && kpis.top5Slowest.length === 0 ? (
                      <p className="text-slate-500 text-center py-4">Nenhum produto com implantação concluída ainda.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                        <div>
                          <h4 className="text-green-400 font-semibold mb-3 flex items-center gap-1">🚀 5 Mais Rápidos</h4>
                          <div className="space-y-2">
                            {kpis.top5Fastest.map((p, i) => (
                              <div key={p.id} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-green-500/20">
                                <div>
                                  <p className="text-white text-sm font-medium">{i+1}. {p.name}</p>
                                  <p className="text-xs text-slate-400">{verticalLabels[p.vertical] || p.vertical}</p>
                                </div>
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{p.days}d</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-red-400 font-semibold mb-3 flex items-center gap-1">🐢 5 Mais Lentos</h4>
                          <div className="space-y-2">
                            {kpis.top5Slowest.map((p, i) => (
                              <div key={p.id} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-red-500/20">
                                <div>
                                  <p className="text-white text-sm font-medium">{i+1}. {p.name}</p>
                                  <p className="text-xs text-slate-400">{verticalLabels[p.vertical] || p.vertical}</p>
                                </div>
                                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{p.days}d</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedKPI === 'riscos' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      <h3 className="text-lg font-medium text-white">Principais Riscos do Projeto</h3>
                    </div>
                    <p className="text-slate-300 text-sm">Riscos com probabilidade ≥ 4 ou impacto ≥ 4, ainda não mitigados.</p>
                    <div className="space-y-3 mt-2">
                      {kpis.highRisksList.length > 0 ? (
                        kpis.highRisksList.map(r => {
                          const score = (r.probability || 1) * (r.impact || 1);
                          const severity = score >= 16 ? 'critico' : score >= 9 ? 'alto' : 'medio';
                          return (
                            <div key={r.id} className={cn(
                              "p-4 rounded-lg border",
                              severity === 'critico' ? "bg-red-500/10 border-red-500/40" :
                              severity === 'alto' ? "bg-orange-500/10 border-orange-500/30" :
                              "bg-yellow-500/10 border-yellow-500/30"
                            )}>
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-white font-medium">{r.title}</p>
                                <Badge className={cn(
                                  "border shrink-0",
                                  severity === 'critico' ? "bg-red-500/20 text-red-400 border-red-500/30" :
                                  severity === 'alto' ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                                  "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                )}>Score: {score}</Badge>
                              </div>
                              {r.description && <p className="text-slate-400 text-sm mt-1">{r.description}</p>}
                              <div className="flex gap-3 mt-2 text-xs text-slate-500">
                                <span>Probabilidade: {r.probability}/5</span>
                                <span>Impacto: {r.impact}/5</span>
                                <span>Status: {r.status}</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-4">
                          <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
                          <p className="text-green-400 font-medium">Nenhum risco crítico identificado!</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedKPI === 'tempo_fase' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="w-5 h-5 text-yellow-400" />
                      <h3 className="text-lg font-medium text-white">Tempo Médio por Fase do Cronograma</h3>
                    </div>
                    <p className="text-slate-300 text-sm">Média de dias gastos em cada tipo de fase, considerando apenas etapas concluídas.</p>
                    <div className="space-y-2 mt-2">
                      {kpis.phaseAvgDetails.length > 0 ? (
                        kpis.phaseAvgDetails.map(ph => (
                          <div key={ph.phase} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                            <div>
                              <p className="text-white font-medium text-sm">{ph.label}</p>
                              <p className="text-xs text-slate-500">{ph.count} ocorrência(s)</p>
                            </div>
                            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">{ph.avgDays}d</Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-500 text-center py-4">Nenhuma fase concluída ainda.</p>
                      )}
                    </div>
                  </div>
                )}

                {selectedKPI === 'spi' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Gauge className="w-5 h-5 text-blue-400" />
                      <h3 className="text-lg font-medium text-white">SPI - Schedule Performance Index</h3>
                    </div>
                    <p className="text-slate-300">
                      O SPI mede a eficiência do cronograma do projeto. É calculado dividindo as etapas que foram concluídas pelas etapas que foram planejadas para estarem concluídas até hoje.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <p className="text-sm text-slate-400">SPI &gt; 1.0</p>
                        <p className="text-green-400 font-medium">Projeto está Adiantado</p>
                      </div>
                      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <p className="text-sm text-slate-400">SPI = 1.0</p>
                        <p className="text-blue-400 font-medium">Projeto está no Prazo</p>
                      </div>
                      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <p className="text-sm text-slate-400">SPI &lt; 1.0</p>
                        <p className="text-red-400 font-medium">Projeto está Atrasado</p>
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-slate-400">
                      Dados atuais: {kpis.completedTimeline} concluídas / {kpis.plannedCompleted} planejadas para hoje.
                    </div>
                  </div>
                )}

                {selectedKPI === 'aderencia' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <CalendarDays className="w-5 h-5 text-blue-400" />
                      <h3 className="text-lg font-medium text-white">Aderência ao Cronograma</h3>
                    </div>
                    <p className="text-slate-300">
                      Representa a porcentagem de tarefas concluídas que não extrapolaram seus prazos originais (Data de Fim).
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <p className="text-sm text-slate-400">Bom</p>
                        <p className="text-green-400 font-medium">&gt; 90% (Maioria no prazo)</p>
                      </div>
                      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <p className="text-sm text-slate-400">Atenção</p>
                        <p className="text-yellow-400 font-medium">70% a 90%</p>
                      </div>
                      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <p className="text-sm text-slate-400">Crítico</p>
                        <p className="text-red-400 font-medium">&lt; 70% (Muitos atrasos contínuos)</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedKPI === 'forecast' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Target className="w-5 h-5 text-blue-400" />
                      <h3 className="text-lg font-medium text-white">Previsão de Término (Forecast)</h3>
                    </div>
                    <p className="text-slate-300">
                      Projeta a data de término do projeto com base na velocidade atual de entregas. Calculamos a taxa média de conclusão de etapas por dia e projetamos para as etapas restantes.
                    </p>
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 mt-4">
                      <p className="text-sm text-slate-400 mb-2">Por que isso é útil?</p>
                      <p className="text-slate-300">
                        Se a data projetada for superior ao Prazo Final do projeto, é um alerta de que o ritmo atual não é suficiente.
                      </p>
                    </div>
                  </div>
                )}

                {selectedKPI === 'burnrate' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Wallet className="w-5 h-5 text-blue-400" />
                      <h3 className="text-lg font-medium text-white">Burn Rate Mensal</h3>
                    </div>
                    <p className="text-slate-300">
                      O Burn Rate indica o consumo médio mensal do orçamento do projeto.
                    </p>
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 mt-4">
                      <p className="text-sm text-slate-400 mb-2">Despesas Acumuladas</p>
                      <p className="text-2xl font-bold text-white">
                        R$ {kpis.totalExpenses.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-sm text-slate-400 mt-2">
                        Um Burn Rate alto pode indicar gastos acelerados que podem estourar o orçamento antes da entrega.
                      </p>
                    </div>
                  </div>
                )}

                {selectedKPI === 'cpi' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Activity className="w-5 h-5 text-blue-400" />
                      <h3 className="text-lg font-medium text-white">CPI - Cost Performance Index</h3>
                    </div>
                    <p className="text-slate-300">
                      O CPI mede a eficiência de custos do projeto. Indica o quanto de valor foi agregado por cada real gasto.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <p className="text-sm text-slate-400">Baseado no Orçamento de Implantação</p>
                        <p className="text-2xl font-bold text-white mb-1">{kpis.cpiEst}</p>
                        <p className="text-xs text-slate-500">(R$ {kpis.estimatedBudget?.toLocaleString('pt-BR')})</p>
                      </div>
                      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <p className="text-sm text-slate-400">Baseado no Orçamento Total</p>
                        <p className="text-2xl font-bold text-white mb-1">{kpis.cpiTot}</p>
                        <p className="text-xs text-slate-500">(R$ {kpis.totalBudget?.toLocaleString('pt-BR')})</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <p className="text-sm text-slate-400">CPI &gt; 1.0</p>
                        <p className="text-green-400 font-medium">Gastando Menos que o Planejado</p>
                      </div>
                      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <p className="text-sm text-slate-400">CPI &lt; 1.0</p>
                        <p className="text-red-400 font-medium">Gastando Mais que o Planejado</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedKPI === 'viagens' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Plane className="w-5 h-5 text-blue-400" />
                      <h3 className="text-lg font-medium text-white">Viagens por Fase do Projeto</h3>
                    </div>
                    <p className="text-slate-300 mb-4">
                      Distribuição das viagens cruzadas com as fases ativas do cronograma no momento do deslocamento.
                    </p>
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                      <div className="space-y-3">
                        {Object.entries(kpis.travelsByPhase).length > 0 ? (
                          Object.entries(kpis.travelsByPhase).map(([phase, count]) => (
                            <div key={phase} className="flex items-center justify-between">
                              <span className="text-slate-300">{phase}</span>
                              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                {count} viagem(ns)
                              </Badge>
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-500">Nenhuma viagem registrada.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}


        </TabsContent>

        {/* KPI do Time Main Tab */}
        <TabsContent value="kpi_time" className="space-y-6 mt-0">
          <div className="flex items-center justify-between bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 mb-6">
            <h2 className="text-white font-medium">Filtro de Vertical</h2>
            <select
              value={kpiTimeVertical}
              onChange={(e) => {
                setKpiTimeVertical(e.target.value);
                setSelectedKPI(null);
              }}
              className="bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2 outline-none focus:border-blue-500 transition-colors"
            >
              <option value="all">Todas as Verticais</option>
              {kpiTimeVerticals.map(v => (
                <option key={v} value={v}>{verticalLabels[v] || v}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <KPICard
              title="Lead Time Médio"
              value={`${activityMetrics.leadTime}d`}
              subtitle="Criação até Conclusão"
              icon={Clock}
              color="blue"
              onClick={() => setSelectedKPI(selectedKPI === 'lead_time' ? null : 'lead_time')}
              isSelected={selectedKPI === 'lead_time'}
            />
            <KPICard
              title="Cycle Time Médio"
              value={`${activityMetrics.cycleTime}d`}
              subtitle="Início até Conclusão"
              icon={Activity}
              color="purple"
              onClick={() => setSelectedKPI(selectedKPI === 'cycle_time' ? null : 'cycle_time')}
              isSelected={selectedKPI === 'cycle_time'}
            />
            <KPICard
              title="Velocidade Média"
              value={activityMetrics.velocity}
              subtitle="Tarefas por semana"
              icon={TrendingUp}
              color="green"
              onClick={() => setSelectedKPI(selectedKPI === 'velocidade_time' ? null : 'velocidade_time')}
              isSelected={selectedKPI === 'velocidade_time'}
            />
            <KPICard
              title="Throughput"
              value={activityMetrics.throughput}
              subtitle="Total de tarefas concluídas"
              icon={CheckSquare}
              color="orange"
              onClick={() => setSelectedKPI(selectedKPI === 'throughput' ? null : 'throughput')}
              isSelected={selectedKPI === 'throughput'}
            />
            <KPICard
              title="Produtividade"
              value={activityMetrics.avgProductivity}
              subtitle="Tarefas / Analista"
              icon={Target}
              color="cyan"
              onClick={() => setSelectedKPI(selectedKPI === 'produtividade' ? null : 'produtividade')}
              isSelected={selectedKPI === 'produtividade'}
            />
            <KPICard
              title="Analistas"
              value={activityMetrics.analystsCount}
              subtitle="Total na vertical"
              icon={Users}
              color="yellow"
              onClick={() => setSelectedKPI(selectedKPI === 'analistas' ? null : 'analistas')}
              isSelected={selectedKPI === 'analistas'}
            />
          </div>

          {/* Details Panel for KPI Time */}
          {selectedKPI && ['lead_time', 'cycle_time', 'velocidade_time', 'throughput', 'produtividade', 'analistas'].includes(selectedKPI) && (
            <Card className="bg-slate-800/80 border-blue-500/30 ring-1 ring-blue-500/20 mb-6">
              <CardContent className="p-6">
                {selectedKPI === 'lead_time' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-blue-400" />
                      <h3 className="text-lg font-medium text-white">Lead Time Médio</h3>
                    </div>
                    <p className="text-slate-300 text-sm">Tempo total desde o momento em que a atividade foi criada até a sua conclusão. Mede o tempo de resposta do time como um todo.</p>
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 mt-4">
                      <h4 className="text-white font-medium mb-3">Exemplos de Tarefas Concluídas</h4>
                      <div className="space-y-2">
                        {activityMetrics.sampleTasks.map(t => (
                          <div key={t.id} className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                            <span className="text-slate-300">{t.title}</span>
                            <Badge className="bg-slate-800 text-slate-400 border-none font-normal">{t.assignee || 'Sem responsável'}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {selectedKPI === 'cycle_time' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-5 h-5 text-purple-400" />
                      <h3 className="text-lg font-medium text-white">Cycle Time Médio</h3>
                    </div>
                    <p className="text-slate-300 text-sm">Tempo desde a data de início da atividade até a data de conclusão. Mede o tempo de execução (mão na massa).</p>
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 mt-4">
                      <h4 className="text-white font-medium mb-3">Dica</h4>
                      <p className="text-slate-400 text-sm">Um Cycle Time baixo e Lead Time alto indica que o tempo de espera no backlog está muito grande.</p>
                    </div>
                  </div>
                )}
                {selectedKPI === 'velocidade_time' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-green-400" />
                      <h3 className="text-lg font-medium text-white">Velocidade Média</h3>
                    </div>
                    <p className="text-slate-300 text-sm">Média de tarefas concluídas por semana, considerando as semanas ativas. Ajuda a planejar os próximos Sprints.</p>
                  </div>
                )}
                {selectedKPI === 'throughput' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckSquare className="w-5 h-5 text-orange-400" />
                      <h3 className="text-lg font-medium text-white">Throughput</h3>
                    </div>
                    <p className="text-slate-300 text-sm">A quantidade absoluta de tarefas que foram dadas como concluídas dentro da(s) vertical(is) selecionada(s).</p>
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 mt-4">
                      <p className="text-2xl font-bold text-white mb-1">{activityMetrics.throughput}</p>
                      <p className="text-xs text-slate-500">Tarefas entregues até o momento.</p>
                    </div>
                  </div>
                )}
                {selectedKPI === 'produtividade' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-5 h-5 text-cyan-400" />
                      <h3 className="text-lg font-medium text-white">Produtividade por Analista</h3>
                    </div>
                    <p className="text-slate-300 text-sm">Quantidade de tarefas concluídas por cada analista.</p>
                    <div className="space-y-2 mt-4">
                      {activityMetrics.analystProductivity.length > 0 ? (
                        activityMetrics.analystProductivity.map((a, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                            <span className="text-white font-medium text-sm">{a.name}</span>
                            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">{a.count} tarefas</Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-500">Nenhuma tarefa concluída com responsável atribuído.</p>
                      )}
                    </div>
                  </div>
                )}
                {selectedKPI === 'analistas' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-yellow-400" />
                      <h3 className="text-lg font-medium text-white">Contador de Analistas</h3>
                    </div>
                    <p className="text-slate-300 text-sm">Quantidade total de analistas vinculados às tarefas do filtro atual.</p>
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 mt-4">
                      <p className="text-2xl font-bold text-white mb-1">{activityMetrics.analystsCount}</p>
                      <p className="text-xs text-slate-500">Pessoas diferentes com tarefas atribuídas.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Burndown */}
            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Burndown de Tarefas</CardTitle>
              </CardHeader>
              <CardContent>
                {activityMetrics.burndownData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={activityMetrics.burndownData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="restantes" name="Tarefas Restantes" stroke="#3b82f6" strokeWidth={3} dot={false} />
                      <Line type="monotone" dataKey="ideal" name="Tendência Ideal" stroke="#94a3b8" strokeDasharray="5 5" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-slate-500">
                    Sem dados para o Burndown
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Velocity */}
            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Velocidade do Time</CardTitle>
              </CardHeader>
              <CardContent>
                {activityMetrics.velocityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={activityMetrics.velocityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="week" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Bar dataKey="concluidas" name="Tarefas Concluídas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-slate-500">
                    Sem dados de velocidade
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Pessoas por Etapa List */}
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Pessoas por Etapa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {activityMetrics.pessoasPorEtapa.length > 0 ? (
                  activityMetrics.pessoasPorEtapa.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                      <span className="text-white font-medium text-sm">{phaseLabels[p.phase] || p.phase}</span>
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">{p.count} pessoa(s)</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-sm">Nenhuma etapa com analistas atribuídos.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}