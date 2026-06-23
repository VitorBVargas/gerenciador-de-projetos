import html2canvas from 'html2canvas';
import pptxgen from 'pptxgenjs';

// Captura cada .kickoff-slide como imagem e monta um PPTX 16:9.
export async function exportKickoffPptx(fileName = 'Kick-Off') {
  const slides = Array.from(document.querySelectorAll('.kickoff-slide'));
  if (slides.length === 0) return;

  const pptx = new pptxgen();
  pptx.defineLayout({ name: 'KICK', width: 13.333, height: 7.5 });
  pptx.layout = 'KICK';

  for (const el of slides) {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
    const dataUrl = canvas.toDataURL('image/png');
    const slide = pptx.addSlide();
    slide.addImage({ data: dataUrl, x: 0, y: 0, w: 13.333, h: 7.5 });
  }

  await pptx.writeFile({ fileName: `${fileName}.pptx` });
}