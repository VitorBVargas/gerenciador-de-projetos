import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, AlertTriangle, Shield, Pencil, Trash2, X, Sparkles, Loader2, Brain } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const categoryColors = {
  tecnico: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  cronograma: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  recurso: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  cliente: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  externo: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
};

const categoryLabels = {
  tecnico: 'Técnico', cronograma: 'Cronograma', recurso: 'Recurso',
  cliente: 'Cliente', externo: 'Externo'
};

const statusColors = {
  identificado: 'bg-slate-500', em_monitoramento: 'bg-yellow-500',
  mitigado: 'bg-green-500', ocorreu: 'bg-red-500'
};

const statusLabels = {
  identificado: 'Identificado', em_monitoramento: 'Monitorando',
  mitigado: 'Mitigado', ocorreu: 'Ocorreu'
};

// Converts stored value (number 1-5 OR old string) to number
const toNum = (v) => {
  if (typeof v === 'number') return v;
  const map = { baixa: 2, media: 3, alta: 4, baixo: 2, medio: 3, alto: 4 };
  return map[v] || 3;
};

const getSeverityColor = (score) => {
  if (score >= 20) return 'bg-red-600';
  if (score >= 12) return 'bg-orange-500';
  if (score >= 6) return 'bg-yellow-500';
  return 'bg-green-600';
};

const getSeverityLabel = (score) => {
  if (score >= 20) return 'Crítico';
  if (score >= 12) return 'Alto';
  if (score >= 6) return 'Médio';
  return 'Baixo';
};

