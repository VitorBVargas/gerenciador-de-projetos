import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Pencil, Trash2 } from 'lucide-react';
import { phaseLabels } from './phaseLabels';
import { formatDateForDisplay } from './dateFormatter';

const verticalLabels = {
  arrecadacao: 'Arrecadação', compras: 'Compras/Contratos', contabil: 'Contábil',
  pessoal: 'Pessoal', educacao: 'Educação', iss: 'ISS',
  parceiros: 'Parceiros', plataforma: 'Plataforma', atendimento: 'Atendimento',
  saude: 'Saúde', gerenciamento: 'Gerenciamento',
  extensoes: 'Extensões', gestao_projetos: 'Gestão de Projetos',
  gestao_operacoes: 'Gestão de Operações', coordenacao_tecnica: 'Coordenação Técnica',
  outros: 'Outros',
};

const statusLabels = {
  nao_iniciado: 'Não Iniciado', em_andamento: 'Em Andamento',
  concluido: 'Concluído/Não se aplica', atrasado: 'Atrasado'
};

const statusColors = {
  nao_iniciado: 'bg-slate-600', em_andamento: 'bg-blue-600',
  concluido: 'bg-green-600', atrasado: 'bg-red-600'
};

const calculateDaysBetween = (start, end) => {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s) || isNaN(e)) return null;
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
};

const calculateProgressFromDates = (event) => {
  if (event.status === 'concluido') return 100;
  if (event.status === 'nao_iniciado') return 0;
  // Para em_andamento ou atrasado, calcula pela data se disponível
  if (event.start_date && event.end_date) {
    const now = new Date();
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    if (now <= start) return 0;
    if (now >= end) return 99;
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return Math.round((elapsed / total) * 100);
  }
  return event.progress || 0;
};

/**
 * Visão Por Produto: aba por vertical, depois aba por produto dentro da vertical
 */
function EditableText({ value, onCommit, readOnly }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  if (readOnly) return <span className="text-sm text-white">{value}</span>;
  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); if (draft !== (value || '')) onCommit(draft); }}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.target.blur(); }
          if (e.key === 'Escape') { setDraft(value || ''); setEditing(false); }
        }}
        className="w-full bg-slate-900 border border-blue-500 rounded px-2 py-1 text-sm text-white focus:outline-none"
      />
    );
  }
  return (
    <span
      onClick={() => { setDraft(value || ''); setEditing(true); }}
      className="text-sm text-white cursor-text hover:bg-slate-700/40 rounded px-1 -mx-1 inline-block"
      title="Clique para editar"
    >
      {value}
    </span>
  );
}

function EditableDate({ value, onCommit, readOnly }) {
  const [editing, setEditing] = useState(false);
  if (readOnly) return <span className="text-sm text-slate-300">{formatDateForDisplay(value)}</span>;
  if (editing) {
    return (
      <input
        autoFocus
        type="date"
        value={value || ''}
        onChange={e => { if (e.target.value !== (value || '')) onCommit(e.target.value); }}
        onBlur={() => setEditing(false)}
        className="bg-transparent border-0 border-b border-slate-600 px-0 py-0.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
      />
    );
  }
  return (
    <input
      type="date"
      value={value || ''}
      onChange={e => { if (e.target.value !== (value || '')) onCommit(e.target.value); }}
      className="editable-date bg-transparent border-0 px-1 -mx-1 py-0.5 text-sm text-slate-300 hover:text-white focus:outline-none cursor-pointer"
    />
  );
}

