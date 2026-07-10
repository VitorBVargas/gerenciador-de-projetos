import { base44 } from '@/api/base44Client';

// Fibonacci permitido para Story Points
export const FIBONACCI = [1, 2, 3, 5, 8, 13, 21];

// Monta um resumo textual completo do Discovery para alimentar a IA.
export function buildDiscoveryContext(d) {
  if (!d) return '';
  const L = [];
  const add = (t, v) => { if (v && String(v).trim()) L.push(`### ${t}\n${String(v).trim()}`); };

  add('Problema', d.diagnostico?.problema);
  add('Por que resolver / Objetivo', d.diagnostico?.porque_resolver);
  add('Observações do diagnóstico', d.diagnostico?.observacoes);

  if (d.persona) {
    const p = d.persona;
    add('Persona', [
      p.nome && `Nome: ${p.nome}`, p.perfil && `Perfil: ${p.perfil}`,
      p.necessidades && `Necessidades: ${p.necessidades}`, p.dores && `Dores: ${p.dores}`,
      p.ganhos && `Ganhos: ${p.ganhos}`, p.jornada && `Jornada: ${p.jornada}`,
    ].filter(Boolean).join('\n'));
  }

  add('Causa Raiz (Ishikawa)', d.ishikawa?.causa_principal);
  if (d.cinco_porques) {
    const pq = (d.cinco_porques.porques || []).map((x, i) => `${i + 1}. ${x.pergunta || ''} → ${x.resposta || ''}`).join('\n');
    add('5 Porquês', [d.cinco_porques.primeira_pergunta, pq, d.cinco_porques.conclusao && `Conclusão: ${d.cinco_porques.conclusao}`].filter(Boolean).join('\n'));
  }

  if (d.as_is) {
    const gaps = (d.as_is.gaps || []).map((g, i) => `- ${g.descricao || ''}${g.no_escopo === false ? ' (fora do escopo)' : ''}`).join('\n');
    add('AS IS (cenário atual)', [d.as_is.descricao_processo, gaps && `Gaps identificados:\n${gaps}`].filter(Boolean).join('\n'));
  }

  if (d.to_be) add('TO BE (cenário desejado)', [d.to_be.descricao, d.to_be.melhorias && `Melhorias: ${d.to_be.melhorias}`, d.to_be.beneficios && `Benefícios: ${d.to_be.beneficios}`].filter(Boolean).join('\n'));

  if ((d.hipoteses || []).length) {
    add('Hipóteses', d.hipoteses.map((h, i) => `${i + 1}. Acreditamos que ${h.acreditamos_que || ''}; se fizermos ${h.se_fizermos || ''}, iremos observar ${h.iremos_observar || ''} (métrica: ${h.metrica_validacao || '—'})`).join('\n'));
  }

  if ((d.acoes || []).length) {
    add('Plano de Ações (5W2H)', d.acoes.map((a, i) => `${i + 1}. ${a.what || ''}${a.why ? ` — porquê: ${a.why}` : ''}${a.how ? ` — como: ${a.how}` : ''}`).join('\n'));
  }

  if ((d.metricas || []).length) {
    add('Métricas de acompanhamento', d.metricas.map(m => `- ${m.nome || ''}: ${m.descricao || ''} (meta: ${m.meta || '—'})`).join('\n'));
  }

  return L.join('\n\n');
}

