import React, { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Upload, Users, BarChart2, Clock, TrendingUp,
  CheckCircle2, ChevronDown, ChevronUp, X, Loader2, Pencil, Check
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const VERTICAL_LABELS = {
  gerenciamento: 'Gerenciamento',
  arrecadacao: 'Arrecadação',
  compras: 'Compras',
  contabil: 'Contábil',
  pessoal: 'Pessoal',
  educacao: 'Educação',
  iss: 'ISS',
  parceiros: 'Parceiros',
  plataforma: 'Plataforma',
  saude: 'Saúde',
  atendimento: 'Atendimento',
  outros: 'Outros',
};

const VERTICAL_COLORS = {
  gerenciamento: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
  arrecadacao: 'bg-green-500/20 border-green-500/40 text-green-300',
  compras: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300',
  contabil: 'bg-purple-500/20 border-purple-500/40 text-purple-300',
  pessoal: 'bg-pink-500/20 border-pink-500/40 text-pink-300',
  educacao: 'bg-orange-500/20 border-orange-500/40 text-orange-300',
  iss: 'bg-red-500/20 border-red-500/40 text-red-300',
  parceiros: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300',
  plataforma: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300',
  saude: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
  atendimento: 'bg-teal-500/20 border-teal-500/40 text-teal-300',
  outros: 'bg-slate-500/20 border-slate-500/40 text-slate-300',
};

export default function HorasApontamento() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id') || null;

  const [activeTab, setActiveTab] = useState('pessoas');
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(''); // '' = Geral (todos os meses)
  const [importMonth, setImportMonth] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedVerticals, setSelectedVerticals] = useState([]); // [] = todas
  const [verticalDropdownOpen, setVerticalDropdownOpen] = useState(false);
  const [editingVertical, setEditingVertical] = useState(null); // person_name being edited
  const [editVerticalValue, setEditVerticalValue] = useState('');
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: allHoras = [], isLoading } = useQuery({
    queryKey: ['horasApontamento', projectId],
    queryFn: () => projectId
      ? base44.entities.HorasApontamento.filter({ project_id: projectId })
      : base44.entities.HorasApontamento.list('-reference_month', 10000),
    staleTime: 2 * 60 * 1000,
  });

  const availableMonths = useMemo(() => {
    return [...new Set(allHoras.map(h => h.reference_month))].sort().reverse();
  }, [allHoras]);

  // Remove legacy activeMonth — now using selectedMonth ('' = Geral)

  // Vertical map: person_name -> vertical (from any record, most recent)
  const personVerticalMap = useMemo(() => {
    const map = {};
    allHoras.forEach(h => {
      if (h.vertical) map[h.person_name] = h.vertical;
    });
    return map;
  }, [allHoras]);

  // Filter records by selected month ('' = all)
  const filteredHoras = useMemo(() => {
    if (!selectedMonth) return allHoras;
    return allHoras.filter(h => h.reference_month === selectedMonth);
  }, [allHoras, selectedMonth]);

  // Aggregate hours per person for current filter (month or all)
  const personMonthMap = useMemo(() => {
    const map = {};
    filteredHoras.forEach(h => {
      if (!map[h.person_name]) map[h.person_name] = 0;
      map[h.person_name] += h.hours_worked;
    });
    return map;
  }, [filteredHoras]);

  // Aggregate total accumulated per person
  const personTotalMap = useMemo(() => {
    const map = {};
    allHoras.forEach(h => {
      if (!map[h.person_name]) map[h.person_name] = 0;
      map[h.person_name] += h.hours_worked;
    });
    return map;
  }, [allHoras]);

  // Group by vertical for "Pessoas" tab (with vertical filter)
  const byVertical = useMemo(() => {
    const groups = {};
    Object.entries(personMonthMap).forEach(([name, hours]) => {
      const vertical = personVerticalMap[name] || 'sem_vertical';
      if (selectedVerticals.length > 0 && !selectedVerticals.includes(vertical)) return;
      if (!groups[vertical]) groups[vertical] = [];
      groups[vertical].push({ name, hours, total: personTotalMap[name] || 0 });
    });
    Object.values(groups).forEach(arr => arr.sort((a, b) => a.name.localeCompare(b.name)));
    return groups;
  }, [personMonthMap, personTotalMap, personVerticalMap, selectedVerticals]);

  // Ranking sorted by month hours (for Dashboard)
  const ranking = useMemo(() => {
    return Object.entries(personMonthMap)
      .map(([name, hours]) => ({ name, hours, total: personTotalMap[name] || 0 }))
      .sort((a, b) => b.hours - a.hours);
  }, [personMonthMap, personTotalMap]);

  // Person history
  const personHistory = useMemo(() => {
    if (!selectedPerson) return [];
    const history = {};
    allHoras.filter(h => h.person_name === selectedPerson).forEach(h => {
      if (!history[h.reference_month]) history[h.reference_month] = 0;
      history[h.reference_month] += h.hours_worked;
    });
    return Object.entries(history)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, hours]) => ({ month, hours }));
  }, [selectedPerson, allHoras]);

  // Monthly evolution
  const monthlyEvolution = useMemo(() => {
    const map = {};
    allHoras.forEach(h => {
      if (!map[h.reference_month]) map[h.reference_month] = 0;
      map[h.reference_month] += h.hours_worked;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({
        month: format(parseISO(month + '-01'), 'MMM/yy', { locale: ptBR }),
        total: Math.round(total * 10) / 10
      }));
  }, [allHoras]);

  // KPIs
  const kpis = useMemo(() => {
    const totalMonth = Object.values(personMonthMap).reduce((s, h) => s + h, 0);
    const people = Object.keys(personMonthMap).length;
    const avg = people > 0 ? totalMonth / people : 0;
    return { totalMonth, avg, people };
  }, [personMonthMap]);

  // Bar chart data (top 20, sorted highest → lowest)
  const barData = useMemo(() => {
    return ranking.slice(0, 20).map(p => ({
      name: p.name.split(' ').slice(0, 2).join(' '),
      horas: Math.round(p.hours * 10) / 10,
    }));
  }, [ranking]);

  const deleteMutation = useMutation({
    mutationFn: async (month) => {
      const toDelete = allHoras.filter(h => h.reference_month === month);
      for (const h of toDelete) await base44.entities.HorasApontamento.delete(h.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['horasApontamento'] });
      toast.success('Dados do mês removidos!');
    }
  });

  const saveVerticalMutation = useMutation({
    mutationFn: async ({ personName, vertical }) => {
      const records = allHoras.filter(h => h.person_name === personName);
      for (const r of records) {
        await base44.entities.HorasApontamento.update(r.id, { vertical });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['horasApontamento'] });
      setEditingVertical(null);
      toast.success('Vertical atualizada!');
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !importMonth) {
      toast.error('Selecione o mês de referência antes de importar.');
      return;
    }
    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheet = wb.Sheets['People'];
      if (!sheet) throw new Error('Aba "People" não encontrada na planilha.');
      const rows = XLSX.utils.sheet_to_json(sheet);
      if (!rows.length) throw new Error('Nenhum dado encontrado na aba People.');

      const existingThisMonth = allHoras.filter(h => h.reference_month === importMonth);
      if (existingThisMonth.length > 0) {
        const ok = window.confirm(`Já existem ${existingThisMonth.length} registros para ${importMonth}. Deseja substituir?`);
        if (!ok) { setIsImporting(false); return; }
        for (const h of existingThisMonth) await base44.entities.HorasApontamento.delete(h.id);
      }

      const records = rows
        .filter(r => r['Name'] && r['Worked'] > 0)
        .map(r => ({
          person_name: String(r['Name']).trim(),
          person_username: r['Username'] ? String(r['Username']).trim() : '',
          hours_worked: Number(r['Worked']) || 0,
          reference_month: importMonth,
          vertical: personVerticalMap[String(r['Name']).trim()] || '',
          ...(projectId ? { project_id: projectId } : {}),
        }));

      if (!records.length) throw new Error('Nenhum registro válido encontrado.');
      await base44.entities.HorasApontamento.bulkCreate(records);
      queryClient.invalidateQueries({ queryKey: ['horasApontamento'] });
      setSelectedMonth(importMonth);
      setShowImportModal(false);
      toast.success(`${records.length} registros importados!`);
    } catch (err) {
      toast.error('Erro ao importar: ' + err.message);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatHours = (h) => `${h.toFixed(1)}h`;
  const formatMonth = (m) => m ? format(parseISO(m + '-01'), 'MMMM/yyyy', { locale: ptBR }) : '';

  const verticalOrder = Object.keys(VERTICAL_LABELS);
  const sortedVerticals = [
    ...verticalOrder.filter(v => byVertical[v]),
    ...(byVertical['sem_vertical'] ? ['sem_vertical'] : [])
  ];

  return (
    <div className="min-h-screen bg-slate-900 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Apontamento de Horas</h1>
          <p className="text-sm text-slate-400 mt-1">Controle de horas trabalhadas por pessoa</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button onClick={() => setShowImportModal(true)} className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Upload className="w-4 h-4" />
            Importar Planilha
          </Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />
        </div>
      </div>

      {/* Filters */}
      {availableMonths.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Mês:</span>
            <button onClick={() => setSelectedMonth('')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!selectedMonth ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
              Geral
            </button>
            {availableMonths.map(m => (
              <button key={m} onClick={() => setSelectedMonth(m)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedMonth === m ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
                {formatMonth(m)}
              </button>
            ))}
            {selectedMonth && (
              <button onClick={() => deleteMutation.mutate(selectedMonth)}
                className="px-2 py-1 rounded-full text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors">
                🗑 Remover mês
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Vertical:</span>
            <div className="relative">
              <button
                onClick={() => setVerticalDropdownOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 text-xs font-medium transition-colors"
              >
                {selectedVerticals.length === 0 ? 'Todas as verticais' : `${selectedVerticals.length} selecionada(s)`}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {verticalDropdownOpen && (
                <div className="absolute z-50 mt-1 w-52 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1">
                  <label className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedVerticals.length === 0}
                      onChange={() => setSelectedVerticals([])}
                      className="w-3.5 h-3.5 rounded"
                    />
                    <span className="text-xs text-slate-200 font-medium">Todas</span>
                  </label>
                  <div className="border-t border-slate-700 my-1" />
                  {Object.entries(VERTICAL_LABELS).map(([k, v]) => (
                    <label key={k} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedVerticals.includes(k)}
                        onChange={() => setSelectedVerticals(prev =>
                          prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]
                        )}
                        className="w-3.5 h-3.5 rounded"
                      />
                      <span className="text-xs text-slate-300">{v}</span>
                    </label>
                  ))}
                </div>
              )}
              {verticalDropdownOpen && <div className="fixed inset-0 z-40" onClick={() => setVerticalDropdownOpen(false)} />}
            </div>
            {selectedVerticals.length > 0 && (
              <button onClick={() => setSelectedVerticals([])} className="text-xs text-slate-400 hover:text-white transition-colors">✕ Limpar</button>
            )}
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowImportModal(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-base">Importar Planilha</h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-300 font-medium">Qual mês quer importar?</label>
              <input
                type="month"
                value={importMonth}
                onChange={e => setImportMonth(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-slate-900 border border-slate-600 text-slate-200 text-sm"
              />
            </div>
            <Button
              onClick={() => {
                if (!importMonth) { toast.error('Selecione o mês antes de continuar.'); return; }
                fileInputRef.current?.click();
              }}
              disabled={isImporting}
              className="w-full bg-blue-600 hover:bg-blue-700 gap-2"
            >
              {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Selecionar Arquivo
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>
      ) : allHoras.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="py-16 text-center">
            <Clock className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-300 font-medium mb-1">Nenhum dado importado ainda</p>
            <p className="text-slate-500 text-sm">Selecione o mês e importe uma planilha Excel com a aba "People"</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800 border border-slate-700">
            <TabsTrigger value="pessoas" className="data-[state=active]:bg-blue-600">
              <Users className="w-4 h-4 mr-1.5" /> Pessoas / Horas
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-blue-600">
              <BarChart2 className="w-4 h-4 mr-1.5" /> Dashboard
            </TabsTrigger>
          </TabsList>

          {/* ===== PESSOAS / HORAS ===== */}
          <TabsContent value="pessoas" className="space-y-4 mt-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-slate-400 text-sm">
                {selectedMonth ? formatMonth(selectedMonth) : 'Geral (todos os meses)'} — <span className="text-white font-medium">{Object.values(byVertical).flat().length} pessoas</span>
              </p>
              <span className="text-xs text-slate-500">Clique em ✏️ para editar a vertical · Clique no nome para ver histórico</span>
            </div>

            <div className="flex gap-6">
              {/* Table */}
              <div className="flex-1 overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800 border-b border-slate-700 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="text-left px-4 py-2.5">Pessoa</th>
                      <th className="text-left px-3 py-2.5">Vertical</th>
                      <th className="text-right px-4 py-2.5 w-28">{selectedMonth ? 'Horas mês' : 'Total horas'}</th>
                      <th className="text-right px-4 py-2.5 w-28">Acumulado</th>
                      <th className="px-3 py-2.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedVerticals.map(vertical => {
                      const people = byVertical[vertical] || [];
                      const label = VERTICAL_LABELS[vertical] || 'Sem Vertical';
                      const colorClass = VERTICAL_COLORS[vertical] || VERTICAL_COLORS.outros;
                      const verticalTotal = people.reduce((s, p) => s + p.hours, 0);
                      return (
                        <React.Fragment key={vertical}>
                          {/* Vertical header row */}
                          <tr className="bg-slate-700/40 border-t-2 border-slate-600">
                            <td colSpan={5} className="px-4 py-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${colorClass}`}>{label}</span>
                                  <span className="text-xs text-slate-500">{people.length} pessoa(s)</span>
                                </div>
                                <span className="text-sm font-semibold text-slate-300">{formatHours(verticalTotal)}</span>
                              </div>
                            </td>
                          </tr>
                          {/* People rows */}
                          {people.map(person => (
                            <tr
                              key={person.name}
                              className={`border-t border-slate-700/40 hover:bg-slate-700/30 transition-colors cursor-pointer ${selectedPerson === person.name ? 'bg-slate-700/40' : ''}`}
                              onClick={() => setSelectedPerson(selectedPerson === person.name ? null : person.name)}
                            >
                              <td className="px-4 py-2.5">
                                <p className="text-sm text-white">{person.name}</p>
                              </td>
                              <td className="px-3 py-2.5">
                                {editingVertical === person.name ? (
                                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                    <select
                                      value={editVerticalValue}
                                      onChange={e => setEditVerticalValue(e.target.value)}
                                      className="text-xs bg-slate-700 border border-slate-600 text-white rounded px-1 py-0.5"
                                      autoFocus
                                    >
                                      <option value="">Sem vertical</option>
                                      {Object.entries(VERTICAL_LABELS).map(([k, v]) => (
                                        <option key={k} value={k}>{v}</option>
                                      ))}
                                    </select>
                                    <button onClick={() => saveVerticalMutation.mutate({ personName: person.name, vertical: editVerticalValue })} className="p-1 text-green-400 hover:text-green-300"><Check className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => setEditingVertical(null)} className="p-1 text-slate-400 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400">{VERTICAL_LABELS[personVerticalMap[person.name]] || '—'}</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <span className="text-sm font-semibold text-blue-300">{formatHours(person.hours)}</span>
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <span className="text-xs text-slate-500">{formatHours(person.total)}</span>
                              </td>
                              <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => { setEditingVertical(person.name); setEditVerticalValue(personVerticalMap[person.name] || ''); }}
                                  className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                                  title="Editar vertical"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Person history panel */}
              {selectedPerson && (
                <div className="w-72 flex-shrink-0">
                  <Card className="bg-slate-800 border-slate-700 sticky top-4">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-white text-sm truncate">{selectedPerson}</CardTitle>
                        <button onClick={() => setSelectedPerson(null)} className="text-slate-400 hover:text-white flex-shrink-0"><X className="w-4 h-4" /></button>
                      </div>
                      <p className="text-xs text-slate-400">Total acumulado: <span className="text-white font-semibold">{formatHours(personTotalMap[selectedPerson] || 0)}</span></p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Histórico mensal</p>
                      <div className="space-y-2">
                        {personHistory.map(({ month, hours }) => (
                          <div key={month} className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 w-20 flex-shrink-0">{formatMonth(month)}</span>
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${Math.min(100, (hours / 200) * 100)}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-white w-12 text-right">{formatHours(hours)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ===== DASHBOARD ===== */}
          <TabsContent value="dashboard" className="space-y-6 mt-4">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Total no Mês', value: formatHours(kpis.totalMonth), icon: Clock, color: 'text-blue-400' },
                { label: 'Média por Pessoa', value: formatHours(kpis.avg), icon: CheckCircle2, color: 'text-green-400' },
                { label: 'Pessoas Ativas', value: kpis.people, icon: Users, color: 'text-purple-400' },
              ].map(({ label, value, icon: Icon, color }) => (
                <Card key={label} className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Icon className={`w-8 h-8 ${color} flex-shrink-0`} />
                    <div>
                      <div className={`text-xl font-bold ${color}`}>{value}</div>
                      <div className="text-xs text-slate-400">{label}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Ranking */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" /> Ranking — {selectedMonth ? formatMonth(selectedMonth) : 'Geral'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-700 max-h-[400px] overflow-y-auto">
                  {ranking.map((person, idx) => (
                    <div key={person.name} className="flex items-center gap-3 px-4 py-3">
                      <span className={`text-xs font-bold w-6 text-center ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{person.name}</p>
                        <p className="text-xs text-slate-500">Acumulado: {formatHours(person.total)}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-blue-300">{formatHours(person.hours)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-sm">Horas por Pessoa</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" style={{ fontSize: '11px' }} tickFormatter={v => `${v}h`} />
                      <YAxis type="category" dataKey="name" stroke="#94a3b8" style={{ fontSize: '10px' }} width={90} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} formatter={(v) => [`${v}h`, 'Horas']} />
                      <Bar dataKey="horas" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-sm">Evolução Mensal</CardTitle>
                </CardHeader>
                <CardContent>
                  {monthlyEvolution.length < 2 ? (
                    <div className="flex items-center justify-center h-[320px] text-slate-500 text-sm">Importe mais de 1 mês para ver a evolução</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={monthlyEvolution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="month" stroke="#94a3b8" style={{ fontSize: '11px' }} />
                        <YAxis stroke="#94a3b8" style={{ fontSize: '11px' }} tickFormatter={v => `${v}h`} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} formatter={(v) => [`${v}h`, 'Total']} />
                        <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}