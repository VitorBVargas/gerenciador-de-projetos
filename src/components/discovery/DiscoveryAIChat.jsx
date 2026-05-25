import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Loader2, Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from "@/lib/utils";

const AGENT_NAME = 'discovery_ia';

const SUGGESTIONS = [
  'Como eu começo um discovery?',
  'Me ajude a aprofundar a causa raiz de um problema',
  'O que é o método 5W2H?',
  'Como priorizar ações com RICE?'
];

export default function DiscoveryAIChat({ open, onOpenChange }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const unsubRef = useRef(null);

  // Cria/recupera conversa ao abrir
  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      try {
        const conv = await base44.agents.createConversation({
          agent_name: AGENT_NAME,
          metadata: { name: 'Discovery Studio Chat' }
        });
        if (!active) return;
        setConversation(conv);
        setMessages(conv.messages || []);
        unsubRef.current = base44.agents.subscribeToConversation(conv.id, (data) => {
          setMessages(data.messages || []);
        });
      } catch {
        // silencioso
      }
    })();
    return () => {
      active = false;
      if (unsubRef.current) {
        try { unsubRef.current(); } catch { /* noop */ }
        unsubRef.current = null;
      }
    };
  }, [open]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim() || !conversation || sending) return;
    setSending(true);
    try {
      await base44.agents.addMessage(conversation, { role: 'user', content: text });
      setInput('');
    } catch {
      // toast já tratado em outros pontos
    }
    setSending(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="bg-slate-900 border-slate-800 text-white w-full sm:max-w-lg p-0 flex flex-col"
      >
        <SheetHeader className="p-4 border-b border-slate-800">
          <SheetTitle className="text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            Discovery IA
          </SheetTitle>
          <p className="text-xs text-slate-400">Consultor sênior em melhoria de processos</p>
        </SheetHeader>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center mt-0.5">
                  <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
                </div>
                <div className="bg-slate-800/60 rounded-2xl px-4 py-2.5 text-sm text-slate-200">
                  Olá! Sou o <strong>Discovery IA</strong>. Posso te ajudar a estruturar problemas, aprofundar causas raiz e montar planos de ação. Por onde começamos?
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 pt-2">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Sugestões</p>
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    disabled={!conversation || sending}
                    className="text-left text-sm bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 rounded-lg px-3 py-2 text-slate-300 transition-colors disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, idx) => (
            <div
              key={idx}
              className={cn(
                "flex",
                m.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800/60 text-slate-200'
                )}
              >
                {m.role === 'user' ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                ) : (
                  <ReactMarkdown
                    className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                    components={{
                      p: ({ children }) => <p className="my-1.5 leading-relaxed">{children}</p>,
                      ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc">{children}</ul>,
                      ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal">{children}</ol>,
                      h1: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>,
                      h2: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>,
                      h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>,
                    }}
                  >
                    {m.content || ''}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <Loader2 className="w-3 h-3 animate-spin" />
              Pensando…
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={conversation ? "Pergunte algo ao Discovery IA…" : "Carregando…"}
            disabled={!conversation || sending}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
          <Button
            type="submit"
            disabled={!input.trim() || !conversation || sending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}