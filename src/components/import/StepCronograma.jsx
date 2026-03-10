import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Layers, Package } from 'lucide-react';
import { phaseLabels } from '../timeline/phaseLabels';

const PHASE_KEYS = [
  'planejamento_contrato', 'kickoff', 'diagnostico', 'onboarding_cliente',
  'configuracao_migracao_hml', 'homologacao_base', 'migracao_prd_blackout',
  'configuracao_prd', 'treinamento', 'go_live', 'operacao_assistida',
  'encerramento_bastao'
];

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

// Converte "DD/MM" para "YYYY-MM-DD" - sem timezone
function parseDayMonth(raw) {
  if (!raw || !raw.trim()) return '';
  const currentYear = new Date().getFullYear();
  const match = raw.trim().match(/^(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?$/);
  if (!match) return '';
  
  const dayInt = parseInt(match[1]);
  const monthInt = parseInt(match[2]);
  const y = match[3] ? (match[3].length === 2 ? 2000 + parseInt(match[3]) : parseInt(match[3])) : currentYear;
  
  if (monthInt < 1 || monthInt > 12 || dayInt < 1 || dayInt > 31) return '';
  
  const m = String(monthInt).padStart(2, '0');
  const d = String(dayInt).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Converte "YYYY-MM-DD" para "DD/MM" para exibição
function toDisplay(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function DateInput({ value, onChange }) {
   const [raw, setRaw] = React.useState(toDisplay(value));

   const handleChange = (e) => {
     const input = e.target.value;
     const digits = input.replace(/\D/g, '').slice(0, 4);
     let formatted = digits;
     if (digits.length > 2) {
       formatted = digits.slice(0, 2) + '/' + digits.slice(2);
     }
     setRaw(formatted);

     if (formatted.length === 5 && formatted[2] === '/') {
       const parsed = parseDayMonth(formatted);
       console.log('DateInput - raw input:', input, 'formatted:', formatted, 'parsed:', parsed);
       if (parsed) onChange(parsed);
     } else if (digits.length === 0) {
       onChange('');
     }
   };

   const handleBlur = () => {
     if (!raw.trim()) { onChange(''); return; }
     const parsed = parseDayMonth(raw);
     if (parsed) {
       onChange(parsed);
       setRaw(toDisplay(parsed));
     } else {
       setRaw(toDisplay(value));
     }
   };

   React.useEffect(() => { setRaw(toDisplay(value)); }, [value]);

  return (
    <Input
      value={raw}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder="DD/MM"
      maxLength={5}
      className="bg-slate-700 border-slate-600 text-white h-7 text-xs px-2"
    />
  );
}

function DatesForm({ dates, onChange }) {
  return (
    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
      <div className="grid grid-cols-[1fr_100px_100px] gap-2 mb-2 sticky top-0 bg-slate-800 pb-1">
        <span className="text-xs text-slate-500 font-semibold">Etapa</span>
        <span className="text-xs text-slate-500 font-semibold text-center">Início</span>
        <span className="text-xs text-slate-500 font-semibold text-center">Fim</span>
      </div>
      {PHASE_KEYS.map(phase => (
        <div key={phase} className="grid grid-cols-[1fr_100px_100px] gap-2 items-center">
          <span className="text-xs text-slate-400 truncate">{phaseLabels[phase]}</span>
          <DateInput
            value={dates[`${phase}_start`] || ''}
            onChange={v => onChange(prev => ({ ...prev, [`${phase}_start`]: v }))}
          />
          <DateInput
            value={dates[`${phase}_end`] || ''}
            onChange={v => onChange(prev => ({ ...prev, [`${phase}_end`]: v }))}
          />
        </div>
      ))}
    </div>
  );
}

export default function StepCronograma({ cronogramas, setCronogramas, schedulingType, setSchedulingType, availableProducts = [] }) {
  const [selectedVerticals, setSelectedVerticals] = useState([]);
  const [currentDates, setCurrentDates] = useState({});

  const availableVerticals = [...new Set(availableProducts.map(p => p.vertical).filter(Boolean))];

  const addedVerticals = cronogramas.flatMap(c => c.verticals);
  const remainingVerticals = availableVerticals.filter(v => !addedVerticals.includes(v));

  const hasDates = Object.values(currentDates).some(v => v);

  const handleAddVertical = () => {
       if (selectedVerticals.length === 0 || !hasDates) return;
       setCronogramas(prev => [...prev, {
         id: Date.now(),
         verticals: selectedVerticals,
         dates: { ...currentDates }
       }]);
       setSelectedVerticals([]);
       setCurrentDates({});
     };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Configure o cronograma por vertical. Cada produto da vertical seguirá as mesmas datas.
      </p>

      <div className="space-y-3">
        <div>
          <Label className="text-slate-300 text-xs mb-1 block">Selecione as Verticais *</Label>
          {remainingVerticals.length === 0 && availableVerticals.length > 0 ? (
            <p className="text-xs text-green-400">✓ Todas as verticais já possuem cronograma</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(remainingVerticals.length > 0 ? remainingVerticals : Object.keys(VERTICAL_LABELS)).map(v => (
                <button
                  key={v}
                  onClick={() => setSelectedVerticals(prev =>
                    prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]
                  )}
                  className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${
                    selectedVerticals.includes(v)
                      ? (VERTICAL_COLORS[v] || 'bg-blue-500/20 text-blue-300 border-blue-500/30')
                      : 'bg-slate-700/30 border-slate-600 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  {VERTICAL_LABELS[v] || v}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedVerticals.length > 0 && (
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 space-y-3">
            <DatesForm dates={currentDates} onChange={setCurrentDates} />
            <Button onClick={handleAddVertical} disabled={!hasDates} size="sm"
              className="w-full bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-600/30">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Adicionar Cronograma das Verticais Selecionadas
            </Button>
            {!hasDates && (
              <p className="text-xs text-amber-500 text-center">Preencha pelo menos uma data para continuar</p>
            )}
          </div>
        )}
      </div>

      {/* Lista de cronogramas adicionados */}
      {cronogramas.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cronogramas Configurados ({cronogramas.length})</p>
          {cronogramas.map(crono => {
            const dateCount = Object.values(crono.dates).filter(v => v).length;
            return (
              <div key={crono.id} className="flex items-center justify-between bg-slate-700/40 border border-slate-700 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {crono.verticals.map(v => (
                    <Badge key={v} className={`text-xs ${VERTICAL_COLORS[v] || ''}`}>{VERTICAL_LABELS[v] || v}</Badge>
                  ))}
                  <span className="text-xs text-slate-500">{dateCount} data(s)</span>
                </div>
                <button onClick={() => setCronogramas(prev => prev.filter(c => c.id !== crono.id))}
                  className="text-slate-500 hover:text-red-400 ml-2 flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {cronogramas.length === 0 && (
        <div className="text-center py-3 text-sm text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          ⚠️ Adicione pelo menos um cronograma com datas para prosseguir
        </div>
      )}
    </div>
  );
}