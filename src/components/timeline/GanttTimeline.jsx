import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { format, differenceInDays, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";

const statusColors = {
  nao_iniciado: 'bg-slate-300',
  em_andamento: 'bg-blue-500',
  concluido: 'bg-green-500',
  atrasado: 'bg-orange-500'
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
              <div className="w-80 flex-shrink-0 pr-4">
                <div className="flex items-start gap-2">
                  <div className={cn("w-2 h-2 rounded-full mt-1", statusColors[event.status])} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-white block">{event.title}</span>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                      {event.start_date && (
                        <span>{format(parseISO(event.start_date), 'dd/MM/yy', { locale: ptBR })}</span>
                      )}
                      {event.end_date && event.start_date !== event.end_date && (
                        <>
                          <span>→</span>
                          <span>{format(parseISO(event.end_date), 'dd/MM/yy', { locale: ptBR })}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 relative h-8">
                {event.start_date && (
                  <div
                    className={cn(
                      "absolute h-6 rounded-md top-1 flex items-center px-2 transition-all",
                      statusColors[event.status]
                    )}
                    style={{
                      left: `${getPosition(event.start_date)}%`,
                      width: `${getWidth(event.start_date, event.end_date)}%`,
                      minWidth: '8px'
                    }}
                  >
                    {/* Progress bar inside */}
                    {event.progress > 0 && (
                      <div 
                        className="absolute inset-0 bg-white/30 rounded-md"
                        style={{ width: `${event.progress || 0}%` }}
                      />
                    )}
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