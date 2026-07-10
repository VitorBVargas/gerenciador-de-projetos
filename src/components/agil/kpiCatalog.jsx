import { effectiveColumn } from './boardMeta';
import { computeSprintMetrics } from './boardMetrics';

// Catálogo de indicadores ágeis: descrição, fórmula, faixa ideal e formato.
// Cada KPI tem um `id` usado como chave nos snapshots históricos.
export const KPI_CATALOG = [
  { id: 'velocity', nome: 'Velocity', unidade: 'SP', formula: 'Σ Story Points concluídos na sprint', faixa: 'Estável ou crescente entre sprints', desc: 'Quantidade de story points efetivamente entregues por sprint. Base para previsibilidade.', melhor: 'up', grupo: 'fluxo' },
  { id: 'leadTime', nome: 'Lead Time', unidade: 'h', formula: 'média(conclusão − criação)', faixa: 'Quanto menor, melhor', desc: 'Tempo total desde a criação do item até sua conclusão.', melhor: 'down', grupo: 'fluxo' },
  { id: 'cycleTime', nome: 'Cycle Time', unidade: 'h', formula: 'média(conclusão − início do desenvolvimento)', faixa: 'Quanto menor, melhor', desc: 'Tempo de trabalho ativo, do início do desenvolvimento até a conclusão.', melhor: 'down', grupo: 'fluxo' },
  { id: 'throughput', nome: 'Throughput', unidade: 'itens', formula: 'nº de itens concluídos na sprint', faixa: 'Estável ou crescente', desc: 'Vazão: quantos itens são concluídos por sprint.', melhor: 'up', grupo: 'fluxo' },
  { id: 'sprintPredictability', nome: 'Sprint Predictability', unidade: '%', formula: '(SP entregue / SP planejado) × 100', faixa: '80% – 120%', desc: 'Aderência entre o que foi planejado e o que foi entregue.', melhor: 'target', ideal: [80, 120], grupo: 'previsibilidade' },
  { id: 'sprintGoalSuccess', nome: 'Sprint Goal Success', unidade: '%', formula: '(sprints concluídas / sprints finalizadas) × 100', faixa: '≥ 80%', desc: 'Taxa de sprints que atingiram o objetivo/meta.', melhor: 'up', grupo: 'previsibilidade' },
  { id: 'wip', nome: 'WIP', unidade: 'itens', formula: 'itens em colunas de trabalho ativo', faixa: 'Baixo e controlado', desc: 'Trabalho em progresso simultâneo. Excesso reduz o fluxo.', melhor: 'down', grupo: 'fluxo' },
  { id: 'flowEfficiency', nome: 'Flow Efficiency', unidade: '%', formula: '(Cycle Time / Lead Time) × 100', faixa: '≥ 40%', desc: 'Proporção do tempo em que o item está sendo efetivamente trabalhado.', melhor: 'up', grupo: 'fluxo' },
  { id: 'storiesDone', nome: 'Stories Concluídas', unidade: 'itens', formula: 'nº de stories concluídas', faixa: 'Conforme planejamento', desc: 'Stories entregues na sprint.', melhor: 'up', grupo: 'escopo' },
  { id: 'storiesPlanned', nome: 'Stories Planejadas', unidade: 'itens', formula: 'nº de stories na sprint', faixa: 'Compatível com capacidade', desc: 'Stories comprometidas para a sprint.', melhor: 'neutral', grupo: 'escopo' },
  { id: 'bugs', nome: 'Bugs', unidade: 'itens', formula: 'nº de bugs abertos na sprint', faixa: 'Quanto menor, melhor', desc: 'Defeitos identificados no período.', melhor: 'down', grupo: 'qualidade' },
  { id: 'techDebt', nome: 'Débito Técnico', unidade: 'itens', formula: 'nº de itens do tipo débito técnico', faixa: 'Controlado e decrescente', desc: 'Itens de débito técnico acumulados.', melhor: 'down', grupo: 'qualidade' },
  { id: 'scopeAdded', nome: 'Escopo Adicionado', unidade: 'SP', formula: 'SP adicionados após início da sprint', faixa: 'Baixo (evitar scope creep)', desc: 'Story points incluídos depois do início da sprint.', melhor: 'down', grupo: 'escopo' },
  { id: 'scopeRemoved', nome: 'Escopo Removido', unidade: 'SP', formula: 'SP removidos após início da sprint', faixa: 'Baixo', desc: 'Story points retirados após o início da sprint.', melhor: 'down', grupo: 'escopo' },
  { id: 'avgStory', nome: 'Tempo Médio Story', unidade: 'h', formula: 'média(cycle time das stories)', faixa: 'Quanto menor, melhor', desc: 'Tempo médio de ciclo das stories.', melhor: 'down', grupo: 'fluxo' },
  { id: 'avgBug', nome: 'Tempo Médio Bug', unidade: 'h', formula: 'média(cycle time dos bugs)', faixa: 'Quanto menor, melhor', desc: 'Tempo médio para resolver bugs.', melhor: 'down', grupo: 'fluxo' },
  { id: 'avgFeature', nome: 'Tempo Médio Feature', unidade: 'h', formula: 'média(lead time das features)', faixa: 'Quanto menor, melhor', desc: 'Tempo médio de entrega de features.', melhor: 'down', grupo: 'fluxo' },
  { id: 'avgStoryPoints', nome: 'Média Story Points', unidade: 'SP', formula: 'média(SP por item)', faixa: 'Itens pequenos e homogêneos', desc: 'Tamanho médio dos itens. Itens grandes reduzem previsibilidade.', melhor: 'neutral', grupo: 'escopo' },
  { id: 'capacidade', nome: 'Capacidade', unidade: 'h', formula: 'capacidade planejada da sprint', faixa: 'Compatível com a equipe', desc: 'Horas disponíveis planejadas para a sprint.', melhor: 'neutral', grupo: 'capacidade' },
  { id: 'ocupacao', nome: 'Ocupação', unidade: '%', formula: '(horas gastas / capacidade) × 100', faixa: '70% – 90%', desc: 'Nível de ocupação da equipe. Acima de 90% indica sobrecarga.', melhor: 'target', ideal: [70, 90], grupo: 'capacidade' },
  { id: 'discoveryHealth', nome: 'Discovery Health Score', unidade: '', formula: 'score de maturidade do discovery (0-100)', faixa: '≥ 70', desc: 'Maturidade do discovery que originou o backlog.', melhor: 'up', grupo: 'saude' },
  { id: 'releaseHealth', nome: 'Release Health', unidade: '', formula: 'média da saúde das releases ativas (0-100)', faixa: '≥ 70', desc: 'Saúde consolidada das releases em andamento.', melhor: 'up', grupo: 'saude' },
  { id: 'sprintHealth', nome: 'Sprint Health', unidade: '', formula: 'progresso × tempo − penalidades (bloqueios/WIP)', faixa: '≥ 70', desc: 'Saúde da sprint atual.', melhor: 'up', grupo: 'saude' },
  { id: 'healthGeral', nome: 'Health Geral', unidade: '', formula: 'média(sprint, release, discovery, qualidade)', faixa: '≥ 70', desc: 'Índice geral de saúde do projeto ágil.', melhor: 'up', grupo: 'saude' },
];

