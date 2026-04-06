import React, { useState, useMemo } from 'react';
import { 
  format, 
  eachDayOfInterval, 
  differenceInDays, 
  isToday,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function ActivityTimeline({ activities, verticals, onEdit }) {
  const [selectedVertical, setSelectedVertical] = useState(verticals[0] || null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const verticalActivities = activities.filter(a => a.vertical === selectedVertical && a.start_date && a.end_date);

  const assignees = useMemo(() => {
    return [...new Set(verticalActivities.map(a => a.assignee).filter(Boolean))];
  }, [verticalActivities]);

  // Cálculos do mês atual
  const monthStartDay = startOfMonth(currentMonth);
  const monthEndDay = endOfMonth(currentMonth);
  const monthDays = useMemo(() => {
    return eachDayOfInterval({ start: monthStartDay, end: monthEndDay });
  }, [monthStartDay, monthEndDay]);

  // Pré-calcula a posição e a altura de cada linha para garantir que a Sidebar e o Calendário fiquem alinhados
  const rowsData = useMemo(() => {
    return assignees.map(assignee => {
      const assigneeActivities = verticalActivities
        .filter(a => a.assignee === assignee)
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
      
      const levels = [];
      const positionedActivities = [];

      assigneeActivities.forEach(activity => {
        const start = new Date(activity.start_date);
        const end = new Date(activity.end_date);
        
        // Ignora a atividade se ela não acontecer dentro do mês atual
        if (start > monthEndDay || end < monthStartDay) return;

        let placedLevel = 0;
        let placed = false;
        
        while (!placed) {
          const levelActivities = levels[placedLevel] || [];
          const overlap = levelActivities.some(prev => {
            return (start <= prev.end && end >= prev.start);
          });
          
          if (!overlap) {
            if (!levels[placedLevel]) levels[placedLevel] = [];
            levels[placedLevel].push({ start, end });
            placed = true;
          } else {
            placedLevel++;
          }
        }
        
        // Calcula a posição limitando aos dias do mês visualizado
        const startDayIdx = Math.max(0, differenceInDays(start, monthStartDay));
        const endDayIdx = Math.min(monthDays.length - 1, differenceInDays(end, monthStartDay));
        const duration = endDayIdx - startDayIdx + 1;
        
        positionedActivities.push({ 
          ...activity, 
          startOffset: startDayIdx, 
          duration, 
          level: placedLevel 
        });
      });
      
      // A altura da linha depende de quantas tarefas sobrepostas existem
      const rowHeight = Math.max(60, 20 + (levels.length * 36));
      
      return {
        assignee,
        positionedActivities,
        rowHeight
      };
    });
  }, [assignees, verticalActivities, monthStartDay, monthEndDay, monthDays.length]);

  if (verticals.length === 0) return <div className="text-slate-400">Nenhuma vertical encontrada para este projeto.</div>;

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Botões de Verticais */}
      <div className="flex flex-wrap gap-2">
        {verticals.map(v => (
          <button
            key={v}
            onClick={() => setSelectedVertical(v)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors capitalize",
              selectedVertical === v ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            )}
          >
            {v}
          </button>
        ))}
      </div>

      {assignees.length === 0 ? (
        <div className="text-slate-400 py-4">Nenhuma atividade com responsável e datas definidas nesta vertical.</div>
      ) : (
        <div className="space-y-4 w-full max-w-full overflow-x-hidden">
          
          {/* NAVEGADOR DE MESES */}
          <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700/50 p-2 rounded-xl w-full max-w-md mx-auto">
            <Button
              variant="ghost"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="text-slate-400 hover:text-white hover:bg-slate-700"
            >
              <ChevronLeft className="w-5 h-5 mr-1" /> Anterior
            </Button>
            <h2 className="text-lg font-bold text-cyan-400 capitalize px-4">
              {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
            </h2>
            <Button
              variant="ghost"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="text-slate-400 hover:text-white hover:bg-slate-700"
            >
              Próximo <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>

          <div className="w-full overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/50 flex flex-col">
            <div className="flex w-full overflow-hidden">
              <div className="flex-shrink-0 bg-slate-800/95 border-r border-slate-700/50 z-10 w-[240px]">
                <div className="h-14 px-4 bg-slate-700/30 border-b border-slate-700/50 flex items-center">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recurso</span>
                </div>

                {rowsData.map(row => (
                  <div
                    key={`sidebar-${row.assignee}`}
                    className="px-4 border-b border-slate-700/50 flex items-center gap-3"
                    style={{ height: `${row.rowHeight}px` }}
                  >
                    <Avatar className="w-8 h-8 border border-slate-600">
                      <AvatarFallback className="bg-slate-700 text-xs text-white">
                        {row.assignee.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-white truncate" title={row.assignee}>{row.assignee}</span>
                  </div>
                ))}
              </div>

              <div className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800/50">
                <div style={{ width: `${monthDays.length * 48}px`, minWidth: '100%' }}>
                  <div
                    className="h-14 bg-slate-700/15 border-b border-slate-700/50"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${monthDays.length}, 48px)`,
                    }}
                  >
                    {monthDays.map((day) => {
                      const today = isToday(day);
                      return (
                        <div
                          key={`header-${day.toISOString()}`}
                          className={cn(
                            "border-r border-slate-700/50 flex flex-col items-center justify-center py-1",
                            today ? "bg-blue-900/40 border-blue-500/50" : "bg-slate-800/30"
                          )}
                        >
                          <span className={cn("text-[10px]", today ? "text-blue-300" : "text-slate-500")}>
                            {format(day, 'eee', { locale: ptBR })}
                          </span>
                          <span className={cn("text-sm font-medium", today ? "text-blue-400 font-bold" : "text-slate-300")}>
                            {format(day, 'dd/MM')}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {rowsData.map(row => (
                    <div
                      key={`grid-${row.assignee}`}
                      className="relative border-b border-slate-700/50 group hover:bg-slate-700/30 transition-colors"
                      style={{
                        height: `${row.rowHeight}px`,
                        display: 'grid',
                        gridTemplateColumns: `repeat(${monthDays.length}, 48px)`,
                      }}
                    >
                      {monthDays.map(day => (
                        <div
                          key={`cell-${row.assignee}-${day.toISOString()}`}
                          className={cn("border-r border-slate-700/50 h-full", isToday(day) && "bg-blue-900/10")}
                        />
                      ))}

                      {row.positionedActivities.map((activity) => {
                        let barColors = "bg-slate-500/20 text-slate-300 border-slate-500/30";

                        if (activity.status === 'done') {
                          barColors = "bg-green-500/20 text-green-400 border-green-500/30 opacity-70";
                        } else if (activity.end_date) {
                          const endDate = new Date(activity.end_date);
                          endDate.setHours(23, 59, 59, 999);
                          const now = new Date();

                          if (endDate < now) {
                            barColors = "bg-red-500/20 text-red-400 border-red-500/50";
                          } else {
                            const diffTime = endDate.getTime() - now.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            if (diffDays <= 2) {
                              barColors = "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
                            } else if (activity.status === 'in_progress') {
                              barColors = "bg-blue-500/20 text-blue-400 border-blue-500/30";
                            }
                          }
                        }

                        return (
                          <div
                            key={activity.id}
                            onClick={() => onEdit(activity)}
                            className={cn(
                              "absolute rounded-md px-2 py-1 text-xs font-medium cursor-pointer shadow-sm border transition-transform hover:scale-[1.02]",
                              barColors
                            )}
                            style={{
                              left: `${activity.startOffset * 48}px`,
                              width: `${activity.duration * 48 - 8}px`,
                              top: `${10 + (activity.level * 36)}px`,
                              height: '28px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                            title={`${activity.title} (${format(new Date(activity.start_date), 'dd/MM/yyyy')} - ${format(new Date(activity.end_date), 'dd/MM/yyyy')})`}
                          >
                            {activity.title}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}