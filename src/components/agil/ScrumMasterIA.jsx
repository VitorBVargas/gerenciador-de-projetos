import React, { useEffect, useMemo, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import {
  Bot, X, Send, Loader2, ChevronRight, Sparkles, AlertTriangle, TrendingUp,
  Activity, ShieldAlert, Lightbulb, ClipboardCheck, Layers, Users, Gauge,
  MessageSquare, LayoutDashboard, Info
} from 'lucide-react';
import HealthScoreGauge from './HealthScoreGauge';
import {
  computeSprintHealth, detectIssues, buildRecommendations, buildAgilContext, QUICK_QUESTIONS
} from './scrumMasterAnalysis';

const AGENT_NAME = 'scrum_master_ia';

const TONE = {
  critico: 'border-red-500/40 bg-red-500/10 text-red-200',
  atencao: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-200',
  info: 'border-blue-500/40 bg-blue-500/10 text-blue-200',
  ok: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
};

function IssueRow({ icon: Icon, label, count, tone = 'text-slate-300' }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
      <span className="flex items-center gap-2 text-xs text-slate-300"><Icon className={`w-3.5 h-3.5 ${tone}`} />{label}</span>
      <Badge className={`${count > 0 ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-500'} min-w-[24px] justify-center`}>{count}</Badge>
    </div>
  );
}

