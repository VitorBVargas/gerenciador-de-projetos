import React, { useMemo, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Triangle, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import { format, addMonths, startOfMonth, endOfMonth, isBefore, isAfter, getDaysInMonth, getMonth, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ProjectsDeliveryTimeline({ projects, timelineEvents, products = [] }) {
  const [expandedProjects, setExpandedProjects] = useState({});

  // Group projects with their delivery dates
  const projectsWithDelivery = useMemo(() => {
    return projects.map(project => {
      const projectProducts = products.filter(p => p.project_id === project.id);
      const productIds = projectProducts.map(p => p.id);
      
      // Buscar eventos: tanto os com project_id quanto os com product_id dos produtos do projeto
      const projectEvents = timelineEvents.filter(e => 
        e.project_id === project.id || (e.product_id && productIds.includes(e.product_id))
      );
      
      const isProjectCompleted = project.status === 'concluido';
      
      // Liberação (Go Live): data MAIS TARDE entre todos os go_live de produtos e verticais
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

      // Verificar se há algum produto sem aceite
      const hasProductWithoutAcceptance = projectProducts.some(p => !p.implementation_accepted);

      // Status: se passou da data de encerramento e todos com aceite = aguardando_release, senão = project_end
      let status = 'pending';
      if (deliveryDate) {
        const now = new Date();
        if (!hasProductWithoutAcceptance && new Date(deliveryDate) < now) {
          status = 'awaiting_release';
        } else {
          status = 'project_end';
        }
      }

      return {
        ...project,
        goLiveDate,
        deliveryDate,
        status,
        isProjectCompleted
      };
    }).filter(p => p.deliveryDate && !p.isProjectCompleted);
  }, [projects, timelineEvents, products]);

  // Generate 12 months from now
  const months = useMemo(() => {
    const monthsList = [];
    for (let i = 0; i < 12; i++) {
      monthsList.push(addMonths(startOfMonth(new Date()), i));
    }
    return monthsList;
  }, []);

  // Group projects by month
  const projectsByMonth = useMemo(() => {
    const grouped = {};
    
    months.forEach(month => {
      grouped[format(month, 'yyyy-MM')] = {
        month,
        goLive: [],
        closing: []
      };
    });

    projectsWithDelivery.forEach(project => {
      // Add to Go Live month
      if (project.goLiveDate) {
        const goLiveMonth = format(new Date(project.goLiveDate), 'yyyy-MM');
        if (grouped[goLiveMonth]) {
          grouped[goLiveMonth].goLive.push(project);
        }
      }

      // Add to Closing month
      if (project.deliveryDate) {
        const closingMonth = format(new Date(project.deliveryDate), 'yyyy-MM');
        if (grouped[closingMonth]) {
          grouped[closingMonth].closing.push(project);
        }
      }
    });

    return grouped;
  }, [months, projectsWithDelivery]);

  const toggleProject = (projectId) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
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