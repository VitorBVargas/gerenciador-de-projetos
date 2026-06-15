// Utilitários para o Relatório Executivo de Encerramento

/**
 * Extrai a "cidade" a partir do nome do projeto.
 * Heurística: pega a primeira palavra (ou conjunto antes de marcadores comuns).
 * Ex.: "Ubá Educação" -> "Ubá" ; "Criciúma GRP" -> "Criciúma"
 */
export function extractCityFromProjectName(projectName = '') {
  if (!projectName) return '';
  // Remove sufixos comuns
  const cleaned = projectName.trim();
  // Pega até o primeiro marcador conhecido ou primeira palavra significativa
  const markers = [' - ', ' – ', ' / '];
  let base = cleaned;
  for (const m of markers) {
    if (base.includes(m)) {
      base = base.split(m)[0];
      break;
    }
  }
  // Se tiver várias palavras, normalmente a cidade é a primeira (capitalizada)
  // Mantemos só a primeira palavra que começa com maiúscula como heurística simples
  const parts = base.split(/\s+/);
  if (parts.length === 1) return parts[0];
  // Cidades compostas (ex.: "Belo Horizonte", "São Paulo") - pega até 2 palavras se ambas começam com maiúscula
  const known2WordPrefixes = ['São', 'Santa', 'Santo', 'Belo', 'Rio', 'Nova', 'Novo', 'Porto'];
  if (known2WordPrefixes.includes(parts[0]) && parts[1] && /^[A-ZÀ-Ý]/.test(parts[1])) {
    return `${parts[0]} ${parts[1]}`;
  }
  return parts[0];
}

/**
 * Diferença em dias entre duas datas (ISO string ou Date).
 */
