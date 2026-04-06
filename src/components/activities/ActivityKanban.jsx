import React, { useState, useMemo } from 'react';
import { format, eachDayOfInterval, addDays, differenceInDays, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function ActivityTimeline({ activities, verticals, onEdit }) {
  const [selectedVertical, setSelectedVertical] = useState(verticals[0] || null);

  const verticalActivities = activities.filter(a => a.vertical === selectedVertical && a.start_date && a.end_date);

  const assignees = useMemo(() => {
    return [...new Set(verticalActivities.map(a => a.assignee).filter(Boolean))];
  }, [verticalActivities]);

  const { minDate, maxDate, days } = useMemo(() => {
    if (verticalActivities.length === 0) return { minDate: new Date(), maxDate: new Date(), days: [] };
    
    let min = new Date(Math.min(...verticalActivities.map(a => new Date(a.start_date))));
    let max = new Date(Math.max(...verticalActivities.map(a => new Date(a.end_date))));
    
    // Add some padding to see clearly
    min = addDays(min, -3);
    max = addDays(max, 3);
    
    const days = eachDayOfInterval({ start: min, end: max });
    return { minDate: min, maxDate: max, days };
  }, [verticalActivities]);

  if (verticals.length === 0) return <div className="text-slate-400">Nenhuma vertical encontrada para este projeto.</div>;

  return (
    <div className="space-y-6">
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
        <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-800/50">
          <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
            <div className="min-w-max">
              {/* Header / Dates */}
              <div className="flex border-b border-slate-700">
                <div className="w-48 flex-shrink-0 border-r border-slate-700 p-4 bg-slate-800/80 sticky left-0 z-20">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recurso</span>
                </div>
                <div className="flex">
                  {days.map(day => {
                    const today = isToday(day);
                    return (
                      <div key={day.toISOString()} className={cn("w-14 flex-shrink-0 border-r border-slate-700/50 flex flex-col items-center justify-center py-2", today ? "bg-blue-900/40 border-blue-500/50" : "bg-slate-800/30")}>
                        <span className={cn("text-[10px]", today ? "text-blue-300" : "text-slate-500")}>{format(day, 'eee', { locale: ptBR })}</span>
                        <span className={cn("text-sm font-medium", today ? "text-blue-400 font-bold" : "text-slate-300")}>{format(day, 'dd/MM')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rows by Assignee */}
              {assignees.map(assignee => {
                const assigneeActivities = verticalActivities
                  .filter(a => a.assignee === assignee)
                  .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
                
                // Pack overlapping activities into vertical levels
                const levels = [];
                const positionedActivities = assigneeActivities.map(activity => {
                  const start = new Date(activity.start_date);
                  const end = new Date(activity.end_date);
                  const startOffset = differenceInDays(start, minDate);
                  const duration = differenceInDays(end, start) + 1;
                  
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
                  
                  return { ...activity, startOffset, duration, level: placedLevel };
                });
                
                const rowHeight = Math.max(60, 20 + (levels.length * 36));

                return (
                  <div key={assignee} className="flex border-b border-slate-700/50 group hover:bg-slate-700/30 transition-colors" style={{ height: `${rowHeight}px` }}>
                    <div className="w-48 flex-shrink-0 border-r border-slate-700 p-4 bg-slate-800/80 sticky left-0 z-20 flex items-center gap-3">
                      <Avatar className="w-8 h-8 border border-slate-600">
                        <AvatarFallback className="bg-slate-700 text-xs text-white">
                          {assignee.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-white truncate" title={assignee}>{assignee}</span>
                    </div>
                    
                    <div className="flex relative">
                      {days.map(day => (
                        <div key={`cell-${day.toISOString()}`} className={cn("w-14 flex-shrink-0 border-r border-slate-700/50 h-full", isToday(day) && "bg-blue-900/10")} />
                      ))}
                      
                      {/* Activity Bars */}
                      {positionedActivities.map((activity) => {
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
                              left: `${activity.startOffset * 56}px`, // 56px is w-14 width
                              width: `${activity.duration * 56 - 4}px`, // slightly less to leave a gap
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
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}