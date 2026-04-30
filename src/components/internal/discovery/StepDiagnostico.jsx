import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from 'lucide-react';

export default function StepDiagnostico({ data, onChange }) {
  const update = (field, value) => onChange({ ...data, [field]: value });

  const updatePorque = (idx, value) => {
    const arr = [...(data.cinco_porques || [])];
    arr[idx] = value;
    update('cinco_porques', arr);
  };

  const addPorque = () => update('cinco_porques', [...(data.cinco_porques || []), '']);
  const removePorque = (idx) => update('cinco_porques', data.cinco_porques.filter((_, i) => i !== idx));

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <Label className="text-slate-300 text-xs">Descrição do problema</Label>
        <Textarea value={data.problema || ''} onChange={e => update('problema', e.target.value)} className="bg-slate-700 border-slate-600 text-white h-20 resize-none" placeholder="Qual é o problema?" />
      </div>

      <div className="space-y-1">
        <Label className="text-slate-300 text-xs">Por que precisa ser resolvido?</Label>
        <Textarea value={data.porque_resolver || ''} onChange={e => update('porque_resolver', e.target.value)} className="bg-slate-700 border-slate-600 text-white h-20 resize-none" placeholder="Justificativa / impacto atual" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-slate-300 text-xs">5 Porquês</Label>
          <Button type="button" size="sm" variant="ghost" onClick={addPorque} className="text-indigo-400 hover:text-indigo-300 h-7"><Plus className="w-3 h-3 mr-1" />Adicionar</Button>
        </div>
        {(data.cinco_porques || []).map((p, i) => (
          <div key={i} className="flex gap-2 items-center">
            <span className="text-xs text-slate-500 w-12 flex-shrink-0">Porquê {i + 1}</span>
            <Input value={p} onChange={e => updatePorque(i, e.target.value)} className="bg-slate-700 border-slate-600 text-white" placeholder={`Por que... ?`} />
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300 flex-shrink-0" onClick={() => removePorque(i)}><Trash2 className="w-3 h-3" /></Button>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <Label className="text-slate-300 text-xs">Causa raiz (Ishikawa)</Label>
        <Textarea value={data.causa_raiz || ''} onChange={e => update('causa_raiz', e.target.value)} className="bg-slate-700 border-slate-600 text-white h-16 resize-none" placeholder="Qual a causa raiz identificada?" />
      </div>

      <div className="space-y-1">
        <Label className="text-slate-300 text-xs">Observações</Label>
        <Textarea value={data.observacoes || ''} onChange={e => update('observacoes', e.target.value)} className="bg-slate-700 border-slate-600 text-white h-16 resize-none" />
      </div>
    </div>
  );
}