export default function TimelineByProduct({ verticals, entityProducts, timelineEvents, onStatusChange, onFieldChange, onEdit, onDelete, readOnly }) {
  const [activeVertical, setActiveVertical] = useState(verticals[0] || '');
  const [selectedProductId, setSelectedProductId] = useState(null);

  // When vertical changes, reset selected product
  const handleVerticalChange = (v) => {
    setActiveVertical(v);
    setSelectedProductId(null);
  };

  // Auto-select first product when vertical changes or products load
  React.useEffect(() => {
    if (activeVertical && entityProducts.length > 0) {
      const productsInVert = entityProducts.filter(p => p.vertical === activeVertical);
      if (productsInVert.length > 0) {
        // Always set to first product if current selection is invalid or null
        const currentIsValid = productsInVert.some(p => p.id === selectedProductId);
        if (!currentIsValid) {
          setSelectedProductId(productsInVert[0].id);
        }
      }
    }
  }, [activeVertical, entityProducts.length]);

  if (verticals.length === 0) return null;

  return (
    <Tabs value={activeVertical} onValueChange={handleVerticalChange} className="space-y-4">
      <TabsList className="bg-slate-800 border border-slate-700 flex-wrap h-auto p-2 gap-2">
        {verticals.map(v => (
          <TabsTrigger key={v} value={v} className="data-[state=active]:bg-blue-600">
            {verticalLabels[v] || v}
          </TabsTrigger>
        ))}
      </TabsList>

      {verticals.map(vertical => {
        const productsInVert = entityProducts.filter(p => p.vertical === vertical);
        const currentProductId = selectedProductId && productsInVert.find(p => p.id === selectedProductId)
          ? selectedProductId
          : productsInVert[0]?.id;

        const allVerticalEvents = timelineEvents.filter(e => productsInVert.some(p => p.id === e.product_id));
        const avgProgress = allVerticalEvents.length > 0
          ? Math.round(allVerticalEvents.reduce((sum, e) => sum + calculateProgressFromDates(e), 0) / allVerticalEvents.length)
          : 0;

        return (
          <TabsContent key={vertical} value={vertical} className="space-y-4">
            {/* Vertical progress */}
            <div className="flex items-center gap-4 bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <div className="text-sm text-slate-400 min-w-[160px]">Progresso {verticalLabels[vertical] || vertical}</div>
              <div className="flex-1"><Progress value={avgProgress} className="h-3" /></div>
              <div className="text-lg font-bold text-white min-w-[50px] text-right">{avgProgress}%</div>
            </div>

            {/* Product tabs */}
            <Tabs value={currentProductId} onValueChange={setSelectedProductId} className="space-y-4">
              <TabsList className="bg-slate-800 border border-slate-700 flex-wrap h-auto p-2 gap-2">
                {productsInVert.map(product => (
                  <TabsTrigger key={product.id} value={product.id} className="data-[state=active]:bg-blue-600 text-sm">
                    {product.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {productsInVert.map(product => {
                const productEvents = timelineEvents
                  .filter(e => e.product_id === product.id)
                  .sort((a, b) => (a.order || 0) - (b.order || 0));

                return (
                  <TabsContent key={product.id} value={product.id}>
                    <div className="overflow-x-auto bg-slate-800 rounded-lg border border-slate-700">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-700 bg-slate-900/50">
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Atividade</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Dias</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Data Início</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Data Fim</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Progresso</th>
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {productEvents.map(event => (
                            <tr key={event.id} className="border-b border-slate-700/30 hover:bg-slate-700/20" onDoubleClick={() => onEdit && onEdit(event, product.id)}>
                              <td className="px-4 py-3">
                                <EditableText
                                  value={event.title || phaseLabels[event.phase]}
                                  readOnly={readOnly || !onFieldChange}
                                  onCommit={(v) => onFieldChange(event.id, 'title', v)}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  value={event.status}
                                  onChange={e => onStatusChange(event.id, e.target.value)}
                                  disabled={readOnly || !onStatusChange}
                                  className={`px-3 py-1 rounded text-xs font-medium text-white border-0 ${statusColors[event.status]} cursor-pointer hover:opacity-80 disabled:cursor-default`}
                                >
                                  {Object.entries(statusLabels).map(([k, l]) => (
                                    <option key={k} value={k}>{l}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3">
                                {calculateDaysBetween(event.start_date, event.end_date) !== null ? (
                                  <span className="text-sm text-slate-300">{calculateDaysBetween(event.start_date, event.end_date)} dias</span>
                                ) : (
                                  <span className="text-sm text-slate-600">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <EditableDate
                                  value={event.start_date}
                                  readOnly={readOnly || !onFieldChange}
                                  onCommit={(v) => onFieldChange(event.id, 'start_date', v)}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <EditableDate
                                  value={event.end_date}
                                  readOnly={readOnly || !onFieldChange}
                                  onCommit={(v) => onFieldChange(event.id, 'end_date', v)}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2 max-w-xs">
                                  <Progress value={calculateProgressFromDates(event)} className="h-2 flex-1" />
                                  <span className="text-xs text-slate-400 min-w-[35px] text-right">{calculateProgressFromDates(event)}%</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <button onClick={() => onEdit(event, product.id)} title="Editar" className="text-slate-400 hover:text-blue-400 transition">
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  {!['go_live', 'operacao_assistida', 'encerramento_bastao'].includes(event.phase) && (
                                    <button onClick={() => onDelete(event.id)} title="Excluir" className="text-slate-400 hover:text-red-400 transition">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                          {productEvents.length === 0 && (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-sm">Nenhuma etapa</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}