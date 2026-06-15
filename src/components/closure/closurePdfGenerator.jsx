import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  extractCityFromProjectName,
  classifyHealthScore,
  calculateISI,
  generateAutoConclusion,
  PORTFOLIO_LABELS,
  formatCurrencyBR,
  formatDateBR,
  diffInDays
} from './closureUtils';
import { calculateHealthScore } from '@/components/dashboard/ProjectHealthScore';
import {
  calculateAccountHealth,
  calculateIRC,
  calculateRenewalProbability,
  generatePostProjectRecommendations
} from './accountHealthCalculations';
import {
  renderAccountHealthSection,
  renderIRCSection,
  renderRenewalSection,
  renderPostProjectViewSection,
  renderRecommendationsSection,
  renderConsolidatedConclusionSection
} from './accountHealthSections';

// Paleta dark mode corporativa
const COLORS = {
  bg: [15, 23, 42],          // slate-900
  bgCard: [30, 41, 59],      // slate-800
  bgAlt: [51, 65, 85],       // slate-700
  text: [241, 245, 249],     // slate-100
  textMuted: [148, 163, 184],// slate-400
  textDim: [100, 116, 139],  // slate-500
  border: [51, 65, 85],
  primary: [96, 165, 250],   // blue-400
  success: [52, 211, 153],   // emerald-400
  warning: [251, 191, 36],   // amber-400
  danger: [248, 113, 113],   // red-400
  indigo: [129, 140, 248]    // indigo-400
};

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 15;

function colorByDeviation(days) {
  if (days <= 5) return COLORS.success;
  if (days <= 15) return COLORS.warning;
  return COLORS.danger;
}

function fillBackground(doc) {
  doc.setFillColor(...COLORS.bg);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
}

function drawHeader(doc, projectName, pageNumber) {
  doc.setFillColor(...COLORS.bgCard);
  doc.rect(0, 0, PAGE_W, 12, 'F');
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(8);
  doc.text('Relatório Executivo de Encerramento', MARGIN, 7.5);
  doc.text(projectName.substring(0, 60), PAGE_W / 2, 7.5, { align: 'center' });
  doc.text(`Pág. ${pageNumber}`, PAGE_W - MARGIN, 7.5, { align: 'right' });
}

function drawFooter(doc) {
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, PAGE_H - 10, PAGE_W - MARGIN, PAGE_H - 10);
  doc.setTextColor(...COLORS.textDim);
  doc.setFontSize(7);
  doc.text('Documento confidencial — uso interno (PMO / Diretoria / CS)', MARGIN, PAGE_H - 6);
  doc.text(`Emitido em ${formatDateBR(new Date())}`, PAGE_W - MARGIN, PAGE_H - 6, { align: 'right' });
}

let pageCounter = 1;

function newPage(doc, projectName) {
  doc.addPage();
  pageCounter++;
  fillBackground(doc);
  drawHeader(doc, projectName, pageCounter);
  drawFooter(doc);
}

function sectionTitle(doc, title, y) {
  doc.setFillColor(...COLORS.primary);
  doc.rect(MARGIN, y, 1.5, 8, 'F');
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text(title, MARGIN + 4, y + 6);
  doc.setFont(undefined, 'normal');
  return y + 12;
}

function kpiCard(doc, x, y, w, h, label, value, valueColor = COLORS.text) {
  doc.setFillColor(...COLORS.bgCard);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, 'F');
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, 'S');
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(7);
  doc.text(label, x + 3, y + 5);
  doc.setTextColor(...valueColor);
  doc.setFontSize(13);
  doc.setFont(undefined, 'bold');
  doc.text(String(value), x + 3, y + h - 3);
  doc.setFont(undefined, 'normal');
}

function ensureSpace(doc, currentY, neededHeight, projectName) {
  if (currentY + neededHeight > PAGE_H - 15) {
    newPage(doc, projectName);
    return 20;
  }
  return currentY;
}

function autoTable(doc, head, body, startY) {
  doc.autoTable({
    startY,
    head: [head],
    body,
    theme: 'plain',
    styles: {
      fillColor: COLORS.bgCard,
      textColor: COLORS.text,
      lineColor: COLORS.border,
      lineWidth: 0.1,
      fontSize: 8,
      cellPadding: 2
    },
    headStyles: {
      fillColor: COLORS.bgAlt,
      textColor: COLORS.text,
      fontStyle: 'bold',
      fontSize: 8
    },
    alternateRowStyles: {
      fillColor: [22, 32, 50]
    },
    margin: { left: MARGIN, right: MARGIN }
  });
  return doc.lastAutoTable.finalY + 4;
}

