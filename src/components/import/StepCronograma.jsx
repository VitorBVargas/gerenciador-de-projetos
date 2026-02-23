import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus, ChevronRight } from 'lucide-react';
import { phaseLabels } from '../timeline/phaseLabels';

const VERTICAL_LABELS = {
  arrecadacao: 'Arrecadação', compras: 'Compras', contabil: 'Contábil',
  pessoal: 'Pessoal', educacao: 'Educação', saude: 'Saúde',
  iss: 'ISS', parceiros: 'Parceiros', plataforma: 'Plataforma',
  atendimento: 'Atendimento', gerenciamento: 'Gerenciamento', outros: 'Outros',
};

const VERTICAL_COLORS = {
  arrecadacao: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  compras: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  contabil: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  pessoal: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  educacao: 'bg-green-500/20 text-green-300 border-green-500/30',
  saude: 'bg-red-500/20 text-red-300 border-red-500/30',
  iss: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  parceiros: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  plataforma: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  atendimento: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
};

const STANDARD_PHASES = [
  'planejamento_contrato', 'kickoff', 'diagnostico', 'onboarding_cliente',
  'configuracao_migracao_hml', 'homologacao_base', 'migracao_prd_blackout',
  'configuracao_prd', 'treinamento', 'go_live', 'operacao_assistida',
  'encerramento_bastao'
];

export default function StepCronograma({ cronogramas, setCronogramas, availableVerticals = [] }) {
  const [selectedVerticals, setSelectedVerticals] = useState([]);
  const [currentDates, setCurrentDates] = useState({});

  const allVerticals = availableVerticals.length > 0 ? availableVerticals : Object.keys(VERTICAL_LABELS);

  const addVerticals = () => {
    if (selectedVerticals.length === 0) return;
    
    const newCronograma = {
      id: Date.now(),
      verticals: selectedVerticals,
      dates: { ...currentDates }
    };
    
    setCronogramas([...cronogramas, newCronograma]);
    setSelectedVerticals([]);
    setCurrentDates({});
  };

  const removeCronograma = (id) => {
    setCronogramas(cronogramas.filter(c => c.id !== id));
  };

  const toggleVertical = (vertical) => {
    setSelectedVerticals(prev => {
      if (prev.includes(vertical)) {
        return prev.filter(v => v !== vertical);
      }
      return [...prev, vertical];
    });
  };

  const handleDateChange = (phase, dateType, value) => {
    setCurrentDates(prev => ({
      ...prev,
      [`${phase}_${dateType}`]: value
    }));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Configure os cronogramas das verticais. Selecione as verticais, defina as datas das etapas, e estas serão replicadas em todos os produtos daquela vertical.
      </p>

      {/* Seleção de verticais */}
      <div className="space-y-2">
        <Label className="text-slate-300 text-sm">Selecione as Verticais *</Label>
        <div className="flex flex-wrap gap-2">
          {allVerticals.map(vertical => (
            <button
              key={vertical}
              onClick={() => toggleVertical(vertical)}
              className={`px-3 py-2 rounded-lg border transition-all ${
                selectedVerticals.includes(vertical)
                  ? `${VERTICAL_COLORS[vertical]}`
                  : 'bg-slate-700/30 border-slate-600 text-slate-400 hover:text-slate-300'
              }`}
            >
              {VERTICAL_LABELS[vertical] || vertical}
            </button>
          ))}
        </div>
      </div>

      {/* Seleção de datas para fases */}
      {selectedVerticals.length > 0 && (
        <Card className="bg-slate-700/30 border-slate-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-300">
              Datas das Etapas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {STANDARD_PHASES.map(phase => (
              <div key={phase} className="space-y-1.5">
                <Label className="text-xs text-slate-400">{phaseLabels[phase]}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={currentDates[`${phase}_start`] || ''}
                    onChange={(e) => handleDateChange(phase, 'start', e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white h-8 text-sm"
                    placeholder="Início"
                  />
                  <Input
                    type="date"
                    value={currentDates[`${phase}_end`] || ''}
                    onChange={(e) => handleDateChange(phase, 'end', e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white h-8 text-sm"
                    placeholder="Fim"
                  />
                </div>
              </div>
            ))}
            <Button
              onClick={addVerticals}
              disabled={selectedVerticals.length === 0}
              className="w-full bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-600/30 mt-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Cronogramas
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Lista de cronogramas adicionados */}
      {cronogramas.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase">Cronogramas Configurados</p>
          {cronogramas.map((crono) => (
            <div key={crono.id} className="flex items-center justify-between bg-slate-700/40 border border-slate-700 rounded-lg px-3 py-2">
              <div className="flex flex-wrap gap-1">
                {crono.verticals.map(v => (
                  <Badge key={v} className={`${VERTICAL_COLORS[v]}`}>
                    {VERTICAL_LABELS[v] || v}
                  </Badge>
                ))}
              </div>
              <button
                onClick={() => removeCronograma(crono.id)}
                className="text-slate-500 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {cronogramas.length === 0 && (
        <p className="text-center text-slate-600 text-sm py-4">
          Nenhum cronograma adicionado ainda. Você pode adicionar depois.
        </p>
      )}
    </div>
  );
}