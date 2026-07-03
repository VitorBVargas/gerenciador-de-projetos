// Gera uma "Lista de Presença de Treinamento" no formato .docx (Word)
// usando HTML com MIME do Word — abre diretamente no Microsoft Word / Google Docs.

const esc = (v = '') =>
  String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

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
      h3 { font-size: 11pt; margin: 16px 0 6px; border-bottom:2px solid #000; padding-bottom:2px; }
      table { border-collapse: collapse; width: 100%; }
    </style>
  </head>
  <body>
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