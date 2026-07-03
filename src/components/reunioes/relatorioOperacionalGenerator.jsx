// Gera um "Relatório Operacional" no formato .docx (Word) e .pdf,
// reproduzindo o modelo padrão salvo (Operação Assistida Presencial).

const esc = (v = '') =>
  String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// Imagens institucionais da Betha
const BETHA_LOGO = 'https://media.base44.com/images/public/693e9f298bb38fa472ef1725/536a64b83_Gemini_Generated_Image_wo9hvqwo9hvqwo9h1.png';
const BETHA_ENDERECO = 'https://media.base44.com/images/public/693e9f298bb38fa472ef1725/5d1d27af6_Gemini_Generated_Image_wo9hvqwo9hvqwo9h.png';
const BETHA_CONTATO = 'https://media.base44.com/images/public/693e9f298bb38fa472ef1725/fd99aa8de_ChatGPTImage3dejulde202614_42_36.png';

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

const OBJETIVO_TXT = [
  'Neste documento, apresentam-se as atividades executadas pelos técnicos na data supracitada, referentes à fase de Operação Assistida Presencial dos sistemas implantados.',
  'Essa etapa consiste no acompanhamento direto das rotinas operacionais, visando validar configurações, monitorar o comportamento dos módulos em ambiente produtivo, orientar os usuários na execução dos procedimentos e identificar eventuais ajustes necessários para a plena estabilização do sistema.',
  'As informações aqui consolidadas representam o suporte técnico prestado, os processos assistidos, as intervenções realizadas e as demandas identificadas, garantindo a conformidade das operações e a continuidade adequada do uso das soluções após o início da operação.',
];

const ESCOPO_TXT = 'Registro das atividades realizadas presencialmente, organizadas por data e pelas equipes envolvidas, descrevendo de forma objetiva as ações executadas em cada etapa do atendimento.';

const OCORRENCIAS_TXT = 'Neste item são documentadas todas as situações atípicas, incidentes, interferências ou condicionantes que ocorreram durante a execução das atividades presenciais. O registro deve contemplar detalhes relevantes sobre a ocorrência, sua identificação, impactos observados e quaisquer medidas adotadas ou recomendadas para mitigação.';

const CIENCIA_TXT = 'O Servidor Responsável abaixo identificado declara que acompanhou a execução das atividades supracitadas, estando ciente dos procedimentos realizados, das orientações de uso do software fornecidas pelo técnico da Betha Sistemas e das pendências registradas, se houver.';

