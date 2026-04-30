import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, X, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

/**
 * Botão "Pedir ajuda à IA" para etapas do Discovery.
 * Recebe o contexto completo (discovery atual) e o nome da etapa,
 * e mostra a sugestão em um painel abaixo.
 */
export default function AIAssistButton({ discovery, etapa, instrucaoEspecifica, className }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleAsk = async () => {
    setOpen(true);
    setLoading(true);
    setError(null);
    setSuggestion(null);
    try {
      const ctx = buildContext(discovery);
      const prompt = `Você é o **Discovery IA**, consultor sênior de melhoria de processos (PMBOK, Lean, Six Sigma, Design Thinking, BPMN, 5 Porquês, Ishikawa, GUT, RICE, 5W2H).

O usuário está preenchendo a etapa "${etapa}" de um Discovery e pediu sua ajuda. Analise o que já foi preenchido nas etapas anteriores e ofereça uma sugestão objetiva e específica para esta etapa.

${instrucaoEspecifica ? `INSTRUÇÃO ESPECÍFICA PARA ESTA ETAPA:\n${instrucaoEspecifica}\n\n` : ''}DADOS JÁ PREENCHIDOS NO DISCOVERY:
${ctx}

Responda em português, em markdown, usando exatamente estes três blocos:

### Sugestão
Conteúdo concreto e pronto para uso (texto, tópicos, perguntas ou exemplos que o usuário possa copiar/adaptar para a etapa "${etapa}").

### Justificativa
Por que essa sugestão faz sentido com base nos dados anteriores e nas boas práticas.

### Próximo passo
O que o usuário deve fazer agora para evoluir esta etapa.

Seja direto, específico e evite frases genéricas.`;

      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      const text = typeof res === 'string' ? res : (res?.text || JSON.stringify(res));
      setSuggestion(text);
    } catch (err) {
      setError(err?.message || 'Erro ao consultar a IA');
      toast.error('Erro ao consultar a IA');
    }
    setLoading(false);
  };

  const handleCopy = () => {
    if (!suggestion) return;
    navigator.clipboard.writeText(suggestion);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {!open && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleAsk}
          className="border-indigo-500/40 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-200"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          Pedir ajuda à IA
        </Button>
      )}

      {open && (
        <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/20 border border-indigo-500/30 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-white">Discovery IA</span>
              <span className="text-xs text-slate-400">· {etapa}</span>
            </div>
            <div className="flex items-center gap-1">
              {suggestion && !loading && (
                <>
                  <Button type="button" size="sm" variant="ghost" onClick={handleCopy} className="text-slate-300 hover:text-white h-7 text-xs">
                    {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={handleAsk} className="text-indigo-300 hover:text-white h-7 text-xs">
                    Regerar
                  </Button>
                </>
              )}
              <Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)} className="text-slate-400 hover:text-white h-7 w-7">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-4 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              Consultando o Discovery IA...
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          {suggestion && !loading && (
            <div className="prose prose-sm prose-invert max-w-none prose-headings:text-indigo-300 prose-headings:text-sm prose-strong:text-white prose-p:text-slate-300 prose-li:text-slate-300 prose-p:my-1.5 prose-ul:my-1.5">
              <ReactMarkdown>{suggestion}</ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function buildContext(d) {
  if (!d) return '(nenhum dado preenchido ainda)';
  const parts = [];
  if (d.name) parts.push(`Nome: ${d.name}`);
  if (d.diagnostico && Object.values(d.diagnostico).some(Boolean)) {
    parts.push('--- Diagnóstico ---');
    if (d.diagnostico.problema) parts.push(`Problema: ${d.diagnostico.problema}`);
    if (d.diagnostico.porque_resolver) parts.push(`Por que resolver: ${d.diagnostico.porque_resolver}`);
    if (d.diagnostico.observacoes) parts.push(`Observações: ${d.diagnostico.observacoes}`);
  }
  if (d.ishikawa && Object.values(d.ishikawa).some(Boolean)) {
    parts.push('--- Ishikawa (6M) ---');
    ['metodo','maquina','mao_de_obra','material','medida','meio_ambiente'].forEach(k => {
      if (d.ishikawa[k]) parts.push(`${k}: ${d.ishikawa[k]}`);
    });
    if (d.ishikawa.causa_principal) parts.push(`Causa principal: ${d.ishikawa.causa_principal}`);
  }
  if (d.cinco_porques?.porques?.length) {
    parts.push('--- 5 Porquês ---');
    d.cinco_porques.porques.forEach((p, i) => {
      if (p.pergunta || p.resposta) parts.push(`${i+1}. P: ${p.pergunta || '-'} | R: ${p.resposta || '-'}`);
    });
    if (d.cinco_porques.conclusao) parts.push(`Conclusão: ${d.cinco_porques.conclusao}`);
  }
  if (d.as_is && (d.as_is.descricao_processo || d.as_is.gaps?.length || d.as_is.ideias?.length)) {
    parts.push('--- AS IS ---');
    if (d.as_is.descricao_processo) parts.push(`Processo atual: ${d.as_is.descricao_processo}`);
    if (d.as_is.ideias?.length) parts.push(`Ideias: ${d.as_is.ideias.filter(Boolean).join(' | ')}`);
    if (d.as_is.gaps?.length) {
      parts.push('Gaps:');
      d.as_is.gaps.forEach(g => {
        parts.push(`- ${g.descricao} (G${g.gravidade}/U${g.urgencia}/T${g.tendencia}, escopo: ${g.no_escopo ? 'sim' : 'não'})`);
      });
    }
  }
  if (d.to_be && Object.values(d.to_be).some(Boolean)) {
    parts.push('--- TO BE ---');
    if (d.to_be.descricao) parts.push(`Descrição: ${d.to_be.descricao}`);
    if (d.to_be.melhorias) parts.push(`Melhorias: ${d.to_be.melhorias}`);
    if (d.to_be.beneficios) parts.push(`Benefícios: ${d.to_be.beneficios}`);
  }
  if (d.acoes?.length) {
    parts.push('--- Plano de Ações ---');
    d.acoes.forEach((a, i) => {
      parts.push(`${i+1}. What: ${a.what || '-'} | Why: ${a.why || '-'} | Who: ${a.who || '-'} | When: ${a.when || '-'} | How: ${a.how || '-'}`);
    });
  }
  return parts.length ? parts.join('\n') : '(nenhum dado preenchido ainda)';
}