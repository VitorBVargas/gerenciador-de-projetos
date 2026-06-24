import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, Printer, Loader2, Download } from 'lucide-react';
import { phaseLabels } from '../timeline/phaseLabels';
import { exportKickoffPptx } from '../documents/exportKickoffPptx';
import { exportKickoffPdf } from '../documents/exportKickoffPdf';
import { BETHA, buildContext, fmtMoney, fmtDate } from './kickoffTheme';
import { KSlide, KHeader, KBrand } from './KSlide';

const PHASE_ORDER = [
  'planejamento_contrato', 'kickoff', 'diagnostico', 'onboarding_cliente',
  'configuracao_migracao_hml', 'homologacao_base', 'migracao_prd_blackout',
  'configuracao_prd', 'treinamento', 'go_live', 'operacao_assistida', 'encerramento_bastao',
];
const MONTH_ABBR = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const STATUS_COLOR = { concluido: '#22C55E', em_andamento: '#2563EB', atrasado: '#EF4444', nao_iniciado: '#CBD5E1' };
const VERTICAL_LABELS = {
  arrecadacao: 'Arrecadação', compras: 'Compras / Contratos', contabil: 'Contábil', pessoal: 'Pessoal / Folha',
  educacao: 'Educação', iss: 'ISS', saude: 'Saúde', atendimento: 'Atendimento', plataforma: 'Plataforma',
  extensoes: 'Extensões', parceiros: 'Parceiros', outros: 'Outros',
};

function fmtShort(d) {
  if (!d) return '—';
  const [, m, day] = d.split('-');
  return m && day ? `${day}/${m}` : d;
}

function buildMacro(events) {
  const map = {};
  events.forEach(ev => {
    if (!ev.phase) return;
    if (!map[ev.phase]) map[ev.phase] = { start: null, end: null, statuses: [] };
    const b = map[ev.phase];
    if (ev.start_date && (!b.start || ev.start_date < b.start)) b.start = ev.start_date;
    if (ev.end_date && (!b.end || ev.end_date > b.end)) b.end = ev.end_date;
    if (ev.status) b.statuses.push(ev.status);
  });
  return PHASE_ORDER.filter(ph => map[ph]).map(ph => {
    const b = map[ph];
    let status = 'nao_iniciado';
    if (b.statuses.includes('atrasado')) status = 'atrasado';
    else if (b.statuses.includes('em_andamento')) status = 'em_andamento';
    else if (b.statuses.length > 0 && b.statuses.every(s => s === 'concluido')) status = 'concluido';
    return { phase: ph, label: phaseLabels[ph] || ph, start: b.start, end: b.end, status };
  });
}

function buildMonths(rows) {
  let min = null, max = null;
  rows.forEach(r => {
    if (r.start && (!min || r.start < min)) min = r.start;
    if (r.end && (!max || r.end > max)) max = r.end;
  });
  if (!min || !max) return [];
  const cols = [];
  let y = parseInt(min.slice(0, 4)), m = parseInt(min.slice(5, 7));
  const ey = parseInt(max.slice(0, 4)), em = parseInt(max.slice(5, 7));
  while ((y < ey || (y === ey && m <= em)) && cols.length < 18) {
    cols.push({ y, m, label: `${MONTH_ABBR[m - 1]}/${String(y).slice(2)}` });
    m++; if (m > 12) { m = 1; y++; }
  }
  return cols;
}

