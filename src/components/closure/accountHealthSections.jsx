// Renderiza as novas seções executivas no PDF de encerramento (Saúde da Conta, IRC, Renovação, Visão Pós-Projeto, Recomendações e Conclusão Consolidada).
// Recebe utilitários (newPage, sectionTitle, kpiCard, autoTable, ensureSpace) e COLORS via parâmetro.

function colorByCategory(color, COLORS) {
  if (color === 'green') return COLORS.success;
  if (color === 'yellow') return COLORS.warning;
  if (color === 'orange') return [251, 146, 60]; // orange-400
  if (color === 'red') return COLORS.danger;
  return COLORS.primary;
}

function drawSemaforo(doc, x, y, activeColor, COLORS) {
  const order = ['green', 'yellow', 'orange', 'red'];
  order.forEach((c, idx) => {
    const active = c === activeColor;
    const col = colorByCategory(c, COLORS);
    doc.setFillColor(...(active ? col : COLORS.bgAlt));
    doc.circle(x + idx * 6, y, 2.2, 'F');
  });
}

function drawBigScoreCard(doc, x, y, w, h, { score, classification, color, suffix = '/ 100', subtitle = '' }, COLORS) {
  doc.setFillColor(...COLORS.bgCard);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  const valueColor = colorByCategory(color, COLORS);

  doc.setTextColor(...valueColor);
  doc.setFontSize(34);
  doc.setFont(undefined, 'bold');
  doc.text(String(score), x + 8, y + h / 2 + 5);

  doc.setFont(undefined, 'normal');
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(9);
  doc.text(suffix, x + 8 + doc.getTextWidth(String(score)) + 2, y + h / 2 + 5);

  doc.setTextColor(...COLORS.text);
  doc.setFontSize(13);
  doc.setFont(undefined, 'bold');
  doc.text(classification.toUpperCase(), x + w / 2 + 8, y + 12);

  doc.setFont(undefined, 'normal');
  drawSemaforo(doc, x + w / 2 + 10, y + 20, color, COLORS);

  if (subtitle) {
    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(7.5);
    const lines = doc.splitTextToSize(subtitle, w / 2 - 12);
    doc.text(lines, x + w / 2 + 8, y + 28);
  }
}

export function renderAccountHealthSection(doc, accountHealth, helpers, COLORS) {
  const { newPage, sectionTitle, ensureSpace, autoTable, MARGIN, PAGE_W, projectName } = helpers;
  let y = helpers.y;

  y = ensureSpace(doc, y, 90, projectName);
  y = sectionTitle(doc, '11. Saúde da Conta', y);

  // Card principal
  drawBigScoreCard(doc, MARGIN, y, PAGE_W - 2 * MARGIN, 36, {
    score: accountHealth.score,
    classification: accountHealth.classification,
    color: accountHealth.color,
    subtitle: 'Avalia a qualidade da relação construída durante a implantação.'
  }, COLORS);
  y += 40;

  // Fatores positivos e negativos lado a lado
  const colW = (PAGE_W - 2 * MARGIN - 4) / 2;
  const positivesRows = (accountHealth.positives.length ? accountHealth.positives : ['—']).map(p => [p]);
  const negativesRows = (accountHealth.negatives.length ? accountHealth.negatives : ['—']).map(n => [n]);

  // Header positivos
  doc.setFillColor(...COLORS.bgCard);
  doc.roundedRect(MARGIN, y, colW, 7, 1, 1, 'F');
  doc.setTextColor(...COLORS.success);
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text('Fatores Positivos', MARGIN + 3, y + 5);

  doc.setFillColor(...COLORS.bgCard);
  doc.roundedRect(MARGIN + colW + 4, y, colW, 7, 1, 1, 'F');
  doc.setTextColor(...COLORS.danger);
  doc.text('Fatores Negativos', MARGIN + colW + 7, y + 5);
  doc.setFont(undefined, 'normal');
  y += 9;

  // Listas
  doc.setFontSize(8);
  let yPos = y;
  let yNeg = y;
  positivesRows.forEach(([p]) => {
    doc.setTextColor(...COLORS.success);
    doc.text('•', MARGIN + 2, yPos + 3.5);
    doc.setTextColor(...COLORS.text);
    const wrapped = doc.splitTextToSize(p, colW - 8);
    doc.text(wrapped, MARGIN + 6, yPos + 3.5);
    yPos += wrapped.length * 4 + 2;
  });
  negativesRows.forEach(([n]) => {
    doc.setTextColor(...COLORS.danger);
    doc.text('•', MARGIN + colW + 6, yNeg + 3.5);
    doc.setTextColor(...COLORS.text);
    const wrapped = doc.splitTextToSize(n, colW - 8);
    doc.text(wrapped, MARGIN + colW + 10, yNeg + 3.5);
    yNeg += wrapped.length * 4 + 2;
  });
  y = Math.max(yPos, yNeg) + 4;

  return y;
}

