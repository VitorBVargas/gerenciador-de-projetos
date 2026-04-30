import React from 'react';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AIAssistButton from './AIAssistButton';

export default function StepDiagnostico({ data, onChange, fullDiscovery }) {
  const update = (field, value) => onChange({ ...data, [field]: value });

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <AIAssistButton
          discovery={fullDiscovery}
          etapa="Diagnóstico"
          instrucaoEspecifica="Sugira como descrever melhor o problema, perguntas de aprofundamento e justificativas convincentes para resolvê-lo. Se o usuário ainda não preencheu nada, ofereça um esqueleto baseado no nome do discovery."
        />
      </div>

      <div className="space-y-1">
        <Label className="text-slate-300 text-xs">Descrição do problema</Label>
        <Textarea value={data.problema || ''} onChange={e => update('problema', e.target.value)} className="bg-slate-700 border-slate-600 text-white h-24 resize-none" placeholder="Qual é o problema?" />
      </div>

      <div className="space-y-1">
        <Label className="text-slate-300 text-xs">Por que precisa ser resolvido?</Label>
        <Textarea value={data.porque_resolver || ''} onChange={e => update('porque_resolver', e.target.value)} className="bg-slate-700 border-slate-600 text-white h-24 resize-none" placeholder="Justificativa / impacto atual" />
      </div>

      <div className="space-y-1">
        <Label className="text-slate-300 text-xs">Observações (opcional)</Label>
        <Textarea value={data.observacoes || ''} onChange={e => update('observacoes', e.target.value)} className="bg-slate-700 border-slate-600 text-white h-16 resize-none" />
      </div>
    </div>
  );
}