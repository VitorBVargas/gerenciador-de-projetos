import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { project_id, days = 14 } = await req.json();
    if (!project_id) return Response.json({ error: 'project_id é obrigatório' }, { status: 400 });

    const today = new Date();
    const periodStart = new Date(today);
    periodStart.setDate(periodStart.getDate() - days);
    const horizonEnd = new Date(today);
    horizonEnd.setDate(horizonEnd.getDate() + days);

    const projects = await base44.asServiceRole.entities.Project.filter({ id: project_id });
    const p = projects[0];
    if (!p) return Response.json({ error: 'Projeto não encontrado' }, { status: 404 });

    const [atividades, chamados, obrigacoes, riscos] = await Promise.all([
      base44.asServiceRole.entities.ProjectActivity.filter({ project_id }),
      base44.asServiceRole.entities.Chamado.filter({ project_id }),
      base44.asServiceRole.entities.ObrigacaoLegal.filter({ project_id }),
      base44.asServiceRole.entities.Risk.filter({ project_id }),
    ]);

    const diasDesde = (d) => d ? Math.floor((today.getTime() - new Date(d).getTime()) / (1000 * 60 * 60 * 24)) : null;
    const inWindow = (d) => d && new Date(d) >= periodStart && new Date(d) <= today;

    // Atividades concluídas no período
    const concluidas = atividades
      .filter(a => (a.status === 'concluido' || a.completed_date) && inWindow(a.completed_date || a.end_date))
      .map(a => ({ titulo: a.title, responsavel: a.assignee, vertical: a.vertical, concluida_em: a.completed_date || a.end_date }));

    // Atividades em andamento / abertas
    const abertas = atividades.filter(a => a.status !== 'concluido' && !a.completed_date);
    const emAndamento = abertas
      .filter(a => a.status === 'in_progress' || a.status === 'em_andamento')
      .map(a => ({ titulo: a.title, responsavel: a.assignee, prazo: a.end_date, prioridade: a.priority }));

    // Atividades atrasadas e vencendo no horizonte
    const atrasadas = abertas
      .map(a => ({ titulo: a.title, responsavel: a.assignee, prazo: a.end_date, prioridade: a.priority, dias_atraso: a.end_date ? diasDesde(a.end_date) : null }))
      .filter(a => a.dias_atraso !== null && a.dias_atraso > 0)
      .sort((a, b) => b.dias_atraso - a.dias_atraso);
    const proximas = abertas
      .map(a => ({ titulo: a.title, responsavel: a.assignee, prazo: a.end_date, prioridade: a.priority, dias_para_prazo: a.end_date ? -diasDesde(a.end_date) : null }))
      .filter(a => a.dias_para_prazo !== null && a.dias_para_prazo >= 0 && new Date(a.prazo) <= horizonEnd)
      .sort((a, b) => a.dias_para_prazo - b.dias_para_prazo);

    // Chamados
    const chamadosAbertos = chamados.filter(c => ['aberto', 'em_andamento', 'aguardando_cliente'].includes(c.status));
    const chamadosCriticos = chamadosAbertos
      .filter(c => c.is_bloqueador || c.prioridade === 'critica' || c.prioridade === 'alta')
      .map(c => ({ numero: c.numero, descricao: c.descricao, prioridade: c.prioridade, bloqueador: !!c.is_bloqueador, dias_aberto: diasDesde(c.data_abertura) }))
      .sort((a, b) => (b.dias_aberto || 0) - (a.dias_aberto || 0));
    const chamadosResolvidos = chamados.filter(c => ['resolvido', 'fechado'].includes(c.status) && inWindow(c.data_resolucao)).length;

    // Obrigações legais com prazo próximo/vencido
    const obrigacoesPendentes = obrigacoes
      .filter(o => ['nao_iniciado', 'em_elaboracao', 'rejeitado'].includes(o.status))
      .map(o => ({ nome: o.nome, competencia: o.competencia, status: o.status, dias_para_prazo: o.data_limite ? -diasDesde(o.data_limite) : null }))
      .filter(o => o.dias_para_prazo === null || o.dias_para_prazo <= days)
      .sort((a, b) => (a.dias_para_prazo ?? 999) - (b.dias_para_prazo ?? 999));

    // Riscos abertos relevantes
    const riscosAbertos = riscos
      .filter(r => !['encerrado', 'mitigado'].includes(r.status))
      .map(r => ({ titulo: r.title, criticidade: r.criticidade, categoria: r.category }))
      .sort((a, b) => {
        const order = { critico: 4, alto: 3, moderado: 2, baixo: 1 };
        return (order[b.criticidade] || 0) - (order[a.criticidade] || 0);
      })
      .slice(0, 8);

    const context = {
      projeto: { nome: p.name, cidade: p.city, tipo: p.project_type },
      periodo_dias: days,
      hoje: today.toISOString().slice(0, 10),
      atividades_concluidas: concluidas,
      atividades_em_andamento: emAndamento,
      atividades_atrasadas: atrasadas.slice(0, 10),
      atividades_proximas: proximas.slice(0, 10),
      chamados: {
        abertos: chamadosAbertos.length,
        resolvidos_no_periodo: chamadosResolvidos,
        criticos_e_altos_abertos: chamadosCriticos.slice(0, 10),
      },
      obrigacoes_legais_pendentes: obrigacoesPendentes.slice(0, 8),
      riscos_abertos: riscosAbertos,
    };

    const prompt = `Você é um gerente de projetos de sustentação. Gere um RELATÓRIO OPERACIONAL enxuto e objetivo em português, baseado nos dados abaixo do projeto "${p.name}".

DADOS (JSON):
${JSON.stringify(context, null, 2)}

INSTRUÇÕES:
- "resumo_atividades": resumo ENXUTO e objetivo das atividades executadas no período (${days} dias). Foque no que foi entregue/concluído e no que está em andamento. Linguagem direta, sem enrolação.
- "destaques": 3 a 5 bullets curtos com os principais acontecimentos do período (entregas, chamados resolvidos, etc.).
- "analise_risco": breve análise de risco para os PRÓXIMOS ${days} dias, baseada em CRITICIDADE e PRAZOS. Cite atividades atrasadas/vencendo, chamados críticos/bloqueadores, obrigações legais próximas do prazo e riscos abertos relevantes. Seja específico e cite os itens.
- "acoes_recomendadas": 3 a 5 ações práticas e priorizadas para os próximos dias.
- Seja conciso. Não invente dados que não estão no contexto.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          resumo_atividades: { type: 'string' },
          destaques: { type: 'array', items: { type: 'string' } },
          analise_risco: { type: 'string' },
          acoes_recomendadas: { type: 'array', items: { type: 'string' } },
        },
        required: ['resumo_atividades', 'analise_risco'],
      },
    });

    return Response.json({
      success: true,
      generated_at: today.toISOString(),
      period_days: days,
      stats: {
        concluidas: concluidas.length,
        em_andamento: emAndamento.length,
        atrasadas: atrasadas.length,
        proximas: proximas.length,
        chamados_abertos: chamadosAbertos.length,
        chamados_resolvidos: chamadosResolvidos,
      },
      report: result,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});