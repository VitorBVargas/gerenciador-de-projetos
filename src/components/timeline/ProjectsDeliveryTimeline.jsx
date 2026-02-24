import React, { useMemo, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Triangle, Circle } from 'lucide-react';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ProjectsDeliveryTimeline({ projects, timelineEvents, products = [] }) {
  // Group projects with their delivery dates
  const projectsWithDelivery = useMemo(() => {
    return projects.map(project => {
      const projectProducts = products.filter(p => p.project_id === project.id);
      const productIds = projectProducts.map(p => p.id);
      
      const projectEvents = timelineEvents.filter(e => 
        e.project_id === project.id || (e.product_id && productIds.includes(e.product_id))
      );
      
      const isProjectCompleted = project.status === 'concluido';
      
      // Go Live: data MAIS TARDE entre todos os go_live
      const goLiveEvents = projectEvents.filter(e => e.phase === 'go_live' && e.end_date);
      const goLiveDate = goLiveEvents.length > 0 
        ? goLiveEvents.reduce((latest, event) => {
            const eventDate = new Date(event.end_date);
            return eventDate > new Date(latest.end_date) ? event : latest;
          }).end_date
        : null;
      
      // Fim do Projeto: data MAIS TARDE de encerramento_bastao
      const closureEvents = projectEvents.filter(e => e.phase === 'encerramento_bastao' && e.end_date);
      const deliveryDate = closureEvents.length > 0
        ? closureEvents.reduce((latest, event) => {
            const eventDate = new Date(event.end_date);
            return eventDate > new Date(latest.end_date) ? event : latest;
          }).end_date
        : null;

      return {
        ...project,
        goLiveDate,
        deliveryDate,
        isProjectCompleted
      };
    }).filter(p => p.deliveryDate && !p.isProjectCompleted);
  }, [projects, timelineEvents, products]);

  // Calcular intervalo de tempo
  const timelineRange = useMemo(() => {
    if (projectsWithDelivery.length === 0) return null;
    
    let minDate = new Date();
    let maxDate = new Date();
    
    projectsWithDelivery.forEach(p => {
      const goDate = new Date(p.goLiveDate);
      const endDate = new Date(p.deliveryDate);
      
      if (goDate < minDate) minDate = goDate;
      if (endDate > maxDate) maxDate = endDate;
    });
    
    return { start: minDate, end: maxDate };
  }, [projectsWithDelivery]);

  // Gerar meses para o timeline
  const months = useMemo(() => {
    if (!timelineRange) return [];
    
    const monthsList = [];
    let current = startOfMonth(new Date(timelineRange.start));
    const timelineEnd = endOfMonth(timelineRange.end);
    
    while (current <= timelineEnd) {
      monthsList.push(new Date(current));
      current = addMonths(current, 1);
    }
    
    return monthsList;
  }, [timelineRange]);

  // Calcular posição relativa de uma data no timeline
  const getDatePosition = (date) => {
    if (!timelineRange) return 0;
    const totalMs = timelineRange.end - timelineRange.start;
    const dateMs = new Date(date) - timelineRange.start;
    return Math.max(0, Math.min(100, (dateMs / totalMs) * 100));
  };

  // Calcular largura da barra
  const getBarWidth = (startDate, endDate) => {
    if (!timelineRange) return 0;
    const totalMs = timelineRange.end - timelineRange.start;
    const barMs = new Date(endDate) - new Date(startDate);
    return Math.max(2, (barMs / totalMs) * 100);
  };

  if (projectsWithDelivery.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700/50 p-8 text-center">
        <p className="text-slate-400">Nenhum projeto com data de entrega definida</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex gap-8 px-4 py-3 text-xs font-medium bg-slate-800/40 rounded-lg border border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[7px] border-b-blue-500" />
          <span className="text-slate-300">Go Live / Liberação</span>
        </div>
        <div className="flex items-center gap-2">
          <Circle className="w-3 h-3 text-green-500 fill-green-500" />
          <span className="text-slate-300">Fim do Projeto</span>
        </div>
      </div>

      {/* Monthly Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {months.map((month) => {
          const monthKey = format(month, 'yyyy-MM');
          const monthData = projectsByMonth[monthKey];
          const hasProjects = monthData.goLive.length > 0 || monthData.closing.length > 0;

          if (!hasProjects) return null;

          return (
            <div key={monthKey} className="border border-slate-700 rounded-lg bg-slate-900/30 overflow-hidden">
              {/* Month Header */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-800/50 px-4 py-3 border-b border-slate-700">
                <h3 className="text-sm font-bold text-white">
                  {format(month, 'MMMM yyyy', { locale: ptBR }).toUpperCase()}
                </h3>
              </div>

              {/* Month Content */}
              <div className="divide-y divide-slate-700">
                {/* Go Live Section */}
                {monthData.goLive.length > 0 && (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
                      <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[5px] border-b-blue-500" />
                      <span>GO LIVE ({monthData.goLive.length})</span>
                    </div>
                    <div className="space-y-2 ml-5">
                      {monthData.goLive.map(project => (
                        <div key={`${project.id}-go-live`} className="flex items-start justify-between gap-2">
                          <div className="text-xs text-slate-200 truncate flex-1">
                            <span className="font-medium">{project.name}</span>
                            <span className="text-slate-400 ml-2">
                              {format(new Date(project.goLiveDate), 'dd MMM', { locale: ptBR })}
                            </span>
                          </div>
                          {expandedProjects[project.id] && (
                            <button
                              onClick={() => toggleProject(project.id)}
                              className="text-slate-400 hover:text-slate-300"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Closing Section */}
                {monthData.closing.length > 0 && (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-green-400">
                      <Circle className="w-3 h-3 text-green-500 fill-green-500" />
                      <span>FIM DO PROJETO ({monthData.closing.length})</span>
                    </div>
                    <div className="space-y-2 ml-5">
                      {monthData.closing.map(project => (
                        <div key={`${project.id}-closing`} className="flex items-start justify-between gap-2">
                          <div className="text-xs text-slate-200 truncate flex-1">
                            <span className="font-medium">{project.name}</span>
                            <span className="text-slate-400 ml-2">
                              {format(new Date(project.deliveryDate), 'dd MMM', { locale: ptBR })}
                            </span>
                          </div>
                          {expandedProjects[project.id] && (
                            <button
                              onClick={() => toggleProject(project.id)}
                              className="text-slate-400 hover:text-slate-300"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}