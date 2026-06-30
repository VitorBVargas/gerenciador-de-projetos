import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  CalendarDays, Plus, Edit, Trash2, ChevronRight, CheckCircle,
  Clock, XCircle, RefreshCw, FileText, AlertCircle, Users,
  BookOpen, Search, Video, Target
} from 'lucide-react';
import { format, parseISO, isAfter, isBefore, isToday, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReuniaoModal from '../components/reunioes/ReuniaoModal';
import AnotacoesEditor from '../components/reunioes/AnotacoesEditor';
import DecisaoModal from '../components/reunioes/DecisaoModal';
import BibliotecaDocumental from '../components/reunioes/BibliotecaDocumental';
import RelatorioOperacionalIA from '../components/reunioes/RelatorioOperacionalIA';
import { useCurrentUser } from '@/lib/permissions';

const STATUS_CFG = {
  agendada:   { label: 'Agendada',   color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/30',    icon: Clock },
  realizada:  { label: 'Realizada',  color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle },
  cancelada:  { label: 'Cancelada',  color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30',      icon: XCircle },
  reagendada: { label: 'Reagendada', color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/30', icon: RefreshCw },
};

const TIPO_LABEL = { alinhamento: 'Alinhamento', revisao: 'Revisão', apresentacao: 'Apresentação', emergencial: 'Emergencial', kickoff: 'Kickoff', outro: 'Outro' };

const TABS = ['dashboard', 'reunioes', 'relatorio_ia', 'decisoes', 'documentos'];
const TAB_LABELS = { dashboard: 'Dashboard', reunioes: 'Reuniões', relatorio_ia: 'Relatório IA', decisoes: 'Observações', documentos: 'Documentos' };

function KPICard({ icon: Icon, label, value, color = 'text-blue-400', bg = 'bg-blue-500/10' }) {
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

export default function SustentacaoReunioes() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');
  const { user: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState('dashboard');
  const [reuModalOpen, setReuModalOpen] = useState(false);
  const [editingReu, setEditingReu] = useState(null);
  const [selectedReu, setSelectedReu] = useState(null);
  const [decModalOpen, setDecModalOpen] = useState(false);
  const [editingDec, setEditingDec] = useState(null);
  const [search, setSearch] = useState('');

  const { data: reunioes = [] } = useQuery({
    queryKey: ['reunioes', projectId],
    queryFn: () => base44.entities.Reuniao.filter({ project_id: projectId }),
    enabled: !!projectId, refetchInterval: 30000,
  });

  const { data: decisoes = [] } = useQuery({
    queryKey: ['decisoes', projectId],
    queryFn: () => base44.entities.Decisao.filter({ project_id: projectId }),
    enabled: !!projectId, refetchInterval: 30000,
  });

  const { data: relatorios = [] } = useQuery({
    queryKey: ['relatorios', projectId],
    queryFn: () => base44.entities.RelatorioOperacional.filter({ project_id: projectId }),
    enabled: !!projectId, refetchInterval: 30000,
  });

  const now = new Date();
  const proximas = reunioes.filter(r => r.status === 'agendada' && r.data && isAfter(parseISO(r.data), now)).sort((a, b) => a.data.localeCompare(b.data));
  const realizadas = reunioes.filter(r => r.status === 'realizada');
  const pendentes = decisoes.filter(d => d.status === 'pendente').length;

  const saveReuniao = async (data) => {
    if (editingReu) {
      await base44.entities.Reuniao.update(editingReu.id, data);
    } else {
      if (!projectId) { alert('Selecione um projeto para criar uma reunião.'); return; }
      await base44.entities.Reuniao.create({ ...data, project_id: projectId });
    }
    queryClient.invalidateQueries(['reunioes', projectId]);
  };

  const deleteReuniao = async (id) => {
    if (!confirm('Excluir esta reunião?')) return;
    await base44.entities.Reuniao.delete(id);
    queryClient.invalidateQueries(['reunioes', projectId]);
    if (selectedReu?.id === id) setSelectedReu(null);
  };

  const saveDecisao = async (data) => {
    if (editingDec) {
      await base44.entities.Decisao.update(editingDec.id, data);
    } else {
      await base44.entities.Decisao.create({ ...data, project_id: projectId });
    }
    queryClient.invalidateQueries(['decisoes', projectId]);
  };

  const deleteDecisao = async (id) => {
    if (!confirm('Excluir esta decisão?')) return;
    await base44.entities.Decisao.delete(id);
    queryClient.invalidateQueries(['decisoes', projectId]);
  };

  const filteredReunioes = reunioes.filter(r =>
    !search || r.titulo?.toLowerCase().includes(search.toLowerCase()) ||
    r.participantes?.toLowerCase().includes(search.toLowerCase()) ||
    r.responsavel?.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => b.data?.localeCompare(a.data || '') || 0);

  const openReu = (r = null) => { setEditingReu(r); setReuModalOpen(true); };
  const openDec = (d = null) => { setEditingDec(d); setDecModalOpen(true); };

  // Merge selected reunion with latest from query (for anotacoes realtime)
  const selectedReuFresh = selectedReu ? reunioes.find(r => r.id === selectedReu.id) || selectedReu : null;

  const IMPACTO_CFG = {
    baixo: { label: 'Baixo', color: 'text-slate-400', bg: 'bg-slate-700/60' },
    medio: { label: 'Médio', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    alto:  { label: 'Alto',  color: 'text-red-400',   bg: 'bg-red-500/10' },
  };
  const DEC_STATUS = {
    pendente:    { label: 'Pendente',    color: 'text-slate-400' },
    em_andamento:{ label: 'Em andamento',color: 'text-blue-400' },
    concluida:   { label: 'Concluída',   color: 'text-emerald-400' },
    cancelada:   { label: 'Cancelada',   color: 'text-red-400' },
  };

  return (
    <div className="p-6 lg:p-8 min-h-screen text-white space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-6 h-6 text-green-400" />
          <div>
            <h1 className="text-2xl font-bold">Reuniões e Relatórios</h1>
            <p className="text-sm text-slate-400">Governança, memória e documentação da sustentação</p>
          </div>
        </div>
        <Button onClick={() => openReu()} className="bg-blue-600 hover:bg-blue-700" size="sm">
          <Plus className="w-4 h-4 mr-1" /> Nova Reunião
        </Button>
      </div>

      {/* Próximas reuniões banner */}
      {proximas.length > 0 && (
        <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">Próximas Reuniões</p>
          <div className="flex flex-wrap gap-3">
            {proximas.slice(0, 3).map(r => {
              const days = differenceInDays(parseISO(r.data), now);
              return (
                <div key={r.id} className="flex items-center gap-3 bg-slate-800/60 rounded-xl px-4 py-2.5 border border-blue-500/20 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => { setSelectedReu(r); setTab('reunioes'); }}>
                  <CalendarDays className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">{r.titulo}</p>
                    <p className="text-xs text-slate-400">
                      {format(parseISO(r.data), 'dd/MM', { locale: ptBR })}
                      {r.horario && ` às ${r.horario}`}
                      {' '}• <span className={days === 0 ? 'text-yellow-400' : days <= 2 ? 'text-orange-400' : 'text-slate-400'}>{days === 0 ? 'Hoje' : `em ${days}d`}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/60 rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {tab === 'dashboard' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPICard icon={CheckCircle} label="Realizadas" value={realizadas.length} color="text-emerald-400" bg="bg-emerald-500/10" />
            <KPICard icon={CalendarDays} label="Agendadas" value={proximas.length} color="text-blue-400" bg="bg-blue-500/10" />
            <KPICard icon={FileText} label="Documentos" value={relatorios.length} color="text-purple-400" bg="bg-purple-500/10" />
            <KPICard icon={Target} label="Decisões" value={decisoes.length} color="text-cyan-400" bg="bg-cyan-500/10" />
            <KPICard icon={AlertCircle} label="Dec. Pendentes" value={pendentes} color="text-yellow-400" bg="bg-yellow-500/10" />
            <KPICard icon={Users} label="Participantes únicos"
              value={[...new Set(reunioes.flatMap(r => (r.participantes || '').split(',').map(p => p.trim()).filter(Boolean)))].length}
              color="text-slate-300" bg="bg-slate-700/60" />
          </div>

          {/* Últimas reuniões realizadas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Últimas Reuniões</h3>
              {realizadas.length === 0 ? <p className="text-slate-500 text-sm">Nenhuma reunião realizada.</p> : (
                <div className="space-y-2">
                  {realizadas.sort((a, b) => b.data?.localeCompare(a.data || '')).slice(0, 5).map(r => (
                    <div key={r.id} className="flex items-center gap-3 cursor-pointer hover:bg-slate-700/40 rounded-lg px-2 py-2 transition-colors" onClick={() => { setSelectedReu(r); setTab('reunioes'); }}>
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{r.titulo}</p>
                        <p className="text-xs text-slate-400">{r.data ? format(parseISO(r.data), 'dd/MM/yyyy') : '—'} {r.responsavel ? `• ${r.responsavel}` : ''}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Decisões recentes */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Observações Recentes</h3>
                <button onClick={() => setTab('decisoes')} className="text-xs text-blue-400 hover:text-blue-300">Ver todas</button>
              </div>
              {decisoes.length === 0 ? <p className="text-slate-500 text-sm">Nenhuma decisão registrada.</p> : (
                <div className="space-y-2">
                  {[...decisoes].sort((a, b) => b.data?.localeCompare(a.data || '')).slice(0, 5).map(d => {
                    const icfg = IMPACTO_CFG[d.impacto] || IMPACTO_CFG.medio;
                    const scfg = DEC_STATUS[d.status] || DEC_STATUS.pendente;
                    return (
                      <div key={d.id} className="bg-slate-700/40 rounded-lg px-3 py-2.5">
                        <p className="text-sm text-white line-clamp-2">{d.descricao}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs ${scfg.color}`}>{scfg.label}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${icfg.bg} ${icfg.color}`}>{icfg.label}</span>
                          {d.responsavel && <span className="text-xs text-slate-500">{d.responsavel}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── REUNIÕES ── */}
      {tab === 'reunioes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Lista */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar reuniões..." className="bg-slate-800 border-slate-700 pl-8 h-8 text-sm" />
            </div>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {filteredReunioes.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">Nenhuma reunião encontrada.</div>
              )}
              {filteredReunioes.map(r => {
                const scfg = STATUS_CFG[r.status] || STATUS_CFG.agendada;
                const StatusIcon = scfg.icon;
                const isSelected = selectedReu?.id === r.id;
                return (
                  <div key={r.id} onClick={() => setSelectedReu(r)}
                    className={`rounded-xl px-4 py-3 border cursor-pointer transition-all ${isSelected ? 'bg-blue-600/20 border-blue-500/50' : 'bg-slate-800/60 border-slate-700/40 hover:bg-slate-800 hover:border-slate-600'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{r.titulo}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {r.data ? format(parseISO(r.data), 'dd/MM/yyyy') : '—'}
                          {r.horario && ` ${r.horario}`}
                          {r.tipo ? ` • ${TIPO_LABEL[r.tipo] || r.tipo}` : ''}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${scfg.bg} ${scfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {scfg.label}
                      </span>
                    </div>
                    {r.participantes && <p className="text-xs text-slate-500 mt-1 truncate"><Users className="w-3 h-3 inline mr-1" />{r.participantes}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detalhe */}
          <div className="lg:col-span-2">
            {!selectedReu ? (
              <div className="flex items-center justify-center h-64 text-slate-500">
                <div className="text-center">
                  <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Selecione uma reunião para ver detalhes e anotações.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Header do detalhe */}
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h2 className="text-lg font-bold text-white">{selectedReuFresh?.titulo}</h2>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-400">
                        {selectedReuFresh?.data && <span>{format(parseISO(selectedReuFresh.data), 'dd/MM/yyyy', { locale: ptBR })}</span>}
                        {selectedReuFresh?.horario && <span>{selectedReuFresh.horario}</span>}
                        {selectedReuFresh?.tipo && <span>{TIPO_LABEL[selectedReuFresh.tipo]}</span>}
                        {selectedReuFresh?.responsavel && <span>{selectedReuFresh.responsavel}</span>}
                      </div>
                      {selectedReuFresh?.participantes && (
                        <p className="text-xs text-slate-500 mt-1"><Users className="w-3 h-3 inline mr-1" />{selectedReuFresh.participantes}</p>
                      )}
                      {selectedReuFresh?.objetivo && <p className="text-xs text-slate-400 mt-2 italic">🎯 {selectedReuFresh.objetivo}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {selectedReuFresh?.link_gravacao && (
                        <a href={selectedReuFresh.link_gravacao} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                          <Video className="w-4 h-4" />
                        </a>
                      )}
                      <button onClick={() => openReu(selectedReuFresh)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteReuniao(selectedReuFresh.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                {/* Anotações */}
                <AnotacoesEditor reuniao={selectedReuFresh} currentUser={currentUser} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── RELATÓRIO IA ── */}
      {tab === 'relatorio_ia' && (
        <RelatorioOperacionalIA projectId={projectId} currentUser={currentUser} />
      )}

      {/* ── OBSERVAÇÕES ── */}
      {tab === 'decisoes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Observações Registradas</h2>
            <Button onClick={() => openDec()} size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-1" /> Registrar Observação
            </Button>
          </div>
          {decisoes.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-slate-800/40 rounded-xl border border-slate-700/40">
              <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma observação registrada.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...decisoes].sort((a, b) => b.data?.localeCompare(a.data || '')).map(d => {
                const icfg = IMPACTO_CFG[d.impacto] || IMPACTO_CFG.medio;
                const scfg = DEC_STATUS[d.status] || DEC_STATUS.pendente;
                return (
                  <div key={d.id} className="bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white leading-relaxed">{d.descricao}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {d.data && <span className="text-xs text-slate-500">{format(parseISO(d.data), 'dd/MM/yyyy')}</span>}
                          {d.responsavel && <span className="text-xs text-slate-400">• {d.responsavel}</span>}
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${icfg.bg} ${icfg.color}`}>{icfg.label}</span>
                          <span className={`text-xs font-medium ${scfg.color}`}>{scfg.label}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => openDec(d)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteDecisao(d.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── DOCUMENTOS ── */}
      {tab === 'documentos' && (
        <BibliotecaDocumental relatorios={relatorios} projectId={projectId} currentUser={currentUser} />
      )}

      {/* Modals */}
      <ReuniaoModal open={reuModalOpen} onOpenChange={setReuModalOpen} reuniao={editingReu} onSave={saveReuniao} />
      <DecisaoModal open={decModalOpen} onOpenChange={setDecModalOpen} decisao={editingDec} onSave={saveDecisao} />
    </div>
  );
}