export default function KickoffDeck({ projectId, onClose }) {
  const { data: projectData = [] } = useQuery({ queryKey: ['project', projectId], queryFn: () => base44.entities.Project.filter({ id: projectId }), enabled: !!projectId });
  const project = projectData[0];
  const { data: products = [], isLoading: lp } = useQuery({ queryKey: ['products', projectId], queryFn: () => base44.entities.Product.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: events = [], isLoading: le } = useQuery({ queryKey: ['timelineEvents', projectId], queryFn: () => base44.entities.TimelineEvent.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: team = [], isLoading: lt } = useQuery({ queryKey: ['teamMembers', projectId], queryFn: () => base44.entities.TeamMember.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: stakeholders = [] } = useQuery({ queryKey: ['stakeholders', projectId], queryFn: () => base44.entities.Stakeholder.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: risks = [] } = useQuery({ queryKey: ['risks', projectId], queryFn: () => base44.entities.Risk.filter({ project_id: projectId }), enabled: !!projectId });

  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const loading = lp || le || lt;

  const ctx = useMemo(() => buildContext(project), [project]);
  const macro = useMemo(() => buildMacro(events), [events]);
  const months = useMemo(() => buildMonths(macro), [macro]);
  const todayStr = new Date().toISOString().slice(0, 10);

  const grupos = useMemo(() => {
    const g = {};
    products.forEach(p => { const v = p.vertical || 'outros'; (g[v] = g[v] || []).push(p); });
    return Object.entries(g);
  }, [products]);

  const risksAtivos = useMemo(() => risks.filter(r => !['encerrado', 'mitigado'].includes(r.status)), [risks]);

  const handlePdf = async () => { setExportingPdf(true); try { await exportKickoffPdf(`Kick-Off ${ctx.cliente}`.trim()); } finally { setExportingPdf(false); } };
  const handlePptx = async () => { setExporting(true); try { await exportKickoffPptx(`Kick-Off ${ctx.cliente}`.trim()); } finally { setExporting(false); } };

  return (
    <div className="kickoff-print-root fixed inset-0 z-[60] bg-slate-950/95 overflow-y-auto">
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-700">
        <div className="flex items-center gap-2 text-white">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">B</div>
          <span className="font-semibold">Kick-Off · {ctx.cliente}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-2" onClick={handlePdf} disabled={exportingPdf}>
            {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} {exportingPdf ? 'Gerando...' : 'Salvar PDF'}
          </Button>
          <Button size="sm" className="bg-orange-600 hover:bg-orange-700 gap-2" onClick={handlePptx} disabled={exporting}>
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Baixar PPT
          </Button>
          <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 gap-2" onClick={onClose}>
            <X className="w-4 h-4" /> Fechar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>
      ) : (
        <div className="kickoff-slides py-8 px-4 space-y-8 max-w-5xl mx-auto">

          {/* 1 — CAPA */}
          <KSlide padded={false} style={{ background: `linear-gradient(135deg, ${BETHA.blueDeep} 0%, ${BETHA.blueDark} 50%, ${BETHA.sky} 130%)` }}>
            <div className="absolute -right-24 -top-24 w-[34rem] h-[34rem] rounded-full bg-cyan-300/15 blur-3xl" />
            <div className="absolute -left-20 bottom-0 w-80 h-80 rounded-full bg-sky-400/15 blur-3xl" />
            <div className="relative z-10 h-full flex flex-col justify-center px-16">
              <span className="text-cyan-200 font-bold uppercase tracking-[0.3em] text-sm mb-4">Projeto de Implantação</span>
              <h1 className="text-white font-extrabold text-7xl tracking-tight leading-none">Kick-Off</h1>
              <div className="mt-8 h-1 w-24 bg-cyan-300 rounded-full" />
              <p className="text-white/95 text-3xl font-semibold mt-8">{ctx.cliente}</p>
              <p className="text-cyan-100/80 text-lg mt-2">{ctx.mes} de {ctx.ano}</p>
            </div>
            <p className="absolute bottom-10 right-12 text-white/90 font-extrabold italic text-4xl tracking-tight z-10">BETHA</p>
          </KSlide>

          {/* 2 — VISÃO GERAL */}
          <KSlide style={{ background: BETHA.mist }}>
            <KHeader kicker="Resumo executivo" title="Visão Geral" />
            <div className="grid grid-cols-2 gap-4 mt-9">
              {[
                ['Município / Cliente', ctx.cliente],
                ['Portfólio', ctx.portfolio],
                ['Gerente do Projeto', ctx.gerente],
                ['Coordenador Técnico', ctx.coordenador],
                ['Produtos contratados', String(products.length)],
                ['Riscos ativos', String(risksAtivos.length)],
                ['Valor de implantação', fmtMoney(project?.implementation_value)],
                ['Prazo contratual', fmtDate(project?.deadline)],
              ].map(([l, v]) => (
                <div key={l} className="bg-white rounded-2xl px-6 py-4 shadow-sm border border-blue-100/60">
                  <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">{l}</p>
                  <p className="text-xl font-bold text-slate-800 mt-1 truncate">{v}</p>
                </div>
              ))}
            </div>
            <KBrand />
          </KSlide>

          {/* 3 — A BETHA (números) */}
          <KSlide style={{ background: `linear-gradient(135deg, ${BETHA.blueDark} 0%, ${BETHA.blue} 60%, ${BETHA.sky} 130%)` }}>
            <div className="absolute -right-16 top-0 w-96 h-96 rounded-full bg-cyan-300/15 blur-3xl" />
            <KHeader kicker="Quem somos" title="A Betha em números" light />
            <div className="relative z-10 grid grid-cols-4 gap-4 mt-9">
              {[
                ['47', 'sistemas'], ['+800', 'municípios'], ['22', 'estados'], ['+3 mil', 'clientes'],
                ['+700', 'colaboradores'], ['39', 'anos'], ['30', 'canais'], ['+44,5 mi', 'pessoas impactadas'],
              ].map(([n, l]) => (
                <div key={l} className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl px-5 py-6 flex flex-col items-center text-center">
                  <span className="text-white font-extrabold text-4xl leading-none">{n}</span>
                  <span className="text-cyan-100 text-sm mt-2">{l}</span>
                </div>
              ))}
            </div>
            <KBrand light />
          </KSlide>

          {/* 4 — EQUIPE */}
          <KSlide style={{ background: BETHA.mist }}>
            <KHeader kicker="Governança" title="Equipe do Projeto" />
            <div className="grid grid-cols-3 gap-5 mt-9">
              {[
                ['Gestão de Portfólio', ctx.portfolio, ['Gestão estratégica', 'Alocação de recursos', 'Aprovações']],
                ['Gerente do Projeto', ctx.gerente, ['Planejamento', 'Comunicação', 'Cronograma', 'Riscos']],
                ['Coordenação Técnica', ctx.coordenador, ['Diagnóstico', 'Migração', 'Configuração', 'Treinamento']],
              ].map(([role, name, items]) => (
                <div key={role} className="bg-white rounded-2xl p-6 shadow-sm border border-blue-100/60 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-2xl">
                    {name && name !== '—' ? name.charAt(0).toUpperCase() : '·'}
                  </div>
                  <p className="text-xs font-bold text-blue-500 uppercase tracking-wide mt-3">{role}</p>
                  <p className="text-base font-bold text-slate-800 mt-1">{name}</p>
                  <ul className="mt-3 space-y-1">
                    {items.map(it => <li key={it} className="text-xs text-slate-500">{it}</li>)}
                  </ul>
                </div>
              ))}
            </div>
            {team.length > 0 && (
              <p className="text-center text-sm text-slate-500 mt-7">+ {team.length} especialistas alocados nas verticais do projeto</p>
            )}
            <KBrand />
          </KSlide>

          {/* 5 — PRODUTOS */}
          {products.length > 0 && (
            <KSlide style={{ background: BETHA.mist }}>
              <KHeader kicker="Escopo" title="Produtos Contratados" />
              <div className="grid grid-cols-3 gap-4 mt-9">
                {grupos.slice(0, 6).map(([v, items]) => (
                  <div key={v} className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100/60">
                    <p className="text-sm font-bold text-blue-700 border-b border-blue-50 pb-2 mb-3">{VERTICAL_LABELS[v] || v}</p>
                    <ul className="space-y-1.5">
                      {items.slice(0, 6).map((p, i) => (
                        <li key={p.id || i} className="text-xs text-slate-600 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                          <span className="truncate">{p.name}</span>
                        </li>
                      ))}
                      {items.length > 6 && <li className="text-xs text-blue-400 font-medium">+{items.length - 6} produtos</li>}
                    </ul>
                  </div>
                ))}
              </div>
              <KBrand />
            </KSlide>
          )}

          {/* 6 — METODOLOGIA */}
          <KSlide style={{ background: BETHA.mist }}>
            <KHeader kicker="Como entregamos" title="Metodologia de Implantação" />
            <div className="grid grid-cols-5 gap-3 mt-9">
              {[
                ['1', 'Planejamento', 'Kick-off, backup e documentação inicial'],
                ['2', 'Diagnóstico', 'Mapeamento assistido e requisitos'],
                ['3', 'Configuração', 'Migração em HML e parametrização'],
                ['4', 'Produção', 'Go-live, treinamentos e estabilização'],
                ['5', 'Operação Assistida', 'Acompanhamento e aceite final'],
              ].map(([n, t, d]) => (
                <div key={n} className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100/60 flex flex-col">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 text-white font-bold flex items-center justify-center">{n}</div>
                  <p className="text-sm font-bold text-slate-800 mt-3">{t}</p>
                  <p className="text-xs text-slate-500 mt-1.5 leading-snug">{d}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-8">
              <div className="flex-1 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">Implantação</div>
              <div className="w-40 h-9 rounded-lg bg-cyan-300 flex items-center justify-center text-blue-900 text-sm font-semibold">Sustentação</div>
            </div>
            <KBrand />
          </KSlide>

          {/* 7 — CRONOGRAMA */}
          <KSlide style={{ background: BETHA.mist }}>
            <KHeader kicker="Planejamento" title="Proposta de Cronograma" />
            {macro.length === 0 ? (
              <div className="flex items-center justify-center flex-1 text-slate-400 text-sm mt-8">Nenhuma etapa de cronograma cadastrada.</div>
            ) : (
              <>
                <div className="mt-7 overflow-hidden">
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr>
                        <th className="w-48 text-left text-slate-400 font-bold pb-2"></th>
                        {months.map(c => <th key={c.label} className="text-slate-500 font-bold text-center pb-2 text-[10px]">{c.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {macro.slice(0, 9).map(r => (
                        <tr key={r.phase}>
                          <td className="py-1 pr-3 font-semibold text-slate-700 truncate max-w-[12rem]">{r.label}</td>
                          {months.map(c => {
                            const cs = `${c.y}-${String(c.m).padStart(2, '0')}-01`;
                            const ce = `${c.y}-${String(c.m).padStart(2, '0')}-31`;
                            const active = r.start && r.end && r.start <= ce && r.end >= cs;
                            const today = todayStr >= cs && todayStr <= ce;
                            return (
                              <td key={c.label} className="px-0.5 py-1">
                                <div className="h-4 rounded-full relative" style={{ background: active ? STATUS_COLOR[r.status] : '#E2E8F0' }}>
                                  {today && <span className="absolute -top-1 left-1/2 w-0.5 h-6 bg-red-500" />}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-center gap-8 mt-6 text-xs text-slate-600">
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: STATUS_COLOR.concluido }} /> Concluído</span>
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: STATUS_COLOR.em_andamento }} /> Em andamento</span>
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: STATUS_COLOR.nao_iniciado }} /> Planejado</span>
                </div>
              </>
            )}
            <KBrand />
          </KSlide>

          {/* 8 — RISCOS */}
          {risksAtivos.length > 0 && (
            <KSlide style={{ background: BETHA.mist }}>
              <KHeader kicker="Gestão" title="Riscos do Projeto" />
              <div className="mt-8 space-y-3">
                {risksAtivos.slice(0, 5).map((r, i) => (
                  <div key={r.id || i} className="bg-white rounded-2xl px-6 py-3.5 shadow-sm border border-blue-100/60 flex items-center gap-5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{r.title}</p>
                      {r.mitigation && <p className="text-xs text-slate-500 mt-0.5 truncate">{r.mitigation}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {[['P', r.probability], ['I', r.impact]].map(([k, val]) => (
                        <span key={k} className="text-xs font-bold text-white rounded-lg w-8 h-8 flex items-center justify-center"
                          style={{ background: val >= 4 ? '#EF4444' : val >= 3 ? '#F59E0B' : '#22C55E' }}>{val || '—'}</span>
                      ))}
                      <span className="text-xs text-slate-500 w-28 truncate text-right">{r.responsavel || r.suggested_owner || '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
              <KBrand />
            </KSlide>
          )}

          {/* 9 — COMUNICAÇÃO */}
          <KSlide style={{ background: BETHA.mist }}>
            <KHeader kicker="Alinhamento" title="Comunicação e Contatos" />
            <div className="grid grid-cols-3 gap-5 mt-9">
              {[
                ['Betha', [ctx.gerente, ctx.coordenador].filter(v => v && v !== '—'), 'from-blue-500 to-blue-600'],
                ['Especialistas', team.slice(0, 4).map(m => m.name).filter(Boolean), 'from-sky-500 to-cyan-500'],
                ['Cliente', stakeholders.slice(0, 4).map(s => s.name).filter(Boolean), 'from-indigo-500 to-blue-600'],
              ].map(([title, people, cls]) => (
                <div key={title} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-blue-100/60">
                  <div className={`bg-gradient-to-r ${cls} text-white text-center text-sm font-bold py-3`}>{title}</div>
                  <div className="p-5 space-y-3 min-h-[8rem]">
                    {people.length > 0 ? people.map((p, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-bold text-sm flex items-center justify-center flex-shrink-0">{p.charAt(0).toUpperCase()}</div>
                        <span className="text-sm text-slate-700 truncate">{p}</span>
                      </div>
                    )) : <p className="text-sm text-slate-300 text-center pt-4">A definir</p>}
                  </div>
                </div>
              ))}
            </div>
            <KBrand />
          </KSlide>

          {/* 10 — OBRIGADO */}
          <KSlide padded={false} style={{ background: `linear-gradient(135deg, ${BETHA.blue} 0%, ${BETHA.cyan} 130%)` }}>
            <div className="h-full flex flex-col items-center justify-center gap-6">
              <p className="text-white font-extrabold text-5xl tracking-tight">Obrigado!</p>
              <p className="text-white/90 text-lg">Vamos construir juntos a transformação de <span className="font-bold">{ctx.cliente}</span></p>
              <span className="inline-flex items-center gap-2 bg-white/90 rounded-full px-5 py-2 mt-2">
                <span className="text-blue-700 font-bold text-sm">betha.com.br</span>
              </span>
              <p className="text-white font-extrabold italic text-4xl tracking-tight mt-2">BETHA</p>
            </div>
          </KSlide>
        </div>
      )}

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; height: auto !important; overflow: visible !important; }
          body * { visibility: hidden; }
          .kickoff-slides, .kickoff-slides * { visibility: visible !important; }
          #root, .kickoff-print-root, .kickoff-print-root * { position: static !important; inset: auto !important; transform: none !important; }
          .kickoff-print-root { overflow: visible !important; height: auto !important; background: #fff !important; padding: 0 !important; margin: 0 !important; }
          .kickoff-print-root > .print\\:hidden { display: none !important; }
          .kickoff-slides { margin: 0 !important; padding: 0 !important; display: block !important; max-width: none !important; width: auto !important; gap: 0 !important; }
          .kickoff-slide { break-inside: avoid; page-break-inside: avoid; break-after: page; page-break-after: always; box-shadow: none !important; border-radius: 0 !important; margin: 0 !important; width: 297mm !important; height: 208mm !important; aspect-ratio: auto !important; overflow: hidden !important; }
          .kickoff-slide:last-child { break-after: auto; page-break-after: auto; }
          .kickoff-slides > * { margin-top: 0 !important; margin-bottom: 0 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}