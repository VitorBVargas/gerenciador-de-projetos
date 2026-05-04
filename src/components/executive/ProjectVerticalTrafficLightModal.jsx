import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, ExternalLink, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ExportStatusPdfModal from './ExportStatusPdfModal';

const PHASES = [
  { key: 'planejamento_contrato', label: 'Planejamento' },
  { key: 'kickoff', label: 'Kickoff' },
  { key: 'diagnostico', label: 'Diagnóstico' },
  { key: 'onboarding_cliente', label: 'Onboarding' },
  { key: 'configuracao_migracao_hml', label: 'Migração HML' },
  { key: 'homologacao_base', label: 'Homologação' },
  { key: 'migracao_prd_blackout', label: 'Migração PRD' },
  { key: 'configuracao_prd', label: 'Configuração PRD' },
  { key: 'treinamento', label: 'Treinamento' },
  { key: 'go_live', label: 'Go Live' },
  { key: 'operacao_assistida', label: 'Operação Assistida' },
  { key: 'encerramento_bastao', label: 'Encerramento' },
];

const STATUS_META = {
  nao_iniciado: { label: 'Não Iniciado', dot: 'bg-slate-100' },
  em_andamento: { label: 'Em Andamento', dot: 'bg-sky-400' },
  concluido: { label: 'Concluído', dot: 'bg-green-400' },
  atrasado: { label: 'Atrasado', dot: 'bg-rose-500' },
};

const STATUS_PRINT_COLORS = {
  nao_iniciado: '#f8fafc',
  em_andamento: '#38bdf8',
  concluido: '#4ade80',
  atrasado: '#f43f5e',
};

function normalizeStatus(status) {
  if (!status) return 'nao_iniciado';
  if (status === 'concluido') return 'concluido';
  if (status === 'em_andamento') return 'em_andamento';
  if (status === 'atrasado') return 'atrasado';
  return 'nao_iniciado';
}

function resolveProductPhaseStatus(events) {
  if (!events.length) return 'nao_iniciado';
  const statuses = events.map(event => normalizeStatus(event.status));
  if (statuses.includes('atrasado')) return 'atrasado';
  if (statuses.includes('em_andamento')) return 'em_andamento';
  if (statuses.every(status => status === 'concluido')) return 'concluido';
  return 'nao_iniciado';
}

function resolveVerticalPhase(productStatuses) {
  if (productStatuses.some(item => item.status === 'atrasado')) return 'atrasado';
  if (productStatuses.length > 0 && productStatuses.every(item => item.status === 'concluido')) return 'concluido';
  if (productStatuses.every(item => item.status === 'nao_iniciado')) return 'nao_iniciado';
  return 'em_andamento';
}

function formatVerticalName(value) {
  return (value || '').replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br />');
}

function calculateVerticalProgress(products) {
  const statuses = products.flatMap(product => product.phases.map(phase => phase.status));
  if (!statuses.length) return 0;
  const total = statuses.reduce((sum, status) => {
    if (status === 'concluido') return sum + 100;
    if (status === 'em_andamento') return sum + 50;
    return sum;
  }, 0);
  return Math.round(total / statuses.length);
}

