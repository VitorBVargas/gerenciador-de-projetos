import React, { useMemo } from 'react';
import { parseISO, differenceInCalendarDays, format, min, max } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plane, Crown, CalendarRange, MapPin, Navigation } from 'lucide-react';
import { cn } from "@/lib/utils";
import { phaseLabels } from '../timeline/phaseLabels';
import EmptyState from '../ui/EmptyState';

const verticalLabels = {
  gerenciamento: 'Gerenciamento',
  arrecadacao: 'Arrecadação',
  compras: 'Contratos',
  contabil: 'Contábil',
  pessoal: 'Pessoal',
  educacao: 'Educação',
  iss: 'ISS',
  parceiros: 'Parceiros',
  plataforma: 'Plataforma',
  saude: 'Saúde',
  atendimento: 'Atendimento',
  extensoes: 'Extensões',
  gestao_projetos: 'Gestão de Projetos',
  gestao_operacoes: 'Gestão de Operações',
  coordenacao_tecnica: 'Coordenação Técnica',
  migrador: 'Migrador'
};

const safeParse = (d) => {
  try { return d ? parseISO(d) : null; } catch { return null; }
};

/**
 * Timeline (Gantt) da equipe.
 * Para cada membro, calcula o intervalo das etapas do cronograma da sua vertical
 * que correspondem às fases (stages) em que ele está alocado, e sobrepõe as férias.
 */
