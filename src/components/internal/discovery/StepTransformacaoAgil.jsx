import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Rocket, Sparkles, ListChecks, Lightbulb, Target } from 'lucide-react';
import TransformarAgilModal from './TransformarAgilModal';

export default function StepTransformacaoAgil({ discovery }) {
  const [modalOpen, setModalOpen] = useState(false);

  const hasProblema = !!discovery?.diagnostico?.problema?.trim();
  const hasToBe = !!discovery?.to_be?.descricao?.trim();
  const acoesCount = (discovery?.acoes || []).length;
  const hipotesesCount = (discovery?.hipoteses || []).length;

  return (
    <div className="space-y-5">
      <Card className="bg-gradient-to-br from-emerald-900/30 to-teal-900/20 border-emerald-700/40">
        <CardContent className="p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto">
            <Rocket className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Transformar Discovery em Projeto Ágil</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mt-2">
              Quando o Discovery estiver concluído, todas as informações poderão ser convertidas automaticamente em um Projeto Ágil.
            </p>
          </div>
          <Button onClick={() => setModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Rocket className="w-4 h-4 mr-2" />Criar Projeto Ágil
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/60 border-slate-700">
        <CardContent className="p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />O que será copiado
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <span className="flex items-center gap-2 text-slate-300"><Target className="w-3.5 h-3.5 text-emerald-400" />{hasProblema ? 'Problema ✓' : 'Problema'}</span>
            <span className="flex items-center gap-2 text-slate-300"><Target className="w-3.5 h-3.5 text-emerald-400" />{hasToBe ? 'TO BE ✓' : 'TO BE'}</span>
            <span className="flex items-center gap-2 text-slate-300"><Lightbulb className="w-3.5 h-3.5 text-emerald-400" />{hipotesesCount} hipótese(s)</span>
            <span className="flex items-center gap-2 text-slate-300"><ListChecks className="w-3.5 h-3.5 text-emerald-400" />{acoesCount} ação(ões)</span>
          </div>
          <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-700/60">
            Também são copiados: objetivo, causa raiz, riscos levantados e anotações. Equipe, produtos, stories, sprint e backlog serão definidos no novo projeto.
          </p>
        </CardContent>
      </Card>

      <TransformarAgilModal open={modalOpen} onOpenChange={setModalOpen} discovery={discovery} />
    </div>
  );
}