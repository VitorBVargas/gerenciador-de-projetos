import React from 'react';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AIAssistButton from './AIAssistButton';

export default function StepToBe({ data, onChange, fullDiscovery }) {
  const update = (field, value) => onChange({ ...data, [field]: value });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AIAssistButton
          discovery={fullDiscovery}
          etapa="TO BE"
          instrucaoEspecifica="Com base no AS IS, gaps priorizados e causa raiz, sugira o desenho do novo processo (TO BE), as melhorias práticas em relação ao atual e os benefícios esperados (KPIs, ganhos operacionais, valor entregue)."
        />
      </div>

      <div className="space-y-1">
        <Label className="text-slate-300 text-xs">Descrição do novo processo</Label>
        <Textarea value={data.descricao || ''} onChange={e => update('descricao', e.target.value)} className="bg-slate-700 border-slate-600 text-white h-28 resize-none" placeholder="Como o processo deverá funcionar?" />
      </div>
      <div className="space-y-1">
        <Label className="text-slate-300 text-xs">Melhorias propostas</Label>
        <Textarea value={data.melhorias || ''} onChange={e => update('melhorias', e.target.value)} className="bg-slate-700 border-slate-600 text-white h-24 resize-none" placeholder="O que muda em relação ao AS IS" />
      </div>
      <div className="space-y-1">
        <Label className="text-slate-300 text-xs">Benefícios esperados</Label>
        <Textarea value={data.beneficios || ''} onChange={e => update('beneficios', e.target.value)} className="bg-slate-700 border-slate-600 text-white h-24 resize-none" placeholder="Ganhos, KPIs, valor entregue..." />
      </div>
    </div>
  );
}