// Schema de resposta esperado da IA.
const responseSchema = {
  type: 'object',
  properties: {
    resumo: { type: 'string', description: 'Breve resumo executivo da estratégia de produto adotada' },
    mvp_descricao: { type: 'string', description: 'Descrição do MVP sugerido e o que o justifica' },
    epics: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Identificador temporário único do épico, ex: E1' },
          nome: { type: 'string' },
          descricao: { type: 'string' },
          objetivo: { type: 'string' },
          prioridade: { type: 'string', enum: ['baixa', 'media', 'alta', 'critica'] },
          valor_negocio: { type: 'string', description: 'Alto/Médio/Baixo com justificativa curta' },
          complexidade: { type: 'string', description: 'Alta/Média/Baixa' },
          features: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                key: { type: 'string', description: 'Identificador temporário único da feature, ex: F1' },
                nome: { type: 'string' },
                descricao: { type: 'string' },
                criterio_sucesso: { type: 'string' },
                dependencias: { type: 'array', items: { type: 'string' }, description: 'keys de outras features das quais depende' },
                stories: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      titulo: { type: 'string', description: 'Título curto da story' },
                      como: { type: 'string' },
                      quero: { type: 'string' },
                      para: { type: 'string' },
                      criterios_aceite: { type: 'string' },
                      valor_entregue: { type: 'string' },
                      prioridade: { type: 'string', enum: ['baixa', 'media', 'alta', 'critica'] },
                      story_points: { type: 'number', description: 'Fibonacci: 1,2,3,5,8,13,21' },
                      story_points_justificativa: { type: 'string' },
                      rice: {
                        type: 'object',
                        properties: {
                          reach: { type: 'number' }, impact: { type: 'number' },
                          confidence: { type: 'number' }, effort: { type: 'number' },
                          score: { type: 'number' },
                        },
                      },
                      sprint: { type: 'number', description: 'Número da sprint sugerida: 0,1,2,3...' },
                    },
                    required: ['titulo', 'como', 'quero', 'para'],
                  },
                },
              },
              required: ['key', 'nome'],
            },
          },
        },
        required: ['key', 'nome'],
      },
    },
    debitos_tecnicos: {
      type: 'array',
      items: { type: 'object', properties: { titulo: { type: 'string' }, descricao: { type: 'string' }, prioridade: { type: 'string', enum: ['baixa', 'media', 'alta', 'critica'] } } },
    },
    bugs_conhecidos: {
      type: 'array',
      items: { type: 'object', properties: { titulo: { type: 'string' }, descricao: { type: 'string' }, prioridade: { type: 'string', enum: ['baixa', 'media', 'alta', 'critica'] } } },
    },
    riscos: {
      type: 'array',
      items: { type: 'object', properties: { titulo: { type: 'string' }, descricao: { type: 'string' }, probabilidade: { type: 'string', enum: ['baixa', 'media', 'alta'] }, impacto: { type: 'string', enum: ['baixo', 'medio', 'alto'] }, mitigacao: { type: 'string' } } },
    },
    roadmap: {
      type: 'array',
      description: 'Uma entrada por sprint',
      items: {
        type: 'object',
        properties: {
          sprint: { type: 'number' },
          nome: { type: 'string', description: 'Ex: Sprint 0 — Fundações' },
          objetivo: { type: 'string' },
        },
        required: ['sprint', 'nome'],
      },
    },
  },
  required: ['epics', 'roadmap'],
};

// Monta um bloco de contexto com a Análise de Maturidade para calibrar o backlog.
function buildMaturityContext(a) {
  if (!a) return '';
  const L = [`Discovery Score: ${a.score ?? '—'}/100`, a.complexidade && `Complexidade estimada: ${a.complexidade}`];
  if (a.resumo_executivo) L.push(`Resumo executivo: ${a.resumo_executivo}`);
  const lacunas = (a.itens || []).filter(i => i.status === 'nao_encontrado' || i.status === 'parcial' || i.status === 'pouco_detalhado');
  if (lacunas.length) L.push(`Lacunas a considerar: ${lacunas.map(i => `${i.nome} (${i.status})`).join(', ')}`);
  if ((a.sugestoes || []).length) L.push(`Sugestões de melhoria: ${a.sugestoes.join('; ')}`);
  const est = a.estimativa || {};
  if (est.epics || est.features || est.stories || est.sprints) {
    L.push(`Estimativa de referência — Épicos: ${est.epics ?? '?'}, Features: ${est.features ?? '?'}, Stories: ${est.stories ?? '?'}, Sprints: ${est.sprints ?? '?'}.`);
  }
  return L.filter(Boolean).join('\n');
}

