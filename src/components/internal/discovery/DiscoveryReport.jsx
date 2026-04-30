import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Pencil, CheckCircle2, AlertCircle, ArrowRight, Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from "@/lib/utils";
import { riceScore, ricePriority } from './discoveryUtils';

const priorityColors = {
  critica: 'bg-red-500/20 text-red-400 border-red-500/30',
  alta: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  media: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  baixa: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
};

export default function DiscoveryReport({ open, onOpenChange, discovery, onEdit }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && discovery) {
      generateAnalysis();
    } else {
      setAnalysis(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, discovery?.id]);

  const generateAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = buildSummary(discovery);
      const prompt = `Você é o Discovery IA, consultor sênior de processos. Analise o discovery abaixo e responda em 3 blocos:

### Análise
Avalie a qualidade do discovery, profundidade da análise de causa raiz, clareza do problema, consistência entre etapas e completude do plano de ações.

### Boas Práticas
Liste 3 a 5 boas práticas relevantes para este caso (baseadas em PMBOK, Lean, Six Sigma, Design Thinking, BPMN, 5 Porquês, Ishikawa, GUT, RICE, 5W2H).

### Próximos Passos
Sugira 3 a 5 próximos passos práticos e objetivos para o time evoluir o discovery e a execução.

Responda em português, em markdown, com tom de consultor sênior, direto e específico (sem frases genéricas).

DISCOVERY:
${summary}`;

      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      setAnalysis(typeof res === 'string' ? res : (res?.text || JSON.stringify(res)));
    } catch (err) {
      setError(err?.message || 'Erro ao gerar análise');
    }
    setLoading(false);
  };

  if (!discovery) return null;

  const acoesOrdenadas = [...(discovery.acoes || [])].sort((a, b) => riceScore(b) - riceScore(a));
  const gaps = discovery.as_is?.gaps || [];
  const porques = discovery.cinco_porques?.porques || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Relatório do Discovery
              </DialogTitle>
              <p className="text-sm text-slate-400 mt-1 truncate">{discovery.name}</p>
            </div>
            <Button onClick={onEdit} variant="outline" size="sm" className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 flex-shrink-0">
              <Pencil className="w-3.5 h-3.5 mr-1.5" />Editar
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-5">
          {/* Resumo */}
          <section className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-white text-sm">Resumo</h3>
            {discovery.diagnostico?.problema && (
              <Field label="Problema" value={discovery.diagnostico.problema} />
            )}
            {discovery.diagnostico?.porque_resolver && (
              <Field label="Por que resolver" value={discovery.diagnostico.porque_resolver} />
            )}
            {discovery.ishikawa?.causa_principal && (
              <Field label="Causa principal (Ishikawa)" value={discovery.ishikawa.causa_principal} />
            )}
            {discovery.cinco_porques?.conclusao && (
              <Field label="Conclusão dos 5 Porquês" value={discovery.cinco_porques.conclusao} />
            )}
            {discovery.to_be?.descricao && (
              <Field label="TO BE" value={discovery.to_be.descricao} />
            )}
          </section>

          {/* 5 Porquês */}
          {porques.length > 0 && (
            <section className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                Cadeia dos 5 Porquês
              </h3>
              <ol className="space-y-2 text-sm">
                {porques.map((p, idx) => (
                  <li key={idx} className="border-l-2 border-amber-500/40 pl-3">
                    <p className="text-slate-300 font-medium">{idx + 1}. {p.pergunta}</p>
                    {p.resposta && <p className="text-slate-400 mt-0.5">{p.resposta}</p>}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Gaps */}
          {gaps.length > 0 && (
            <section className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-white text-sm">Gaps priorizados (GUT)</h3>
              <div className="space-y-1.5">
                {gaps.map(g => {
                  const score = (g.gravidade || 0) * (g.urgencia || 0) * (g.tendencia || 0);
                  return (
                    <div key={g.id} className="flex items-center justify-between gap-2 text-sm py-1.5 px-2 rounded bg-slate-800/40">
                      <span className="text-slate-300 truncate flex-1">{g.descricao || '(sem descrição)'}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {g.no_escopo && <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Escopo</Badge>}
                        <span className="text-xs text-indigo-400 font-mono">GUT {score}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Ações */}
          {acoesOrdenadas.length > 0 && (
            <section className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-white text-sm">Ações priorizadas (RICE)</h3>
              <div className="space-y-1.5">
                {acoesOrdenadas.map((a, idx) => (
                  <div key={a.id || idx} className="flex items-center justify-between gap-2 text-sm py-1.5 px-2 rounded bg-slate-800/40">
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300 truncate">{a.what || '(sem título)'}</p>
                      {(a.who || a.when) && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {[a.who, a.when].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className={cn("border text-xs", priorityColors[ricePriority(riceScore(a))])}>
                        {ricePriority(riceScore(a))}
                      </Badge>
                      <span className="text-xs text-indigo-400 font-mono">{Math.round(riceScore(a))}</span>
                      {a.task_id && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Análise IA */}
          <section className="bg-gradient-to-br from-indigo-900/30 to-purple-900/20 border border-indigo-500/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Análise da IA · Boas Práticas · Próximos Passos
              </h3>
              {!loading && (
                <Button onClick={generateAnalysis} variant="ghost" size="sm" className="text-indigo-300 hover:text-white hover:bg-indigo-500/10 h-7 text-xs">
                  Regenerar
                </Button>
              )}
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-slate-400 text-sm py-6 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando análise com Discovery IA...
              </div>
            )}

            {error && (
              <div className="text-red-400 text-sm py-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />{error}
              </div>
            )}

            {analysis && !loading && (
              <div className="prose prose-sm prose-invert max-w-none prose-headings:text-indigo-300 prose-strong:text-white prose-p:text-slate-300 prose-li:text-slate-300">
                <ReactMarkdown>{analysis}</ReactMarkdown>
              </div>
            )}
          </section>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800">
            Fechar
          </Button>
          <Button onClick={onEdit} className="bg-indigo-600 hover:bg-indigo-700">
            <Pencil className="w-4 h-4 mr-1.5" />Editar Discovery
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-slate-200 mt-0.5 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function buildSummary(d) {
  const parts = [];
  parts.push(`Nome: ${d.name || ''}`);
  parts.push(`Status: ${d.status || ''}`);
  if (d.diagnostico) {
    parts.push('--- Diagnóstico ---');
    parts.push(`Problema: ${d.diagnostico.problema || '-'}`);
    parts.push(`Por que resolver: ${d.diagnostico.porque_resolver || '-'}`);
    if (d.diagnostico.observacoes) parts.push(`Observações: ${d.diagnostico.observacoes}`);
  }
  if (d.ishikawa) {
    parts.push('--- Ishikawa (6M) ---');
    ['metodo','maquina','mao_de_obra','material','medida','meio_ambiente'].forEach(k => {
      if (d.ishikawa[k]) parts.push(`${k}: ${d.ishikawa[k]}`);
    });
    if (d.ishikawa.causa_principal) parts.push(`Causa principal: ${d.ishikawa.causa_principal}`);
  }
  if (d.cinco_porques?.porques?.length) {
    parts.push('--- 5 Porquês ---');
    d.cinco_porques.porques.forEach((p, i) => {
      parts.push(`${i+1}. P: ${p.pergunta || '-'} | R: ${p.resposta || '-'}`);
    });
    if (d.cinco_porques.conclusao) parts.push(`Conclusão: ${d.cinco_porques.conclusao}`);
  }
  if (d.as_is) {
    parts.push('--- AS IS ---');
    if (d.as_is.descricao_processo) parts.push(`Processo: ${d.as_is.descricao_processo}`);
    if (d.as_is.gaps?.length) {
      parts.push('Gaps:');
      d.as_is.gaps.forEach(g => {
        parts.push(`- ${g.descricao} (G${g.gravidade}/U${g.urgencia}/T${g.tendencia}, escopo: ${g.no_escopo ? 'sim' : 'não'})`);
      });
    }
  }
  if (d.to_be) {
    parts.push('--- TO BE ---');
    if (d.to_be.descricao) parts.push(`Descrição: ${d.to_be.descricao}`);
    if (d.to_be.melhorias) parts.push(`Melhorias: ${d.to_be.melhorias}`);
    if (d.to_be.beneficios) parts.push(`Benefícios: ${d.to_be.beneficios}`);
  }
  if (d.acoes?.length) {
    parts.push('--- Plano de Ações (5W2H + RICE) ---');
    d.acoes.forEach((a, i) => {
      parts.push(`${i+1}. What: ${a.what || '-'} | Why: ${a.why || '-'} | Who: ${a.who || '-'} | When: ${a.when || '-'} | How: ${a.how || '-'} | RICE(R${a.reach||0}/I${a.impact||0}/C${a.confidence||0}/E${a.effort||1})`);
    });
  }
  return parts.join('\n');
}