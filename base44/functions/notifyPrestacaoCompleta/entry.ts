import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Lista fixa de destinatários das notificações de prestação de contas
const RECIPIENTS = [
  'vitor.vargas@betha.com.br',
  'marcos.bergamaschi@betha.com.br',
  'maxwell.santos@betha.com.br',
  'leandro.santos@betha.com.br',
];

// Só notifica quando estas obrigações (AM e Balancete) estiverem enviadas.
// As demais obrigações da competência não entram na avaliação.
const NOME_MONITORADO = (nome) => {
  const n = (nome || '').toLowerCase();
  return n.includes('am') || n.includes('balancete');
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Acionado por automação de entidade (update em ObrigacaoLegal)
    const body = await req.json().catch(() => ({}));
    const data = body?.data || {};
    const projectId = data.project_id;
    const competencia = data.competencia;

    if (!projectId || !competencia) {
      return Response.json({ skipped: true, reason: 'sem project_id ou competencia' });
    }

    // Só faz sentido avaliar quando a obrigação alterada virou "enviado" (Enviado Oficial)
    if (data.status !== 'enviado') {
      return Response.json({ skipped: true, reason: 'status nao e enviado oficial' });
    }

    // Busca todas as obrigações dessa competência no projeto (todas as entidades)
    const obrigacoes = await base44.asServiceRole.entities.ObrigacaoLegal.filter({
      project_id: projectId,
      competencia,
    });

    // A obrigação que disparou deve ser AM ou Balancete
    if (!NOME_MONITORADO(data.nome)) {
      return Response.json({ skipped: true, reason: 'obrigacao alterada nao e AM nem Balancete' });
    }

    // Considera apenas AM e Balancete (todas as entidades) para avaliar o mês
    const reais = obrigacoes.filter(o => o.nome && o.nome.trim() && NOME_MONITORADO(o.nome));
    if (reais.length === 0) {
      return Response.json({ skipped: true, reason: 'sem obrigacoes AM/Balancete' });
    }

    // Mês finalizado = AM e Balancete (todas entidades) em "enviado". As demais não contam.
    const todasEnviadas = reais.every(o => o.status === 'enviado');
    if (!todasEnviadas) {
      return Response.json({ skipped: true, reason: 'AM/Balancete ainda pendentes' });
    }

    // Busca o projeto para nomear o e-mail
    const projetos = await base44.asServiceRole.entities.Project.filter({ id: projectId });
    const projeto = projetos?.[0];
    const nomeProjeto = projeto?.name || 'Projeto';

    // Agrupa as obrigações concluídas por entidade para detalhar no e-mail
    const porEntidade = {};
    reais.forEach(o => {
      const ent = o.entity_name || 'Sem entidade';
      if (!porEntidade[ent]) porEntidade[ent] = [];
      porEntidade[ent].push(o.nome);
    });
    const entidades = Object.keys(porEntidade);
    const entidadesTxt = entidades.join(', ');

    const detalheEntidades = entidades.map(ent => {
      const obrigacoesTxt = [...new Set(porEntidade[ent])].sort().join(', ');
      return `
        <tr>
          <td style="padding:6px 12px; border:1px solid #e2e8f0; font-weight:bold; vertical-align:top; white-space:nowrap;">${ent}</td>
          <td style="padding:6px 12px; border:1px solid #e2e8f0;">${obrigacoesTxt}</td>
        </tr>`;
    }).join('');

    const subject = `✅ Prestação de Contas concluída — ${nomeProjeto} — Competência ${competencia}`;
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; color: #1e293b;">
        <h2 style="color:#059669;">Prestação de Contas concluída</h2>
        <p><strong>AM</strong> e <strong>Balancete</strong> da competência <strong>${competencia}</strong> foram marcados como <strong>Enviado Oficial</strong>.</p>
        <table style="border-collapse: collapse; margin-top: 12px;">
          <tr><td style="padding:4px 12px 4px 0; color:#64748b;">Projeto:</td><td><strong>${nomeProjeto}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0; color:#64748b;">Competência:</td><td><strong>${competencia}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0; color:#64748b;">Entidades:</td><td>${entidadesTxt}</td></tr>
          <tr><td style="padding:4px 12px 4px 0; color:#64748b;">Total de obrigações:</td><td>${reais.length}</td></tr>
        </table>
        <h3 style="margin-top:20px; margin-bottom:8px; color:#1e293b;">Obrigações concluídas por entidade</h3>
        <table style="border-collapse: collapse;">
          <tr style="background:#f1f5f9;">
            <th style="padding:6px 12px; border:1px solid #e2e8f0; text-align:left;">Entidade</th>
            <th style="padding:6px 12px; border:1px solid #e2e8f0; text-align:left;">Obrigações</th>
          </tr>
          ${detalheEntidades}
        </table>
        <p style="margin-top:16px; font-size:12px; color:#94a3b8;">Notificação automática do Gerenciador de Projetos.</p>
      </div>
    `;

    const results = [];
    for (const to of RECIPIENTS) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to,
        subject,
        body: bodyHtml,
        from_name: 'Gerenciador de Projetos',
      });
      results.push(to);
    }

    return Response.json({ sent: true, recipients: results, competencia, project: nomeProjeto });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});