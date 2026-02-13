import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, X, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function AIAssistantModal({ isOpen, onClose, projectId, conversation: externalConversation }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState(externalConversation || null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Criar conversa ao abrir modal
  useEffect(() => {
    if (isOpen && !conversation) {
      const initConversation = async () => {
        try {
          const conv = await base44.agents.createConversation({
            agent_name: 'ia_projetos_betha',
            metadata: {
              name: 'AI Assistant Chat',
              project_id: projectId
            }
          });
          setConversation(conv);
          setMessages(conv.messages || []);
        } catch (err) {
          console.error('Erro ao criar conversa:', err);
        }
      };
      initConversation();
    }
  }, [isOpen, conversation, projectId]);

  // Subscrever a atualizações
  useEffect(() => {
    if (!conversation) return;

    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });

    return unsubscribe;
  }, [conversation]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !conversation) return;

    setIsLoading(true);
    try {
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: input.trim()
      });
      setInput('');
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setMessages([]);
    setConversation(null);
    setInput('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md h-[600px] p-0 flex flex-col bg-slate-900 border-slate-700">
        <DialogHeader className="p-4 border-b border-slate-700 flex items-center justify-between">
          <DialogTitle className="text-white">Assistente IA</DialogTitle>
          <button onClick={handleClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-slate-400 text-sm space-y-2">
                <p>👋 Olá! Sou seu assistente de IA</p>
                <p>Posso ajudar com:</p>
                <p className="text-xs text-slate-500">
                  • Adicionar viagens, treinamentos, riscos<br/>
                  • Criar tarefas e marcos<br/>
                  • Atualizar dados do projeto<br/>
                  • Responder dúvidas
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-xs px-3 py-2 rounded-lg text-sm',
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'
              )}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="bg-slate-800 text-slate-100 px-3 py-2 rounded-lg border border-slate-700 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Processando...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-700 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Descreva o que você precisa..."
            disabled={isLoading}
            className="bg-slate-800 border-slate-700 text-white placeholder-slate-400"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            size="icon"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}