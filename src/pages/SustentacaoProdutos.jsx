import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Package, AlertTriangle, Plus, Upload, Search, Filter,
  CheckCircle2, Clock, TrendingUp, Activity, Zap, Edit, Trash2, BarChart3, FileDown
} from 'lucide-react';
import { generateChamadosPdf } from '@/components/sustentacao/chamadosPdfGenerator';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, parseISO, differenceInDays, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ChamadoModal from '@/components/sustentacao/ChamadoModal';
import ChamadoImporter from '@/components/sustentacao/ChamadoImporter';
import ChamadoExternoImporter from '@/components/sustentacao/ChamadoExternoImporter';
import ProdutoSustentacaoModal from '@/components/sustentacao/ProdutoSustentacaoModal';
import MultiSelectFilter from '@/components/sustentacao/MultiSelectFilter';

// ─── Constants ───────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  aberto:             { label: 'Aberto',             color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  em_andamento:       { label: 'Em andamento',        color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  aguardando_cliente: { label: 'Aguardando cliente',  color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  resolvido:          { label: 'Resolvido',           color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  fechado:            { label: 'Fechado',             color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
};

const PRIO_CONFIG = {
  baixa:   { label: 'Baixa',   color: 'bg-slate-500/20 text-slate-400',    dot: 'bg-slate-400' },
  media:   { label: 'Média',   color: 'bg-blue-500/20 text-blue-300',      dot: 'bg-blue-400' },
  alta:    { label: 'Alta',    color: 'bg-orange-500/20 text-orange-300',  dot: 'bg-orange-400' },
  critica: { label: 'Crítica', color: 'bg-red-500/20 text-red-300',        dot: 'bg-red-400' },
};

const PIE_COLORS = ['#3b82f6', '#f59e0b', '#a855f7', '#10b981', '#64748b'];

const PRIO_ORDER = { critica: 4, alta: 3, media: 2, baixa: 1 };
const STATUS_ORDER = { aberto: 1, em_andamento: 2, aguardando_cliente: 3, resolvido: 4, fechado: 5 };

const SORT_OPTIONS = [
  { value: 'data_desc',   label: 'Data (mais recente)' },
  { value: 'data_asc',    label: 'Data (mais antiga)' },
  { value: 'numero_asc',  label: 'Número (crescente)' },
  { value: 'numero_desc', label: 'Número (decrescente)' },
  { value: 'prio_desc',   label: 'Criticidade (maior)' },
  { value: 'prio_asc',    label: 'Criticidade (menor)' },
  { value: 'status_asc',  label: 'Status' },
  { value: 'desc_asc',    label: 'Descrição (A–Z)' },
  { value: 'solic_asc',   label: 'Solicitante (A–Z)' },
];

