import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Bot, Send, User, Loader2, Sparkles, X, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

const AGENT_NAME = 'gerente_projetos_faq';

function parseResponse(text) {
  const sectionDefs = [
    { marker: '### Lições Aprendidas Encontradas', title: '📚 Lições Aprendidas Encontradas', style: 'bg-emerald-950/40 border-emerald-600/50 text-emerald-100', collapsible: false },
    { marker: '### Contexto',              title: '🔍 Contexto',              style: 'bg-blue-950/30 border-blue-800/40 text-blue-200',      collapsible: false },
    { marker: '### Possíveis causas',      title: '⚠️ Possíveis causas',      style: 'bg-yellow-950/30 border-yellow-800/40 text-yellow-200', collapsible: false },
    { marker: '### Solução Recomendada',   title: '✅ Solução Recomendada',   style: 'bg-green-950/30 border-green-800/40 text-green-200',   collapsible: false },
    { marker: '### Solução recomendada',   title: '✅ Solução Recomendada',   style: 'bg-green-950/30 border-green-800/40 text-green-200',   collapsible: false },
    { marker: '### Referências internas',  title: '🔗 Referências internas',  style: 'bg-slate-800/60 border-slate-600 text-slate-300',      collapsible: true  },
    { marker: '### Boas Práticas',         title: '⭐ Boas Práticas',         style: 'bg-purple-950/30 border-purple-800/40 text-purple-200', collapsible: true  },
    { marker: '### Boas práticas',         title: '⭐ Boas Práticas',         style: 'bg-purple-950/30 border-purple-800/40 text-purple-200', collapsible: true  },
  ];

  const found = sectionDefs
    .map(def => ({ ...def, idx: text.indexOf(def.marker) }))
    .filter(d => d.idx !== -1)
    .sort((a, b) => a.idx - b.idx);

  if (found.length === 0) return [];

  return found.map((sec, i) => {
    const start = sec.idx + sec.marker.length;
    const end = found[i + 1] ? found[i + 1].idx : text.length;
    const content = text.slice(start, end).trim();
    return { title: sec.title, content, style: sec.style, collapsible: sec.collapsible };
  });
}

function renderContentWithLinks(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noreferrer"
        className="inline-block text-blue-400 hover:text-blue-300 underline break-all">
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function Section({ sec }) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`rounded-xl border overflow-hidden ${sec.style}`}>
      <div className="px-4 py-2.5 flex items-center justify-between">
        <span className="text-xs font-bold tracking-wide">{sec.title}</span>
        {sec.collapsible && (
          <button onClick={() => setOpen(o => !o)} className="opacity-60 hover:opacity-100">
            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {(!sec.collapsible || open) && (
        <div className="px-4 pb-3">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {renderContentWithLinks(sec.content)}
          </p>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end gap-3">
        <div className="max-w-[75%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed">
          {msg.content}
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center flex-shrink-0 mt-1">
          <User className="w-4 h-4 text-white" />
        </div>
      </div>
    );
  }

  const sections = parseResponse(msg.content || '');

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 mt-1">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 max-w-[88%] space-y-2">
        {sections.length > 0 ? (
          sections.map((sec, i) => <Section key={i} sec={sec} />)
        ) : (
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3">
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIChat() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Initialize conversation on first open
  useEffect(() => {
    if (!conversation) initConversation();
  }, []);

  const initConversation = async () => {
    setInitializing(true);
    try {
      const conv = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: { name: 'FAQ Session' },
      });
      setConversation(conv);

      // Subscribe to updates
      base44.agents.subscribeToConversation(conv.id, (data) => {
        setMessages(data.messages || []);
      });

      // Seed welcome message
      setMessages([{
        role: 'assistant',
        content: 'Olá! Sou o Gerente de Projetos FAQ da Betha Sistemas. Pode me perguntar sobre problemas de implantação, integrações, migrações de dados ou qualquer desafio operacional.',
      }]);
    } catch {
      setMessages([{
        role: 'assistant',
        content: 'Não foi possível inicializar o agente. Verifique se o agente "gerente_projetos_faq" está configurado no painel.',
      }]);
    } finally {
      setInitializing(false);
    }
  };

  const sendMessage = async () => {
    const query = input.trim();
    if (!query || loading || !conversation) return;

    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setInput('');
    setLoading(true);

    try {
      await base44.agents.addMessage(conversation, { role: 'user', content: query });
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Ocorreu um erro ao processar sua pergunta. Tente novamente.',
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestions = [
    'Como liberar acesso ao parceiro?',
    'Erro na integração contábil',
    'Problema na migração de dados',
    'Como configurar o go live?',
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-2xl border border-slate-700/60 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border-b border-slate-700/60 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Gerente de Projetos FAQ</p>
          <p className="text-[10px] text-emerald-400">IA especialista em implantação Betha</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${initializing ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-400 animate-pulse'}`} />
          <span className="text-[10px] text-slate-400">{initializing ? 'iniciando...' : 'online'}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: '420px' }}>
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
              <span className="text-xs text-slate-400">Analisando lições aprendidas...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && !loading && (
        <div className="px-4 pb-3 flex flex-wrap gap-2 flex-shrink-0">
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => { setInput(s); inputRef.current?.focus(); }}
              className="text-xs bg-slate-800 border border-slate-700 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 rounded-full px-3 py-1.5 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-slate-700/60 bg-slate-900/80 flex-shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua pergunta... (Enter para enviar)"
            rows={1}
            className="flex-1 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 resize-none transition-all"
            style={{ minHeight: '40px', maxHeight: '100px' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading || initializing}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-lg flex-shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-[10px] text-slate-600 mt-1.5 text-center">Shift+Enter para nova linha</p>
      </div>
    </div>
  );
}