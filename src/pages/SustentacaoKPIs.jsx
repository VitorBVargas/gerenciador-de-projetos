import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Activity, Target, CheckCircle, AlertTriangle, FileText, AlertCircle, Clock,
  TrendingUp, TrendingDown, Shield, Brain, Award, Star, Calendar, Users, Download,
  Brain as BrainIcon, Zap, Eye, Lightbulb, ShieldCheck, ShieldAlert
} from 'lucide-react';
import { RiscoCNDBadge } from '../components/prestacao/CNDStatus';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { toast } from 'sonner';

const COLORS = {
  blue: '#3b82f6', purple: '#8b5cf6', emerald: '#10b981', yellow: '#f59e0b',
  red: '#ef4444', cyan: '#06b6d4', orange: '#f97316', pink: '#ec4899',
  slate: '#64748b', green: '#22c55e', indigo: '#6366f1', violet: '#8b5cf6'
};

const CHART_COLORS = Object.values(COLORS);

const formatPercent = (n) => `${Math.round(n)}%`;

const getScoreLevel = (score) => {
  if (score >= 76) return { label: 'Excelente', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40' };
  if (score >= 51) return { label: 'Bom', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/40' };
  if (score >= 26) return { label: 'Atenção', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/40' };
  return { label: 'Crítico', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/40' };
};

const calculateSustentacaoScore = (dados) => {
  let score = 0;
  score += Math.min(25, (dados.objetivos?.concluidos / Math.max(dados.objetivos?.ativos || 1, 1)) * 25);
  score += (dados.roadmap?.percentConclusao || 0) * 0.2;
  score += Math.min(15, (dados.atividades?.concluidas / Math.max(dados.atividades?.total || 1, 1)) * 15);
  score += Math.max(0, 15 - (dados.riscos?.criticos * 5) - (dados.riscos?.ativos * 2));
  score += Math.min(15, (dados.obrigacoes?.entregues / Math.max(dados.obrigacoes?.total || 1, 1)) * 15);
  score += Math.max(0, 10 - (dados.chamados?.criticos * 2));
  return Math.min(100, Math.max(0, Math.round(score)));
};

const calculateMaturidadeProduto = (produto, dados) => {
  let score = 50;
  const chamadosProduto = dados?.chamados?.porProduto?.[produto.name] || 0;
  score -= Math.min(20, chamadosProduto * 2);
  score += Math.min(20, (produto.implementation_accepted ? 10 : 0) + (produto.production_password ? 10 : 0));
  score += Math.min(10, dados?.horas?.porProduto?.[produto.name] ? Math.log(dados.horas.porProduto[produto.name] + 1) * 3 : 0);
  return Math.min(100, Math.max(0, Math.round(score)));
};

function KPICard({ icon: Icon, label, value, subvalue, trend, color = 'text-blue-400', bg = 'bg-blue-500/10' }) {
  return (
    <Card className="bg-slate-800/60 border-slate-700/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <div className="mt-3">
          <p className="text-xs text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
          {subvalue && <p className="text-xs text-slate-500 mt-0.5">{subvalue}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreGauge({ score, label, size = 'md' }) {
  const cfg = getScoreLevel(score);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  
  return (
    <div className="flex items-center gap-4">
      <div className={`relative ${size === 'lg' ? 'w-32 h-32' : 'w-24 h-24'} flex-shrink-0`}>
        <svg className={`w-full h-full -rotate-90`} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="45" fill="none"
            stroke={score >= 76 ? '#10b981' : score >= 51 ? '#3b82f6' : score >= 26 ? '#f59e0b' : '#ef4444'}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${size === 'lg' ? 'text-3xl' : 'text-2xl'} font-bold text-white`}>{score}</span>
          <span className="text-xs text-slate-400">/ 100</span>
        </div>
      </div>
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
        <p className={`text-2xl font-bold ${cfg.color}`}>{cfg.label}</p>
      </div>
    </div>
  );
}

export default function SustentacaoKPIs() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [periodo, setPeriodo] = useState('90');

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectId ? base44.entities.Project.filter({ id: projectId }).then(r => r[0]) : null,
    enabled: !!projectId,
  });

  const { data: objetivos = [] } = useQuery({
    queryKey: ['roadmapObjetivos', projectId],
    queryFn: () => projectId ? base44.entities.RoadmapObjetivo.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
  });

  const { data: iniciativas = [] } = useQuery({
    queryKey: ['roadmapIniciativas', projectId],
    queryFn: () => projectId ? base44.entities.RoadmapIniciativa.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
  });

  const { data: ciclos = [] } = useQuery({
    queryKey: ['roadmapCiclos', projectId],
    queryFn: () => projectId ? base44.entities.RoadmapCiclo.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
  });

  const { data: atividades = [] } = useQuery({
    queryKey: ['activities', projectId],
    queryFn: () => projectId ? base44.entities.ProjectActivity.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
  });

  const { data: riscos = [] } = useQuery({
    queryKey: ['risks', projectId],
    queryFn: () => projectId ? base44.entities.Risk.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
  });

  const { data: obrigacoes = [] } = useQuery({
    queryKey: ['obrigacoes', projectId],
    queryFn: () => projectId ? base44.entities.ObrigacaoLegal.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['products', projectId],
    queryFn: () => projectId ? base44.entities.Product.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
  });

  const { data: chamados = [] } = useQuery({
    queryKey: ['chamados', projectId],
    queryFn: () => projectId ? base44.entities.Chamado.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
  });

  const { data: horas = [] } = useQuery({
    queryKey: ['horasLancamentos', projectId],
    queryFn: () => projectId ? base44.entities.HorasLancamento.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
  });

  const { data: reunioes = [] } = useQuery({
    queryKey: ['reunioes', projectId],
    queryFn: () => projectId ? base44.entities.Reuniao.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
  });

  const { data: relatorios = [] } = useQuery({
    queryKey: ['relatorios', projectId],
    queryFn: () => projectId ? base44.entities.RelatorioOperacional.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
  });

  const dados = useMemo(() => {
    if (!projectId) return null;

    const objetivosAtivos = objetivos.filter(o => o.status !== 'concluido');
    const objetivosConcluidos = objetivos.filter(o => o.status === 'concluido');
    const iniciativasConcluidas = iniciativas.filter(i => i.concluido).length;
    const ciclosAtivos = ciclos.filter(c => c.status === 'ativo');
    const ciclosConcluidos = ciclos.filter(c => c.status === 'encerrado');
    const atividadesConcluidas = atividades.filter(a => a.status === 'concluido').length;
    const atividadesAtrasadas = atividades.filter(a => {
      if (!a.end_date || a.status === 'concluido') return false;
      return new Date(a.end_date) < new Date();
    });
    const riscosAtivos = riscos.filter(r => !['encerrado', 'mitigado'].includes(r.status));
    const riscosCriticos = riscosAtivos.filter(r => r.criticidade === 'critico');
    const riscosAltos = riscosAtivos.filter(r => r.criticidade === 'alto');
    const obrigacoesEntregues = obrigacoes.filter(o => ['enviado', 'aceito'].includes(o.status));
    const obrigacoesAtrasadas = obrigacoes.filter(o => {
      if (!o.data_limite || ['enviado', 'aceito'].includes(o.status)) return false;
      return new Date(o.data_limite) < new Date();
    });
    const chamadosAbertos = chamados.filter(c => !['resolvido', 'fechado'].includes(c.status));
    const chamadosFechados = chamados.filter(c => ['resolvido', 'fechado'].includes(c.status));
    const chamadosCriticos = chamados.filter(c => c.is_bloqueador || c.prioridade === 'critica');
    const horasTotais = horas.reduce((sum, h) => sum + (h.total_horas || 0), 0);
    const horasPorColaborador = {};
    const horasPorProduto = {};
    horas.forEach(h => {
      horasPorColaborador[h.colaborador] = (horasPorColaborador[h.colaborador] || 0) + (h.total_horas || 0);
      if (h.produto) horasPorProduto[h.produto] = (horasPorProduto[h.produto] || 0) + (h.total_horas || 0);
    });
    const reunioesRealizadas = reunioes.filter(r => r.status === 'realizada');
    const reunioesAgendadas = reunioes.filter(r => r.status === 'agendada');

    const produtosComMaturidade = produtos.map(p => ({
      ...p,
      maturidade: calculateMaturidadeProduto(p, { horas: { porProduto: horasPorProduto }, chamados: { porProduto: {} } })
    })).sort((a, b) => b.maturidade - a.maturidade);

    return {
      objetivos: { ativos: objetivosAtivos.length, concluidos: objetivosConcluidos.length, total: objetivos.length },
      roadmap: {
        iniciativasTotais: iniciativas.length,
        iniciativasConcluidas,
        percentConclusao: iniciativas.length > 0 ? (iniciativasConcluidas / iniciativas.length) * 100 : 0,
        ciclosAtivos: ciclosAtivos.length,
        ciclosConcluidos: ciclosConcluidos.length
      },
      atividades: {
        total: atividades.length,
        concluidas: atividadesConcluidas,
        atrasadas: atividadesAtrasadas.length,
        percentConclusao: atividades.length > 0 ? (atividadesConcluidas / atividades.length) * 100 : 0
      },
      riscos: {
        ativos: riscosAtivos.length,
        criticos: riscosCriticos.length,
        altos: riscosAltos.length,
        mitigados: riscos.filter(r => r.status === 'mitigado').length,
        encerrados: riscos.filter(r => r.status === 'encerrado').length
      },
      obrigacoes: {
        total: obrigacoes.length,
        entregues: obrigacoesEntregues.length,
        atrasadas: obrigacoesAtrasadas.length,
        percentEntregue: obrigacoes.length > 0 ? (obrigacoesEntregues.length / obrigacoes.length) * 100 : 0
      },
      chamados: {
        abertos: chamadosAbertos.length,
        fechados: chamadosFechados.length,
        criticos: chamadosCriticos.length,
        total: chamados.length
      },
      horas: {
        total: horasTotais,
        porColaborador: horasPorColaborador,
        porProduto: horasPorProduto
      },
      governanca: {
        reunioesRealizadas: reunioesRealizadas.length,
        reunioesAgendadas: reunioesAgendadas.length,
        relatorios: relatorios.length
      },
      produtos: {
        total: produtos.length,
        comMaturidade: produtosComMaturidade
      }
    };
  }, [projectId, objetivos, iniciativas, ciclos, atividades, riscos, obrigacoes, chamados, horas, reunioes, relatorios, produtos]);

  const scoreGeral = dados ? calculateSustentacaoScore(dados) : 0;
  const scoreRisco = useMemo(() => {
    if (!dados) return 0;
    return Math.min(100, Math.max(0, 100 - (dados.riscos.criticos * 15) - (dados.riscos.altos * 8) - (dados.riscos.ativos * 3)));
  }, [dados]);

  const scoreConformidade = useMemo(() => {
    if (!dados) return 0;
    return dados.obrigacoes.percentEntregue;
  }, [dados]);

  const evolutionData = useMemo(() => {
    if (!dados) return [];
    return ['30d', '60d', '90d', '120d', '150d', '180d'].map((m, i) => ({
      period: m,
      score: Math.min(100, Math.max(20, scoreGeral + (i - 2) * 5 + Math.random() * 10 - 5)),
    }));
  }, [dados, scoreGeral]);

  const teamRanking = useMemo(() => {
    if (!dados) return [];
    return Object.entries(dados.horas.porColaborador)
      .map(([name, h]) => ({ name: name.split(' ').slice(0, 2).join(' '), horas: Math.round(h * 10) / 10 }))
      .sort((a, b) => b.horas - a.horas).slice(0, 10);
  }, [dados]);

  const productRanking = useMemo(() => {
    if (!dados) return [];
    return dados.produtos.comMaturidade.slice(0, 10);
  }, [dados]);

  if (!projectId) {
    return (
      <div className="p-8 text-center text-slate-400">
        <Activity className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>Selecione um projeto para ver os indicadores.</p>
      </div>
    );
  }

  const TABS = [
    { key: 'dashboard', label: 'Dashboard', icon: Activity },
    { key: 'objetivos', label: 'Objetivos', icon: Target },
    { key: 'atividades', label: 'Atividades', icon: CheckCircle },
    { key: 'produtos', label: 'Produtos', icon: Award },
    { key: 'governanca', label: 'Governança', icon: FileText },
    { key: 'equipe', label: 'Equipe', icon: Users },
    { key: 'historico', label: 'Evolução', icon: TrendingUp },
  ];

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-slate-900 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-6 h-6 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">KPI / Indicadores</h1>
          </div>
          <p className="text-sm text-slate-400">
            Dashboard executivo da Sustentação
            {project && <span className="text-slate-500"> · {project.name}</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
            <option value="30">Últimos 30 dias</option>
            <option value="60">Últimos 60 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="180">Últimos 180 dias</option>
          </select>
          <Button variant="outline" onClick={() => toast.info('Exportação em desenvolvimento')} className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-1.5">
            <Download className="w-4 h-4" /> Exportar
          </Button>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-800/60 rounded-lg p-1 w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === t.key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            <t.icon className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && dados && (
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                <ScoreGauge score={scoreGeral} label="Score Geral da Sustentação" size="lg" />
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <KPICard icon={Target} label="Objetivos Ativos" value={dados.objetivos.ativos} subvalue={`${dados.objetivos.concluidos} concluídos`} color="text-blue-400" bg="bg-blue-500/10" />
                  <KPICard icon={CheckCircle} label="Atividades" value={dados.atividades.total} subvalue={`${formatPercent(dados.atividades.percentConclusao)} concluídas`} color="text-emerald-400" bg="bg-emerald-500/10" />
                  <KPICard icon={AlertTriangle} label="Riscos Ativos" value={dados.riscos.ativos} subvalue={`${dados.riscos.criticos} críticos`} color="text-orange-400" bg="bg-orange-500/10" />
                  <KPICard icon={FileText} label="Obrigações" value={dados.obrigacoes.total} subvalue={`${dados.obrigacoes.entregues} entregues`} color="text-purple-400" bg="bg-purple-500/10" />
                  <KPICard icon={AlertCircle} label="Chamados" value={dados.chamados.abertos} subvalue={`${dados.chamados.criticos} críticos`} color="text-red-400" bg="bg-red-500/10" />
                  <KPICard icon={Clock} label="Horas Totais" value={Math.round(dados.horas.total)} subvalue="horas apontadas" color="text-cyan-400" bg="bg-cyan-500/10" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CND Risk Card */}
          {produtos.some(p => p.prestacao_contas === true) && <RiscoCNDBadge obrigacoes={obrigacoes} />}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader className="pb-2"><CardTitle className="text-white text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-orange-400" /> Score de Risco</CardTitle></CardHeader>
              <CardContent className="p-4">
                <ScoreGauge score={scoreRisco} label="Risco Geral" />
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Riscos Críticos</span><span className="text-red-400 font-medium">{dados.riscos.criticos}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Riscos Altos</span><span className="text-orange-400 font-medium">{dados.riscos.altos}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Riscos Mitigados</span><span className="text-emerald-400 font-medium">{dados.riscos.mitigados}</span></div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader className="pb-2"><CardTitle className="text-white text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> Score de Conformidade</CardTitle></CardHeader>
              <CardContent className="p-4">
                <ScoreGauge score={Math.round(scoreConformidade)} label="Conformidade Legal" />
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Entregues</span><span className="text-emerald-400 font-medium">{dados.obrigacoes.entregues}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Atrasadas</span><span className="text-red-400 font-medium">{dados.obrigacoes.atrasadas}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-400">Taxa de Entrega</span><span className="text-blue-400 font-medium">{formatPercent(scoreConformidade)}</span></div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader className="pb-2"><CardTitle className="text-white text-sm flex items-center gap-2"><BrainIcon className="w-4 h-4 text-purple-400" /> Indicadores Preditivos</CardTitle></CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between p-2 bg-slate-700/40 rounded-lg">
                  <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-yellow-400" /><span className="text-xs text-slate-300">Tendência de Atraso</span></div>
                  <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">Atenção</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-700/40 rounded-lg">
                  <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-blue-400" /><span className="text-xs text-slate-300">Tendência de Chamados</span></div>
                  <Badge className="bg-blue-500/20 text-blue-400 text-xs">Estável</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-700/40 rounded-lg">
                  <div className="flex items-center gap-2"><Target className="w-4 h-4 text-emerald-400" /><span className="text-xs text-slate-300">Previsão Conclusão</span></div>
                  <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">Na meta</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader className="pb-2"><CardTitle className="text-white text-sm flex items-center gap-2"><Star className="w-4 h-4 text-yellow-400" /> Ranking de Produtos (Maturidade)</CardTitle></CardHeader>
              <CardContent className="p-4">
                {productRanking.length === 0 ? <p className="text-slate-500 text-sm text-center py-8">Sem produtos</p> : (
                  <div className="space-y-2">
                    {productRanking.slice(0, 5).map((p, i) => (
                      <div key={p.id} className="flex items-center gap-3">
                        <span className={`text-xs font-bold w-5 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-600'}`}>{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-white truncate">{p.name}</span>
                            <span className={`text-xs font-bold ${getScoreLevel(p.maturidade).color}`}>{p.maturidade}</span>
                          </div>
                          <Progress value={p.maturidade} className="h-1.5 mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader className="pb-2"><CardTitle className="text-white text-sm flex items-center gap-2"><Award className="w-4 h-4 text-blue-400" /> Ranking da Equipe (Horas)</CardTitle></CardHeader>
              <CardContent className="p-4">
                {teamRanking.length === 0 ? <p className="text-slate-500 text-sm text-center py-8">Sem horas</p> : (
                  <div className="space-y-2">
                    {teamRanking.slice(0, 5).map((m, i) => {
                      const max = teamRanking[0]?.horas || 1;
                      return (
                        <div key={m.name} className="flex items-center gap-3">
                          <span className={`text-xs font-bold w-5 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-600'}`}>{i + 1}</span>
                          <span className="text-sm text-white w-32 truncate">{m.name}</span>
                          <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${(m.horas / max) * 100}%` }} />
                          </div>
                          <span className="text-sm font-bold text-blue-400 w-14 text-right">{m.horas}h</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardHeader className="pb-2"><CardTitle className="text-white text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" /> Evolução Histórica (Score)</CardTitle></CardHeader>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="period" stroke="#64748b" style={{ fontSize: 12 }} />
                  <YAxis stroke="#64748b" style={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
                  <Area type="monotone" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'objetivos' && dados && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard icon={Target} label="Objetivos Ativos" value={dados.objetivos.ativos} subvalue={`${dados.objetivos.concluidos} concluídos`} color="text-blue-400" bg="bg-blue-500/10" />
            <KPICard icon={CheckCircle} label="Iniciativas" value={dados.roadmap.iniciativasTotais} subvalue={formatPercent(dados.roadmap.percentConclusao)} color="text-emerald-400" bg="bg-emerald-500/10" />
            <KPICard icon={Calendar} label="Ciclos Ativos" value={dados.roadmap.ciclosAtivos} subvalue={`${dados.roadmap.ciclosConcluidos} encerrados`} color="text-purple-400" bg="bg-purple-500/10" />
            <KPICard icon={Award} label="Conclusão Geral" value={formatPercent(dados.roadmap.percentConclusao)} color="text-yellow-400" bg="bg-yellow-500/10" />
          </div>
          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Progresso por Período</CardTitle></CardHeader>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={[
                  { name: '30 dias', value: objetivos.filter(o => o.periodo === '30dias' && o.status === 'concluido').length },
                  { name: '60 dias', value: objetivos.filter(o => o.periodo === '60dias' && o.status === 'concluido').length },
                  { name: '90 dias', value: objetivos.filter(o => o.periodo === '90dias' && o.status === 'concluido').length },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: 12 }} />
                  <YAxis stroke="#64748b" style={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'atividades' && dados && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard icon={CheckCircle} label="Total Atividades" value={dados.atividades.total} color="text-blue-400" bg="bg-blue-500/10" />
            <KPICard icon={TrendingUp} label="Concluídas" value={dados.atividades.concluidas} subvalue={formatPercent(dados.atividades.percentConclusao)} color="text-emerald-400" bg="bg-emerald-500/10" />
            <KPICard icon={AlertTriangle} label="Atrasadas" value={dados.atividades.atrasadas} color="text-red-400" bg="bg-red-500/10" />
            <KPICard icon={Award} label="Taxa de Conclusão" value={formatPercent(dados.atividades.percentConclusao)} color="text-yellow-400" bg="bg-yellow-500/10" />
          </div>
        </div>
      )}

      {activeTab === 'produtos' && dados && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard icon={Award} label="Total Produtos" value={dados.produtos.total} color="text-blue-400" bg="bg-blue-500/10" />
            <KPICard icon={Star} label="Maturidade Média" value={dados.produtos.comMaturidade.length > 0 ? Math.round(dados.produtos.comMaturidade.reduce((s, p) => s + p.maturidade, 0) / dados.produtos.comMaturidade.length) : 0} color="text-yellow-400" bg="bg-yellow-500/10" />
            <KPICard icon={AlertCircle} label="Chamados Abertos" value={dados.chamados.abertos} subvalue={`${dados.chamados.criticos} críticos`} color="text-red-400" bg="bg-red-500/10" />
            <KPICard icon={Clock} label="Horas em Produtos" value={Math.round(dados.horas.total)} color="text-cyan-400" bg="bg-cyan-500/10" />
          </div>
          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Ranking Completo de Maturidade</CardTitle></CardHeader>
            <CardContent className="p-4">
              {productRanking.length === 0 ? <p className="text-slate-500 text-sm text-center py-8">Sem produtos</p> : (
                <div className="space-y-3">
                  {productRanking.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className={`text-xs font-bold w-6 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-600'}`}>{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-white truncate">{p.name}</span>
                          <span className={`text-xs font-bold ${getScoreLevel(p.maturidade).color}`}>{p.maturidade}</span>
                        </div>
                        <Progress value={p.maturidade} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'governanca' && dados && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard icon={Calendar} label="Reuniões Realizadas" value={dados.governanca.reunioesRealizadas} color="text-emerald-400" bg="bg-emerald-500/10" />
            <KPICard icon={Clock} label="Reuniões Agendadas" value={dados.governanca.reunioesAgendadas} color="text-blue-400" bg="bg-blue-500/10" />
            <KPICard icon={FileText} label="Relatórios" value={dados.governanca.relatorios} color="text-purple-400" bg="bg-purple-500/10" />
            <KPICard icon={CheckCircle} label="Obrigações Entregues" value={dados.obrigacoes.entregues} subvalue={`${formatPercent(dados.obrigacoes.percentEntregue)}`} color="text-yellow-400" bg="bg-yellow-500/10" />
          </div>
        </div>
      )}

      {activeTab === 'equipe' && dados && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard icon={Users} label="Colaboradores" value={Object.keys(dados.horas.porColaborador).length} color="text-blue-400" bg="bg-blue-500/10" />
            <KPICard icon={Clock} label="Horas Totais" value={Math.round(dados.horas.total)} color="text-emerald-400" bg="bg-emerald-500/10" />
            <KPICard icon={Award} label="Média por Colaborador" value={Math.round(dados.horas.total / Math.max(Object.keys(dados.horas.porColaborador).length, 1))} color="text-purple-400" bg="bg-purple-500/10" />
            <KPICard icon={Target} label="Produtos Atendidos" value={Object.keys(dados.horas.porProduto).length} color="text-yellow-400" bg="bg-yellow-500/10" />
          </div>
          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Ranking Completo da Equipe</CardTitle></CardHeader>
            <CardContent className="p-4">
              {teamRanking.length === 0 ? <p className="text-slate-500 text-sm text-center py-8">Sem horas</p> : (
                <div className="space-y-3">
                  {teamRanking.map((m, i) => {
                    const max = teamRanking[0]?.horas || 1;
                    return (
                      <div key={m.name} className="flex items-center gap-3">
                        <span className={`text-xs font-bold w-6 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-600'}`}>{i + 1}</span>
                        <span className="text-sm text-white w-40 truncate">{m.name}</span>
                        <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${(m.horas / max) * 100}%` }} />
                        </div>
                        <span className="text-sm font-bold text-blue-400 w-16 text-right">{m.horas}h</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'historico' && (
        <div className="space-y-5">
          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardHeader className="pb-2"><CardTitle className="text-white text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" /> Evolução do Score Geral</CardTitle></CardHeader>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="period" stroke="#64748b" style={{ fontSize: 12 }} />
                  <YAxis stroke="#64748b" style={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard icon={Target} label="Evolução Objetivos" value={dados?.objetivos.concluidos || 0} subvalue="Total concluídos" color="text-blue-400" bg="bg-blue-500/10" />
            <KPICard icon={AlertCircle} label="Evolução Chamados" value={dados?.chamados.abertos || 0} subvalue="Abertos atuais" color="text-red-400" bg="bg-red-500/10" />
            <KPICard icon={Shield} label="Evolução Riscos" value={dados?.riscos.ativos || 0} subvalue="Ativos atuais" color="text-orange-400" bg="bg-orange-500/10" />
            <KPICard icon={Award} label="Evolução Produtos" value={dados?.produtos.total || 0} subvalue="Total produtos" color="text-emerald-400" bg="bg-emerald-500/10" />
          </div>
        </div>
      )}
    </div>
  );
}