import React from 'react';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import AIAssistButton from './AIAssistButton';

const SEIS_M = [
  { key: 'metodo', label: 'Método', hint: 'Procedimentos, processos, normas' },
  { key: 'maquina', label: 'Máquina', hint: 'Equipamentos, infra, ferramentas' },
  { key: 'mao_de_obra', label: 'Mão de obra', hint: 'Pessoas, treinamento, capacidade' },
  { key: 'material', label: 'Material', hint: 'Insumos, qualidade, disponibilidade' },
  { key: 'medida', label: 'Medida', hint: 'Métricas, indicadores, controles' },
  { key: 'meio_ambiente', label: 'Meio ambiente', hint: 'Cultura, ambiente físico/digital' }
];

export default function StepIshikawa({ data, onChange, fullDiscovery }) {
  const update = (field, value) => onChange({ ...data, [field]: value });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-white font-semibold text-sm">Diagrama de Ishikawa (6M)</h3>
          <p className="text-xs text-slate-500 mt-0.5">Liste possíveis causas em cada categoria. Depois resuma a causa principal abaixo.</p>
        </div>
        <AIAssistButton
          discovery={fullDiscovery}
          etapa="Ishikawa (6M)"
          instrucaoEspecifica="Com base no diagnóstico, sugira possíveis causas em cada uma das 6 categorias (Método, Máquina, Mão de obra, Material, Medida, Meio ambiente). Indique também qual seria a causa principal mais provável a ser explorada nos 5 Porquês."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SEIS_M.map(m => (
          <div key={m.key} className="space-y-1 bg-slate-900/50 border border-slate-700 rounded-lg p-3">
            <div className="flex items-baseline justify-between gap-2">
              <Label className="text-white text-sm font-semibold">{m.label}</Label>
              <span className="text-[10px] text-slate-500">{m.hint}</span>
            </div>
            <Textarea
              value={data[m.key] || ''}
              onChange={e => update(m.key, e.target.value)}
              className="bg-slate-800 border-slate-700 text-white h-20 resize-none text-sm"
              placeholder={`Causas relacionadas a ${m.label.toLowerCase()}...`}
            />
          </div>
        ))}
      </div>

      <div className="space-y-1 pt-3 border-t border-slate-700">
        <Label className="text-slate-300 text-xs">Causa principal identificada</Label>
        <Input
          value={data.causa_principal || ''}
          onChange={e => update('causa_principal', e.target.value)}
          className="bg-slate-700 border-slate-600 text-white"
          placeholder="Resuma em uma frase a causa principal a ser explorada nos 5 Porquês"
        />
        <p className="text-[11px] text-slate-500">Esta causa será o ponto de partida da próxima etapa.</p>
      </div>
    </div>
  );
}