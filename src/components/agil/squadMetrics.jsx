// Cálculo de métricas do Squad e de Produtos a partir do backlog ágil (dados reais).

const DONE = ['concluido'];
const IN_PROGRESS = ['em_andamento', 'em_revisao', 'to_do'];

// Métricas por membro da equipe, derivadas do backlog + sprints.
export function computeMemberMetrics(member, backlog, sprints) {
  const items = backlog.filter(b => (b.responsavel || '').trim() === (member.nome || '').trim());
  const done = items.filter(i => DONE.includes(i.status));
  const inProgress = items.filter(i => IN_PROGRESS.includes(i.status) && !DONE.includes(i.status));
  const bugs = items.filter(i => i.tipo === 'bug' && !DONE.includes(i.status));

  const storyPointsEntregues = done.reduce((s, i) => s + (Number(i.story_points) || 0), 0);
  const storiesAndamento = inProgress.length;

  // Velocidade média = SP entregues / nº de sprints concluídas em que o membro entregou algo.
  const sprintsConcluidas = sprints.filter(s => s.status === 'concluida');
  const sprintsComEntrega = new Set(done.filter(i => i.sprint_id).map(i => i.sprint_id));
  const sprintsParticipadas = new Set(items.filter(i => i.sprint_id).map(i => i.sprint_id));
  const divisor = sprintsComEntrega.size || 1;
  const velocidadeMedia = Math.round((storyPointsEntregues / divisor) * 10) / 10;

  const horasPlanejadas = Number(member.horas_planejadas) || 0;
  const horasExecutadas = Number(member.horas_executadas) || 0;
  const capacidade = Number(member.capacidade_semanal) || 0;

  // Carga atual (%) = horas planejadas / capacidade semanal.
  const cargaAtual = capacidade > 0 ? Math.round((horasPlanejadas / capacidade) * 100) : 0;
  // Ocupação (%) = horas executadas / capacidade semanal.
  const ocupacao = capacidade > 0 ? Math.round((horasExecutadas / capacidade) * 100) : 0;
  const disponibilidade = member.disponibilidade == null ? 100 : Number(member.disponibilidade);

  // Risco de burnout: alta carga + baixa disponibilidade + estouro de execução.
  let burnout = 0;
  if (cargaAtual > 100) burnout += 40;
  else if (cargaAtual > 90) burnout += 25;
  else if (cargaAtual > 80) burnout += 10;
  if (ocupacao > 100) burnout += 30;
  else if (ocupacao > 90) burnout += 15;
  if (disponibilidade < 60) burnout += 20;
  if (bugs.length >= 3) burnout += 10;
  burnout = Math.min(100, burnout);

  return {
    storyPointsEntregues,
    storiesAndamento,
    bugs: bugs.length,
    velocidadeMedia,
    sprintsParticipadas: sprintsParticipadas.size,
    sprintsConcluidas: sprintsConcluidas.length,
    horasPlanejadas,
    horasExecutadas,
    capacidade,
    disponibilidade,
    cargaAtual,
    ocupacao,
    burnout,
  };
}

export function burnoutLevel(v) {
  if (v >= 70) return { label: 'Crítico', color: 'text-red-400', bar: 'bg-red-500' };
  if (v >= 45) return { label: 'Alto', color: 'text-orange-400', bar: 'bg-orange-500' };
  if (v >= 20) return { label: 'Moderado', color: 'text-amber-400', bar: 'bg-amber-500' };
  return { label: 'Saudável', color: 'text-emerald-400', bar: 'bg-emerald-500' };
}

// Métricas por produto, derivadas do backlog (campo `produto`) + sprints.
export function computeProductMetrics(product, backlog, sprints) {
  const items = backlog.filter(b => (b.produto || '').trim() === (product.produto || '').trim());
  const byType = (t) => items.filter(i => i.tipo === t);

  const epics = byType('epic').length;
  const features = byType('feature').length;
  const stories = byType('story').length;
  const bugsAbertos = items.filter(i => i.tipo === 'bug' && !DONE.includes(i.status)).length;
  const debitoTecnico = items.filter(i => i.tipo === 'debito_tecnico' && !DONE.includes(i.status)).length;

  const total = items.length;
  const concluidos = items.filter(i => DONE.includes(i.status)).length;
  const percentConcluido = total > 0 ? Math.round((concluidos / total) * 100) : 0;

  // Health do produto (0-100): progresso penalizado por bugs e débito técnico.
  let health = percentConcluido;
  health -= Math.min(30, bugsAbertos * 5);
  health -= Math.min(20, debitoTecnico * 4);
  health = Math.max(0, Math.min(100, health));

  // Velocity do produto = SP entregues por sprint concluída.
  const spEntregues = items.filter(i => DONE.includes(i.status)).reduce((s, i) => s + (Number(i.story_points) || 0), 0);
  const sprintsComItens = new Set(items.filter(i => i.sprint_id).map(i => i.sprint_id));
  const velocity = sprintsComItens.size > 0 ? Math.round((spEntregues / sprintsComItens.size) * 10) / 10 : 0;

  // Última sprint com item deste produto.
  const sprintIds = new Set(items.map(i => i.sprint_id).filter(Boolean));
  const sprintsDoProduto = sprints.filter(s => sprintIds.has(s.id));
  const ultimaSprint = sprintsDoProduto.sort((a, b) => (b.ordem || 0) - (a.ordem || 0))[0] || null;

  return {
    epics, features, stories, bugsAbertos, debitoTecnico,
    total, concluidos, percentConcluido, health, velocity, spEntregues,
    ultimaSprint,
  };
}

export function healthLevel(v) {
  if (v >= 75) return { label: 'Saudável', color: 'text-emerald-400', bar: 'bg-emerald-500', badge: 'bg-emerald-500/15 text-emerald-300' };
  if (v >= 50) return { label: 'Atenção', color: 'text-amber-400', bar: 'bg-amber-500', badge: 'bg-amber-500/15 text-amber-300' };
  if (v >= 25) return { label: 'Em risco', color: 'text-orange-400', bar: 'bg-orange-500', badge: 'bg-orange-500/15 text-orange-300' };
  return { label: 'Crítico', color: 'text-red-400', bar: 'bg-red-500', badge: 'bg-red-500/15 text-red-300' };
}

export const senioridadeMeta = {
  estagiario: 'Estagiário',
  junior: 'Júnior',
  pleno: 'Pleno',
  senior: 'Sênior',
  especialista: 'Especialista',
};