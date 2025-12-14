import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { format, differenceInDays, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";

const phaseColors = {
  planejamento: 'bg-indigo-500',
  kickoff: 'bg-purple-500',
  diagnostico: 'bg-violet-500',
  migracao_hml: 'bg-fuchsia-500',
  configuracao_hml: 'bg-pink-500',
  homologacao_hml: 'bg-rose-500',
  migracao_producao: 'bg-orange-500',
  treinamento: 'bg-amber-500',
  configuracao_producao: 'bg-lime-500',
  estabilizacao: 'bg-green-500',
  operacao_assistida: 'bg-teal-500'
};

const statusColors = {
  nao_iniciado: 'bg-slate-500',
  em_andamento: 'bg-blue-500',
  concluido: 'bg-green-500',
  atrasado: 'bg-red-500'
};

const statusLabels = {
  nao_iniciado: 'Não Iniciado',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  atrasado: 'Atrasado'
};

export default function GanttTimeline({ events, onEdit, onDelete }) {
  if (!events || events.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="py-12 text-center">
          <p className="text-slate-400">Nenhum evento no cronograma</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate timeline range
  const validEvents = events.filter(e => e.start_date);
  if (validEvents.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="py-12 text-center">
          <p className="text-slate-400">Nenhum evento com data definida</p>
        </CardContent>
      </Card>
    );
  }

  const dates = validEvents.flatMap(e => [e.start_date, e.end_date || e.start_date]).filter(Boolean);
  const minDate = startOfDay(parseISO(dates.reduce((a, b) => a < b ? a : b)));
  const maxDate = startOfDay(parseISO(dates.reduce((a, b) => a > b ? a : b)));
  const totalDays = Math.max(differenceInDays(maxDate, minDate) + 1, 1);

  const getPosition = (date) => {
    if (!date) return 0;
    return (differenceInDays(startOfDay(parseISO(date)), minDate) / totalDays) * 100;
  };

  const getWidth = (start, end) => {
    if (!start) return 0;
    const endDate = end || start;
    const days = differenceInDays(startOfDay(parseISO(endDate)), startOfDay(parseISO(start))) + 1;
    return Math.max((days / totalDays) * 100, 2);
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700/50 overflow-hidden">
      <CardHeader className="pb-2 border-b border-slate-700/50">
        <CardTitle className="text-lg font-semibold text-white">Cronograma do Projeto</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Header with dates */}
        <div className="px-6 py-3 bg-slate-800/30 border-b border-slate-700/50 flex">
          <div className="w-64 flex-shrink-0 text-sm font-medium text-slate-400">Etapa</div>
          <div className="flex-1 relative">
            <div className="flex justify-between text-xs text-slate-500">
              <span>{format(minDate, 'dd MMM yyyy', { locale: ptBR })}</span>
              <span>{format(maxDate, 'dd MMM yyyy', { locale: ptBR })}</span>
            </div>
          </div>
        </div>

        {/* Events */}
        <div className="divide-y divide-slate-700/30">
          {events.map((event) => (
            <div key={event.id} className="flex items-center px-6 py-3 hover:bg-slate-700/20 group">
              <div className="w-64 flex-shrink-0 pr-4">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", phaseColors[event.phase] || 'bg-blue-500')} />
                  <span className="text-sm font-medium text-white truncate">{event.title}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={cn("text-xs", statusColors[event.status])}>
                    {statusLabels[event.status]}
                  </Badge>
                  <span className="text-xs text-slate-500">{event.progress || 0}%</span>
                </div>
              </div>
              <div className="flex-1 relative h-8">
                {event.start_date && (
                  <div
                    className={cn(
                      "absolute h-6 rounded-full top-1 flex items-center px-2 transition-all",
                      phaseColors[event.phase] || 'bg-blue-500',
                      event.status === 'concluido' && 'opacity-60'
                    )}
                    style={{
                      left: `${getPosition(event.start_date)}%`,
                      width: `${getWidth(event.start_date, event.end_date)}%`,
                      minWidth: '8px'
                    }}
                  >
                    {/* Progress bar inside */}
                    <div 
                      className="absolute inset-0 bg-white/20 rounded-full"
                      style={{ width: `${event.progress || 0}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-600"
                  onClick={() => onEdit(event)}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                  onClick={() => onDelete(event.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}