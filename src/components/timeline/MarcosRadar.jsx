import React, { useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function MarcosRadar({ projects, timelineEvents, products = [] }) {
  const projectsData = useMemo(() => {
    const today = new Date();
    
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
        isProjectCompleted,
        daysToGoLive: goLiveDate ? differenceInDays(new Date(goLiveDate), today) : null,
        daysToDelivery: deliveryDate ? differenceInDays(new Date(deliveryDate), today) : null
      };
    }).filter(p => p.deliveryDate && !p.isProjectCompleted);
  }, [projects, timelineEvents, products]);

  const getColor = (daysToEvent) => {
    if (daysToEvent <= 30) return { bg: 'bg-red-500', border: 'border-red-400' };
    if (daysToEvent <= 60) return { bg: 'bg-yellow-500', border: 'border-yellow-400' };
    if (daysToEvent <= 90) return { bg: 'bg-blue-500', border: 'border-blue-400' };
    return { bg: 'bg-green-500', border: 'border-green-400' };
  };

  const maxDays = useMemo(() => {
    const allDays = projectsData.flatMap(p => [p.daysToGoLive, p.daysToDelivery]).filter(Boolean);
    return Math.max(...allDays, 120);
  }, [projectsData]);

  const radarSize = 400;
  const center = radarSize / 2;
  const maxRadius = (radarSize - 40) / 2;

  // Rings em 30, 60, 90, 120+ dias
  const rings = [30, 60, 90, 120];

  const getPosition = (days, projectId) => {
    // Gerar ângulo determinístico baseado no projectId
    let hash = 0;
    for (let i = 0; i < projectId.length; i++) {
      hash = ((hash << 5) - hash) + projectId.charCodeAt(i);
      hash = hash & hash;
    }
    const angle = ((hash % 360) / 180) * Math.PI;
    const radius = (Math.min(days, maxDays) / maxDays) * maxRadius;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
      radius: Math.max(20, Math.min(40, 20 + (days / maxDays) * 20))
    };
  };

  if (projectsData.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700/50 p-8 text-center">
        <p className="text-slate-400">Nenhum projeto com data de entrega definida</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="grid grid-cols-4 gap-4 px-4 py-3 text-xs font-medium bg-slate-800/40 rounded-lg border border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500"></div>
          <span className="text-slate-300">Crítico (≤30d)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
          <span className="text-slate-300">Atenção (≤60d)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500"></div>
          <span className="text-slate-300">Planejado (≤90d)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500"></div>
          <span className="text-slate-300">Distante (120d+)</span>
        </div>
      </div>

      {/* Radar SVG */}
      <div className="flex justify-center">
        <svg width={radarSize} height={radarSize} className="bg-slate-900/30 rounded-lg border border-slate-700">
          {/* Grid circles */}
          {rings.map((ring) => {
            const r = (ring / maxDays) * maxRadius;
            return (
              <g key={`ring-${ring}`}>
                <circle
                  cx={center}
                  cy={center}
                  r={r}
                  fill="none"
                  stroke="url(#gridGradient)"
                  strokeDasharray="4,4"
                  opacity="0.3"
                />
                <text
                  x={center + r}
                  y={center - 4}
                  className="text-xs fill-slate-500"
                  textAnchor="middle"
                >
                  {ring}d
                </text>
              </g>
            );
          })}

          <defs>
            <linearGradient id="gridGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#1e293b" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Center point */}
          <circle cx={center} cy={center} r="4" fill="#3b82f6" opacity="0.5" />
          <text x={center} y={center - 12} className="text-xs fill-slate-400" textAnchor="middle">
            Hoje
          </text>

          {/* Projetos */}
          {projectsData.map((project, idx) => {
            const goLivePos = getPosition(Math.max(0, project.daysToGoLive), project.id);
            const deliveryPos = getPosition(Math.max(0, project.daysToDelivery), project.id + '_delivery');
            
            const goLiveColor = getColor(Math.max(0, project.daysToGoLive));
            const deliveryColor = getColor(Math.max(0, project.daysToDelivery));

            return (
              <g key={project.id}>
                {/* Go Live - Triângulo */}
                {project.daysToGoLive !== null && (
                  <g title={`${project.name} - Go Live${project.daysToGoLive >= 0 ? ` em ${project.daysToGoLive}d` : ` (${Math.abs(project.daysToGoLive)}d atrás)`}${project.goLiveDate ? ` - ${format(new Date(project.goLiveDate), 'dd/MM/yy')}` : ''}`}>
                    <polygon
                      points={`${goLivePos.x},${goLivePos.y - 10} ${goLivePos.x - 10},${goLivePos.y + 10} ${goLivePos.x + 10},${goLivePos.y + 10}`}
                      fill={goLiveColor.bg === 'bg-red-500' ? '#ef4444' : goLiveColor.bg === 'bg-yellow-500' ? '#eab308' : goLiveColor.bg === 'bg-blue-500' ? '#3b82f6' : '#22c55e'}
                      opacity="0.9"
                      style={{
                        filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.7))',
                        cursor: 'pointer'
                      }}
                    />
                  </g>
                )}

                {/* Fim do Projeto - Círculo */}
                {project.daysToDelivery !== null && (
                  <g title={`${project.name} - Fim do Projeto${project.daysToDelivery >= 0 ? ` em ${project.daysToDelivery}d` : ` (${Math.abs(project.daysToDelivery)}d atrás)`}${project.deliveryDate ? ` - ${format(new Date(project.deliveryDate), 'dd/MM/yy')}` : ''}`}>
                    <circle
                      cx={deliveryPos.x}
                      cy={deliveryPos.y}
                      r="10"
                      fill={deliveryColor.bg === 'bg-red-500' ? '#ef4444' : deliveryColor.bg === 'bg-yellow-500' ? '#eab308' : deliveryColor.bg === 'bg-blue-500' ? '#3b82f6' : '#22c55e'}
                      opacity="0.9"
                      style={{
                        filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.7))',
                        cursor: 'pointer'
                      }}
                    />
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Project List */}
      <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4 max-h-64 overflow-y-auto">
        <h3 className="text-sm font-bold text-slate-200 mb-3">Projetos Monitorados</h3>
        <div className="space-y-2">
          {projectsData.map((project) => (
            <div key={project.id} className="text-xs text-slate-300 p-2 bg-slate-900/50 rounded border border-slate-700">
              <div className="font-medium text-slate-100">{project.name}</div>
              <div className="mt-1 flex gap-4">
                <span>
                  🔺 Go Live: {project.daysToGoLive !== null 
                    ? `${project.daysToGoLive > 0 ? '+' : ''}${project.daysToGoLive}d - ${format(new Date(project.goLiveDate), 'dd/MM', { locale: ptBR })}` 
                    : '-'}
                </span>
                <span>
                  ⭕ Fim: {project.daysToDelivery !== null 
                    ? `${project.daysToDelivery > 0 ? '+' : ''}${project.daysToDelivery}d - ${format(new Date(project.deliveryDate), 'dd/MM', { locale: ptBR })}` 
                    : '-'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}