// Chama a IA para gerar o backlog a partir do Discovery.
export async function generateBacklogFromDiscovery({ project, discovery, maturityAnalysis }) {
  const context = buildDiscoveryContext(discovery);
  const maturity = buildMaturityContext(maturityAnalysis);

  const prompt = `Você é um Product Manager sênior e Agile Coach experiente. A partir do Discovery de produto abaixo, estruture um **Product Backlog inicial completo e acionável** para um projeto ágil (Scrum/Kanban).

Pense como um profissional que domina PMBOK, Scrum Guide, Lean, Lean Inception, Design Thinking, Domain Driven Design, boas práticas de Engenharia de Software, Arquitetura de Sistemas, Product Discovery, Roadmapping e Product Backlog Management. **Priorize sempre valor de negócio antes de esforço técnico.**

PROJETO: ${project?.name || ''}
${project?.agil_objetivo ? `Objetivo declarado: ${project.agil_objetivo}` : ''}

DISCOVERY:
${context || '(sem conteúdo detalhado — infira o mínimo necessário do nome/objetivo do projeto)'}
${maturity ? `\nANÁLISE DE MATURIDADE DO DISCOVERY (use para calibrar priorização, story points, roadmap, Sprint 0, sprint planning, riscos e MVP; onde houver lacunas, seja conservador e sinalize riscos/débitos):\n${maturity}\n` : ''}
REGRAS OBRIGATÓRIAS:
1. Crie ÉPICOS organizados (nome, descrição, objetivo, prioridade, valor de negócio, complexidade).
2. Para cada Épico, crie FEATURES (nome, descrição, critério de sucesso, dependências entre features usando as 'key').
3. Para cada Feature, crie USER STORIES no formato Scrum (Como / Quero / Para), com critérios de aceite, valor entregue e prioridade.
4. Sugira STORY POINTS em Fibonacci (1,2,3,5,8,13,21) com justificativa para cada story.
5. Aplique priorização RICE (reach, impact, confidence, effort e score final) em cada story.
6. Defina o MVP e distribua as stories em sprints: Sprint 0 (configuração, arquitetura, ambientes, integrações), Sprint 1 (primeiras entregas), Sprint 2 (funcionalidades principais), Sprint 3+ (evoluções).
7. Gere um ROADMAP com o objetivo esperado de cada sprint.
8. Identifique DÉBITOS TÉCNICOS (melhorias futuras) e BUGS CONHECIDOS (problemas já descritos no Discovery), se houver.
9. Liste RISCOS relevantes com probabilidade, impacto e mitigação.
10. NÃO crie itens duplicados. Sempre identifique dependências. Sempre sugira um MVP. Sempre ordene por prioridade/valor.

Responda estritamente no schema JSON solicitado.`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: responseSchema,
    model: 'claude_sonnet_4_6',
  });
  return result;
}

// Conta itens de um resultado (para o resumo da revisão).
export function summarizeResult(r) {
  const epics = r?.epics || [];
  const features = epics.flatMap(e => e.features || []);
  const stories = features.flatMap(f => f.stories || []);
  const sprints = new Set([...(r?.roadmap || []).map(x => x.sprint), ...stories.map(s => s.sprint)].filter(v => v !== undefined && v !== null));
  return {
    epics: epics.length,
    features: features.length,
    stories: stories.length,
    bugs: (r?.bugs_conhecidos || []).length,
    debitos: (r?.debitos_tecnicos || []).length,
    riscos: (r?.riscos || []).length,
    sprints: sprints.size,
  };
}

// Normaliza um story point para o valor Fibonacci mais próximo.
export function nearestFibonacci(n) {
  const v = Number(n) || 0;
  if (!v) return 0;
  return FIBONACCI.reduce((prev, cur) => Math.abs(cur - v) < Math.abs(prev - v) ? cur : prev);
}

