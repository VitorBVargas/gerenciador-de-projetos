// Cálculos das novas seções executivas (Saúde da Conta, IRC, Probabilidade de Renovação)
// Reutiliza apenas dados já presentes no projeto. Nenhuma lógica anterior é alterada.

/**
 * Saúde da Conta
 * Avalia qualidade da relação durante a implantação.
 */
export function calculateAccountHealth({
  healthAvg = 0,
  healthWorst = 0,
  redPeriods = 0,
  risksMaterialized = 0,
  editalPendingOpen = 0,
  baselinesCount = 1,
  delayDays = 0,
  contractDeviationDays = 0,
  implementationAccepted = false
}) {
  let score = 100;
  const positives = [];
  const negatives = [];

  // Health Score médio
  if (healthAvg >= 85) { positives.push(`Health Score médio elevado (${healthAvg})`); }
  else if (healthAvg >= 70) { score -= 5; }
  else if (healthAvg >= 55) { score -= 15; negatives.push(`Health Score médio moderado (${healthAvg})`); }
  else { score -= 25; negatives.push(`Health Score médio baixo (${healthAvg})`); }

  // Health Score mínimo
  if (healthWorst < 40) { score -= 12; negatives.push(`Health Score mínimo crítico (${healthWorst})`); }
  else if (healthWorst < 60) { score -= 6; negatives.push(`Health Score mínimo em alerta (${healthWorst})`); }
  else if (healthWorst >= 75) { positives.push(`Health Score mínimo saudável (${healthWorst})`); }

  // Períodos vermelhos
  if (redPeriods === 0) { positives.push('Nenhum período em vermelho'); }
  else if (redPeriods <= 2) { score -= 5; }
  else { score -= 12; negatives.push(`${redPeriods} períodos em vermelho`); }

  // Riscos materializados
  if (risksMaterialized === 0) { positives.push('Nenhum risco materializado'); }
  else if (risksMaterialized <= 2) { score -= 5; }
  else { score -= 12; negatives.push(`${risksMaterialized} riscos materializados`); }

  // Pendências de edital
  if (editalPendingOpen === 0) { positives.push('Sem pendências de edital'); }
  else if (editalPendingOpen <= 5) { score -= 6; negatives.push(`${editalPendingOpen} pendências de edital`); }
  else { score -= 15; negatives.push(`${editalPendingOpen} pendências de edital em aberto`); }

  // Baselines (replanejamentos)
  const replan = Math.max(0, baselinesCount - 1);
  if (replan === 0) { positives.push('Sem revisões de baseline'); }
  else if (replan <= 1) { score -= 4; }
  else { score -= 10; negatives.push(`${replan} revisões de baseline`); }

  // Atrasos
  if (delayDays <= 0) { positives.push('Cronograma cumprido no prazo'); }
  else if (delayDays <= 15) { score -= 5; }
  else if (delayDays <= 45) { score -= 12; negatives.push(`Atraso acumulado de ${delayDays} dias`); }
  else { score -= 18; negatives.push(`Atraso acumulado significativo (${delayDays} dias)`); }

  // Desvio vs prazo contratual
  if (contractDeviationDays < 0) {
    positives.push(`Entrega antecipada em ${Math.abs(contractDeviationDays)} dia(s) vs prazo contratual`);
    score += 3;
  } else if (contractDeviationDays === 0) {
    positives.push('Entrega no prazo contratual exato');
  } else if (contractDeviationDays <= 15) {
    score -= 5; negatives.push(`Entrega ${contractDeviationDays} dia(s) após o prazo contratual`);
  } else if (contractDeviationDays <= 45) {
    score -= 12; negatives.push(`Atraso contratual relevante (${contractDeviationDays} dias)`);
  } else {
    score -= 20; negatives.push(`Atraso contratual significativo (${contractDeviationDays} dias)`);
  }

  // Aceite da implantação
  if (implementationAccepted) { positives.push('Aceite da implantação registrado'); }
  else { score -= 8; negatives.push('Aceite da implantação não registrado'); }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let classification, color, semaforo;
  if (score >= 90) { classification = 'Excelente'; color = 'green'; semaforo = '🟢'; }
  else if (score >= 75) { classification = 'Saudável'; color = 'green'; semaforo = '🟢'; }
  else if (score >= 60) { classification = 'Atenção'; color = 'yellow'; semaforo = '🟡'; }
  else if (score >= 40) { classification = 'Risco'; color = 'orange'; semaforo = '🟠'; }
  else { classification = 'Crítica'; color = 'red'; semaforo = '🔴'; }

  return {
    score,
    classification,
    color,
    semaforo,
    positives: positives.slice(0, 6),
    negatives: negatives.slice(0, 6)
  };
}

