import React, { useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Triangle, Circle } from 'lucide-react';
import { format, addMonths, startOfMonth, endOfMonth, isBefore, isAfter, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ProjectsDeliveryTimeline({ projects, timelineEvents }) {
  // Calculate timeline range (show 6 months from now)
  const timelineStart = useMemo(() => startOfMonth(new Date()), []);
  const timelineEnd = useMemo(() => endOfMonth(addMonths(new Date(), 5)), []);

  // Group projects with their delivery dates
  const projectsWithDelivery = useMemo(() => {
    return projects.map(project => {
      const projectEvents = timelineEvents.filter(e => e.project_id === project.id);
      
      // Find the last event end_date
      const deliveryDate = projectEvents.reduce((latest, event) => {
        if (event.end_date) {
          const eventDate = new Date(event.end_date);
          if (!latest || eventDate > latest) {
            return eventDate;
          }
        }
        return latest;
      }, null);

      // Determine status based on delivery date
      let status = 'pending';
      if (deliveryDate) {
        const now = new Date();
        const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        if (deliveryDate < now) {
          status = 'awaiting_release'; // Aguardando Aceite (laranja)
        } else if (deliveryDate <= oneWeekFromNow) {
          status = 'client_release'; // Liberação Cliente (azul)
        } else {
          status = 'project_end'; // Fim do Projeto (verde)
        }
      }

      return {
        ...project,
        deliveryDate,
        status
      };
    }).filter(p => p.deliveryDate); // Only show projects with delivery dates
  }, [projects, timelineEvents]);

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
    awaiting_release: { icon: Star, color: 'text-orange-400', label: 'Aguardando Aceite' }
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
        {Object.entries(statusConfig).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <div key={key} className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${config.color}`} />
              <span className="text-xs text-slate-400">{config.label}</span>
            </div>
          );
        })}
      </div>

      {/* Timeline Header */}
      <div className="relative">
        <div className="flex border-b border-slate-700">
          {months.map((month, idx) => {
            const isFirstHalf = idx < months.length / 2;
            return (
              <div 
                key={idx} 
                className="flex-1 text-center py-2 border-r border-slate-700 last:border-r-0"
              >
                <div className="text-xs font-medium text-white">
                  {format(month, 'MMM/yy', { locale: ptBR })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Month Grid Lines */}
        <div className="absolute top-0 left-0 right-0 bottom-0 flex pointer-events-none">
          {months.map((_, idx) => (
            <div key={idx} className="flex-1 border-r border-slate-700/30 last:border-r-0" />
          ))}
        </div>
      </div>

      {/* Projects Timeline */}
      <div className="space-y-2">
        {projectsWithDelivery.map((project, idx) => {
          const config = statusConfig[project.status];
          const Icon = config.icon;
          const position = getDatePosition(project.deliveryDate);
          
          return (
            <div key={project.id} className="relative">
              <div className="flex items-center">
                {/* Project Name */}
                <div className="w-64 pr-4 text-sm text-white truncate">
                  {project.name}
                </div>

                {/* Timeline Bar */}
                <div className="flex-1 relative h-10 bg-slate-800/30 rounded border border-slate-700/50">
                  {/* Delivery Marker */}
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
                    style={{ left: `${position}%` }}
                  >
                    <Icon className={`w-5 h-5 ${config.color}`} />
                    <div className="text-xs text-slate-400 mt-1 whitespace-nowrap">
                      {format(new Date(project.deliveryDate), 'dd/MM', { locale: ptBR })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}