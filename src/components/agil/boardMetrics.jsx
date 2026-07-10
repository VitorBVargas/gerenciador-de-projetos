import { effectiveColumn } from './boardMeta';
import { differenceInHours, differenceInCalendarDays, parseISO } from 'date-fns';

const hoursBetween = (a, b) => {
  try { return Math.max(0, differenceInHours(new Date(b), new Date(a))); } catch { return 0; }
};

// Métricas completas de uma sprint (excluindo subtasks da contagem principal de itens)
export function computeSprintMetrics(items, sprint) {
  const main = items.filter(i => !i.is_subtask);
  const total = main.length;
  const sp = main.reduce((s, i) => s + (i.story_points || 0), 0);

  const done = main.filter(i => effectiveColumn(i) === 'concluido');
  const spDone = done.reduce((s, i) => s + (i.story_points || 0), 0);
  const spRest = sp - spDone;

  const emAndamento = main.filter(i => {
    const c = effectiveColumn(i);
    return c !== 'backlog' && c !== 'concluido';
  }).length;

  const bloqueados = main.filter(i => i.bloqueado).length;
  const bugs = main.filter(i => i.tipo === 'bug').length;

  // WIP = itens em colunas de trabalho ativo
  const wip = main.filter(i => ['em_desenvolvimento', 'code_review', 'teste', 'homologacao'].includes(effectiveColumn(i))).length;

  // Tempo parado: horas na coluna atual para itens não concluídos e não bloqueados (média das maiores paradas)
  const now = Date.now();
  const paradas = main
    .filter(i => effectiveColumn(i) !== 'concluido' && i.coluna_entrou_em)
    .map(i => { try { return Math.max(0, Math.round((now - new Date(i.coluna_entrou_em).getTime()) / 3600000)); } catch { return 0; } });
  const tempoParadoMax = paradas.length ? Math.max(...paradas) : 0;
  const tempoParadoMedio = paradas.length ? Math.round(paradas.reduce((a, b) => a + b, 0) / paradas.length) : 0;
  // Itens "parados" há mais de 48h
  const itensParados = paradas.filter(h => h >= 48).length;

  // Lead / Cycle time médios (horas) dos concluídos
  const leadVals = done.map(i => i.lead_time_horas).filter(v => typeof v === 'number' && v > 0);
  const cycleVals = done.map(i => i.cycle_time_horas).filter(v => typeof v === 'number' && v > 0);
  const leadTime = leadVals.length ? Math.round(leadVals.reduce((a, b) => a + b, 0) / leadVals.length) : 0;
  const cycleTime = cycleVals.length ? Math.round(cycleVals.reduce((a, b) => a + b, 0) / cycleVals.length) : 0;

  // Flow efficiency = cycle / lead
  const flowEfficiency = leadTime > 0 ? Math.round((cycleTime / leadTime) * 100) : 0;

  // Throughput = itens concluídos
  const throughput = done.length;

  // Datas da sprint
  let diasRestantes = null, totalDias = null, percentDecorrido = 0;
  if (sprint?.data_inicio && sprint?.data_fim) {
    try {
      const inicio = parseISO(sprint.data_inicio);
      const fim = parseISO(sprint.data_fim);
      const hoje = new Date();
      totalDias = Math.max(1, differenceInCalendarDays(fim, inicio));
      diasRestantes = differenceInCalendarDays(fim, hoje);
      const decorridos = Math.min(totalDias, Math.max(0, differenceInCalendarDays(hoje, inicio)));
      percentDecorrido = Math.round((decorridos / totalDias) * 100);
    } catch { /* ignore */ }
  }

  // Velocity = story points entregues
  const velocity = spDone;

  // Capacidade utilizada
  const tempoGasto = main.reduce((s, i) => s + (i.tempo_gasto || 0), 0);
  const capacidade = sprint?.capacidade || 0;
  const capacidadeUtilizada = capacidade > 0 ? Math.round((tempoGasto / capacidade) * 100) : 0;

  // Percentual da sprint (conclusão)
  const percentSprint = total > 0 ? Math.round((done.length / total) * 100) : 0;

  // Health da sprint: combina progresso vs tempo, bloqueios e WIP
  let health = 'ok';
  if (bloqueados > 0 || (percentDecorrido > percentSprint + 25)) health = 'atencao';
  if (bloqueados >= 3 || (percentDecorrido > percentSprint + 45)) health = 'critico';

  return {
    total, sp, spDone, spRest, done: done.length, emAndamento, bloqueados, bugs, wip,
    leadTime, cycleTime, flowEfficiency, throughput, diasRestantes, totalDias,
    percentDecorrido, velocity, tempoGasto, capacidade, capacidadeUtilizada, percentSprint, health,
    tempoParadoMax, tempoParadoMedio, itensParados,
  };
}

// Série de burnup: trabalho concluído acumulado x escopo total, por dia da sprint.
export function computeBurnup(items, sprint) {
  const main = items.filter(i => !i.is_subtask);
  const totalSp = main.reduce((s, i) => s + (i.story_points || 0), 0);
  if (!sprint?.data_inicio || !sprint?.data_fim) return { data: [], totalSp };
  const inicio = parseISO(sprint.data_inicio);
  const fim = parseISO(sprint.data_fim);
  const dias = Math.max(1, differenceInCalendarDays(fim, inicio));
  const hoje = new Date();

  const data = [];
  for (let d = 0; d <= dias; d++) {
    const dia = new Date(inicio);
    dia.setDate(inicio.getDate() + d);
    let concluido = null;
    if (dia <= hoje) {
      concluido = main.filter(i => {
        if (effectiveColumn(i) !== 'concluido') return false;
        if (!i.completed_at) return true;
        try { return new Date(i.completed_at) <= new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 23, 59, 59); } catch { return false; }
      }).reduce((s, i) => s + (i.story_points || 0), 0);
    }
    data.push({ dia: `D${d + 1}`, escopo: totalSp, concluido });
  }
  return { data, totalSp };
}

// Série de burndown ideal x real
export function computeBurndown(items, sprint) {
  const main = items.filter(i => !i.is_subtask);
  const totalSp = main.reduce((s, i) => s + (i.story_points || 0), 0);
  if (!sprint?.data_inicio || !sprint?.data_fim) {
    return { data: [], totalSp };
  }
  const inicio = parseISO(sprint.data_inicio);
  const fim = parseISO(sprint.data_fim);
  const dias = Math.max(1, differenceInCalendarDays(fim, inicio));
  const hoje = new Date();

  // SP concluídos por dia (com base em completed_at)
  const data = [];
  for (let d = 0; d <= dias; d++) {
    const dia = new Date(inicio);
    dia.setDate(inicio.getDate() + d);
    const ideal = Math.round((totalSp - (totalSp / dias) * d) * 10) / 10;
    let real = null;
    if (dia <= hoje) {
      const concluidosAte = main.filter(i => {
        if (effectiveColumn(i) !== 'concluido') return false;
        if (!i.completed_at) return true; // conta como já concluído
        try { return new Date(i.completed_at) <= new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 23, 59, 59); } catch { return false; }
      }).reduce((s, i) => s + (i.story_points || 0), 0);
      real = totalSp - concluidosAte;
    }
    data.push({
      dia: `D${d + 1}`,
      ideal,
      real,
    });
  }
  return { data, totalSp };
}

export { hoursBetween };