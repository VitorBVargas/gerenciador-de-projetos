import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Lista fixa de destinatários das notificações de prestação de contas
const RECIPIENTS = [
  'vitor.vargas@betha.com.br',
  'marcos.bergamaschi@betha.com.br',
  'maxwell.santos@betha.com.br',
  'leandro.santos@betha.com.br',
];

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

    // Considera apenas registros reais com nome de obrigação
    const reais = obrigacoes.filter(o => o.nome && o.nome.trim());
    if (reais.length === 0) {
      return Response.json({ skipped: true, reason: 'sem obrigacoes reais' });
    }

    // Mês finalizado = TODAS as obrigações da competência (todas entidades) em "enviado"
    const todasEnviadas = reais.every(o => o.status === 'enviado');
    if (!todasEnviadas) {
      return Response.json({ skipped: true, reason: 'ainda ha obrigacoes pendentes' });
    }

    // Busca o projeto para nomear o e-mail
    const projetos = await base44.asServiceRole.entities.Project.filter({ id: projectId });
    const projeto = projetos?.[0];
    const nomeProjeto = projeto?.name || 'Projeto';

    // Evita reenvio: a função é idempotente o suficiente porque só dispara quando o último
    // registro vira enviado. Monta o resumo por entidade.
    const entidades = [...new Set(reais.map(o => o.entity_name).filter(Boolean))];
    const entidadesTxt = entidades.length ? entidades.join(', ') : 'Todas as entidades';

    const subject = `✅ Prestação de Contas concluída — ${nomeProjeto} — Competência ${competencia}`;
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; color: #1e293b;">
        <h2 style="color:#059669;">Prestação de Contas concluída</h2>
        <p>Todas as obrigações da competência <strong>${competencia}</strong> foram marcadas como <strong>Enviado Oficial</strong>.</p>
        <table style="border-collapse: collapse; margin-top: 12px;">
          <tr><td style="padding:4px 12px 4px 0; color:#64748b;">Projeto:</td><td><strong>${nomeProjeto}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0; color:#64748b;">Competência:</td><td><strong>${competencia}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0; color:#64748b;">Entidades:</td><td>${entidadesTxt}</td></tr>
          <tr><td style="padding:4px 12px 4px 0; color:#64748b;">Total de obrigações:</td><td>${reais.length}</td></tr>
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