export function renderIRCSection(doc, irc, helpers, COLORS) {
  const { sectionTitle, ensureSpace, autoTable, MARGIN, PAGE_W, projectName } = helpers;
  let y = helpers.y;

  y = ensureSpace(doc, y, 95, projectName);
  y = sectionTitle(doc, '12. Índice de Risco Contratual (IRC)', y);

  drawBigScoreCard(doc, MARGIN, y, PAGE_W - 2 * MARGIN, 36, {
    score: irc.score,
    classification: irc.classification,
    color: irc.color,
    subtitle: 'Mede a probabilidade de desgaste da relação contratual após o encerramento. Quanto maior, maior o risco.'
  }, COLORS);
  y += 42;

  // Faixas
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(7.5);
  doc.text('Faixas: 0-20 Muito Baixo • 21-40 Baixo • 41-60 Moderado • 61-80 Alto • 81-100 Crítico', MARGIN, y);
  y += 6;

  // Top fatores
  if (irc.topFactors && irc.topFactors.length > 0) {
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Principais fatores de impacto:', MARGIN, y);
    doc.setFont(undefined, 'normal');
    y += 5;
    irc.topFactors.forEach(f => {
      doc.setTextColor(...COLORS.warning);
      doc.text('•', MARGIN + 2, y + 3);
      doc.setTextColor(...COLORS.text);
      doc.setFontSize(8.5);
      doc.text(`${f.label} — risco ${Math.round(f.value)} (peso ${f.weight}%)`, MARGIN + 6, y + 3);
      y += 5;
    });
    y += 2;
  }

  return y;
}

export function renderRenewalSection(doc, renewal, helpers, COLORS) {
  const { sectionTitle, ensureSpace, MARGIN, PAGE_W, projectName } = helpers;
  let y = helpers.y;

  y = ensureSpace(doc, y, 60, projectName);
  y = sectionTitle(doc, '13. Probabilidade de Renovação', y);

  drawBigScoreCard(doc, MARGIN, y, PAGE_W - 2 * MARGIN, 36, {
    score: renewal.score,
    classification: renewal.classification,
    color: renewal.color,
    suffix: '%',
    subtitle: 'Estimativa da chance de continuidade do relacionamento contratual com base nos indicadores do projeto.'
  }, COLORS);
  y += 40;

  // Faixas
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(7.5);
  doc.text('Faixas: 90-100% Excelente • 75-89% Saudável • 60-74% Atenção • 40-59% Risco • <40% Crítico', MARGIN, y);
  y += 6;

  return y;
}

