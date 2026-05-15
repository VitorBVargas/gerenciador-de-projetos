// Utilitários compartilhados para a funcionalidade de Linha de Base (Baseline Executiva)

export const BASELINE_PHASES = ['go_live', 'operacao_assistida', 'encerramento_bastao'];

export const BASELINE_PHASE_LABELS = {
  go_live: 'Go Live',
  operacao_assistida: 'Operação Assistida',
  encerramento_bastao: 'Encerramento'
};

export const REASON_OPTIONS = [
  { value: 'cliente', label: 'Cliente' },
  { value: 'migracao', label: 'Migração' },
  { value: 'integracao', label: 'Integração' },
  { value: 'escopo', label: 'Escopo' },
  { value: 'treinamento', label: 'Treinamento' },
  { value: 'interno', label: 'Interno' },
  { value: 'planejamento', label: 'Planejamento' },
  { value: 'outro', label: 'Outro' }
];

export const REASON_LABELS = {
  planejamento_inicial: 'Planejamento Inicial',
  cliente: 'Cliente',
  migracao: 'Migração',
  integracao: 'Integração',
  escopo: 'Escopo',
  treinamento: 'Treinamento',
  interno: 'Interno',
  planejamento: 'Planejamento',
  outro: 'Outro'
};

/**
 * Coleta os marcos atuais (Go Live, Op. Assistida, Encerramento) a partir de timelineEvents + products.
 * Retorna array de { product_id, product_name, phase, baseline_date }.
 * Apenas considera eventos cuja phase está na lista BASELINE_PHASES e que tenham end_date.
 */
export function collectCurrentMilestones(timelineEvents = [], products = []) {
  const productsById = new Map(products.map(p => [p.id, p]));
  const result = [];
  timelineEvents.forEach(ev => {
    if (!BASELINE_PHASES.includes(ev.phase)) return;
    if (!ev.end_date) return;
    const product = productsById.get(ev.product_id);
    result.push({
      product_id: ev.product_id,
      product_name: product?.name || '—',
      phase: ev.phase,
      baseline_date: ev.end_date
    });
  });
  return result;
}

/**
 * Calcula o desvio (em dias) entre baseline_date e a data atual do mesmo (product_id, phase).
 * Retorna array enriquecido com { ...milestone, current_date, deviation_days }.
 */
export function computeDeviations(baselineMilestones = [], currentMilestones = []) {
  const currentMap = new Map();
  currentMilestones.forEach(m => {
    currentMap.set(`${m.product_id}::${m.phase}`, m.baseline_date);
  });

  return baselineMilestones.map(m => {
    const currentDate = currentMap.get(`${m.product_id}::${m.phase}`) || null;
    let deviation = 0;
    if (currentDate && m.baseline_date) {
      const a = new Date(m.baseline_date).getTime();
      const b = new Date(currentDate).getTime();
      deviation = Math.round((b - a) / (1000 * 60 * 60 * 24));
    }
    return { ...m, current_date: currentDate, deviation_days: deviation };
  });
}

/**
 * A partir de um array de marcos com desvio, retorna o maior desvio absoluto (em dias),
 * sempre considerando o atraso como positivo.
 */
export function maxDeviation(deviations = []) {
  if (deviations.length === 0) return 0;
  return Math.max(...deviations.map(d => d.deviation_days || 0));
}

export function colorForDeviation(days) {
  if (days <= 5) return 'green';
  if (days <= 15) return 'yellow';
  return 'red';
}

export function formatDateBR(dateStr) {
  if (!dateStr) return '—';
  try {
    const [y, m, d] = dateStr.substring(0, 10).split('-');
    return `${d}/${m}/${y}`;
  } catch {
    return dateStr;
  }
}