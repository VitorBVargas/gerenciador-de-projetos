import React, { useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Triangle, Circle } from 'lucide-react';
import { format, addMonths, startOfMonth, endOfMonth, isBefore, isAfter, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ProjectsDeliveryTimeline({ projects, timelineEvents, products = [] }) {
  // Calculate timeline range (show 6 months from now)
  const timelineStart = useMemo(() => startOfMonth(new Date()), []);
  const timelineEnd = useMemo(() => endOfMonth(addMonths(new Date(), 5)), []);

  // Group projects with their delivery dates
  const projectsWithDelivery = useMemo(() => {
    return projects.map(project => {
      const projectProducts = products.filter(p => p.project_id === project.id);
      const productIds = projectProducts.map(p => p.id);
      
      // Buscar eventos: tanto os com project_id quanto os com product_id dos produtos do projeto
      const projectEvents = timelineEvents.filter(e => 
        e.project_id === project.id || (e.product_id && productIds.includes(e.product_id))
      );
      
      // Verificar se o projeto já está concluído
      const isProjectCompleted = project.status === 'concluido';
      
      // Find the most recent Go Live event (latest end_date)
      const goLiveEvents = projectEvents.filter(e => e.phase === 'go_live');
      const goLiveEvent = goLiveEvents.reduce((latest, event) => {
        if (event.end_date) {
          const eventDate = new Date(event.end_date);
          if (!latest || eventDate > new Date(latest.end_date)) {
            return event;
          }
        }
        return latest;
      }, null);
      
      // Find the furthest encerramento_bastao event end_date (project end)
      const closureEvents = projectEvents.filter(e => e.phase === 'encerramento_bastao');
      const closureEvent = closureEvents.reduce((latest, event) => {
        if (event.end_date) {
          const eventDate = new Date(event.end_date);
          if (!latest || eventDate > new Date(latest.end_date)) {
            return event;
          }
        }
        return latest;
      }, null);
      const deliveryDate = closureEvent?.end_date ? new Date(closureEvent.end_date) : null;

      // Verificar se todas as etapas do cronograma estão concluídas
      const allEventsCompleted = projectEvents.length > 0 && 
        projectEvents.every(e => e.status === 'concluido');
      
      // Verificar se há algum produto sem aceite
      const hasProductWithoutAcceptance = projectProducts.some(p => !p.implementation_accepted);

      // Determine status based on delivery date and conditions
      let status = 'pending';
      if (deliveryDate) {
        const now = new Date();
        
        // Aguardando Aceite: todos os produtos com aceite E data de encerramento já passou
        if (!hasProductWithoutAcceptance && deliveryDate < now) {
          status = 'awaiting_release';
        } else {
          status = 'project_end'; // Fim do Projeto (verde)
        }
      }

      return {
        ...project,
        goLiveDate: goLiveEvent?.end_date,
        deliveryDate,
        status,
        isProjectCompleted
      };
    }).filter(p => p.deliveryDate && !p.isProjectCompleted); // Only show projects with delivery dates and not completed
  }, [projects, timelineEvents, products]);

  // Generate months for the timeline
  const months = useMemo(() => {
    const monthsList = [];
    let current = new Date(timelineStart);
    
    while (isBefore(current, timelineEnd) || current.getTime() === timelineEnd.getTime()) {
      monthsList.push(new Date(current));
      current = addMonths(current, 1);
    }
    
    return monthsList;
  }, [timelineStart, timelineEnd]);

  // Calculate position of a date in the timeline (percentage)
  const getDatePosition = (date) => {
    const totalDays = (timelineEnd - timelineStart) / (1000 * 60 * 60 * 24);
    const daysFromStart = (new Date(date) - timelineStart) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.min(100, (daysFromStart / totalDays) * 100));
  };

  // Status icons and colors
  const statusConfig = {
    client_release: { icon: Triangle, color: 'text-blue-400', label: 'Liberação Cliente' },
    project_end: { icon: Circle, color: 'text-green-400', label: 'Fim do Projeto' },
    awaiting_release: { icon: Star, color: 'text-orange-400', label: 'Aguardando Aceite' },
    go_live: { icon: Triangle, color: 'text-blue-500', label: 'Go Live' }
  };

  if (projectsWithDelivery.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700/50 p-8 text-center">
        <p className="text-slate-400">Nenhum projeto com data de entrega definida</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Legend */}
       <div className="flex flex-wrap gap-4 justify-end">
         <div className="flex items-center gap-2">
           <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-blue-500" />
           <span className="text-xs text-slate-400">Go Live</span>
         </div>
         {Object.entries(statusConfig).filter(([key]) => key !== 'go_live' && key !== 'client_release').map(([key, config]) => {
           const Icon = config.icon;
           return (
             <div key={key} className="flex items-center gap-2">
               <Icon className={`w-4 h-4 ${config.color}`} />
               <span className="text-xs text-slate-400">{config.label}</span>
             </div>
           );
         })}
       </div>

      {/* Timeline Header with Fixed Column */}
      <div className="relative border border-slate-700 rounded">
        <div className="flex">
          {/* Fixed Project Names Header */}
          <div className="w-64 shrink-0 border-r border-slate-700 bg-slate-900 py-2 px-4 sticky left-0 z-20">
            <div className="text-xs font-medium text-white">Projeto</div>
          </div>
          
          {/* Scrollable Month Header */}
          <div className="flex-1 overflow-x-auto">
            <div className="flex border-b border-slate-700 min-w-[1200px]">
              {months.map((month, idx) => (
                <div 
                  key={idx} 
                  className="flex-1 text-center py-2 border-r border-slate-700 last:border-r-0 bg-slate-800/50"
                >
                  <div className="text-xs font-medium text-white">
                    {format(month, 'MMM/yy', { locale: ptBR })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Projects Timeline with Fixed Column */}
      <div className="border border-slate-700 rounded overflow-hidden">
        {projectsWithDelivery.map((project, idx) => {
          const config = statusConfig[project.status];
          const Icon = config.icon;
          const deliveryPosition = getDatePosition(project.deliveryDate);
          const goLivePosition = project.goLiveDate ? getDatePosition(new Date(project.goLiveDate)) : null;

          return (
            <div key={project.id} className="flex border-b border-slate-700 last:border-b-0 h-20">
              {/* Fixed Project Name */}
              <div className="w-64 shrink-0 flex items-center px-4 bg-slate-900/50 border-r border-slate-700 sticky left-0 z-10">
                <div className="text-sm text-white font-medium truncate">
                  {project.name}
                </div>
              </div>

              {/* Timeline Bar */}
              <div className="flex-1 relative bg-slate-800/30 overflow-x-auto">
                <div className="relative h-full min-w-[1200px] flex items-center">
                  {/* Go Live Marker (Blue Triangle) */}
                  {goLivePosition !== null && goLivePosition >= 0 && goLivePosition <= 100 && (
                    <div 
                      className="absolute flex items-center z-10"
                      style={{ left: `${goLivePosition}%`, transform: 'translateX(-50%) translateY(-50%)', top: '50%' }}
                    >
                      <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-blue-500 shadow-lg" />
                      <div className="text-xs text-slate-300 ml-2 whitespace-nowrap bg-slate-900/80 px-2 py-1 rounded">
                        {format(new Date(project.goLiveDate), 'dd/MM', { locale: ptBR })}
                      </div>
                    </div>
                  )}

                  {/* Status Marker (Circle for project_end, Star for awaiting_release) */}
                  {deliveryPosition >= 0 && deliveryPosition <= 100 && (
                    <div 
                      className="absolute flex items-center z-10"
                      style={{ left: `${deliveryPosition}%`, transform: 'translateX(-50%) translateY(-50%)', top: '50%' }}
                    >
                      <Icon className={`w-5 h-5 ${config.color} shadow-lg`} />
                      <div className="text-xs text-slate-300 ml-2 whitespace-nowrap bg-slate-900/80 px-2 py-1 rounded">
                        {format(new Date(project.deliveryDate), 'dd/MM', { locale: ptBR })}
                      </div>
                    </div>
                  )}

                  {/* Month Grid Lines */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {months.map((_, idx) => (
                      <div key={idx} className="flex-1 border-r border-slate-700/30 last:border-r-0" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Debug Info */}
      <div className="mt-8 p-4 bg-slate-800/50 border border-slate-700 rounded text-xs text-slate-400 space-y-2">
        <div className="font-semibold text-slate-300">Debug Info:</div>
        {projectsWithDelivery.map((project) => (
          <div key={project.id} className="space-y-1">
            <div className="font-medium text-slate-300">{project.name}</div>
            <div>• Go Live: {project.goLiveDate ? format(new Date(project.goLiveDate), 'dd/MM/yyyy') : 'N/A'}</div>
            <div>• Entrega: {project.deliveryDate ? format(new Date(project.deliveryDate), 'dd/MM/yyyy') : 'N/A'}</div>
            <div>• Status: {project.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}