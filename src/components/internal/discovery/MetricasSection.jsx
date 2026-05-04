import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Sparkles, Loader2, Check } from 'lucide-react';
import { newId } from './discoveryUtils';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

export default function MetricasSection({ metricas = [], onChange, fullDiscovery }) {
  const [generating, setGenerating] = useState(false);

  const addMetrica = (data = {}) => {
    onChange([
      ...metricas,
      {
        id: newId(),
        nome: data.nome || '',
        descricao: data.descricao || '',
        meta: data.meta || '',
        frequencia: data.frequencia || '',
        responsavel: data.responsavel || '',
        fonte_ia: !!data.fonte_ia
      }
    ]);
  };

  const updateMetrica = (id, patch) => {
    onChange(metricas.map(m => m.id === id ? { ...m, ...patch } : m));
  };

  const removeMetrica = (id) => {
    onChange(metricas.filter(m => m.id !== id));
  };

  const generateMetrics = async () => {
    setGenerating(true);
    try {
      const ctx = buildBriefContext(fullDiscovery);
      const prompt = `Você é o Discovery IA, consultor sênior em gestão de processos e produto. Com base no discovery abaixo, sugira **exatamente 5 métricas/indicadores** que o time deve acompanhar APÓS a execução do plano de ações para medir se o problema foi de fato resolvido.

Para cada métrica, retorne:
- nome: nome curto e específico
- descricao: o que mede e por que importa
- meta: valor alvo concreto (ou direção: aumentar/reduzir X%)
- frequencia: diária, semanal, mensal etc.
- responsavel: papel sugerido (ex.: "Líder do processo")

DISCOVERY:
${ctx}

Responda APENAS com JSON válido, sem texto extra.`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            metricas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nome: { type: "string" },
                  descricao: { type: "string" },
                  meta: { type: "string" },
                  frequencia: { type: "string" },
                  responsavel: { type: "string" }
                },
                required: ["nome"]
              }
            }
          }
        }
      });

      const sugeridas = (res?.metricas || []).slice(0, 5);
      if (sugeridas.length === 0) {
        toast.error('A IA não retornou métricas. Tente novamente.');
        setGenerating(false);
        return;
      }

      const novas = sugeridas.map(s => ({
        id: newId(),
        nome: s.nome || '',
        descricao: s.descricao || '',
        meta: s.meta || '',
        frequencia: s.frequencia || '',
        responsavel: s.responsavel || '',
        fonte_ia: true
      }));

      onChange([...metricas, ...novas]);
      toast.success(`${novas.length} métricas sugeridas pela IA`);
    } catch (err) {
      toast.error('Erro ao gerar métricas: ' + (err?.message || 'desconhecido'));
    }
    setGenerating(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-white font-semibold text-sm">Métricas / Indicadores de acompanhamento</h3>
          <p className="text-xs text-slate-500 mt-0.5">Como vamos medir se o problema foi resolvido após a execução das ações?</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={generateMetrics}
            disabled={generating}
            className="border-indigo-500/40 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
            Sugerir 5 métricas com IA
          </Button>
          <Button type="button" size="sm" onClick={() => addMetrica()} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-3 h-3 mr-1" />Adicionar
          </Button>
        </div>
      </div>

      {metricas.length === 0 && (
        <p className="text-xs text-slate-500 italic py-6 text-center">Nenhuma métrica ainda. Peça à IA ou adicione manualmente.</p>
      )}

      <div className="space-y-2">
        {metricas.map((m, idx) => (
          <div key={m.id} className={cn(
            "rounded-lg p-3 space-y-2 border",
            m.fonte_ia ? "bg-indigo-500/5 border-indigo-500/20" : "bg-slate-800/40 border-slate-700"
          )}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-500 flex items-center gap-2">
                #{idx + 1}
                {m.fonte_ia && <span className="text-[10px] text-indigo-400 flex items-center gap-1"><Sparkles className="w-3 h-3" />IA</span>}
              </span>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeMetrica(m.id)} className="text-slate-500 hover:text-red-400 h-6 w-6">
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-slate-300 text-[11px]">Nome</Label>
                <Input
                  value={m.nome || ''}
                  onChange={e => updateMetrica(m.id, { nome: e.target.value })}
                  placeholder="Ex.: Tempo médio de fechamento"
                  className="bg-slate-900/60 border-slate-700 text-white h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-300 text-[11px]">Meta</Label>
                <Input
                  value={m.meta || ''}
                  onChange={e => updateMetrica(m.id, { meta: e.target.value })}
                  placeholder="Ex.: Reduzir em 30%"
                  className="bg-slate-900/60 border-slate-700 text-white h-8 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-300 text-[11px]">Descrição</Label>
              <Textarea
                value={m.descricao || ''}
                onChange={e => updateMetrica(m.id, { descricao: e.target.value })}
                placeholder="O que mede e por que importa"
                className="bg-slate-900/60 border-slate-700 text-white min-h-[50px] text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-slate-300 text-[11px]">Frequência</Label>
                <Input
                  value={m.frequencia || ''}
                  onChange={e => updateMetrica(m.id, { frequencia: e.target.value })}
                  placeholder="Diária, semanal, mensal..."
                  className="bg-slate-900/60 border-slate-700 text-white h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-300 text-[11px]">Responsável</Label>
                <Input
                  value={m.responsavel || ''}
                  onChange={e => updateMetrica(m.id, { responsavel: e.target.value })}
                  placeholder="Quem acompanha"
                  className="bg-slate-900/60 border-slate-700 text-white h-8 text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildBriefContext(d) {
  if (!d) return '';
  const parts = [];
  if (d.name) parts.push(`Nome: ${d.name}`);
  if (d.diagnostico?.problema) parts.push(`Problema: ${d.diagnostico.problema}`);
  if (d.diagnostico?.porque_resolver) parts.push(`Por que resolver: ${d.diagnostico.porque_resolver}`);
  if (d.persona?.nome || d.persona?.dores) parts.push(`Persona: ${d.persona?.nome || ''} | dores: ${d.persona?.dores || '-'}`);
  if (d.ishikawa?.causa_principal) parts.push(`Causa principal: ${d.ishikawa.causa_principal}`);
  if (d.cinco_porques?.conclusao) parts.push(`Causa raiz: ${d.cinco_porques.conclusao}`);
  if (d.to_be?.descricao) parts.push(`TO BE: ${d.to_be.descricao}`);
  if (d.to_be?.beneficios) parts.push(`Benefícios esperados: ${d.to_be.beneficios}`);
  if (d.acoes?.length) {
    parts.push('Ações principais:');
    d.acoes.slice(0, 5).forEach((a, i) => parts.push(`- ${a.what || ''}`));
  }
  return parts.join('\n');
}