export function diffInDays(a, b) {
  if (!a || !b) return null;
  const d1 = new Date(a).getTime();
  const d2 = new Date(b).getTime();
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

/**
 * Classifica health score em categoria visual.
 */
export function classifyHealthScore(score) {
  if (score >= 80) return { label: 'Saudável', color: 'green' };
  if (score >= 60) return { label: 'Atenção', color: 'yellow' };
  if (score >= 40) return { label: 'Em Risco', color: 'orange' };
  return { label: 'Crítico', color: 'red' };
}

/**
 * Calcula Índice de Sucesso da Implantação (ISI).
 * Pesos:
 *  - Health Score Médio: 30%
 *  - Prazo (atraso acumulado): 25%
 *  - Riscos Materializados: 15%
 *  - Pendências de Edital: 15%
 *  - Baselines/Replanejamentos: 15%
 */
export function calculateISI({
  healthScoreAvg = 0,
  delayDays = 0,                  // atraso acumulado em dias (cronograma interno)
  contractDeviationDays = 0,      // desvio vs prazo contratual: + atrasado, - adiantado
  risksMaterialized = 0,          // qtd
  totalRisks = 0,
  editalPendingOpen = 0,
  editalTotal = 0,
  baselinesCount = 1              // V1 conta como 1 (não é replanejamento)
}) {
  // 1. Health Score (0-100) -> direto
  const healthComponent = Math.max(0, Math.min(100, healthScoreAvg));

  // 2. Prazo: combina atraso acumulado interno + desvio do prazo contratual.
  //    Desvio contratual positivo (atrasado) penaliza; negativo (adiantado) bonifica.
  const contractPenalty = contractDeviationDays > 0 ? contractDeviationDays * 2 : 0;
  const contractBonus = contractDeviationDays < 0 ? Math.min(10, Math.abs(contractDeviationDays) * 0.5) : 0;
  const prazoComponent = Math.max(0, Math.min(100, 100 - delayDays * 2 - contractPenalty + contractBonus));

  // 3. Riscos materializados: razão sobre total; 100 se 0
  const riskRatio = totalRisks > 0 ? (risksMaterialized / totalRisks) : 0;
  const riskComponent = Math.max(0, 100 - riskRatio * 100);

  // 4. Pendências edital: razão de abertos sobre total; 100 se 0
  const editalRatio = editalTotal > 0 ? (editalPendingOpen / editalTotal) : 0;
  const editalComponent = Math.max(0, 100 - editalRatio * 100);

  // 5. Baselines: 100 se só houve V1; perde 15 por replanejamento; mín 0
  const replanejamentos = Math.max(0, baselinesCount - 1);
  const baselineComponent = Math.max(0, 100 - replanejamentos * 15);

  const score =
    healthComponent * 0.30 +
    prazoComponent * 0.25 +
    riskComponent * 0.15 +
    editalComponent * 0.15 +
    baselineComponent * 0.15;

  const final = Math.round(score);
  let classification, color;
  if (final >= 90) { classification = 'Excelente'; color = 'green'; }
  else if (final >= 75) { classification = 'Bom'; color = 'lime'; }
  else if (final >= 60) { classification = 'Atenção'; color = 'yellow'; }
  else { classification = 'Crítico'; color = 'red'; }

  return {
    score: final,
    classification,
    color,
    components: {
      health: Math.round(healthComponent),
      prazo: Math.round(prazoComponent),
      risco: Math.round(riskComponent),
      edital: Math.round(editalComponent),
      baseline: Math.round(baselineComponent)
    }
  };
}

/**
 * Gera conclusão textual automática (sem IA) com base nos indicadores.
 */
export function generateAutoConclusion({ isi, healthAvg, delayDays, risksMaterialized, baselinesCount, productsCount, projectName }) {
  const parts = [];

  parts.push(`O projeto "${projectName}" foi concluído com Índice de Sucesso da Implantação (ISI) de ${isi.score} pontos (${isi.classification}).`);

  // Health Score
  if (healthAvg >= 80) {
    parts.push(`O Health Score médio de ${healthAvg} pontos demonstra alta saúde operacional durante a execução.`);
  } else if (healthAvg >= 60) {
    parts.push(`O Health Score médio de ${healthAvg} pontos indica desempenho dentro do esperado, com pontos de atenção monitorados.`);
  } else {
    parts.push(`O Health Score médio de ${healthAvg} pontos sinaliza desafios relevantes enfrentados ao longo do projeto.`);
  }

  // Prazo
  if (delayDays <= 0) {
    parts.push(`O cronograma foi cumprido dentro do prazo planejado, sem atrasos relevantes.`);
  } else if (delayDays <= 15) {
    parts.push(`Houve atraso acumulado de ${delayDays} dia(s) no cronograma, dentro de margem aceitável.`);
  } else {
    parts.push(`O cronograma apresentou atraso acumulado de ${delayDays} dia(s), exigindo replanejamentos durante a execução.`);
  }

  // Riscos
  if (risksMaterialized === 0) {
    parts.push(`Nenhum risco se materializou, indicando boa antecipação e mitigação preventiva.`);
  } else {
    parts.push(`${risksMaterialized} risco(s) se materializaram durante a execução e foram tratados pela equipe.`);
  }

  // Baselines
  if (baselinesCount <= 1) {
    parts.push(`Não houve revisões de baseline, mantendo o planejamento inicial.`);
  } else {
    parts.push(`Foram registradas ${baselinesCount - 1} revisão(ões) de baseline ao longo do projeto.`);
  }

  // Produtos
  parts.push(`${productsCount} produto(s) foram implantados com sucesso.`);

  // Recomendação final
  if (isi.score >= 90) {
    parts.push(`Resultado: implantação de excelência, pronta para servir como referência interna.`);
  } else if (isi.score >= 75) {
    parts.push(`Resultado: implantação bem-sucedida, com aprendizados relevantes para projetos futuros.`);
  } else if (isi.score >= 60) {
    parts.push(`Resultado: implantação concluída com pontos de atenção que devem ser revisados no PMO.`);
  } else {
    parts.push(`Resultado: implantação concluída com desafios críticos — recomenda-se análise aprofundada das lições aprendidas.`);
  }

  return parts.join(' ');
}

export const PORTFOLIO_LABELS = {
  grandes_contas_sc_mg: 'Grandes Contas SC/MG',
  grandes_contas_sc_sp: 'Grandes Contas SC/SP',
  medias_contas: 'Médias Contas'
};

export function formatCurrencyBR(value) {
  if (!value && value !== 0) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value);
}

export function formatDateBR(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR');
  } catch {
    return '—';
  }
}