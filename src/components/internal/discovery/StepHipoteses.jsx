import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from 'lucide-react';
import { newId } from './discoveryUtils';
import AIAssistButton from './AIAssistButton';

const STATUS_LABEL = {
  a_validar: 'A validar',
  validada: 'Validada',
  invalidada: 'Invalidada'
};

export default function StepHipoteses({ hipoteses = [], onChange, fullDiscovery }) {
  const addHipotese = () => {
    onChange([
      ...hipoteses,
      { id: newId(), acreditamos_que: '', se_fizermos: '', iremos_observar: '', metrica_validacao: '', status: 'a_validar', confianca: 3 }
    ]);
  };

  const updateHipotese = (id, patch) => {
    onChange(hipoteses.map(h => h.id === id ? { ...h, ...patch } : h));
  };

  const removeHipotese = (id) => {
    onChange(hipoteses.filter(h => h.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-white font-semibold text-sm">Hipóteses</h3>
          <p className="text-xs text-slate-500 mt-0.5">Liste as suposições que precisam ser validadas para o TO BE funcionar. Use o formato: "Acreditamos que… Se fizermos… Iremos observar…"</p>
        </div>
        <div className="flex items-center gap-2">
          <AIAssistButton
            discovery={fullDiscovery}
            etapa="Hipóteses"
            instrucaoEspecifica="Gere de 3 a 5 hipóteses, cada uma como uma string única no formato: 'Acreditamos que [premissa] | Se fizermos [ação] | Iremos observar [resultado] | Métrica: [como validar]'. Use exatamente esse separador ' | '."
            campos={[
              { key: 'hipoteses', label: 'Hipóteses (clique para adicionar)', type: 'list' }
            ]}
            onApply={(key, value) => {
              const parts = String(value).split('|').map(s => s.trim());
              const acreditamos = parts[0]?.replace(/^Acreditamos que\s*/i, '') || '';
              const seFizermos = parts[1]?.replace(/^Se fizermos\s*/i, '') || '';
              const iremosObservar = parts[2]?.replace(/^Iremos observar\s*/i, '') || '';
              const metrica = parts[3]?.replace(/^Métrica:?\s*/i, '') || '';
              onChange([
                ...hipoteses,
                { id: newId(), acreditamos_que: acreditamos, se_fizermos: seFizermos, iremos_observar: iremosObservar, metrica_validacao: metrica, status: 'a_validar', confianca: 3 }
              ]);
            }}
          />
          <Button type="button" size="sm" onClick={addHipotese} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-3 h-3 mr-1" />Nova hipótese
          </Button>
        </div>
      </div>

      {hipoteses.length === 0 && (
        <p className="text-xs text-slate-500 italic py-6 text-center">Nenhuma hipótese ainda. Adicione manualmente ou peça ajuda à IA.</p>
      )}

      <div className="space-y-3">
        {hipoteses.map((h, idx) => (
          <div key={h.id} className="bg-slate-800/40 border border-slate-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-500">Hipótese #{idx + 1}</span>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeHipotese(h.id)} className="text-slate-500 hover:text-red-400 h-7 w-7">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Acreditamos que…</Label>
              <Textarea
                value={h.acreditamos_que || ''}
                onChange={e => updateHipotese(h.id, { acreditamos_que: e.target.value })}
                placeholder="Premissa que estamos assumindo"
                className="bg-slate-900/60 border-slate-700 text-white min-h-[60px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-300 text-xs">Se fizermos…</Label>
                <Textarea
                  value={h.se_fizermos || ''}
                  onChange={e => updateHipotese(h.id, { se_fizermos: e.target.value })}
                  placeholder="Ação ou mudança que será aplicada"
                  className="bg-slate-900/60 border-slate-700 text-white min-h-[60px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-300 text-xs">Iremos observar…</Label>
                <Textarea
                  value={h.iremos_observar || ''}
                  onChange={e => updateHipotese(h.id, { iremos_observar: e.target.value })}
                  placeholder="Resultado esperado e como será observado"
                  className="bg-slate-900/60 border-slate-700 text-white min-h-[60px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1 md:col-span-2">
                <Label className="text-slate-300 text-xs">Métrica/sinal de validação</Label>
                <Input
                  value={h.metrica_validacao || ''}
                  onChange={e => updateHipotese(h.id, { metrica_validacao: e.target.value })}
                  placeholder="Ex.: redução de 20% no tempo de fechamento"
                  className="bg-slate-900/60 border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Status</Label>
                  <Select value={h.status || 'a_validar'} onValueChange={v => updateHipotese(h.id, { status: v })}>
                    <SelectTrigger className="bg-slate-900/60 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white">
                      {Object.entries(STATUS_LABEL).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Confiança (1-5)</Label>
                  <Input
                    type="number"
                    min={1} max={5}
                    value={h.confianca ?? 3}
                    onChange={e => updateHipotese(h.id, { confianca: Number(e.target.value) || 0 })}
                    className="bg-slate-900/60 border-slate-700 text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}