/**
 * IRC — Índice de Risco Contratual
 * 0 = sem risco | 100 = risco crítico
 * Pesos:
 *  - Pendências de Edital: 30%
 *  - Health Score Médio: 20%
 *  - Baselines/Replanejamentos: 15%
 *  - Desvio de Cronograma: 15%
 *  - Riscos Materializados: 10%
 *  - Aceite da Implantação: 10%
 */
export function calculateIRC({
  editalPendingOpen = 0,
  editalTotal = 0,
  healthAvg = 0,
  baselinesCount = 1,
  delayDays = 0,
  contractDeviationDays = 0,
  risksMaterialized = 0,
  totalRisks = 0,
  implementationAccepted = false
}) {
  // 1. Pendências de edital — quanto mais abertas, maior o risco
  let editalRisk;
  if (editalTotal > 0) {
    editalRisk = Math.min(100, (editalPendingOpen / editalTotal) * 100);
  } else {
    editalRisk = Math.min(100, editalPendingOpen * 7); // 14 pendências = 98
  }

  // 2. Health Score — inverso. 100 saúde = 0 risco
  const healthRisk = Math.max(0, Math.min(100, 100 - healthAvg));

  // 3. Baselines (replanejamentos)
  const replan = Math.max(0, baselinesCount - 1);
  const baselineRisk = Math.min(100, replan * 25); // 4+ revisões = 100

  // 4. Desvio de cronograma (interno + contratual).
  //    Adiantamento contratual reduz risco; atraso aumenta.
  const internalDelayRisk = Math.max(0, delayDays) * 2;
  const contractPenalty = contractDeviationDays > 0 ? contractDeviationDays * 2 : 0;
  const contractBonus = contractDeviationDays < 0 ? Math.min(20, Math.abs(contractDeviationDays)) : 0;
  const delayRisk = Math.max(0, Math.min(100, internalDelayRisk + contractPenalty - contractBonus));

  // 5. Riscos materializados
  let riskMatRisk;
  if (totalRisks > 0) {
    riskMatRisk = Math.min(100, (risksMaterialized / totalRisks) * 100);
  } else {
    riskMatRisk = Math.min(100, risksMaterialized * 20);
  }

  // 6. Aceite da implantação
  const acceptanceRisk = implementationAccepted ? 0 : 70;

  const score = Math.round(
    editalRisk * 0.30 +
    healthRisk * 0.20 +
    baselineRisk * 0.15 +
    delayRisk * 0.15 +
    riskMatRisk * 0.10 +
    acceptanceRisk * 0.10
  );

  let classification, color, semaforo;
  if (score <= 20) { classification = 'Muito Baixo'; color = 'green'; semaforo = '🟢'; }
  else if (score <= 40) { classification = 'Baixo'; color = 'green'; semaforo = '🟢'; }
  else if (score <= 60) { classification = 'Moderado'; color = 'yellow'; semaforo = '🟡'; }
  else if (score <= 80) { classification = 'Alto'; color = 'orange'; semaforo = '🟠'; }
  else { classification = 'Crítico'; color = 'red'; semaforo = '🔴'; }

  // Principais fatores
  const factors = [
    { label: 'Pendências de edital', value: editalRisk, weight: 30 },
    { label: 'Health Score médio', value: healthRisk, weight: 20 },
    { label: 'Replanejamentos (baselines)', value: baselineRisk, weight: 15 },
    { label: 'Desvio de cronograma', value: delayRisk, weight: 15 },
    { label: 'Riscos materializados', value: riskMatRisk, weight: 10 },
    { label: 'Aceite da implantação', value: acceptanceRisk, weight: 10 }
  ].sort((a, b) => (b.value * b.weight) - (a.value * a.weight));

  return {
    score,
    classification,
    color,
    semaforo,
    components: {
      edital: Math.round(editalRisk),
      health: Math.round(healthRisk),
      baseline: Math.round(baselineRisk),
      prazo: Math.round(delayRisk),
      riscos: Math.round(riskMatRisk),
      aceite: Math.round(acceptanceRisk)
    },
    topFactors: factors.slice(0, 3)
  };
}

/**
 * Probabilidade de Renovação (0 a 100%)
 */
