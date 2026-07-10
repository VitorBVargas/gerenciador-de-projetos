// Motor de análise do Scrum Master IA — calcula Health Score da Sprint (0-100),
// detecta problemas, gargalos, riscos e oportunidades a partir dos dados REAIS.
// NÃO altera nada. Apenas lê e interpreta.

import { effectiveColumn } from './boardMeta';

// Classifica o health score numérico em faixa qualitativa
export function classifyScore(score) {
  if (score >= 90) return { key: 'excelente', label: 'Excelente', color: 'text-emerald-300', ring: 'stroke-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/40' };
  if (score >= 70) return { key: 'boa', label: 'Boa', color: 'text-green-300', ring: 'stroke-green-400', bg: 'bg-green-500/15 border-green-500/40' };
  if (score >= 50) return { key: 'atencao', label: 'Atenção', color: 'text-yellow-300', ring: 'stroke-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/40' };
  return { key: 'critica', label: 'Crítica', color: 'text-red-300', ring: 'stroke-red-400', bg: 'bg-red-500/15 border-red-500/40' };
}

// Deduz um "tamanho grande demais" para uma story (heurística de refinamento)
const isStoryTooBig = (i) => (i.tipo === 'story' || i.tipo === 'feature') && (i.story_points || 0) >= 13;

// Calcula o Health Score da sprint (0-100) com pesos e componentes explicáveis.
// Recebe `metrics` (de computeSprintMetrics) e a lista de itens da sprint.
export function computeSprintHealth(metrics, items) {
  const main = (items || []).filter((i) => !i.is_subtask);
  const total = main.length || 0;

  const semResponsavel = main.filter((i) => !i.responsavel).length;
  const semStoryPoints = main.filter((i) => !(i.story_points > 0)).length;
  const semCriterioAceite = main.filter((i) => !i.criterio_aceite || !i.criterio_aceite.trim()).length;
  const semDoR = main.filter((i) => !i.definition_of_ready || !i.definition_of_ready.trim()).length;
  const semDoD = main.filter((i) => !i.definition_of_done || !i.definition_of_done.trim()).length;
  const storiesGrandes = main.filter(isStoryTooBig).length;
  const bugs = main.filter((i) => i.tipo === 'bug').length;
  const bugsCriticos = main.filter((i) => i.tipo === 'bug' && (i.prioridade === 'critica' || i.prioridade === 'alta')).length;
  const debitoTecnico = main.filter((i) => i.tipo === 'debito_tecnico').length;
  const bloqueados = metrics.bloqueados || 0;
  const wip = metrics.wip || 0;

  const pct = (n, d) => (d > 0 ? n / d : 0);

  // Cada componente vale de 0 a 100. Depois aplicamos pesos.
  const components = [];
  const add = (label, value, weight, detail) => components.push({ label, value: Math.round(value), weight, detail });

  // 1. Progresso vs tempo decorrido (burndown)
  const ritmo = metrics.percentDecorrido > 0
    ? Math.min(1, metrics.percentSprint / Math.max(1, metrics.percentDecorrido))
    : (metrics.percentSprint / 100);
  add('Progresso vs prazo (Burndown)', ritmo * 100, 18,
    `${metrics.percentSprint}% concluído com ${metrics.percentDecorrido}% do tempo decorrido`);

  // 2. Bloqueios
  const scoreBloq = 100 - Math.min(100, bloqueados * 30);
  add('Itens bloqueados', scoreBloq, 14, `${bloqueados} item(ns) bloqueado(s)`);

  // 3. WIP (ideal <= ~1.5 por status ativo; penaliza excesso)
  const wipLimit = Math.max(4, Math.ceil(total * 0.4));
  const scoreWip = wip <= wipLimit ? 100 : Math.max(0, 100 - (wip - wipLimit) * 12);
  add('WIP (trabalho em progresso)', scoreWip, 10, `${wip} itens em progresso (limite saudável ~${wipLimit})`);

  // 4. Bugs
  const scoreBugs = 100 - Math.min(100, bugs * 10 + bugsCriticos * 15);
  add('Bugs', scoreBugs, 10, `${bugs} bug(s), ${bugsCriticos} crítico(s)/alto(s)`);

  // 5. Refinamento — critério de aceite + DoR
  const scoreRefino = 100 - (pct(semCriterioAceite, total) * 60 + pct(semDoR, total) * 40);
  add('Refinamento (Critério de Aceite / DoR)', scoreRefino, 12,
    `${semCriterioAceite} sem critério de aceite, ${semDoR} sem DoR`);

  // 6. Definition of Done
  const scoreDoD = 100 - pct(semDoD, total) * 100;
  add('Definition of Done', scoreDoD, 8, `${semDoD} item(ns) sem DoD`);

  // 7. Responsáveis atribuídos
  const scoreResp = 100 - pct(semResponsavel, total) * 100;
  add('Atribuição de responsáveis', scoreResp, 8, `${semResponsavel} item(ns) sem responsável`);

  // 8. Estimativa (Story Points)
  const scoreSP = 100 - pct(semStoryPoints, total) * 100;
  add('Estimativa (Story Points)', scoreSP, 6, `${semStoryPoints} item(ns) sem Story Points`);

  // 9. Tamanho das stories (fatiamento)
  const scoreSize = 100 - Math.min(100, pct(storiesGrandes, total) * 120);
  add('Fatiamento de Stories', scoreSize, 6, `${storiesGrandes} story(ies) grandes demais (>=13 SP)`);

  // 10. Flow efficiency (quando houver dado)
  const fe = metrics.flowEfficiency || 0;
  const scoreFlow = fe > 0 ? Math.min(100, fe) : 70; // sem dado ainda -> neutro
  add('Flow Efficiency', scoreFlow, 8, fe > 0 ? `${fe}% de eficiência de fluxo` : 'Sem dados de fluxo ainda (neutro)');

  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const score = Math.round(components.reduce((s, c) => s + c.value * c.weight, 0) / totalWeight);

  return {
    score: Math.max(0, Math.min(100, score)),
    classification: classifyScore(Math.max(0, Math.min(100, score))),
    components,
    counters: {
      total, semResponsavel, semStoryPoints, semCriterioAceite, semDoR, semDoD,
      storiesGrandes, bugs, bugsCriticos, debitoTecnico, bloqueados, wip,
    },
  };
}

