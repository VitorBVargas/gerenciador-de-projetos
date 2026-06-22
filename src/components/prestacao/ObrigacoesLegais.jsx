import React, { useState, useMemo, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Plus, Edit, Trash2, CheckCircle, Clock, AlertTriangle, XCircle, FileText,
  Filter, Calendar, TrendingUp, Award, Search, LayoutList, Table2
} from 'lucide-react';
import { differenceInDays, parseISO, format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ObrigacaoModal from './ObrigacaoModal';
import { useCurrentUser } from '@/lib/permissions';
import ObrigacoesPorTipo from './ObrigacoesPorTipo';
import CNDStatusCard from './CNDStatus';

const OBRIGACOES_PADRAO = ['AM', 'SIOPE', 'SIOPS', 'Balancete', 'RGF', 'RREO', 'MSC', 'DECASP', 'Balancete 13'];

// Obrigações anuais entregues em janeiro do ano seguinte ao exercício
const OBRIGACOES_ANUAIS = ['DECASP', 'Balancete 13'];

const STATUS_CFG = {
  nao_iniciado: { label: 'Não iniciado', color: 'text-slate-400', bg: 'bg-slate-700/60', icon: Clock },
  em_elaboracao: { label: 'Em elaboração', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/30', icon: FileText },
  enviado: { label: 'Enviado', color: 'text-blue-400', bg: 'bg-blue-500/10 border border-blue-500/30', icon: CheckCircle },
  aceito: { label: 'Aceito', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border border-emerald-500/30', icon: CheckCircle },
  rejeitado: { label: 'Rejeitado', color: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30', icon: XCircle },
};

function getSemaforo(obrigacao) {
  if (obrigacao.status === 'aceito') return null;
  if (!obrigacao.data_limite) return null;
  const days = differenceInDays(parseISO(obrigacao.data_limite), new Date());
  if (days < 0) return 'vermelho';
  if (days <= 7) return 'amarelo';
  return 'verde';
}

function SemaforoIcon({ cor }) {
  if (!cor) return <div className="w-3 h-3 rounded-full bg-emerald-400 opacity-40" />;
  const colors = { verde: 'bg-emerald-400', amarelo: 'bg-yellow-400', vermelho: 'bg-red-500 animate-pulse' };
  return <div className={`w-3 h-3 rounded-full ${colors[cor]}`} title={cor} />;
}

function KPIBox({ icon: Icon, label, value, color, bg }) {
  return (
    <Card className="bg-slate-800/60 border-slate-700/50">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-slate-400">{label}</p>
          <p className="text-xl font-bold text-white">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function scoreConformidade(obrigacoes) {
  if (!obrigacoes.length) return 100;
  const total = obrigacoes.length;
  const aceitos = obrigacoes.filter(o => o.status === 'aceito').length;
  const atrasados = obrigacoes.filter(o => getSemaforo(o) === 'vermelho').length;
  const rejeitados = obrigacoes.filter(o => o.status === 'rejeitado').length;
  const score = Math.round(((aceitos / total) * 60) + ((1 - atrasados / total) * 25) + ((1 - rejeitados / total) * 15));
  return Math.min(100, Math.max(0, score));
}

export default function ObrigacoesLegais({ projectId, project }) {
  const { user: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [tab, setTab] = useState('por_tipo'); // por_tipo | tabela | calendario
  const [filters, setFilters] = useState({ nome: '', status: 'todos', prazo: 'todos', competencia: '' });
  const [search, setSearch] = useState('');

  const { data: obrigacoes = [], isLoading } = useQuery({
    queryKey: ['obrigacoes', projectId],
    queryFn: () => base44.entities.ObrigacaoLegal.filter({ project_id: projectId }),
    enabled: !!projectId,
    refetchInterval: 30000,
  });

  const initDefaults = async () => {
    const existing = obrigacoes.map(o => o.nome);
    const missing = OBRIGACOES_PADRAO.filter(n => !existing.includes(n));
    if (missing.length === 0) return;
    const now = new Date();
    const comp = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const compAnual = `01/${now.getFullYear() + 1}`;
    await Promise.all(missing.map(nome =>
      base44.entities.ObrigacaoLegal.create({
        project_id: projectId,
        nome,
        competencia: OBRIGACOES_ANUAIS.includes(nome) ? compAnual : comp,
        status: 'nao_iniciado',
        is_padrao: true,
      })
    ));
    queryClient.invalidateQueries(['obrigacoes', projectId]);
  };

  // Auto-inicializa padrões faltantes (inclusive em projetos já existentes)
  const initialized = React.useRef(false);
  React.useEffect(() => {
    if (!isLoading && !initialized.current) {
      const existing = obrigacoes.map(o => o.nome);
      const missing = OBRIGACOES_PADRAO.filter(n => !existing.includes(n));
      if (missing.length > 0) {
        initialized.current = true;
        initDefaults();
      }
    }
  }, [isLoading, obrigacoes]);

  const handleSave = async (data) => {
    if (editing) {
      await base44.entities.ObrigacaoLegal.update(editing.id, data);
    } else {
      await base44.entities.ObrigacaoLegal.create({ ...data, project_id: projectId });
    }
    queryClient.invalidateQueries(['obrigacoes', projectId]);
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir esta obrigação?')) return;
    await base44.entities.ObrigacaoLegal.delete(id);
    queryClient.invalidateQueries(['obrigacoes', projectId]);
  };

  const openEdit = (o) => { setEditing(o); setModalOpen(true); };
  const openNew = () => { setEditing(null); setModalOpen(true); };

  // KPIs
  const pendentes = obrigacoes.filter(o => o.status === 'nao_iniciado').length;
  const emElaboracao = obrigacoes.filter(o => o.status === 'em_elaboracao').length;
  const enviados = obrigacoes.filter(o => o.status === 'enviado').length;
  const aceitos = obrigacoes.filter(o => o.status === 'aceito').length;
  const rejeitados = obrigacoes.filter(o => o.status === 'rejeitado').length;
  const proximosPrazo = obrigacoes.filter(o => getSemaforo(o) === 'amarelo').length;
  const score = scoreConformidade(obrigacoes);

  // Filtered
  const filtered = useMemo(() => {
    return obrigacoes.filter(o => {
      if (search && !o.nome.toLowerCase().includes(search.toLowerCase()) && !(o.responsavel || '').toLowerCase().includes(search.toLowerCase())) return false;
      if (filters.status !== 'todos' && o.status !== filters.status) return false;
      if (filters.competencia && !o.competencia?.includes(filters.competencia)) return false;
      if (filters.prazo !== 'todos') {
        const sem = getSemaforo(o);
        if (filters.prazo === 'verde' && sem !== 'verde') return false;
        if (filters.prazo === 'amarelo' && sem !== 'amarelo') return false;
        if (filters.prazo === 'vermelho' && sem !== 'vermelho') return false;
      }
      return true;
    });
  }, [obrigacoes, search, filters]);

  // Calendar grouping
  const calendarGroups = useMemo(() => {
    const groups = {};
    obrigacoes.forEach(o => {
      if (!o.data_limite) return;
      const key = o.data_limite.slice(0, 7);
      if (!groups[key]) groups[key] = [];
      groups[key].push(o);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [obrigacoes]);

  const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400';
  const scoreBg = score >= 80 ? 'bg-emerald-500/10' : score >= 60 ? 'bg-yellow-500/10' : 'bg-red-500/10';

  if (isLoading) {
    return <div className="flex items-center justify-center h-40"><div className="w-7 h-7 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Obrigações Legais</h2>
          <p className="text-sm text-slate-400">Controle de entregas obrigatórias e conformidade regulatória</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${scoreBg} border border-slate-700/50`}>
            <Award className={`w-4 h-4 ${scoreColor}`} />
            <span className="text-xs text-slate-400">Score</span>
            <span className={`text-lg font-bold ${scoreColor}`}>{score}</span>
          </div>
          <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-sm" size="sm">
            <Plus className="w-4 h-4 mr-1" /> Nova Obrigação
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPIBox icon={Clock} label="Pendentes" value={pendentes} color="text-slate-400" bg="bg-slate-700/60" />
        <KPIBox icon={FileText} label="Em elaboração" value={emElaboracao} color="text-yellow-400" bg="bg-yellow-500/10" />
        <KPIBox icon={TrendingUp} label="Enviados" value={enviados} color="text-blue-400" bg="bg-blue-500/10" />
        <KPIBox icon={CheckCircle} label="Aceitos" value={aceitos} color="text-emerald-400" bg="bg-emerald-500/10" />
        <KPIBox icon={XCircle} label="Rejeitados" value={rejeitados} color="text-red-400" bg="bg-red-500/10" />
        <KPIBox icon={AlertTriangle} label="Próx. do prazo" value={proximosPrazo} color="text-orange-400" bg="bg-orange-500/10" />
      </div>

      {/* CND Status */}
      {project && (
        <CNDStatusCard project={project} obrigacoes={obrigacoes} showToggle />
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/60 rounded-lg p-1 w-fit">
        {[{ id: 'por_tipo', label: '📋 Por Obrigação' }, { id: 'tabela', label: 'Tabela Geral' }, { id: 'calendario', label: 'Calendário' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'por_tipo' && (
        <ObrigacoesPorTipo obrigacoes={obrigacoes} projectId={projectId} currentUser={currentUser} />
      )}

      {tab === 'tabela' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="bg-slate-800 border-slate-700 pl-8 h-8 text-sm w-40" />
            </div>
            <Select value={filters.status} onValueChange={v => setFilters(p => ({ ...p, status: v }))}>
              <SelectTrigger className="bg-slate-800 border-slate-700 h-8 text-xs w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="nao_iniciado">Não iniciado</SelectItem>
                <SelectItem value="em_elaboracao">Em elaboração</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="aceito">Aceito</SelectItem>
                <SelectItem value="rejeitado">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.prazo} onValueChange={v => setFilters(p => ({ ...p, prazo: v }))}>
              <SelectTrigger className="bg-slate-800 border-slate-700 h-8 text-xs w-36"><SelectValue placeholder="Prazo" /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="todos">Todos os prazos</SelectItem>
                <SelectItem value="verde">✅ No prazo</SelectItem>
                <SelectItem value="amarelo">⚠️ Atenção</SelectItem>
                <SelectItem value="vermelho">🔴 Crítico</SelectItem>
              </SelectContent>
            </Select>
            <Input value={filters.competencia} onChange={e => setFilters(p => ({ ...p, competencia: e.target.value }))}
              placeholder="Competência..." className="bg-slate-800 border-slate-700 h-8 text-xs w-28" />
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-700/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-3 py-3 text-left w-8"></th>
                  <th className="px-3 py-3 text-left">Obrigação</th>
                  <th className="px-3 py-3 text-left">Competência</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="px-3 py-3 text-left">Responsável</th>
                  <th className="px-3 py-3 text-left">Data Limite</th>
                  <th className="px-3 py-3 text-left">Data Envio</th>
                  <th className="px-3 py-3 text-right">Dias Restantes</th>
                  <th className="px-3 py-3 text-left">Observações</th>
                  <th className="px-3 py-3 text-right w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-10 text-slate-500">Nenhuma obrigação encontrada.</td></tr>
                )}
                {filtered.map(o => {
                  const scfg = STATUS_CFG[o.status] || STATUS_CFG.nao_iniciado;
                  const sem = getSemaforo(o);
                  const days = o.data_limite ? differenceInDays(parseISO(o.data_limite), new Date()) : null;
                  const StatusIcon = scfg.icon;
                  return (
                    <tr key={o.id} className="border-t border-slate-700/40 hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 py-3"><SemaforoIcon cor={sem} /></td>
                      <td className="px-3 py-3 font-medium text-white">{o.nome}</td>
                      <td className="px-3 py-3 text-slate-300">{o.competencia}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${scfg.bg} ${scfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {scfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-300">{o.responsavel || '—'}</td>
                      <td className="px-3 py-3 text-slate-300">
                        {o.data_limite ? format(parseISO(o.data_limite), 'dd/MM/yyyy') : '—'}
                      </td>
                      <td className="px-3 py-3 text-slate-300">
                        {o.data_envio ? format(parseISO(o.data_envio), 'dd/MM/yyyy') : '—'}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {days === null ? <span className="text-slate-500">—</span> : (
                          <span className={`font-semibold ${days < 0 ? 'text-red-400' : days <= 7 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                            {days < 0 ? `${Math.abs(days)}d atraso` : days === 0 ? 'Hoje' : `${days}d`}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-400 max-w-[180px]">
                        <span className="truncate block">{o.observacoes || '—'}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(o)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(o.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'calendario' && (
        <div className="space-y-4">
          {calendarGroups.length === 0 ? (
            <div className="text-center py-10 text-slate-500">Nenhuma obrigação com data limite definida.</div>
          ) : (
            calendarGroups.map(([month, items]) => {
              let label = month;
              try { label = format(parseISO(`${month}-01`), 'MMMM yyyy', { locale: ptBR }); } catch {}
              return (
                <Card key={month} className="bg-slate-800/60 border-slate-700/50">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      <span className="capitalize">{label}</span>
                      <span className="text-xs text-slate-500">({items.length} obrigação{items.length !== 1 ? 'ões' : ''})</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {items.map(o => {
                        const sem = getSemaforo(o);
                        const scfg = STATUS_CFG[o.status] || STATUS_CFG.nao_iniciado;
                        const days = o.data_limite ? differenceInDays(parseISO(o.data_limite), new Date()) : null;
                        const borderColor = sem === 'vermelho' ? 'border-red-500/50' : sem === 'amarelo' ? 'border-yellow-500/50' : sem === 'verde' ? 'border-emerald-500/30' : 'border-slate-700/50';
                        return (
                          <div key={o.id} className={`bg-slate-700/40 rounded-xl p-3 border ${borderColor} cursor-pointer hover:bg-slate-700/60 transition-colors`} onClick={() => openEdit(o)}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <SemaforoIcon cor={sem} />
                                <span className="font-semibold text-white text-sm">{o.nome}</span>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${scfg.bg} ${scfg.color}`}>{scfg.label}</span>
                            </div>
                            <p className="text-xs text-slate-400">{o.competencia} {o.responsavel ? `• ${o.responsavel}` : ''}</p>
                            {days !== null && (
                              <p className={`text-xs font-medium mt-1 ${days < 0 ? 'text-red-400' : days <= 7 ? 'text-yellow-400' : 'text-slate-400'}`}>
                                {days < 0 ? `⚠️ ${Math.abs(days)}d em atraso` : days === 0 ? '⏰ Vence hoje' : `${days}d restantes`}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      <ObrigacaoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        obrigacao={editing}
        onSave={handleSave}
        currentUser={currentUser}
      />
    </div>
  );
}