function Section({ icon: Icon, title, accent, children }) {
  return (
    <div className="space-y-2">
      <p className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${accent}`}>
        <Icon className="w-3.5 h-3.5" />{title}
      </p>
      {children}
    </div>
  );
}

export default function ScrumMasterIA({ project, sprint, sprintItems = [], allItems = [], metrics }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('analise');

  // Chat
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const [showExpl, setShowExpl] = useState(false);
  const scrollRef = useRef(null);

  const health = useMemo(
    () => computeSprintHealth(metrics || {}, sprintItems),
    [metrics, sprintItems]
  );
  const issues = useMemo(() => detectIssues(sprintItems), [sprintItems]);
  const recommendations = useMemo(() => buildRecommendations(health, issues, metrics || {}), [health, issues, metrics]);

  const context = useMemo(
    () => buildAgilContext({ project, sprint, sprintItems, allItems, metrics: metrics || {}, health, issues }),
    [project, sprint, sprintItems, allItems, metrics, health, issues]
  );

  const abertura = useMemo(() => {
    if (!sprint) return 'Nenhuma sprint ativa para analisar ainda.';
    if (health.score >= 70 && issues.bloqueados.length === 0) return 'Sprint saudável. 👇 Veja os detalhes abaixo.';
    return 'Detectei alguns pontos de atenção. 👇 Veja o diagnóstico abaixo.';
  }, [sprint, health.score, issues.bloqueados.length]);

  // Memória apenas enquanto aberto: ao fechar, limpa a conversa.
  useEffect(() => {
    if (!open) {
      setConversation(null);
      setMessages([]);
      setQuestion('');
      return;
    }
  }, [open]);

  const ensureConversation = async () => {
    if (conversation) return conversation;
    const created = await base44.agents.createConversation({
      agent_name: AGENT_NAME,
      metadata: { name: 'Scrum Master IA', description: `Análise do projeto ${project?.name || ''}` },
    });
    setConversation(created);
    setMessages(created.messages || []);
    return created;
  };

  useEffect(() => {
    if (!conversation?.id) return;
    const unsub = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return unsub;
  }, [conversation?.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  const sendPrompt = async (content) => {
    const text = (content || '').trim();
    if (!text || sending) return;
    setSending(true);
    setQuestion('');
    setTab('chat');
    const conv = await ensureConversation();
    await base44.agents.addMessage(conv, {
      role: 'user',
      content: `Contexto atual do Projeto Ágil (dados reais):\n${context}\n\nPergunta do usuário: ${text}`,
    });
    setSending(false);
  };

  return (
    <>
      {/* Botão flutuante discreto */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setOpen(true)}
          className="h-12 pl-3 pr-4 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-900/40 flex items-center gap-2 text-white text-sm font-medium transition-colors"
        >
          <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center"><Bot className="w-4 h-4" /></span>
          Scrum Master IA
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
          <div
            className="w-full max-w-[420px] h-full bg-slate-900 border-l border-slate-700 flex flex-col pointer-events-auto shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-900/95">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center"><Bot className="w-4 h-4 text-emerald-400" /></span>
                <div>
                  <h3 className="text-white font-semibold text-sm flex items-center gap-1.5">Scrum Master IA</h3>
                  <p className="text-[11px] text-slate-400">Consultor ágil — não altera dados</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="text-slate-400 hover:text-white h-8 w-8"><X className="w-4 h-4" /></Button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-700 bg-slate-900">
              {[
                { id: 'analise', label: 'Análise', icon: LayoutDashboard },
                { id: 'chat', label: 'Chat', icon: MessageSquare },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${tab === t.id ? 'text-emerald-300 border-b-2 border-emerald-400 bg-slate-800/40' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <t.icon className="w-3.5 h-3.5" />{t.label}
                </button>
              ))}
            </div>

            {/* Conteúdo */}
            {tab === 'analise' ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {!sprint ? (
                  <div className="text-center py-16">
                    <Bot className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-300 text-sm">Nenhuma sprint ativa.</p>
                    <p className="text-slate-500 text-xs">Crie ou selecione uma sprint para a análise.</p>
                  </div>
                ) : (
                  <>
                    {/* Health Score em destaque */}
                    <div className={`rounded-xl border p-4 flex items-center gap-4 ${health.classification.bg}`}>
                      <HealthScoreGauge score={health.score} classification={health.classification} size={104} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-300">Saúde da Sprint</p>
                        <p className={`text-lg font-bold ${health.classification.color}`}>{health.classification.label}</p>
                        <p className="text-[11px] text-slate-400 mt-1">{abertura}</p>
                        <button onClick={() => setShowExpl((s) => !s)} className="mt-2 text-[11px] text-emerald-300 hover:text-emerald-200 flex items-center gap-1">
                          <Info className="w-3 h-3" />{showExpl ? 'Ocultar cálculo' : 'Como é calculado?'}
                        </button>
                      </div>
                    </div>

                    {showExpl && (
                      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 space-y-1.5">
                        {health.components.map((c) => (
                          <div key={c.label} className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="text-slate-400 truncate">{c.label} <span className="text-slate-600">(peso {c.weight})</span></span>
                            <span className={`font-semibold ${c.value >= 70 ? 'text-emerald-300' : c.value >= 50 ? 'text-yellow-300' : 'text-red-300'}`}>{c.value}</span>
                          </div>
                        ))}
                        <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-700 mt-1">Média ponderada dos componentes, com base nos dados reais da sprint.</p>
                      </div>
                    )}

                    {/* Diagnóstico rápido */}
                    <Section icon={Activity} title="Diagnóstico" accent="text-slate-300">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-slate-800/60 border border-slate-700/50 p-2.5">
                          <p className="text-[10px] text-slate-400 flex items-center gap-1"><ShieldAlert className="w-3 h-3 text-red-400" />Maior risco</p>
                          <p className="text-xs text-white mt-0.5 line-clamp-2">{issues.bloqueados.length ? `${issues.bloqueados.length} bloqueio(s)` : issues.bugsCriticos.length ? `${issues.bugsCriticos.length} bug(s) crítico(s)` : (metrics?.percentDecorrido > metrics?.percentSprint + 25 ? 'Ritmo abaixo do ideal' : 'Sem risco relevante')}</p>
                        </div>
                        <div className="rounded-lg bg-slate-800/60 border border-slate-700/50 p-2.5">
                          <p className="text-[10px] text-slate-400 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-yellow-400" />Maior gargalo</p>
                          <p className="text-xs text-white mt-0.5 line-clamp-2">{metrics?.wip > Math.max(4, Math.ceil((health.counters.total || 0) * 0.4)) ? `WIP alto (${metrics.wip})` : issues.storiesGrandes.length ? 'Stories grandes' : 'Fluxo equilibrado'}</p>
                        </div>
                        <div className="rounded-lg bg-slate-800/60 border border-slate-700/50 p-2.5 col-span-2">
                          <p className="text-[10px] text-slate-400 flex items-center gap-1"><Lightbulb className="w-3 h-3 text-emerald-400" />Maior oportunidade</p>
                          <p className="text-xs text-white mt-0.5">{issues.semCriterioAceite.length ? 'Melhorar refinamento (critérios de aceite)' : issues.semStoryPoints.length ? 'Estimar itens pendentes' : 'Manter cadência e reduzir Cycle Time'}</p>
                        </div>
                      </div>
                    </Section>

                    {/* Itens que precisam de atenção */}
                    <Section icon={ClipboardCheck} title="Itens que precisam de atenção" accent="text-slate-300">
                      <div className="space-y-1.5">
                        <IssueRow icon={AlertTriangle} label="Bloqueados" count={issues.bloqueados.length} tone="text-red-400" />
                        <IssueRow icon={Layers} label="Stories grandes demais" count={issues.storiesGrandes.length} tone="text-orange-400" />
                        <IssueRow icon={Users} label="Sem responsável" count={issues.semResponsavel.length} tone="text-yellow-400" />
                        <IssueRow icon={Gauge} label="Sem Story Points" count={issues.semStoryPoints.length} tone="text-blue-400" />
                        <IssueRow icon={ClipboardCheck} label="Sem critério de aceite" count={issues.semCriterioAceite.length} tone="text-purple-400" />
                        <IssueRow icon={ShieldAlert} label="Bugs críticos/altos" count={issues.bugsCriticos.length} tone="text-red-400" />
                      </div>
                    </Section>

                    {/* Recomendações */}
                    <Section icon={Sparkles} title="Recomendações" accent="text-emerald-300">
                      <div className="space-y-2">
                        {recommendations.map((r, i) => (
                          <div key={i} className={`rounded-lg border px-3 py-2 text-xs flex gap-2 ${TONE[r.tone] || TONE.info}`}>
                            <span>{r.icon}</span><span className="flex-1">{r.text}</span>
                          </div>
                        ))}
                      </div>
                    </Section>

                    {/* Perguntas prontas */}
                    <Section icon={MessageSquare} title="Perguntas rápidas" accent="text-slate-300">
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_QUESTIONS.map((q) => (
                          <button
                            key={q}
                            onClick={() => sendPrompt(q)}
                            className="text-[11px] px-2.5 py-1.5 rounded-full border border-slate-700 bg-slate-800/60 text-slate-200 hover:border-emerald-500/50 hover:bg-slate-800 transition-colors"
                          >{q}</button>
                        ))}
                      </div>
                    </Section>
                  </>
                )}
              </div>
            ) : (
              <>
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 && (
                    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
                      <p className="text-sm text-white font-medium mb-1">Pergunte ao Scrum Master IA</p>
                      <p className="text-xs text-slate-400 mb-3">Análises baseadas nos dados reais desta sprint. Escolha ou escreva sua pergunta.</p>
                      <div className="grid gap-1.5">
                        {QUICK_QUESTIONS.slice(0, 5).map((q) => (
                          <button key={q} onClick={() => sendPrompt(q)} className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-left text-xs text-slate-100 hover:border-emerald-500/50 transition-colors flex items-center justify-between gap-2">
                            {q}<ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((m, idx) => {
                    const isUser = m.role === 'user';
                    const display = isUser ? (m.content.split('Pergunta do usuário: ')[1] || m.content) : m.content;
                    if (!display) return null;
                    return (
                      <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 ${isUser ? 'bg-emerald-600 text-white' : 'bg-slate-800 border border-slate-700 text-slate-100'}`}>
                          {isUser ? (
                            <p className="text-sm whitespace-pre-wrap">{display}</p>
                          ) : (
                            <ReactMarkdown className="text-sm prose prose-invert prose-p:my-1 prose-headings:my-1.5 prose-ul:my-1 max-w-none">{display}</ReactMarkdown>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {sending && (
                    <div className="flex justify-start"><div className="rounded-2xl px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-slate-400 text-sm flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />Analisando...</div></div>
                  )}
                </div>

                <div className="border-t border-slate-700 p-3">
                  <div className="flex gap-2">
                    <Input
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendPrompt(question)}
                      placeholder="Analise a sprint, gargalos, riscos..."
                      className="bg-slate-800 border-slate-700 text-white text-sm h-9"
                    />
                    <Button onClick={() => sendPrompt(question)} disabled={sending || !question.trim()} className="bg-emerald-600 hover:bg-emerald-700 h-9 w-9 p-0">
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}