import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, Printer, Loader2, Search, Download } from 'lucide-react';
import { phaseLabels } from '../timeline/phaseLabels';
import KickoffTeamSlides from './KickoffTeamSlides';
import { exportKickoffPptx } from './exportKickoffPptx';

// Ordem canônica das fases (mesma do cronograma)
const PHASE_ORDER = [
  'planejamento_contrato', 'kickoff', 'diagnostico', 'onboarding_cliente',
  'configuracao_migracao_hml', 'homologacao_base', 'migracao_prd_blackout',
  'configuracao_prd', 'treinamento', 'go_live', 'operacao_assistida', 'encerramento_bastao',
];

const MONTH_ABBR = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

function fmtShort(d) {
  if (!d) return '—';
  const [, m, day] = d.split('-');
  if (!m || !day) return d;
  return `${day}/${m}`;
}
function fmtRange(s, e) {
  if (!s && !e) return '—';
  return `${fmtShort(s)} - ${fmtShort(e)}`;
}

// Consolida fases em UMA tabela (menor início / maior fim entre TODOS os produtos)
function buildMacroConsolidated(events) {
  const phaseMap = {};
  events.forEach(ev => {
    if (!ev.phase) return;
    if (!phaseMap[ev.phase]) phaseMap[ev.phase] = { start: null, end: null, statuses: [] };
    const b = phaseMap[ev.phase];
    if (ev.start_date && (!b.start || ev.start_date < b.start)) b.start = ev.start_date;
    if (ev.end_date && (!b.end || ev.end_date > b.end)) b.end = ev.end_date;
    if (ev.status) b.statuses.push(ev.status);
  });
  return PHASE_ORDER.filter(ph => phaseMap[ph]).map(ph => {
    const b = phaseMap[ph];
    let status = 'nao_iniciado';
    if (b.statuses.includes('atrasado')) status = 'atrasado';
    else if (b.statuses.includes('em_andamento')) status = 'em_andamento';
    else if (b.statuses.length > 0 && b.statuses.every(s => s === 'concluido')) status = 'concluido';
    return { phase: ph, label: phaseLabels[ph] || ph, start: b.start, end: b.end, status };
  });
}

// Calcula colunas de meses entre a primeira e última data
function buildMonthColumns(rows) {
  let min = null, max = null;
  rows.forEach(r => {
    if (r.start && (!min || r.start < min)) min = r.start;
    if (r.end && (!max || r.end > max)) max = r.end;
  });
  if (!min || !max) return [];
  const cols = [];
  let [y, m] = [parseInt(min.slice(0, 4)), parseInt(min.slice(5, 7))];
  const [ey, em] = [parseInt(max.slice(0, 4)), parseInt(max.slice(5, 7))];
  const minDay = parseInt(min.slice(8, 10));
  const maxDay = parseInt(max.slice(8, 10));
  while (y < ey || (y === ey && m <= em)) {
    const isFirst = cols.length === 0;
    const isLast = y === ey && m === em;
    const lastDay = new Date(y, m, 0).getDate();
    const startDay = isFirst ? minDay : 1;
    const endDay = isLast ? maxDay : lastDay;
    cols.push({ y, m, label: `${MONTH_ABBR[m - 1]}/${String(y).slice(2)}`, range: `${String(startDay).padStart(2, '0')} A ${String(endDay).padStart(2, '0')}` });
    m++; if (m > 12) { m = 1; y++; }
    if (cols.length > 24) break;
  }
  return cols;
}

