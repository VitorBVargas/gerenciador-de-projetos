import React, { useMemo, useState } from 'react';
import { addMonths, format, parseISO, isValid, differenceInDays, addDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

const MONTHS_IN_VIEW = 5;

function getProjectDates({ project, productsByProjectId, financialDatesByProductId, progressCacheByProjectId, allTimelineEvents }) {
  const projectId = project.id;
  const products = productsByProjectId[projectId] || [];

  const goLiveDates = products
    .map(p => financialDatesByProductId[p.id]?.go_live_date)
    .filter(Boolean)
    .map(d => parseISO(d))
    .filter(isValid);
  const goLive = goLiveDates.length > 0 ? new Date(Math.min(...goLiveDates)) : null;

  let closingDate = null;
  let closingSource = null;

  // Calcula direto dos timeline events (fonte mais atualizada)
  const projectEventDates = allTimelineEvents
    .filter(e => e.project_id === projectId && e.end_date)
    .map(e => parseISO(e.end_date))
    .filter(isValid);
  if (projectEventDates.length > 0) {
    closingDate = new Date(Math.max(...projectEventDates));
    closingSource = 'Prazo Estimado';
  }

  // Fallback: cache
  if (!closingDate) {
    const estimatedDeadlineStr = progressCacheByProjectId[projectId]?.estimated_deadline;
    if (estimatedDeadlineStr) {
      const d = parseISO(estimatedDeadlineStr);
      if (isValid(d)) { closingDate = d; closingSource = 'Prazo Estimado'; }
    }
  }

  // Fallback: prazo contratual
  if (!closingDate && project.deadline) {
    const d = parseISO(project.deadline);
    if (isValid(d)) { closingDate = d; closingSource = 'Prazo Contratual'; }
  }

  return { goLive, closingDate, closingSource, totalProducts: products.length };
}

export default function ProjectGoLiveTimeline({ projects, dictionaries, allTimelineEvents }) {
  const navigate = useNavigate();
  const today = startOfDay(new Date());

  const [windowStart, setWindowStart] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const windowEnd = addMonths(windowStart, MONTHS_IN_VIEW);

  const ticks = useMemo(() => {
    const marks = [];
    let d = new Date(windowStart);
    while (d < windowEnd) { marks.push(new Date(d)); d = addDays(d, 10); }
    return marks;
  }, [windowStart, windowEnd]);

  const totalDays = differenceInDays(windowEnd, windowStart);
  const dayPct = (date) => Math.max(0, Math.min(100, (differenceInDays(date, windowStart) / totalDays) * 100));
  const todayPct = dayPct(today);

  const projectRows = useMemo(() => {
    return projects.map(project => {
      const dates = getProjectDates({
        project,
        productsByProjectId: dictionaries.productsByProjectId,
        financialDatesByProductId: dictionaries.financialDatesByProductId,
        progressCacheByProjectId: dictionaries.progressCacheByProjectId,
        allTimelineEvents,
      });
      return { project, ...dates };
    }).filter(row => row.goLive || row.closingDate);
  }, [projects, dictionaries, allTimelineEvents]);

  const [modalData, setModalData] = useState(null);

  const openModal = (row) => {
    const { project } = row;
    const products = dictionaries.productsByProjectId[project.id] || [];
    const verticalMap = {};
    products.forEach(prod => {
      const vertical = prod.vertical || 'Sem vertical';
      if (!verticalMap[vertical]) verticalMap[vertical] = [];
      verticalMap[vertical].push(prod);
    });

    const verticals = Object.entries(verticalMap).map(([vertical, prods]) => {
      const goLiveDates = prods
        .map(p => dictionaries.financialDatesByProductId[p.id]?.go_live_date)
        .filter(Boolean).map(d => parseISO(d)).filter(isValid);
      const closingDates = prods
        .map(p => dictionaries.financialDatesByProductId[p.id]?.operacao_assistida_end_date)
        .filter(Boolean).map(d => parseISO(d)).filter(isValid);
      return {
        vertical,
        goLive: goLiveDates.length > 0 ? new Date(Math.min(...goLiveDates)) : null,
        closing: closingDates.length > 0 ? new Date(Math.max(...closingDates)) : null,
        count: prods.length,
      };
    }).sort((a, b) => a.vertical.localeCompare(b.vertical));

    setModalData({ ...row, verticals });
  };

  return (
    <div className="space-y-4">

      {/* Modal */}
      {modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModalData(null)}>
          <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-4 border-b border-slate-700">
              <div>
                <h3 className="text-white font-semibold text-base">{modalData.project.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{modalData.totalProducts} produtos analisados</p>
              </div>
              <button onClick={() => setModalData(null)} className="text-slate-400 hover:text-white transition-colors ml-4 mt-0.5">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 border-b border-slate-700">
              <div className="bg-blue-500/10 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-base">🔷</span>
                  <span className="text-xs text-slate-400">Go Live do Projeto</span>
                </div>
                <p className="text-blue-300 font-semibold text-sm">
                  {modalData.goLive ? format(modalData.goLive, 'dd/MM/yyyy') : '—'}
                </p>
              </div>
              <div className="bg-amber-500/10 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-base">🔶</span>
                  <span className="text-xs text-slate-400">Encerramento</span>
                </div>
                <p className="text-amber-300 font-semibold text-sm">
                  {modalData.closingDate ? format(modalData.closingDate, 'dd/MM/yyyy') : '—'}
                </p>
                {modalData.closingSource && <p className="text-xs text-slate-500 mt-0.5">{modalData.closingSource}</p>}
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-3">Datas por Vertical</p>
              {modalData.verticals.length === 0 && (
                <p className="text-slate-500 text-sm">Nenhuma vertical com datas encontrada.</p>
              )}
              {modalData.verticals.map(({ vertical, goLive, closing, count }) => (
                <div key={vertical} className="flex items-center justify-between rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 capitalize truncate">{vertical}</p>
                    <p className="text-xs text-slate-500">{count} produto(s)</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs flex-shrink-0 ml-3">
                    <div className="text-center">
                      <div className="text-slate-500 mb-0.5">🔷 Go Live</div>
                      <div className="text-blue-300 font-medium">{goLive ? format(goLive, 'dd/MM/yy') : '—'}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-500 mb-0.5">🔶 Encerr.</div>
                      <div className="text-amber-300 font-medium">{closing ? format(closing, 'dd/MM/yy') : '—'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-700">
              <button
                onClick={() => navigate(createPageUrl(`Dashboard?project_id=${modalData.project.id}`))}
                className="w-full py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                Abrir Projeto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWindowStart(d => addMonths(d, -MONTHS_IN_VIEW))}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 text-sm transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>
          <button
            onClick={() => setWindowStart(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="px-3 py-1.5 rounded-md bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 text-sm transition-colors"
          >
            Hoje
          </button>
          <button
            onClick={() => setWindowStart(d => addMonths(d, MONTHS_IN_VIEW))}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 text-sm transition-colors"
          >
            Próximo
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="text-sm text-slate-400">
          {format(windowStart, 'MMM/yyyy', { locale: ptBR })} – {format(addDays(windowEnd, -1), 'MMM/yyyy', { locale: ptBR })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-slate-400">
        <div className="flex items-center gap-1.5"><span className="text-blue-400 text-base">🔷</span> Go Live</div>
        <div className="flex items-center gap-1.5"><span className="text-amber-400 text-base">🔶</span> Encerramento</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 border-t-2 border-dashed border-red-500" /> Hoje</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm bg-blue-500/40" /> Duração</div>
        <div className="flex items-center gap-1.5 text-slate-500 italic">Clique na linha para ver detalhes por vertical</div>
      </div>

      {/* Timeline grid */}
      <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
        {/* Month headers */}
        <div className="flex border-b border-slate-700">
          <div className="w-48 flex-shrink-0 border-r border-slate-700 px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
            Projeto
          </div>
          <div className="flex-1 relative h-8">
            {Array.from({ length: MONTHS_IN_VIEW }).map((_, i) => {
              const monthDate = addMonths(windowStart, i);
              return (
                <div
                  key={i}
                  className="absolute top-0 h-full flex items-center px-2 text-xs text-slate-400 font-medium border-r border-slate-700/50"
                  style={{ left: `${(i / MONTHS_IN_VIEW) * 100}%`, width: `${100 / MONTHS_IN_VIEW}%` }}
                >
                  {format(monthDate, 'MMM/yy', { locale: ptBR })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tick marks row */}
        <div className="flex border-b border-slate-800">
          <div className="w-48 flex-shrink-0 border-r border-slate-700" />
          <div className="flex-1 relative h-5">
            {ticks.map((tick, i) => {
              const pct = dayPct(tick);
              if (pct < 0 || pct > 100) return null;
              return (
                <div key={i} className="absolute top-0 h-full flex items-center" style={{ left: `${pct}%` }}>
                  <div className="w-px h-2 bg-slate-700" />
                  <span className="text-[9px] text-slate-600 ml-0.5 select-none">{format(tick, 'd')}</span>
                </div>
              );
            })}
            {todayPct >= 0 && todayPct <= 100 && (
              <div className="absolute top-0 h-full w-px bg-red-500/60" style={{ left: `${todayPct}%` }} />
            )}
          </div>
        </div>

        {/* Project rows */}
        <div className="overflow-y-auto max-h-[520px]">
          {projectRows.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              Nenhum projeto com datas de Go Live ou Encerramento para exibir neste portfólio.
            </div>
          ) : (
            projectRows.map(({ project, goLive, closingDate, closingSource, totalProducts }) => {
              const isPaused = project.status === 'pausado';
              const isOverdue = !isPaused && closingDate && closingDate < today;
              const goLivePct = goLive ? dayPct(goLive) : null;
              const closingPct = closingDate ? dayPct(closingDate) : null;
              const goLiveInView = goLivePct !== null && goLivePct >= 0 && goLivePct <= 100;
              const closingInView = closingPct !== null && closingPct >= 0 && closingPct <= 100;

              const shouldDrawBar = goLivePct !== null && closingPct !== null;
              const barLeft = shouldDrawBar ? Math.max(0, Math.min(goLivePct, closingPct)) : null;
              const barRight = shouldDrawBar ? Math.max(0, Math.min(100, Math.max(goLivePct, closingPct))) : null;
              const barWidth = shouldDrawBar ? Math.max(0, barRight - barLeft) : 0;

              return (
                <div
                  key={project.id}
                  className={cn(
                    "flex border-b border-slate-800 hover:bg-slate-800/40 transition-colors group",
                    isPaused && "bg-orange-950/10",
                    isOverdue && "bg-red-950/10"
                  )}
                >
                  <div
                    className="w-48 flex-shrink-0 border-r border-slate-700 px-3 py-3 flex items-center cursor-pointer"
                    onClick={() => openModal({ project, goLive, closingDate, closingSource, totalProducts })}
                  >
                    <div className="min-w-0">
                      <p className={cn(
                        "text-xs font-medium truncate transition-colors",
                        isPaused ? "text-orange-400 group-hover:text-orange-300" : isOverdue ? "text-red-400" : "text-slate-200 group-hover:text-blue-400"
                      )} title={project.name}>
                        {project.name}
                      </p>
                      {isPaused && <span className="text-[9px] text-orange-400 font-semibold">⏸ PARALISADO</span>}
                      {isOverdue && <span className="text-[9px] text-red-500 font-semibold">⚠ ATRASADO</span>}
                    </div>
                  </div>

                  <div
                    className="flex-1 relative h-11 cursor-pointer"
                    onClick={() => openModal({ project, goLive, closingDate, closingSource, totalProducts })}
                  >
                    {ticks.map((tick, i) => {
                      const pct = dayPct(tick);
                      if (pct < 0 || pct > 100) return null;
                      return <div key={i} className="absolute top-0 h-full w-px bg-slate-800" style={{ left: `${pct}%` }} />;
                    })}

                    {shouldDrawBar && barWidth > 0 && (
                      <div
                        className={cn(
                          "absolute top-1/2 -translate-y-1/2 h-2 rounded-full",
                          isPaused
                            ? "bg-orange-500/30 border border-orange-500/50"
                            : isOverdue
                              ? "bg-red-500/30 border border-red-500/40"
                              : "bg-blue-500/30 border border-blue-500/40"
                        )}
                        style={{ left: `${barLeft}%`, width: `${barWidth}%` }}
                      />
                    )}

                    {goLiveInView && (
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-base leading-none select-none z-10" style={{ left: `${goLivePct}%` }}>
                        🔷
                      </div>
                    )}

                    {closingInView && (
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-base leading-none select-none z-10" style={{ left: `${closingPct}%` }}>
                        🔶
                      </div>
                    )}

                    {todayPct >= 0 && todayPct <= 100 && (
                      <div className="absolute top-0 h-full border-l-2 border-dashed border-red-500/70 z-20" style={{ left: `${todayPct}%` }} />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}