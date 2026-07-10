import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { project_id } = await req.json();
    if (!project_id) return Response.json({ error: 'project_id é obrigatório' }, { status: 400 });

    // Coleta de dados reais do projeto ágil
    const [projectArr, backlog, sprints, team, stakeholders, risks, kpiSnapshots, discoveries] = await Promise.all([
      base44.asServiceRole.entities.Project.filter({ id: project_id }).catch(() => []),
      base44.asServiceRole.entities.AgileBacklog.filter({ project_id }),
      base44.asServiceRole.entities.AgileSprint.filter({ project_id }),
      base44.asServiceRole.entities.AgilTeamMember.filter({ project_id }),
      base44.asServiceRole.entities.Stakeholder.filter({ project_id }),
      base44.asServiceRole.entities.Risk.filter({ project_id }),
      base44.asServiceRole.entities.AgilKpiSnapshot.filter({ project_id }),
      base44.asServiceRole.entities.Discovery.filter({ project_id }),
    ]);

    const project = projectArr?.[0] || {};
    if (!projectArr?.length) return Response.json({ error: 'Projeto não encontrado' }, { status: 404 });
    const main = (backlog || []).filter((i) => !i.is_subtask);

    const activeSprint = (sprints || []).find((s) => s.status === 'em_andamento')
      || (sprints || []).find((s) => s.status === 'planejada')
      || null;
    const sprintItems = activeSprint ? main.filter((i) => i.sprint_id === activeSprint.id) : [];

    const sum = (arr, f) => arr.reduce((s, i) => s + (f(i) || 0), 0);
    const spTotal = sum(sprintItems, (i) => i.story_points);
    const doneItems = sprintItems.filter((i) => i.status === 'concluido' || i.board_status === 'concluido');
    const spDone = sum(doneItems, (i) => i.story_points);
    const bloqueados = sprintItems.filter((i) => i.bloqueado);
    const bugs = main.filter((i) => i.tipo === 'bug' && i.status !== 'concluido');
    const bugsCriticos = bugs.filter((i) => i.prioridade === 'critica' || i.prioridade === 'alta');
    const semResponsavel = main.filter((i) => i.status !== 'concluido' && !i.responsavel);
    const semCriterioAceite = main.filter((i) => i.status !== 'concluido' && (!i.criterio_aceite || !i.criterio_aceite.trim()));
    const semStoryPoints = main.filter((i) => i.status !== 'concluido' && !(i.story_points > 0));
    const storiesGrandes = main.filter((i) => (i.tipo === 'story' || i.tipo === 'feature') && (i.story_points || 0) >= 13);
    const backlogGeral = main.filter((i) => !i.sprint_id && i.status !== 'concluido');
    const releases = [...new Set(main.map((i) => i.release).filter(Boolean))];
    const activeRisks = (risks || []).filter((r) => !['encerrado', 'mitigado'].includes(r.status));

    // Velocity histórica das sprints concluídas
    const sprintsConcluidas = (sprints || []).filter((s) => s.status === 'concluida');
    const velocityHist = sprintsConcluidas
      .map((s) => ({ nome: s.nome, entregue: s.story_points_entregues || 0, planejado: s.story_points_planejados || 0 }));

    const lastKpi = (kpiSnapshots || []).sort((a, b) => (b.captured_at || '').localeCompare(a.captured_at || ''))[0];
    const discovery = (discoveries || [])[0];

    const context = `
PROJETO ÁGIL: ${project.name || '—'}
Objetivo: ${project.agil_objetivo || '—'} | Product Owner: ${project.agil_product_owner || '—'} | Scrum Master: ${project.agil_scrum_master || '—'}

SPRINT ATUAL: ${activeSprint ? `${activeSprint.nome} (${activeSprint.status})` : 'Nenhuma sprint ativa'}
Goal: ${activeSprint?.objetivo || '—'} | Período: ${activeSprint?.data_inicio || '?'} a ${activeSprint?.data_fim || '?'}
Itens na sprint: ${sprintItems.length} | Concluídos: ${doneItems.length} | SP: ${spDone}/${spTotal} | Bloqueados: ${bloqueados.length}

VELOCITY (sprints concluídas):
${velocityHist.length ? velocityHist.map((v) => `- ${v.nome}: ${v.entregue} SP entregues (planejado ${v.planejado})`).join('\n') : '- Sem histórico de sprints concluídas'}

BACKLOG:
- Total de itens: ${main.length} | No backlog geral (não alocados): ${backlogGeral.length}
- Sem responsável: ${semResponsavel.length} | Sem story points: ${semStoryPoints.length} | Sem critério de aceite: ${semCriterioAceite.length}
- Stories grandes demais (>=13 SP): ${storiesGrandes.length}
- Bugs abertos: ${bugs.length} (críticos/altos: ${bugsCriticos.length})

EQUIPE (${(team || []).length} membros):
${(team || []).slice(0, 15).map((m) => `- ${m.nome} (${m.funcao || 'sem função'}) | disponibilidade ${m.disponibilidade ?? 100}% | planejadas ${m.horas_planejadas || 0}h / capacidade ${m.capacidade_semanal || 0}h`).join('\n') || '- Sem membros cadastrados'}

RISCOS ATIVOS: ${activeRisks.length}
${activeRisks.slice(0, 10).map((r) => `- [${r.criticidade || '?'}] ${r.title} (${r.status})`).join('\n') || '- Nenhum risco ativo'}

KPIs (último snapshot): ${lastKpi ? `capturado em ${lastKpi.captured_at}\n${JSON.stringify(lastKpi.metrics || {})}` : 'Sem snapshots de KPI'}

DISCOVERY: ${discovery ? `${discovery.name} — status ${discovery.status} — health ${discovery.discovery_score ?? '?'}` : 'Nenhum discovery vinculado'}

RELEASES: ${releases.length ? releases.join(', ') : 'Nenhuma release definida no backlog'}
`.trim();

    const schema = {
      type: 'object',
      properties: {
        executive_summary: { type: 'string', description: 'Resumo executivo curto da saúde geral do projeto ágil' },
        suggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              dimension: { type: 'string', enum: ['velocity', 'sprint', 'roadmap', 'backlog', 'equipe', 'riscos', 'kpis', 'discovery', 'releases', 'geral'] },
              title: { type: 'string' },
              observation: { type: 'string' },
              action: { type: 'string' },
              benefit: { type: 'string' },
              priority: { type: 'string', enum: ['baixa', 'media', 'alta', 'critica'] },
            },
            required: ['dimension', 'title', 'action'],
          },
        },
      },
      required: ['suggestions'],
    };

    const prompt = `Você é o Agente Scrum IA — consultor sênior de Gestão de Produtos e Engenharia de Software (Scrum, Kanban, Lean, PMBOK, Lean Inception, Product Discovery, Roadmapping, DDD).

Analise CONTINUAMENTE o projeto ágil abaixo em TODAS as dimensões: Velocity, Sprint, Roadmap, Backlog, Equipe, Riscos, KPIs, Discovery e Releases.

REGRAS ABSOLUTAS:
- Você NUNCA altera dados. Você apenas SUGERE ações que o usuário poderá aceitar ou rejeitar.
- Baseie-se EXCLUSIVAMENTE nos dados reais fornecidos. Não invente dados.
- Cada sugestão deve ser concreta e acionável, com: o que observou (observation), a ação sugerida (action) e o benefício esperado (benefit).
- Priorize por impacto e urgência. Gere entre 5 e 12 sugestões cobrindo as dimensões mais relevantes.
- Se uma dimensão estiver saudável, não force sugestões nela.

DADOS REAIS DO PROJETO:
${context}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema,
    });

    const suggestions = Array.isArray(result?.suggestions) ? result.suggestions : [];
    const now = new Date().toISOString();

    // Limpa sugestões pendentes anteriores (mantém as já decididas como histórico)
    const previous = await base44.asServiceRole.entities.ScrumSuggestion.filter({ project_id, status: 'pendente' });
    if (previous.length) {
      await base44.asServiceRole.entities.ScrumSuggestion.deleteMany({ project_id, status: 'pendente' });
    }

    const toCreate = suggestions.map((s) => ({
      project_id,
      dimension: s.dimension || 'geral',
      title: s.title || 'Sugestão',
      observation: s.observation || '',
      action: s.action || '',
      benefit: s.benefit || '',
      priority: s.priority || 'media',
      status: 'pendente',
      generated_at: now,
    }));

    let created = [];
    if (toCreate.length) {
      created = await base44.asServiceRole.entities.ScrumSuggestion.bulkCreate(toCreate);
    }

    return Response.json({
      executive_summary: result?.executive_summary || '',
      suggestions_created: created.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});