// ─── Risk Matrix ──────────────────────────────────────────────────────────
function RiskMatrix({ risks }) {
  const [hoveredRisk, setHoveredRisk] = useState(null);

  // Matrix is 5×5: probability (Y, 5 top) vs impact (X, 5 right)
  // Cell color: severity = prob * impact
  const cellColor = (p, i) => {
    const s = p * i;
    if (s >= 20) return 'bg-red-600/80';
    if (s >= 12) return 'bg-orange-500/70';
    if (s >= 6) return 'bg-yellow-500/70';
    return 'bg-green-600/60';
  };

  const risksInCell = (p, i) =>
    risks.filter(r => toNum(r.probability) === p && toNum(r.impact) === i);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white">Matriz de Risco × Impacto</h3>
      <div className="flex gap-2">
        {/* Y axis label */}
        <div className="flex items-center justify-center" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          <span className="text-xs text-slate-500 whitespace-nowrap">Probabilidade →</span>
        </div>

        <div className="flex-1">
          {/* Grid */}
          <div className="grid gap-0.5" style={{ gridTemplateColumns: 'auto repeat(5, 1fr)' }}>
            {/* Header row */}
            <div />
            {[1,2,3,4,5].map(i => (
              <div key={i} className="text-center text-xs text-slate-500 pb-1">{i}</div>
            ))}

            {/* Rows: probability 5 (top) to 1 (bottom) */}
            {[5,4,3,2,1].map(p => (
              <React.Fragment key={p}>
                <div className="flex items-center justify-end pr-1.5 text-xs text-slate-500">{p}</div>
                {[1,2,3,4,5].map(i => {
                  const cellRisks = risksInCell(p, i);
                  return (
                    <div key={i}
                      className={cn('relative rounded aspect-square flex items-center justify-center transition-all', cellColor(p, i))}
                    >
                      {cellRisks.length > 0 && (
                        <div className="relative group">
                          <div className="w-5 h-5 rounded-full bg-white/90 flex items-center justify-center text-xs font-bold text-slate-900 cursor-pointer shadow">
                            {cellRisks.length}
                          </div>
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 min-w-40">
                            <div className="bg-slate-900 border border-slate-700 rounded-lg p-2 shadow-xl text-xs space-y-1">
                              {cellRisks.map((r, idx) => (
                                <p key={idx} className="text-white font-medium">{r.title}</p>
                              ))}
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

          {/* X axis label */}
          <div className="text-center text-xs text-slate-500 mt-1">Impacto →</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: 'Baixo (1-5)', color: 'bg-green-600/60' },
          { label: 'Médio (6-11)', color: 'bg-yellow-500/70' },
          { label: 'Alto (12-19)', color: 'bg-orange-500/70' },
          { label: 'Crítico (20-25)', color: 'bg-red-600/80' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={cn('w-3 h-3 rounded', l.color)} />
            <span className="text-xs text-slate-400">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Risk Form Modal ──────────────────────────────────────────────────────
function RiskFormModal({ open, onOpenChange, risk, onSave, projectId }) {
  const levelLabel = ['', 'Muito Baixo', 'Baixo', 'Médio', 'Alto', 'Muito Alto'];
  const levelColor = ['', 'text-green-400', 'text-lime-400', 'text-yellow-400', 'text-orange-400', 'text-red-400'];

  const [form, setForm] = useState({
    title: '', description: '', category: 'tecnico',
    probability: 3, impact: 3, mitigation: '', status: 'em_monitoramento'
  });

  React.useEffect(() => {
    if (risk) {
      setForm({
        title: risk.title || '',
        description: risk.description || '',
        category: risk.category || 'tecnico',
        probability: toNum(risk.probability),
        impact: toNum(risk.impact),
        mitigation: risk.mitigation || '',
        status: risk.status || 'em_monitoramento',
      });
    } else {
      setForm({ title: '', description: '', category: 'tecnico', probability: 3, impact: 3, mitigation: '', status: 'em_monitoramento' });
    }
  }, [risk, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, project_id: projectId });
  };

  const Slider = ({ field, label }) => (
    <div className="space-y-1">
      <div className="flex justify-between">
        <Label className="text-slate-400 text-xs">{label}</Label>
        <span className={`text-xs font-bold ${levelColor[form[field]]}`}>{form[field]} – {levelLabel[form[field]]}</span>
      </div>
      <input type="range" min={1} max={5} value={form[field]}
        onChange={e => setForm(p => ({ ...p, [field]: Number(e.target.value) }))}
        className="w-full h-2 rounded-lg cursor-pointer" />
      <div className="flex justify-between text-xs text-slate-600"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">{risk ? 'Editar Risco' : 'Novo Risco'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Risco *</Label>
            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white" required />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white h-16 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="tecnico">Técnico</SelectItem>
                  <SelectItem value="cronograma">Cronograma</SelectItem>
                  <SelectItem value="recurso">Recurso</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="externo">Externo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="identificado">Identificado</SelectItem>
                  <SelectItem value="em_monitoramento">Em Monitoramento</SelectItem>
                  <SelectItem value="mitigado">Mitigado</SelectItem>
                  <SelectItem value="ocorreu">Ocorreu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Slider field="probability" label="Chance de Acontecer" />
            <Slider field="impact" label="Impacto se Acontecer" />
          </div>
          <div className="space-y-2">
            <Label>Plano de Mitigação</Label>
            <Textarea value={form.mitigation} onChange={e => setForm(p => ({ ...p, mitigation: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white h-20 resize-none" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">{risk ? 'Salvar' : 'Adicionar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function Risks() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [riskToDelete, setRiskToDelete] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
  });

  const { data: risks = [], isLoading } = useQuery({
    queryKey: ['risks', projectId],
    queryFn: () => projectId ? base44.entities.Risk.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const activeProject = projects.find(p => p.id === projectId);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Risk.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['risks', projectId] }); setModalOpen(false); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Risk.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['risks', projectId] }); setModalOpen(false); setSelectedRisk(null); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Risk.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['risks', projectId] }); setDeleteDialogOpen(false); setRiskToDelete(null); }
  });

  const aiAnalysisMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('generateProjectRisksAI', { project_id: projectId, replace: true });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['risks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(`IA gerou ${data?.risks_created || 0} riscos`, {
        description: data?.executive_summary || 'Análise concluída.',
      });
    },
    onError: (err) => {
      toast.error('Falha na análise de riscos', { description: err.message });
    },
  });

  const handleSave = (data) => {
    if (selectedRisk) updateMutation.mutate({ id: selectedRisk.id, data });
    else createMutation.mutate(data);
  };

  const activeRisks = risks.filter(r => r.status !== 'mitigado');
  const mitigatedRisks = risks.filter(r => r.status === 'mitigado');
  const criticalRisks = risks.filter(r => toNum(r.probability) * toNum(r.impact) >= 20).length;
  const monitoringRisks = risks.filter(r => r.status === 'em_monitoramento').length;

  if (!projectId) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto text-slate-600 mb-4" />
        <p className="text-slate-400">Selecione um projeto para ver os riscos.</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Riscos do Projeto</h1>
          <p className="text-slate-400 mt-1 flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            Gerenciado pelo <span className="text-purple-300 font-medium">Gerente de Riscos IA</span>
            {activeProject?.last_risk_analysis_at && (
              <span className="text-xs text-slate-500">
                · Última análise: {new Date(activeProject.last_risk_analysis_at).toLocaleString('pt-BR')}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => aiAnalysisMutation.mutate()}
            disabled={aiAnalysisMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {aiAnalysisMutation.isPending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analisando...</>
              : <><Sparkles className="w-4 h-4 mr-2" /> Analisar com IA</>}
          </Button>
          <Button onClick={() => { setSelectedRisk(null); setModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Adicionar Risco
          </Button>
        </div>
      </div>

      {/* Score geral do projeto (IA) */}
      {activeProject?.risk_level && (
        <Card className="bg-gradient-to-br from-purple-500/10 to-slate-800/50 border-purple-500/30">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Brain className="w-6 h-6 text-purple-300" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Score Geral de Risco (IA)</p>
                <p className="text-2xl font-bold text-white">
                  {activeProject.risk_score ?? '—'}
                  <span className="text-sm text-slate-400 font-normal">/100</span>
                </p>
              </div>
            </div>
            <Badge className={cn('text-white text-sm px-3 py-1', {
              'bg-green-600': activeProject.risk_level === 'muito_baixo' || activeProject.risk_level === 'baixo',
              'bg-yellow-500': activeProject.risk_level === 'medio',
              'bg-orange-500': activeProject.risk_level === 'alto',
              'bg-red-600': activeProject.risk_level === 'critico',
            })}>
              {{ muito_baixo: 'Muito Baixo', baixo: 'Baixo', medio: 'Médio', alto: 'Alto', critico: 'Crítico' }[activeProject.risk_level]}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Riscos Críticos', value: criticalRisks, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20' },
          { label: 'Em Monitoramento', value: monitoringRisks, icon: Shield, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
          { label: 'Mitigados', value: mitigatedRisks.length, icon: Shield, color: 'text-green-400', bg: 'bg-green-500/20' },
        ].map(s => (
          <Card key={s.label} className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={cn('p-3 rounded-xl', s.bg)}><s.icon className={cn('w-6 h-6', s.color)} /></div>
              <div><p className="text-2xl font-bold text-white">{s.value}</p><p className="text-sm text-slate-400">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Matrix + List */}
      {risks.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Matrix */}
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="p-5">
              <RiskMatrix risks={risks} />
            </CardContent>
          </Card>

          {/* List */}
          <div className="space-y-4">
            {activeRisks.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-white mb-3">Riscos Ativos ({activeRisks.length})</h2>
                <div className="space-y-2">
                  {activeRisks
                    .sort((a, b) => (toNum(b.probability) * toNum(b.impact)) - (toNum(a.probability) * toNum(a.impact)))
                    .map(risk => {
                      const score = toNum(risk.probability) * toNum(risk.impact);
                      return (
                        <Card key={risk.id} className="bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 transition-all group">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <div className={cn('w-2 h-2 rounded-full flex-shrink-0', statusColors[risk.status])} />
                                  <Badge className={cn('border text-xs', categoryColors[risk.category])}>
                                    {categoryLabels[risk.category]}
                                  </Badge>
                                  <Badge className={cn('text-white text-xs', getSeverityColor(score))}>
                                    {getSeverityLabel(score)} ({score})
                                  </Badge>
                                  {(risk.source === 'ia' || risk.source === 'ia_dinamico') && (
                                    <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs gap-1">
                                      <Sparkles className="w-2.5 h-2.5" /> IA
                                    </Badge>
                                  )}
                                </div>
                                <h3 className="font-semibold text-white text-sm">{risk.title}</h3>
                                {risk.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{risk.description}</p>}
                                <div className="flex gap-4 text-xs mt-1.5 text-slate-400">
                                  <span>Chance: <span className="text-white font-medium">{toNum(risk.probability)}/5</span></span>
                                  <span>Impacto: <span className="text-white font-medium">{toNum(risk.impact)}/5</span></span>
                                  <span className="text-slate-500">{statusLabels[risk.status]}</span>
                                </div>
                                {risk.mitigation && (
                                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-1">
                                    <span className="text-slate-600">Mitigação: </span>{risk.mitigation}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-700"
                                  onClick={() => { setSelectedRisk(risk); setModalOpen(true); }}>
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                  onClick={() => { setRiskToDelete(risk); setDeleteDialogOpen(true); }}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </div>
            )}

            {mitigatedRisks.length > 0 && (
              <div className="opacity-60">
                <h2 className="text-sm font-semibold text-white mb-3">Mitigados ({mitigatedRisks.length})</h2>
                <div className="space-y-2">
                  {mitigatedRisks.map(risk => (
                    <Card key={risk.id} className="bg-slate-800/30 border-slate-700/30 group">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <Badge className={cn('border text-xs mb-1', categoryColors[risk.category])}>{categoryLabels[risk.category]}</Badge>
                          <p className="text-sm text-white line-through">{risk.title}</p>
                        </div>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/20 opacity-0 group-hover:opacity-100"
                          onClick={() => { setRiskToDelete(risk); setDeleteDialogOpen(true); }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-16">
          <Brain className="w-12 h-12 mx-auto text-purple-400 mb-3" />
          <h3 className="text-white font-semibold mb-1">Nenhum risco analisado ainda</h3>
          <p className="text-slate-400 text-sm mb-4">Deixe o Gerente de Riscos IA analisar o projeto e gerar a matriz inicial</p>
          <div className="flex gap-2 justify-center">
            <Button
              onClick={() => aiAnalysisMutation.mutate()}
              disabled={aiAnalysisMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {aiAnalysisMutation.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analisando...</>
                : <><Sparkles className="w-4 h-4 mr-2" /> Analisar com IA</>}
            </Button>
            <Button onClick={() => setModalOpen(true)} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
              <Plus className="w-4 h-4 mr-2" /> Adicionar Manual
            </Button>
          </div>
        </div>
      )}

      <RiskFormModal open={modalOpen} onOpenChange={setModalOpen} risk={selectedRisk}
        onSave={handleSave} projectId={projectId} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja excluir o risco "{riskToDelete?.title}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(riskToDelete?.id)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}