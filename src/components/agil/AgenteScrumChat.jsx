import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';
import { Bot, Send, Loader2, ChevronRight } from 'lucide-react';

const AGENT_NAME = 'agente_scrum_ia';

const QUICK = [
  'Como está a saúde geral do projeto?',
  'Onde estão os maiores gargalos?',
  'O que devo priorizar agora?',
  'A velocity está previsível?',
  'A equipe está sobrecarregada?',
  'O roadmap está realista?',
];

export default function AgenteScrumChat({ project, context }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const ensureConversation = async () => {
    if (conversation) return conversation;
    const created = await base44.agents.createConversation({
      agent_name: AGENT_NAME,
      metadata: { name: 'Agente Scrum IA', description: `Consultoria do projeto ${project?.name || ''}` },
    });
    setConversation(created);
    setMessages(created.messages || []);
    return created;
  };

  useEffect(() => {
    if (!conversation?.id) return;
    const unsub = base44.agents.subscribeToConversation(conversation.id, (data) => setMessages(data.messages || []));
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
    const conv = await ensureConversation();
    await base44.agents.addMessage(conv, {
      role: 'user',
      content: `Contexto atual do Projeto Ágil (dados reais):\n${context || ''}\n\nPergunta do usuário: ${text}`,
    });
    setSending(false);
  };

  return (
    <div className="flex flex-col h-[600px] bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700 bg-slate-900/95">
        <span className="w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center"><Bot className="w-4 h-4 text-emerald-400" /></span>
        <div>
          <h3 className="text-white font-semibold text-sm">Agente Scrum IA</h3>
          <p className="text-[11px] text-slate-400">Consultor ágil — nunca altera dados</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
            <p className="text-sm text-white font-medium mb-1">Converse com o Agente Scrum IA</p>
            <p className="text-xs text-slate-400 mb-3">Análises baseadas nos dados reais deste projeto ágil.</p>
            <div className="grid gap-1.5">
              {QUICK.map((q) => (
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
                {isUser
                  ? <p className="text-sm whitespace-pre-wrap">{display}</p>
                  : <ReactMarkdown className="text-sm prose prose-invert prose-p:my-1 prose-headings:my-1.5 prose-ul:my-1 max-w-none">{display}</ReactMarkdown>}
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
            placeholder="Pergunte sobre velocity, backlog, riscos..."
            className="bg-slate-800 border-slate-700 text-white text-sm h-9"
          />
          <Button onClick={() => sendPrompt(question)} disabled={sending || !question.trim()} className="bg-emerald-600 hover:bg-emerald-700 h-9 w-9 p-0">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}