// ─────────────────────────────── WORD (.doc) ───────────────────────────────
export async function gerarRelatorioOperacionalDocx(dados) {
  const {
    projectName = '', entidade = '', chamado = '', responsavelBetha = '',
    periodo = '', atendimentos = [], ocorrencias = [], nomeServidor = '', cargoMatricula = '',
  } = dados;

  const infoRow = (label, value) => `
    <tr>
      <td style="border:1px solid #000; padding:6px 8px; width:34%; background:#f2f2f2; font-weight:bold;">${esc(label)}</td>
      <td style="border:1px solid #000; padding:6px 8px;">${value ? esc(value) : '&nbsp;'}</td>
    </tr>`;

  const atendimentosHtml = atendimentos.map(a => `
    <div style="margin:10px 0 14px;">
      <p style="margin:2px 0;"><strong>Data:</strong> ${esc(formatarData(a.data))}</p>
      <p style="margin:2px 0;"><strong>Técnicos Betha Envolvidos:</strong> ${esc(a.tecnicosBetha || '')}</p>
      <p style="margin:2px 0;"><strong>Técnicos da Entidade Envolvidos:</strong> ${esc(a.tecnicosEntidade || '')}</p>
      <p style="margin:2px 0;"><strong>Atividades Executadas:</strong></p>
      <ul style="margin:2px 0 0 18px;">
        ${(a.atividades || []).filter(Boolean).map(at => `<li>${esc(at)}</li>`).join('') || '<li>&nbsp;</li>'}
      </ul>
    </div>`).join('');

  const ocorrenciasHtml = ocorrencias.map(o => {
    const naoMark = o.gerouChamado === 'nao' ? 'X' : '&nbsp;';
    const simMark = o.gerouChamado === 'sim' ? 'X' : '&nbsp;';
    return `
    <div style="margin:10px 0 14px;">
      <p style="margin:2px 0;"><strong>Ocorrência:</strong> ${esc(o.ocorrencia || '')}</p>
      <p style="margin:2px 0;"><strong>Gerou Bug ou chamado?</strong> ( ${naoMark} ) Não &nbsp;&nbsp; ( ${simMark} ) Sim, <strong>Chamado:</strong> ${esc(o.chamado || '')}</p>
      <p style="margin:2px 0;"><strong>Impactos:</strong> ${esc(o.impactos || '')}</p>
      <p style="margin:2px 0;"><strong>Medidas adotadas:</strong> ${esc(o.medidas || '')}</p>
    </div>`;
  }).join('');

  const html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="utf-8" />
    <title>Relatório Operacional</title>
    <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
    <style>
      @page { size: A4; margin: 2cm; }
      body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color:#000; }
      h1 { font-size: 15pt; text-align:center; margin-bottom: 12px; }
      h3 { font-size: 12pt; margin: 18px 0 6px; border-bottom:2px solid #005CB9; padding-bottom:2px; color:#005CB9; }
      p { line-height: 1.4; }
      table { border-collapse: collapse; width: 100%; }
    </style>
  </head>
  <body>
    <div style="margin-bottom:6px;"><img src="${BETHA_LOGO}" style="height:32px;" /></div>
    <div style="border-bottom:3px solid #005CB9; margin-bottom:14px;"></div>

    <h1>RELATÓRIO OPERACIONAL</h1>

    <h3>1. Dados de Identificação</h3>
    <table>
      ${infoRow('Entidade:', entidade)}
      ${infoRow('Projeto:', projectName)}
      ${infoRow('Chamado:', chamado)}
      ${infoRow('Responsável Betha:', responsavelBetha)}
      ${infoRow('Período:', periodo)}
    </table>

    <h3>2. Objetivo</h3>
    ${OBJETIVO_TXT.map(t => `<p>${esc(t)}</p>`).join('')}

    <h3>3. Escopo do Atendimento Presencial</h3>
    <p>${esc(ESCOPO_TXT)}</p>
    ${atendimentosHtml || '<p>&nbsp;</p>'}

    <h3>4. Registro de Ocorrências e Interferências</h3>
    <p>${esc(OCORRENCIAS_TXT)}</p>
    ${ocorrenciasHtml || '<p>&nbsp;</p>'}

    <h3>5. Ciência e Conformidade</h3>
    <p>${esc(CIENCIA_TXT)}</p>
    <p style="margin-top:40px;">______________________________________________</p>
    <p style="margin:2px 0;"><strong>${esc(nomeServidor || 'Nome do Servidor/Responsável')}</strong></p>
    <p style="margin:2px 0;">${esc(cargoMatricula || 'Cargo/Matrícula')}</p>

    <div style="border-top:2px solid #005CB9; margin-top:24px; padding-top:8px;"></div>
    <table style="width:100%; border:none;">
      <tr>
        <td style="border:none; vertical-align:middle; width:55%;"><img src="${BETHA_ENDERECO}" style="height:34px;" /></td>
        <td style="border:none; text-align:right; vertical-align:middle; width:45%;"><img src="${BETHA_CONTATO}" style="height:34px;" /></td>
      </tr>
    </table>
  </body>
  </html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (projectName || entidade || 'relatorio').replace(/[^a-zA-Z0-9]/g, '_');
  a.href = url;
  a.download = `Relatorio_Operacional_${safeName}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────── PDF ───────────────────────────────
export async function gerarRelatorioOperacionalPdf(dados) {
  const {
    projectName = '', entidade = '', chamado = '', responsavelBetha = '',
    periodo = '', atendimentos = [], ocorrencias = [], nomeServidor = '', cargoMatricula = '',
  } = dados;

  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;
  const BLUE = [0, 92, 185];
  let y = 12;

  const logoData = await loadImage(BETHA_LOGO);
  const logoDim = await imgSize(logoData);
  const logoH = 10;
  const logoW = (logoDim.w / logoDim.h) * logoH;
  doc.addImage(logoData, 'PNG', margin, y, logoW, logoH, undefined, 'NONE');
  y += logoH + 3;
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('RELATÓRIO OPERACIONAL', pageW / 2, y, { align: 'center' });
  y += 8;

  const ensureSpace = (needed) => {
    if (y + needed > pageH - 25) { doc.addPage(); y = 20; }
  };

  const sectionTitle = (txt) => {
    ensureSpace(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...BLUE);
    doc.text(txt, margin, y);
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.5);
    doc.line(margin, y + 1.5, pageW - margin, y + 1.5);
    y += 7;
    doc.setTextColor(0, 0, 0);
  };

  const paragraph = (txt, opts = {}) => {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(opts.size || 10);
    const lines = doc.splitTextToSize(txt, opts.width || contentW);
    lines.forEach(line => {
      ensureSpace(6);
      doc.text(line, opts.x || margin, y);
      y += 5;
    });
  };

  // 1. Dados de Identificação
  sectionTitle('1. Dados de Identificação');
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 2, textColor: [0, 0, 0] },
    columnStyles: { 0: { cellWidth: 55, fillColor: [242, 242, 242], fontStyle: 'bold' } },
    body: [
      ['Entidade:', entidade || ''],
      ['Projeto:', projectName || ''],
      ['Chamado:', chamado || ''],
      ['Responsável Betha:', responsavelBetha || ''],
      ['Período:', periodo || ''],
    ],
    margin: { left: margin, right: margin },
  });
  y = doc.lastAutoTable.finalY + 6;

  // 2. Objetivo
  sectionTitle('2. Objetivo');
  OBJETIVO_TXT.forEach(t => { paragraph(t); y += 1.5; });
  y += 2;

  // 3. Escopo
  sectionTitle('3. Escopo do Atendimento Presencial');
  paragraph(ESCOPO_TXT);
  y += 2;
  atendimentos.forEach(a => {
    ensureSpace(24);
    paragraph(`Data: ${formatarData(a.data)}`, { bold: true });
    paragraph(`Técnicos Betha Envolvidos: ${a.tecnicosBetha || ''}`);
    paragraph(`Técnicos da Entidade Envolvidos: ${a.tecnicosEntidade || ''}`);
    paragraph('Atividades Executadas:', { bold: true });
    (a.atividades || []).filter(Boolean).forEach(at => paragraph(`•  ${at}`, { x: margin + 3, width: contentW - 3 }));
    y += 4;
  });

  // 4. Ocorrências
  sectionTitle('4. Registro de Ocorrências e Interferências');
  paragraph(OCORRENCIAS_TXT);
  y += 2;
  ocorrencias.forEach(o => {
    ensureSpace(24);
    const nao = o.gerouChamado === 'nao' ? 'X' : ' ';
    const sim = o.gerouChamado === 'sim' ? 'X' : ' ';
    paragraph(`Ocorrência: ${o.ocorrencia || ''}`, { bold: true });
    paragraph(`Gerou Bug ou chamado?  ( ${nao} ) Não   ( ${sim} ) Sim, Chamado: ${o.chamado || ''}`);
    paragraph(`Impactos: ${o.impactos || ''}`);
    paragraph(`Medidas adotadas: ${o.medidas || ''}`);
    y += 4;
  });

  // 5. Ciência
  sectionTitle('5. Ciência e Conformidade');
  paragraph(CIENCIA_TXT);
  y += 16;
  ensureSpace(20);
  doc.text('______________________________________________', margin, y);
  y += 6;
  paragraph(nomeServidor || 'Nome do Servidor/Responsável', { bold: true });
  paragraph(cargoMatricula || 'Cargo/Matrícula');

  // Rodapé
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
  doc.addImage(endData, 'PNG', margin, footY, endW, footH, undefined, 'NONE');
  doc.addImage(contData, 'PNG', pageW - margin - contW, footY, contW, footH, undefined, 'NONE');

  const safeName = (projectName || entidade || 'relatorio').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Relatorio_Operacional_${safeName}.pdf`);
}