import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { gutScore, newId } from './discoveryUtils';
import AIAssistButton from './AIAssistButton';

export default function StepAsIs({ data, onChange, fullDiscovery }) {
  const update = (field, value) => onChange({ ...data, [field]: value });

  const addGap = () => update('gaps', [...(data.gaps || []), { id: newId(), descricao: '', gravidade: 3, urgencia: 3, tendencia: 3, no_escopo: true }]);
  const updateGap = (id, field, value) => update('gaps', data.gaps.map(g => g.id === id ? { ...g, [field]: value } : g));
  const removeGap = (id) => update('gaps', data.gaps.filter(g => g.id !== id));

  const addIdeia = () => update('ideias', [...(data.ideias || []), '']);
  const updateIdeia = (idx, value) => {
    const arr = [...(data.ideias || [])];
    arr[idx] = value;
    update('ideias', arr);
  };
  const removeIdeia = (idx) => update('ideias', data.ideias.filter((_, i) => i !== idx));

  const promoverIdeiaParaGap = (idx) => {
    const ideia = (data.ideias || [])[idx];
    if (!ideia?.trim()) return;
    const novosGaps = [...(data.gaps || []), { id: newId(), descricao: ideia.trim(), gravidade: 3, urgencia: 3, tendencia: 3, no_escopo: true }];
    onChange({
      ...data,
      gaps: novosGaps,
      ideias: data.ideias.filter((_, i) => i !== idx)
    });
  };

  const sortedGaps = [...(data.gaps || [])].sort((a, b) => gutScore(b) - gutScore(a));

  return (
    <div className="space-y-6">
      <AIAssistButton
        discovery={fullDiscovery}
        etapa="AS IS"
        instrucaoEspecifica="Sugira a descrição do processo atual e listas separadas de ideias de melhoria e gaps identificados. Cada item deve ser uma frase curta e específica."
        campos={[
          { key: 'descricao_processo', label: 'Descrição do processo atual', type: 'text' },
          { key: 'ideias', label: 'Ideias de melhoria (clique para adicionar)', type: 'list' },
          { key: 'gaps', label: 'Gaps identificados (clique para adicionar ao GUT)', type: 'list' }
        ]}
        onApply={(key, value) => {
          if (key === 'descricao_processo') {
            update('descricao_processo', value);
          } else if (key === 'ideias') {
            update('ideias', [...(data.ideias || []), value]);
          } else if (key === 'gaps') {
            const descricao = typeof value === 'string' ? value : (value?.descricao || JSON.stringify(value));
            update('gaps', [...(data.gaps || []), { id: newId(), descricao, gravidade: 3, urgencia: 3, tendencia: 3, no_escopo: true }]);
          }
        }}
      />

      {/* Mapeamento AS IS */}
      <section className="space-y-3">
        <h3 className="text-white font-semibold text-sm">Mapeamento AS IS</h3>
        <div className="space-y-1">
          <Label className="text-slate-300 text-xs">Descrição do processo atual</Label>
          <Textarea value={data.descricao_processo || ''} onChange={e => update('descricao_processo', e.target.value)} className="bg-slate-700 border-slate-600 text-white h-24 resize-none" placeholder="Como o processo funciona hoje?" />
        </div>
        <div className="space-y-1">
          <Label className="text-slate-300 text-xs">Link do BPMN (opcional)</Label>
          <Input value={data.bpmn_link || ''} onChange={e => update('bpmn_link', e.target.value)} className="bg-slate-700 border-slate-600 text-white" placeholder="https://..." />
        </div>
      </section>

      {/* Brainstorming */}
      <section className="space-y-2 pt-3 border-t border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold text-sm">Brainstorming de melhorias</h3>
            <p className="text-[11px] text-slate-500">Use a seta para mover uma ideia direto para o GUT abaixo.</p>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={addIdeia} className="text-indigo-400 hover:text-indigo-300 h-7"><Plus className="w-3 h-3 mr-1" />Adicionar ideia</Button>
        </div>
        {(data.ideias || []).map((idea, i) => (
          <div key={i} className="flex gap-2">
            <Input value={idea} onChange={e => updateIdeia(i, e.target.value)} className="bg-slate-700 border-slate-600 text-white" placeholder="Ideia de melhoria..." />
            <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-indigo-400 hover:text-indigo-300 flex-shrink-0" onClick={() => promoverIdeiaParaGap(i)} title="Mover para GUT"><ArrowRight className="w-4 h-4" /></Button>
            <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-red-400 hover:text-red-300 flex-shrink-0" onClick={() => removeIdeia(i)}><Trash2 className="w-3 h-3" /></Button>
          </div>
        ))}
        {(!data.ideias || data.ideias.length === 0) && <p className="text-xs text-slate-500">Nenhuma ideia ainda. Adicione livremente.</p>}
      </section>

      {/* Gaps + GUT + Escopo */}
      <section className="space-y-3 pt-3 border-t border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold text-sm">Gaps · Priorização (GUT) · Escopo</h3>
            <p className="text-xs text-slate-500 mt-0.5">G × U × T (1 a 5 cada). Marque o que entra no TO BE.</p>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={addGap} className="text-indigo-400 hover:text-indigo-300 h-7"><Plus className="w-3 h-3 mr-1" />Adicionar gap</Button>
        </div>

        {sortedGaps.length > 0 ? (
          <div className="overflow-x-auto bg-slate-900/50 rounded-lg border border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-xs text-slate-400">
                  <th className="px-2 py-2 text-left">Gap</th>
                  <th className="px-2 py-2 w-16">G</th>
                  <th className="px-2 py-2 w-16">U</th>
                  <th className="px-2 py-2 w-16">T</th>
                  <th className="px-2 py-2 w-16">Score</th>
                  <th className="px-2 py-2 w-20 text-center">No TO BE</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {sortedGaps.map(g => (
                  <tr key={g.id} className="border-b border-slate-800 last:border-0">
                    <td className="px-2 py-1.5">
                      <Input value={g.descricao} onChange={e => updateGap(g.id, 'descricao', e.target.value)} className="bg-slate-800 border-slate-700 text-white h-8 text-sm" placeholder="Descrição do gap" />
                    </td>
                    {['gravidade', 'urgencia', 'tendencia'].map(f => (
                      <td key={f} className="px-1 py-1.5">
                        <Input type="number" min={1} max={5} value={g[f] || 0} onChange={e => updateGap(g.id, f, Math.min(5, Math.max(1, Number(e.target.value) || 1)))} className="bg-slate-800 border-slate-700 text-white h-8 text-sm text-center" />
                      </td>
                    ))}
                    <td className="px-2 py-1.5 text-center font-bold text-indigo-400">{gutScore(g)}</td>
                    <td className="px-2 py-1.5 text-center">
                      <Checkbox checked={g.no_escopo !== false} onCheckedChange={v => updateGap(g.id, 'no_escopo', !!v)} className="border-slate-500 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600" />
                    </td>
                    <td className="px-1 py-1.5">
                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => removeGap(g.id)}><Trash2 className="w-3 h-3" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Nenhum gap mapeado.</p>
        )}
      </section>
    </div>
  );
}