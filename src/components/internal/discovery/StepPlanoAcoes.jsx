import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { riceScore, ricePriority, newId } from './discoveryUtils';
import { cn } from "@/lib/utils";
import AIAssistButton from './AIAssistButton';

const priorityColor = {
  critica: 'bg-red-500/20 text-red-300 border-red-500/30',
  alta: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  media: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  baixa: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
};

export default function StepPlanoAcoes({ acoes = [], onChange, fullDiscovery }) {
  const [expanded, setExpanded] = React.useState({});

  const addAcao = () => {
    const id = newId();
    onChange([...acoes, { id, what: '', why: '', where: '', when: '', who: '', how: '', how_much: '', reach: 100, impact: 3, confidence: 80, effort: 1 }]);
    setExpanded(prev => ({ ...prev, [id]: true }));
  };
  const updateAcao = (id, field, value) => onChange(acoes.map(a => a.id === id ? { ...a, [field]: value } : a));
  const removeAcao = (id) => onChange(acoes.filter(a => a.id !== id));
  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const sorted = [...acoes].sort((a, b) => riceScore(b) - riceScore(a));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold text-sm">Plano de Ações (5W2H + RICE)</h3>
          <p className="text-xs text-slate-500 mt-0.5">Score RICE = (Reach × Impact × Confidence/100) / Effort. Ordenado por score.</p>
        </div>
        <div className="flex items-center gap-2">
          <AIAssistButton
            discovery={fullDiscovery}
            etapa="Plano de Ações"
            instrucaoEspecifica="Com base no TO BE, gaps priorizados e causa raiz, sugira ações 5W2H (What, Why, Where, When, Who, How, How much) específicas e prontas para uso. Para cada ação sugira também valores estimados de RICE (Reach, Impact 1-5, Confidence %, Effort). Sugira a ordem de execução considerando dependências."
          />
          <Button type="button" size="sm" onClick={addAcao} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="w-3 h-3 mr-1" />Nova ação</Button>
        </div>
      </div>

      {sorted.length === 0 && <p className="text-xs text-slate-500 py-6 text-center">Nenhuma ação cadastrada.</p>}

      {sorted.map((a, idx) => {
        const score = riceScore(a);
        const prio = ricePriority(score);
        const isOpen = expanded[a.id];
        return (
          <div key={a.id} className="bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 p-3 cursor-pointer hover:bg-slate-800/40" onClick={() => toggle(a.id)}>
              <span className="text-xs text-slate-500 font-mono w-5">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{a.what || <span className="text-slate-500 italic">Ação sem título</span>}</p>
                <p className="text-xs text-slate-500 truncate">{a.who && `${a.who}`}{a.who && a.when && ' · '}{a.when && `Prazo: ${a.when}`}</p>
              </div>
              <span className={cn("px-2 py-0.5 rounded text-xs font-medium border", priorityColor[prio])}>{prio}</span>
              <span className="text-sm font-bold text-indigo-400 min-w-[40px] text-right">{score}</span>
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={(e) => { e.stopPropagation(); removeAcao(a.id); }}><Trash2 className="w-3 h-3" /></Button>
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-slate-400">
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>

            {isOpen && (
              <div className="p-3 border-t border-slate-700 space-y-3 bg-slate-800/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">What — O que fazer</Label>
                    <Input value={a.what || ''} onChange={e => updateAcao(a.id, 'what', e.target.value)} className="bg-slate-700 border-slate-600 text-white h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Who — Quem</Label>
                    <Input value={a.who || ''} onChange={e => updateAcao(a.id, 'who', e.target.value)} className="bg-slate-700 border-slate-600 text-white h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Why — Por quê</Label>
                    <Textarea value={a.why || ''} onChange={e => updateAcao(a.id, 'why', e.target.value)} className="bg-slate-700 border-slate-600 text-white h-16 resize-none" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">How — Como</Label>
                    <Textarea value={a.how || ''} onChange={e => updateAcao(a.id, 'how', e.target.value)} className="bg-slate-700 border-slate-600 text-white h-16 resize-none" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Where — Onde</Label>
                    <Input value={a.where || ''} onChange={e => updateAcao(a.id, 'where', e.target.value)} className="bg-slate-700 border-slate-600 text-white h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">When — Quando (data)</Label>
                    <Input type="date" value={a.when || ''} onChange={e => updateAcao(a.id, 'when', e.target.value)} className="bg-slate-700 border-slate-600 text-white h-9" />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-slate-300 text-xs">How much — Quanto custa</Label>
                    <Input value={a.how_much || ''} onChange={e => updateAcao(a.id, 'how_much', e.target.value)} className="bg-slate-700 border-slate-600 text-white h-9" placeholder="R$ ou estimativa de esforço" />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-700">
                  <p className="text-xs text-slate-400 mb-2 font-medium">Priorização RICE</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-slate-400 text-[11px]">Reach (alcance)</Label>
                      <Input type="number" min={0} value={a.reach || 0} onChange={e => updateAcao(a.id, 'reach', Number(e.target.value) || 0)} className="bg-slate-700 border-slate-600 text-white h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-400 text-[11px]">Impact (1-5)</Label>
                      <Input type="number" min={0} max={5} step="0.5" value={a.impact || 0} onChange={e => updateAcao(a.id, 'impact', Number(e.target.value) || 0)} className="bg-slate-700 border-slate-600 text-white h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-400 text-[11px]">Confidence (%)</Label>
                      <Input type="number" min={0} max={100} value={a.confidence || 0} onChange={e => updateAcao(a.id, 'confidence', Number(e.target.value) || 0)} className="bg-slate-700 border-slate-600 text-white h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-400 text-[11px]">Effort (pessoa-mês)</Label>
                      <Input type="number" min={0.1} step="0.1" value={a.effort || 1} onChange={e => updateAcao(a.id, 'effort', Number(e.target.value) || 1)} className="bg-slate-700 border-slate-600 text-white h-8 text-sm" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}