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
  saude: 'Saúde', gerenciamento: 'Gerenciamento', outros: 'Outros',
};

const statusLabels = {
  nao_iniciado: 'Não Iniciado', em_andamento: 'Em Andamento',
  concluido: 'Concluído', atrasado: 'Atrasado'
};

const statusColors = {
  nao_iniciado: 'bg-slate-600', em_andamento: 'bg-blue-600',
  concluido: 'bg-green-600', atrasado: 'bg-red-600'
};

const calculateProgressFromDates = (event) => {
  if (event.status === 'concluido') return 100;
  if (event.status === 'nao_iniciado') return 0;
  // Para em_andamento ou atrasado, usa o valor de progress salvo
  return event.progress || 0;
};

/**
 * Visão Por Vertical: 1 linha por etapa, mostrando a data "comum" da vertical
 * (pega do primeiro produto da vertical, pois as datas são compartilhadas)
 */
export default function TimelineByVertical({ verticals, entityProducts, timelineEvents, onStatusChange, onEdit, onDelete }) {
  const [activeVertical, setActiveVertical] = useState(verticals[0] || '');

  if (verticals.length === 0) return null;

  return (
    <Tabs value={activeVertical} onValueChange={setActiveVertical} className="space-y-4">
      <TabsList className="bg-slate-800 border border-slate-700 flex-wrap h-auto p-2 gap-2">
        {verticals.map(v => (
          <TabsTrigger key={v} value={v} className="data-[state=active]:bg-blue-600">
            {verticalLabels[v] || v}
          </TabsTrigger>
        ))}
      </TabsList>

      {verticals.map(vertical => {
        const productsInVert = entityProducts.filter(p => p.vertical === vertical);
        // Para a visão por vertical, usamos o primeiro produto como representante das datas
        const representativeProduct = productsInVert[0];
        const events = representativeProduct
          ? timelineEvents
              .filter(e => e.product_id === representativeProduct.id)
              .sort((a, b) => (a.order || 0) - (b.order || 0))
          : [];

        // Na visão por vertical, calcular progresso apenas sobre o cronograma representativo (1 cronograma por vertical)
        const avgProgress = events.length > 0
          ? Math.round(events.reduce((sum, e) => sum + calculateProgressFromDates(e), 0) / events.length)
          : 0;

        return (
          <TabsContent key={vertical} value={vertical} className="space-y-4">
            {/* Progress */}
            <div className="flex items-center gap-4 bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <div className="text-sm text-slate-400 min-w-[160px]">
                Progresso {verticalLabels[vertical] || vertical}
              </div>
              <div className="flex-1"><Progress value={avgProgress} className="h-3" /></div>
              <div className="text-lg font-bold text-white min-w-[50px] text-right">{avgProgress}%</div>
            </div>

            {/* Tabela de etapas da vertical */}
            <div className="overflow-x-auto bg-slate-800 rounded-lg border border-slate-700">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Etapa</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Data Início</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Data Fim</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Progresso</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(event => (
                    <tr key={event.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 cursor-pointer" onDoubleClick={() => onEdit(event, representativeProduct?.id)}>
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
                        <div className="flex gap-3">
                          <button onClick={() => onEdit(event, representativeProduct?.id)} className="text-slate-400 hover:text-blue-400 transition">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => onDelete(event.id)} className="text-slate-400 hover:text-red-400 transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {events.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">Nenhuma etapa encontrada</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}