function drawCover(doc, data) {
  const { project, city, products, manager } = data;
  fillBackground(doc);

  // Decoração superior
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, PAGE_W, 4, 'F');

  // Logo placeholder
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(MARGIN, 30, 14, 14, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('B', MARGIN + 7, 40, { align: 'center' });

  // Categoria
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('GESTÃO DE PROJETOS', MARGIN, 60);

  // Título principal
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(28);
  doc.setFont(undefined, 'bold');
  const titleLines = doc.splitTextToSize('Relatório Executivo de Encerramento', PAGE_W - 2 * MARGIN);
  doc.text(titleLines, MARGIN, 75);

  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text('Análise Consolidada do Projeto', MARGIN, 75 + titleLines.length * 11 + 4);

  // Linha divisória
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, 115, MARGIN + 40, 115);

  // Card central com dados
  const cardY = 125;
  doc.setFillColor(...COLORS.bgCard);
  doc.roundedRect(MARGIN, cardY, PAGE_W - 2 * MARGIN, 110, 3, 3, 'F');
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(MARGIN, cardY, PAGE_W - 2 * MARGIN, 110, 3, 3, 'S');

  const labelX = MARGIN + 6;
  const valueX = MARGIN + 55;
  let row = cardY + 12;
  const rowH = 11;

  const lines = [
    ['Projeto', project.name],
    ['Cidade', city || '—'],
    ['Portfólio', PORTFOLIO_LABELS[project.portfolio] || '—'],
    ['Gerente Responsável', manager],
    ['Data de Início', formatDateBR(project.contract_signature_date)],
    ['Data de Encerramento', formatDateBR(project.deadline)],
    ['Data de Emissão', formatDateBR(new Date())],
    ['Valor do Projeto', formatCurrencyBR(project.implementation_value)],
    ['Produtos Implantados', String(products.length)]
  ];

  lines.forEach(([label, value]) => {
    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(label.toUpperCase(), labelX, row);
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    const v = doc.splitTextToSize(String(value), PAGE_W - valueX - MARGIN - 6);
    doc.text(v[0] || '—', valueX, row);
    row += rowH;
  });

  // Rodapé da capa
  doc.setFillColor(...COLORS.bgCard);
  doc.rect(0, PAGE_H - 18, PAGE_W, 18, 'F');
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(8);
  doc.text('Documento gerado automaticamente pelo Gerenciador de Projetos', PAGE_W / 2, PAGE_H - 10, { align: 'center' });
  doc.text('Confidencial — Diretoria, PMO, Gerência, Comercial e CS', PAGE_W / 2, PAGE_H - 5, { align: 'center' });
}

function drawBarChart(doc, x, y, width, height, items) {
  // items: [{ label, value, color }]
  doc.setFillColor(...COLORS.bgCard);
  doc.roundedRect(x, y, width, height, 2, 2, 'F');
  const max = Math.max(...items.map(i => Math.abs(i.value)), 1);
  const barW = (width - 20) / items.length - 4;
  items.forEach((item, idx) => {
    const bx = x + 10 + idx * (barW + 4);
    const barH = (Math.abs(item.value) / max) * (height - 20);
    const by = y + height - 10 - barH;
    doc.setFillColor(...(item.color || COLORS.primary));
    doc.rect(bx, by, barW, barH, 'F');
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(8);
    doc.text(String(item.value), bx + barW / 2, by - 1, { align: 'center' });
    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(7);
    const lbl = doc.splitTextToSize(item.label, barW + 4);
    doc.text(lbl[0] || '', bx + barW / 2, y + height - 4, { align: 'center' });
  });
}

function drawLineChart(doc, x, y, width, height, points) {
  // points: [{ label, value }]
  if (points.length === 0) return;
  doc.setFillColor(...COLORS.bgCard);
  doc.roundedRect(x, y, width, height, 2, 2, 'F');

  const padding = 10;
  const innerW = width - 2 * padding;
  const innerH = height - 2 * padding - 6;
  const max = Math.max(...points.map(p => p.value), 100);
  const min = Math.min(...points.map(p => p.value), 0);
  const range = max - min || 1;

  const step = innerW / Math.max(points.length - 1, 1);
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.6);

  let prev = null;
  points.forEach((p, idx) => {
    const px = x + padding + idx * step;
    const py = y + padding + innerH - ((p.value - min) / range) * innerH;
    if (prev) {
      doc.line(prev.x, prev.y, px, py);
    }
    doc.setFillColor(...COLORS.primary);
    doc.circle(px, py, 1, 'F');
    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(7);
    doc.text(p.label, px, y + height - 2, { align: 'center' });
    prev = { x: px, y: py };
  });
}

