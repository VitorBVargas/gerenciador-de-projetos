import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, X, Check, Plus, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

/**
 * AIAssistButton — gera sugestões estruturadas por CAMPO.
 *
 * Props:
 * - discovery: objeto completo (contexto enviado à IA)
 * - etapa: nome da etapa (apenas para exibição)
 * - instrucaoEspecifica: instrução adicional para a IA
 * - campos: [{ key, label, type: 'text'|'list', placeholder? }]
 *      Define os campos que a IA deve sugerir e que o usuário pode aplicar.
 * - onApply: (key, value) => void
 *      Chamada quando usuário clica para aplicar uma sugestão de campo.
 *      Para type='list', value será um item da lista.
 * - onApplyAll: (suggestions) => void  (opcional)
 *      Aplica todas as sugestões de uma vez.
 */
export default function AIAssistButton({
  discovery,
  etapa,
  instrucaoEspecifica,
  campos,
  onApply,
  onApplyAll,
  className
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null); // { [key]: string | string[] }
  const [applied, setApplied] = useState({}); // { [key|key:idx]: true }
  const [error, setError] = useState(null);

  const hasCampos = Array.isArray(campos) && campos.length > 0;

  const buildSchema = () => {
    if (!hasCampos) return null;
    const props = {};
    campos.forEach(c => {
      if (c.type === 'list') {
        props[c.key] = { type: 'array', items: { type: 'string' } };
      } else {
        props[c.key] = { type: 'string' };
      }
    });
    return { type: 'object', properties: props };
  };

  const handleAsk = async () => {
    setOpen(true);
    setLoading(true);
    setError(null);
    setSuggestions(null);
    setApplied({});
    try {
      const ctx = buildContext(discovery);
      const camposDesc = hasCampos
        ? campos.map(c => `- ${c.key} (${c.type === 'list' ? 'lista de strings' : 'texto'}): ${c.label}${c.descricao ? ` — ${c.descricao}` : ''}`).join('\n')
        : '';

      const prompt = `Você é o **Discovery IA**, consultor sênior de melhoria de processos (PMBOK, Lean, Six Sigma, Design Thinking, BPMN, 5 Porquês, Ishikawa, GUT, RICE, 5W2H).

Etapa atual do Discovery: "${etapa}".
${instrucaoEspecifica ? `\nINSTRUÇÃO ESPECÍFICA:\n${instrucaoEspecifica}\n` : ''}
DADOS JÁ PREENCHIDOS NO DISCOVERY:
${ctx}

${hasCampos ? `Sua tarefa: gerar uma sugestão CONCRETA E PRONTA PARA USO para cada um dos campos abaixo. O usuário poderá aplicar campo a campo, então cada valor deve ser autoexplicativo e não conter cabeçalhos ou rótulos.

CAMPOS:
${camposDesc}

Regras:
- Para campos de texto: retorne apenas o conteúdo a ser colado no campo (sem prefixos como "Problema:" ou "Sugestão:").
- Para campos de lista: retorne um array de strings, cada string sendo um item independente.
- Seja específico ao contexto, evite frases genéricas.
- Responda APENAS com JSON válido seguindo o schema, sem texto extra.` : 'Responda em português, em markdown, com sugestões objetivas e específicas para a etapa.'}`;

      const params = { prompt };
      if (hasCampos) params.response_json_schema = buildSchema();

      const res = await base44.integrations.Core.InvokeLLM(params);

      if (hasCampos) {
        setSuggestions(res || {});
      } else {
        setSuggestions({ _markdown: typeof res === 'string' ? res : (res?.text || JSON.stringify(res)) });
      }
    } catch (err) {
      setError(err?.message || 'Erro ao consultar a IA');
      toast.error('Erro ao consultar a IA');
    }
    setLoading(false);
  };

  const applyField = (key, value, listIdx) => {
    onApply?.(key, value);
    const mark = listIdx !== undefined ? `${key}:${listIdx}` : key;
    setApplied(prev => ({ ...prev, [mark]: true }));
  };

  const applyAll = () => {
    if (!suggestions) return;
    if (onApplyAll) {
      onApplyAll(suggestions);
    } else if (onApply) {
      campos?.forEach(c => {
        const v = suggestions[c.key];
        if (v !== undefined && v !== null && v !== '') onApply(c.key, v);
      });
    }
    const newApplied = {};
    campos?.forEach(c => {
      const v = suggestions[c.key];
      if (Array.isArray(v)) v.forEach((_, i) => newApplied[`${c.key}:${i}`] = true);
      else if (v) newApplied[c.key] = true;
    });
    setApplied(newApplied);
    toast.success('Sugestões aplicadas');
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
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span className="text-sm font-semibold text-white">Discovery IA</span>
              <span className="text-xs text-slate-400 truncate">· {etapa}</span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {suggestions && !loading && hasCampos && (onApplyAll || onApply) && (
                <Button type="button" size="sm" variant="ghost" onClick={applyAll} className="text-green-300 hover:text-white hover:bg-green-500/10 h-7 text-xs">
                  <Wand2 className="w-3 h-3 mr-1" />Aplicar tudo
                </Button>
              )}
              {suggestions && !loading && (
                <Button type="button" size="sm" variant="ghost" onClick={handleAsk} className="text-indigo-300 hover:text-white h-7 text-xs">
                  Regerar
                </Button>
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

          {error && <p className="text-red-400 text-sm">{error}</p>}

          {suggestions && !loading && !hasCampos && (
            <p className="text-xs text-slate-300 whitespace-pre-wrap">{suggestions._markdown}</p>
          )}

          {suggestions && !loading && hasCampos && (
            <p className="text-[11px] text-slate-400">Clique em uma sugestão para preencher o campo correspondente.</p>
          )}

          {suggestions && !loading && hasCampos && (
            <div className="space-y-3">
              {campos.map(c => {
                const value = suggestions[c.key];
                if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) return null;

                if (c.type === 'list' && Array.isArray(value)) {
                  return (
                    <div key={c.key} className="space-y-1.5">
                      <p className="text-[11px] text-indigo-300 font-medium uppercase tracking-wide">{c.label}</p>
                      <div className="space-y-1.5">
                        {value.map((item, i) => (
                          <SuggestionCard
                            key={i}
                            text={item}
                            applied={!!applied[`${c.key}:${i}`]}
                            onApply={() => applyField(c.key, item, i)}
                            icon={<Plus className="w-3 h-3" />}
                            actionLabel="Adicionar"
                          />
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={c.key} className="space-y-1.5">
                    <p className="text-[11px] text-indigo-300 font-medium uppercase tracking-wide">{c.label}</p>
                    <SuggestionCard
                      text={String(value)}
                      applied={!!applied[c.key]}
                      onApply={() => applyField(c.key, value)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SuggestionCard({ text, applied, onApply, actionLabel = 'Aplicar', icon }) {
  return (
    <button
      type="button"
      onClick={onApply}
      className={cn(
        "w-full text-left p-2.5 rounded border transition-all group",
        applied
          ? "bg-green-500/10 border-green-500/30 hover:bg-green-500/15"
          : "bg-slate-900/40 border-slate-700/60 hover:border-indigo-500/50 hover:bg-slate-900/60"
      )}
    >
      <div className="flex items-start gap-2">
        <p className="flex-1 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">{text}</p>
        <span className={cn(
          "flex-shrink-0 flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded transition-colors",
          applied
            ? "bg-green-500/20 text-green-300"
            : "bg-indigo-500/10 text-indigo-300 group-hover:bg-indigo-500/20"
        )}>
          {applied ? <><Check className="w-3 h-3" />Aplicado</> : <>{icon || <Check className="w-3 h-3" />}{actionLabel}</>}
        </span>
      </div>
    </button>
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
  if (d.persona && Object.values(d.persona).some(Boolean)) {
    parts.push('--- Persona ---');
    Object.entries(d.persona).forEach(([k, v]) => v && parts.push(`${k}: ${v}`));
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
  if (d.hipoteses?.length) {
    parts.push('--- Hipóteses ---');
    d.hipoteses.forEach((h, i) => parts.push(`${i+1}. Acreditamos: ${h.acreditamos_que || '-'} | Se fizermos: ${h.se_fizermos || '-'} | Observaremos: ${h.iremos_observar || '-'}`));
  }
  if (d.acoes?.length) {
    parts.push('--- Plano de Ações ---');
    d.acoes.forEach((a, i) => {
      parts.push(`${i+1}. What: ${a.what || '-'} | Why: ${a.why || '-'} | Who: ${a.who || '-'} | When: ${a.when || '-'} | How: ${a.how || '-'}`);
    });
  }
  return parts.length ? parts.join('\n') : '(nenhum dado preenchido ainda)';
}