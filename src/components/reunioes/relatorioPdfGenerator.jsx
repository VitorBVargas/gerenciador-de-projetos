import jsPDF from 'jspdf';

// Paleta executiva
const COLORS = {
  primary: [37, 99, 235],      // blue-600
  primaryDark: [30, 58, 138],  // blue-900
  slate900: [15, 23, 42],
  slate700: [51, 65, 85],
  slate500: [100, 116, 139],
  slate400: [148, 163, 184],
  slate200: [226, 232, 240],
  slate100: [241, 245, 249],
  emerald: [16, 185, 129],
  red: [239, 68, 68],
  yellow: [217, 119, 6],
  orange: [234, 88, 12],
  cyan: [8, 145, 178],
  white: [255, 255, 255],
};

/**
 * Gera um PDF executivo do relatório operacional.
 * @param {object} report  { resumo_atividades, destaques[], analise_risco, acoes_recomendadas[] }
 * @param {object} stats   { concluidas, em_andamento, atrasadas, proximas, chamados_abertos, chamados_resolvidos }
 * @param {object} meta    { projectName, days, dateLabel, responsavel }
 * @returns {jsPDF}
 */
export function buildRelatorioPdf(report, stats, meta = {}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = 0;

  const setFill = (c) => doc.setFillColor(c[0], c[1], c[2]);
  const setText = (c) => doc.setTextColor(c[0], c[1], c[2]);
  const setDraw = (c) => doc.setDrawColor(c[0], c[1], c[2]);

  const ensureSpace = (needed) => {
    if (y + needed > pageH - 60) {
      addFooter();
      doc.addPage();
      y = margin;
    }
  };

  let pageNum = 1;
  const addFooter = () => {
    setText(COLORS.slate400);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(meta.projectName || 'Relatório Operacional', margin, pageH - 30);
    doc.text(`Página ${pageNum}`, pageW - margin, pageH - 30, { align: 'right' });
    pageNum++;
  };

  // ── Cabeçalho ──
  setFill(COLORS.primaryDark);
  doc.rect(0, 0, pageW, 130, 'F');
  setFill(COLORS.primary);
  doc.rect(0, 126, pageW, 4, 'F');

  setText(COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('Relatório Operacional', margin, 60);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  setText(COLORS.slate200);
  doc.text(meta.projectName || '', margin, 82);

  doc.setFontSize(9);
  setText(COLORS.slate400);
  const periodo = meta.days ? `Período analisado: últimos/próximos ${meta.days} dias` : '';
  doc.text(periodo, margin, 102);
  const gerado = `Gerado em ${meta.dateLabel || new Date().toLocaleDateString('pt-BR')}${meta.responsavel ? ' • ' + meta.responsavel : ''}`;
  doc.text(gerado, margin, 116);

  y = 165;

  // ── Cards de indicadores ──
  if (stats) {
    const cards = [
      { label: 'Concluídas', value: stats.concluidas, color: COLORS.emerald },
      { label: 'Em andamento', value: stats.em_andamento, color: COLORS.primary },
      { label: 'Atrasadas', value: stats.atrasadas, color: COLORS.red },
      { label: 'Vencendo', value: stats.proximas, color: COLORS.yellow },
      { label: 'Ch. abertos', value: stats.chamados_abertos, color: COLORS.orange },
      { label: 'Ch. resolvidos', value: stats.chamados_resolvidos, color: COLORS.cyan },
    ];
    const gap = 10;
    const cardW = (contentW - gap * 5) / 6;
    const cardH = 58;
    cards.forEach((c, i) => {
      const x = margin + i * (cardW + gap);
      setFill(COLORS.slate100);
      doc.roundedRect(x, y, cardW, cardH, 6, 6, 'F');
      setFill(c.color);
      doc.roundedRect(x, y, cardW, 4, 2, 2, 'F');
      setText(c.color);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text(String(c.value ?? 0), x + cardW / 2, y + 32, { align: 'center' });
      setText(COLORS.slate500);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(c.label, x + cardW / 2, y + 47, { align: 'center' });
    });
    y += cardH + 28;
  }

  // ── Seções ──
  const sectionTitle = (title, color) => {
    ensureSpace(40);
    setFill(color);
    doc.roundedRect(margin, y, 5, 16, 2, 2, 'F');
    setText(COLORS.slate900);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(title, margin + 14, y + 13);
    y += 26;
  };

  const paragraph = (text) => {
    if (!text) return;
    setText(COLORS.slate700);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text, contentW);
    lines.forEach((line) => {
      ensureSpace(16);
      doc.text(line, margin, y);
      y += 15;
    });
    y += 8;
  };

  const bulletList = (items, color, numbered = false) => {
    if (!items?.length) return;
    doc.setFontSize(10);
    items.forEach((item, i) => {
      const marker = numbered ? `${i + 1}.` : '•';
      const lines = doc.splitTextToSize(item, contentW - 22);
      ensureSpace(lines.length * 15 + 4);
      setText(color);
      doc.setFont('helvetica', 'bold');
      doc.text(marker, margin + 4, y);
      setText(COLORS.slate700);
      doc.setFont('helvetica', 'normal');
      lines.forEach((line, li) => {
        doc.text(line, margin + 22, y + li * 15);
      });
      y += lines.length * 15 + 6;
    });
    y += 6;
  };

  // Resumo das atividades
  sectionTitle('Resumo das Atividades Executadas', COLORS.emerald);
  paragraph(report.resumo_atividades);
  if (report.destaques?.length) {
    setText(COLORS.slate500);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    ensureSpace(20);
    doc.text('DESTAQUES', margin, y);
    y += 16;
    bulletList(report.destaques, COLORS.emerald);
  }

  // Análise de risco
  sectionTitle('Análise de Risco — Próximos Dias', COLORS.red);
  paragraph(report.analise_risco);

  // Ações recomendadas
  if (report.acoes_recomendadas?.length) {
    sectionTitle('Ações Recomendadas', COLORS.primary);
    bulletList(report.acoes_recomendadas, COLORS.primary, true);
  }

  addFooter();
  return doc;
}

/**
 * Serializa o relatório estruturado em JSON dentro das observações,
 * junto com um marcador para poder reconstruir o PDF depois.
 */
export function serializeRelatorio(report, stats, meta) {
  return JSON.stringify({ __relatorio_ia__: true, report, stats, meta });
}

export function parseRelatorio(observacoes) {
  if (!observacoes) return null;
  try {
    const data = JSON.parse(observacoes);
    if (data && data.__relatorio_ia__) return data;
  } catch {
    return null;
  }
  return null;
}