export default function TeamTimeline({ members, timelineEvents, travels = [] }) {
  // Mapa: para cada membro, as etapas do cronograma que batem com suas stages+vertical
  const rows = useMemo(() => {
    const result = [];

    members.forEach((member) => {
      // Viagens em que o membro é participante (casamento por nome)
      const memberTravels = travels.filter((t) =>
        Array.isArray(t.attendees) &&
        t.attendees.some((a) => a && member.name && a.trim().toLowerCase() === member.name.trim().toLowerCase())
      );
      const stages = member.stages || [];
      // Eventos do cronograma da vertical do membro cuja fase está entre as stages dele
      const memberEvents = timelineEvents.filter((ev) => {
        if (!stages.includes(ev.phase)) return false;
        if (member.vertical && ev.vertical && ev.vertical !== member.vertical) return false;
        return true;
      });

      const segments = [];
      memberEvents.forEach((ev) => {
        const start = safeParse(ev.start_date);
        const end = safeParse(ev.end_date);
        if (start && end) {
          segments.push({ type: 'stage', label: phaseLabels[ev.phase] || ev.title, start, end, status: ev.status });
        }
      });

      const trips = [];
      memberTravels.forEach((t) => {
        const start = safeParse(t.start_date);
        const end = safeParse(t.end_date) || start;
        if (start && end) {
          trips.push({ label: t.location || t.title, start, end, travelType: t.travel_type, title: t.title });
        }
      });

      const feriasStart = safeParse(member.ferias_inicio);
      const feriasEnd = safeParse(member.ferias_fim);
      const hasFerias = feriasStart && feriasEnd;

      // Só inclui membros que têm ao menos etapas, viagens ou férias com datas
      if (segments.length === 0 && trips.length === 0 && !hasFerias) return;

      result.push({
        member,
        segments,
        trips,
        ferias: hasFerias ? { start: feriasStart, end: feriasEnd } : null
      });
    });

    return result;
  }, [members, timelineEvents, travels]);

  // Janela global de datas (min/max de todos os segmentos e férias)
  const { rangeStart, rangeEnd, totalDays } = useMemo(() => {
    const allDates = [];
    rows.forEach((r) => {
      r.segments.forEach((s) => { allDates.push(s.start, s.end); });
      r.trips.forEach((t) => { allDates.push(t.start, t.end); });
      if (r.ferias) { allDates.push(r.ferias.start, r.ferias.end); }
    });
    if (allDates.length === 0) return { rangeStart: null, rangeEnd: null, totalDays: 0 };
    const rs = min(allDates);
    const re = max(allDates);
    return { rangeStart: rs, rangeEnd: re, totalDays: Math.max(differenceInCalendarDays(re, rs) + 1, 1) };
  }, [rows]);

  if (rows.length === 0 || !rangeStart) {
    return (
      <EmptyState
        icon={CalendarRange}
        title="Sem dados para a Timeline"
        description="Aloque membros em etapas do cronograma (na edição do membro) ou registre férias para visualizar o Gantt."
      />
    );
  }

  const pct = (date) => {
    const offset = differenceInCalendarDays(date, rangeStart);
    return (offset / totalDays) * 100;
  };
  const widthPct = (start, end) => {
    const days = differenceInCalendarDays(end, start) + 1;
    return (days / totalDays) * 100;
  };

  const statusColor = {
    concluido: 'bg-green-500/70 border-green-400/60',
    em_andamento: 'bg-blue-500/70 border-blue-400/60',
    atrasado: 'bg-red-500/70 border-red-400/60',
    nao_iniciado: 'bg-slate-500/60 border-slate-400/50'
  };

  // Marcadores de mês para o cabeçalho
  const monthMarkers = [];
  {
    const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    while (cursor <= rangeEnd) {
      if (cursor >= rangeStart) {
        monthMarkers.push({ date: new Date(cursor), left: pct(cursor) });
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  return (
    <div className="space-y-4">
      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500/70 border border-blue-400/60" /> Em andamento</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500/70 border border-green-400/60" /> Concluído</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500/70 border border-red-400/60" /> Atrasado</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-500/60 border border-slate-400/50" /> Não iniciado</span>
        <span className="flex items-center gap-1.5"><Plane className="w-3 h-3 text-amber-400" /> Férias</span>
        <span className="flex items-center gap-1.5"><Navigation className="w-3 h-3 text-purple-400" /> Viagem/Deslocamento</span>
      </div>

      <div className="border border-slate-700 rounded-lg overflow-hidden">
        {/* Cabeçalho de meses */}
        <div className="flex bg-slate-900/60 border-b border-slate-700">
          <div className="w-52 flex-shrink-0 px-3 py-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider">Membro</div>
          <div className="relative flex-1 h-8">
            {monthMarkers.map((m, i) => (
              <div key={i} className="absolute top-0 h-full border-l border-slate-700/60 pl-1 text-[10px] text-slate-500" style={{ left: `${m.left}%` }}>
                {format(m.date, 'MMM/yy', { locale: ptBR })}
              </div>
            ))}
          </div>
        </div>

        {/* Linhas */}
        <div className="divide-y divide-slate-800/60">
          {rows.map(({ member, segments, trips, ferias }) => (
            <div key={member.id} className="flex items-stretch hover:bg-slate-800/30">
              {/* Nome do membro */}
              <div className="w-52 flex-shrink-0 px-3 py-3 flex flex-col justify-center">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-white truncate">{member.name}</span>
                  {member.is_leader && <Crown className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
                </div>
                <span className="text-[11px] text-slate-500">{verticalLabels[member.vertical] || member.vertical}</span>
                {member.city && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-2.5 h-2.5 text-blue-400" />
                    {member.city}
                  </span>
                )}
                {ferias && (
                  <span className="text-[10px] text-amber-400/90 flex items-center gap-1 mt-0.5">
                    <Plane className="w-2.5 h-2.5" />
                    {format(ferias.start, 'dd/MM')} – {format(ferias.end, 'dd/MM/yy')}
                  </span>
                )}
              </div>

              {/* Faixa Gantt */}
              <div className="relative flex-1 my-2 mr-3 min-h-[3.75rem]">
                {/* Grade de meses */}
                {monthMarkers.map((m, i) => (
                  <div key={i} className="absolute top-0 h-full border-l border-slate-800/50" style={{ left: `${m.left}%` }} />
                ))}

                {/* Barras de etapas */}
                {segments.map((seg, i) => (
                  <div
                    key={i}
                    title={`${seg.label}: ${format(seg.start, 'dd/MM/yyyy')} – ${format(seg.end, 'dd/MM/yyyy')}`}
                    className={cn(
                      "absolute h-4 rounded border flex items-center px-1.5 overflow-hidden",
                      statusColor[seg.status] || statusColor.nao_iniciado
                    )}
                    style={{ left: `${pct(seg.start)}%`, width: `${widthPct(seg.start, seg.end)}%`, top: `${i % 2 === 0 ? 2 : 20}px` }}
                  >
                    <span className="text-[9px] text-white/90 truncate whitespace-nowrap">{seg.label}</span>
                  </div>
                ))}

                {/* Barras de viagem/deslocamento (roxo) */}
                {trips.map((trip, i) => (
                  <div
                    key={`trip-${i}`}
                    title={`Viagem${trip.title ? ` – ${trip.title}` : ''}: ${format(trip.start, 'dd/MM/yyyy')} – ${format(trip.end, 'dd/MM/yyyy')}${trip.label ? ` (${trip.label})` : ''}`}
                    className="absolute h-4 rounded border border-purple-400/60 bg-purple-500/70 flex items-center gap-1 px-1.5 overflow-hidden"
                    style={{ left: `${pct(trip.start)}%`, width: `${widthPct(trip.start, trip.end)}%`, top: '38px' }}
                  >
                    <Navigation className="w-2.5 h-2.5 text-white/90 flex-shrink-0" />
                    <span className="text-[9px] text-white/90 truncate whitespace-nowrap">{trip.label}</span>
                  </div>
                ))}

                {/* Barra de férias (sobreposta, tracejada âmbar) */}
                {ferias && (
                  <div
                    title={`Férias: ${format(ferias.start, 'dd/MM/yyyy')} – ${format(ferias.end, 'dd/MM/yyyy')}`}
                    className="absolute inset-y-0 rounded border-2 border-dashed border-amber-400/80 bg-amber-500/25 flex items-center justify-center gap-1.5 px-2 overflow-hidden"
                    style={{ left: `${pct(ferias.start)}%`, width: `${widthPct(ferias.start, ferias.end)}%` }}
                  >
                    <Plane className="w-3 h-3 text-amber-300 flex-shrink-0" />
                    <span className="text-[10px] font-medium text-amber-100 truncate whitespace-nowrap">
                      {format(ferias.start, 'dd/MM/yyyy')} – {format(ferias.end, 'dd/MM/yyyy')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}