function sortChamados(list, sortBy) {
  const arr = [...list];
  const numVal = c => { const n = parseInt(String(c.numero || '').replace(/\D/g, ''), 10); return isNaN(n) ? 0 : n; };
  const dateVal = c => c.data_abertura || '';
  switch (sortBy) {
    case 'data_asc':    return arr.sort((a, b) => dateVal(a).localeCompare(dateVal(b)));
    case 'data_desc':   return arr.sort((a, b) => dateVal(b).localeCompare(dateVal(a)));
    case 'numero_asc':  return arr.sort((a, b) => numVal(a) - numVal(b));
    case 'numero_desc': return arr.sort((a, b) => numVal(b) - numVal(a));
    case 'prio_desc':   return arr.sort((a, b) => (PRIO_ORDER[b.prioridade] || 0) - (PRIO_ORDER[a.prioridade] || 0));
    case 'prio_asc':    return arr.sort((a, b) => (PRIO_ORDER[a.prioridade] || 0) - (PRIO_ORDER[b.prioridade] || 0));
    case 'status_asc':  return arr.sort((a, b) => (STATUS_ORDER[a.status] || 99) - (STATUS_ORDER[b.status] || 99));
    case 'desc_asc':    return arr.sort((a, b) => (a.descricao || '').localeCompare(b.descricao || ''));
    case 'solic_asc':   return arr.sort((a, b) => (a.responsavel || '').localeCompare(b.responsavel || ''));
    default:            return arr;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.aberto;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>{cfg.label}</span>;
}

function PrioBadge({ prioridade }) {
  const cfg = PRIO_CONFIG[prioridade] || PRIO_CONFIG.media;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function productHealth(chamados, activities) {
  const ativos = chamados.filter(c => !['resolvido', 'fechado'].includes(c.status));
  const criticos = ativos.filter(c => c.prioridade === 'critica' || c.is_bloqueador);
  const atrasadas = activities.filter(a => a.status !== 'concluida' &&
    a.due_date && new Date(a.due_date) < new Date());

  if (criticos.length > 0 || atrasadas.length > 1) return { label: 'Crítico',  color: 'text-red-400',    dot: 'bg-red-400',    score: 0 };
  if (ativos.length >= 3 || atrasadas.length > 0)   return { label: 'Atenção',  color: 'text-yellow-400', dot: 'bg-yellow-400', score: 1 };
  if (ativos.length > 0)                             return { label: 'Monitorar', color: 'text-blue-400',  dot: 'bg-blue-400',   score: 2 };
  return                                                    { label: 'Saudável', color: 'text-emerald-400', dot: 'bg-emerald-400', score: 3 };
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SustentacaoProdutos() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterProduct, setFilterProduct] = useState([]);
  const [filterStatus, setFilterStatus] = useState([]);
  const [filterPriority, setFilterPriority] = useState([]);
  const [filterResponsavel, setFilterResponsavel] = useState([]);
  const [sortBy, setSortBy] = useState('data_desc');
  const [showModal, setShowModal] = useState(false);
  const [modalTipo, setModalTipo] = useState('interno');
  const [showImporter, setShowImporter] = useState(false);
  const [showExternoImporter, setShowExternoImporter] = useState(false);
  const [editChamado, setEditChamado] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');

  const { data: projectList = [] } = useQuery({
    queryKey: ['project-name', projectId],
    queryFn: () => projectId ? base44.entities.Project.filter({ id: projectId }) : [],
    enabled: !!projectId,
  });
  const projectName = projectList[0]?.name || '';

  const { data: products = [] } = useQuery({
    queryKey: ['products', projectId],
    queryFn: () => projectId ? base44.entities.Product.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
  });

  const { data: chamados = [] } = useQuery({
    queryKey: ['chamados', projectId],
    queryFn: () => projectId ? base44.entities.Chamado.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', projectId],
    queryFn: () => projectId ? base44.entities.ProjectActivity.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
  });

  // ── Derived data ──────────────────────────────────────────────────────────
  const productStats = useMemo(() => {
    return products.map(p => {
      const pChamados = chamados.filter(c => c.product_id === p.id);
      const pActivities = activities.filter(a => a.vertical === p.vertical);
      const ativos = pChamados.filter(c => !['resolvido', 'fechado'].includes(c.status));
      const health = productHealth(ativos, pActivities);
      return { ...p, chamados: pChamados, activities: pActivities, ativos, health };
    });
  }, [products, chamados, activities]);

  const responsaveis = useMemo(() => [...new Set(chamados.map(c => c.responsavel).filter(Boolean))], [chamados]);

  const tipoAtivo = activeSection === 'externos' ? 'externo' : 'interno';

  const filteredChamados = useMemo(() => {
    const list = chamados.filter(c => {
      const cTipo = c.tipo || 'interno';
      if (cTipo !== tipoAtivo) return false;
      if (filterProduct.length && !filterProduct.includes(c.product_id)) return false;
      if (filterStatus.length && !filterStatus.includes(c.status)) return false;
      if (filterPriority.length && !filterPriority.includes(c.prioridade)) return false;
      if (filterResponsavel.length && !filterResponsavel.includes(c.responsavel)) return false;
      if (search) {
        const q = search.toLowerCase();
        return c.numero?.toLowerCase().includes(q) || c.descricao?.toLowerCase().includes(q) ||
          c.responsavel?.toLowerCase().includes(q) || c.product_name?.toLowerCase().includes(q);
      }
      return true;
    });
    return sortChamados(list, sortBy);
  }, [chamados, tipoAtivo, filterProduct, filterStatus, filterPriority, filterResponsavel, search, sortBy]);

  const criticos = useMemo(() => chamados.filter(c =>
    (c.prioridade === 'critica' || c.is_bloqueador) && !['resolvido', 'fechado'].includes(c.status)
  ), [chamados]);

  // ── Charts data ───────────────────────────────────────────────────────────
  const chamadosPorProduto = useMemo(() => {
    const map = {};
    chamados.forEach(c => {
      const name = c.product_name || 'Sem produto';
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [chamados]);

  const chamadosPorPrioridade = useMemo(() => {
    const map = { baixa: 0, media: 0, alta: 0, critica: 0 };
    chamados.filter(c => !['resolvido', 'fechado'].includes(c.status)).forEach(c => {
      map[c.prioridade] = (map[c.prioridade] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name: PRIO_CONFIG[name]?.label || name, value }));
  }, [chamados]);

  const chamadosPorMes = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i);
      return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM/yy', { locale: ptBR }), abertos: 0, resolvidos: 0, criticos: 0 };
    });
    chamados.forEach(c => {
      if (!c.data_abertura) return;
      const mes = c.data_abertura.slice(0, 7);
      const m = months.find(m => m.key === mes);
      if (m) {
        m.abertos++;
        if (c.prioridade === 'critica' || c.is_bloqueador) m.criticos++;
      }
      if (c.data_resolucao) {
        const mr = c.data_resolucao.slice(0, 7);
        const mm = months.find(m => m.key === mr);
        if (mm) mm.resolvidos++;
      }
    });
    return months;
  }, [chamados]);

  const tempoMedioResolucao = useMemo(() => {
    const resolved = chamados.filter(c => c.data_abertura && c.data_resolucao);
    if (!resolved.length) return 0;
    const total = resolved.reduce((sum, c) =>
      sum + differenceInDays(parseISO(c.data_resolucao), parseISO(c.data_abertura)), 0);
    return Math.round(total / resolved.length);
  }, [chamados]);

  const handleDelete = async (id) => {
    if (!window.confirm('Remover este chamado?')) return;
    await base44.entities.Chamado.delete(id);
    qc.invalidateQueries({ queryKey: ['chamados', projectId] });
  };

  const handleStatusChange = async (chamado, newStatus) => {
    await base44.entities.Chamado.update(chamado.id, { status: newStatus });
    qc.invalidateQueries({ queryKey: ['chamados', projectId] });
  };

  const handleProductChange = async (chamado, newProductId) => {
    if (newProductId === '__none__') {
      await base44.entities.Chamado.update(chamado.id, { product_id: '', product_name: '' });
    } else {
      const prod = products.find(p => p.id === newProductId);
      await base44.entities.Chamado.update(chamado.id, { product_id: newProductId, product_name: prod?.name || '' });
    }
    qc.invalidateQueries({ queryKey: ['chamados', projectId] });
  };

  const handleResponsavelChange = async (chamado, value) => {
    if ((chamado.responsavel || '') === value) return;
    await base44.entities.Chamado.update(chamado.id, { responsavel: value });
    qc.invalidateQueries({ queryKey: ['chamados', projectId] });
  };

  const handlePrevisaoChange = async (chamado, value) => {
    if ((chamado.previsao_conclusao || '') === value) return;
    await base44.entities.Chamado.update(chamado.id, { previsao_conclusao: value });
    qc.invalidateQueries({ queryKey: ['chamados', projectId] });
  };

  const handleExportPdf = () => {
    generateChamadosPdf({
      chamados: filteredChamados,
      kpis: [
        { label: 'Total de Chamados', value: chamados.length },
        { label: 'Chamados Ativos', value: ativosCount },
        { label: 'Críticos / Bloqueadores', value: criticos.length },
        { label: 'Nesta lista', value: filteredChamados.length },
      ],
      projectName,
      tipoLabel: activeSection === 'externos' ? 'Chamados Externos' : 'Chamados Internos',
    });
  };

  const handleEdit = (chamado) => { setEditChamado(chamado); setModalTipo(chamado.tipo || 'interno'); setShowModal(true); };
  const handleNew = (tipo = 'interno') => { setEditChamado(null); setModalTipo(tipo); setShowModal(true); };

  const handleEditProduct = (product) => { setEditProduct(product); setShowProductModal(true); };
  const handleNewProduct = () => { setEditProduct(null); setShowProductModal(true); };
  const handleDeleteProduct = async (product) => {
    const linked = chamados.filter(c => c.product_id === product.id).length;
    const msg = linked > 0
      ? `Remover o produto "${product.name}"? Há ${linked} chamado(s) vinculado(s) que ficarão sem produto.`
      : `Remover o produto "${product.name}"?`;
    if (!window.confirm(msg)) return;
    await base44.entities.Product.delete(product.id);
    qc.invalidateQueries({ queryKey: ['products', projectId] });
  };

  const ativosCount = chamados.filter(c => !['resolvido', 'fechado'].includes(c.status)).length;
  const internosCount = chamados.filter(c => (c.tipo || 'interno') === 'interno').length;
  const externosCount = chamados.filter(c => c.tipo === 'externo').length;
  const sections = ['overview', 'internos', 'externos', 'criticos', 'tendencias'];
  const sectionLabel = { overview: 'Visão Geral', internos: `Chamados Internos (${internosCount})`, externos: `Chamados Externos (${externosCount})`, criticos: 'Críticos', tendencias: 'Tendências' };

  return (
    <div className="p-6 lg:p-8 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
            <Package className="w-7 h-7 text-purple-400" />
            Produtos / Chamados
          </h1>
          <p className="text-slate-400 mt-1">Gestão de chamados e saúde dos produtos em sustentação</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleNewProduct}
            variant="outline" className="border-purple-600/50 text-purple-300 hover:bg-purple-600/10">
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total de Chamados', value: chamados.length, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Chamados Ativos', value: ativosCount, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
          { label: 'Críticos / Bloqueadores', value: criticos.length, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
          { label: 'Produtos Monitorados', value: products.length, icon: Package, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
          { label: 'Tempo Médio Resolução', value: `${tempoMedioResolucao}d`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
        ].map((kpi, i) => (
          <div key={i} className={`rounded-xl border p-4 ${kpi.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-xs">{kpi.label}</p>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Section Nav */}
      <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1 w-fit">
        {sections.map(s => (
          <button key={s} onClick={() => setActiveSection(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSection === s ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {sectionLabel[s]}
          </button>
        ))}
      </div>

      {/* ── Overview ─────────────────────────────────────────────────────── */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          {/* Products health grid */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">Saúde dos Produtos</h2>
            {productStats.length === 0 ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center text-slate-500">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Nenhum produto cadastrado neste projeto.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {productStats.sort((a, b) => a.health.score - b.health.score).map(p => (
                  <div key={p.id} className={`rounded-xl border p-4 bg-slate-800/50 hover:bg-slate-800 transition-colors ${
                    p.health.score === 0 ? 'border-red-500/40' :
                    p.health.score === 1 ? 'border-yellow-500/40' :
                    p.health.score === 2 ? 'border-blue-500/40' : 'border-emerald-500/30'
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-white font-medium text-sm">{p.name}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{p.vertical || '—'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-1.5 text-xs font-semibold ${p.health.color}`}>
                          <span className={`w-2 h-2 rounded-full ${p.health.dot} animate-pulse`} />
                          {p.health.label}
                        </span>
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => handleEditProduct(p)} className="p-1 text-slate-500 hover:text-blue-400 transition-colors" title="Editar produto">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteProduct(p)} className="p-1 text-slate-500 hover:text-red-400 transition-colors" title="Remover produto">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs">
                      <div className="text-center">
                        <p className="text-slate-400">Chamados</p>
                        <p className="text-white font-bold text-base">{p.chamados.length}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-400">Ativos</p>
                        <p className={`font-bold text-base ${p.ativos.length > 0 ? 'text-yellow-300' : 'text-emerald-300'}`}>
                          {p.ativos.length}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-400">Atividades</p>
                        <p className="text-white font-bold text-base">{p.activities.length}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                Chamados por Produto
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chamadosPorProduto} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={90} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', color: '#fff', fontSize: 12 }} />
                  <Bar dataKey="total" fill="#a855f7" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-400" />
                Distribuição por Prioridade (ativos)
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={chamadosPorPrioridade} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, value }) => `${name}: ${value}`} labelLine={{ stroke: '#475569' }}>
                    {chamadosPorPrioridade.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', color: '#fff', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Chamados Internos / Externos ─────────────────────────────────── */}
      {(activeSection === 'internos' || activeSection === 'externos') && (
        <div className="space-y-4">
          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">
              {activeSection === 'externos' ? 'Chamados Externos' : 'Chamados Internos'}
            </h2>
            <div className="flex gap-2">
              <Button onClick={handleExportPdf}
                variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-800">
                <FileDown className="w-4 h-4 mr-2" />
                Exportar PDF
              </Button>
              <Button onClick={() => activeSection === 'externos' ? setShowExternoImporter(true) : setShowImporter(true)}
                variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-800">
                <Upload className="w-4 h-4 mr-2" />
                Importar
              </Button>
              <Button onClick={() => handleNew(activeSection === 'externos' ? 'externo' : 'interno')}
                size="sm" className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Novo Chamado
              </Button>
            </div>
          </div>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center bg-slate-800/50 border border-slate-700 rounded-xl p-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar chamado..." className="bg-slate-700 border-slate-600 text-white pl-9 h-8 text-sm" />
            </div>
            <MultiSelectFilter
              label="Produto" width="w-44"
              options={products.map(p => ({ value: p.id, label: p.name }))}
              selected={filterProduct} onChange={setFilterProduct}
            />
            <MultiSelectFilter
              label="Status" width="w-44"
              options={Object.entries(STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))}
              selected={filterStatus} onChange={setFilterStatus}
            />
            <MultiSelectFilter
              label="Prioridade" width="w-40"
              options={Object.entries(PRIO_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))}
              selected={filterPriority} onChange={setFilterPriority}
            />
            {responsaveis.length > 0 && (
              <MultiSelectFilter
                label="Solicitante" width="w-44"
                options={responsaveis.map(r => ({ value: r, label: r }))}
                selected={filterResponsavel} onChange={setFilterResponsavel}
              />
            )}
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-slate-500 text-xs">Ordenar:</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-8 w-48 bg-slate-700 border-slate-600 text-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  {SORT_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-slate-500 text-xs">{filteredChamados.length} chamados</span>
          </div>

          {/* Table */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800">
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Número</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Descrição</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Categoria</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Produto</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Entidade</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Status</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Previsão Conclusão</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Prioridade</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Solicitante</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Abertura</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filteredChamados.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center text-slate-500 py-12">
                      <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>Nenhum chamado encontrado</p>
                    </td>
                  </tr>
                ) : filteredChamados.map(c => (
                  <tr key={c.id} className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${
                    c.is_bloqueador ? 'bg-red-900/10' : ''
                  }`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {c.is_bloqueador && <Zap className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                        <span className="text-white font-mono text-xs font-medium">{c.numero}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-slate-200 truncate" title={c.descricao}>{c.descricao}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs">{c.categoria || '—'}</td>
                    <td className="px-4 py-3">
                      <select
                        value={c.product_id || '__none__'}
                        onChange={e => handleProductChange(c, e.target.value)}
                        className="text-xs text-slate-200 bg-slate-700/60 border border-slate-600 rounded-md px-2 py-1 max-w-[160px] cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-500"
                        title={c.product_name || 'Sem produto'}
                      >
                        <option value="__none__" className="bg-slate-800 text-slate-400">— Sem produto —</option>
                        {!c.product_id && c.product_name && (
                          <option value="__none__" disabled className="bg-slate-800 text-slate-400">{c.product_name}</option>
                        )}
                        {products.map(p => (
                          <option key={p.id} value={p.id} className="bg-slate-800 text-white">{p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs">{c.entity_name || '—'}</td>
                    <td className="px-4 py-3">
                      <select
                        value={c.status || 'aberto'}
                        onChange={e => handleStatusChange(c, e.target.value)}
                        className={`text-xs font-medium rounded-full px-2 py-0.5 border cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-500 ${(STATUS_CONFIG[c.status] || STATUS_CONFIG.aberto).color}`}
                      >
                        {Object.entries(STATUS_CONFIG).map(([v, cfg]) => (
                          <option key={v} value={v} className="bg-slate-800 text-white">{cfg.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        key={c.id + (c.previsao_conclusao || '')}
                        defaultValue={c.previsao_conclusao || ''}
                        onChange={e => handlePrevisaoChange(c, e.target.value)}
                        className="editable-date text-xs text-slate-200 bg-slate-700/60 border border-slate-600 rounded-md px-2 py-1 w-32 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3"><PrioBadge prioridade={c.prioridade} /></td>
                    <td className="px-4 py-3">
                      <input
                        key={c.id + (c.responsavel || '')}
                        defaultValue={c.responsavel || ''}
                        onBlur={e => handleResponsavelChange(c, e.target.value.trim())}
                        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                        placeholder="—"
                        className="text-xs text-slate-200 bg-slate-700/60 border border-slate-600 rounded-md px-2 py-1 w-36 focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-slate-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {c.data_abertura ? format(parseISO(c.data_abertura), 'dd/MM/yy') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => handleEdit(c)} className="p-1 text-slate-500 hover:text-blue-400 transition-colors">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="p-1 text-slate-500 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Críticos ─────────────────────────────────────────────────────── */}
      {activeSection === 'criticos' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="text-lg font-semibold text-white">
              Chamados Críticos / Bloqueadores
            </h2>
            {criticos.length > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{criticos.length}</span>
            )}
          </div>

          {criticos.length === 0 ? (
            <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-xl p-10 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-emerald-300 font-medium text-lg">Nenhum chamado crítico aberto</p>
              <p className="text-slate-400 text-sm mt-1">Todos os chamados críticos foram resolvidos.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {criticos.map(c => (
                <div key={c.id} className="bg-red-900/20 border border-red-500/40 rounded-xl p-4 hover:bg-red-900/30 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Zap className="w-4 h-4 text-red-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-white font-mono font-semibold">{c.numero}</span>
                          {c.is_bloqueador && (
                            <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-xs px-2 py-0.5 rounded-full font-medium">
                              🚨 Bloqueador
                            </span>
                          )}
                          <PrioBadge prioridade={c.prioridade} />
                          <StatusBadge status={c.status} />
                        </div>
                        <p className="text-slate-200 text-sm">{c.descricao}</p>
                        <div className="flex gap-4 mt-1 text-xs text-slate-400">
                          {c.product_name && <span>📦 {c.product_name}</span>}
                          {c.responsavel && <span>👤 {c.responsavel}</span>}
                          {c.data_abertura && (
                            <span>📅 Aberto em {format(parseISO(c.data_abertura), 'dd/MM/yyyy')}</span>
                          )}
                          {c.data_abertura && (
                            <span className="text-red-400 font-medium">
                              ⏱ {differenceInDays(new Date(), parseISO(c.data_abertura))} dias em aberto
                            </span>
                          )}
                        </div>
                        {c.notes && <p className="text-slate-500 text-xs mt-1 italic">{c.notes}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(c)}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700 h-7 text-xs">
                        Editar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tendências ───────────────────────────────────────────────────── */}
      {activeSection === 'tendencias' && (
        <div className="space-y-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              Chamados por Mês (últimos 6 meses)
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chamadosPorMes} margin={{ left: 0, right: 16 }}>
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', color: '#fff', fontSize: 12 }} />
                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                <Line type="monotone" dataKey="abertos" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Abertos" />
                <Line type="monotone" dataKey="resolvidos" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Resolvidos" />
                <Line type="monotone" dataKey="criticos" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} name="Críticos" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <h3 className="text-white font-medium mb-4">Chamados por Produto (total)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chamadosPorProduto} margin={{ bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11, angle: -30, textAnchor: 'end' }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', color: '#fff', fontSize: 12 }} />
                  <Bar dataKey="total" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <h3 className="text-white font-medium mb-3">Métricas de Resolução</h3>
              <div className="space-y-4 mt-4">
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-slate-300 text-sm">Tempo médio de resolução</span>
                  <span className="text-white font-bold text-lg">{tempoMedioResolucao} dias</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-slate-300 text-sm">Taxa de resolução</span>
                  <span className="text-emerald-400 font-bold text-lg">
                    {chamados.length > 0
                      ? Math.round(chamados.filter(c => ['resolvido', 'fechado'].includes(c.status)).length / chamados.length * 100)
                      : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-slate-300 text-sm">Chamados ativos / total</span>
                  <span className="text-yellow-400 font-bold text-lg">{ativosCount} / {chamados.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-900/20 border border-red-500/20 rounded-lg">
                  <span className="text-slate-300 text-sm">Críticos ativos</span>
                  <span className="text-red-400 font-bold text-lg">{criticos.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ChamadoModal
        open={showModal} onOpenChange={setShowModal}
        chamado={editChamado} projectId={projectId} products={products}
        defaultTipo={modalTipo}
      />
      <ChamadoImporter
        open={showImporter} onOpenChange={setShowImporter}
        projectId={projectId} products={products}
      />
      <ChamadoExternoImporter
        open={showExternoImporter} onOpenChange={setShowExternoImporter}
        projectId={projectId}
      />
      <ProdutoSustentacaoModal
        open={showProductModal} onOpenChange={setShowProductModal}
        produto={editProduct} projectId={projectId}
      />
    </div>
  );
}