export function renderPostProjectViewSection(doc, indicators, helpers, COLORS) {
  const { newPage, sectionTitle, ensureSpace, MARGIN, PAGE_W, projectName } = helpers;
  newPage(doc, projectName);
  let y = 20;

  y = sectionTitle(doc, '14. Visão da Conta Pós-Projeto', y);

  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(8);
  doc.text('Visão executiva para Diretoria, PMO, Comercial e Customer Success.', MARGIN, y);
  y += 6;

  const cards = [
    {
      icon: '★',
      label: 'Índice de Sucesso (ISI)',
      score: indicators.isi.score,
      suffix: '/ 100',
      classification: indicators.isi.classification,
      color: indicators.isi.color === 'lime' ? 'green' : indicators.isi.color,
      explanation: 'Sucesso geral da entrega da implantação.'
    },
    {
      icon: '!',
      label: 'Risco Contratual (IRC)',
      score: indicators.irc.score,
      suffix: '/ 100',
      classification: indicators.irc.classification,
      color: indicators.irc.color,
      explanation: 'Probabilidade de desgaste na relação contratual.'
    },
    {
      icon: '♥',
      label: 'Saúde da Conta',
      score: indicators.accountHealth.score,
      suffix: '/ 100',
      classification: indicators.accountHealth.classification,
      color: indicators.accountHealth.color,
      explanation: 'Qualidade do relacionamento construído.'
    }
  ];

  const cardW = (PAGE_W - 2 * MARGIN - 6) / 2;
  const cardH = 60;
  cards.forEach((c, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = MARGIN + col * (cardW + 6);
    const cy = y + row * (cardH + 6);

    doc.setFillColor(...COLORS.bgCard);
    doc.roundedRect(x, cy, cardW, cardH, 2, 2, 'F');

    // Ícone
    doc.setFillColor(...colorByCategory(c.color, COLORS));
    doc.roundedRect(x + 5, cy + 5, 10, 10, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(c.icon, x + 10, cy + 12, { align: 'center' });

    // Label
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(8);
    doc.text(c.label, x + 18, cy + 11);

    // Valor
    doc.setTextColor(...colorByCategory(c.color, COLORS));
    doc.setFontSize(26);
    doc.setFont(undefined, 'bold');
    doc.text(String(c.score), x + 5, cy + 32);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...COLORS.textMuted);
    doc.text(c.suffix, x + 5 + doc.getTextWidth(String(c.score)) + 1, cy + 32);

    // Classificação + semáforo
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(c.classification.toUpperCase(), x + 5, cy + 40);
    doc.setFont(undefined, 'normal');
    drawSemaforo(doc, x + 7, cy + 46, c.color, COLORS);

    // Explicação
    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(7.5);
    const lines = doc.splitTextToSize(c.explanation, cardW - 10);
    doc.text(lines, x + 5, cy + 54);
  });
  const rowsUsed = Math.ceil(cards.length / 2);
  y += rowsUsed * (cardH + 6);

  return y;
}

export function renderRecommendationsSection(doc, recs, helpers, COLORS) {
  const { newPage, sectionTitle, ensureSpace, MARGIN, PAGE_W, projectName } = helpers;
  let y = helpers.y;

  y = ensureSpace(doc, y, 80, projectName);
  y = sectionTitle(doc, '15. Recomendações Pós-Projeto', y);

  const groups = [
    { title: 'Para Customer Success', items: recs.cs, color: COLORS.primary },
    { title: 'Para Comercial', items: recs.comercial, color: COLORS.indigo },
    { title: 'Para Suporte', items: recs.suporte, color: COLORS.success }
  ];

  groups.forEach(g => {
    const blockH = 10 + g.items.length * 6;
    y = ensureSpace(doc, y, blockH + 4, projectName);
    doc.setFillColor(...COLORS.bgCard);
    doc.roundedRect(MARGIN, y, PAGE_W - 2 * MARGIN, blockH, 1.5, 1.5, 'F');

    doc.setFillColor(...g.color);
    doc.rect(MARGIN, y, 1.5, blockH, 'F');

    doc.setTextColor(...g.color);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(g.title, MARGIN + 4, y + 6);
    doc.setFont(undefined, 'normal');

    let yi = y + 10;
    g.items.forEach(item => {
      doc.setTextColor(...COLORS.primary);
      doc.setFontSize(8);
      doc.text('•', MARGIN + 5, yi + 2);
      doc.setTextColor(...COLORS.text);
      const wrapped = doc.splitTextToSize(item, PAGE_W - 2 * MARGIN - 12);
      doc.text(wrapped[0] || item, MARGIN + 9, yi + 2);
      yi += 5.5;
    });
    y += blockH + 4;
  });

  return y;
}

