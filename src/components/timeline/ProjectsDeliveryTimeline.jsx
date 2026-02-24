import React, { useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Triangle, Circle, Info } from 'lucide-react';
import { format, addMonths, startOfMonth, endOfMonth, isBefore, isAfter, isWithinInterval, differenceInDays } from 'date-fns';
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
      {/* Legend - Professional Style */}
      <div className="flex flex-wrap gap-6 px-4 py-3 bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-blue-500" />
          <span className="text-xs text-slate-300 font-medium">Go Live</span>
        </div>
        <div className="flex items-center gap-2">
          <Circle className="w-4 h-4 text-green-500 fill-green-500" />
          <span className="text-xs text-slate-300 font-medium">Fim do Projeto</span>
        </div>
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span className="text-xs text-slate-300 font-medium">Aguardando Aceite</span>
        </div>
      </div>

      {/* Gantt Chart Container */}
      <div className="rounded-lg border border-slate-700 overflow-hidden bg-slate-900/20 backdrop-blur-sm">
        {/* Header */}
        <div className="flex border-b border-slate-700">
          {/* Fixed Column Header */}
          <div className="w-72 shrink-0 sticky left-0 z-20 bg-gradient-to-b from-slate-800 to-slate-800/50 border-r border-slate-700 p-4">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Projeto</div>
          </div>

          {/* Scrollable Timeline Header */}
          <div className="flex-1 overflow-x-auto">
            <div className="flex min-w-[1400px]">
              {months.map((month, idx) => (
                <div
                  key={idx}
                  className="flex-1 px-3 py-4 border-r border-slate-700/50 last:border-r-0 text-center bg-slate-800/30"
                >
                  <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    {format(month, 'MMM', { locale: ptBR })}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {format(month, 'yy', { locale: ptBR })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline Rows */}
        {projectsWithDelivery.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Info className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhum projeto com data de entrega definida</p>
          </div>
        ) : (
          projectsWithDelivery.map((project, idx) => {
            const config = statusConfig[project.status];
            const Icon = config.icon;
            const deliveryPosition = getDatePosition(project.deliveryDate);
            const goLivePosition = project.goLiveDate ? getDatePosition(new Date(project.goLiveDate)) : null;
            const daysBetween = project.goLiveDate && project.deliveryDate
              ? differenceInDays(new Date(project.deliveryDate), new Date(project.goLiveDate))
              : null;

            return (
              <div key={project.id} className="flex border-b border-slate-700 last:border-b-0 hover:bg-slate-800/30 transition-colors">
                {/* Fixed Project Info */}
                <div className="w-72 shrink-0 sticky left-0 z-10 bg-slate-900/60 border-r border-slate-700 px-4 py-5 flex flex-col justify-center">
                  <div className="text-sm font-semibold text-white truncate">
                    {project.name}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {daysBetween && `${daysBetween}d de duração`}
                  </div>
                </div>

                {/* Timeline Bar */}
                <div className="flex-1 relative overflow-x-auto">
                  <div className="relative min-w-[1400px] h-16 flex items-center">
                    {/* Month Grid Lines */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {months.map((_, idx) => (
                        <div
                          key={idx}
                          className="flex-1 border-r border-slate-700/30 last:border-r-0"
                        />
                      ))}
                    </div>

                    {/* Background Bar (Project Duration) */}
                    {goLivePosition !== null && deliveryPosition !== null && (
                      <div
                        className="absolute h-8 bg-gradient-to-r from-blue-500/20 to-emerald-500/20 rounded border border-slate-600/50"
                        style={{
                          left: `calc(${goLivePosition}% + 1.5px)`,
                          right: `calc(100% - ${deliveryPosition}%)`,
                          minWidth: '2px'
                        }}
                      />
                    )}

                    {/* Go Live Marker */}
                    {goLivePosition !== null && goLivePosition >= 0 && goLivePosition <= 100 && (
                      <div
                        className="absolute flex flex-col items-center z-20 -translate-x-1/2"
                        style={{ left: `${goLivePosition}%` }}
                      >
                        <div className="relative flex flex-col items-center">
                          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-blue-500 drop-shadow-lg" />
                          <div className="text-xs font-semibold text-slate-200 mt-1 bg-blue-950/80 px-2 py-1 rounded whitespace-nowrap border border-blue-700/50">
                            {format(new Date(project.goLiveDate), 'dd MMM', { locale: ptBR })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Delivery Marker */}
                    {deliveryPosition >= 0 && deliveryPosition <= 100 && (
                      <div
                        className="absolute flex flex-col items-center z-20 -translate-x-1/2"
                        style={{ left: `${deliveryPosition}%` }}
                      >
                        <div className="relative flex flex-col items-center">
                          <Icon className={`w-6 h-6 ${config.color} drop-shadow-lg filter`} />
                          <div className={`text-xs font-semibold text-slate-200 mt-1 px-2 py-1 rounded whitespace-nowrap border ${
                            config.color.includes('green') ? 'bg-green-950/80 border-green-700/50' :
                            config.color.includes('orange') ? 'bg-orange-950/80 border-orange-700/50' :
                            'bg-slate-950/80 border-slate-700/50'
                          }`}>
                            {format(new Date(project.deliveryDate), 'dd MMM', { locale: ptBR })}
                          </div>
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