// Detecta itens problemáticos concretos (com título) para exibição em cards/rankings.
export function detectIssues(items) {
  const main = (items || []).filter((i) => !i.is_subtask);
  const col = (i) => effectiveColumn(i);
  const naoConcluido = (i) => col(i) !== 'concluido';

  return {
    bloqueados: main.filter((i) => i.bloqueado),
    semResponsavel: main.filter((i) => naoConcluido(i) && !i.responsavel),
    semStoryPoints: main.filter((i) => naoConcluido(i) && !(i.story_points > 0)),
    semCriterioAceite: main.filter((i) => naoConcluido(i) && (!i.criterio_aceite || !i.criterio_aceite.trim())),
    semDoR: main.filter((i) => naoConcluido(i) && (!i.definition_of_ready || !i.definition_of_ready.trim())),
    storiesGrandes: main.filter(isStoryTooBig),
    bugsCriticos: main.filter((i) => i.tipo === 'bug' && (i.prioridade === 'critica' || i.prioridade === 'alta') && naoConcluido(i)),
    debitoTecnico: main.filter((i) => i.tipo === 'debito_tecnico' && naoConcluido(i)),
    comDependencias: main.filter((i) => (i.dependencias || []).length > 0 && naoConcluido(i)),
  };
}

// Gera recomendações práticas priorizadas a partir dos issues + health.
export function buildRecommendations(health, issues, metrics) {
  const recs = [];
  const push = (icon, tone, text) => recs.push({ icon, tone, text });

  if (issues.bloqueados.length > 0) {
    push('🚫', 'critico', `Resolver ${issues.bloqueados.length} item(ns) bloqueado(s) — comece por "${issues.bloqueados[0].titulo}".`);
  }
  if (issues.bugsCriticos.length > 0) {
    push('🐞', 'critico', `Priorizar ${issues.bugsCriticos.length} bug(s) crítico(s)/alto(s) antes de novas features.`);
  }
  if (metrics.wip > Math.max(4, Math.ceil((health.counters.total || 0) * 0.4))) {
    push('⏳', 'atencao', `Reduzir o WIP (${metrics.wip} itens em progresso). Finalize antes de puxar novos itens.`);
  }
  if (issues.storiesGrandes.length > 0) {
    push('✂️', 'atencao', `Dividir ${issues.storiesGrandes.length} story(ies) grande(s) — ex: "${issues.storiesGrandes[0].titulo}".`);
  }
  if (issues.semResponsavel.length > 0) {
    push('👤', 'atencao', `Atribuir responsável a ${issues.semResponsavel.length} item(ns) sem dono.`);
  }
  if (issues.semCriterioAceite.length > 0 || issues.semDoR.length > 0) {
    push('📋', 'atencao', `Refinar itens sem critério de aceite (${issues.semCriterioAceite.length}) ou DoR (${issues.semDoR.length}).`);
  }
  if (issues.semStoryPoints.length > 0) {
    push('🔢', 'info', `Estimar ${issues.semStoryPoints.length} item(ns) sem Story Points (Planning Poker).`);
  }
  if (metrics.percentDecorrido > metrics.percentSprint + 25) {
    push('📉', 'critico', `Ritmo abaixo do ideal (${metrics.percentSprint}% feito x ${metrics.percentDecorrido}% do tempo). Considere replanejar a Sprint.`);
  }
  if (issues.debitoTecnico.length > 3) {
    push('🧱', 'info', `Débito técnico acumulando (${issues.debitoTecnico.length} itens). Reserve capacidade por sprint.`);
  }

  if (recs.length === 0) {
    push('✅', 'ok', 'Sprint saudável. Mantenha o ritmo e a disciplina de refinamento.');
  }
  return recs;
}

