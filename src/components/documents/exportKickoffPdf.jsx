import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Gera um PDF (A4 paisagem) capturando cada slide do kickoff individualmente.
// Não depende de window.print(), evitando páginas em branco da sobreposição do app.
export async function exportKickoffPdf(fileName = 'Kick-Off') {
  const slides = Array.from(document.querySelectorAll('.kickoff-slide'));
  if (slides.length === 0) return;

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < slides.length; i++) {
    const canvas = await html2canvas(slides[i], {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    if (i > 0) pdf.addPage();
    // Preenche a página inteira mantendo a proporção 16:9 dos slides
    pdf.addImage(imgData, 'JPEG', 0, 0, pageW, pageH);
  }

  pdf.save(`${fileName}.pdf`);
}