export async function generateClosureReportPDF({
  project,
  products = [],
  timelineEvents = [],
  baselines = [],
  risks = [],
  healthSnapshots = [],
  editalItems = [],
  licoes = [],
  cronogramas = [],
  migrationTasks = [],
  homologationTasks = [],
  aiAnalysis = ''
}) {
  pageCounter = 1;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const city = extractCityFromProjectName(project.name);

  // ============ CAPA ============
  drawCover(doc, {
    project,
    city,
    products,
    manager: project.manager || '—'
  });

  // ============ PÁGINA 2: RESUMO EXECUTIVO ============
  newPage(doc, project.name);
  let y = 20;

  // Calcular indicadores
  const durationDays = project.contract_signature_date && project.deadline
    ? diffInDays(project.contract_signature_date, project.deadline)
    : 0;

  const risksMaterialized = risks.filter(r => r.status === 'em_andamento' || r.status === 'identificado').length;
  const risksMitigated = risks.filter(r => r.status === 'mitigado').length;

  // Health score: usa snapshots se houver, senão calcula o atual
  let healthValues = healthSnapshots.map(s => s.score).filter(v => v !== undefined);
  let currentHealth = null;
  if (healthValues.length === 0) {
    try {
      const calc = calculateHealthScore({
        timeline: timelineEvents,
        budget: project.budget || 0,
        spent: 0,
        migrationTasks,
        homologationTasks,
        risks,
        products,
        cronogramas,
        deadline: project.deadline,
        overallProgress: 100,
        projectStatus: 'concluido'
      });
      currentHealth = calc.score;
      healthValues = [calc.score];
    } catch (e) {
      currentHealth = null;
    }
  }
  const healthAvg = healthValues.length > 0
    ? Math.round(healthValues.reduce((a, b) => a + b, 0) / healthValues.length)
    : 0;
  const healthBest = healthValues.length > 0 ? Math.max(...healthValues) : 0;
  const healthWorst = healthValues.length > 0 ? Math.min(...healthValues) : 0;

  // Desvio acumulado: usa baselines V1 vs último marco
  let delayDays = 0;
  if (baselines.length > 0 && timelineEvents.length > 0) {
    const v1 = [...baselines].sort((a, b) => (a.version || 0) - (b.version || 0))[0];
    if (v1 && v1.milestones) {
      v1.milestones.forEach(m => {
        const current = timelineEvents.find(ev => ev.product_id === m.product_id && ev.phase === m.phase);
        if (current && current.end_date && m.baseline_date) {
          const d = diffInDays(m.baseline_date, current.end_date);
          if (d > delayDays) delayDays = d;
        }
      });
    }
  }

  // Edital items (filtrado pela cidade)
  const cityNorm = (city || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const relatedEdital = editalItems.filter(item => {
    const proj = (item.projeto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return cityNorm && proj.includes(cityNorm);
  });
  const editalOpen = relatedEdital.filter(i => {
    const s = (i.status || '').toLowerCase();
    return !s.includes('concl') && !s.includes('atend');
  });
  const editalAtTerm = relatedEdital.filter(i => {
    if (!i.data_prevista) return false;
    const days = diffInDays(new Date(), i.data_prevista);
    return days !== null && days >= 0 && days <= 10;
  });
  const editalOverdue = relatedEdital.filter(i => {
    if (!i.data_prevista) return false;
    const s = (i.status || '').toLowerCase();
    if (s.includes('concl') || s.includes('atend')) return false;
    const days = diffInDays(new Date(), i.data_prevista);
    return days !== null && days < 0;
  });

  // ISI
  const isi = calculateISI({
    healthScoreAvg: healthAvg,
    delayDays,
    risksMaterialized,
    totalRisks: risks.length,
    editalPendingOpen: editalOpen.length,
    editalTotal: relatedEdital.length,
    baselinesCount: baselines.length || 1
  });

  // === Seção 1: Resumo Executivo ===
  y = sectionTitle(doc, '1. Resumo Executivo', y);

  const kpiW = (PAGE_W - 2 * MARGIN - 12) / 4;
  const kpiH = 18;
  const kpis = [
    { label: 'Duração total', value: `${durationDays} dias` },
    { label: 'Valor contratado', value: formatCurrencyBR(project.implementation_value) },
    { label: 'Produtos', value: products.length },
    { label: 'Riscos registrados', value: risks.length },
    { label: 'Riscos materializados', value: risksMaterialized, color: risksMaterialized > 0 ? COLORS.danger : COLORS.success },
    { label: 'Riscos mitigados', value: risksMitigated, color: COLORS.success },
    { label: 'Revisões baseline', value: Math.max(0, baselines.length - 1) },
    { label: 'Health Score médio', value: healthAvg, color: healthAvg >= 80 ? COLORS.success : healthAvg >= 60 ? COLORS.warning : COLORS.danger }
  ];

  kpis.forEach((k, idx) => {
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    const kx = MARGIN + col * (kpiW + 4);
    const ky = y + row * (kpiH + 4);
    kpiCard(doc, kx, ky, kpiW, kpiH, k.label, k.value, k.color || COLORS.text);
  });
  y += 2 * (kpiH + 4) + 4;

  // Linha extra: desvio e ISI
  kpiCard(doc, MARGIN, y, kpiW * 2 + 4, kpiH, 'Desvio acumulado do cronograma', `${delayDays} dia(s)`, colorByDeviation(delayDays));
  kpiCard(doc, MARGIN + (kpiW * 2 + 4) + 4, y, kpiW * 2 + 4, kpiH, 'Índice de Sucesso (ISI)', `${isi.score} • ${isi.classification}`,
    isi.color === 'green' ? COLORS.success : isi.color === 'lime' ? COLORS.success : isi.color === 'yellow' ? COLORS.warning : COLORS.danger);
  y += kpiH + 8;

  // === Seção 2: Dados Gerais ===
  y = ensureSpace(doc, y, 60, project.name);
  y = sectionTitle(doc, '2. Dados Gerais', y);
  y = autoTable(doc,
    ['Campo', 'Valor'],
    [
      ['Projeto', project.name],
      ['Cidade', city || '—'],
      ['Portfólio', PORTFOLIO_LABELS[project.portfolio] || '—'],
      ['Gerente', project.manager || '—'],
      ['Coordenador Técnico', project.coordinator || '—'],
      ['Data Início', formatDateBR(project.contract_signature_date)],
      ['Data Encerramento', formatDateBR(project.deadline)],
      ['Valor Contratado', formatCurrencyBR(project.implementation_value)],
      ['Quantidade de Produtos', String(products.length)]
    ],
    y
  );

  // === Seção 3: Cronograma Executivo ===
  if (timelineEvents.some(e => ['go_live', 'operacao_assistida', 'encerramento_bastao'].includes(e.phase))) {
    y = ensureSpace(doc, y, 70, project.name);
    y = sectionTitle(doc, '3. Cronograma Executivo', y);

    const phaseLabels = {
      go_live: 'Go Live',
      operacao_assistida: 'Operação Assistida',
      encerramento_bastao: 'Encerramento'
    };
    const v1 = baselines.length > 0
      ? [...baselines].sort((a, b) => (a.version || 0) - (b.version || 0))[0]
      : null;
    const rows = [];
    const chartItems = [];
    ['go_live', 'operacao_assistida', 'encerramento_bastao'].forEach(phase => {
      const phaseEvents = timelineEvents.filter(e => e.phase === phase && e.end_date);
      if (phaseEvents.length === 0) return;
      const lastDate = phaseEvents.reduce((max, e) =>
        !max || new Date(e.end_date) > new Date(max) ? e.end_date : max, null);
      const plan = v1?.milestones?.find(m => m.phase === phase)?.baseline_date;
      const dev = plan && lastDate ? diffInDays(plan, lastDate) : 0;
      rows.push([
        phaseLabels[phase],
        formatDateBR(plan),
        formatDateBR(lastDate),
        `${dev > 0 ? '+' : ''}${dev} dias`
      ]);
      chartItems.push({ label: phaseLabels[phase], value: dev, color: colorByDeviation(dev) });
    });
    if (rows.length > 0) {
      y = autoTable(doc, ['Marco', 'Planejado', 'Realizado', 'Desvio'], rows, y);
      if (chartItems.length > 0) {
        y = ensureSpace(doc, y, 55, project.name);
        doc.setTextColor(...COLORS.textMuted);
        doc.setFontSize(9);
        doc.text('Comparativo de desvios (dias):', MARGIN, y + 4);
        drawBarChart(doc, MARGIN, y + 6, PAGE_W - 2 * MARGIN, 45, chartItems);
        y += 55;
      }
    }
  }

  // === Seção 4: Histórico de Baselines ===
  if (baselines.length > 0) {
    y = ensureSpace(doc, y, 60, project.name);
    y = sectionTitle(doc, '4. Histórico de Baselines', y);
    const sorted = [...baselines].sort((a, b) => (a.version || 0) - (b.version || 0));
    const rows = sorted.map(b => [
      `V${b.version}`,
      formatDateBR(b.created_date),
      b.user_name || b.user_email || '—',
      b.reason || '—',
      (b.observation || '—').substring(0, 60)
    ]);
    y = autoTable(doc, ['Versão', 'Data', 'Usuário', 'Motivo', 'Observação'], rows, y);

    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(8);
    doc.text(`Total: ${sorted.length} revisão(ões) • Primeira: V${sorted[0].version} (${formatDateBR(sorted[0].created_date)}) • Última: V${sorted[sorted.length - 1].version} (${formatDateBR(sorted[sorted.length - 1].created_date)})`,
      MARGIN, y);
    y += 8;
  }

  // === Seção 5: Health Score ===
  if (healthValues.length > 0) {
    y = ensureSpace(doc, y, 70, project.name);
    y = sectionTitle(doc, '5. Health Score', y);

    const greenCount = healthValues.filter(v => v >= 80).length;
    const yellowCount = healthValues.filter(v => v >= 60 && v < 80).length;
    const redCount = healthValues.filter(v => v < 60).length;

    const w = (PAGE_W - 2 * MARGIN - 12) / 4;
    kpiCard(doc, MARGIN, y, w, kpiH, 'Média', healthAvg, COLORS.primary);
    kpiCard(doc, MARGIN + w + 4, y, w, kpiH, 'Melhor', healthBest, COLORS.success);
    kpiCard(doc, MARGIN + 2 * (w + 4), y, w, kpiH, 'Pior', healthWorst, COLORS.danger);
    kpiCard(doc, MARGIN + 3 * (w + 4), y, w, kpiH, 'Snapshots', healthValues.length, COLORS.text);
    y += kpiH + 4;

    // Períodos
    const periodW = (PAGE_W - 2 * MARGIN - 8) / 3;
    kpiCard(doc, MARGIN, y, periodW, kpiH, 'Períodos verdes', greenCount, COLORS.success);
    kpiCard(doc, MARGIN + periodW + 4, y, periodW, kpiH, 'Períodos amarelos', yellowCount, COLORS.warning);
    kpiCard(doc, MARGIN + 2 * (periodW + 4), y, periodW, kpiH, 'Períodos vermelhos', redCount, COLORS.danger);
    y += kpiH + 6;

    // Gráfico temporal (se houver pelo menos 2 snapshots)
    if (healthSnapshots.length >= 2) {
      y = ensureSpace(doc, y, 50, project.name);
      doc.setTextColor(...COLORS.textMuted);
      doc.setFontSize(9);
      doc.text('Evolução temporal:', MARGIN, y);
      const sortedSnaps = [...healthSnapshots].sort((a, b) =>
        new Date(a.captured_at || a.created_date) - new Date(b.captured_at || b.created_date));
      const points = sortedSnaps.map(s => ({
        label: formatDateBR(s.captured_at || s.created_date).substring(0, 5),
        value: s.score
      }));
      drawLineChart(doc, MARGIN, y + 2, PAGE_W - 2 * MARGIN, 40, points);
      y += 46;
    }
  }

  // === Seção 6: Riscos ===
  if (risks.length > 0) {
    y = ensureSpace(doc, y, 60, project.name);
    y = sectionTitle(doc, '6. Riscos', y);

    const w = (PAGE_W - 2 * MARGIN - 8) / 3;
    kpiCard(doc, MARGIN, y, w, kpiH, 'Total previstos', risks.length, COLORS.text);
    kpiCard(doc, MARGIN + w + 4, y, w, kpiH, 'Materializados', risksMaterialized, risksMaterialized > 0 ? COLORS.danger : COLORS.success);
    kpiCard(doc, MARGIN + 2 * (w + 4), y, w, kpiH, 'Mitigados', risksMitigated, COLORS.success);
    y += kpiH + 4;

    // Top 5 riscos por severity
    const topRisks = [...risks]
      .map(r => ({ ...r, severity: (r.probability || 0) * (r.impact || 1) }))
      .sort((a, b) => b.severity - a.severity)
      .slice(0, 5);

    const rows = topRisks.map(r => [
      r.title || '—',
      r.category || '—',
      `P${r.probability || '-'} × I${r.impact || '-'} = ${r.severity}`,
      r.status || '—'
    ]);
    y = autoTable(doc, ['Risco', 'Categoria', 'Score', 'Status'], rows, y);
  }

  // === Seção 7: Pendências de Edital ===
  if (relatedEdital.length > 0) {
    y = ensureSpace(doc, y, 60, project.name);
    y = sectionTitle(doc, '7. Pendências de Edital', y);
    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(8);
    doc.text(`Correlação por cidade: "${city}" — ${relatedEdital.length} item(ns) encontrado(s)`, MARGIN, y);
    y += 5;

    const w = (PAGE_W - 2 * MARGIN - 12) / 4;
    const concluded = relatedEdital.length - editalOpen.length;
    kpiCard(doc, MARGIN, y, w, kpiH, 'Total', relatedEdital.length, COLORS.text);
    kpiCard(doc, MARGIN + w + 4, y, w, kpiH, 'Concluídos', concluded, COLORS.success);
    kpiCard(doc, MARGIN + 2 * (w + 4), y, w, kpiH, 'Em aberto', editalOpen.length, editalOpen.length > 0 ? COLORS.warning : COLORS.success);
    kpiCard(doc, MARGIN + 3 * (w + 4), y, w, kpiH, 'Atrasados', editalOverdue.length, editalOverdue.length > 0 ? COLORS.danger : COLORS.success);
    y += kpiH + 6;

    // Itens críticos: abertos na data de encerramento
    if (editalOpen.length > 0) {
      doc.setTextColor(...COLORS.text);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('Itens críticos em aberto na data de encerramento', MARGIN, y);
      doc.setFont(undefined, 'normal');
      y += 4;
      const rows = editalOpen.slice(0, 12).map(i => [
        i.numero_item || '—',
        (i.item_edital || '—').substring(0, 70),
        i.status || '—',
        formatDateBR(i.data_prevista)
      ]);
      y = autoTable(doc, ['Nº Item', 'Descrição', 'Status', 'Data Prevista'], rows, y);
    }
  }

  // === Seção 8: Lições Aprendidas ===
  if (licoes.length > 0) {
    y = ensureSpace(doc, y, 60, project.name);
    y = sectionTitle(doc, '8. Lições Aprendidas', y);
    licoes.slice(0, 8).forEach(l => {
      y = ensureSpace(doc, y, 22, project.name);
      doc.setFillColor(...COLORS.bgCard);
      doc.roundedRect(MARGIN, y, PAGE_W - 2 * MARGIN, 20, 1.5, 1.5, 'F');
      doc.setTextColor(...COLORS.primary);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text(l.title || '—', MARGIN + 3, y + 5);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLORS.textMuted);
      doc.setFontSize(7.5);
      const prob = doc.splitTextToSize(`Problema: ${l.problema || '—'}`, PAGE_W - 2 * MARGIN - 6);
      doc.text(prob[0] || '', MARGIN + 3, y + 10);
      const sol = doc.splitTextToSize(`Solução: ${l.solucao || '—'}`, PAGE_W - 2 * MARGIN - 6);
      doc.text(sol[0] || '', MARGIN + 3, y + 15);
      y += 22;
    });
  }

  // === Seção 9: KPI Executivo (Dashboard consolidado) ===
  y = ensureSpace(doc, y, 60, project.name);
  y = sectionTitle(doc, '9. KPI Executivo', y);
  const kpiExec = [
    { label: 'Produtos implantados', value: products.length },
    { label: 'Duração total', value: `${durationDays}d` },
    { label: 'Riscos materializados', value: risksMaterialized, color: risksMaterialized > 0 ? COLORS.danger : COLORS.success },
    { label: 'Riscos mitigados', value: risksMitigated, color: COLORS.success },
    { label: 'Baselines', value: baselines.length },
    { label: 'Pendências edital', value: editalOpen.length, color: editalOpen.length > 0 ? COLORS.warning : COLORS.success },
    { label: 'Health Score médio', value: healthAvg, color: healthAvg >= 80 ? COLORS.success : healthAvg >= 60 ? COLORS.warning : COLORS.danger },
    { label: 'Atraso acumulado', value: `${delayDays}d`, color: colorByDeviation(delayDays) }
  ];
  kpiExec.forEach((k, idx) => {
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    const kx = MARGIN + col * (kpiW + 4);
    const ky = y + row * (kpiH + 4);
    kpiCard(doc, kx, ky, kpiW, kpiH, k.label, k.value, k.color || COLORS.text);
  });
  y += 2 * (kpiH + 4) + 4;

  // === Seção 10: ISI ===
  y = ensureSpace(doc, y, 75, project.name);
  y = sectionTitle(doc, '10. Índice de Sucesso da Implantação (ISI)', y);

  // Card central com nota e classificação
  doc.setFillColor(...COLORS.bgCard);
  doc.roundedRect(MARGIN, y, PAGE_W - 2 * MARGIN, 35, 2, 2, 'F');

  const isiColor = isi.color === 'green' ? COLORS.success
    : isi.color === 'lime' ? COLORS.success
    : isi.color === 'yellow' ? COLORS.warning
    : COLORS.danger;

  doc.setTextColor(...isiColor);
  doc.setFontSize(36);
  doc.setFont(undefined, 'bold');
  doc.text(String(isi.score), MARGIN + 15, y + 24);
  doc.setFontSize(10);
  doc.text('/ 100', MARGIN + 36, y + 24);

  doc.setFont(undefined, 'normal');
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text(isi.classification.toUpperCase(), MARGIN + 60, y + 14);

  // Semáforo
  ['green', 'yellow', 'red'].forEach((c, idx) => {
    const active = (isi.color === 'green' || isi.color === 'lime') && c === 'green'
      || isi.color === 'yellow' && c === 'yellow'
      || isi.color === 'red' && c === 'red';
    const col = c === 'green' ? COLORS.success : c === 'yellow' ? COLORS.warning : COLORS.danger;
    doc.setFillColor(...(active ? col : COLORS.bgAlt));
    doc.circle(MARGIN + 62 + idx * 7, y + 22, 2.5, 'F');
  });

  doc.setFont(undefined, 'normal');
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(8);
  doc.text('Faixas: 90-100 Excelente • 75-89 Bom • 60-74 Atenção • <60 Crítico',
    MARGIN + 60, y + 30);

  y += 40;

  // Composição dos componentes
  y = ensureSpace(doc, y, 30, project.name);
  y = autoTable(doc,
    ['Componente', 'Peso', 'Pontuação'],
    [
      ['Health Score Médio', '30%', `${isi.components.health}`],
      ['Prazo (atraso)', '25%', `${isi.components.prazo}`],
      ['Riscos Materializados', '15%', `${isi.components.risco}`],
      ['Pendências de Edital', '15%', `${isi.components.edital}`],
      ['Baselines / Replanejamentos', '15%', `${isi.components.baseline}`]
    ],
    y
  );

  // ============ NOVAS SEÇÕES EXECUTIVAS (11 a 16) ============
  const redCount = healthValues.filter(v => v < 60).length;

  // Aceite da implantação: considera-se aceito se TODOS os produtos têm implementation_accepted=true
  const implementationAccepted = products.length > 0 && products.every(p => p.implementation_accepted === true);

  // Health Score Final = último snapshot ou o atual
  let healthFinal = healthAvg;
  if (healthSnapshots.length > 0) {
    const sortedSnaps = [...healthSnapshots].sort((a, b) =>
      new Date(a.captured_at || a.created_date) - new Date(b.captured_at || b.created_date));
    healthFinal = sortedSnaps[sortedSnaps.length - 1].score;
  }

  const accountHealth = calculateAccountHealth({
    healthAvg,
    healthWorst,
    redPeriods: redCount,
    risksMaterialized,
    editalPendingOpen: editalOpen.length,
    baselinesCount: baselines.length || 1,
    delayDays,
    implementationAccepted
  });

  const irc = calculateIRC({
    editalPendingOpen: editalOpen.length,
    editalTotal: relatedEdital.length,
    healthAvg,
    baselinesCount: baselines.length || 1,
    delayDays,
    risksMaterialized,
    totalRisks: risks.length,
    implementationAccepted
  });

  const renewal = calculateRenewalProbability({
    healthAvg,
    healthFinal,
    editalPendingOpen: editalOpen.length,
    editalTotal: relatedEdital.length,
    risksMaterialized,
    totalRisks: risks.length,
    baselinesCount: baselines.length || 1,
    delayDays,
    implementationAccepted,
    productsCount: products.length,
    isiScore: isi.score
  });

  const recs = generatePostProjectRecommendations({
    accountHealth,
    irc,
    renewal,
    editalPendingOpen: editalOpen.length,
    risksMaterialized
  });

  // Helpers para os renderers (passa funções/constantes já definidas)
  const baseHelpers = {
    newPage,
    sectionTitle,
    ensureSpace,
    autoTable,
    MARGIN,
    PAGE_W,
    projectName: project.name
  };

  // Seção 12 — Saúde da Conta (começa em nova página para garantir espaço)
  newPage(doc, project.name);
  y = 20;
  y = renderAccountHealthSection(doc, accountHealth, { ...baseHelpers, y }, COLORS);

  // Seção 13 — IRC
  y = renderIRCSection(doc, irc, { ...baseHelpers, y }, COLORS);

  // Seção 14 — Probabilidade de Renovação
  y = renderRenewalSection(doc, renewal, { ...baseHelpers, y }, COLORS);

  // Seção 15 — Visão da Conta Pós-Projeto (sempre em nova página)
  y = renderPostProjectViewSection(doc, { isi, irc, accountHealth, renewal }, { ...baseHelpers, y }, COLORS);

  // Seção 16 — Recomendações Pós-Projeto
  y = renderRecommendationsSection(doc, recs, { ...baseHelpers, y }, COLORS);

  // Seção 17 — Conclusão Executiva Consolidada (nova página)
  y = renderConsolidatedConclusionSection(doc, {
    project,
    isi, irc, accountHealth, renewal,
    healthAvg, delayDays, risksMaterialized,
    baselinesCount: baselines.length || 1,
    editalPendingOpen: editalOpen.length,
    productsCount: products.length
  }, { ...baseHelpers, y }, COLORS);

  // ============ SEÇÃO 17: ANÁLISE EXECUTIVA IA ============
  if (aiAnalysis && aiAnalysis.trim().length > 0) {
    newPage(doc, project.name);
    y = 20;
    y = sectionTitle(doc, '17. Análise Executiva IA', y);

    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(8);
    doc.text('Parecer gerado pelo Agente de Encerramento Executivo (PMBOK • ERP • CS • Gestão Pública)', MARGIN, y);
    y += 6;

    // Renderiza o markdown como texto formatado simples
    const lines = aiAnalysis.split('\n');
    const contentW = PAGE_W - 2 * MARGIN;

    for (const rawLine of lines) {
      const line = rawLine.replace(/\r/g, '');

      // H3 (### Título)
      if (/^###\s+/.test(line)) {
        const text = line.replace(/^###\s+/, '').replace(/\*\*/g, '');
        y = ensureSpace(doc, y + 2, 10, project.name);
        doc.setTextColor(...COLORS.primary);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        const wrapped = doc.splitTextToSize(text, contentW);
        doc.text(wrapped, MARGIN, y);
        y += wrapped.length * 5 + 2;
        doc.setFont(undefined, 'normal');
        continue;
      }

      // H2 (## Título)
      if (/^##\s+/.test(line)) {
        const text = line.replace(/^##\s+/, '').replace(/\*\*/g, '');
        y = ensureSpace(doc, y + 3, 10, project.name);
        doc.setTextColor(...COLORS.text);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        const wrapped = doc.splitTextToSize(text, contentW);
        doc.text(wrapped, MARGIN, y);
        y += wrapped.length * 5.5 + 2;
        doc.setFont(undefined, 'normal');
        continue;
      }

      // Lista (- item ou * item)
      if (/^\s*[-*]\s+/.test(line)) {
        const text = line.replace(/^\s*[-*]\s+/, '').replace(/\*\*(.+?)\*\*/g, '$1');
        y = ensureSpace(doc, y, 8, project.name);
        doc.setTextColor(...COLORS.primary);
        doc.setFontSize(9);
        doc.text('•', MARGIN + 2, y + 3.5);
        doc.setTextColor(...COLORS.text);
        const wrapped = doc.splitTextToSize(text, contentW - 8);
        doc.text(wrapped, MARGIN + 6, y + 3.5);
        y += wrapped.length * 4.5 + 1;
        continue;
      }

      // Linha vazia
      if (line.trim() === '') {
        y += 2;
        continue;
      }

      // Parágrafo normal (com **bold** simples)
      y = ensureSpace(doc, y, 8, project.name);
      doc.setTextColor(...COLORS.text);
      doc.setFontSize(9);
      const cleanText = line.replace(/\*\*(.+?)\*\*/g, '$1');
      const wrapped = doc.splitTextToSize(cleanText, contentW);
      doc.text(wrapped, MARGIN, y + 3.5);
      y += wrapped.length * 4.5 + 1;
    }
  }

  // Salvar
  const safeName = project.name.replace(/[^a-zA-Z0-9-_]/g, '_');
  doc.save(`Relatorio_Encerramento_${safeName}.pdf`);
}