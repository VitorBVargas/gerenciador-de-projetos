import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sparkles, Loader2, Layers, GitBranch, ListTodo, Bug, Wrench, Map, ShieldAlert,
  Trash2, Plus, ChevronDown, ChevronRight, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { generateBacklogFromDiscovery, summarizeResult, persistBacklog, FIBONACCI, nearestFibonacci } from './agilBacklogAI';
import { analyzeDiscoveryMaturity, persistMaturityRisks } from './discoveryMaturityAI';
import DiscoveryGateReview from './DiscoveryGateReview';
import { createPageUrl } from '@/utils';

const PRIOS = ['baixa', 'media', 'alta', 'critica'];
const prioColor = { baixa: 'bg-slate-600', media: 'bg-blue-600', alta: 'bg-orange-600', critica: 'bg-red-600' };

function StatChip({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-2 bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-2">
      <Icon className={`w-4 h-4 ${color}`} />
      <span className="text-lg font-bold text-white">{value}</span>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}

export default function GerarBacklogIAModal({ open, onOpenChange, project, discovery, onDone }) {
  const [phase, setPhase] = useState('intro'); // intro | gate-analyzing | gate | generating | review | saving | done
  const [result, setResult] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setPhase('intro'); setResult(null); setAnalysis(null); setError(''); setExpanded({}); }
  }, [open, discovery]);

  // Gate de Qualidade: roda a Análise de Maturidade ANTES de gerar o backlog.
  const runGate = async () => {
    setPhase('gate-analyzing');
    setError('');
    try {
      const a = await analyzeDiscoveryMaturity({ project, discovery });
      if (!a) throw new Error('A IA não retornou a análise. Tente novamente.');
      setAnalysis(a);
      // Se o score for baixo, cria automaticamente os riscos de maturidade
      if (a.score < 70 && (a.riscos || []).length) {
        const n = await persistMaturityRisks({ projectId: project.id, riscos: a.riscos });
        if (n) toast.success(`${n} risco(s) de maturidade enviado(s) ao Gerente de Riscos.`);
      }
      setPhase('gate');
    } catch (e) {
      setError(e?.message || 'Falha ao analisar a maturidade do Discovery.');
      setPhase('intro');
    }
  };

  const goToDiscovery = () => {
    onOpenChange(false);
    const url = discovery?.project_id
      ? `InternalDashboard?id=${discovery.project_id}`
      : 'InternalProjectsList';
    window.location.href = createPageUrl(url);
  };

  const runGeneration = async () => {
    setPhase('generating');
    setError('');
    try {
      const r = await generateBacklogFromDiscovery({ project, discovery, maturityAnalysis: analysis });
      if (!r?.epics?.length) throw new Error('A IA não retornou épicos. Tente novamente.');
      setResult(r);
      setExpanded({ 0: true });
      setPhase('review');
    } catch (e) {
      setError(e?.message || 'Falha ao gerar o backlog.');
      setPhase('gate');
    }
  };

  const summary = result ? summarizeResult(result) : null;

  // ── Editing helpers (imutáveis) ──
  const updateEpic = (ei, patch) => setResult(r => {
    const epics = [...r.epics]; epics[ei] = { ...epics[ei], ...patch }; return { ...r, epics };
  });
  const removeEpic = (ei) => setResult(r => ({ ...r, epics: r.epics.filter((_, i) => i !== ei) }));
  const updateFeature = (ei, fi, patch) => setResult(r => {
    const epics = [...r.epics]; const features = [...(epics[ei].features || [])];
    features[fi] = { ...features[fi], ...patch }; epics[ei] = { ...epics[ei], features }; return { ...r, epics };
  });
  const removeFeature = (ei, fi) => setResult(r => {
    const epics = [...r.epics]; epics[ei] = { ...epics[ei], features: (epics[ei].features || []).filter((_, i) => i !== fi) }; return { ...r, epics };
  });
  const updateStory = (ei, fi, si, patch) => setResult(r => {
    const epics = [...r.epics]; const features = [...(epics[ei].features || [])];
    const stories = [...(features[fi].stories || [])]; stories[si] = { ...stories[si], ...patch };
    features[fi] = { ...features[fi], stories }; epics[ei] = { ...epics[ei], features }; return { ...r, epics };
  });
  const removeStory = (ei, fi, si) => setResult(r => {
    const epics = [...r.epics]; const features = [...(epics[ei].features || [])];
    features[fi] = { ...features[fi], stories: (features[fi].stories || []).filter((_, i) => i !== si) };
    epics[ei] = { ...epics[ei], features }; return { ...r, epics };
  });
  const addStory = (ei, fi) => setResult(r => {
    const epics = [...r.epics]; const features = [...(epics[ei].features || [])];
    const stories = [...(features[fi].stories || []), { titulo: 'Nova story', como: '', quero: '', para: '', prioridade: 'media', story_points: 3, sprint: 1 }];
    features[fi] = { ...features[fi], stories }; epics[ei] = { ...epics[ei], features }; return { ...r, epics };
  });

  const handleConfirm = async () => {
    setPhase('saving');
    try {
      await persistBacklog({ projectId: project.id, result });
      setPhase('done');
      onDone?.();
      toast.success('Product Backlog gerado com sucesso!');
    } catch (e) {
      setError(e?.message || 'Erro ao salvar o backlog.');
      setPhase('review');
      toast.error('Erro ao salvar o backlog.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (phase !== 'generating' && phase !== 'saving' && phase !== 'gate-analyzing') onOpenChange(v); }}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" /> Gerar Product Backlog com IA
          </DialogTitle>
        </DialogHeader>

        {/* INTRO */}
        {phase === 'intro' && (
          <div className="py-4 space-y-4 overflow-y-auto">
            <p className="text-sm text-slate-300">
              A IA analisará todo o Discovery — problema, objetivo, persona, 5 porquês, causa raiz, AS IS, TO BE, hipóteses, plano de ações, riscos e observações — e proporá uma estrutura de produto: <span className="text-white">Épicos → Features → User Stories</span>, com Story Points (Fibonacci), priorização RICE, MVP, roadmap por sprint, débitos técnicos, bugs conhecidos e riscos.
            </p>
            {!discovery && (
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-200">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                Este projeto não possui um Discovery vinculado. A IA usará apenas o objetivo/nome do projeto. O resultado será mais genérico.
              </div>
            )}
            {project?.agil_backlog_generated && (
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-200">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                Um backlog já foi gerado antes para este projeto. Gerar novamente adicionará novos itens (não substitui os existentes).
              </div>
            )}
            <div className="flex items-start gap-2 bg-slate-800/60 border border-slate-700 rounded-lg p-3 text-sm text-slate-300">
              <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-400" />
              Antes de gerar o backlog, a IA fará a <span className="text-white font-medium">Análise de Maturidade do Discovery</span> — o Gate Oficial de Qualidade — atribuindo um Discovery Score e avaliando se há informações suficientes para iniciar o desenvolvimento.
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800">Cancelar</Button>
              <Button onClick={runGate} className="bg-emerald-600 hover:bg-emerald-700"><Sparkles className="w-4 h-4 mr-2" /> Gerar Product Backlog com IA</Button>
            </div>
          </div>
        )}

        {/* GATE ANALYZING */}
        {phase === 'gate-analyzing' && (
          <div className="py-16 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
            <div className="text-center">
              <p className="text-white font-medium">Analisando a maturidade do Discovery…</p>
              <p className="text-sm text-slate-400 mt-1">A IA está avaliando a qualidade das informações antes de gerar o backlog.</p>
            </div>
          </div>
        )}

        {/* GATE REVIEW */}
        {phase === 'gate' && analysis && (
          <DiscoveryGateReview
            analysis={analysis}
            project={project}
            onBackToDiscovery={goToDiscovery}
            onProceed={runGeneration}
          />
        )}

        {/* GENERATING */}
        {phase === 'generating' && (
          <div className="py-16 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
            <div className="text-center">
              <p className="text-white font-medium">Analisando o Discovery e estruturando o produto…</p>
              <p className="text-sm text-slate-400 mt-1">Isso pode levar até um minuto.</p>
            </div>
          </div>
        )}

        {/* SAVING */}
        {phase === 'saving' && (
          <div className="py-16 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
            <p className="text-white font-medium">Criando épicos, features, stories, sprints e roadmap…</p>
          </div>
        )}

        {/* DONE */}
        {phase === 'done' && (
          <div className="py-14 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center"><CheckCircle2 className="w-8 h-8 text-emerald-400" /></div>
            <div>
              <h3 className="text-lg font-semibold text-white">Backlog criado com sucesso!</h3>
              <p className="text-sm text-slate-400 mt-1">Os itens já estão disponíveis no Product Backlog e no Sprint Board.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { window.location.href = `/AgilBacklog?project_id=${project.id}`; }} className="bg-emerald-600 hover:bg-emerald-700"><ListTodo className="w-4 h-4 mr-2" /> Abrir Backlog</Button>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800">Fechar</Button>
            </div>
          </div>
        )}

        {/* REVIEW */}
        {phase === 'review' && result && (
          <>
            <div className="flex flex-wrap gap-2 pb-3 border-b border-slate-800">
              <StatChip icon={Layers} label="Épicos" value={summary.epics} color="text-purple-400" />
              <StatChip icon={GitBranch} label="Features" value={summary.features} color="text-blue-400" />
              <StatChip icon={ListTodo} label="Stories" value={summary.stories} color="text-emerald-400" />
              <StatChip icon={Bug} label="Bugs" value={summary.bugs} color="text-red-400" />
              <StatChip icon={Wrench} label="Déb. Técnicos" value={summary.debitos} color="text-amber-400" />
              <StatChip icon={Map} label="Sprints" value={summary.sprints} color="text-cyan-400" />
              <StatChip icon={ShieldAlert} label="Riscos" value={summary.riscos} color="text-rose-400" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1">
              {result.mvp_descricao && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                  <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-1">MVP sugerido</p>
                  <p className="text-sm text-slate-200">{result.mvp_descricao}</p>
                </div>
              )}

              {/* Roadmap */}
              {(result.roadmap || []).length > 0 && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                  <p className="text-xs font-semibold text-cyan-300 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Map className="w-3.5 h-3.5" /> Roadmap</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[...result.roadmap].sort((a, b) => (a.sprint ?? 0) - (b.sprint ?? 0)).map((r, i) => (
                      <div key={i} className="bg-slate-900/60 rounded px-2.5 py-1.5 border border-slate-700/60">
                        <p className="text-sm font-medium text-white">{r.nome}</p>
                        {r.objetivo && <p className="text-xs text-slate-400">{r.objetivo}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Épicos */}
              {result.epics.map((epic, ei) => (
                <div key={ei} className="border border-slate-700 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 bg-slate-800/70 px-3 py-2">
                    <button onClick={() => setExpanded(p => ({ ...p, [ei]: !p[ei] }))} className="text-slate-400 hover:text-white">
                      {expanded[ei] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <Layers className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <Input value={epic.nome} onChange={e => updateEpic(ei, { nome: e.target.value })} className="bg-transparent border-0 text-white font-semibold h-7 px-1 focus-visible:ring-1 focus-visible:ring-slate-600" />
                    <Select value={epic.prioridade || 'media'} onValueChange={v => updateEpic(ei, { prioridade: v })}>
                      <SelectTrigger className="w-24 h-7 bg-slate-900 border-slate-700 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">{PRIOS.map(p => <SelectItem key={p} value={p} className="text-white capitalize">{p}</SelectItem>)}</SelectContent>
                    </Select>
                    <button onClick={() => removeEpic(ei)} className="text-slate-500 hover:text-red-400 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
                  </div>

                  {expanded[ei] && (
                    <div className="p-3 space-y-3 bg-slate-900/40">
                      <Textarea value={epic.descricao || ''} onChange={e => updateEpic(ei, { descricao: e.target.value })} rows={2} placeholder="Descrição do épico" className="bg-slate-800 border-slate-700 text-white text-sm" />
                      <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                        {epic.valor_negocio && <Badge className="bg-slate-700 text-slate-200">Valor: {epic.valor_negocio}</Badge>}
                        {epic.complexidade && <Badge className="bg-slate-700 text-slate-200">Complexidade: {epic.complexidade}</Badge>}
                      </div>

                      {/* Features */}
                      {(epic.features || []).map((feat, fi) => (
                        <div key={fi} className="border border-slate-700/70 rounded-md p-2.5 bg-slate-800/40 space-y-2">
                          <div className="flex items-center gap-2">
                            <GitBranch className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                            <Input value={feat.nome} onChange={e => updateFeature(ei, fi, { nome: e.target.value })} className="bg-transparent border-0 text-blue-200 font-medium h-7 px-1 focus-visible:ring-1 focus-visible:ring-slate-600" />
                            <button onClick={() => removeFeature(ei, fi)} className="text-slate-500 hover:text-red-400 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                          {feat.criterio_sucesso && <p className="text-xs text-slate-400 pl-5">Sucesso: {feat.criterio_sucesso}</p>}

                          {/* Stories */}
                          <div className="space-y-2 pl-5">
                            {(feat.stories || []).map((st, si) => (
                              <div key={si} className="bg-slate-900/70 border border-slate-700/60 rounded p-2 space-y-2">
                                <div className="flex items-center gap-2">
                                  <ListTodo className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                  <Input value={st.titulo || ''} onChange={e => updateStory(ei, fi, si, { titulo: e.target.value })} className="bg-transparent border-0 text-white text-sm h-6 px-1 focus-visible:ring-1 focus-visible:ring-slate-600" />
                                  <button onClick={() => removeStory(ei, fi, si)} className="text-slate-500 hover:text-red-400 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                                <div className="grid grid-cols-3 gap-1.5">
                                  <Input value={st.como || ''} onChange={e => updateStory(ei, fi, si, { como: e.target.value })} placeholder="Como..." className="bg-slate-800 border-slate-700 text-white text-xs h-7" />
                                  <Input value={st.quero || ''} onChange={e => updateStory(ei, fi, si, { quero: e.target.value })} placeholder="Quero..." className="bg-slate-800 border-slate-700 text-white text-xs h-7" />
                                  <Input value={st.para || ''} onChange={e => updateStory(ei, fi, si, { para: e.target.value })} placeholder="Para..." className="bg-slate-800 border-slate-700 text-white text-xs h-7" />
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Select value={st.prioridade || 'media'} onValueChange={v => updateStory(ei, fi, si, { prioridade: v })}>
                                    <SelectTrigger className="w-20 h-7 bg-slate-800 border-slate-700 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">{PRIOS.map(p => <SelectItem key={p} value={p} className="text-white capitalize">{p}</SelectItem>)}</SelectContent>
                                  </Select>
                                  <Select value={String(nearestFibonacci(st.story_points) || 3)} onValueChange={v => updateStory(ei, fi, si, { story_points: Number(v) })}>
                                    <SelectTrigger className="w-16 h-7 bg-slate-800 border-slate-700 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">{FIBONACCI.map(p => <SelectItem key={p} value={String(p)} className="text-white">{p} pts</SelectItem>)}</SelectContent>
                                  </Select>
                                  <Input type="number" value={st.sprint ?? ''} onChange={e => updateStory(ei, fi, si, { sprint: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="Sprint" className="w-20 bg-slate-800 border-slate-700 text-white text-xs h-7" />
                                  {st.rice?.score !== undefined && <Badge className="bg-cyan-600/20 text-cyan-300 text-xs">RICE {st.rice.score}</Badge>}
                                </div>
                                {st.criterios_aceite && <p className="text-[11px] text-slate-500">Aceite: {st.criterios_aceite}</p>}
                              </div>
                            ))}
                            <Button onClick={() => addStory(ei, fi)} variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-7 text-xs"><Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Story</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Bugs & Débitos */}
              {(result.bugs_conhecidos || []).length > 0 && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-300 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Bug className="w-3.5 h-3.5" /> Bugs Conhecidos</p>
                  {result.bugs_conhecidos.map((b, i) => <p key={i} className="text-sm text-slate-300">• {b.titulo}</p>)}
                </div>
              )}
              {(result.debitos_tecnicos || []).length > 0 && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                  <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5" /> Débitos Técnicos</p>
                  {result.debitos_tecnicos.map((d, i) => <p key={i} className="text-sm text-slate-300">• {d.titulo}</p>)}
                </div>
              )}
              {(result.riscos || []).length > 0 && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                  <p className="text-xs font-semibold text-rose-300 uppercase tracking-wider mb-2 flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> Riscos (enviados ao Gerente de Riscos)</p>
                  {result.riscos.map((r, i) => <p key={i} className="text-sm text-slate-300">• {r.titulo} <span className="text-xs text-slate-500">({r.probabilidade}/{r.impacto})</span></p>)}
                </div>
              )}
              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>

            <div className="flex justify-between items-center gap-2 pt-3 border-t border-slate-800">
              <Button variant="ghost" onClick={runGeneration} className="text-slate-400 hover:text-white"><Sparkles className="w-4 h-4 mr-2" /> Gerar novamente</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800">Cancelar</Button>
                <Button onClick={handleConfirm} className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="w-4 h-4 mr-2" /> Confirmar e Criar</Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}