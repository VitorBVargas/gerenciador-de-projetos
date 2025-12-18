import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Pencil, Trash2 } from "lucide-react";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";

const statusColors = {
  nao_iniciado: 'bg-slate-600/50',
  em_andamento: 'bg-blue-500',
  concluido: 'bg-green-500',
  atrasado: 'bg-yellow-500'
};

const statusLabels = {
  nao_iniciado: 'Não Iniciado',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  atrasado: 'Atrasado'
};

const progressColors = {
  0: 'bg-slate-600',
  1: 'bg-blue-500',
  2: 'bg-yellow-500',
  3: 'bg-green-500'
};

export default function GanttTimeline({ events, onEdit, onDelete, onStatusChange }) {
  if (!events || events.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="py-12 text-center">
          <p className="text-slate-400">Nenhum evento no cronograma</p>
        </CardContent>
      </Card>
    );
  }

  const getProgressColor = (progress, status) => {
    if (status === 'nao_iniciado') return 'bg-slate-600';
    if (progress === 100 || status === 'concluido') return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700/50 overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-800/70 border-b border-slate-700/50 text-sm font-medium text-slate-300">
          <div className="col-span-2">Status</div>
          <div className="col-span-5">Atividade</div>
          <div className="col-span-4">Progresso</div>
          <div className="col-span-1"></div>
        </div>

        {/* Events */}
        <div className="divide-y divide-slate-700/30">
          {events.map((event) => (
            <div key={event.id} className="grid grid-cols-12 gap-4 items-center px-6 py-3 hover:bg-slate-700/20 group">
              {/* Status Dropdown */}
              <div className="col-span-2">
                <Select 
                  value={event.status} 
                  onValueChange={(value) => onStatusChange?.(event.id, value)}
                >
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="nao_iniciado" className="text-slate-300">Não Iniciado</SelectItem>
                    <SelectItem value="em_andamento" className="text-blue-300">Em andamento</SelectItem>
                    <SelectItem value="concluido" className="text-green-300">Concluído</SelectItem>
                    <SelectItem value="atrasado" className="text-yellow-300">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Atividade */}
              <div className="col-span-5">
                <div className="text-sm font-medium text-white">{event.title}</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {event.start_date && event.end_date && (
                    <>
                      {format(parseISO(event.start_date), 'dd/MM/yy')} - {format(parseISO(event.end_date), 'dd/MM/yy')}
                    </>
                  )}
                </div>
              </div>

              {/* Progresso */}
              <div className="col-span-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-8 bg-slate-700/50 rounded-md overflow-hidden">
                    {event.status !== 'nao_iniciado' && event.progress > 0 && (
                      <div 
                        className={cn("h-full transition-all", getProgressColor(event.progress, event.status))}
                        style={{ width: `${event.progress}%` }}
                      />
                    )}
                  </div>
                  <span className="text-sm text-slate-300 w-10 text-right">
                    {event.status === 'nao_iniciado' ? '0%' : `${event.progress || 0}%`}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="col-span-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-600"
                  onClick={() => onEdit(event)}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}