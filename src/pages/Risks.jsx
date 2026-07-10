import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, AlertTriangle, Shield, Pencil, Trash2, Sparkles, Loader2, Brain,
  Clock, CheckCircle, XCircle, Activity, History, ChevronDown, ChevronUp, Info,
  Package, Users, Calendar, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import { format, parseISO, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORY_CFG = {
  operacional:   { label: 'Operacional',   color: 'text-blue-400',   bg: 'bg-blue-500/15 border-blue-500/30' },
  produto:       { label: 'Produto',       color: 'text-cyan-400',   bg: 'bg-cyan-500/15 border-cyan-500/30' },
  cliente:       { label: 'Cliente',       color: 'text-pink-400',   bg: 'bg-pink-500/15 border-pink-500/30' },
  legal:         { label: 'Legal',         color: 'text-red-400',    bg: 'bg-red-500/15 border-red-500/30' },
  governanca:    { label: 'Governança',    color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/30' },
  comunicacao:   { label: 'Comunicação',   color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' },
  capacitacao:   { label: 'Capacitação',   color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30' },
  financeiro:    { label: 'Financeiro',    color: 'text-emerald-400',bg: 'bg-emerald-500/15 border-emerald-500/30' },
  tecnico:       { label: 'Técnico',       color: 'text-indigo-400', bg: 'bg-indigo-500/15 border-indigo-500/30' },
  cronograma:    { label: 'Cronograma',    color: 'text-amber-400',  bg: 'bg-amber-500/15 border-amber-500/30' },
  recurso:       { label: 'Recurso',       color: 'text-violet-400', bg: 'bg-violet-500/15 border-violet-500/30' },
  externo:       { label: 'Externo',       color: 'text-slate-300',  bg: 'bg-slate-500/15 border-slate-500/30' },
};

const STATUS_CFG = {
  aberto:         { label: 'Aberto',        color: 'text-slate-300',  bg: 'bg-slate-600/40',   dot: 'bg-slate-400' },
  em_tratamento:  { label: 'Em Tratamento', color: 'text-blue-400',   bg: 'bg-blue-500/20',    dot: 'bg-blue-400' },
  mitigado:       { label: 'Mitigado',      color: 'text-emerald-400',bg: 'bg-emerald-500/20', dot: 'bg-emerald-400' },
  encerrado:      { label: 'Encerrado',     color: 'text-slate-500',  bg: 'bg-slate-700/40',   dot: 'bg-slate-600' },
  identificado:   { label: 'Identificado',  color: 'text-slate-300',  bg: 'bg-slate-600/40',   dot: 'bg-slate-400' },
  em_monitoramento:{ label: 'Monitorando', color: 'text-yellow-400', bg: 'bg-yellow-500/20',  dot: 'bg-yellow-400' },
};

const CRITICIDADE_CFG = {
  baixo:    { label: 'Baixo',    color: 'text-green-400',  bg: 'bg-green-600',   score: [1,4] },
  moderado: { label: 'Moderado', color: 'text-yellow-400', bg: 'bg-yellow-500',  score: [5,9] },
  alto:     { label: 'Alto',     color: 'text-orange-400', bg: 'bg-orange-500',  score: [10,15] },
  critico:  { label: 'Crítico',  color: 'text-red-400',    bg: 'bg-red-600',     score: [16,25] },
};

const toNum = (v) => { if (typeof v === 'number') return v; const m = { baixa:2, media:3, alta:4, baixo:2, medio:3, alto:4 }; return m[v] || 3; };

const getCriticidade = (p, i) => {
  const s = toNum(p) * toNum(i);
  if (s >= 16) return 'critico';
  if (s >= 10) return 'alto';
  if (s >= 5) return 'moderado';
  return 'baixo';
};

const RISK_SCORE_CFG = (score) => {
  if (score >= 76) return { label: 'Crítico',  color: 'text-red-400',    bg: 'bg-red-600',    level: 'critico' };
  if (score >= 51) return { label: 'Alto',     color: 'text-orange-400', bg: 'bg-orange-500', level: 'alto' };
  if (score >= 26) return { label: 'Moderado', color: 'text-yellow-400', bg: 'bg-yellow-500', level: 'medio' };
  return                  { label: 'Baixo',    color: 'text-green-400',  bg: 'bg-green-600',  level: 'baixo' };
};

// ─── Risk Matrix ──────────────────────────────────────────────────────────────
function RiskMatrix({ risks }) {
  const cellColor = (p, i) => {
    const s = p * i;
    if (s >= 16) return 'bg-red-600/80';
    if (s >= 10) return 'bg-orange-500/70';
    if (s >= 5) return 'bg-yellow-500/70';
    return 'bg-green-600/60';
  };
  const risksInCell = (p, i) => risks.filter(r => toNum(r.probability) === p && toNum(r.impact) === i && r.status !== 'encerrado' && r.status !== 'mitigado');

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white">Mapa de Calor — Impacto × Probabilidade</h3>
      <div className="flex gap-2">
        <div className="flex items-center justify-center" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          <span className="text-xs text-slate-500 whitespace-nowrap">Probabilidade →</span>
        </div>
        <div className="flex-1">
          <div className="grid gap-0.5" style={{ gridTemplateColumns: 'auto repeat(5, 1fr)' }}>
            <div />
            {[1,2,3,4,5].map(i => <div key={i} className="text-center text-xs text-slate-500 pb-1">{i}</div>)}
            {[5,4,3,2,1].map(p => (
              <React.Fragment key={p}>
                <div className="flex items-center justify-end pr-1.5 text-xs text-slate-500">{p}</div>
                {[1,2,3,4,5].map(i => {
                  const cellRisks = risksInCell(p, i);
                  return (
                    <div key={i} className={cn('relative rounded aspect-square flex items-center justify-center transition-all', cellColor(p, i))}>
                      {cellRisks.length > 0 && (
                        <div className="relative group">
                          <div className="w-5 h-5 rounded-full bg-white/90 flex items-center justify-center text-xs font-bold text-slate-900 cursor-pointer shadow">{cellRisks.length}</div>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 min-w-48">
                            <div className="bg-slate-900 border border-slate-700 rounded-lg p-2 shadow-xl text-xs space-y-1">
                              {cellRisks.map((r, idx) => <p key={idx} className="text-white font-medium">{r.title}</p>)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          <div className="text-center text-xs text-slate-500 mt-1">Impacto →</div>
        </div>
      </div>
      <div className="flex gap-3 flex-wrap">
        {[{ label:'Baixo (1-4)', color:'bg-green-600/60' }, { label:'Moderado (5-9)', color:'bg-yellow-500/70' }, { label:'Alto (10-15)', color:'bg-orange-500/70' }, { label:'Crítico (16-25)', color:'bg-red-600/80' }].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={cn('w-3 h-3 rounded', l.color)} />
            <span className="text-xs text-slate-400">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Risk Card ────────────────────────────────────────────────────────────────
function RiskCard({ risk, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const score = toNum(risk.probability) * toNum(risk.impact);
  const crit = risk.criticidade || getCriticidade(risk.probability, risk.impact);
  const critCfg = CRITICIDADE_CFG[crit] || CRITICIDADE_CFG.moderado;
  const catCfg = CATEGORY_CFG[risk.category] || CATEGORY_CFG.tecnico;
  const statusCfg = STATUS_CFG[risk.status] || STATUS_CFG.aberto;
  const isIA = ['ia', 'ia_dinamico', 'ia_sustentacao'].includes(risk.source);

  return (
    <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl group hover:border-slate-600 transition-all">
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className={cn('w-1.5 h-full rounded-full flex-shrink-0 mt-1.5', critCfg.bg)} style={{ minHeight: 16 }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  <Badge className={cn('border text-xs', catCfg.bg, catCfg.color)}>{catCfg.label}</Badge>
                  <Badge className={cn('text-white text-xs', critCfg.bg)}>{critCfg.label}</Badge>
                  {isIA && <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs gap-1"><Sparkles className="w-2.5 h-2.5" /> IA</Badge>}
                  <span className={cn('text-xs font-medium', statusCfg.color)}>{statusCfg.label}</span>
                </div>
                <h3 className="font-semibold text-white text-sm">{risk.title}</h3>
                {risk.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{risk.description}</p>}
                <div className="flex gap-3 text-xs mt-1.5 text-slate-500">
                  <span>P: <span className="text-slate-300">{toNum(risk.probability)}/5</span></span>
                  <span>I: <span className="text-slate-300">{toNum(risk.impact)}/5</span></span>
                  <span>Score: <span className="text-slate-300">{score}</span></span>
                  {risk.responsavel && <span>Resp: <span className="text-slate-300">{risk.responsavel}</span></span>}
                  {risk.origem && <span>Origem: <span className="text-slate-300">{risk.origem}</span></span>}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => setExpanded(!expanded)} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                  {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => onEdit(risk)} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100 transition-opacity">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onDelete(risk)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-slate-700/40 px-4 py-3 space-y-2.5">
          {risk.mitigation && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Plano de Mitigação</p>
              <p className="text-xs text-slate-300 leading-relaxed">{risk.mitigation}</p>
            </div>
          )}
          {risk.ai_rationale && (
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
              <p className="text-xs font-semibold text-purple-400 mb-1 flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Justificativa da IA</p>
              <p className="text-xs text-slate-300 leading-relaxed">{risk.ai_rationale}</p>
              {risk.ai_evidence && <p className="text-xs text-slate-400 mt-1 italic">Evidências: {risk.ai_evidence}</p>}
            </div>
          )}
          {risk.history?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Histórico</p>
              <div className="space-y-1.5">
                {[...risk.history].reverse().slice(0, 5).map((h, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                    <span className="text-slate-600 flex-shrink-0">{h.date ? format(parseISO(h.date), 'dd/MM/yy') : ''}</span>
                    <span>{h.action}</span>
                    {h.rationale && <span className="text-slate-500 italic truncate">— {h.rationale}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Risk Form Modal ──────────────────────────────────────────────────────────
function RiskFormModal({ open, onOpenChange, risk, onSave, projectId }) {
  const [form, setForm] = useState({ title:'', description:'', category:'operacional', origem:'', probability:3, impact:3, mitigation:'', responsavel:'', status:'aberto' });

  React.useEffect(() => {
    if (risk) setForm({ title: risk.title||'', description: risk.description||'', category: risk.category||'operacional', origem: risk.origem||'', probability: toNum(risk.probability), impact: toNum(risk.impact), mitigation: risk.mitigation||'', responsavel: risk.responsavel||risk.suggested_owner||'', status: risk.status||'aberto' });
    else setForm({ title:'', description:'', category:'operacional', origem:'manual', probability:3, impact:3, mitigation:'', responsavel:'', status:'aberto' });
  }, [risk, open]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const crit = getCriticidade(form.probability, form.impact);
  const critCfg = CRITICIDADE_CFG[crit];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{risk ? 'Editar Risco' : 'Novo Risco Manual'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-slate-300 text-xs">Título *</Label>
            <Input value={form.title} onChange={e => set('title', e.target.value)} className="bg-slate-800 border-slate-700" placeholder="Título do risco" />
          </div>
          <div className="space-y-1">
            <Label className="text-slate-300 text-xs">Descrição</Label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} className="bg-slate-800 border-slate-700 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Categoria</Label>
              <Select value={form.category} onValueChange={v => set('category', v)}>
                <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {Object.entries(CATEGORY_CFG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {Object.entries(STATUS_CFG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Responsável</Label>
              <Input value={form.responsavel} onChange={e => set('responsavel', e.target.value)} placeholder="Nome" className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Origem</Label>
              <Input value={form.origem} onChange={e => set('origem', e.target.value)} placeholder="atividades, chamados..." className="bg-slate-800 border-slate-700" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {['probability', 'impact'].map(field => (
              <div key={field} className="space-y-1">
                <div className="flex justify-between">
                  <Label className="text-slate-300 text-xs">{field === 'probability' ? 'Probabilidade' : 'Impacto'}</Label>
                  <span className="text-xs font-bold text-white">{form[field]}/5</span>
                </div>
                <input type="range" min={1} max={5} value={form[field]} onChange={e => set(field, Number(e.target.value))} className="w-full h-2 rounded-lg cursor-pointer" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-3 py-2">
            <span className="text-xs text-slate-400">Criticidade calculada:</span>
            <Badge className={cn('text-white text-xs', critCfg.bg)}>{critCfg.label}</Badge>
            <span className="text-xs text-slate-500">Score: {form.probability * form.impact}</span>
          </div>
          <div className="space-y-1">
            <Label className="text-slate-300 text-xs">Plano de Mitigação</Label>
            <Textarea value={form.mitigation} onChange={e => set('mitigation', e.target.value)} rows={3} className="bg-slate-800 border-slate-700 resize-none" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400">Cancelar</Button>
          <Button onClick={() => onSave({ ...form, project_id: projectId, source: 'manual', criticidade: getCriticidade(form.probability, form.impact) })} disabled={!form.title} className="bg-blue-600 hover:bg-blue-700">
            {risk ? 'Salvar' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Risks() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('dashboard');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ativos');
  const [filterCrit, setFilterCrit] = useState('todos');

  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list('-created_date') });
  const { data: risks = [], isLoading } = useQuery({ queryKey: ['risks', projectId], queryFn: () => projectId ? base44.entities.Risk.filter({ project_id: projectId }) : [], enabled: !!projectId });
  const { data: analysisLogs = [] } = useQuery({ queryKey: ['risk_logs', projectId], queryFn: () => projectId ? base44.entities.RiskAnalysisLog.filter({ project_id: projectId }) : [], enabled: !!projectId });
  const { data: products = [] } = useQuery({ queryKey: ['products', projectId], queryFn: () => projectId ? base44.entities.Product.filter({ project_id: projectId }) : [], enabled: !!projectId });
  const { data: team = [] } = useQuery({ queryKey: ['team', projectId], queryFn: () => projectId ? base44.entities.TeamMember.filter({ project_id: projectId }) : [], enabled: !!projectId });
  const { data: timelineEvents = [] } = useQuery({ queryKey: ['timeline', projectId], queryFn: () => projectId ? base44.entities.TimelineEvent.filter({ project_id: projectId }) : [], enabled: !!projectId });

  const activeProject = projects.find(p => p.id === projectId);

  const createMutation = useMutation({ mutationFn: (d) => base44.entities.Risk.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['risks', projectId] }); setModalOpen(false); } });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => base44.entities.Risk.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['risks', projectId] }); setModalOpen(false); setSelectedRisk(null); } });
  const deleteMutation = useMutation({ mutationFn: (id) => base44.entities.Risk.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['risks', projectId] }); setDeleteDialog(null); } });

  const aiMutation = useMutation({
    mutationFn: async () => {
      const fn = activeProject?.project_type === 'agil' ? 'generateAgilRisksAI' : 'generateProjectRisksAI';
      const res = await base44.functions.invoke(fn, { project_id: projectId, replace: false });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['risks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['risk_logs', projectId] });
      toast.success(`IA gerou ${data?.risks_created || 0} novos riscos`, { description: data?.executive_summary || 'Análise concluída.' });
    },
    onError: (err) => toast.error('Falha na análise', { description: err.message }),
  });

  const handleSave = (data) => {
    if (selectedRisk) updateMutation.mutate({ id: selectedRisk.id, data });
    else createMutation.mutate(data);
  };

  // Detectar se é a primeira análise (sem riscos IA ainda)
  const hasIARisks = risks.some(r => ['ia', 'ia_dinamico', 'ia_sustentacao'].includes(r.source));
  const isFirstAnalysis = !hasIARisks && risks.length === 0;

  // KPIs
  const activeRisks = risks.filter(r => !['encerrado', 'mitigado'].includes(r.status));
  const critRisks = risks.filter(r => (r.criticidade || getCriticidade(r.probability, r.impact)) === 'critico' && !['encerrado', 'mitigado'].includes(r.status));
  const highRisks = risks.filter(r => (r.criticidade || getCriticidade(r.probability, r.impact)) === 'alto' && !['encerrado', 'mitigado'].includes(r.status));
  const mitigatedRisks = risks.filter(r => r.status === 'mitigado');
  const closedRisks = risks.filter(r => r.status === 'encerrado');
  const lastLog = analysisLogs.length > 0 ? [...analysisLogs].sort((a, b) => b.executed_at?.localeCompare(a.executed_at || '')).find(Boolean) : null;

  // Score local calculation
  const localScore = Math.min(100, critRisks.length * 20 + highRisks.length * 10 + activeRisks.filter(r => ['moderado'].includes(r.criticidade || getCriticidade(r.probability, r.impact))).length * 4);
  const riskScore = activeProject?.risk_score ?? localScore;
  const scoreCfg = RISK_SCORE_CFG(riskScore);

  // Filtered risks list
  const filteredRisks = risks.filter(r => {
    const crit = r.criticidade || getCriticidade(r.probability, r.impact);
    if (filterStatus === 'ativos' && ['encerrado', 'mitigado'].includes(r.status)) return false;
    if (filterStatus === 'mitigados' && !['mitigado', 'encerrado'].includes(r.status)) return false;
    if (filterCrit !== 'todos' && crit !== filterCrit) return false;
    return true;
  }).sort((a, b) => (toNum(b.probability) * toNum(b.impact)) - (toNum(a.probability) * toNum(a.impact)));

  if (!projectId) return (
    <div className="p-8 text-center">
      <AlertTriangle className="w-12 h-12 mx-auto text-slate-600 mb-4" />
      <p className="text-slate-400">Selecione um projeto para ver os riscos.</p>
    </div>
  );

  const TABS = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'riscos', label: `Riscos (${activeRisks.length})` },
    { key: 'mapa', label: 'Mapa de Calor' },
    { key: 'monitoramento', label: 'Monitoramento IA' },
  ];

  const nextAnalysis = activeProject?.last_risk_analysis_at
    ? addDays(new Date(activeProject.last_risk_analysis_at), 20)
    : null;

  return (
    <div className="p-6 lg:p-8 space-y-5 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-orange-400" />
            <h1 className="text-2xl font-bold text-white">Gestão de Riscos</h1>
          </div>
          <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-purple-400" />
            Gerenciado pelo <span className="text-purple-300 font-medium">Gerente de Riscos IA</span>
            {activeProject?.last_risk_analysis_at && (
              <span className="text-slate-500">· Última análise: {format(new Date(activeProject.last_risk_analysis_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => aiMutation.mutate()} disabled={aiMutation.isPending} className="bg-purple-600 hover:bg-purple-700">
            {aiMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analisando...</> : <><Sparkles className="w-4 h-4 mr-2" /> Analisar com IA</>}
          </Button>
          <Button onClick={() => { setSelectedRisk(null); setModalOpen(true); }} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <Plus className="w-4 h-4 mr-1" /> Manual
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/60 rounded-lg p-1 w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {tab === 'dashboard' && (
        <div className="space-y-5">
          {/* Card de Análise Inicial */}
          {isFirstAnalysis && (
            <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Brain className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">Análise Inicial de Riscos Recomendada</h3>
                  <p className="text-sm text-slate-300 mb-4">
                    A IA irá analisar automaticamente o contexto do projeto e gerar riscos iniciais baseados em:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                    {(() => {
                      const goLive = timelineEvents.find(t => t.phase === 'go_live' && t.end_date);
                      const diasAteGoLive = goLive ? Math.ceil((new Date(goLive.end_date) - new Date()) / (1000 * 60 * 60 * 24)) : null;
                      const totalVerticais = [...new Set(products.map(p => p.vertical).filter(Boolean))].length;
                      return [
                        { icon: Package, label: 'Produtos', value: `${products.length} produtos` },
                        { icon: Users, label: 'Equipe', value: `${team.length} membros` },
                        { icon: Activity, label: 'Porte da Cidade', value: activeProject?.municipality_size || 'N/A' },
                        { icon: AlertTriangle, label: 'Prioridade', value: activeProject?.priority || 'media' },
                        { icon: Calendar, label: 'Prazo Go-Live', value: diasAteGoLive !== null ? `${diasAteGoLive} dias` : 'Não definido' },
                        { icon: FileText, label: 'Verticais', value: `${totalVerticais} verticais` },
                      ];
                    })().map(item => (
                      <div key={item.label} className="bg-slate-800/60 rounded-lg p-3 flex items-center gap-2">
                        <item.icon className="w-4 h-4 text-blue-400" />
                        <div>
                          <p className="text-xs text-slate-400">{item.label}</p>
                          <p className="text-sm font-medium text-white">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button onClick={() => aiMutation.mutate()} disabled={aiMutation.isPending} className="bg-purple-600 hover:bg-purple-700">
                    {aiMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analisando...</> : <><Sparkles className="w-4 h-4 mr-2" /> Executar Análise Inicial</>}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Score */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-2xl p-6 flex items-center gap-6 flex-wrap">
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#1e293b" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.915" fill="none" strokeWidth="3"
                  className={cn('transition-all', riskScore >= 76 ? 'stroke-red-500' : riskScore >= 51 ? 'stroke-orange-500' : riskScore >= 26 ? 'stroke-yellow-500' : 'stroke-green-500')}
                  strokeDasharray={`${riskScore} ${100 - riskScore}`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-white">{riskScore}</span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Score Geral de Risco</p>
              <p className={cn('text-3xl font-bold mt-1', scoreCfg.color)}>{scoreCfg.label}</p>
              <p className="text-sm text-slate-400 mt-1">{activeRisks.length} riscos ativos · {critRisks.length} críticos</p>
            </div>
            <div className="ml-auto flex-shrink-0 text-right">
              {nextAnalysis && (
                <div className="text-xs text-slate-400">
                  <p>Próxima análise automática</p>
                  <p className="text-white font-medium">{format(nextAnalysis, 'dd/MM/yyyy', { locale: ptBR })}</p>
                </div>
              )}
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Ativos', value: activeRisks.length, color: 'text-white', bg: 'bg-slate-700/60' },
              { label: 'Críticos', value: critRisks.length, color: 'text-red-400', bg: 'bg-red-500/10' },
              { label: 'Altos', value: highRisks.length, color: 'text-orange-400', bg: 'bg-orange-500/10' },
              { label: 'Mitigados', value: mitigatedRisks.length, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Encerrados', value: closedRisks.length, color: 'text-slate-400', bg: 'bg-slate-700/40' },
              { label: 'Análises IA', value: analysisLogs.length, color: 'text-purple-400', bg: 'bg-purple-500/10' },
            ].map(k => (
              <Card key={k.label} className="bg-slate-800/60 border-slate-700/50">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-400">{k.label}</p>
                  <p className={cn('text-2xl font-bold mt-1', k.color)}>{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Top críticos */}
          {critRisks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Riscos Críticos Ativos
              </h3>
              <div className="space-y-2">
                {critRisks.slice(0, 5).map(r => <RiskCard key={r.id} risk={r} onEdit={r => { setSelectedRisk(r); setModalOpen(true); }} onDelete={setDeleteDialog} />)}
              </div>
            </div>
          )}

          {/* Último log */}
          {lastLog && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-purple-400" />
                <p className="text-sm font-semibold text-purple-300">Última Análise da IA</p>
                <span className="text-xs text-slate-400">{lastLog.executed_at ? format(parseISO(lastLog.executed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : ''}</span>
              </div>
              {lastLog.executive_summary && <p className="text-sm text-slate-300 mb-3 leading-relaxed">{lastLog.executive_summary}</p>}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Criados', value: lastLog.risks_created, color: 'text-blue-400' },
                  { label: 'Atualizados', value: lastLog.risks_updated, color: 'text-yellow-400' },
                  { label: 'Mitigados', value: lastLog.risks_mitigated, color: 'text-emerald-400' },
                  { label: 'Encerrados', value: lastLog.risks_closed, color: 'text-slate-400' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className={cn('text-xl font-bold', s.color)}>{s.value ?? 0}</p>
                    <p className="text-xs text-slate-400">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── RISCOS ── */}
      {tab === 'riscos' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="bg-slate-800 border-slate-700 h-8 text-xs w-36"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativos">Ativos</SelectItem>
                <SelectItem value="mitigados">Mitigados/Encerrados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCrit} onValueChange={setFilterCrit}>
              <SelectTrigger className="bg-slate-800 border-slate-700 h-8 text-xs w-36"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="todos">Todas criticidades</SelectItem>
                {Object.entries(CRITICIDADE_CFG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-xs text-slate-400">{filteredRisks.length} riscos</span>
          </div>
          {isLoading ? (
            <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-400" /></div>
          ) : filteredRisks.length === 0 ? (
            <div className="text-center py-16 bg-slate-800/40 rounded-xl border border-slate-700/40">
              <Brain className="w-12 h-12 mx-auto text-purple-400 mb-3" />
              <h3 className="text-white font-semibold mb-1">Nenhum risco encontrado</h3>
              <p className="text-slate-400 text-sm mb-4">Execute a análise de IA ou adicione riscos manualmente.</p>
              <Button onClick={() => aiMutation.mutate()} disabled={aiMutation.isPending} className="bg-purple-600 hover:bg-purple-700">
                {aiMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analisando...</> : <><Sparkles className="w-4 h-4 mr-2" /> Analisar com IA</>}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRisks.map(r => <RiskCard key={r.id} risk={r} onEdit={r => { setSelectedRisk(r); setModalOpen(true); }} onDelete={setDeleteDialog} />)}
            </div>
          )}
        </div>
      )}

      {/* ── MAPA ── */}
      {tab === 'mapa' && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-6">
            <RiskMatrix risks={risks} />
          </CardContent>
        </Card>
      )}

      {/* ── MONITORAMENTO IA ── */}
      {tab === 'monitoramento' && (
        <div className="space-y-4">
          {/* Status atual */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-blue-400" /><p className="text-xs text-slate-400 uppercase tracking-wider">Última Análise</p></div>
              <p className="text-sm font-medium text-white">
                {activeProject?.last_risk_analysis_at ? format(new Date(activeProject.last_risk_analysis_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Nenhuma análise realizada'}
              </p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2"><Activity className="w-4 h-4 text-purple-400" /><p className="text-xs text-slate-400 uppercase tracking-wider">Próxima Reavaliação</p></div>
              <p className="text-sm font-medium text-white">
                {nextAnalysis ? format(nextAnalysis, "dd/MM/yyyy", { locale: ptBR }) : '—'}
              </p>
              {nextAnalysis && <p className="text-xs text-slate-500 mt-1">Ciclo automático a cada 20 dias</p>}
            </div>
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2"><History className="w-4 h-4 text-emerald-400" /><p className="text-xs text-slate-400 uppercase tracking-wider">Total de Análises</p></div>
              <p className="text-2xl font-bold text-white">{analysisLogs.length}</p>
            </div>
          </div>

          {/* Botão de nova análise */}
          <div className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
            <Brain className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-purple-300">Executar Análise Manual</p>
              <p className="text-xs text-slate-400">A IA irá analisar todas as áreas da sustentação e atualizar os riscos.</p>
            </div>
            <Button onClick={() => aiMutation.mutate()} disabled={aiMutation.isPending} className="bg-purple-600 hover:bg-purple-700 flex-shrink-0">
              {aiMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analisando...</> : <><Sparkles className="w-4 h-4 mr-2" /> Executar</>}
            </Button>
          </div>

          {/* Histórico de análises */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Histórico de Análises</h3>
            {analysisLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-500 bg-slate-800/40 rounded-xl border border-slate-700/40">
                <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma análise registrada ainda.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...analysisLogs].sort((a, b) => b.executed_at?.localeCompare(a.executed_at || '')).map(log => (
                  <div key={log.id} className="bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white">
                            {log.executed_at ? format(parseISO(log.executed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '—'}
                          </span>
                          <Badge className={cn('text-white text-xs', log.trigger === 'auto' ? 'bg-purple-600' : 'bg-blue-600')}>
                            {log.trigger === 'auto' ? 'Automática' : log.trigger === 'initial' ? 'Inicial' : 'Manual'}
                          </Badge>
                          {log.risk_level && (
                            <Badge className={cn('text-white text-xs', RISK_SCORE_CFG(log.risk_score || 0).bg)}>
                              {RISK_SCORE_CFG(log.risk_score || 0).label}
                            </Badge>
                          )}
                        </div>
                        {log.executive_summary && <p className="text-xs text-slate-300 mb-2 leading-relaxed">{log.executive_summary}</p>}
                        <div className="flex gap-4 text-xs text-slate-400">
                          <span>Criados: <span className="text-blue-400 font-medium">{log.risks_created ?? 0}</span></span>
                          <span>Atualizados: <span className="text-yellow-400 font-medium">{log.risks_updated ?? 0}</span></span>
                          <span>Mitigados: <span className="text-emerald-400 font-medium">{log.risks_mitigated ?? 0}</span></span>
                          <span>Encerrados: <span className="text-slate-400 font-medium">{log.risks_closed ?? 0}</span></span>
                        </div>
                      </div>
                      {log.risk_score !== undefined && (
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-slate-400">Score</p>
                          <p className="text-lg font-bold text-white">{log.risk_score}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <RiskFormModal open={modalOpen} onOpenChange={setModalOpen} risk={selectedRisk} onSave={handleSave} projectId={projectId} />

      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Excluir o risco "{deleteDialog?.title}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteDialog?.id)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}