// Persiste o backlog revisado no projeto ágil (AgileSprint + AgileBacklog).
export async function persistBacklog({ projectId, result }) {
  // 1. Cria as sprints do roadmap
  const roadmap = [...(result.roadmap || [])].sort((a, b) => (a.sprint ?? 0) - (b.sprint ?? 0));
  const sprintByNumber = {};
  for (let i = 0; i < roadmap.length; i++) {
    const r = roadmap[i];
    const sprint = await base44.entities.AgileSprint.create({
      project_id: projectId,
      nome: r.nome || `Sprint ${r.sprint}`,
      objetivo: r.objetivo || '',
      status: r.sprint === 0 ? 'planejada' : 'planejada',
      ordem: r.sprint ?? i,
    });
    sprintByNumber[r.sprint] = sprint.id;
  }

  // 2. Cria épicos → features → stories
  for (const epic of (result.epics || [])) {
    const epicRec = await base44.entities.AgileBacklog.create({
      project_id: projectId,
      titulo: epic.nome,
      descricao: [epic.descricao, epic.objetivo && `Objetivo: ${epic.objetivo}`, epic.valor_negocio && `Valor de negócio: ${epic.valor_negocio}`, epic.complexidade && `Complexidade: ${epic.complexidade}`].filter(Boolean).join('\n\n'),
      tipo: 'epic',
      prioridade: epic.prioridade || 'media',
      status: 'backlog',
      board_status: 'backlog',
    });

    for (const feat of (epic.features || [])) {
      const featRec = await base44.entities.AgileBacklog.create({
        project_id: projectId,
        titulo: feat.nome,
        descricao: [feat.descricao, feat.criterio_sucesso && `Critério de sucesso: ${feat.criterio_sucesso}`, (feat.dependencias || []).length && `Dependências: ${feat.dependencias.join(', ')}`].filter(Boolean).join('\n\n'),
        tipo: 'feature',
        epic_id: epicRec.id,
        prioridade: epic.prioridade || 'media',
        status: 'backlog',
        board_status: 'backlog',
      });

      for (const st of (feat.stories || [])) {
        const rice = st.rice || {};
        await base44.entities.AgileBacklog.create({
          project_id: projectId,
          titulo: st.titulo || `Como ${st.como}, quero ${st.quero}`,
          descricao: `Como ${st.como || ''},\nquero ${st.quero || ''},\npara ${st.para || ''}.` + (st.valor_entregue ? `\n\nValor entregue: ${st.valor_entregue}` : '') + (st.story_points_justificativa ? `\n\nJustificativa dos pontos: ${st.story_points_justificativa}` : '') + (rice.score !== undefined ? `\n\nRICE — R:${rice.reach ?? '—'} I:${rice.impact ?? '—'} C:${rice.confidence ?? '—'} E:${rice.effort ?? '—'} = ${rice.score ?? '—'}` : ''),
          tipo: 'story',
          epic_id: epicRec.id,
          feature_id: featRec.id,
          prioridade: st.prioridade || 'media',
          story_points: nearestFibonacci(st.story_points),
          criterio_aceite: st.criterios_aceite || '',
          sprint_id: sprintByNumber[st.sprint] || '',
          status: 'backlog',
          board_status: 'backlog',
        });
      }
    }
  }

  // 3. Bugs conhecidos
  if ((result.bugs_conhecidos || []).length) {
    await base44.entities.AgileBacklog.bulkCreate(result.bugs_conhecidos.map(b => ({
      project_id: projectId, titulo: b.titulo, descricao: b.descricao || '',
      tipo: 'bug', prioridade: b.prioridade || 'media', status: 'backlog', board_status: 'backlog',
    })));
  }

  // 4. Débitos técnicos
  if ((result.debitos_tecnicos || []).length) {
    await base44.entities.AgileBacklog.bulkCreate(result.debitos_tecnicos.map(d => ({
      project_id: projectId, titulo: d.titulo, descricao: d.descricao || '',
      tipo: 'debito_tecnico', prioridade: d.prioridade || 'media', status: 'backlog', board_status: 'backlog',
    })));
  }

  // 5. Riscos → entidade Risk do projeto
  if ((result.riscos || []).length) {
    const probMap = { baixa: 2, media: 3, alta: 4 };
    const impMap = { baixo: 2, medio: 3, alto: 4 };
    try {
      await base44.entities.Risk.bulkCreate(result.riscos.map(r => ({
        project_id: projectId,
        title: r.titulo,
        description: r.descricao || '',
        category: 'produto',
        probability: probMap[r.probabilidade] || 3,
        impact: impMap[r.impacto] || 3,
        mitigation: r.mitigacao || '',
        source: 'ia',
        origem: 'discovery_backlog',
        status: 'aberto',
      })));
    } catch (e) {
      // Se o schema de Risk divergir, não bloqueia a criação do backlog
      console.warn('Não foi possível criar riscos automaticamente:', e?.message);
    }
  }

  await base44.entities.Project.update(projectId, { agil_backlog_generated: true });
}