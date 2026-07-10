import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Gera automaticamente riscos de um projeto ÁGIL usando IA, analisando
 * sprint, release, roadmap, discovery e backlog.
 * Body: { project_id: string, replace?: boolean, trigger?: string }
 *  - replace=true: apaga riscos com source='ia' antes de regerar.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { project_id, replace = true, trigger = 'manual' } = await req.json();
    if (!project_id) return Response.json({ error: 'project_id é obrigatório' }, { status: 400 });

    const projectArr = await base44.asServiceRole.entities.Project.filter({ id: project_id });
    if (!projectArr || projectArr.length === 0) {
      return Response.json({ error: 'Projeto não encontrado' }, { status: 404 });
    }
    const p = projectArr[0];

    const [items, sprints, discoveryArr, team] = await Promise.all([
      base44.asServiceRole.entities.AgileBacklog.filter({ project_id }),
      base44.asServiceRole.entities.AgileSprint.filter({ project_id }),
      base44.asServiceRole.entities.Discovery.filter({ project_id }),
      base44.asServiceRole.entities.AgilTeamMember.filter({ project_id }),
    ]);

    const discovery = (discoveryArr || []).sort((a, b) => (b.updated_date || '').localeCompare(a.updated_date || ''))[0] || null;

    const doneCols = ['concluido'];
    const workCols = ['em_desenvolvimento', 'code_review', 'teste', 'homologacao'];
    const col = (i: any) => i.board_status || (i.status === 'concluido' ? 'concluido' : 'backlog');

    // ── Métricas por sprint ───────────────────────────────────────────────
    const sprintStats = (sprints || []).map((s: any) => {
      const si = items.filter((i: any) => i.sprint_id === s.id && !i.is_subtask);
      const sp = si.reduce((a: number, i: any) => a + (i.story_points || 0), 0);
      const done = si.filter((i: any) => doneCols.includes(col(i)));
      const spDone = done.reduce((a: number, i: any) => a + (i.story_points || 0), 0);
      const wip = si.filter((i: any) => workCols.includes(col(i))).length;
      const bloqueados = si.filter((i: any) => i.bloqueado).length;
      const bugs = si.filter((i: any) => i.tipo === 'bug').length;
      const semRefino = si.filter((i: any) => !i.criterio_aceite || (i.story_points || 0) === 0).length;
      return {
        nome: s.nome, status: s.status, capacidade: s.capacidade || 0,
        data_inicio: s.data_inicio, data_fim: s.data_fim,
        total_itens: si.length, story_points: sp, sp_planejado: s.story_points_planejados || sp,
        sp_entregue: spDone, wip, bloqueados, bugs, itens_sem_refinamento: semRefino,
      };
    });

    // Sprints concluídas: velocity histórica
    const velocities = sprintStats.filter((s) => s.status === 'concluida').map((s) => s.sp_entregue);
    const avgVelocity = velocities.length ? Math.round(velocities.reduce((a, b) => a + b, 0) / velocities.length) : 0;

    const activeSprint = sprintStats.find((s) => s.status === 'em_andamento') || sprintStats[sprintStats.length - 1] || null;

    const debtCount = items.filter((i: any) => i.tipo === 'debito_tecnico').length;
    const blockedTotal = items.filter((i: any) => i.bloqueado && !i.is_subtask).length;
    const semRefinoTotal = items.filter((i: any) => !i.is_subtask && (!i.criterio_aceite || (i.story_points || 0) === 0)).length;
    const backlogSize = items.filter((i: any) => !i.sprint_id && !i.is_subtask).length;
    const capacidadeEquipe = (team || []).reduce((a: number, t: any) => a + (t.capacidade_semanal || 0), 0);

    const ctx = {
      projeto: { nome: p.name, objetivo: p.agil_objetivo || '', po: p.agil_product_owner || '', scrum_master: p.agil_scrum_master || '' },
      equipe: { total_membros: (team || []).length, capacidade_semanal_total: capacidadeEquipe },
      discovery: discovery ? { score: discovery.discovery_score || null, status: discovery.status } : null,
      backlog: {
        total_itens: items.filter((i: any) => !i.is_subtask).length,
        nao_planejados: backlogSize,
        debito_tecnico: debtCount,
        bloqueados_total: blockedTotal,
        itens_sem_refinamento: semRefinoTotal,
      },
      velocity_media_historica: avgVelocity,
      sprint_atual: activeSprint,
      sprints: sprintStats,
    };

    const prompt = `Você é um Agile Coach/Scrum Master Sênior e Gerente de Riscos analisando um projeto ÁGIL (Scrum/Kanban).

Analise os dados abaixo (sprint, release, roadmap, discovery e backlog) e gere RISCOS relevantes e contextualizados para ESTE projeto ágil.

CONTEXTO:
${JSON.stringify(ctx, null, 2)}

DIRETRIZES (ÁGIL):
- Gere entre 5 e 12 riscos concretos, baseados nos números reais acima. Cite evidências no ai_rationale (ex.: "Sprint X tem 40 SP planejados vs velocity média de 22").
- Cubra especialmente estes padrões quando os dados indicarem:
  * Sprint superdimensionada (SP planejado muito acima da velocity média).
  * Baixa Velocity (velocity caindo ou muito baixa vs itens no backlog).
  * Equipe sobrecarregada (capacidade insuficiente para o comprometido; poucos membros).
  * Muito WIP (trabalho em progresso alto simultâneo, reduzindo fluxo).
  * Muitas Stories bloqueadas (bloqueados_total ou bloqueados na sprint atual).
  * Muito Débito Técnico acumulado.
  * Pouco Refinamento (itens sem critério de aceite ou sem story points).
  * Discovery imaturo (score baixo) impactando qualidade do backlog.
  * Backlog não planejado grande sem roadmap claro.
- Cada risco: título curto, descrição contextualizada, category (use: produto, tecnico, cronograma, recurso, operacional, governanca, comunicacao, capacitacao), probability (1-5), impact (1-5), GUT (gut_g, gut_u, gut_t 1-5), mitigation, corrective_action, suggested_owner (Scrum Master, Product Owner, Tech Lead, Equipe), phase (use: sprint, release, roadmap, discovery, backlog), ai_rationale com evidência numérica.
- Calcule risk_score geral (0-100) e risk_level (muito_baixo, baixo, medio, alto, critico).
- Resumo executivo de 2-3 frases sobre o panorama de risco ágil.

Responda APENAS com JSON válido seguindo o schema.`;

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          risk_score: { type: 'number' },
          risk_level: { type: 'string', enum: ['muito_baixo', 'baixo', 'medio', 'alto', 'critico'] },
          executive_summary: { type: 'string' },
          risks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                category: { type: 'string', enum: ['tecnico', 'cronograma', 'recurso', 'cliente', 'externo', 'operacional', 'produto', 'legal', 'governanca', 'comunicacao', 'capacitacao', 'financeiro'] },
                probability: { type: 'number' },
                impact: { type: 'number' },
                gut_g: { type: 'number' },
                gut_u: { type: 'number' },
                gut_t: { type: 'number' },
                mitigation: { type: 'string' },
                corrective_action: { type: 'string' },
                suggested_owner: { type: 'string' },
                phase: { type: 'string' },
                ai_rationale: { type: 'string' },
              },
              required: ['title', 'description', 'category', 'probability', 'impact'],
            },
          },
        },
        required: ['risk_score', 'risk_level', 'risks'],
      },
    });

    if (replace) {
      const existing = await base44.asServiceRole.entities.Risk.filter({ project_id, source: 'ia' });
      for (const r of existing) {
        await base44.asServiceRole.entities.Risk.delete(r.id);
      }
    }

    const created = [];
    for (const r of (llmResponse.risks || [])) {
      const cr = await base44.asServiceRole.entities.Risk.create({
        project_id,
        title: r.title,
        description: r.description,
        category: r.category || 'produto',
        origem: 'agil',
        probability: Math.min(5, Math.max(1, Math.round(r.probability || 3))),
        impact: Math.min(5, Math.max(1, Math.round(r.impact || 3))),
        mitigation: r.mitigation || '',
        corrective_action: r.corrective_action || '',
        suggested_owner: r.suggested_owner || '',
        phase: r.phase || 'sprint',
        gut_g: r.gut_g || null,
        gut_u: r.gut_u || null,
        gut_t: r.gut_t || null,
        ai_rationale: r.ai_rationale || '',
        source: 'ia',
        status: 'identificado',
      });
      created.push(cr);
    }

    const executedAt = new Date().toISOString();
    await base44.asServiceRole.entities.Project.update(project_id, {
      risk_score: llmResponse.risk_score,
      risk_level: llmResponse.risk_level,
      last_risk_analysis_at: executedAt,
    });

    const totalRisks = await base44.asServiceRole.entities.Risk.filter({ project_id });
    await base44.asServiceRole.entities.RiskAnalysisLog.create({
      project_id,
      executed_at: executedAt,
      risks_analyzed: totalRisks.length,
      risks_created: created.length,
      risk_score: llmResponse.risk_score,
      risk_level: llmResponse.risk_level,
      executive_summary: llmResponse.executive_summary || '',
      trigger,
    });

    return Response.json({
      success: true,
      risks_created: created.length,
      risk_score: llmResponse.risk_score,
      risk_level: llmResponse.risk_level,
      executive_summary: llmResponse.executive_summary || '',
    });
  } catch (error) {
    console.error('generateAgilRisksAI error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});