export function calculateRenewalProbability({
  healthAvg = 0,
  healthFinal = 0,
  editalPendingOpen = 0,
  editalTotal = 0,
  risksMaterialized = 0,
  totalRisks = 0,
  baselinesCount = 1,
  delayDays = 0,
  contractDeviationDays = 0,
  implementationAccepted = false,
  productsCount = 0,
  isiScore = 0
}) {
  let prob = 100;

  // Health Score Médio (peso forte)
  if (healthAvg < 50) prob -= 25;
  else if (healthAvg < 65) prob -= 15;
  else if (healthAvg < 80) prob -= 7;

  // Health Score Final
  if (healthFinal < 50) prob -= 12;
  else if (healthFinal < 65) prob -= 6;

  // Pendências de edital
  if (editalTotal > 0) {
    const ratio = editalPendingOpen / editalTotal;
    if (ratio > 0.5) prob -= 15;
    else if (ratio > 0.25) prob -= 8;
    else if (ratio > 0) prob -= 3;
  } else if (editalPendingOpen > 10) prob -= 12;
  else if (editalPendingOpen > 5) prob -= 6;

  // Riscos materializados
  if (totalRisks > 0) {
    const ratio = risksMaterialized / totalRisks;
    if (ratio > 0.4) prob -= 10;
    else if (ratio > 0.2) prob -= 5;
  }

  // Baselines
  const replan = Math.max(0, baselinesCount - 1);
  if (replan >= 3) prob -= 8;
  else if (replan === 2) prob -= 4;

  // Atrasos
  if (delayDays > 45) prob -= 10;
  else if (delayDays > 15) prob -= 5;

  // Desvio do prazo contratual
  if (contractDeviationDays < 0) prob += 3;
  else if (contractDeviationDays > 45) prob -= 12;
  else if (contractDeviationDays > 15) prob -= 6;
  else if (contractDeviationDays > 0) prob -= 2;

  // Aceite implantação
  if (!implementationAccepted) prob -= 8;

  // Produtos implantados (mais produtos = maior aderência)
  if (productsCount >= 5) prob += 3;
  else if (productsCount >= 3) prob += 1;

  // ISI (bônus se alto)
  if (isiScore >= 90) prob += 5;
  else if (isiScore >= 75) prob += 2;
  else if (isiScore < 60) prob -= 8;

  prob = Math.max(0, Math.min(100, Math.round(prob)));

  let classification, color, semaforo;
  if (prob >= 90) { classification = 'Excelente'; color = 'green'; semaforo = '🟢'; }
  else if (prob >= 75) { classification = 'Saudável'; color = 'green'; semaforo = '🟢'; }
  else if (prob >= 60) { classification = 'Atenção'; color = 'yellow'; semaforo = '🟡'; }
  else if (prob >= 40) { classification = 'Risco'; color = 'orange'; semaforo = '🟠'; }
  else { classification = 'Crítico'; color = 'red'; semaforo = '🔴'; }

  return { score: prob, classification, color, semaforo };
}

/**
 * Recomendações pós-projeto baseadas nos indicadores
 */
export function generatePostProjectRecommendations({ accountHealth, irc, renewal, editalPendingOpen, risksMaterialized }) {
  const cs = [];
  const comercial = [];
  const suporte = [];

  // Customer Success
  if (renewal.score < 75 || accountHealth.score < 75) {
    cs.push('Realizar reunião de acompanhamento (QBR) em até 30 dias após o encerramento');
  } else {
    cs.push('Manter cadência regular de reuniões de acompanhamento');
  }
  if (editalPendingOpen > 0) {
    cs.push(`Monitorar e dar baixa nas ${editalPendingOpen} pendência(s) de edital ainda em aberto`);
  }
  cs.push('Avaliar a adoção dos usuários e o uso real dos produtos implantados');
  if (accountHealth.score < 60) {
    cs.push('Acionar plano de recuperação da conta com plano de ação documentado');
  }

  // Comercial
  if (renewal.score >= 75) {
    comercial.push('Identificar oportunidades de expansão (novos produtos ou módulos)');
  }
  if (irc.score >= 60) {
    comercial.push('Mapear riscos de renovação e antecipar tratativa com o cliente');
  }
  if (renewal.score < 60) {
    comercial.push('Tratar a conta como prioridade de retenção — engajar diretoria comercial');
  }
  comercial.push('Manter monitoramento contínuo do IRC durante todo o ciclo contratual');

  // Suporte
  if (risksMaterialized > 0) {
    suporte.push('Acompanhar chamados relacionados aos riscos materializados durante a implantação');
  }
  if (editalPendingOpen > 0) {
    suporte.push('Priorizar chamados ligados às pendências de edital');
  }
  suporte.push('Garantir SLA preferencial nos primeiros 60 dias pós Go-Live');

  return { cs, comercial, suporte };
}