export const KPI_GRUPOS = {
  fluxo: { label: 'Fluxo & Velocidade', color: 'text-cyan-300' },
  previsibilidade: { label: 'Previsibilidade', color: 'text-indigo-300' },
  escopo: { label: 'Escopo', color: 'text-yellow-300' },
  qualidade: { label: 'Qualidade', color: 'text-red-300' },
  capacidade: { label: 'Capacidade', color: 'text-orange-300' },
  saude: { label: 'Saúde', color: 'text-emerald-300' },
};

const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

// Health da sprint em escala 0-100
function sprintHealthScore(m) {
  if (!m.total) return 0;
  let score = m.percentSprint;
  // penaliza atraso vs tempo decorrido
  if (m.percentDecorrido > m.percentSprint) score -= (m.percentDecorrido - m.percentSprint) * 0.5;
  score -= m.bloqueados * 8;
  if (m.wip > 6) score -= (m.wip - 6) * 3;
  return Math.max(0, Math.min(100, Math.round(score)));
}

// Health de uma release (sprint) 0-100
export function releaseHealthScore(m, sprint) {
  let score = m.percentSprint;
  if (m.bloqueados > 0) score -= m.bloqueados * 6;
  if (m.bugs > 0) score -= m.bugs * 3;
  // atraso de prazo
  if (sprint?.data_fim) {
    try {
      const atrasada = new Date(sprint.data_fim) < new Date() && m.percentSprint < 100;
      if (atrasada) score -= 20;
    } catch { /* ignore */ }
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

// Calcula todos os KPIs para uma sprint específica (ou consolidado).
export function computeAgilKpis({ sprint, sprintItems, allItems, sprints, discoveryScore }) {
  const m = computeSprintMetrics(sprintItems, sprint);
  const main = sprintItems.filter(i => !i.is_subtask);

  const stories = main.filter(i => i.tipo === 'story');
  const bugsArr = main.filter(i => i.tipo === 'bug');
  const featuresArr = main.filter(i => i.tipo === 'feature');
  const debtArr = main.filter(i => i.tipo === 'debito_tecnico');

  const storiesDone = stories.filter(i => effectiveColumn(i) === 'concluido').length;
  const avgStory = avg(stories.map(i => i.cycle_time_horas).filter(v => v > 0));
  const avgBug = avg(bugsArr.map(i => i.cycle_time_horas).filter(v => v > 0));
  const avgFeature = avg(featuresArr.map(i => i.lead_time_horas).filter(v => v > 0));
  const avgStoryPoints = main.length ? Math.round((main.reduce((s, i) => s + (i.story_points || 0), 0) / main.length) * 10) / 10 : 0;

  const sprintPredictability = (sprint?.story_points_planejados || m.sp) > 0
    ? Math.round((m.spDone / (sprint?.story_points_planejados || m.sp)) * 100) : 0;

  // Sprint Goal Success: sprints concluídas / sprints finalizadas
  const finalizadas = (sprints || []).filter(s => s.status === 'concluida');
  const sucesso = finalizadas.filter(s => (s.story_points_planejados ? (s.story_points_entregues || 0) >= s.story_points_planejados * 0.8 : true));
  const sprintGoalSuccess = finalizadas.length ? Math.round((sucesso.length / finalizadas.length) * 100) : 0;

  const sprintHealth = sprintHealthScore(m);
  const releaseHealth = releaseHealthScore(m, sprint);
  const discoveryHealth = discoveryScore || 0;

  const qualidadeScore = Math.max(0, 100 - (bugsArr.length * 6) - (debtArr.length * 4));
  const healthGeral = Math.round(
    (sprintHealth + releaseHealth + (discoveryHealth || sprintHealth) + qualidadeScore) / 4
  );

  return {
    velocity: m.velocity,
    leadTime: m.leadTime,
    cycleTime: m.cycleTime,
    throughput: m.throughput,
    sprintPredictability,
    sprintGoalSuccess,
    wip: m.wip,
    flowEfficiency: m.flowEfficiency,
    storiesDone,
    storiesPlanned: stories.length,
    bugs: bugsArr.length,
    techDebt: debtArr.length,
    scopeAdded: 0,
    scopeRemoved: 0,
    avgStory,
    avgBug,
    avgFeature,
    avgStoryPoints,
    capacidade: m.capacidade,
    ocupacao: m.capacidadeUtilizada,
    discoveryHealth,
    releaseHealth,
    sprintHealth,
    healthGeral,
  };
}

// Avalia se um valor está na faixa ideal -> retorna 'ok' | 'atencao' | 'ruim' | 'neutro'
export function evaluateKpi(kpi, value) {
  if (value === null || value === undefined) return 'neutro';
  if (kpi.melhor === 'neutral') return 'neutro';
  if (kpi.melhor === 'target' && kpi.ideal) {
    const [lo, hi] = kpi.ideal;
    if (value >= lo && value <= hi) return 'ok';
    if (value >= lo * 0.8 && value <= hi * 1.2) return 'atencao';
    return 'ruim';
  }
  // heurística leve para up/down (sem baseline definido)
  if (kpi.grupo === 'saude') {
    if (value >= 70) return 'ok';
    if (value >= 50) return 'atencao';
    return 'ruim';
  }
  return 'neutro';
}