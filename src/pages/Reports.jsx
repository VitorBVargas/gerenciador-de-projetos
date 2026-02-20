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
  Activity
} from 'lucide-react';
import { cn } from "@/lib/utils";
import KPICard from '../components/reports/KPICard';
import ExportButton from '../components/reports/ExportButton';
import EmptyState from '../components/ui/EmptyState';
import EntityFilter from '../components/filters/EntityFilter';

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
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedEntity, setSelectedEntity] = useState('PM');
  
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

  const activeProject = projects.find(p => p.id === projectId);

  const allEntities = [...new Set(products.map(p => p.entity).filter(Boolean))].sort();
  const filteredProducts = selectedEntity ? products.filter(p => p.entity === selectedEntity) : products;
  const filteredHomologationTasks = homologationTasks.filter(t => filteredProducts.some(p => p.id === t.product_id));
  const filteredMigrationTasks = migrationTasks.filter(t => filteredProducts.some(p => p.id === t.product_id));

  // Calculate KPIs
  const kpis = useMemo(() => {
    const allTasks = [...filteredHomologationTasks, ...filteredMigrationTasks];
    const completedTasks = allTasks.filter(t => t.completed).length;
    const totalTasks = allTasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const completedTimeline = timelineEvents.filter(e => e.status === 'concluido').length;
    const totalTimeline = timelineEvents.length;
    const timelineProgress = totalTimeline > 0 ? Math.round((completedTimeline / totalTimeline) * 100) : 0;

    const highRisks = risks.filter(r => 
      (r.probability === 'alta' || r.impact === 'alto') && 
      r.status !== 'mitigado'
    ).length;

    const productsInProduction = filteredProducts.filter(p => p.status === 'em_producao').length;
    const totalProducts = filteredProducts.length;
    const productionRate = totalProducts > 0 ? Math.round((productsInProduction / totalProducts) * 100) : 0;

    // Calculate average time per phase (mock calculation based on timeline)
    const completedPhases = timelineEvents.filter(e => e.status === 'concluido' && e.start_date && e.end_date);
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

    return {
      completionRate,
      timelineProgress,
      highRisks,
      productionRate,
      avgDaysPerPhase,
      totalTasks,
      completedTasks,
      totalProducts,
      productsInProduction
    };
  }, [filteredHomologationTasks, filteredMigrationTasks, timelineEvents, risks, filteredProducts]);

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

  // Prepare export data
  const exportData = {
    kpis: [
      { title: 'Taxa de Conclusão', value: `${kpis.completionRate}%`, trend: null },
      { title: 'Progresso Timeline', value: `${kpis.timelineProgress}%`, trend: null },
      { title: 'Produtos em Produção', value: `${kpis.productsInProduction}/${kpis.totalProducts}`, trend: null },
      { title: 'Riscos Altos', value: kpis.highRisks, trend: null },
      { title: 'Tempo Médio/Fase', value: `${kpis.avgDaysPerPhase} dias`, trend: null }
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

      {allEntities.length > 0 && (
        <EntityFilter entities={allEntities} selectedEntity={selectedEntity} onEntityChange={setSelectedEntity} />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Taxa de Conclusão"
          value={`${kpis.completionRate}%`}
          subtitle={`${kpis.completedTasks}/${kpis.totalTasks} tarefas`}
          icon={CheckCircle2}
          color="green"
        />
        <KPICard
          title="Progresso Timeline"
          value={`${kpis.timelineProgress}%`}
          subtitle={`${timelineEvents.filter(e => e.status === 'concluido').length}/${timelineEvents.length} etapas`}
          icon={Calendar}
          color="blue"
        />
        <KPICard
          title="Produtos em Produção"
          value={`${kpis.productionRate}%`}
          subtitle={`${kpis.productsInProduction}/${kpis.totalProducts} produtos`}
          icon={Package}
          color="purple"
        />
        <KPICard
          title="Riscos Altos"
          value={kpis.highRisks}
          subtitle="Não mitigados"
          icon={AlertTriangle}
          color="red"
        />
        <KPICard
          title="Tempo Médio/Fase"
          value={`${kpis.avgDaysPerPhase}d`}
          subtitle="Fases concluídas"
          icon={Clock}
          color="yellow"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600">Visão Geral</TabsTrigger>
          <TabsTrigger value="verticals" className="data-[state=active]:bg-blue-600">Por Vertical</TabsTrigger>
          <TabsTrigger value="products" className="data-[state=active]:bg-blue-600">Por Produto</TabsTrigger>
          <TabsTrigger value="bottlenecks" className="data-[state=active]:bg-blue-600">Gargalos</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Progress Distribution */}
            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Distribuição de Progresso</CardTitle>
              </CardHeader>
              <CardContent>
                {verticalProgress.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={verticalProgress}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="percentage"
                      >
                        {verticalProgress.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                        labelStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-slate-500">
                    Sem dados disponíveis
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Task Completion Trend */}
            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Status dos Produtos</CardTitle>
              </CardHeader>
              <CardContent>
                {products.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={productProgress.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#94a3b8"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="progress" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-slate-500">
                    Sem produtos cadastrados
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Verticals Tab */}
        <TabsContent value="verticals" className="mt-6">
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white">Progresso Detalhado por Vertical</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {verticalProgress.length > 0 ? (
                  verticalProgress.map((vertical, index) => (
                    <div key={vertical.vertical} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-white font-medium">{vertical.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-slate-400">
                            {vertical.completed}/{vertical.total} tarefas
                          </span>
                          <span className="text-white font-semibold min-w-[50px] text-right">
                            {vertical.percentage}%
                          </span>
                        </div>
                      </div>
                      <Progress value={vertical.percentage} className="h-2" />
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-center py-8">Nenhuma vertical com tarefas</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="mt-6">
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white">Progresso por Produto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {productProgress.length > 0 ? (
                  productProgress.map((product) => (
                    <div key={product.id} className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-white font-medium">{product.name}</h4>
                          <p className="text-sm text-slate-400">{product.vertical}</p>
                        </div>
                        <Badge className={cn(
                          "border",
                          product.status === 'Em Produção' ? "bg-green-500/20 text-green-400 border-green-500/30" :
                          product.status === 'Homologado' ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                          product.status === 'Em Homologação' ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                          "bg-slate-500/20 text-slate-400 border-slate-500/30"
                        )}>
                          {product.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={product.progress} className="h-2 flex-1" />
                        <span className="text-white font-semibold min-w-[50px] text-right">
                          {product.progress}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {product.completed}/{product.total} tarefas concluídas
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-center py-8">Nenhum produto cadastrado</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bottlenecks Tab */}
        <TabsContent value="bottlenecks" className="mt-6">
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Gargalos Identificados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bottlenecks.length > 0 ? (
                  bottlenecks.map((bottleneck, index) => (
                    <div 
                      key={index}
                      className={cn(
                        "p-4 rounded-lg border",
                        bottleneck.severity === 'high' 
                          ? "bg-red-500/10 border-red-500/30"
                          : "bg-yellow-500/10 border-yellow-500/30"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={cn(
                            "w-4 h-4",
                            bottleneck.severity === 'high' ? "text-red-400" : "text-yellow-400"
                          )} />
                          <h4 className="text-white font-medium">{bottleneck.area}</h4>
                        </div>
                        <Badge className={cn(
                          "border",
                          bottleneck.severity === 'high'
                            ? "bg-red-500/20 text-red-400 border-red-500/30"
                            : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        )}>
                          Impacto: {bottleneck.impact}
                        </Badge>
                      </div>
                      <p className="text-slate-300 text-sm">{bottleneck.description}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                    <p className="text-green-400 font-medium">Nenhum gargalo identificado</p>
                    <p className="text-slate-500 text-sm mt-1">O projeto está fluindo bem!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}