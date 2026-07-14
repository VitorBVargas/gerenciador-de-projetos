// Mapeamento compartilhado da planilha ServiceDesk (Jira) -> entidade Chamado.
// Cabeçalho real na primeira linha (linha A). Usado por chamados internos e externos.

// Situação (Jira) -> status da plataforma
export function mapStatus(situacao) {
  const s = String(situacao || '').trim().toLowerCase();
  if (!s) return 'aberto';
  if (s.includes('cancel')) return 'resolvido';
  if (s.includes('resolv') || s.includes('conclu') || s.includes('fechad') || s.includes('encerrad') || s.includes('finalizad')) return 'resolvido';
  if (s.includes('aguardando')) return 'aguardando_cliente'; // dependência e cliente caem aqui
  if (s.includes('andamento') || s.includes('atendimento') || s.includes('desenvolvimento') || s.includes('execu') || s.includes('triagem') || s.includes('análise') || s.includes('analise')) return 'em_andamento';
  return 'aberto';
}

// Prioridade numérica (Jira) -> prioridade da plataforma
export function mapPrioridade(valor) {
  const v = String(valor || '').trim().toLowerCase();
  if (v === '1' || v.includes('crit') || v.includes('bloque')) return 'critica';
  if (v === '2' || v.includes('alta') || v.includes('high')) return 'alta';
  if (v === '4' || v.includes('baixa') || v.includes('low')) return 'baixa';
  return 'media'; // 3 / normal / vazio
}

const MESES = {
  jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
  jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12',
};

// Normaliza data para YYYY-MM-DD (sem hora). Aceita:
// "09/jul/26 9:08 AM", "09/jul/26", "13/07/2026 14:57", "2026-05-06 00:00:00"
export function normalizeDate(value) {
  if (!value) return '';
  const s = String(value).trim();

  // ISO
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // dd/mês-abreviado/aa  (ex: 09/jul/26)
  const brAbrev = s.match(/^(\d{1,2})\/([a-zç]{3})\.?\/(\d{2,4})/i);
  if (brAbrev) {
    const dia = brAbrev[1].padStart(2, '0');
    const mes = MESES[brAbrev[2].toLowerCase().slice(0, 3)];
    let ano = brAbrev[3];
    if (ano.length === 2) ano = `20${ano}`;
    if (mes) return `${ano}-${mes}-${dia}`;
  }

  // dd/mm/yyyy
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;

  return '';
}

// Índices de coluna por nome de cabeçalho (linha A), tolerante a acentos/variações.
export function buildColumnIndex(headerRow) {
  const norm = (h) => String(h || '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cols = headerRow.map(norm);
  const find = (...cands) => {
    for (const c of cands) {
      const idx = cols.findIndex(h => h === norm(c));
      if (idx >= 0) return idx;
    }
    // fallback: match por "inclui"
    for (const c of cands) {
      const idx = cols.findIndex(h => h.includes(norm(c)));
      if (idx >= 0) return idx;
    }
    return -1;
  };
  return {
    chave: find('Chave'),
    resumo: find('Resumo'),
    tipoItem: find('Tipo de Item'),
    situacao: find('Situação', 'Situacao'),
    prioridade: find('Prioridade'),
    responsavel: find('Responsável', 'Responsavel'),
    solicitante: find('Solicitante'),
    criado: find('Criado'),
    resolvido: find('Resolvido'),
    previsao: find('Data prevista de conclusão', 'Data de conclusão (Expectativa)', 'Data para Ficar Pronto'),
    entidade: find('Entidade'),
    descricao: find('Descrição', 'Descricao'),
  };
}

// Converte uma linha (array por posição) + índice de colunas -> payload do Chamado.
// tipo = 'interno' | 'externo'. Retorna null se linha inválida.
export function rowToChamado(row, idx, { projectId, tipo }) {
  const get = (i) => (i >= 0 ? String(row[i] ?? '').trim() : '');
  const numero = get(idx.chave).replace(/\.0$/, '');
  const descricao = get(idx.resumo);
  if (!numero || !descricao) return null;

  const responsavelAtendente = get(idx.responsavel);
  const descricaoLonga = get(idx.descricao);
  const notesParts = [];
  if (responsavelAtendente) notesParts.push(`Responsável (atendente): ${responsavelAtendente}`);
  if (descricaoLonga) notesParts.push(descricaoLonga);

  return {
    project_id: projectId,
    tipo,
    numero,
    descricao,
    categoria: get(idx.tipoItem),
    status: mapStatus(get(idx.situacao)),
    prioridade: mapPrioridade(get(idx.prioridade)),
    responsavel: get(idx.solicitante) || responsavelAtendente || '',
    entity_name: get(idx.entidade),
    data_abertura: normalizeDate(get(idx.criado)) || new Date().toISOString().split('T')[0],
    data_resolucao: normalizeDate(get(idx.resolvido)) || undefined,
    previsao_conclusao: normalizeDate(get(idx.previsao)) || undefined,
    notes: notesParts.join('\n\n'),
  };
}