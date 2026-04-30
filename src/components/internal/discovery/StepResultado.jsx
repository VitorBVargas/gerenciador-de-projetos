import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Zap, Loader2 } from 'lucide-react';
import { riceScore, ricePriority } from './discoveryUtils';
import { cn } from "@/lib/utils";

const priorityColor = {
  critica: 'bg-red-500/20 text-red-300 border-red-500/30',
  alta: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  media: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  baixa: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
};

export default function StepResultado({ discovery, onGenerateTasks, onConcluir, generating }) {
  const sortedAcoes = [...(discovery.acoes || [])].sort((a, b) => riceScore(b) - riceScore(a));
  const gerouAlguma = sortedAcoes.some(a => a.task_id);

  return (
    <div className="space-y-5">
      <Card className="bg-slate-900/60 border-slate-700">
        <CardContent className="p-4 space-y-2">
          <h3 className="text-white font-semibold text-sm">Resumo do Discovery</h3>
          {discovery.diagnostico?.problema && (
            <div><p className="text-xs text-slate-500">Problema</p><p className="text-sm text-slate-200">{discovery.diagnostico.problema}</p></div>
          )}
          {discovery.diagnostico?.causa_raiz && (
            <div><p className="text-xs text-slate-500">Causa raiz</p><p className="text-sm text-slate-200">{discovery.diagnostico.causa_raiz}</p></div>
          )}
          {discovery.to_be?.descricao && (
            <div><p className="text-xs text-slate-500">TO BE</p><p className="text-sm text-slate-200">{discovery.to_be.descricao}</p></div>
          )}
          {discovery.mvp?.descricao && (
            <div><p className="text-xs text-slate-500">MVP</p><p className="text-sm text-slate-200">{discovery.mvp.descricao}</p></div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-900/60 border-slate-700">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-white font-semibold text-sm">Ações priorizadas (próximos passos)</h3>
            <Button onClick={onGenerateTasks} disabled={generating || sortedAcoes.length === 0} className="bg-indigo-600 hover:bg-indigo-700">
              {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              {gerouAlguma ? 'Reprocessar tarefas' : 'Gerar tarefas no board'}
            </Button>
          </div>

          {sortedAcoes.length > 0 ? (
            <div className="space-y-2">
              {sortedAcoes.map((a, idx) => {
                const score = riceScore(a);
                const prio = ricePriority(score);
                return (
                  <div key={a.id} className="flex items-start gap-3 p-3 bg-slate-800/40 rounded border border-slate-700">
                    <span className="text-xs text-slate-500 font-mono mt-1">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm text-white font-medium">{a.what || 'Sem título'}</p>
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium border", priorityColor[prio])}>{prio}</span>
                        {a.task_id && <span className="text-[10px] text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" />vinculada</span>}
                      </div>
                      <p className="text-xs text-slate-400">
                        {a.who && <span>{a.who}</span>}
                        {a.when && <span> · {a.when}</span>}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-indigo-400">{score}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Nenhuma ação cadastrada na etapa de Plano de Ações.</p>
          )}
        </CardContent>
      </Card>

      {discovery.status !== 'concluido' && (
        <div className="flex justify-end">
          <Button onClick={onConcluir} variant="outline" className="border-green-500/50 text-green-400 hover:bg-green-500/10 hover:text-green-300">
            <CheckCircle className="w-4 h-4 mr-2" />Marcar como concluído
          </Button>
        </div>
      )}
    </div>
  );
}