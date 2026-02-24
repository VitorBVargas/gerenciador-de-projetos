import React, { useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Triangle, Circle, Info } from 'lucide-react';
import { format, addMonths, startOfMonth, endOfMonth, isBefore, isAfter, isWithinInterval, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ProjectsDeliveryTimeline({ projects, timelineEvents, products = [] }) {
  const scrollContainerRef = React.useRef(null);
  
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

  const handleScroll = (e) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex gap-6 px-4 py-2 text-xs font-medium">
        <div className="flex items-center gap-2">
          <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[7px] border-b-blue-500" />
          <span className="text-slate-300">Go Live</span>
        </div>
        <div className="flex items-center gap-2">
          <Circle className="w-3 h-3 text-green-500 fill-green-500" />
          <span className="text-slate-300">Fim do Projeto</span>
        </div>
        <div className="flex items-center gap-2">
          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
          <span className="text-slate-300">Aguardando Aceite</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-900/20">
        {/* Header with Scroll Control */}
        <div className="flex">
          {/* Project Column Header */}
          <div className="w-48 shrink-0 border-r border-slate-700 bg-slate-900/50 p-3">
            <div className="text-xs font-bold text-slate-300 uppercase">Projeto</div>
          </div>

          {/* Timeline Header - Scrollable */}
          <div 
            className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent"
            onScroll={handleScroll}
          >
            <div className="flex min-w-[800px] border-b border-slate-700">
              {months.map((month, idx) => (
                <div
                  key={idx}
                  className="flex-1 px-3 py-3 border-r border-slate-700/50 last:border-r-0 text-center bg-slate-800/30"
                >
                  <div className="text-xs font-bold text-slate-300 uppercase">
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

        {/* Timeline Rows */}
        {projectsWithDelivery.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
            Nenhum projeto com data de entrega
          </div>
        ) : (
          projectsWithDelivery.map((project) => {
            const config = statusConfig[project.status];
            const Icon = config.icon;
            const deliveryPosition = getDatePosition(project.deliveryDate);
            const goLivePosition = project.goLiveDate ? getDatePosition(new Date(project.goLiveDate)) : null;

            return (
              <div key={project.id} className="flex border-b border-slate-700 last:border-b-0 h-20">
                {/* Project Name */}
                <div className="w-48 shrink-0 border-r border-slate-700 bg-slate-900/30 px-3 py-4 flex flex-col justify-center">
                  <div className="text-sm font-semibold text-white truncate">{project.name}</div>
                  <div className="text-xs text-slate-400 mt-1">0</div>
                </div>

                {/* Timeline */}
                <div 
                  ref={scrollContainerRef}
                  className="flex-1 relative overflow-x-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent"
                >
                  <div className="relative min-w-[800px] h-full flex items-center">
                    {/* Grid Lines */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {months.map((_, idx) => (
                        <div key={idx} className="flex-1 border-r border-slate-700/30 last:border-r-0" />
                      ))}
                    </div>

                    {/* Progress Bar */}
                    {goLivePosition !== null && deliveryPosition !== null && (
                      <div
                        className="absolute h-6 bg-slate-600 rounded"
                        style={{
                          left: `${goLivePosition}%`,
                          width: `${deliveryPosition - goLivePosition}%`,
                          minWidth: '4px'
                        }}
                      />
                    )}

                    {/* Go Live Marker */}
                    {goLivePosition !== null && goLivePosition >= 0 && goLivePosition <= 100 && (
                      <div
                        className="absolute z-20 flex flex-col items-center"
                        style={{ left: `${goLivePosition}%`, transform: 'translateX(-50%)' }}
                      >
                        <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[7px] border-b-blue-500" />
                        <div className="text-xs font-semibold text-slate-200 mt-1 whitespace-nowrap">
                          {format(new Date(project.goLiveDate), 'dd MMM', { locale: ptBR })}
                        </div>
                      </div>
                    )}

                    {/* Delivery Marker */}
                    {deliveryPosition >= 0 && deliveryPosition <= 100 && (
                      <div
                        className="absolute z-20 flex flex-col items-center"
                        style={{ left: `${deliveryPosition}%`, transform: 'translateX(-50%)' }}
                      >
                        <Icon className={`w-5 h-5 ${config.color}`} />
                        <div className="text-xs font-semibold text-slate-200 mt-1 whitespace-nowrap">
                          {format(new Date(project.deliveryDate), 'dd MMM', { locale: ptBR })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}