// Cálculos extras para o relatório executivo:
// - Resumo Comercial (potencial de expansão, oportunidades, upsells, risco de renovação)
// - Projeto Destaque (selo de excelência)
// - Benchmark de portfólio

/**
 * Identifica se o projeto se qualifica como "Projeto Destaque do Portfólio".
 * Critérios: ISI > 90, IRC < 20, sem atraso relevante, sem pendências críticas.
 */
export function evaluateHighlightProject({ isiScore, ircScore, delayDays, editalOverdue, risksMaterialized }) {
  const isi = isiScore > 90;
  const irc = ircScore < 20;
  const prazo = (delayDays || 0) <= 5;
  const pendencias = (editalOverdue || 0) === 0 && (risksMaterialized || 0) === 0;

  const passed = isi && irc && prazo && pendencias;

  return {
    passed,
    criteria: [
      { label: 'ISI > 90', value: isiScore, ok: isi },
      { label: 'IRC < 20', value: ircScore, ok: irc },
      { label: 'Sem atraso relevante (≤ 5 dias)', value: `${delayDays || 0} dia(s)`, ok: prazo },
      { label: 'Sem pendências críticas', value: `${editalOverdue || 0} atrasadas / ${risksMaterialized || 0} riscos`, ok: pendencias }
    ]
  };
}

/**
 * Gera dados de Resumo Comercial baseado nos indicadores.
 */
export function buildCommercialSummary({
  products = [],
  renewalScore = 0,
  ircScore = 0,
  isiScore = 0,
  accountHealthScore = 0,
  productsCount = 0
}) {
  let expansao;
  if (renewalScore >= 75 && accountHealthScore >= 75) {
    expansao = 'ALTO — conta saudável, abertura para novos produtos/módulos.';
  } else if (renewalScore >= 60) {
    expansao = 'MODERADO — possível após estabilização da operação.';
  } else {
    expansao = 'BAIXO — priorizar retenção antes de oferecer novos itens.';
  }

  const oportunidades = [];
  if (isiScore >= 80) oportunidades.push('Estudo de caso / referência comercial para projetos similares.');
  if (renewalScore >= 75) oportunidades.push('Renovação contratual antecipada com condições especiais.');
  if (productsCount >= 3) oportunidades.push('Pacotes integrados aproveitando a base já implantada.');
  if (accountHealthScore >= 80) oportunidades.push('Indicação ativa para outros clientes do segmento.');
  if (oportunidades.length === 0) oportunidades.push('Reavaliar após plano de recuperação da conta.');

  const productNames = products.map(p => (p.name || '').toLowerCase());
  const upsells = [];
  if (productNames.some(n => n.includes('arrecada'))) upsells.push('Módulos de cobrança digital e dívida ativa avançada.');
  if (productNames.some(n => n.includes('contab'))) upsells.push('Painéis gerenciais e BI Contábil.');
  if (productNames.some(n => n.includes('compras'))) upsells.push('Integração com portais de licitação e fornecedores.');
  if (productNames.some(n => n.includes('pessoal') || n.includes('rh'))) upsells.push('eSocial completo e gestão de ponto.');
  if (productNames.some(n => n.includes('educa'))) upsells.push('Diário digital, Conecta família e portais cidadão.');
  if (productNames.some(n => n.includes('saude') || n.includes('saúde'))) upsells.push('Prontuário eletrônico e regulação.');
  if (upsells.length === 0) upsells.push('Mapear necessidades em reunião comercial dedicada.');

  let riscoRenovacao;
  if (renewalScore >= 75 && ircScore <= 40) {
    riscoRenovacao = 'BAIXO — cenário favorável à renovação.';
  } else if (renewalScore >= 60 || ircScore <= 60) {
    riscoRenovacao = 'MODERADO — acompanhar de perto nos próximos 90 dias.';
  } else {
    riscoRenovacao = 'ALTO — ativar plano de retenção com Diretoria Comercial.';
  }

  return { expansao, oportunidades, upsells, riscoRenovacao };
}

/**
 * Calcula benchmark do ISI vs portfólio.
 */
export function calculateBenchmark({ currentIsi, portfolioIsis = [] }) {
  if (portfolioIsis.length === 0) {
    return { available: false };
  }
  const avg = Math.round(portfolioIsis.reduce((a, b) => a + b, 0) / portfolioIsis.length);
  const lower = portfolioIsis.filter(v => v < currentIsi).length;
  const percentile = Math.round((lower / portfolioIsis.length) * 100);
  const topPercent = Math.max(1, 100 - percentile);

  let label;
  if (topPercent <= 25) label = `Top ${topPercent}% dos projetos`;
  else if (topPercent <= 50) label = `Acima da mediana do portfólio`;
  else label = `Abaixo da média do portfólio`;

  return {
    available: true,
    avg,
    current: currentIsi,
    percentile,
    topPercent,
    label,
    sampleSize: portfolioIsis.length
  };
}