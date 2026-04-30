import React from 'react';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function StepMvp({ data, onChange }) {
  const update = (field, value) => onChange({ ...data, [field]: value });

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-slate-300 text-xs">Descrição do MVP</Label>
        <Textarea value={data.descricao || ''} onChange={e => update('descricao', e.target.value)} className="bg-slate-700 border-slate-600 text-white h-24 resize-none" placeholder="O que será entregue como MVP?" />
      </div>
      <div className="space-y-1">
        <Label className="text-slate-300 text-xs">Como será validado</Label>
        <Textarea value={data.validacao || ''} onChange={e => update('validacao', e.target.value)} className="bg-slate-700 border-slate-600 text-white h-24 resize-none" placeholder="Métricas, usuários-alvo, prazo de teste..." />
      </div>
      <div className="space-y-1">
        <Label className="text-slate-300 text-xs">Critérios de sucesso</Label>
        <Textarea value={data.criterios_sucesso || ''} onChange={e => update('criterios_sucesso', e.target.value)} className="bg-slate-700 border-slate-600 text-white h-24 resize-none" placeholder="Quando consideramos validado?" />
      </div>
    </div>
  );
}