export function renderConsolidatedConclusionSection(doc, data, helpers, COLORS) {
  const { newPage, sectionTitle, ensureSpace, MARGIN, PAGE_W, projectName } = helpers;
  newPage(doc, projectName);
  let y = 20;

  y = sectionTitle(doc, '16. Conclusão Executiva Consolidada', y);

  const {
    project, isi, irc, accountHealth,
    healthAvg, delayDays, risksMaterialized, baselinesCount,
    editalPendingOpen, productsCount
  } = data;

  // Mini-resumo no topo
  const indicatorLine = `ISI ${isi.score} • IRC ${irc.score} • Saúde ${accountHealth.score}`;
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(9);
  doc.text(indicatorLine, MARGIN, y);
  y += 6;

  // Texto consolidado
  const paragraphs = [];

  // 1. Como foi a implantação
  paragraphs.push(`Implantação do projeto "${project.name}" concluída com Índice de Sucesso (ISI) de ${isi.score} pontos (${isi.classification}), entregando ${productsCount} produto(s) ao cliente.`);

  // 2. Sucessos
  const sucessos = [];
  if (healthAvg >= 75) sucessos.push(`Health Score médio elevado (${healthAvg})`);
  if (delayDays <= 5) sucessos.push('cronograma cumprido no prazo planejado');
  if (risksMaterialized === 0) sucessos.push('nenhum risco materializado');
  if (baselinesCount <= 1) sucessos.push('execução sem necessidade de replanejamento');
  if (sucessos.length === 0) sucessos.push('entrega contratual realizada apesar das adversidades do projeto');
  paragraphs.push(`Como principais sucessos destacam-se: ${sucessos.join('; ')}.`);

  // 3. Dificuldades
  const dificuldades = [];
  if (healthAvg < 65) dificuldades.push(`Health Score médio abaixo do esperado (${healthAvg})`);
  if (delayDays > 15) dificuldades.push(`atraso acumulado de ${delayDays} dia(s)`);
  if (risksMaterialized > 0) dificuldades.push(`${risksMaterialized} risco(s) materializado(s) durante a execução`);
  if (baselinesCount > 2) dificuldades.push(`${baselinesCount - 1} revisão(ões) de baseline`);
  if (editalPendingOpen > 0) dificuldades.push(`${editalPendingOpen} pendência(s) de edital ainda em aberto`);
  if (dificuldades.length === 0) {
    paragraphs.push('Não foram identificadas dificuldades estruturais relevantes durante a execução.');
  } else {
    paragraphs.push(`Principais dificuldades enfrentadas: ${dificuldades.join('; ')}.`);
  }

  // 4. Situação atual + 5. Risco futuro
  paragraphs.push(`A Saúde da Conta encontra-se classificada como ${accountHealth.classification.toUpperCase()} (${accountHealth.score}/100), enquanto o Índice de Risco Contratual (IRC) registra ${irc.score} pontos — risco ${irc.classification.toUpperCase()}.`);

  // 6. Recomendações executivas
  let recomendacaoExec;
  if (accountHealth.score >= 75 && irc.score <= 40) {
    recomendacaoExec = 'Recomenda-se manter a cadência regular de relacionamento e explorar oportunidades de expansão com o cliente.';
  } else if (accountHealth.score >= 60 || irc.score <= 60) {
    recomendacaoExec = 'Recomenda-se ativar plano de acompanhamento próximo do Customer Success, com revisão executiva nos próximos 30 dias.';
  } else {
    recomendacaoExec = 'Recomenda-se tratar a conta como prioridade de retenção, com engajamento direto da Diretoria Comercial, plano de recuperação estruturado e SLA preferencial de suporte.';
  }
  paragraphs.push(recomendacaoExec);

  // Renderiza
  doc.setFillColor(...COLORS.bgCard);
  const fullText = paragraphs.join('\n\n');
  const allLines = doc.splitTextToSize(fullText, PAGE_W - 2 * MARGIN - 8);
  const boxH = allLines.length * 5 + 10;
  doc.roundedRect(MARGIN, y, PAGE_W - 2 * MARGIN, boxH, 2, 2, 'F');
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(9.5);
  doc.text(allLines, MARGIN + 4, y + 7);
  y += boxH + 4;

  return y;
}