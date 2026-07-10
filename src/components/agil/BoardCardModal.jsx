import React, { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { base44 } from '@/api/base44Client';
import { Progress } from '@/components/ui/progress';
import { TIPO_META, PRIORIDADE_META, STATUS_META } from './backlogMeta';
import { effectiveColumn } from './boardMeta';
import {
  Plus, Trash2, Send, Play, Pause, Square, Clock, Lock, Unlock, Paperclip, ListChecks, GitBranch, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const Section = ({ title, icon: Icon, children, action }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" />}{title}
      </h4>
      {action}
    </div>
    {children}
  </div>
);

export default function BoardCardModal({ open, onOpenChange, item, items, sprints, currentUser, onChanged, onBlock, onUnblock }) {
  const [local, setLocal] = useState(null);
  const [newCheck, setNewCheck] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [manualHours, setManualHours] = useState('');
  const [uploading, setUploading] = useState(false);
  const [now, setNow] = useState(Date.now());
  const fileRef = useRef(null);

  useEffect(() => { setLocal(item); }, [item]);

  // Atualiza cronômetro visível a cada segundo quando tracker ativo
  useEffect(() => {
    if (!local?.tracker_iniciado_em) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [local?.tracker_iniciado_em]);

  if (!local) return null;

  const meta = TIPO_META[local.tipo] || TIPO_META.story;
  const Icon = meta.icon;
  const sprint = sprints?.find(s => s.id === local.sprint_id);
  const epic = items?.find(i => i.id === local.epic_id);
  const subtasks = (items || []).filter(i => i.parent_id === local.id);

  const persist = async (patch) => {
    const updated = { ...local, ...patch };
    setLocal(updated);
    await base44.entities.AgileBacklog.update(local.id, patch);
    onChanged?.();
  };

  // Checklist
  const toggleCheck = (idx) => {
    const checklist = [...(local.checklist || [])];
    checklist[idx] = { ...checklist[idx], feito: !checklist[idx].feito };
    persist({ checklist });
  };
  const addCheck = () => {
    if (!newCheck.trim()) return;
    persist({ checklist: [...(local.checklist || []), { texto: newCheck.trim(), feito: false }] });
    setNewCheck('');
  };
  const removeCheck = (idx) => persist({ checklist: (local.checklist || []).filter((_, i) => i !== idx) });

  // Comentários
  const addComment = () => {
    if (!newComment.trim()) return;
    const c = { autor: currentUser?.full_name || 'Usuário', texto: newComment.trim(), data: new Date().toISOString() };
    persist({ comentarios: [...(local.comentarios || []), c] });
    setNewComment('');
  };

  // Subtasks (itens filhos)
  const addSubtask = async () => {
    if (!newSubtask.trim()) return;
    await base44.entities.AgileBacklog.create({
      project_id: local.project_id,
      titulo: newSubtask.trim(),
      tipo: 'story',
      is_subtask: true,
      parent_id: local.id,
      sprint_id: local.sprint_id,
      board_status: 'ready',
      status: 'to_do',
      responsavel: local.responsavel,
      produto: local.produto,
    });
    setNewSubtask('');
    toast.success('Subtarefa criada');
    onChanged?.();
  };
  const toggleSubtask = async (st) => {
    const done = effectiveColumn(st) === 'concluido';
    await base44.entities.AgileBacklog.update(st.id, {
      board_status: done ? 'ready' : 'concluido',
      status: done ? 'to_do' : 'concluido',
      completed_at: done ? null : new Date().toISOString(),
    });
    onChanged?.();
  };
  const removeSubtask = async (st) => {
    await base44.entities.AgileBacklog.delete(st.id);
    onChanged?.();
  };
  const subDone = subtasks.filter(s => effectiveColumn(s) === 'concluido').length;
  const subPercent = subtasks.length ? Math.round((subDone / subtasks.length) * 100) : 0;

  // Tracker de horas
  const startTracker = () => persist({ tracker_iniciado_em: new Date().toISOString() });
  const stopTracker = (finalize) => {
    if (!local.tracker_iniciado_em) return;
    const horas = (Date.now() - new Date(local.tracker_iniciado_em).getTime()) / 3600000;
    const novo = Math.round(((local.tempo_gasto || 0) + horas) * 100) / 100;
    persist({ tempo_gasto: novo, tracker_iniciado_em: null });
    toast.success(`+${horas.toFixed(2)}h apontadas`);
  };
  const addManualHours = () => {
    const h = parseFloat(manualHours);
    if (!h || h <= 0) return;
    persist({ tempo_gasto: Math.round(((local.tempo_gasto || 0) + h) * 100) / 100 });
    setManualHours('');
    toast.success(`+${h}h apontadas`);
  };

  const elapsed = local.tracker_iniciado_em ? (now - new Date(local.tracker_iniciado_em).getTime()) / 1000 : 0;
  const fmtElapsed = (s) => {
    const hh = String(Math.floor(s / 3600)).padStart(2, '0');
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const ss = String(Math.floor(s % 60)).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  // Anexos
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await persist({ anexos: [...(local.anexos || []), { nome: file.name, url: file_url }] });
      toast.success('Arquivo anexado');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };
  const removeAnexo = (idx) => persist({ anexos: (local.anexos || []).filter((_, i) => i !== idx) });

  const deps = (local.dependencias || []).map(id => items?.find(i => i.id === id)?.titulo).filter(Boolean);
  const checklist = local.checklist || [];
  const checkPercent = checklist.length ? Math.round((checklist.filter(c => c.feito).length / checklist.length) * 100) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-slate-900 border-slate-700 text-white w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.bg}`}>
              <Icon className={`w-4 h-4 ${meta.color}`} />
            </div>
            <Badge variant="outline" className={meta.badge}>{meta.label}</Badge>
            {local.bloqueado && <Badge variant="outline" className="bg-red-500/15 text-red-300 border-red-500/40"><Lock className="w-3 h-3 mr-1" />Bloqueado</Badge>}
          </div>
          <SheetTitle className="text-white text-left">{local.titulo}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          {/* Ação bloqueio */}
          {local.bloqueado ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 space-y-1">
              <p className="text-sm text-red-300 font-medium">Motivo: {local.bloqueio_motivo}</p>
              {local.bloqueio_dependencia && <p className="text-xs text-slate-400">Dependência: {local.bloqueio_dependencia}</p>}
              {local.bloqueio_responsavel && <p className="text-xs text-slate-400">Responsável: {local.bloqueio_responsavel}</p>}
              {local.bloqueio_previsao && <p className="text-xs text-slate-400">Previsão: {format(new Date(local.bloqueio_previsao), 'dd/MM/yyyy')}</p>}
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 mt-2" onClick={() => onUnblock?.(local)}><Unlock className="w-3.5 h-3.5 mr-1" />Desbloquear</Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="border-red-600/40 text-red-300 hover:bg-red-600/10" onClick={() => onBlock?.(local)}><Lock className="w-3.5 h-3.5 mr-1" />Bloquear Item</Button>
          )}

          {/* Badges principais */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={PRIORIDADE_META[local.prioridade]?.badge}>Prioridade: {PRIORIDADE_META[local.prioridade]?.label}</Badge>
            <Badge variant="outline" className={STATUS_META[local.status]?.badge}>{STATUS_META[local.status]?.label}</Badge>
            <Badge variant="outline" className="bg-indigo-500/15 text-indigo-300 border-indigo-500/40">{local.story_points || 0} SP</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-slate-400">Responsável:</span> <span className="text-white">{local.responsavel || '—'}</span></div>
            <div><span className="text-slate-400">Sprint:</span> <span className="text-white">{sprint?.nome || 'Backlog geral'}</span></div>
            <div><span className="text-slate-400">Epic:</span> <span className="text-white">{epic?.titulo || '—'}</span></div>
            <div><span className="text-slate-400">Produto:</span> <span className="text-white">{local.produto || '—'}</span></div>
            <div><span className="text-slate-400">Lead Time:</span> <span className="text-white">{local.lead_time_horas ? `${local.lead_time_horas}h` : '—'}</span></div>
            <div><span className="text-slate-400">Cycle Time:</span> <span className="text-white">{local.cycle_time_horas ? `${local.cycle_time_horas}h` : '—'}</span></div>
          </div>

          {/* Tracker de horas */}
          <Section title="Apontamento de Horas" icon={Clock}>
            <div className="bg-slate-800/60 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-white tabular-nums">{local.tracker_iniciado_em ? fmtElapsed(elapsed) : `${local.tempo_gasto || 0}h`}</p>
                  <p className="text-[10px] text-slate-500">{local.tracker_iniciado_em ? 'Cronômetro ativo' : 'Total apontado'}</p>
                </div>
                <div className="flex gap-2">
                  {!local.tracker_iniciado_em ? (
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={startTracker}><Play className="w-3.5 h-3.5 mr-1" />Iniciar</Button>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" className="border-slate-600 text-slate-200" onClick={() => stopTracker(false)}><Pause className="w-3.5 h-3.5 mr-1" />Pausar</Button>
                      <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => stopTracker(true)}><Square className="w-3.5 h-3.5 mr-1" />Finalizar</Button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Input value={manualHours} onChange={(e) => setManualHours(e.target.value)} type="number" step="0.25" placeholder="Lançamento manual (h)" className="bg-slate-800 border-slate-700 h-8 text-sm" />
                <Button size="sm" className="h-8 bg-slate-700 hover:bg-slate-600" onClick={addManualHours}><Plus className="w-4 h-4" /></Button>
              </div>
            </div>
          </Section>

          {local.descricao && <Section title="Descrição"><p className="text-sm text-slate-300 whitespace-pre-wrap">{local.descricao}</p></Section>}
          {local.criterio_aceite && <Section title="Critérios de Aceite"><p className="text-sm text-slate-300 whitespace-pre-wrap">{local.criterio_aceite}</p></Section>}
          {local.definition_of_ready && <Section title="Definition of Ready"><p className="text-sm text-slate-300 whitespace-pre-wrap">{local.definition_of_ready}</p></Section>}
          {local.definition_of_done && <Section title="Definition of Done"><p className="text-sm text-slate-300 whitespace-pre-wrap">{local.definition_of_done}</p></Section>}

          {deps.length > 0 && (
            <Section title="Dependências">
              <div className="flex flex-wrap gap-2">{deps.map((d, i) => <Badge key={i} variant="outline" className="border-slate-600 text-slate-300">{d}</Badge>)}</div>
            </Section>
          )}

          {(local.tags || []).length > 0 && (
            <Section title="Tags">
              <div className="flex flex-wrap gap-2">{local.tags.map((t, i) => <Badge key={i} variant="outline" className="border-cyan-600/50 text-cyan-300">{t}</Badge>)}</div>
            </Section>
          )}

          {/* Subtasks */}
          <Section title={`Subtarefas (${subDone}/${subtasks.length})`} icon={GitBranch}>
            <div className="space-y-2">
              {subtasks.length > 0 && <Progress value={subPercent} className="h-1.5 bg-slate-700" />}
              {subtasks.map(st => {
                const done = effectiveColumn(st) === 'concluido';
                return (
                  <div key={st.id} className="flex items-center gap-2 group">
                    <Checkbox checked={done} onCheckedChange={() => toggleSubtask(st)} />
                    <span className={`text-sm flex-1 ${done ? 'line-through text-slate-500' : 'text-slate-300'}`}>{st.titulo}</span>
                    <button onClick={() => removeSubtask(st)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                );
              })}
              <div className="flex gap-2">
                <Input value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSubtask()} placeholder="Ex: Frontend, Backend, API, Testes" className="bg-slate-800 border-slate-700 h-8 text-sm" />
                <Button size="icon" className="h-8 w-8 bg-slate-700 hover:bg-slate-600" onClick={addSubtask}><Plus className="w-4 h-4" /></Button>
              </div>
            </div>
          </Section>

          {/* Checklist */}
          <Section title={`Checklist (${checkPercent}%)`} icon={ListChecks}>
            <div className="space-y-2">
              {checklist.length > 0 && <Progress value={checkPercent} className="h-1.5 bg-slate-700" />}
              {checklist.map((c, idx) => (
                <div key={idx} className="flex items-center gap-2 group">
                  <Checkbox checked={c.feito} onCheckedChange={() => toggleCheck(idx)} />
                  <span className={`text-sm flex-1 ${c.feito ? 'line-through text-slate-500' : 'text-slate-300'}`}>{c.texto}</span>
                  <button onClick={() => removeCheck(idx)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input value={newCheck} onChange={(e) => setNewCheck(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCheck()} placeholder="Novo item do checklist" className="bg-slate-800 border-slate-700 h-8 text-sm" />
                <Button size="icon" className="h-8 w-8 bg-slate-700 hover:bg-slate-600" onClick={addCheck}><Plus className="w-4 h-4" /></Button>
              </div>
            </div>
          </Section>

          {/* Anexos */}
          <Section title="Arquivos" icon={Paperclip} action={
            <Button size="sm" variant="ghost" className="h-7 text-slate-300 hover:bg-slate-800" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Anexar
            </Button>
          }>
            <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
            <div className="space-y-1">
              {(local.anexos || []).map((a, idx) => (
                <div key={idx} className="flex items-center gap-2 group bg-slate-800/60 rounded px-2 py-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                  <a href={a.url} target="_blank" rel="noreferrer" className="text-sm text-blue-300 hover:underline flex-1 truncate">{a.nome}</a>
                  <button onClick={() => removeAnexo(idx)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              {(local.anexos || []).length === 0 && <p className="text-xs text-slate-500">Nenhum arquivo anexado.</p>}
            </div>
          </Section>

          {/* Comentários */}
          <Section title="Comentários">
            <div className="space-y-3">
              {(local.comentarios || []).map((c, idx) => (
                <div key={idx} className="bg-slate-800/60 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white">{c.autor}</span>
                    <span className="text-xs text-slate-500">{c.data ? format(new Date(c.data), 'dd/MM/yyyy HH:mm') : ''}</span>
                  </div>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{c.texto}</p>
                </div>
              ))}
              <div className="flex gap-2">
                <Input value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addComment()} placeholder="Adicionar comentário" className="bg-slate-800 border-slate-700 h-9 text-sm" />
                <Button size="icon" className="h-9 w-9 bg-emerald-600 hover:bg-emerald-700" onClick={addComment}><Send className="w-4 h-4" /></Button>
              </div>
            </div>
          </Section>

          {(local.history || []).length > 0 && (
            <Section title="Histórico">
              <div className="space-y-1">
                {[...local.history].reverse().map((h, idx) => (
                  <p key={idx} className="text-xs text-slate-400">{h.date ? format(new Date(h.date), 'dd/MM HH:mm') : ''} — {h.field}: {h.from} → {h.to}</p>
                ))}
              </div>
            </Section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}