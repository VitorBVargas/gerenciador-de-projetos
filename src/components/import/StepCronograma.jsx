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

// Converte "DD/MM" para "YYYY-MM-DD" usando o ano atual
function parseDayMonth(raw) {
  const currentYear = new Date().getFullYear();
  const match = raw.trim().match(/^(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?$/);
  if (!match) return '';
  const d = match[1].padStart(2, '0');
  const m = match[2].padStart(2, '0');
  const y = match[3] ? (match[3].length === 2 ? `20${match[3]}` : match[3]) : String(currentYear);
  if (parseInt(m) < 1 || parseInt(m) > 12 || parseInt(d) < 1 || parseInt(d) > 31) return '';
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

  // Sync when value changes externally
  React.useEffect(() => { setRaw(toDisplay(value)); }, [value]);

  return (
    <Input
      value={raw}
      onChange={e => setRaw(e.target.value)}
      onBlur={handleBlur}
      placeholder="DD/MM"
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
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentDates, setCurrentDates] = useState({});

  const availableVerticals = [...new Set(availableProducts.map(p => p.vertical).filter(Boolean))];

  const addedProductNames = cronogramas.filter(c => c.type === 'produto').map(c => c.productName);
  const remainingProducts = availableProducts.filter(p => !addedProductNames.includes(p.name));

  const addedVerticals = cronogramas.filter(c => c.type === 'vertical').flatMap(c => c.verticals);
  const remainingVerticals = availableVerticals.filter(v => !addedVerticals.includes(v));

  const hasDates = Object.values(currentDates).some(v => v);

  const handleChangeType = (type) => {
    setSchedulingType(type);
    setCronogramas([]);
    setCurrentDates({});
    setSelectedProduct(null);
    setSelectedVerticals([]);
  };

  const handleAddVertical = () => {
    if (selectedVerticals.length === 0 || !hasDates) return;
    setCronogramas(prev => [...prev, {
      id: Date.now(), type: 'vertical',
      verticals: selectedVerticals,
      dates: { ...currentDates }
    }]);
    setSelectedVerticals([]);
    setCurrentDates({});
  };

  const handleAddProduct = () => {
    if (!selectedProduct || !hasDates) return;
    setCronogramas(prev => [...prev, {
      id: Date.now(), type: 'produto',
      productName: selectedProduct.name,
      vertical: selectedProduct.vertical,
      dates: { ...currentDates }
    }]);
    setSelectedProduct(null);
    setCurrentDates({});
  };

  return (
    <div className="space-y-4">
      {/* Tipo de cronograma */}
      <div>
        <Label className="text-slate-300 text-sm mb-2 block">Tipo de Cronograma *</Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleChangeType('por_vertical')}
            className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
              schedulingType === 'por_vertical'
                ? 'border-blue-500 bg-blue-600/15 text-blue-300'
                : 'border-slate-600 bg-slate-700/30 text-slate-400 hover:border-slate-500'
            }`}
          >
            <Layers className="w-5 h-5" />
            <div className="text-center">
              <p className="text-sm font-semibold">Por Vertical</p>
              <p className="text-xs opacity-70">Mesmas datas para todos os produtos da vertical</p>
            </div>
          </button>
          <button
            onClick={() => handleChangeType('por_produto')}
            className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
              schedulingType === 'por_produto'
                ? 'border-purple-500 bg-purple-600/15 text-purple-300'
                : 'border-slate-600 bg-slate-700/30 text-slate-400 hover:border-slate-500'
            }`}
          >
            <Package className="w-5 h-5" />
            <div className="text-center">
              <p className="text-sm font-semibold">Por Produto</p>
              <p className="text-xs opacity-70">Datas específicas para cada produto</p>
            </div>
          </button>
        </div>
      </div>

      {/* Form - Por Vertical */}
      {schedulingType === 'por_vertical' && (
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
      )}

      {/* Form - Por Produto */}
      {schedulingType === 'por_produto' && (
        <div className="space-y-3">
          <div>
            <Label className="text-slate-300 text-xs mb-1 block">Selecione o Produto *</Label>
            {remainingProducts.length === 0 ? (
              <p className="text-xs text-green-400">✓ Todos os produtos já possuem cronograma</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {remainingProducts.map(p => (
                  <button
                    key={p.name}
                    onClick={() => { setSelectedProduct(selectedProduct?.name === p.name ? null : p); setCurrentDates({}); }}
                    className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${
                      selectedProduct?.name === p.name
                        ? 'border-purple-500 bg-purple-600/15 text-purple-300'
                        : 'bg-slate-700/30 border-slate-600 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    {p.name}
                    <span className="ml-1 opacity-50">({VERTICAL_LABELS[p.vertical] || p.vertical})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedProduct && (
            <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 space-y-3">
              <p className="text-xs text-purple-300 font-semibold">{selectedProduct.name}</p>
              <DatesForm dates={currentDates} onChange={setCurrentDates} />
              <Button onClick={handleAddProduct} disabled={!hasDates} size="sm"
                className="w-full bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-600/30">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Adicionar Cronograma do Produto
              </Button>
              {!hasDates && (
                <p className="text-xs text-amber-500 text-center">Preencha pelo menos uma data para continuar</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lista de cronogramas adicionados */}
      {cronogramas.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cronogramas Configurados ({cronogramas.length})</p>
          {cronogramas.map(crono => {
            const dateCount = Object.values(crono.dates).filter(v => v).length;
            return (
              <div key={crono.id} className="flex items-center justify-between bg-slate-700/40 border border-slate-700 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {crono.type === 'vertical' ? (
                    crono.verticals.map(v => (
                      <Badge key={v} className={`text-xs ${VERTICAL_COLORS[v] || ''}`}>{VERTICAL_LABELS[v] || v}</Badge>
                    ))
                  ) : (
                    <Badge className="text-xs bg-purple-500/20 text-purple-300 border-purple-500/30">{crono.productName}</Badge>
                  )}
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

      {cronogramas.length === 0 && schedulingType && (
        <div className="text-center py-3 text-sm text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          ⚠️ Adicione pelo menos um cronograma com datas para prosseguir
        </div>
      )}
    </div>
  );
}