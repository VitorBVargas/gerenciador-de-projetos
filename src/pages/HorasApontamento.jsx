import React, { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Upload, Users, BarChart2, Clock, TrendingUp, Plus, Pencil, Trash2,
  CheckCircle2, ChevronDown, ChevronUp, X, Loader2, Check, Calendar,
  Filter, Download, Timer, Activity
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import GlobalTracker from '@/components/horas/GlobalTracker.jsx';
import LancamentoModal from '@/components/horas/LancamentoModal.jsx';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const TIPO_LABEL = { atendimento:'Atendimento', reuniao:'Reunião', treinamento:'Treinamento', configuracao:'Configuração', analise:'Análise', documentacao:'Documentação', suporte:'Suporte', implantacao:'Implantação', sustentacao:'Sustentação', administrativo:'Administrativo' };
const TIPO_COLORS = ['#3b82f6','#8b5cf6','#f59e0b','#10b981','#ef4444','#06b6d4','#f97316','#84cc16','#ec4899','#6366f1'];
const CHART_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#f97316','#84cc16','#ec4899','#6366f1','#14b8a6','#a78bfa'];

const fh = (h) => h % 1 === 0 ? `${h}h` : `${h.toFixed(1)}h`;
const today = () => format(new Date(), 'yyyy-MM-dd');
const thisWeekStart = () => format(startOfWeek(new Date(), { locale: ptBR }), 'yyyy-MM-dd');
const thisMonthStr = () => format(new Date(), 'yyyy-MM');

export default function HorasApontamento() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id') || null;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [lancamentoModal, setLancamentoModal] = useState(false);
  const [editingLancamento, setEditingLancamento] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [filterColaborador, setFilterColaborador] = useState('');
  const [filterMes, setFilterMes] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMonth, setImportMonth] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  // Data
  const { data: lancamentos = [], isLoading } = useQuery({
    queryKey: ['horasLancamentos', projectId],
    queryFn: () => projectId ? base44.entities.HorasLancamento.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
    staleTime: 60_000,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers', projectId],
    queryFn: () => projectId ? base44.entities.TeamMember.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', projectId],
    queryFn: () => projectId ? base44.entities.ProjectActivity.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
  });

  const { data: objectives = [] } = useQuery({
    queryKey: ['roadmapObjetivos', projectId],
    queryFn: () => projectId ? base44.entities.RoadmapObjetivo.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products', projectId],
    queryFn: () => projectId ? base44.entities.Product.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (d) => base44.entities.HorasLancamento.create({ ...d, project_id: projectId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['horasLancamentos', projectId] }); setLancamentoModal(false); toast.success('Lançamento salvo!'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HorasLancamento.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['horasLancamentos', projectId] }); setLancamentoModal(false); setEditingLancamento(null); toast.success('Lançamento atualizado!'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.HorasLancamento.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['horasLancamentos', projectId] }); setDeleteDialog(null); toast.success('Lançamento removido.'); },
  });

  const handleSave = (data) => {
    if (editingLancamento) updateMutation.mutate({ id: editingLancamento.id, data });
    else createMutation.mutate(data);
  };

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const todayStr = today();
  const weekStart = thisWeekStart();
  const monthStr = thisMonthStr();

  const horasHoje = useMemo(() => lancamentos.filter(l => l.data === todayStr).reduce((s, l) => s + (l.total_horas || 0), 0), [lancamentos, todayStr]);
  const horasSemana = useMemo(() => lancamentos.filter(l => l.data >= weekStart && l.data <= todayStr).reduce((s, l) => s + (l.total_horas || 0), 0), [lancamentos, weekStart, todayStr]);
  const horasMes = useMemo(() => lancamentos.filter(l => l.reference_month === monthStr).reduce((s, l) => s + (l.total_horas || 0), 0), [lancamentos, monthStr]);

  const byColaborador = useMemo(() => {
    const m = {};
    lancamentos.forEach(l => { m[l.colaborador] = (m[l.colaborador] || 0) + (l.total_horas || 0); });
    return Object.entries(m).map(([name, horas]) => ({ name: name.split(' ').slice(0, 2).join(' '), horas: Math.round(horas * 10) / 10 })).sort((a, b) => b.horas - a.horas);
  }, [lancamentos]);

  const byProduto = useMemo(() => {
    const m = {};
    lancamentos.forEach(l => { if (l.produto) m[l.produto] = (m[l.produto] || 0) + (l.total_horas || 0); });
    return Object.entries(m).map(([name, value]) => ({ name, value: Math.round(value * 10) / 10 })).sort((a, b) => b.value - a.value);
  }, [lancamentos]);

  const byObjetivo = useMemo(() => {
    const m = {};
    lancamentos.forEach(l => { if (l.objetivo) m[l.objetivo] = (m[l.objetivo] || 0) + (l.total_horas || 0); });
    return Object.entries(m).map(([name, value]) => ({ name, value: Math.round(value * 10) / 10 })).sort((a, b) => b.value - a.value);
  }, [lancamentos]);

  const byTipo = useMemo(() => {
    const m = {};
    lancamentos.forEach(l => { const t = l.tipo || 'sustentacao'; m[t] = (m[t] || 0) + (l.total_horas || 0); });
    return Object.entries(m).map(([name, value]) => ({ name: TIPO_LABEL[name] || name, value: Math.round(value * 10) / 10 }));
  }, [lancamentos]);

  const monthlyEvolution = useMemo(() => {
    const m = {};
    lancamentos.forEach(l => { if (l.reference_month) m[l.reference_month] = (m[l.reference_month] || 0) + (l.total_horas || 0); });
    return Object.entries(m).sort(([a],[b]) => a.localeCompare(b)).map(([month, total]) => ({
      month: format(parseISO(month + '-01'), 'MMM/yy', { locale: ptBR }),
      total: Math.round(total * 10) / 10,
    }));
  }, [lancamentos]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filteredLancamentos = useMemo(() => {
    return lancamentos.filter(l => {
      if (filterColaborador && l.colaborador !== filterColaborador) return false;
      if (filterMes && l.reference_month !== filterMes) return false;
      if (filterTipo && l.tipo !== filterTipo) return false;
      return true;
    }).sort((a, b) => b.data.localeCompare(a.data));
  }, [lancamentos, filterColaborador, filterMes, filterTipo]);

  // ── Timesheet semanal ─────────────────────────────────────────────────────
  const [timesheetWeekOffset, setTimesheetWeekOffset] = useState(0);
  const weekDays = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + timesheetWeekOffset * 7);
    const start = startOfWeek(base, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end: new Date(start.getTime() + 6 * 86400000) });
  }, [timesheetWeekOffset]);

  const timesheetColabs = useMemo(() => [...new Set(lancamentos.map(l => l.colaborador))], [lancamentos]);

  // ── Available months for filter ───────────────────────────────────────────
  const availableMonths = useMemo(() => [...new Set(lancamentos.map(l => l.reference_month).filter(Boolean))].sort().reverse(), [lancamentos]);
  const availableColabs = useMemo(() => [...new Set(lancamentos.map(l => l.colaborador))].sort(), [lancamentos]);

  // ── Import Excel ──────────────────────────────────────────────────────────
  const { data: allHorasLegacy = [] } = useQuery({
    queryKey: ['horasApontamento', projectId],
    queryFn: () => projectId ? base44.entities.HorasApontamento.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !importMonth) { toast.error('Selecione o mês antes de importar.'); return; }
    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheet = wb.Sheets['People'];
      if (!sheet) throw new Error('Aba "People" não encontrada.');
      const rows = XLSX.utils.sheet_to_json(sheet);
      const records = rows.filter(r => r['Name'] && r['Worked'] > 0).map(r => ({
        project_id: projectId,
        colaborador: String(r['Name']).trim(),
        data: importMonth + '-01',
        total_horas: Number(r['Worked']) || 0,
        tipo: 'sustentacao',
        origem: 'importacao',
        reference_month: importMonth,
      }));
      if (!records.length) throw new Error('Nenhum registro válido.');
      await base44.entities.HorasLancamento.bulkCreate(records);
      queryClient.invalidateQueries({ queryKey: ['horasLancamentos', projectId] });
      setShowImportModal(false);
      toast.success(`${records.length} registros importados!`);
    } catch (err) { toast.error('Erro: ' + err.message); }
    finally { setIsImporting(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const TABS = [
    { key: 'dashboard', label: 'Dashboard', icon: BarChart2 },
    { key: 'lancamentos', label: 'Lançamentos', icon: Clock },
    { key: 'timesheet', label: 'Timesheet', icon: Calendar },
    { key: 'indicadores', label: 'Indicadores', icon: Activity },
  ];

  if (!projectId) return (
    <div className="p-8 text-center text-slate-400">Selecione um projeto para ver o apontamento de horas.</div>
  );

  return (
    <div className="min-h-screen bg-slate-900 p-6 space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Apontamento de Horas</h1>
          <p className="text-sm text-slate-400 mt-0.5">Controle de esforço da equipe</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setShowImportModal(true)} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-1.5">
            <Upload className="w-4 h-4" /> Importar Excel
          </Button>
          <Button onClick={() => { setEditingLancamento(null); setLancamentoModal(true); }} className="bg-blue-600 hover:bg-blue-700 gap-1.5">
            <Plus className="w-4 h-4" /> Novo Lançamento
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/60 rounded-lg p-1 w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === t.key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>
      ) : (
        <>
          {/* ── DASHBOARD ── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: 'Horas Hoje', value: fh(horasHoje), color: 'text-blue-400' },
                  { label: 'Horas Semana', value: fh(horasSemana), color: 'text-purple-400' },
                  { label: 'Horas Mês', value: fh(horasMes), color: 'text-emerald-400' },
                  { label: 'Colaboradores', value: byColaborador.length, color: 'text-yellow-400' },
                  { label: 'Produtos', value: byProduto.length, color: 'text-pink-400' },
                  { label: 'Lançamentos', value: lancamentos.length, color: 'text-slate-300' },
                ].map(k => (
                  <Card key={k.label} className="bg-slate-800/60 border-slate-700/50">
                    <CardContent className="p-4">
                      <p className="text-xs text-slate-400">{k.label}</p>
                      <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* By Colaborador */}
                <Card className="bg-slate-800/60 border-slate-700/50">
                  <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Horas por Colaborador</CardTitle></CardHeader>
                  <CardContent>
                    {byColaborador.length === 0 ? <p className="text-slate-500 text-sm text-center py-8">Sem dados</p> : (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={byColaborador.slice(0, 10)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                          <XAxis type="number" stroke="#64748b" style={{ fontSize: 10 }} tickFormatter={v => `${v}h`} />
                          <YAxis type="category" dataKey="name" stroke="#64748b" style={{ fontSize: 10 }} width={80} />
                          <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} formatter={v => [`${v}h`, 'Horas']} />
                          <Bar dataKey="horas" fill="#3b82f6" radius={[0,4,4,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* By Produto */}
                <Card className="bg-slate-800/60 border-slate-700/50">
                  <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Horas por Produto</CardTitle></CardHeader>
                  <CardContent>
                    {byProduto.length === 0 ? <p className="text-slate-500 text-sm text-center py-8">Sem dados</p> : (
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={byProduto.slice(0, 8)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name.slice(0,10)} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                            {byProduto.slice(0,8).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} formatter={v => [`${v}h`, 'Horas']} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Evolução */}
                <Card className="bg-slate-800/60 border-slate-700/50">
                  <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Evolução Mensal</CardTitle></CardHeader>
                  <CardContent>
                    {monthlyEvolution.length < 2 ? <p className="text-slate-500 text-sm text-center py-8">Precisa de 2+ meses</p> : (
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={monthlyEvolution}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: 10 }} />
                          <YAxis stroke="#64748b" style={{ fontSize: 10 }} tickFormatter={v => `${v}h`} />
                          <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} formatter={v => [`${v}h`, 'Total']} />
                          <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* By Tipo */}
                <Card className="bg-slate-800/60 border-slate-700/50">
                  <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Horas por Tipo</CardTitle></CardHeader>
                  <CardContent>
                    {byTipo.length === 0 ? <p className="text-slate-500 text-sm text-center py-8">Sem dados</p> : (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {byTipo.sort((a,b) => b.value - a.value).map((t, i) => (
                          <div key={t.name} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: TIPO_COLORS[i % TIPO_COLORS.length] }} />
                            <span className="text-xs text-slate-300 flex-1">{t.name}</span>
                            <span className="text-xs font-semibold text-white">{fh(t.value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ── LANÇAMENTOS ── */}
          {activeTab === 'lancamentos' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex gap-2 flex-wrap items-center">
                <select value={filterColaborador} onChange={e => setFilterColaborador(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-white">
                  <option value="">Todos colaboradores</option>
                  {availableColabs.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={filterMes} onChange={e => setFilterMes(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-white">
                  <option value="">Todos os meses</option>
                  {availableMonths.map(m => <option key={m} value={m}>{format(parseISO(m + '-01'), 'MMMM/yyyy', { locale: ptBR })}</option>)}
                </select>
                <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-white">
                  <option value="">Todos os tipos</option>
                  {Object.entries(TIPO_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                {(filterColaborador || filterMes || filterTipo) && (
                  <button onClick={() => { setFilterColaborador(''); setFilterMes(''); setFilterTipo(''); }}
                    className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-md hover:bg-slate-800 transition-colors">
                    ✕ Limpar
                  </button>
                )}
                <span className="text-xs text-slate-500 ml-auto">{filteredLancamentos.length} registros · {fh(filteredLancamentos.reduce((s,l)=>s+(l.total_horas||0),0))} total</span>
              </div>

              {filteredLancamentos.length === 0 ? (
                <div className="text-center py-16 bg-slate-800/40 rounded-xl border border-slate-700/40">
                  <Timer className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                  <p className="text-slate-300 font-medium mb-1">Nenhum lançamento encontrado</p>
                  <p className="text-slate-500 text-sm mb-4">Use o tracker global ou adicione manualmente.</p>
                  <Button onClick={() => setLancamentoModal(true)} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-1" /> Novo Lançamento</Button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-700/50">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-800 border-b border-slate-700 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        <th className="text-left px-4 py-3">Data</th>
                        <th className="text-left px-4 py-3">Colaborador</th>
                        <th className="text-left px-4 py-3">Produto</th>
                        <th className="text-left px-4 py-3">Atividade</th>
                        <th className="text-left px-3 py-3">Tipo</th>
                        <th className="text-left px-3 py-3">Início–Fim</th>
                        <th className="text-right px-4 py-3">Horas</th>
                        <th className="px-3 py-3 w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLancamentos.map(l => (
                        <tr key={l.id} className="border-t border-slate-700/40 hover:bg-slate-800/60 transition-colors group">
                          <td className="px-4 py-2.5 text-slate-300 text-xs">{l.data ? format(parseISO(l.data), 'dd/MM/yyyy') : '—'}</td>
                          <td className="px-4 py-2.5 text-white font-medium text-xs">{l.colaborador}</td>
                          <td className="px-4 py-2.5 text-slate-400 text-xs">{l.produto || '—'}</td>
                          <td className="px-4 py-2.5 text-slate-400 text-xs max-w-[160px] truncate">{l.atividade_titulo || l.objetivo || '—'}</td>
                          <td className="px-3 py-2.5">
                            <Badge className="text-xs bg-slate-700 text-slate-300">{TIPO_LABEL[l.tipo] || l.tipo || '—'}</Badge>
                          </td>
                          <td className="px-3 py-2.5 text-slate-500 text-xs">{l.hora_inicio && l.hora_fim ? `${l.hora_inicio}–${l.hora_fim}` : '—'}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-blue-400 text-sm">{fh(l.total_horas || 0)}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingLancamento(l); setLancamentoModal(true); }} className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md"><Pencil className="w-3 h-3" /></button>
                              <button onClick={() => setDeleteDialog(l)} className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── TIMESHEET ── */}
          {activeTab === 'timesheet' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setTimesheetWeekOffset(o => o - 1)} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors">
                  <ChevronDown className="w-4 h-4 rotate-90" />
                </button>
                <span className="text-sm font-medium text-white">
                  {format(weekDays[0], 'dd/MM', { locale: ptBR })} – {format(weekDays[6], 'dd/MM/yyyy', { locale: ptBR })}
                </span>
                <button onClick={() => setTimesheetWeekOffset(o => o + 1)} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors">
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </button>
                {timesheetWeekOffset !== 0 && (
                  <button onClick={() => setTimesheetWeekOffset(0)} className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded-md hover:bg-blue-500/10 transition-colors">Hoje</button>
                )}
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-700/50">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-800 border-b border-slate-700">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-32">Colaborador</th>
                      {weekDays.map(d => (
                        <th key={d.toISOString()} className={`text-center px-2 py-3 text-xs font-semibold uppercase tracking-wider ${isSameDay(d, new Date()) ? 'text-blue-400' : 'text-slate-400'}`}>
                          <div>{format(d, 'EEE', { locale: ptBR })}</div>
                          <div className={`text-sm font-bold mt-0.5 ${isSameDay(d, new Date()) ? 'text-blue-400' : 'text-white'}`}>{format(d, 'dd')}</div>
                        </th>
                      ))}
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timesheetColabs.length === 0 ? (
                      <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">Nenhum colaborador nesta semana.</td></tr>
                    ) : (
                      timesheetColabs.map(colab => {
                        const weekTotal = weekDays.reduce((s, d) => {
                          const ds = format(d, 'yyyy-MM-dd');
                          return s + lancamentos.filter(l => l.colaborador === colab && l.data === ds).reduce((ss, l) => ss + (l.total_horas || 0), 0);
                        }, 0);
                        return (
                          <tr key={colab} className="border-t border-slate-700/40 hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-3 text-white text-xs font-medium">{colab.split(' ').slice(0,2).join(' ')}</td>
                            {weekDays.map(d => {
                              const ds = format(d, 'yyyy-MM-dd');
                              const dayHours = lancamentos.filter(l => l.colaborador === colab && l.data === ds).reduce((s, l) => s + (l.total_horas || 0), 0);
                              return (
                                <td key={ds} className={`text-center px-2 py-3 ${isSameDay(d, new Date()) ? 'bg-blue-500/5' : ''}`}>
                                  {dayHours > 0 ? (
                                    <span className="text-xs font-bold text-blue-400">{fh(dayHours)}</span>
                                  ) : (
                                    <span className="text-xs text-slate-700">—</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-4 py-3 text-right">
                              <span className={`text-sm font-bold ${weekTotal > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>{weekTotal > 0 ? fh(weekTotal) : '—'}</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                    {/* Totals row */}
                    {timesheetColabs.length > 0 && (
                      <tr className="border-t-2 border-slate-600 bg-slate-800/60">
                        <td className="px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase">Total</td>
                        {weekDays.map(d => {
                          const ds = format(d, 'yyyy-MM-dd');
                          const total = lancamentos.filter(l => l.data === ds).reduce((s, l) => s + (l.total_horas || 0), 0);
                          return (
                            <td key={ds} className={`text-center px-2 py-2.5 ${isSameDay(d, new Date()) ? 'bg-blue-500/5' : ''}`}>
                              <span className={`text-xs font-bold ${total > 0 ? 'text-white' : 'text-slate-700'}`}>{total > 0 ? fh(total) : '—'}</span>
                            </td>
                          );
                        })}
                        <td className="px-4 py-2.5 text-right">
                          <span className="text-sm font-bold text-white">
                            {fh(weekDays.reduce((s, d) => s + lancamentos.filter(l => l.data === format(d, 'yyyy-MM-dd')).reduce((ss, l) => ss + (l.total_horas || 0), 0), 0))}
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── INDICADORES ── */}
          {activeTab === 'indicadores' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Horas por Objetivo */}
              <Card className="bg-slate-800/60 border-slate-700/50">
                <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Horas por Objetivo</CardTitle></CardHeader>
                <CardContent>
                  {byObjetivo.length === 0 ? <p className="text-slate-500 text-sm text-center py-8">Sem dados com objetivo vinculado</p> : (
                    <div className="space-y-2">
                      {byObjetivo.slice(0, 10).map((o, i) => (
                        <div key={o.name} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-xs text-slate-300 flex-1 truncate">{o.name}</span>
                          <span className="text-xs font-bold text-white">{fh(o.value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Horas por Tipo (bar) */}
              <Card className="bg-slate-800/60 border-slate-700/50">
                <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Distribuição por Tipo</CardTitle></CardHeader>
                <CardContent>
                  {byTipo.length === 0 ? <p className="text-slate-500 text-sm text-center py-8">Sem dados</p> : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={byTipo.sort((a,b)=>b.value-a.value)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: 9 }} />
                        <YAxis stroke="#64748b" style={{ fontSize: 10 }} tickFormatter={v => `${v}h`} />
                        <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} formatter={v => [`${v}h`, 'Horas']} />
                        <Bar dataKey="value" radius={[4,4,0,0]}>
                          {byTipo.map((_, i) => <Cell key={i} fill={TIPO_COLORS[i % TIPO_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Top colaboradores */}
              <Card className="bg-slate-800/60 border-slate-700/50 lg:col-span-2">
                <CardHeader className="pb-2"><CardTitle className="text-white text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-400" /> Ranking de Colaboradores</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {byColaborador.slice(0, 10).map((c, i) => {
                      const max = byColaborador[0]?.horas || 1;
                      return (
                        <div key={c.name} className="flex items-center gap-3">
                          <span className={`text-xs font-bold w-5 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-600'}`}>{i+1}</span>
                          <span className="text-sm text-white w-36 truncate">{c.name}</span>
                          <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${(c.horas / max) * 100}%` }} />
                          </div>
                          <span className="text-sm font-bold text-blue-400 w-14 text-right">{fh(c.horas)}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowImportModal(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Importar Planilha Excel</h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="text-sm text-slate-300">Mês de referência</label>
              <input type="month" value={importMonth} onChange={e => setImportMonth(e.target.value)}
                className="w-full mt-1 h-10 px-3 rounded-md bg-slate-900 border border-slate-600 text-slate-200 text-sm" />
            </div>
            <Button onClick={() => { if (!importMonth) { toast.error('Selecione o mês.'); return; } fileInputRef.current?.click(); }}
              disabled={isImporting} className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
              {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Selecionar Arquivo
            </Button>
            <p className="text-xs text-slate-500">A planilha deve conter uma aba "People" com colunas Name e Worked.</p>
          </div>
        </div>
      )}
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />

      {/* Modals */}
      <LancamentoModal
        open={lancamentoModal}
        onOpenChange={setLancamentoModal}
        lancamento={editingLancamento}
        onSave={handleSave}
        teamMembers={teamMembers}
        activities={activities}
        objectives={objectives}
        products={products}
      />

      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remover lançamento?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteDialog?.id)} className="bg-red-600 hover:bg-red-700">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Global Tracker */}
      {projectId && <GlobalTracker projectId={projectId} onSaved={() => queryClient.invalidateQueries({ queryKey: ['horasLancamentos', projectId] })} />}
    </div>
  );
}