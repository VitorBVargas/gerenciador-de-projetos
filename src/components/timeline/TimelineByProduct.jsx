import React, { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { phaseLabels } from './phaseLabels';
import { formatDateForDisplay } from './dateFormatter';

const verticalLabels = {
  arrecadacao: 'Arrecadação', compras: 'Compras/Contratos', contabil: 'Contábil',
  pessoal: 'Pessoal', educacao: 'Educação', iss: 'ISS',
  parceiros: 'Parceiros', plataforma: 'Plataforma', atendimento: 'Atendimento',
  saude: 'Saúde', gerenciamento: 'Gerenciamento', outros: 'Outros',
};

const statusLabels = {
  nao_iniciado: 'Não Iniciado', em_andamento: 'Em Andamento',
  concluido: 'Concluído/Não se aplica', atrasado: 'Atrasado'
};

const statusColors = {
  nao_iniciado: 'bg-slate-600', em_andamento: 'bg-blue-600',
  concluido: 'bg-green-600', atrasado: 'bg-red-600'
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
export default function TimelineByProduct({ verticals, entityProducts, timelineEvents, onStatusChange, onEdit, onDelete, onCreate }) {
  const [activeVertical, setActiveVertical] = useState(verticals[0] || '');
  const [selectedProductId, setSelectedProductId] = useState(null);

  const eventsByProduct = useMemo(() => {
    const map = new Map();
    timelineEvents.forEach((event) => {
      if (!map.has(event.product_id)) map.set(event.product_id, []);
      map.get(event.product_id).push(event);
    });
    map.forEach((events) => events.sort((a, b) => (a.order || 0) - (b.order || 0)));
    return map;
  }, [timelineEvents]);

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
                const productEvents = eventsByProduct.get(product.id) || [];

                return (
                  <TabsContent key={product.id} value={product.id}>
                    <div className="space-y-3">
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => onCreate?.({ productId: product.id, vertical })}
                          className="bg-blue-600 hover:bg-blue-700 gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Criar atividade
                        </Button>
                      </div>
                      <div className="overflow-x-auto bg-slate-800 rounded-lg border border-slate-700">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-slate-700 bg-slate-900/50">
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Atividade</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Status</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Data Início</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Data Fim</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Progresso</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {productEvents.map(event => (
                              <tr key={event.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 cursor-pointer" onDoubleClick={() => onEdit(event, product.id)}>
                                <td className="px-4 py-3 text-sm text-white">{event.title || phaseLabels[event.phase]}</td>
                                <td className="px-4 py-3">
                                  <select
                                    value={event.status}
                                    onChange={e => onStatusChange(event.id, e.target.value)}
                                    className={`px-3 py-1 rounded text-xs font-medium text-white border-0 ${statusColors[event.status]} cursor-pointer hover:opacity-80`}
                                  >
                                    {Object.entries(statusLabels).map(([k, l]) => (
                                      <option key={k} value={k}>{l}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-300">
                                  {formatDateForDisplay(event.start_date)}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-300">
                                  {formatDateForDisplay(event.end_date)}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2 max-w-xs">
                                    <Progress value={calculateProgressFromDates(event)} className="h-2 flex-1" />
                                    <span className="text-xs text-slate-400 min-w-[35px] text-right">{calculateProgressFromDates(event)}%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-end gap-2">
                                    <button onClick={() => onEdit(event, product.id)} className="text-slate-400 hover:text-blue-400 transition">
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => onDelete(event)} className="text-slate-400 hover:text-red-400 transition">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {productEvents.length === 0 && (
                              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">Nenhuma etapa</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
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