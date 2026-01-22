import React, { useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Triangle, Circle } from 'lucide-react';
import { format, addMonths, startOfMonth, endOfMonth, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const verticalLabels = {
  arrecadacao: 'Arrecadação',
  compras: 'Compras/Contratos',
  contabil: 'Contábil',
  pessoal: 'Pessoal',
  educacao: 'Educação',
  iss: 'ISS',
  parceiros: 'Parceiros',
  plataforma: 'Plataforma',
  atendimento: 'Atendimento'
};

export default function ProjectVerticalDeliveryTimeline({ projectId, timelineEvents }) {
  // Calculate timeline range (show 6 months from now)
  const timelineStart = useMemo(() => startOfMonth(new Date()), []);
  const timelineEnd = useMemo(() => endOfMonth(addMonths(new Date(), 5)), []);

  // Group events by vertical with their delivery dates
  const verticalDeliveries = useMemo(() => {
    const projectEvents = timelineEvents.filter(e => e.project_id === projectId && e.end_date);
    
    const grouped = {};
    
    // Group events by vertical
    projectEvents.forEach(event => {
      const vertical = event.vertical || 'outros';
      if (!grouped[vertical]) {
        grouped[vertical] = [];
      }
    });
    
    // For each vertical, find its Go Live and last date
    Object.keys(grouped).forEach(vertical => {
      const verticalEvents = projectEvents.filter(e => (e.vertical || 'outros') === vertical);
      
      // Find Go Live for this vertical
      const goLiveEvent = verticalEvents.find(e => 
        e.title && e.title.toLowerCase().includes('go live')
      );
      
      // Find last date for this vertical
      const lastDate = verticalEvents.length > 0
        ? new Date(Math.max(...verticalEvents.map(e => new Date(e.end_date))))
        : null;
      
      // Add Go Live marker
      if (goLiveEvent) {
        grouped[vertical].push({
          title: 'Go Live',
          deliveryDate: new Date(goLiveEvent.end_date),
          status: 'client_release',
          end_date: goLiveEvent.end_date
        });
      }
      
      // Add last date marker
      if (lastDate) {
        grouped[vertical].push({
          title: 'Fim do Projeto',
          deliveryDate: lastDate,
          status: 'project_end',
          end_date: lastDate.toISOString()
        });
      }
      
      // Sort by date
      grouped[vertical].sort((a, b) => a.deliveryDate - b.deliveryDate);
    });
    
    return grouped;
  }, [projectId, timelineEvents]);

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

  const verticals = Object.keys(verticalDeliveries).sort();

  if (verticals.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700/50 p-8 text-center">
        <p className="text-slate-400">Nenhuma etapa com data de entrega definida</p>
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
          {months.map((month, idx) => (
            <div 
              key={idx} 
              className="flex-1 text-center py-2 border-r border-slate-700 last:border-r-0"
            >
              <div className="text-xs font-medium text-white">
                {format(month, 'MMM/yy', { locale: ptBR })}
              </div>
            </div>
          ))}
        </div>

        {/* Month Grid Lines */}
        <div className="absolute top-0 left-0 right-0 bottom-0 flex pointer-events-none">
          {months.map((_, idx) => (
            <div key={idx} className="flex-1 border-r border-slate-700/30 last:border-r-0" />
          ))}
        </div>
      </div>

      {/* Verticals Timeline */}
      <div className="space-y-3">
        {verticals.map((vertical) => {
          const events = verticalDeliveries[vertical];
          
          return (
            <div key={vertical} className="relative">
              <div className="flex items-center">
                {/* Vertical Name */}
                <div className="w-48 pr-4 text-sm font-medium text-cyan-400">
                  {verticalLabels[vertical] || vertical}
                </div>

                {/* Timeline Bar */}
                <div className="flex-1 relative h-12 bg-slate-800/30 rounded border border-slate-700/50">
                  {/* Delivery Markers */}
                  {events.map((event, idx) => {
                    const config = statusConfig[event.status];
                    const Icon = config.icon;
                    const position = getDatePosition(event.deliveryDate);
                    
                    return (
                      <div 
                        key={idx}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center group"
                        style={{ left: `${position}%` }}
                      >
                        <Icon className={`w-5 h-5 ${config.color}`} />
                        <div className="text-xs text-slate-400 mt-1 whitespace-nowrap">
                          {format(new Date(event.deliveryDate), 'dd/MM', { locale: ptBR })}
                        </div>
                        {/* Tooltip on hover */}
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                          {event.title}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}