import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

import AIAssistButton from './AIAssistButton';

export default function StepCincoPorques({ data, diagnostico, ishikawa, onChange, fullDiscovery }) {
  const [generating, setGenerating] = useState(null); // index do próximo "porque" sendo gerado

  const porques = data.porques || []; // [{ pergunta, resposta }, ...]
  const primeira = data.primeira_pergunta || '';

  const updatePrimeira = (val) => onChange({ ...data, primeira_pergunta: val });
  const updateConclusao = (val) => onChange({ ...data, conclusao: val });

  const updatePorque = (idx, field, value) => {
    const arr = [...porques];
    arr[idx] = { ...arr[idx], [field]: value };
    onChange({ ...data, porques: arr });
  };

  const buildContext = () => {
    const seisM = ['metodo', 'maquina', 'mao_de_obra', 'material', 'medida', 'meio_ambiente']
      .map(k => ishikawa?.[k] ? `- ${k}: ${ishikawa[k]}` : null)
      .filter(Boolean)
      .join('\n');
    return [
      diagnostico?.problema && `Descrição do problema: ${diagnostico.problema}`,
      diagnostico?.porque_resolver && `Por que precisa ser resolvido: ${diagnostico.porque_resolver}`,
      ishikawa?.causa_principal && `Causa principal (Ishikawa): ${ishikawa.causa_principal}`,
      seisM && `Causas mapeadas (6M):\n${seisM}`
    ].filter(Boolean).join('\n\n');
  };

  const gerarPergunta = async (idx) => {
    setGenerating(idx);
    try {
      const ctx = buildContext();
      const historico = porques.slice(0, idx).map((p, i) => `Porquê ${i + 1}: ${p.pergunta}\nResposta: ${p.resposta}`).join('\n\n');
      const baseAnterior = idx === 0
        ? (ishikawa?.causa_principal || diagnostico?.problema || '')
        : porques[idx - 1]?.resposta;

      const prompt = `Você está conduzindo a técnica dos 5 Porquês para encontrar a causa raiz de um problema.

CONTEXTO:
${ctx}

${historico ? `HISTÓRICO DOS PORQUÊS ANTERIORES:\n${historico}\n\n` : ''}Resposta/causa imediatamente anterior a ser aprofundada: "${baseAnterior}"

Sua tarefa: gerar APENAS o próximo "Por que..." (Porquê ${idx + 1} de 5), aprofundando a resposta anterior. Use a forma de pergunta direta começando com "Por que". Seja específico, conciso (máximo 20 palavras) e ataque a causa, não o sintoma. Não responda, só pergunte.

Retorne só a pergunta, sem prefixo, sem aspas.`;

      const resp = await base44.integrations.Core.InvokeLLM({ prompt });
      const pergunta = (typeof resp === 'string' ? resp : resp?.text || '').trim().replace(/^["']|["']$/g, '');
      if (!pergunta) {
        toast.error('Não foi possível gerar a pergunta. Digite manualmente.');
        return;
      }

      if (idx === 0) {
        // primeira pergunta vai pro campo "primeira_pergunta" e também inicia o array
        const arr = [...porques];
        arr[0] = { pergunta, resposta: arr[0]?.resposta || '' };
        onChange({ ...data, primeira_pergunta: pergunta, porques: arr });
      } else {
        updatePorque(idx, 'pergunta', pergunta);
      }
    } catch (err) {
      toast.error('Erro ao gerar com IA: ' + (err?.message || 'desconhecido'));
    }
    setGenerating(null);
  };

  // Garante que sempre temos 5 slots
  const slots = Array.from({ length: 5 }, (_, i) => porques[i] || { pergunta: i === 0 ? primeira : '', resposta: '' });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-white font-semibold text-sm">5 Porquês</h3>
          <p className="text-xs text-slate-500 mt-0.5">A IA gera as perguntas a partir do diagnóstico e Ishikawa. Você responde, e a próxima pergunta é gerada com base na sua resposta.</p>
        </div>
        <AIAssistButton
          discovery={fullDiscovery}
          etapa="5 Porquês"
          instrucaoEspecifica="Com base no diagnóstico e na causa principal do Ishikawa, sugira a cadeia completa dos 5 Porquês (perguntas E respostas plausíveis) e a conclusão final sobre a causa raiz. Apresente cada porquê de forma específica, atacando causa e não sintoma."
        />
      </div>

      {/* Resumo do contexto */}
      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-xs space-y-1">
        {diagnostico?.problema && <p><span className="text-slate-500">Problema:</span> <span className="text-slate-300">{diagnostico.problema}</span></p>}
        {ishikawa?.causa_principal && <p><span className="text-slate-500">Causa principal:</span> <span className="text-slate-300">{ishikawa.causa_principal}</span></p>}
        {!diagnostico?.problema && !ishikawa?.causa_principal && (
          <p className="text-amber-400">⚠ Preencha o Diagnóstico e a Causa Raiz (Ishikawa) antes para que a IA gere boas perguntas.</p>
        )}
      </div>

      {slots.map((p, i) => {
        const podeGerar = i === 0
          ? (!!diagnostico?.problema || !!ishikawa?.causa_principal)
          : !!porques[i - 1]?.resposta?.trim();

        return (
          <div key={i} className="bg-slate-800/40 border border-slate-700 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-600/20 text-indigo-400 text-xs font-bold px-2 py-1 rounded">Porquê {i + 1}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => gerarPergunta(i)}
                disabled={!podeGerar || generating !== null}
                className="text-indigo-400 hover:text-indigo-300 h-7 ml-auto"
              >
                {generating === i ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                {p.pergunta ? 'Regerar com IA' : 'Gerar com IA'}
              </Button>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-400 text-[11px]">Pergunta</Label>
              <Input
                value={p.pergunta || ''}
                onChange={e => {
                  if (i === 0) updatePrimeira(e.target.value);
                  updatePorque(i, 'pergunta', e.target.value);
                }}
                className="bg-slate-700 border-slate-600 text-white text-sm"
                placeholder={`Por que...?`}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-slate-400 text-[11px]">Resposta</Label>
              <Textarea
                value={p.resposta || ''}
                onChange={e => updatePorque(i, 'resposta', e.target.value)}
                className="bg-slate-700 border-slate-600 text-white h-16 resize-none text-sm"
                placeholder="Sua resposta..."
              />
            </div>

            {i < 4 && p.resposta && <div className="flex justify-center"><ArrowDown className="w-4 h-4 text-slate-600" /></div>}
          </div>
        );
      })}

      <div className="space-y-1 pt-3 border-t border-slate-700">
        <Label className="text-slate-300 text-xs">Conclusão / Causa raiz final</Label>
        <Textarea
          value={data.conclusao || ''}
          onChange={e => updateConclusao(e.target.value)}
          className="bg-slate-700 border-slate-600 text-white h-20 resize-none"
          placeholder="Após os 5 porquês, qual é a causa raiz a ser atacada?"
        />
      </div>
    </div>
  );
}