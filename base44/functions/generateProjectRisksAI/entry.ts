import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Gera automaticamente os riscos de um projeto usando IA.
 * Body: { project_id: string, replace?: boolean }
 *  - replace=true: apaga os riscos com source='ia' antes de regerar.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { project_id, replace = true, trigger = 'manual' } = await req.json();
    if (!project_id) return Response.json({ error: 'project_id é obrigatório' }, { status: 400 });

    // ── 1. Coleta o contexto do projeto ───────────────────────────────────
    const project = await base44.asServiceRole.entities.Project.filter({ id: project_id });
    if (!project || project.length === 0) {
      return Response.json({ error: 'Projeto não encontrado' }, { status: 404 });
    }
    const p = project[0];

    const [products, cronogramas, timelineEvents, team, similarProjects] = await Promise.all([
      base44.asServiceRole.entities.Product.filter({ project_id }),
      base44.asServiceRole.entities.Cronograma.filter({ project_id }),
      base44.asServiceRole.entities.TimelineEvent.filter({ project_id }),
      base44.asServiceRole.entities.TeamMember.filter({ project_id }),
      // Projetos do mesmo portfólio (histórico)
      base44.asServiceRole.entities.Project.filter({ portfolio: p.portfolio }),
    ]);

    // Datas chave
    const sortedEvents = (timelineEvents || []).filter(t => t.end_date).sort((a, b) => a.end_date.localeCompare(b.end_date));
    const goLiveEvent = sortedEvents.find(t => t.phase === 'go_live');
    const today = new Date();
    const daysUntilGoLive = goLiveEvent?.end_date
      ? Math.ceil((new Date(goLiveEvent.end_date) - today) / (1000 * 60 * 60 * 24))
      : null;

    // Verticais únicas
    const verticais = [...new Set((products || []).map(pr => pr.vertical).filter(Boolean))];

    // ── 2. Monta o prompt ────────────────────────────────────────────────
    const ctx = {
      projeto: {
        nome: p.name,
        portfolio: p.portfolio,
        municipio_populacao: p.population || null,
        porte_municipio: p.municipality_size || null,
        valor_implantacao: p.implementation_value || 0,
        valor_recorrente_mensal: p.contract_recurring_value || p.recurring_value || 0,
        assinatura_contrato: p.contract_signature_date || null,
        prazo_contratual: p.deadline || null,
        status: p.status,
      },
      escopo: {
        total_produtos: products.length,
        total_verticais: verticais.length,
        verticais: verticais,
        produtos: products.map(pr => ({ nome: pr.name, vertical: pr.vertical, entidade: pr.entity })),
      },
      cronograma: {
        total_cronogramas: cronogramas.length,
        go_live_previsto: goLiveEvent?.end_date || null,
        dias_ate_go_live: daysUntilGoLive,
        marcos_atrasados: timelineEvents.filter(t => t.status === 'atrasado').length,
      },
      equipe: {
        total_membros: team.length,
        lideres: team.filter(t => t.is_leader).length,
      },
      historico_portfolio: {
        total_projetos_portfolio: similarProjects.length,
        concluidos: similarProjects.filter(sp => sp.status === 'concluido').length,
        em_andamento: similarProjects.filter(sp => sp.status === 'em_andamento').length,
      },
    };

    const prompt = `Você é o Gerente de Riscos IA — atua como Gerente de Riscos Sênior, PMO Corporativo, especialista PMBOK/PRINCE2 e em implantação de ERP para setor público brasileiro.

Analise o projeto abaixo e gere uma lista de RISCOS RELEVANTES E CONTEXTUALIZADOS (não genéricos). Considere porte do município, valor, quantidade de produtos/verticais, prazos, marcos críticos.

CONTEXTO DO PROJETO:
${JSON.stringify(ctx, null, 2)}

DIRETRIZES:
- Gere entre 6 e 14 riscos relevantes para ESTE projeto.
- Cada risco deve ter título curto, descrição contextualizada, categoria (tecnico, cronograma, recurso, cliente, externo), probabilidade (1-5), impacto (1-5), GUT (gravidade, urgência, tendência 1-5), mitigation (ação preventiva), corrective_action (ação corretiva), suggested_owner (Gerente de Projeto, Coordenador Técnico, Cliente, Equipe de Migração, etc.), phase (fase associada) e ai_rationale (por que esse risco se aplica AQUI).
- Cubra obrigatoriamente: Migração, Homologação, Treinamento/Capacitação, Go Live, Equipe Cliente, Mudança Organizacional, Infraestrutura, Cronograma.
- Se dias_ate_go_live for menor que 15 e houver atividades abertas, inclua risco crítico de atraso no Go Live.
- Se municipio for grande/metropole, aumente riscos de mudança organizacional e capacitação.
- Se total_produtos for alto vs prazo, aumente risco de cronograma.
- Calcule risk_score geral do projeto (0-100) e risk_level (muito_baixo, baixo, medio, alto, critico).
- Resumo executivo de 2-3 frases sobre o panorama de risco do projeto.

Responda APENAS com JSON válido seguindo o schema.`;

    // ── 3. Chama LLM com schema estruturado ──────────────────────────────
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
                category: { type: 'string', enum: ['tecnico', 'cronograma', 'recurso', 'cliente', 'externo'] },
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

    // ── 4. Apaga riscos antigos da IA se replace ─────────────────────────
    if (replace) {
      const existing = await base44.asServiceRole.entities.Risk.filter({ project_id, source: 'ia' });
      for (const r of existing) {
        await base44.asServiceRole.entities.Risk.delete(r.id);
      }
    }

    // ── 5. Cria os novos riscos ──────────────────────────────────────────
    const created = [];
    for (const r of (llmResponse.risks || [])) {
      const created_risk = await base44.asServiceRole.entities.Risk.create({
        project_id,
        title: r.title,
        description: r.description,
        category: r.category || 'tecnico',
        probability: Math.min(5, Math.max(1, Math.round(r.probability || 3))),
        impact: Math.min(5, Math.max(1, Math.round(r.impact || 3))),
        mitigation: r.mitigation || '',
        corrective_action: r.corrective_action || '',
        suggested_owner: r.suggested_owner || '',
        phase: r.phase || '',
        gut_g: r.gut_g || null,
        gut_u: r.gut_u || null,
        gut_t: r.gut_t || null,
        ai_rationale: r.ai_rationale || '',
        source: 'ia',
        status: 'identificado',
      });
      created.push(created_risk);
    }

    // ── 6. Atualiza score geral do projeto ───────────────────────────────
    const executedAt = new Date().toISOString();
    await base44.asServiceRole.entities.Project.update(project_id, {
      risk_score: llmResponse.risk_score,
      risk_level: llmResponse.risk_level,
      last_risk_analysis_at: executedAt,
    });

    // ── 7. Registra o log da análise (histórico de Monitoramento IA) ──────
    const totalRisks = await base44.asServiceRole.entities.Risk.filter({ project_id });
    await base44.asServiceRole.entities.RiskAnalysisLog.create({
      project_id,
      executed_at: executedAt,
      risks_analyzed: totalRisks.length,
      risks_created: created.length,
      risks_updated: 0,
      risks_mitigated: 0,
      risks_closed: 0,
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
    console.error('generateProjectRisksAI error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});