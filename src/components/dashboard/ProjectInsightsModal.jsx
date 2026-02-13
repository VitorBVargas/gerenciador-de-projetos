import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, CheckCircle2, Clock, TrendingUp, Sparkles, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from "@/lib/utils";

export default function ProjectInsightsModal({ open, onClose, projectId }) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [conversation, setConversation] = useState(null);

  useEffect(() => {
    if (open && projectId) {
      fetchInsights();
    }
  }, [open, projectId]);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      // Criar conversa com o agente
      const conv = await base44.agents.createConversation({
        agent_name: 'ia_projetos_betha',
        metadata: {
          project_id: projectId,
          type: 'project_insights'
        }
      });

      setConversation(conv);

      // Enviar mensagem solicitando análise
      await base44.agents.addMessage(conv, {
        role: 'user',
        content: `Analise o projeto ID ${projectId} e forneça:
1. Atualize automaticamente o cronograma baseado nas datas de hoje
2. Status geral do projeto
3. Top 5 pontos de atenção prioritários
4. Próximas ações recomendadas
5. Alertas de prazos nos próximos 7 dias
6. Riscos críticos não mitigados

Seja específico e acionável.`
      });

      // Aguardar resposta com retry
      let updatedConv = null;
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        updatedConv = await base44.agents.getConversation(conv.id);
        
        if (updatedConv.messages.length > 1) {
          break;
        }
        attempts++;
      }

      if (!updatedConv || updatedConv.messages.length <= 1) {
        setInsights('Não há novas atualizações para o projeto no momento.');
        return;
      }

      const lastMessage = updatedConv.messages[updatedConv.messages.length - 1];
      
      if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content) {
        setInsights(lastMessage.content);
      } else {
        setInsights('Não há novas atualizações para o projeto no momento.');
      }
    } catch (error) {
      console.error('Erro ao buscar insights:', error);
      setInsights('Não há novas atualizações para o projeto no momento.');
    } finally {
      setLoading(false);
    }
  };

  const priorityIcons = {
    'critico': { icon: AlertTriangle, color: 'text-red-500' },
    'alto': { icon: AlertTriangle, color: 'text-orange-500' },
    'medio': { icon: Clock, color: 'text-yellow-500' },
    'baixo': { icon: CheckCircle2, color: 'text-blue-500' }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-400" />
              IA Projetos Betha
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Análise inteligente e recomendações para o projeto
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
              <div className="text-center">
                <p className="text-white font-medium">Analisando projeto...</p>
                <p className="text-sm text-slate-400 mt-1">
                  Verificando cronograma, riscos e tarefas
                </p>
              </div>
            </div>
          ) : insights ? (
            <div className="space-y-4">
              {/* Insights do Agente */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <div className="prose prose-invert prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-slate-200 leading-relaxed">
                    {insights}
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                <p className="text-xs text-slate-500">
                  Última atualização: {new Date().toLocaleString('pt-BR')}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchInsights}
                    className="border-slate-600 text-slate-300 hover:bg-slate-800"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Atualizar Análise
                  </Button>
                  <Button
                    onClick={onClose}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Entendi
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              Nenhum insight disponível no momento.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}