const STATUS_COLOR = { concluido: '#86efac', em_andamento: '#3b82f6', atrasado: '#ef4444', nao_iniciado: '#cbd5e1' };

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
  const { data: team = [], isLoading: lt } = useQuery({
    queryKey: ['teamMembers', projectId],
    queryFn: () => base44.entities.TeamMember.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const [exporting, setExporting] = useState(false);
  const loading = lp || le || lt;

  const handleExportPptx = async () => {
    setExporting(true);
    try {
      await exportKickoffPptx(`Kick-Off ${project?.city || project?.name || ''}`.trim());
    } finally {
      setExporting(false);
    }
  };
  const macro = useMemo(() => buildMacroConsolidated(events), [events]);
  const monthCols = useMemo(() => buildMonthColumns(macro), [macro]);
  const todayStr = new Date().toISOString().slice(0, 10);

  // Equipe agrupada por papel de gestão (Portfólio / Operação / Projeto / Implantação)
  const gestaoPortfolio = team.filter(m => m.vertical === 'gestao_operacoes' || m.role?.toLowerCase().includes('portf')).slice(0, 1);
  const gestaoProjeto = team.filter(m => m.vertical === 'gestao_projetos' || m.role?.toLowerCase().includes('projeto')).slice(0, 1);
  const coordTecnica = team.filter(m => m.vertical === 'coordenacao_tecnica' || m.role?.toLowerCase().includes('coorden')).slice(0, 1);
  const analistas = team.filter(m => !['gestao_operacoes', 'gestao_projetos', 'coordenacao_tecnica'].includes(m.vertical));

  const mesAno = useMemo(() => {
    const d = new Date();
    return `${MONTH_ABBR[d.getMonth()].charAt(0) + MONTH_ABBR[d.getMonth()].slice(1).toLowerCase()}/${d.getFullYear()}`;
  }, []);

  return (
    <div className="kickoff-print-root fixed inset-0 z-[60] bg-slate-950/95 overflow-y-auto">
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-700">
        <div className="flex items-center gap-2 text-white">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">B</div>
          <span className="font-semibold">Kick-Off — Projeto de Implantação</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-2" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
          </Button>
          <Button size="sm" className="bg-orange-600 hover:bg-orange-700 gap-2" onClick={handleExportPptx} disabled={exporting}>
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

          {/* SLIDE 1 — Capa */}
          <Slide className="p-0 overflow-hidden relative bg-blue-600">
            <div className="absolute left-0 top-0 w-[18%] h-[72%] bg-blue-300/70 rounded-br-[100px]" />
            <div className="absolute left-0 bottom-12 w-[14%] h-[14%] bg-white rounded-r-2xl" />
            <div className="absolute left-[14%] top-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl px-10 py-8 z-10">
              <h1 className="text-4xl font-bold text-slate-900">Kick-Off</h1>
              <p className="text-slate-700 text-lg mt-4">Projeto de Implantação</p>
              <p className="text-blue-700 text-sm mt-3">{mesAno}</p>
            </div>
            <div className="absolute right-[8%] top-1/2 -translate-y-[140%] z-10">
              <p className="text-white font-extrabold italic text-7xl tracking-tight">BETHA</p>
            </div>
            <div className="absolute right-0 bottom-12 w-[55%] bg-blue-200/90 rounded-l-2xl px-10 py-4 z-10">
              <p className="text-slate-900 font-bold text-2xl">{project?.city || project?.name || '—'}</p>
            </div>
          </Slide>

          {/* SLIDE 2 — Agenda */}
          <Slide className="bg-gradient-to-br from-blue-50 to-cyan-50">
            <SlideHeader title="Introdução" subtitle="Agenda" />
            <div className="border-l-4 border-blue-600 pl-6 mt-8 space-y-4">
              {['Betha', 'Equipe', 'Macro etapas', 'Proposta de Cronograma', 'Próximos passos'].map((t, i) => (
                <p key={t} className="text-slate-800 font-semibold text-lg"><span className="text-slate-400 mr-3">{i + 1}.</span>{t}</p>
              ))}
            </div>
          </Slide>

          {/* SLIDE 3 — Portfólio */}
          <Slide className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 45%, #1e40af 100%)' }}>
            <div className="absolute -right-24 -top-16 w-[28rem] h-[28rem] rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="absolute -left-20 -bottom-16 w-80 h-80 rounded-full bg-sky-400/20 blur-3xl" />
            <div className="relative z-10 flex flex-col h-full justify-center">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-lg">+</div>
                <span className="text-white/90 font-semibold text-lg">Portfólio</span>
              </div>
              <h2 className="text-white font-extrabold text-4xl leading-tight tracking-tight">SOLUÇÕES COMPLETAS<br /><span className="text-cyan-200">PARA A GESTÃO PÚBLICA</span></h2>
              <div className="mt-7 inline-flex items-center gap-4 bg-white/95 rounded-full px-7 py-3 self-start shadow-xl">
                <span className="text-blue-700 font-extrabold text-3xl">GRP</span>
                <span className="w-px h-10 bg-blue-200" />
                <span className="text-blue-600 text-sm leading-tight">Government<br />Resource<br />Planning</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-9">
                {['Arrecadação', 'Atendimento', 'NoPaper', 'Saúde', 'Contratos', 'Pessoal', 'Contábil', 'Educação', 'Studio'].map(s => (
                  <div key={s} className="bg-white/15 backdrop-blur border border-white/20 rounded-full px-5 py-2.5 text-white text-sm font-medium text-center hover:bg-white/25 transition-colors">{s}</div>
                ))}
              </div>
            </div>
          </Slide>

          {/* SLIDE 4 — Números */}
          <Slide className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #0ea5e9 100%)' }}>
            <div className="absolute -right-16 top-0 w-96 h-96 rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="absolute -left-16 bottom-0 w-80 h-80 rounded-full bg-sky-400/20 blur-3xl" />
            <div className="relative z-10 grid grid-cols-5 gap-3.5 h-full content-center">
              {[
                ['47', 'sistemas', 'bg-white text-blue-700'],
                ['06', 'aplicativos mobile', 'bg-cyan-300/90 text-blue-900'],
                ['+ de 800', 'municípios', 'bg-white/15 backdrop-blur border border-white/25 text-white'],
                ['22', 'estados brasileiros', 'bg-white text-blue-700'],
                ['+ de 3 mil', 'clientes', 'bg-cyan-300/90 text-blue-900'],
                ['+ de 700', 'colaboradores', 'bg-white/15 backdrop-blur border border-white/25 text-white'],
                ['39', 'anos', 'bg-white text-blue-700'],
                ['30', 'canais de atendimento', 'bg-cyan-300/90 text-blue-900'],
                ['+ de 44,5 milhões', 'de pessoas impactadas', 'bg-white text-blue-700 col-span-2'],
              ].map(([n, l, cls], i) => (
                <div key={i} className={`rounded-3xl p-5 flex flex-col justify-center shadow-lg ${cls}`}>
                  <span className="font-extrabold text-3xl leading-none">{n}</span>
                  <span className="text-xs mt-1.5 font-medium opacity-90">{l}</span>
                </div>
              ))}
            </div>
          </Slide>

          {/* SLIDE 5 — Equipe (dinâmico) */}
          <Slide className="bg-gradient-to-br from-blue-50 to-cyan-50">
            <SlideHeader title="Equipe BETHA" subtitle="Gestão de Projetos e Implantação" />
            <div className="grid grid-cols-4 gap-4 mt-8">
              <TeamColumn title="Gestão de Portfólio" person={project?.portfolio_manager ? { name: project.portfolio_manager } : gestaoPortfolio[0]} items={['Gestão estratégica', 'Alocação de recursos', 'Aprovações', 'Priorizações']} />
              <TeamColumn title="Gestão da Operação" person={project?.coordinator ? { name: project.coordinator } : coordTecnica[0]} items={['Gestão da operação', 'Alocação de recursos', 'Aprovações', 'Priorizações']} />
              <TeamColumn title="Gestão do Projeto" person={gestaoProjeto[0] || { name: project?.manager }} items={['Planejamento', 'Comunicação', 'Cronograma', 'Status report', 'Riscos', 'Gestão da Mudança']} />
              <TeamColumn title="Implantação" person={null} subtitle={analistas.length > 0 ? `${analistas.length} Analistas/Especialistas` : 'Analistas / Especialistas'} items={['Mapeamento', 'Diagnóstico', 'Migração', 'Configuração', 'Treinamento', 'Acompanhamento']} />
            </div>
          </Slide>

          {/* SLIDES TÉCNICOS — gerados por vertical a partir da aba Equipe */}
          <KickoffTeamSlides
            team={team}
            products={products}
            gestao={[project?.coordinator, project?.manager].filter(Boolean)}
            Slide={Slide}
            SlideHeader={SlideHeader}
          />

          {/* SLIDE 6 — Macro etapas */}
          <Slide className="bg-gradient-to-br from-blue-50 to-cyan-50">
            <SlideHeader title="Metodologia" subtitle="Macro etapas e atividades" />
            <div className="grid grid-cols-5 gap-3 mt-8 flex-1">
              {[
                ['Iniciação / Planejamento', '1 semana', ['Planejamento', 'Backup (base + dicionário)', 'Kick-Off', 'Proposta de Cronograma', 'Documentação de Projeto'], 'bg-blue-500 text-white'],
                ['Análise Inicial e Diagnóstico Operacional', '3 semanas', ['Premissas e requisitos', 'Mapeamento assistido', 'Refinamento e controle'], 'bg-slate-600 text-white'],
                ['Configuração e Validação de Dados', '12 semanas', ['Migração de Dados em HML', 'Configuração dos sistemas', 'Validação da configuração'], 'bg-slate-600 text-white'],
                ['Início em Produção e Acompanhamento', '6 semanas', ['Migração em Produção', 'Validação', 'Treinamentos', 'Início operação', 'Estabilização'], 'bg-slate-600 text-white'],
                ['Operação Assistida', '4 semanas', ['Acompanhamento assistido', 'Aceite de Implantação', 'Passagem de Bastão', 'Serviços pós-implantação'], 'bg-slate-600 text-white'],
              ].map(([titulo, semanas, items, cls], i) => (
                <div key={i} className="flex flex-col">
                  <div className={`${cls} px-4 py-6 text-center text-sm font-semibold min-h-[92px] flex items-center justify-center leading-snug`}
                    style={{ clipPath: 'polygon(0 0, 88% 0, 100% 50%, 88% 100%, 0 100%, 12% 50%)' }}>{titulo}</div>
                  <div className="bg-slate-200 text-slate-700 text-xs font-medium text-center py-1.5 mt-4 mx-auto px-4 rounded-full">{semanas}</div>
                  <ul className="mt-4 space-y-1.5">
                    {items.map(it => <li key={it} className="text-[11px] text-slate-600 leading-snug flex items-start gap-1.5"><span className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />{it}</li>)}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex-1 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-semibold">Implantação</div>
              <div className="w-36 h-8 bg-blue-300 rounded-lg flex items-center justify-center text-slate-800 text-xs font-semibold">Sustentação</div>
            </div>
          </Slide>

          {/* SLIDE 7 — Artefatos */}
          <Slide className="bg-gradient-to-br from-blue-50 to-cyan-50">
            <SlideHeader title="Artefatos" subtitle="Documentações de projeto" />
            <p className="text-xs text-slate-500 mt-4">Todos os documentos abaixo deverão ser validados e assinados para fins de governança do projeto</p>
            <ul className="mt-5 space-y-2.5 border-l-2 border-blue-400 pl-5">
              {[
                ['Responsáveis (contatos)', 'Lista de identificação dos responsáveis e pessoas envolvidas no projeto'],
                ['Diagnóstico Operacional', 'Análise detalhada dos processos e do ambiente operacional'],
                ['Mapa de Relatórios', 'Inventário de todos os relatórios que devem ser gerados pelo sistema'],
                ['Escopo de Migração', 'Documento com informações sobre dados que serão migrados para produção'],
                ['Plano e Controle de Treinamento', 'Atividades de capacitação dos usuários'],
                ['Relatório Operacional', 'Relatório de execução semanal'],
                ['Termo de Cobrança Mensal', 'Documento para formalizar a solicitação de faturamento'],
                ['Termo de Aceite', 'Instrumento formal para confirmar o término da implantação do sistema'],
                ['Serviços pós-implantação', 'Serviços e customizações solicitadas após a implantação'],
              ].map(([t, d]) => (
                <li key={t} className="text-sm text-slate-700"><span className="font-semibold text-slate-900">{t}</span> - {d}</li>
              ))}
            </ul>
          </Slide>

          {/* SLIDE 8 — Proposta de Cronograma (tabela consolidada) */}
          <Slide className="bg-gradient-to-br from-blue-50 to-cyan-50">
            <SlideHeader title="Proposta de Cronograma" />
            {macro.length === 0 ? (
              <div className="flex items-center justify-center flex-1 text-slate-400 text-sm">Nenhuma etapa de cronograma cadastrada na plataforma.</div>
            ) : (
              <>
                <div className="mt-5 flex-1 flex items-start">
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr>
                        <th className="w-44 border-b border-slate-200"></th>
                        <th className="w-28 border-b border-slate-200"></th>
                        {monthCols.map(c => <th key={c.label} className="bg-slate-50 border border-slate-300 px-1 py-1.5 text-slate-600 font-bold text-center">{c.label}</th>)}
                      </tr>
                      <tr>
                        <th className="border-b border-slate-200"></th>
                        <th className="border-b border-slate-200"></th>
                        {monthCols.map(c => <th key={c.label} className="bg-slate-50 border border-slate-300 px-1 py-1 text-slate-400 font-medium text-center text-[9px]">{c.range}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {macro.map(r => (
                        <tr key={r.phase}>
                          <td className="p-2 font-semibold text-slate-800 bg-slate-50/50 border border-slate-200">{r.label}</td>
                          <td className="p-2 text-slate-600 font-medium bg-slate-50/50 border border-slate-200 whitespace-nowrap text-center">{fmtRange(r.start, r.end)}</td>
                          {monthCols.map(c => {
                            const colStart = `${c.y}-${String(c.m).padStart(2, '0')}-01`;
                            const colEnd = `${c.y}-${String(c.m).padStart(2, '0')}-31`;
                            const active = r.start && r.end && r.start <= colEnd && r.end >= colStart;
                            const showToday = todayStr >= colStart && todayStr <= colEnd;
                            return (
                              <td key={c.label} className="border border-slate-200 h-7 relative" style={{ background: active ? STATUS_COLOR[r.status] : 'transparent' }}>
                                {showToday && <span className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-red-500" />}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-center gap-10 mt-4 text-[12px] text-slate-600">
                  <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-full" style={{ background: STATUS_COLOR.concluido }} /> Finalizado</span>
                  <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-full" style={{ background: STATUS_COLOR.em_andamento }} /> Em andamento</span>
                  <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-full" style={{ background: STATUS_COLOR.nao_iniciado }} /> Planejado</span>
                </div>
              </>
            )}
          </Slide>

          {/* SLIDE 9 — Próximos passos */}
          <Slide className="bg-gradient-to-br from-blue-50 to-cyan-50">
            <SlideHeader title="Próximos passos" subtitle="Alinhamentos" />
            <div className="grid grid-cols-3 gap-5 mt-8 flex-1">
              <NextStepCol header="FINALIZADO" headerCls="bg-teal-300/70 text-slate-700" bodyCls="bg-teal-100/50" sections={[{ title: 'Planejamento do Projeto', items: ['Entendimento de escopo', 'Documentos de planejamento e controle'] }]} />
              <NextStepCol header="EM ANDAMENTO" headerCls="bg-blue-400/80 text-slate-800" bodyCls="bg-blue-200/50" sections={[{ title: 'Alinhamentos iniciais / Kick-Off', items: ['Apresentação de equipes', 'Alinhamento próximos passos'] }, { title: 'Documentos', items: ['Mapeamento de Pontos Focais', 'Coleta de Base e Dicionário de Dados'] }]} />
              <NextStepCol header="NÃO INICIADO" headerCls="bg-slate-400/70 text-slate-800" bodyCls="bg-slate-200/60" boldItems sections={[{ title: '', items: ['Diagnóstico (mapeamento técnico)', 'Treinamento', 'Configuração teste', 'Liberação para utilização', 'Operação Assistida'] }]} />
            </div>
          </Slide>

          {/* SLIDE 10 — Obrigado */}
          <Slide className="bg-gradient-to-br from-blue-500 to-cyan-200 relative">
            <div className="flex flex-col items-center justify-center h-full gap-8">
              <div className="flex items-center gap-3">
                <span className="text-slate-900 font-bold text-2xl">Obrigado</span>
                <span className="inline-flex items-center gap-2 border-2 border-blue-600 rounded-full px-4 py-1.5 bg-white/70">
                  <Search className="w-4 h-4 text-blue-600" /> <span className="text-blue-700 text-sm">betha.com.br</span>
                </span>
              </div>
              <p className="text-blue-700 font-extrabold italic text-4xl tracking-tight">BETHA</p>
            </div>
          </Slide>
        </div>
      )}

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          html, body {
            margin: 0 !important; padding: 0 !important; background: #fff !important;
            height: auto !important; width: auto !important; overflow: visible !important;
          }
          /* Hide everything, then reveal only the slides container */
          body * { visibility: hidden; }
          .kickoff-slides, .kickoff-slides * { visibility: visible !important; }
          /* Collapse EVERY ancestor of the slides so nothing reserves blank pages/space */
          #root, .kickoff-print-root, .kickoff-print-root * {
            position: static !important; inset: auto !important; transform: none !important;
          }
          .kickoff-print-root {
            overflow: visible !important; height: auto !important; min-height: 0 !important;
            background: #fff !important; padding: 0 !important; margin: 0 !important;
          }
          /* Hide the toolbar entirely (it sits above slide 1 and pushes blank pages) */
          .kickoff-print-root > .print\\:hidden { display: none !important; }
          .kickoff-slides {
            margin: 0 !important; padding: 0 !important;
            display: block !important; max-width: none !important; width: auto !important;
            gap: 0 !important; overflow: visible !important;
          }
          .kickoff-slide {
            break-inside: avoid; page-break-inside: avoid;
            break-after: page; page-break-after: always;
            box-shadow: none !important; border-radius: 0 !important;
            margin: 0 !important;
            width: 297mm !important;
            height: 208mm !important;
            aspect-ratio: auto !important;
            overflow: hidden !important;
          }
          .kickoff-slide:last-child { break-after: auto; page-break-after: auto; }
          /* Zera margens entre slides (space-y) que criariam páginas/linhas em branco */
          .kickoff-slides > * { margin-top: 0 !important; margin-bottom: 0 !important; }
          /* Preserva cores de fundo e gradientes no PDF */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}

function Slide({ children, className = '' }) {
  return (
    <div className={`kickoff-slide rounded-xl shadow-2xl p-10 aspect-[16/9] flex flex-col overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function SlideHeader({ title, subtitle }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">B</div>
      <h2 className="text-2xl font-bold text-blue-700">{title}{subtitle && <span className="text-slate-500 font-normal"> – {subtitle}</span>}</h2>
    </div>
  );
}

function TeamColumn({ title, person, subtitle, items }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-14 h-14 rounded-full bg-slate-300 flex items-center justify-center text-slate-500 font-bold text-lg mb-2">
        {person?.name ? person.name.charAt(0).toUpperCase() : '👤'}
      </div>
      <p className="text-center text-xs font-semibold text-slate-800 min-h-[32px]">{person?.name || subtitle || '—'}</p>
      <div className="bg-slate-100 border border-slate-200 rounded mt-2 w-full px-2 py-1.5">
        <p className="text-[11px] font-bold text-slate-700 text-center">{title}</p>
      </div>
      <ul className="mt-2 space-y-1 self-start pl-1">
        {items.map(it => <li key={it} className="text-[10px] text-slate-600">• {it}</li>)}
      </ul>
    </div>
  );
}

function NextStepCol({ header, headerCls, bodyCls, sections, boldItems }) {
  return (
    <div className="rounded-lg overflow-hidden flex flex-col">
      <div className={`text-center font-bold text-sm py-3 ${headerCls}`}>{header}</div>
      <div className={`p-4 flex-1 space-y-3 ${bodyCls}`}>
        {sections.map((s, i) => (
          <div key={i}>
            {s.title && <p className="font-bold text-slate-800 text-sm mb-1.5">{s.title}</p>}
            <ul className="space-y-1">
              {s.items.map(it => <li key={it} className={`text-xs text-slate-700 ${boldItems ? 'font-semibold' : ''}`}>– {it}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}