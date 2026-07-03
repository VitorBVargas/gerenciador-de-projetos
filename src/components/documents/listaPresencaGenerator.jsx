// Gera uma "Lista de Presença de Treinamento" no formato .docx (Word)
// usando HTML com MIME do Word — abre diretamente no Microsoft Word / Google Docs.

const esc = (v = '') =>
  String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// Imagens institucionais da Betha
const BETHA_LOGO = 'https://media.base44.com/images/public/693e9f298bb38fa472ef1725/8f9bd3f51_betha.png';
const BETHA_ENDERECO = 'https://media.base44.com/images/public/693e9f298bb38fa472ef1725/44b5ed610_betha2.png';
const BETHA_CONTATO = 'https://media.base44.com/images/public/693e9f298bb38fa472ef1725/96f26f070_betha3.png';

// Carrega imagem como dataURL (para o PDF)
async function loadImage(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function imgSize(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 1, h: 1 });
    img.src = dataUrl;
  });
}

const formatarData = (isoDate) => {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
};

export async function gerarListaPresencaDocx({
  projectName = '',
  produtoNome = '',
  chamado = '',
  entidade = '',
  entidadeCompleta = '',
  instrutor = '',
  data = '',
  hora = '',
  local = '',
  formato = 'presencial',
  cargaHoraria = '',
  conteudo = '',
  qtdLinhas = 10,
}) {
  const presencialMark = formato === 'presencial' ? 'X' : '&nbsp;';
  const remotoMark = formato === 'remoto' ? 'X' : '&nbsp;';
  const dataHora = [formatarData(data), hora].filter(Boolean).join(' - ');
  const entidadeTexto = entidadeCompleta || entidade;

  // Linhas de assinatura
  let signRows = '';
  for (let i = 1; i <= qtdLinhas; i++) {
    signRows += `
      <tr>
        <td style="border:1px solid #000; padding:8px; text-align:center; width:8%;">${i}</td>
        <td style="border:1px solid #000; padding:8px; height:26px;">&nbsp;</td>
        <td style="border:1px solid #000; padding:8px;">&nbsp;</td>
        <td style="border:1px solid #000; padding:8px;">&nbsp;</td>
      </tr>`;
  }

  const infoRow = (label, value) => `
    <tr>
      <td style="border:1px solid #000; padding:6px 8px; width:32%; background:#f2f2f2; font-weight:bold;">${esc(label)}</td>
      <td style="border:1px solid #000; padding:6px 8px;">${value || '&nbsp;'}</td>
    </tr>`;

  const html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="utf-8" />
    <title>Lista de Presença</title>
    <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
    <style>
      @page { size: A4; margin: 2cm; }
      body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color:#000; }
      h1 { font-size: 15pt; text-align:center; margin-bottom: 2px; }
      h2 { font-size: 12pt; text-align:center; margin-top:0; color:#333; font-weight:normal; }
      h3 { font-size: 11pt; margin: 16px 0 6px; border-bottom:2px solid #005CB9; padding-bottom:2px; color:#005CB9; }
      table { border-collapse: collapse; width: 100%; }
    </style>
  </head>
  <body>
    <!-- Cabeçalho Betha -->
    <div style="margin-bottom:6px;">
      <img src="${BETHA_LOGO}" style="height:38px;" />
    </div>
    <div style="border-bottom:3px solid #005CB9; margin-bottom:14px;"></div>

    <h1>LISTA DE PRESENÇA DE TREINAMENTO</h1>
    <h2>${esc(produtoNome)}</h2>

    <h3>Informações Gerais</h3>
    <table>
      ${infoRow('Entidade:', esc(entidadeTexto))}
      ${infoRow('Chamado:', esc(chamado))}
      ${infoRow('Instrutor Betha Sistemas:', esc(instrutor))}
      ${infoRow('Data:', esc(dataHora))}
      ${infoRow('Local:', esc(local))}
      ${infoRow('Formato:', `( ${presencialMark} ) Presencial &nbsp;&nbsp;&nbsp; ( ${remotoMark} ) Remoto`)}
      ${infoRow('Carga Horária:', esc(cargaHoraria))}
    </table>

    <h3>Conteúdo Ministrado</h3>
    <table>
      <tr>
        <td style="border:1px solid #000; padding:10px; min-height:60px; vertical-align:top;">
          ${conteudo ? esc(conteudo).replace(/\n/g, '<br/>') : '&nbsp;'}
        </td>
      </tr>
    </table>

    <h3>Lista de treinamento com assinaturas</h3>
    <table>
      <thead>
        <tr>
          <th style="border:1px solid #000; padding:8px; background:#d9d9d9; width:8%;">Nº</th>
          <th style="border:1px solid #000; padding:8px; background:#d9d9d9;">Nome Completo</th>
          <th style="border:1px solid #000; padding:8px; background:#d9d9d9;">Cargo/Função</th>
          <th style="border:1px solid #000; padding:8px; background:#d9d9d9;">Assinatura</th>
        </tr>
      </thead>
      <tbody>
        ${signRows}
      </tbody>
    </table>

    <!-- Rodapé Betha -->
    <div style="border-top:2px solid #005CB9; margin-top:24px; padding-top:8px;"></div>
    <table style="width:100%; border:none;">
      <tr>
        <td style="border:none; vertical-align:middle; width:55%;">
          <img src="${BETHA_ENDERECO}" style="height:34px;" />
        </td>
        <td style="border:none; text-align:right; vertical-align:middle; width:45%;">
          <img src="${BETHA_CONTATO}" style="height:34px;" />
        </td>
      </tr>
    </table>
  </body>
  </html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (projectName || produtoNome || 'treinamento').replace(/[^a-zA-Z0-9]/g, '_');
  a.href = url;
  a.download = `Lista_Presenca_${safeName}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function gerarListaPresencaPdf({
  projectName = '',
  produtoNome = '',
  chamado = '',
  entidade = '',
  entidadeCompleta = '',
  instrutor = '',
  data = '',
  hora = '',
  local = '',
  formato = 'presencial',
  cargaHoraria = '',
  conteudo = '',
  qtdLinhas = 10,
}) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  const BLUE = [0, 92, 185];
  const entidadeTexto = entidadeCompleta || entidade;
  const dataHora = [formatarData(data), hora].filter(Boolean).join(' - ');

  // Cabeçalho Betha (logo)
  const logoData = await loadImage(BETHA_LOGO);
  const logoDim = await imgSize(logoData);
  const logoH = 12;
  const logoW = (logoDim.w / logoDim.h) * logoH;
  doc.addImage(logoData, 'PNG', margin, 12, logoW, logoH);
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.8);
  doc.line(margin, 27, pageW - margin, 27);

  // Título
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('LISTA DE PRESENÇA DE TREINAMENTO', pageW / 2, 36, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(51, 51, 51);
  doc.text(String(produtoNome || ''), pageW / 2, 43, { align: 'center' });

  const presencial = formato === 'presencial' ? 'X' : ' ';
  const remoto = formato === 'remoto' ? 'X' : ' ';

  // Informações Gerais
  autoTable(doc, {
    startY: 50,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 55, fillColor: [242, 242, 242], fontStyle: 'bold' } },
    body: [
      ['Entidade:', entidadeTexto || ''],
      ['Chamado:', chamado || ''],
      ['Instrutor Betha Sistemas:', instrutor || ''],
      ['Data:', dataHora || ''],
      ['Local:', local || ''],
      ['Formato:', `( ${presencial} ) Presencial     ( ${remoto} ) Remoto`],
      ['Carga Horária:', cargaHoraria || ''],
    ],
  });

  // Conteúdo Ministrado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BLUE);
  doc.text('Conteúdo Ministrado', margin, doc.lastAutoTable.finalY + 8);
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3, minCellHeight: 18, textColor: [0, 0, 0] },
    body: [[conteudo || '']],
  });

  // Lista de assinaturas
  const rows = [];
  for (let i = 1; i <= qtdLinhas; i++) rows.push([String(i), '', '', '']);
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 6,
    theme: 'grid',
    head: [['Nº', 'Nome Completo', 'Cargo/Função', 'Assinatura']],
    headStyles: { fillColor: [217, 217, 217], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 2, minCellHeight: 9, textColor: [0, 0, 0] },
    columnStyles: { 0: { cellWidth: 12, halign: 'center' } },
    body: rows,
  });

  // Rodapé Betha (endereço + contato)
  const pageH = doc.internal.pageSize.getHeight();
  const [endData, contData] = await Promise.all([loadImage(BETHA_ENDERECO), loadImage(BETHA_CONTATO)]);
  const endDim = await imgSize(endData);
  const contDim = await imgSize(contData);
  const footH = 11;
  const footY = pageH - 20;
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.6);
  doc.line(margin, footY - 4, pageW - margin, footY - 4);
  const endW = (endDim.w / endDim.h) * footH;
  const contW = (contDim.w / contDim.h) * footH;
  doc.addImage(endData, 'PNG', margin, footY, endW, footH);
  doc.addImage(contData, 'PNG', pageW - margin - contW, footY, contW, footH);

  const safeName = (projectName || produtoNome || 'treinamento').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Lista_Presenca_${safeName}.pdf`);
}