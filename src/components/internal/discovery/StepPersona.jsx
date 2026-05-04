import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AIAssistButton from './AIAssistButton';

export default function StepPersona({ data, onChange, fullDiscovery }) {
  const update = (field, value) => onChange({ ...data, [field]: value });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-white font-semibold text-sm">Usuário / Persona</h3>
          <p className="text-xs text-slate-500 mt-0.5">Quem é o usuário impactado por esse problema? Mapeie perfil, necessidades, dores e ganhos esperados.</p>
        </div>
        <AIAssistButton
          discovery={fullDiscovery}
          etapa="Usuário / Persona"
          instrucaoEspecifica="Com base no diagnóstico (problema e por que resolver), construa uma persona realista e específica para o contexto: nome fictício, perfil/cargo/contexto, necessidades, dores, ganhos esperados e um resumo da jornada atual. Evite generalidades — seja concreto."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-slate-300 text-xs">Nome da persona</Label>
          <Input
            value={data.nome || ''}
            onChange={e => update('nome', e.target.value)}
            placeholder="Ex.: Ana, Analista de Tributos"
            className="bg-slate-800/60 border-slate-700 text-white"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-slate-300 text-xs">Perfil / Cargo / Contexto</Label>
          <Input
            value={data.perfil || ''}
            onChange={e => update('perfil', e.target.value)}
            placeholder="Ex.: 35 anos, Prefeitura de médio porte, opera o sistema diariamente"
            className="bg-slate-800/60 border-slate-700 text-white"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-slate-300 text-xs">Necessidades / Objetivos</Label>
        <Textarea
          value={data.necessidades || ''}
          onChange={e => update('necessidades', e.target.value)}
          placeholder="O que essa pessoa precisa atingir?"
          className="bg-slate-800/60 border-slate-700 text-white min-h-[80px]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-slate-300 text-xs">Dores / Frustrações</Label>
          <Textarea
            value={data.dores || ''}
            onChange={e => update('dores', e.target.value)}
            placeholder="O que mais incomoda hoje?"
            className="bg-slate-800/60 border-slate-700 text-white min-h-[100px]"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-slate-300 text-xs">Ganhos esperados</Label>
          <Textarea
            value={data.ganhos || ''}
            onChange={e => update('ganhos', e.target.value)}
            placeholder="O que essa pessoa espera ganhar com a solução?"
            className="bg-slate-800/60 border-slate-700 text-white min-h-[100px]"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-slate-300 text-xs">Jornada atual (resumo)</Label>
        <Textarea
          value={data.jornada || ''}
          onChange={e => update('jornada', e.target.value)}
          placeholder="Descreva os principais passos que essa pessoa executa hoje para lidar com o problema."
          className="bg-slate-800/60 border-slate-700 text-white min-h-[100px]"
        />
      </div>
    </div>
  );
}