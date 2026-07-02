import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';

const PRIO_LABEL = { baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica' };
const STATUS_LABEL = {
  aberto: 'Aberto', em_andamento: 'Em andamento', aguardando_cliente: 'Aguardando cliente',
  resolvido: 'Resolvido', fechado: 'Fechado',
};

function fmtDate(d) {
  try { return d ? format(parseISO(d), 'dd/MM/yyyy') : '—'; } catch { return '—'; }
}

export function generateChamadosPdf({ chamados, kpis, projectName, tipoLabel }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  // Header
  doc.setFillColor(88, 28, 135);
  doc.rect(0, 0, pageWidth, 60, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('Relatório de Chamados', margin, 30);
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`${projectName || 'Projeto'} • ${tipoLabel}`, margin, 46);
  doc.setFontSize(9);
  doc.text(`Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - margin, 46, { align: 'right' });

  // KPI cards
  let y = 80;
  const cardW = (pageWidth - margin * 2 - 30) / 4;
  kpis.forEach((k, i) => {
    const x = margin + i * (cardW + 10);
    doc.setDrawColor(200);
    doc.setFillColor(245, 243, 255);
    doc.roundedRect(x, y, cardW, 46, 4, 4, 'FD');
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.text(k.label, x + 10, y + 16);
    doc.setTextColor(88, 28, 135);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(String(k.value), x + 10, y + 38);
    doc.setFont(undefined, 'normal');
  });

  // Table
  autoTable(doc, {
    startY: y + 66,
    margin: { left: margin, right: margin },
    head: [['Número', 'Descrição', 'Categoria', 'Produto', 'Entidade', 'Status', 'Prioridade', 'Solicitante', 'Abertura']],
    body: chamados.map(c => [
      c.numero || '—',
      c.descricao || '—',
      c.categoria || '—',
      c.product_name || '—',
      c.entity_name || '—',
      STATUS_LABEL[c.status] || c.status || '—',
      PRIO_LABEL[c.prioridade] || c.prioridade || '—',
      c.responsavel || '—',
      fmtDate(c.data_abertura),
    ]),
    styles: { fontSize: 7.5, cellPadding: 4, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: [88, 28, 135], textColor: 255, fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 247, 252] },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 200 },
      2: { cellWidth: 65 },
      3: { cellWidth: 90 },
      4: { cellWidth: 55 },
      5: { cellWidth: 75 },
      6: { cellWidth: 55 },
      7: { cellWidth: 90 },
      8: { cellWidth: 55 },
    },
  });

  const fileName = `chamados_${(projectName || 'projeto').replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
  doc.save(fileName);
}