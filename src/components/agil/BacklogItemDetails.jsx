import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { base44 } from '@/api/base44Client';
import { Progress } from '@/components/ui/progress';
import { TIPO_META, PRIORIDADE_META, STATUS_META } from './backlogMeta';
import { Plus, Trash2, Send, Layers, BookOpen, Bug, Target } from 'lucide-react';
import { format } from 'date-fns';

// Métricas de uma Epic: filhos (features/stories/bugs) via relacionamento automático
function computeEpicStats(epicId, all) {
  const features = all.filter(i => i.tipo === 'feature' && i.epic_id === epicId);
  const featureIds = new Set(features.map(f => f.id));
  const stories = all.filter(i => i.tipo === 'story' && (i.epic_id === epicId || featureIds.has(i.feature_id)));
  const storyIds = new Set(stories.map(s => s.id));
  const bugs = all.filter(i => i.tipo === 'bug' && (i.epic_id === epicId || featureIds.has(i.feature_id) || storyIds.has(i.story_id)));
  const children = [...features, ...stories, ...bugs];
  const sp = children.reduce((s, i) => s + (i.story_points || 0), 0);
  const spDone = children.filter(i => i.status === 'concluido').reduce((s, i) => s + (i.story_points || 0), 0);
  const percent = children.length === 0 ? 0 : Math.round((children.filter(i => i.status === 'concluido').length / children.length) * 100);
  return { stories: stories.length, bugs: bugs.length, sp, spDone, percent };
}

const Section = ({ title, children }) => (
  <div className="space-y-2">
    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h4>
    {children}
  </div>
);

export default function BacklogItemDetails({ open, onOpenChange, item, items, sprints, currentUser, onChanged }) {
  const [local, setLocal] = useState(null);
  const [newCheck, setNewCheck] = useState('');
  const [newComment, setNewComment] = useState('');

  useEffect(() => { setLocal(item); }, [item]);

  if (!local) return null;

  const meta = TIPO_META[local.tipo] || TIPO_META.story;
  const Icon = meta.icon;
  const sprint = sprints?.find(s => s.id === local.sprint_id);
  const epic = items?.find(i => i.id === local.epic_id);

  const persist = async (patch) => {
    const updated = { ...local, ...patch };
    setLocal(updated);
    await base44.entities.AgileBacklog.update(local.id, patch);
    onChanged?.();
  };

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
  const removeCheck = (idx) => {
    persist({ checklist: (local.checklist || []).filter((_, i) => i !== idx) });
  };
  const addComment = () => {
    if (!newComment.trim()) return;
    const c = { autor: currentUser?.full_name || 'Usuário', texto: newComment.trim(), data: new Date().toISOString() };
    persist({ comentarios: [...(local.comentarios || []), c] });
    setNewComment('');
  };

  const deps = (local.dependencias || []).map(id => items?.find(i => i.id === id)?.titulo).filter(Boolean);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-slate-900 border-slate-700 text-white w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.bg}`}>
              <Icon className={`w-4 h-4 ${meta.color}`} />
            </div>
            <Badge variant="outline" className={meta.badge}>{meta.label}</Badge>
          </div>
          <SheetTitle className="text-white text-left">{local.titulo}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-6">
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
            <div><span className="text-slate-400">Estimativa:</span> <span className="text-white">{local.estimativa_horas || 0}h</span></div>
            <div><span className="text-slate-400">Tempo gasto:</span> <span className="text-white">{local.tempo_gasto || 0}h</span></div>
          </div>

          {local.tipo === 'epic' && (() => {
            const es = computeEpicStats(local.id, items || []);
            return (
              <Section title="Progresso da Epic">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">Concluído</span>
                      <span className="text-white font-medium">{es.percent}%</span>
                    </div>
                    <Progress value={es.percent} className="h-2 bg-slate-700" />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-slate-800/60 rounded-lg p-2 text-center">
                      <BookOpen className="w-4 h-4 text-green-400 mx-auto mb-1" />
                      <p className="text-lg font-bold text-white">{es.stories}</p>
                      <p className="text-[10px] text-slate-400">Stories</p>
                    </div>
                    <div className="bg-slate-800/60 rounded-lg p-2 text-center">
                      <Bug className="w-4 h-4 text-red-400 mx-auto mb-1" />
                      <p className="text-lg font-bold text-white">{es.bugs}</p>
                      <p className="text-[10px] text-slate-400">Bugs</p>
                    </div>
                    <div className="bg-slate-800/60 rounded-lg p-2 text-center">
                      <Target className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
                      <p className="text-lg font-bold text-white">{es.sp}</p>
                      <p className="text-[10px] text-slate-400">SP Totais</p>
                    </div>
                    <div className="bg-slate-800/60 rounded-lg p-2 text-center">
                      <Layers className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                      <p className="text-lg font-bold text-white">{es.spDone}</p>
                      <p className="text-[10px] text-slate-400">SP Feitos</p>
                    </div>
                  </div>
                </div>
              </Section>
            );
          })()}

          {local.descricao && (
            <Section title="Descrição"><p className="text-sm text-slate-300 whitespace-pre-wrap">{local.descricao}</p></Section>
          )}
          {local.criterio_aceite && (
            <Section title="Critérios de Aceite"><p className="text-sm text-slate-300 whitespace-pre-wrap">{local.criterio_aceite}</p></Section>
          )}
          {local.definition_of_ready && (
            <Section title="Definition of Ready"><p className="text-sm text-slate-300 whitespace-pre-wrap">{local.definition_of_ready}</p></Section>
          )}
          {local.definition_of_done && (
            <Section title="Definition of Done"><p className="text-sm text-slate-300 whitespace-pre-wrap">{local.definition_of_done}</p></Section>
          )}

          {deps.length > 0 && (
            <Section title="Dependências">
              <div className="flex flex-wrap gap-2">
                {deps.map((d, i) => <Badge key={i} variant="outline" className="border-slate-600 text-slate-300">{d}</Badge>)}
              </div>
            </Section>
          )}

          {(local.tags || []).length > 0 && (
            <Section title="Tags">
              <div className="flex flex-wrap gap-2">
                {local.tags.map((t, i) => <Badge key={i} variant="outline" className="border-cyan-600/50 text-cyan-300">{t}</Badge>)}
              </div>
            </Section>
          )}

          <Section title="Checklist">
            <div className="space-y-2">
              {(local.checklist || []).map((c, idx) => (
                <div key={idx} className="flex items-center gap-2 group">
                  <Checkbox checked={c.feito} onCheckedChange={() => toggleCheck(idx)} />
                  <span className={`text-sm flex-1 ${c.feito ? 'line-through text-slate-500' : 'text-slate-300'}`}>{c.texto}</span>
                  <button onClick={() => removeCheck(idx)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input value={newCheck} onChange={(e) => setNewCheck(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCheck()} placeholder="Nova subtarefa" className="bg-slate-800 border-slate-700 h-8 text-sm" />
                <Button size="icon" className="h-8 w-8 bg-slate-700 hover:bg-slate-600" onClick={addCheck}><Plus className="w-4 h-4" /></Button>
              </div>
            </div>
          </Section>

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
                {local.history.map((h, idx) => (
                  <p key={idx} className="text-xs text-slate-400">
                    {h.date ? format(new Date(h.date), 'dd/MM HH:mm') : ''} — {h.field}: {h.from} → {h.to}
                  </p>
                ))}
              </div>
            </Section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}