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

  const calculateProgress = (event) => {
    // Se concluído, sempre 100%
    if (event.status === 'concluido') return 100;
    
    // Se não iniciado, 0%
    if (event.status === 'nao_iniciado') return 0;
    
    // Se atrasado, sempre mostra progresso alto (mas não 100%)
    if (event.status === 'atrasado') return event.progress || 90;
    
    // Se em andamento e tem datas, calcula baseado no tempo decorrido
    if (event.status === 'em_andamento' && event.start_date && event.end_date) {
      try {
        const today = new Date();
        const start = new Date(event.start_date);
        const end = new Date(event.end_date);
        
        // Se ainda não começou
        if (today < start) return 5;
        
        // Se já passou da data final, está atrasado
        if (today > end) return 90;
        
        // Calcula proporcionalmente
        const totalDays = (end - start) / (1000 * 60 * 60 * 24);
        const daysPassed = (today - start) / (1000 * 60 * 60 * 24);
        const calculatedProgress = Math.round((daysPassed / totalDays) * 100);
        
        // Limita entre 5% e 95% (nunca 0% se está em andamento, nunca 100% se não está concluído)
        return Math.max(5, Math.min(95, calculatedProgress));
      } catch (e) {
        // Se houver erro no parse, usa o progresso salvo ou padrão
        return event.progress || 30;
      }
    }
    
    // Se em andamento mas sem datas, usa progresso salvo ou padrão de 30%
    if (event.status === 'em_andamento') {
      return event.progress || 30;
    }
    
    // Fallback para o progresso salvo no banco ou 0
    return event.progress || 0;
  };

  const isEventDelayed = (event) => {
    if (!event.end_date || event.status === 'concluido') return false;
    const today = new Date();
    const endDate = parseISO(event.end_date);
    const progress = calculateProgress(event);
    return endDate < today && progress < 100;
  };

  const getProgressColor = (event) => {
    const progress = calculateProgress(event);
    if (event.status === 'nao_iniciado' || progress === 0) return 'bg-slate-600';
    if (progress === 100 || event.status === 'concluido') return 'bg-green-500';
    if (isEventDelayed(event)) return 'bg-yellow-500';
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
          {events.map((event) => {
            const currentProgress = calculateProgress(event);
            const statusLabel = isEventDelayed(event) && event.status !== 'concluido' 
              ? 'Atrasado' 
              : statusLabels[event.status];
            
            return (
              <div key={event.id} className="grid grid-cols-12 gap-4 items-center px-6 py-3 hover:bg-slate-700/20 group">
                {/* Status Display */}
                <div className="col-span-2">
                  <Badge 
                    className={cn(
                      "border text-xs",
                      isEventDelayed(event) && event.status !== 'concluido'
                        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        : event.status === 'concluido'
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : event.status === 'em_andamento'
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        : "bg-slate-600/20 text-slate-400 border-slate-600/30"
                    )}
                  >
                    {statusLabel}
                  </Badge>
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
                    <div className="flex-1 h-5 bg-slate-700/50 rounded-full overflow-hidden">
                      {currentProgress > 0 && (
                        <div 
                          className={cn("h-full transition-all rounded-full", getProgressColor(event))}
                          style={{ width: `${currentProgress}%` }}
                        />
                      )}
                    </div>
                    <span className="text-sm text-slate-300 w-10 text-right">
                      {currentProgress}%
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
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}