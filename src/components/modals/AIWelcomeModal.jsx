import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Zap, MessageSquare, Brain } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function AIWelcomeModal({ isOpen, onClose, projectName }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: Sparkles,
      title: "Bem-vindo ao Assistente IA",
      description: `Sua nova análise inteligente do projeto ${projectName}`,
      content: "Sou um assistente de IA treinado para ajudar na gestão do seu projeto. Posso analisar dados, fazer recomendações e responder suas dúvidas em tempo real."
    },
    {
      icon: Brain,
      title: "Como Funciono",
      description: "Entenda as capacidades do assistente",
      content: "Tenho acesso a todos os dados do seu projeto: cronograma, produtos, riscos, despesas e muito mais. Posso fazer análises complexas, identificar problemas e sugerir soluções."
    },
    {
      icon: MessageSquare,
      title: "Recursos Principais",
      description: "O que você pode fazer comigo",
      list: [
        "📊 Analisar status e progresso do projeto",
        "⚠️ Identificar riscos e pontos críticos",
        "📅 Revisar cronogramas e prazos",
        "💰 Avaliar orçamento e despesas",
        "💡 Dar recomendações e próximas ações",
        "❓ Responder perguntas sobre o projeto"
      ]
    },
    {
      icon: Zap,
      title: "Vamos Começar",
      description: "Clique no botão IA no dashboard para iniciar",
      content: "Você pode conversar comigo a qualquer momento pelo botão IA no canto superior direito. Vou sempre fornecer insights acionáveis e análises baseadas em dados reais do seu projeto."
    }
  ];

  const current = steps[step];
  const Icon = current.icon;
  const isLastStep = step === steps.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-white text-xl">Assistente IA do Projeto</DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">Versão 1.0</p>
            </div>
          </div>
        </DialogHeader>

        <div className="py-8">
          {/* Progress Indicator */}
          <div className="flex gap-2 mb-8">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  idx <= step ? "bg-gradient-to-r from-purple-600 to-blue-600" : "bg-slate-700"
                )}
              />
            ))}
          </div>

          {/* Content */}
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-600/30 flex items-center justify-center mx-auto">
              <Icon className="w-8 h-8 text-purple-400" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{current.title}</h2>
              <p className="text-slate-400 text-sm">{current.description}</p>
            </div>

            {current.content && (
              <p className="text-slate-300 text-sm leading-relaxed max-w-lg mx-auto">
                {current.content}
              </p>
            )}

            {current.list && (
              <div className="space-y-2 max-w-lg mx-auto text-left">
                {current.list.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-slate-300 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 justify-between pt-6 border-t border-slate-700">
          <Button
            variant="ghost"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50"
          >
            Anterior
          </Button>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-700"
            >
              Pular
            </Button>
            <Button
              onClick={() => {
                if (isLastStep) {
                  onClose();
                } else {
                  setStep(step + 1);
                }
              }}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isLastStep ? (
                <>
                  Vamos Lá! <Sparkles className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Próximo <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}