// Monta o resumo textual do contexto do projeto para enviar ao agente de IA.
export function buildAgilContext({ project, sprint, sprintItems, allItems, metrics, health, issues }) {
  const lines = [];
  lines.push(`Projeto Ágil: ${project?.name || '—'}`);
  if (project?.agil_objetivo) lines.push(`Objetivo do projeto: ${project.agil_objetivo}`);
  lines.push('');
  lines.push(`Sprint atual: ${sprint?.nome || 'nenhuma'} (status: ${sprint?.status || '—'})`);
  if (sprint?.objetivo) lines.push(`Sprint Goal: ${sprint.objetivo}`);
  lines.push(`Período: ${sprint?.data_inicio || '?'} a ${sprint?.data_fim || '?'} | Dias restantes: ${metrics.diasRestantes ?? '—'}`);
  lines.push('');
  lines.push('MÉTRICAS DA SPRINT:');
  lines.push(`- Health Score: ${health.score}/100 (${health.classification.label})`);
  lines.push(`- Itens: ${metrics.total} | Concluídos: ${metrics.done} (${metrics.percentSprint}%) | Tempo decorrido: ${metrics.percentDecorrido}%`);
  lines.push(`- Story Points: ${metrics.sp} total, ${metrics.spDone} entregues, ${metrics.spRest} restantes | Velocity: ${metrics.velocity}`);
  lines.push(`- WIP: ${metrics.wip} | Bloqueados: ${metrics.bloqueados} | Bugs: ${metrics.bugs}`);
  lines.push(`- Lead Time: ${metrics.leadTime}h | Cycle Time: ${metrics.cycleTime}h | Throughput: ${metrics.throughput} | Flow Efficiency: ${metrics.flowEfficiency}%`);
  lines.push(`- Capacidade: ${metrics.capacidade}h | Tempo gasto: ${metrics.tempoGasto}h (${metrics.capacidadeUtilizada}% utilizada)`);
  lines.push('');
  lines.push('PONTOS DE ATENÇÃO DETECTADOS:');
  lines.push(`- Sem responsável: ${issues.semResponsavel.length} | Sem Story Points: ${issues.semStoryPoints.length}`);
  lines.push(`- Sem critério de aceite: ${issues.semCriterioAceite.length} | Sem DoR: ${issues.semDoR.length}`);
  lines.push(`- Stories grandes demais (>=13 SP): ${issues.storiesGrandes.length}`);
  lines.push(`- Bugs críticos/altos: ${issues.bugsCriticos.length} | Débito técnico: ${issues.debitoTecnico.length}`);
  lines.push(`- Itens com dependências: ${issues.comDependencias.length}`);

  const listSample = (arr) => arr.slice(0, 8).map((i) => `  • ${i.titulo}${i.responsavel ? ` (${i.responsavel})` : ''}${i.story_points ? ` [${i.story_points}SP]` : ''}`).join('\n');
  if (issues.bloqueados.length) { lines.push('', 'Itens bloqueados:', listSample(issues.bloqueados)); }
  if (issues.bugsCriticos.length) { lines.push('', 'Bugs críticos:', listSample(issues.bugsCriticos)); }
  if (issues.storiesGrandes.length) { lines.push('', 'Stories grandes:', listSample(issues.storiesGrandes)); }

  lines.push('');
  lines.push('Componentes do Health Score (valor 0-100 x peso):');
  health.components.forEach((c) => lines.push(`- ${c.label}: ${c.value} (peso ${c.weight}) — ${c.detail}`));

  return lines.join('\n');
}

export const QUICK_QUESTIONS = [
  'Como está a Sprint?',
  'Existe gargalo?',
  'Quem precisa de ajuda?',
  'Quais Stories estão críticas?',
  'O que devo priorizar?',
  'Estamos dentro da capacidade?',
  'Existe risco para a entrega?',
  'Como melhorar a Velocity?',
  'Quais Bugs são prioridade?',
];