export default function ProjectVerticalTrafficLightModal({ project, projectProgress = 0, onClose, onOpenProject }) {
  const { data: freshProducts = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['trafficLightProducts', project.id],
    queryFn: () => base44.entities.Product.filter({ project_id: project.id }),
  });

  const { data: freshTimelineEvents = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['trafficLightTimelineEvents', project.id],
    queryFn: () => base44.entities.TimelineEvent.filter({ project_id: project.id }),
  });

  const products = freshProducts;
  const timelineEvents = freshTimelineEvents;
  const isLoading = loadingProducts || loadingEvents;

  const entities = useMemo(() => {
    const names = [...new Set(products.map(product => product.entity || 'Sem entidade'))].sort();
    return names.length > 0 ? names : ['Sem entidade'];
  }, [products]);

  const [activeEntity, setActiveEntity] = useState(entities[0]);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  useEffect(() => {
    if (!entities.includes(activeEntity)) setActiveEntity(entities[0]);
  }, [entities, activeEntity]);

  const rows = useMemo(() => {
    const productsForEntity = products.filter(product => (product.entity || 'Sem entidade') === activeEntity);
    const verticals = [...new Set(productsForEntity.map(product => product.vertical || 'Sem vertical'))].sort();

    return verticals.map(vertical => {
      const verticalProducts = productsForEntity.filter(product => (product.vertical || 'Sem vertical') === vertical);
      return {
        vertical,
        products: verticalProducts.map(product => ({
          productId: product.id,
          productName: product.name,
          entity: product.entity,
          ticketNumber: product.ticket_number,
        })),
        subtitle: verticalProducts.map(product => product.name).join(', '),
        phases: PHASES.map(phase => {
          const productStatuses = verticalProducts.map(product => {
            const productEvents = timelineEvents.filter(event =>
              event.project_id === project.id &&
              event.phase === phase.key &&
              event.product_id === product.id
            );
            return {
              productId: product.id,
              productName: product.name,
              status: resolveProductPhaseStatus(productEvents),
            };
          });

          return {
            phase: phase.key,
            label: phase.label,
            status: resolveVerticalPhase(productStatuses),
            products: productStatuses,
          };
        }),
      };
    });
  }, [activeEntity, products, project.id, timelineEvents]);

  const buildRowsForEntity = (entity) => {
    const productsForEntity = products.filter(product => (product.entity || 'Sem entidade') === entity);
    const verticals = [...new Set(productsForEntity.map(product => product.vertical || 'Sem vertical'))].sort();

    return verticals.map(vertical => {
      const verticalProducts = productsForEntity.filter(product => (product.vertical || 'Sem vertical') === vertical);
      const productRows = verticalProducts.map(product => ({
        productId: product.id,
        productName: product.name,
        phases: PHASES.map(phase => {
          const productEvents = timelineEvents.filter(event =>
            event.project_id === project.id &&
            event.phase === phase.key &&
            event.product_id === product.id
          );
          return {
            phase: phase.key,
            label: phase.label,
            status: resolveProductPhaseStatus(productEvents),
          };
        }),
      }));

      return {
        vertical,
        subtitle: verticalProducts.map(product => product.name).join(', '),
        progress: calculateVerticalProgress(productRows),
        products: productRows,
      };
    });
  };

  const handlePrintPdf = (entity = activeEntity, verticalObservations = {}) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printDate = new Date().toLocaleDateString('pt-BR');
    const logoUrl = 'https://media.base44.com/images/public/69e90daf5f8bdc3687134d7e/136dc29c0_Smbolo12.png';
    const coverUrl = 'https://media.base44.com/images/public/69e90daf5f8bdc3687134d7e/4ffc934b6_Capturadetela2026-04-29103905.png';
    const printRows = buildRowsForEntity(entity);
    const entityFullName = products.find(product => (product.entity || 'Sem entidade') === entity)?.entity_full_name || entity;

    const verticalPagesHtml = printRows.map(row => {
      const observation = verticalObservations[row.vertical] || '';
      const headerHtml = `
        <div class="header">
          <img class="logo" src="${logoUrl}" />
          <div class="header-content">
            <div class="header-line">
              <h1>Status Report | Vertical ${escapeHtml(formatVerticalName(row.vertical))}</h1>
              <div class="date">${printDate}</div>
            </div>
            <div class="header-line header-line-bottom">
              <div class="entity-name">${escapeHtml(entityFullName)}</div>
              <div class="badge-row">
                <span class="status-badge">Status Geral: ${projectProgress}%</span>
                <span class="status-badge">Status: ${row.progress}%</span>
              </div>
            </div>
          </div>
        </div>
      `;

      return `
        <section class="page report-page status-page">
          ${headerHtml}
          <h2 class="section-title">Farol da vertical</h2>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  ${PHASES.map(phase => `<th>${phase.label}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${row.products.map(product => `
                  <tr>
                    <td class="vertical-cell">
                      <strong>${escapeHtml(product.productName)}</strong>
                    </td>
                    ${product.phases.map(item => `<td><span class="dot" style="background:${STATUS_PRINT_COLORS[item.status] || STATUS_PRINT_COLORS.nao_iniciado}"></span></td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="legend">
            ${Object.entries(STATUS_META).map(([key, meta]) => `<div class="legend-item"><span class="dot" style="background:${STATUS_PRINT_COLORS[key]}"></span>${meta.label}</div>`).join('')}
          </div>
          <section class="products-line">
            <strong>Produtos em implantação:</strong> ${escapeHtml(row.subtitle || 'Nenhum produto informado')}
          </section>
        </section>
        <section class="page report-page attention-page">
          ${headerHtml}
          <h2 class="section-title">Pontos de atenção</h2>
          <section class="attention">
            <p>${observation.trim() ? escapeHtml(observation) : 'Sem observações registradas para esta vertical.'}</p>
          </section>
        </section>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Status Semanal - ${escapeHtml(project.name)} - ${printDate}</title>
          <style>
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
            @page { size: A4 landscape; margin: 0; }
            body { margin: 0; font-family: Arial, sans-serif; color: #e5e7eb; background: #020617; }
            .page { width: 297mm; min-height: 210mm; page-break-after: always; overflow: visible; position: relative; }
            .cover { height: 210mm; overflow: hidden; background: #0068ff; display: flex; align-items: center; justify-content: center; }
            .cover img { width: 100%; height: 100%; object-fit: contain; display: block; }
            .cover-info { position: absolute; left: 38px; bottom: 34px; color: white; font-weight: 700; font-size: 18px; text-shadow: 0 2px 8px rgba(0,0,0,.18); }
            .report-page { padding: 18px 22px; background: #020617; }
            .header { display: flex; align-items: center; gap: 16px; margin-bottom: 18px; padding: 16px 20px; border-radius: 18px; background: #0f172a; border: 1.5px solid #334155; }
            .logo { width: 52px; height: 52px; border-radius: 14px; background: white; box-shadow: 0 12px 24px rgba(54, 91, 255, 0.18); flex-shrink: 0; }
            .header-content { flex: 1; min-width: 0; }
            .header-line { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
            .header-line-bottom { margin-top: 10px; }
            h1 { margin: 0; font-size: 24px; color: #f8fafc; font-weight: 800; }
            .date { color: #93c5fd; font-weight: 800; font-size: 14px; white-space: nowrap; }
            .entity-name { color: #cbd5e1; font-size: 15px; font-weight: 800; overflow-wrap: anywhere; }
            .badge-row { display: flex; gap: 8px; justify-content: flex-end; flex-shrink: 0; }
            .status-badge { display: inline-block; padding: 8px 12px; border: 1.5px solid #334155; border-radius: 10px; font-weight: 800; background: #0b1220; color: #93c5fd; font-size: 13px; white-space: nowrap; }
            .section-title { margin: 0 0 12px; color: #f8fafc; font-size: 22px; font-weight: 800; }
            .legend { display: flex; justify-content: flex-end; gap: 12px; width: fit-content; margin: 10px 0 12px auto; font-size: 9px; padding: 7px 10px; border-radius: 10px; background: #0f172a; border: 1.5px solid #334155; }
            .legend-item { display: flex; align-items: center; gap: 5px; color: #cbd5e1; font-weight: 800; }
            .legend .dot { width: 9px; height: 9px; border-width: 1px; }
            .table-wrap { border: 1.5px solid #334155; border-radius: 14px; overflow: hidden; background: #0f172a; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; background: #0f172a; }
            th, td { border: 1.5px solid #334155; text-align: center; vertical-align: middle; }
            th:first-child, td:first-child { border-left: 0; }
            th:last-child, td:last-child { border-right: 0; }
            thead tr:first-child th { border-top: 0; }
            tbody tr:last-child td { border-bottom: 0; }
            th { height: 48px; padding: 5px 2px; color: #cbd5e1; font-size: 10px; font-weight: 800; line-height: 1.05; background: #111827; }
            td { height: 52px; padding: 4px; background: #020617; }
            .vertical-cell { width: 110px; text-align: left; color: #e5e7eb; overflow: hidden; }
            .vertical-cell strong { display: block; color: #93c5fd; font-size: 10px; margin-bottom: 0; overflow-wrap: anywhere; }
            .dot { display: inline-block; width: 16px; height: 16px; border-radius: 999px; border: 1.5px solid #475569; }
            .products-line { margin-top: 22px; padding: 12px 16px; border: 1.5px solid #334155; border-radius: 14px; background: #0f172a; color: #e5e7eb; font-size: 14px; line-height: 1.4; }
            .products-line strong { color: #93c5fd; }
            .attention { margin-top: 0; padding: 24px 26px; border: 1.5px solid #334155; border-radius: 14px; background: #0f172a; min-height: auto; }
            .attention p { margin: 0; color: #e5e7eb; font-size: 18px; line-height: 1.65; white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; }
            @media print { .page:last-of-type { page-break-after: auto; } }
          </style>
        </head>
        <body>
          <section class="page cover">
            <img src="${coverUrl}" />
            <div class="cover-info">Status Semanal • ${escapeHtml(project.name)} • ${printDate}</div>
          </section>
          ${verticalPagesHtml}
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
    setExportModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-[96vw] max-h-[96vh] overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl" onClick={event => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-700 bg-slate-800 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-white">Farol das Verticais — {project.name}</h3>
            <p className="text-sm text-slate-400">Status real das etapas cadastradas no Cronograma do projeto.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-slate-700 bg-slate-900 px-5 py-3">
          {isLoading && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-blue-700/40 bg-blue-950/30 px-3 py-2 text-sm text-blue-300">
              <Loader2 className="h-4 w-4 animate-spin" /> Buscando status atualizado do cronograma...
            </div>
          )}
          <div className="mb-3 flex flex-wrap gap-2">
            {entities.map(entity => (
              <button
                key={entity}
                onClick={() => setActiveEntity(entity)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                  activeEntity === entity ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                )}
              >
                {entity}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 rounded-md border border-slate-700 bg-slate-800/70 py-2 text-xs text-slate-300">
            {Object.entries(STATUS_META).map(([key, meta]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={cn('h-4 w-4 rounded-full', meta.dot)} />
                {meta.label}
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-auto p-5">
          <table className="w-full min-w-[1328px] table-fixed border-separate border-spacing-0 text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-44 border border-slate-700 bg-slate-800 px-3 py-3 text-center font-bold text-slate-300">VERTICAL</th>
                {PHASES.map(phase => (
                  <th key={phase.key} className="w-24 border border-slate-700 bg-slate-800 px-2 py-3 text-center font-bold text-slate-300">
                    {phase.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={PHASES.length + 1} className="border border-slate-700 py-10 text-center text-slate-500">
                    Nenhuma vertical encontrada para esta entidade.
                  </td>
                </tr>
              ) : rows.map(row => (
                <tr key={row.vertical}>
                  <td className="sticky left-0 z-10 border border-slate-700 bg-slate-900 px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedDetail({
                        type: 'vertical',
                        vertical: row.vertical,
                        products: row.products,
                      })}
                      className="w-full rounded-md px-2 py-1 transition-colors hover:bg-slate-800"
                    >
                      <div className="font-bold text-blue-300">{formatVerticalName(row.vertical)}</div>
                      {row.subtitle && <div className="mt-1 line-clamp-2 text-[10px] leading-tight text-slate-500">{row.subtitle}</div>}
                    </button>
                  </td>
                  {row.phases.map(item => {
                    const meta = STATUS_META[item.status] || STATUS_META.nao_iniciado;
                    return (
                      <td key={`${row.vertical}-${item.phase}`} className="border border-slate-700 bg-slate-900 p-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (item.status === 'em_andamento' || item.status === 'atrasado') {
                              setSelectedDetail({
                                vertical: row.vertical,
                                phase: item.label,
                                status: item.status,
                                products: item.products.filter(product =>
                                  item.status === 'em_andamento'
                                    ? ['em_andamento', 'concluido'].includes(product.status)
                                    : product.status === item.status
                                ),
                              });
                            }
                          }}
                          className={cn(
                            'flex h-10 w-full items-center justify-center rounded-md border border-slate-700 bg-slate-800/80',
                            (item.status === 'em_andamento' || item.status === 'atrasado') && 'cursor-pointer hover:border-blue-400 hover:bg-slate-700'
                          )}
                          title={meta.label}
                        >
                          <span className={cn('h-4 w-4 rounded-full', meta.dot)} />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ExportStatusPdfModal
          open={exportModalOpen}
          entities={entities}
          defaultEntity={activeEntity}
          products={products}
          onClose={() => setExportModalOpen(false)}
          onExport={handlePrintPdf}
        />

        {selectedDetail && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedDetail(null)}>
            <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 shadow-2xl" onClick={event => event.stopPropagation()}>
              <div className="flex items-start justify-between gap-3 border-b border-slate-700 bg-slate-800 px-4 py-3">
                <div>
                  <h4 className="font-bold text-white">
                    {selectedDetail.type === 'vertical' ? 'Produtos da Vertical' : STATUS_META[selectedDetail.status]?.label}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {selectedDetail.vertical}{selectedDetail.phase ? ` • ${selectedDetail.phase}` : ''}
                  </p>
                </div>
                <button onClick={() => setSelectedDetail(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-700 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-80 overflow-auto p-4">
                <p className="mb-3 text-xs text-slate-400">
                  {selectedDetail.type === 'vertical'
                    ? 'Todos os produtos desta vertical no projeto:'
                    : `${selectedDetail.status === 'atrasado' ? 'Produtos atrasados' : 'Produtos em andamento e concluídos'} nesta etapa:`}
                </p>
                <div className="space-y-2">
                  {selectedDetail.products.map(product => (
                    <div key={product.productId} className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {selectedDetail.type !== 'vertical' && (
                          <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', STATUS_META[product.status]?.dot)} />
                        )}
                        <span className="truncate text-sm text-white">{product.productName}</span>
                      </div>
                      {selectedDetail.type === 'vertical' ? (
                        product.ticketNumber && <span className="text-[10px] font-semibold text-slate-400">{product.ticketNumber}</span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400">{STATUS_META[product.status]?.label}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-slate-700 bg-slate-800 px-5 py-4">
          <Button onClick={() => setExportModalOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Printer className="h-4 w-4" /> Exportar PDF
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>Fechar</Button>
            <Button onClick={onOpenProject} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <ExternalLink className="h-4 w-4" /> Abrir projeto
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}