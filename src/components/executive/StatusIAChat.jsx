import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, X, Send, MessageCircle, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const AGENT_NAME = 'agente_status_ia';

function buildExecutiveContext({ portfolioLabel, projects, statusSummary, timelineSummary, financeSummary }) {
  return [
    `Portfólio analisado: ${portfolioLabel}`,
    '',
    'Resumo de status:',
    `- Projetos ativos: ${statusSummary.total}`,
    `- Em dia: ${statusSummary.emDia}`,
    `- Em alerta: ${statusSummary.alerta}`,
    `- Atrasados: ${statusSummary.atrasado}`,
    `- Paralisados: ${statusSummary.pausado}`,
    '',
    'Projetos visíveis na tela:',
    ...projects.map((project) => (
      `- ${project.name}: status ${project.dynamicStatusLabel}, progresso ${project.progress}%, health score ${project.healthScore}, prazo contratual ${project.deadlineLabel}, prazo estimado ${project.estimatedDeadlineLabel}, implantação ${project.implementationValueLabel}, inclusão ${project.recurringValueLabel}`
    )),
    '',
    'Timeline:',
    `- ${timelineSummary}`,
    '',
    'Financeiro:',
    `- ${financeSummary}`,
  ].join('\n');
}

export default function StatusIAChat({ portfolioLabel, projects, statusSummary, timelineSummary, financeSummary }) {
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);

  const executiveContext = useMemo(() => buildExecutiveContext({ portfolioLabel, projects, statusSummary, timelineSummary, financeSummary }), [portfolioLabel, projects, statusSummary, timelineSummary, financeSummary]);

  useEffect(() => {
    if (!open || conversation) return;

    base44.agents.createConversation({
      agent_name: AGENT_NAME,
      metadata: {
        name: 'Status IA',
        description: 'Análises executivas do portfólio'
      }
    }).then((created) => {
      setConversation(created);
      setMessages(created.messages || []);
    });
  }, [open, conversation]);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return unsubscribe;
  }, [conversation?.id]);

  const handleSend = async () => {
    const content = question.trim();
    if (!content || !conversation || sending) return;

    setSending(true);
    setQuestion('');
    await base44.agents.addMessage(conversation, {
      role: 'user',
      content: `Contexto da tela Status Executivo:\n${executiveContext}\n\nPergunta do usuário: ${content}`
    });
    setSending(false);
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <Button onClick={() => setOpen(true)} className="h-12 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-900/40 px-4 gap-2">
          <MessageCircle className="w-4 h-4" />
          Status IA
        </Button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md h-full bg-slate-900 border-l border-slate-700 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700">
              <div>
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  Status IA
                </h3>
                <p className="text-xs text-slate-400">Leitura e análise executiva do portfólio</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-white">Perguntas que você pode fazer</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-slate-300 space-y-2">
                    <p>• Quais projetos estão em risco?</p>
                    <p>• Qual projeto merece mais atenção?</p>
                    <p>• Onde estão os gargalos?</p>
                    <p>• Estamos dentro do prazo geral?</p>
                  </CardContent>
                </Card>
              )}

              {messages.map((message, index) => {
                const isUser = message.role === 'user';
                const displayContent = isUser
                  ? message.content.split('Pergunta do usuário: ')[1] || message.content
                  : message.content;

                return (
                  <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] rounded-2xl px-4 py-3 ${isUser ? 'bg-blue-600 text-white' : 'bg-slate-800 border border-slate-700 text-slate-100'}`}>
                      {isUser ? (
                        <p className="text-sm whitespace-pre-wrap">{displayContent}</p>
                      ) : (
                        <ReactMarkdown className="text-sm prose prose-invert prose-p:my-1 prose-headings:my-2 max-w-none">
                          {displayContent}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-slate-700 p-4">
              <div className="flex gap-2">
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Pergunte sobre riscos, prazos e gargalos..."
                  className="bg-slate-800 border-slate-700 text-white"
                />
                <Button onClick={handleSend} disabled={sending || !question.trim()} className="bg-blue-600 hover:bg-blue-700">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}