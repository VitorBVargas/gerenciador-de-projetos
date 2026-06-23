import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, Printer, Loader2, Search } from 'lucide-react';
import { phaseLabels } from '../timeline/phaseLabels';

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

// Consolida fases por vertical (menor início / maior fim entre produtos da vertical)
function buildMacroByVertical(products, events) {
  const productById = {};
  products.forEach(p => { productById[p.id] = p; });
  const verticalMap = {};
  events.forEach(ev => {
    const product = productById[ev.product_id];
    const vertical = ev.vertical || product?.vertical;
    if (!vertical || !ev.phase) return;
    if (!verticalMap[vertical]) verticalMap[vertical] = {};
    if (!verticalMap[vertical][ev.phase]) verticalMap[vertical][ev.phase] = { start: null, end: null, statuses: [] };
    const b = verticalMap[vertical][ev.phase];
    if (ev.start_date && (!b.start || ev.start_date < b.start)) b.start = ev.start_date;
    if (ev.end_date && (!b.end || ev.end_date > b.end)) b.end = ev.end_date;
    if (ev.status) b.statuses.push(ev.status);
  });
  return Object.entries(verticalMap).map(([vertical, phases]) => {
    const rows = PHASE_ORDER.filter(ph => phases[ph]).map(ph => {
      const b = phases[ph];
      let status = 'nao_iniciado';
      if (b.statuses.includes('atrasado')) status = 'atrasado';
      else if (b.statuses.includes('em_andamento')) status = 'em_andamento';
      else if (b.statuses.length > 0 && b.statuses.every(s => s === 'concluido')) status = 'concluido';
      return { phase: ph, label: phaseLabels[ph] || ph, start: b.start, end: b.end, status };
    });
    return { vertical, rows };
  }).filter(v => v.rows.length > 0).sort((a, b) => a.vertical.localeCompare(b.vertical));
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
  while (y < ey || (y === ey && m <= em)) {
    cols.push({ y, m, label: `${MONTH_ABBR[m - 1]}/${String(y).slice(2)}` });
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

  const loading = lp || le || lt;
  const macro = useMemo(() => buildMacroByVertical(products, events), [products, events]);

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
    <div className="fixed inset-0 z-[60] bg-slate-950/95 overflow-y-auto">
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-700">
        <div className="flex items-center gap-2 text-white">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">B</div>
          <span className="font-semibold">Kick-Off — Projeto de Implantação</span>
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
        <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>
      ) : (
        <div className="kickoff-slides py-8 px-4 space-y-8 max-w-5xl mx-auto">

          {/* SLIDE 1 — Capa */}
          <Slide className="p-0 overflow-hidden relative bg-blue-600">
            <div className="absolute left-0 top-0 w-1/3 h-2/3 bg-blue-300/60 rounded-br-[120px]" />
            <div className="absolute left-10 top-1/3 bg-white rounded-2xl shadow-xl px-8 py-6 z-10">
              <h1 className="text-3xl font-bold text-slate-900">Kick-Off</h1>
              <p className="text-slate-600 mt-2">Projeto de Implantação</p>
              <p className="text-blue-700 text-sm mt-1">{mesAno}</p>
            </div>
            <div className="absolute right-12 top-1/2 -translate-y-1/4 text-right z-10">
              <p className="text-white font-extrabold italic text-6xl tracking-tight">BETHA</p>
            </div>
            <div className="absolute right-12 bottom-16 bg-blue-200/80 rounded-lg px-8 py-3 z-10">
              <p className="text-slate-900 font-bold text-lg">{project?.city || project?.name || '—'}</p>
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
          <Slide className="bg-slate-900">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">+</div>
              <span className="text-white font-semibold">Portfólio</span>
            </div>
            <h2 className="text-white font-bold text-3xl leading-tight">SOLUÇÕES COMPLETAS<br />PARA A GESTÃO PÚBLICA</h2>
            <div className="mt-6 inline-flex items-center gap-3 bg-blue-200 rounded-full px-5 py-2">
              <span className="text-slate-900 font-bold text-xl">GRP</span>
              <span className="text-slate-700 text-xs leading-tight">Government<br />Resource<br />Planning</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-8">
              {['Arrecadação', 'Atendimento', 'NoPaper', 'Saúde', 'Contratos', 'Pessoal', 'Contábil', 'Educação', 'Studio'].map(s => (
                <div key={s} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm">{s}</div>
              ))}
            </div>
          </Slide>

          {/* SLIDE 4 — Números */}
          <Slide className="bg-slate-900">
            <div className="grid grid-cols-5 gap-3 h-full content-center">
              {[
                ['47', 'sistemas', 'bg-indigo-200 text-slate-900'],
                ['06', 'aplicativos mobile', 'bg-blue-500 text-white'],
                ['+ de 800', 'municípios', 'bg-slate-800 text-white'],
                ['22', 'estados brasileiros', 'bg-indigo-200 text-slate-900'],
                ['+ de 3 mil', 'clientes', 'bg-white text-slate-900'],
                ['+ de 700', 'colaboradores', 'bg-cyan-100 text-slate-900'],
                ['39', 'anos', 'bg-white text-slate-900'],
                ['30', 'canais de atendimento', 'bg-blue-500 text-white'],
                ['+ de 44,5 milhões', 'de pessoas impactadas', 'bg-slate-800 text-white col-span-2'],
              ].map(([n, l, cls], i) => (
                <div key={i} className={`rounded-xl p-4 flex flex-col justify-center ${cls}`}>
                  <span className="font-bold text-2xl leading-tight">{n}</span>
                  <span className="text-xs mt-1 opacity-90">{l}</span>
                </div>
              ))}
            </div>
          </Slide>

          {/* SLIDE 5 — Equipe (dinâmico) */}
          <Slide className="bg-gradient-to-br from-blue-50 to-cyan-50">
            <SlideHeader title="Equipe BETHA" subtitle="Gestão de Projetos e Implantação" />
            <div className="grid grid-cols-4 gap-4 mt-8">
              <TeamColumn title="Gestão de Portfólio" person={gestaoPortfolio[0]} items={['Gestão estratégica', 'Alocação de recursos', 'Aprovações', 'Priorizações']} />
              <TeamColumn title="Gestão da Operação" person={coordTecnica[0]} items={['Gestão da operação', 'Alocação de recursos', 'Aprovações', 'Priorizações']} />
              <TeamColumn title="Gestão do Projeto" person={gestaoProjeto[0] || { name: project?.manager }} items={['Planejamento', 'Comunicação', 'Cronograma', 'Status report', 'Riscos', 'Gestão da Mudança']} />
              <TeamColumn title="Implantação" person={null} subtitle={analistas.length > 0 ? `${analistas.length} Analistas/Especialistas` : 'Analistas / Especialistas'} items={['Mapeamento', 'Diagnóstico', 'Migração', 'Configuração', 'Treinamento', 'Acompanhamento']} />
            </div>
          </Slide>

          {/* SLIDE 6 — Macro etapas */}
          <Slide className="bg-gradient-to-br from-blue-50 to-cyan-50">
            <SlideHeader title="Metodologia" subtitle="Macro etapas e atividades" />
            <div className="grid grid-cols-5 gap-2 mt-6">
              {[
                ['Iniciação / Planejamento', '1 semana', ['Planejamento', 'Backup (base + dicionário)', 'Kick-Off', 'Proposta de Cronograma', 'Documentação de Projeto'], 'bg-blue-500 text-white'],
                ['Análise Inicial e Diagnóstico Operacional', '3 semanas', ['Premissas e requisitos', 'Mapeamento assistido', 'Refinamento e controle'], 'bg-slate-600 text-white'],
                ['Configuração e Validação de Dados', '12 semanas', ['Migração de Dados em HML', 'Configuração dos sistemas', 'Validação da configuração'], 'bg-slate-600 text-white'],
                ['Início em Produção e Acompanhamento', '6 semanas', ['Migração em Produção', 'Validação', 'Treinamentos', 'Início operação', 'Estabilização'], 'bg-slate-600 text-white'],
                ['Operação Assistida', '4 semanas', ['Acompanhamento assistido', 'Aceite de Implantação', 'Passagem de Bastão', 'Serviços pós-implantação'], 'bg-slate-600 text-white'],
              ].map(([titulo, semanas, items, cls], i) => (
                <div key={i} className="flex flex-col">
                  <div className={`${cls} rounded px-2 py-3 text-center text-[11px] font-semibold min-h-[60px] flex items-center justify-center`}>{titulo}</div>
                  <div className="bg-slate-200 text-slate-700 text-[10px] text-center py-1 mt-2 rounded">{semanas}</div>
                  <ul className="mt-2 space-y-1">
                    {items.map(it => <li key={it} className="text-[9px] text-slate-600 leading-tight">- {it}</li>)}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="flex-1 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-[10px] font-semibold">Implantação</div>
              <div className="w-28 h-6 bg-blue-300 rounded flex items-center justify-center text-slate-800 text-[10px] font-semibold">Sustentação</div>
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

          {/* SLIDE 8 — Proposta de Cronograma (dinâmico, um por vertical) */}
          {macro.length === 0 ? (
            <Slide className="bg-gradient-to-br from-blue-50 to-cyan-50">
              <SlideHeader title="Proposta de Cronograma" />
              <div className="flex items-center justify-center h-3/4 text-slate-400 text-sm">Nenhuma etapa de cronograma cadastrada na plataforma.</div>
            </Slide>
          ) : macro.map(({ vertical, rows }) => {
            const cols = buildMonthColumns(rows);
            return (
              <Slide key={vertical} className="bg-gradient-to-br from-blue-50 to-cyan-50">
                <SlideHeader title="Proposta de Cronograma" subtitle={vertical} />
                <div className="mt-4 overflow-hidden">
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left p-1.5 w-44"></th>
                        <th className="w-24"></th>
                        {cols.map(c => <th key={c.label} className="bg-slate-100 border border-slate-300 px-1 py-1 text-slate-600 font-semibold">{c.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(r => (
                        <tr key={r.phase}>
                          <td className="p-1.5 font-medium text-slate-800 border-b border-slate-200">{r.label}</td>
                          <td className="p-1.5 text-slate-500 border-b border-slate-200 whitespace-nowrap">{fmtRange(r.start, r.end)}</td>
                          {cols.map(c => {
                            const colStart = `${c.y}-${String(c.m).padStart(2, '0')}-01`;
                            const colEnd = `${c.y}-${String(c.m).padStart(2, '0')}-31`;
                            const active = r.start && r.end && r.start <= colEnd && r.end >= colStart;
                            return (
                              <td key={c.label} className="border border-slate-200 h-6" style={{ background: active ? STATUS_COLOR[r.status] : 'transparent' }} />
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center gap-6 mt-4 text-[11px] text-slate-600">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: STATUS_COLOR.concluido }} /> Finalizado</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: STATUS_COLOR.em_andamento }} /> Em andamento</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: STATUS_COLOR.nao_iniciado }} /> Planejado</span>
                </div>
              </Slide>
            );
          })}

          {/* SLIDE 9 — Próximos passos */}
          <Slide className="bg-gradient-to-br from-blue-50 to-cyan-50">
            <SlideHeader title="Próximos passos" subtitle="Alinhamentos" />
            <div className="grid grid-cols-3 gap-4 mt-8">
              <NextStepCol header="FINALIZADO" headerCls="bg-green-200 text-slate-800" body="Planejamento do Projeto" items={['Entendimento de escopo', 'Documentos de planejamento e controle']} />
              <NextStepCol header="EM ANDAMENTO" headerCls="bg-blue-300 text-slate-800" body="Alinhamentos iniciais / Kick-Off" items={['Apresentação de equipes', 'Alinhamento próximos passos', 'Mapeamento de Pontos Focais', 'Coleta de Base e Dicionário de Dados']} />
              <NextStepCol header="NÃO INICIADO" headerCls="bg-slate-300 text-slate-800" body="" items={['Diagnóstico (mapeamento técnico)', 'Treinamento', 'Configuração teste', 'Liberação para utilização', 'Operação Assistida']} />
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
          body * { visibility: hidden; }
          .kickoff-slides, .kickoff-slides * { visibility: visible; }
          .kickoff-slides { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
          .kickoff-slide { page-break-after: always; box-shadow: none !important; }
          @page { size: landscape; margin: 8mm; }
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

function NextStepCol({ header, headerCls, body, items }) {
  return (
    <div className="bg-white/40 rounded-lg overflow-hidden">
      <div className={`text-center font-bold text-sm py-2 ${headerCls}`}>{header}</div>
      <div className="p-4">
        {body && <p className="font-semibold text-slate-800 text-sm mb-2">{body}</p>}
        <ul className="space-y-1.5">
          {items.map(it => <li key={it} className="text-xs text-slate-700">– {it}</li>)}
        </ul>
      </div>
    </div>
  );
}