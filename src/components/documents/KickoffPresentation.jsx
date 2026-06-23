import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, Printer, Loader2, Calendar } from 'lucide-react';
import { phaseLabels } from '../timeline/phaseLabels';

// Ordem canônica das fases (mesma do cronograma)
const PHASE_ORDER = [
  'planejamento_contrato',
  'kickoff',
  'diagnostico',
  'onboarding_cliente',
  'configuracao_migracao_hml',
  'homologacao_base',
  'migracao_prd_blackout',
  'configuracao_prd',
  'treinamento',
  'go_live',
  'operacao_assistida',
  'encerramento_bastao',
];

const STATUS_STYLE = {
  concluido: { label: 'Concluído', dot: '#22c55e' },
  em_andamento: { label: 'Em andamento', dot: '#3b82f6' },
  atrasado: { label: 'Atrasado', dot: '#ef4444' },
  nao_iniciado: { label: 'Não iniciado', dot: '#94a3b8' },
};

function fmt(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
}

// Para cada vertical, consolida as fases num cronograma macro:
// pega a menor data de início e a maior data de fim por fase (entre todos os produtos da vertical).
function buildMacroByVertical(products, events) {
  const productById = {};
  products.forEach(p => { productById[p.id] = p; });

  const verticalMap = {}; // vertical -> { phase -> {start, end, statuses[]} }

  events.forEach(ev => {
    const product = productById[ev.product_id];
    const vertical = ev.vertical || product?.vertical;
    if (!vertical || !ev.phase) return;

    if (!verticalMap[vertical]) verticalMap[vertical] = {};
    if (!verticalMap[vertical][ev.phase]) {
      verticalMap[vertical][ev.phase] = { start: null, end: null, statuses: [] };
    }
    const bucket = verticalMap[vertical][ev.phase];
    if (ev.start_date && (!bucket.start || ev.start_date < bucket.start)) bucket.start = ev.start_date;
    if (ev.end_date && (!bucket.end || ev.end_date > bucket.end)) bucket.end = ev.end_date;
    if (ev.status) bucket.statuses.push(ev.status);
  });

  // Transforma em lista ordenada por vertical
  return Object.entries(verticalMap)
    .map(([vertical, phases]) => {
      const rows = PHASE_ORDER
        .filter(ph => phases[ph])
        .map(ph => {
          const b = phases[ph];
          // status macro: pior status presente (atrasado > em_andamento > nao_iniciado > concluido)
          let status = 'nao_iniciado';
          if (b.statuses.includes('atrasado')) status = 'atrasado';
          else if (b.statuses.includes('em_andamento')) status = 'em_andamento';
          else if (b.statuses.length > 0 && b.statuses.every(s => s === 'concluido')) status = 'concluido';
          return { phase: ph, label: phaseLabels[ph] || ph, start: b.start, end: b.end, status };
        });
      return { vertical, rows };
    })
    .filter(v => v.rows.length > 0)
    .sort((a, b) => a.vertical.localeCompare(b.vertical));
}

export default function KickoffPresentation({ projectId, onClose }) {
  const { data: projectData = [] } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => base44.entities.Project.filter({ id: projectId }),
    enabled: !!projectId,
  });
  const project = projectData[0];

  const { data: products = [], isLoading: lp } = useQuery({
    queryKey: ['products', projectId],
    queryFn: () => base44.entities.Product.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: events = [], isLoading: le } = useQuery({
    queryKey: ['timelineEvents', projectId],
    queryFn: () => base44.entities.TimelineEvent.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const loading = lp || le;
  const macro = useMemo(() => buildMacroByVertical(products, events), [products, events]);

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/95 overflow-y-auto">
      {/* Toolbar (não imprime) */}
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-700">
        <div className="flex items-center gap-2 text-white">
          <Calendar className="w-5 h-5 text-blue-400" />
          <span className="font-semibold">Kickoff — Cronograma Macro por Vertical</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-2" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
          </Button>
          <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 gap-2" onClick={onClose}>
            <X className="w-4 h-4" /> Fechar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      ) : macro.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Calendar className="w-10 h-10 mb-3 opacity-50" />
          <p>Nenhuma etapa de cronograma encontrada para gerar os slides.</p>
        </div>
      ) : (
        <div className="kickoff-slides py-8 px-4 space-y-8 max-w-5xl mx-auto">
          {/* Slide de capa */}
          <KickoffSlide>
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-16">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-3xl">B</span>
              </div>
              <p className="text-blue-600 font-semibold uppercase tracking-widest text-sm">Reunião de Kickoff</p>
              <h1 className="text-4xl font-bold text-slate-900">{project?.name || 'Projeto'}</h1>
              {project?.city && <p className="text-lg text-slate-500">{project.city}</p>}
              <p className="text-sm text-slate-400 mt-4">Cronograma Macro do Projeto</p>
            </div>
          </KickoffSlide>

          {/* Um slide por vertical */}
          {macro.map(({ vertical, rows }) => (
            <KickoffSlide key={vertical}>
              <div className="flex items-center justify-between border-b-2 border-blue-600 pb-3 mb-5">
                <div>
                  <p className="text-blue-600 font-semibold uppercase tracking-wider text-xs">Cronograma · Vertical</p>
                  <h2 className="text-2xl font-bold text-slate-900 capitalize">{vertical}</h2>
                </div>
                <span className="text-sm text-slate-400">{project?.name}</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 font-semibold">Etapa</th>
                    <th className="py-2 font-semibold w-28">Início</th>
                    <th className="py-2 font-semibold w-28">Fim</th>
                    <th className="py-2 font-semibold w-36">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const st = STATUS_STYLE[r.status] || STATUS_STYLE.nao_iniciado;
                    return (
                      <tr key={r.phase} className="border-b border-slate-100">
                        <td className="py-2.5 font-medium text-slate-800">{r.label}</td>
                        <td className="py-2.5 text-slate-600">{fmt(r.start)}</td>
                        <td className="py-2.5 text-slate-600">{fmt(r.end)}</td>
                        <td className="py-2.5">
                          <span className="inline-flex items-center gap-1.5 text-slate-700">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: st.dot }} />
                            {st.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </KickoffSlide>
          ))}
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .kickoff-slides, .kickoff-slides * { visibility: visible; }
          .kickoff-slides { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
          .kickoff-slide { page-break-after: always; box-shadow: none !important; border: none !important; }
          @page { size: landscape; margin: 12mm; }
        }
      `}</style>
    </div>
  );
}

function KickoffSlide({ children }) {
  return (
    <div className="kickoff-slide bg-white rounded-xl shadow-2xl p-10 aspect-[16/9] flex flex-col">
      {children}
    </div>
  );
}