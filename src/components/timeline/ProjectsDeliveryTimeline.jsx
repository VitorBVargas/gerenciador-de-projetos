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

  // Calcular posição relativa de uma data no timeline (em pixels)
  const getDatePosition = (date) => {
    if (!timelineRange || months.length === 0) return 0;
    const totalMs = timelineRange.end - timelineRange.start;
    const dateMs = new Date(date) - timelineRange.start;
    const timelineWidth = Math.max(100, months.length * 80);
    return (dateMs / totalMs) * timelineWidth;
  };

  // Calcular largura da barra (em pixels)
  const getBarWidth = (startDate, endDate) => {
    if (!timelineRange || months.length === 0) return 0;
    const totalMs = timelineRange.end - timelineRange.start;
    const barMs = new Date(endDate) - new Date(startDate);
    const timelineWidth = Math.max(100, months.length * 80);
    return Math.max(4, (barMs / totalMs) * timelineWidth);
  };

  if (projectsWithDelivery.length === 0 || !timelineRange) {
    return (
      <Card className="bg-slate-800/50 border-slate-700/50 p-8 text-center">
        <p className="text-slate-400">Nenhum projeto com data de entrega definida</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex gap-8 px-4 py-3 text-xs font-medium bg-slate-800/40 rounded-lg border border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[5px] border-b-blue-500" />
          <span className="text-slate-300">Go Live</span>
        </div>
        <div className="flex items-center gap-2">
          <Circle className="w-2 h-2 text-green-500 fill-green-500" />
          <span className="text-slate-300">Fim do Projeto</span>
        </div>
      </div>

      {/* Timeline Container */}
      <div className="border border-slate-700 rounded-lg bg-slate-900/20 overflow-hidden">
        {/* Header with months */}
        <div className="flex">
          {/* Left spacer for project names */}
          <div className="w-48 shrink-0 bg-slate-900/50 border-r border-slate-700 p-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase">Projeto</h3>
          </div>

          {/* Timeline header */}
          <div className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-600">
            <div className="flex" style={{ width: `${Math.max(100, months.length * 80)}px` }}>
              {months.map((month, idx) => (
                <div
                  key={idx}
                  className="px-2 py-3 border-r border-slate-700/50 last:border-r-0 text-center bg-slate-800/30"
                  style={{ width: '80px' }}
                >
                  <div className="text-xs font-bold text-slate-300">
                    {format(month, 'MMM', { locale: ptBR })}
                  </div>
                  <div className="text-xs text-slate-500">
                    {format(month, 'dd', { locale: ptBR })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline rows */}
        <div className="flex">
          {/* Project names */}
          <div className="w-48 shrink-0 border-r border-slate-700 bg-slate-900/30">
            {projectsWithDelivery.map((project) => (
              <div
                key={project.id}
                className="h-14 px-4 py-3 border-b border-slate-700 last:border-b-0 flex items-center"
              >
                <span className="text-sm font-medium text-slate-200 truncate">{project.name}</span>
              </div>
            ))}
          </div>

          {/* Timeline bars */}
          <div className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-600 relative">
            <div style={{ width: `${Math.max(100, months.length * 60)}px` }} className="relative">
              {/* Vertical grid lines */}
              <div className="absolute inset-0 flex pointer-events-none">
                {months.map((month, idx) => (
                  <div
                    key={idx}
                    className="flex-1 border-r border-slate-700/20 last:border-r-0 min-w-[60px]"
                  />
                ))}
              </div>

              {/* Project bars */}
              {projectsWithDelivery.map((project) => {
                const startPos = getDatePosition(project.goLiveDate);
                const barWidth = getBarWidth(project.goLiveDate, project.deliveryDate);

                return (
                  <div
                    key={project.id}
                    className="h-14 py-3 px-2 border-b border-slate-700 last:border-b-0 relative flex items-center"
                  >
                    {/* Bar container */}
                    <div className="absolute top-0 bottom-0 flex items-center" style={{ left: `${startPos}%` }}>
                      {/* Bar background */}
                      <div
                        className="h-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded opacity-70 hover:opacity-100 transition-opacity relative group"
                        style={{ width: `${barWidth}%`, minWidth: '8px' }}
                      >
                        {/* Tooltip */}
                        <div className="hidden group-hover:block absolute z-10 bottom-full left-0 mb-2 whitespace-nowrap">
                          <div className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200">
                            {format(new Date(project.goLiveDate), 'dd MMM', { locale: ptBR })} - {format(new Date(project.deliveryDate), 'dd MMM', { locale: ptBR })}
                          </div>
                        </div>
                      </div>

                      {/* Go Live marker */}
                      <div className="absolute top-1/2 -translate-y-1/2" style={{ left: 0 }}>
                        <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[6px] border-b-blue-500 relative" style={{ marginLeft: '-3px' }}>
                          <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 text-xs text-slate-400 font-semibold whitespace-nowrap pointer-events-none">
                            {format(new Date(project.goLiveDate), 'dd/MM', { locale: ptBR })}
                          </div>
                        </div>
                      </div>

                      {/* Delivery marker */}
                      <div className="absolute top-1/2 -translate-y-1/2" style={{ left: `${barWidth}%` }}>
                        <Circle className="w-4 h-4 text-green-500 fill-green-500 relative" style={{ marginLeft: '-8px' }} />
                        <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 text-xs text-slate-400 font-semibold whitespace-nowrap pointer-events-none">
                          {format(new Date(project.deliveryDate), 'dd/MM', { locale: ptBR })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}