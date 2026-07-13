import { base44 } from '@/api/base44Client';
import { nearestFibonacci } from './agilBacklogAI';

// Contexto textual dos itens enviados à IA.
function itemsContext(items) {
  return items.map(i => `- [${i.tipo}] (id:${i.id}) "${i.titulo}" | prioridade:${i.prioridade || '—'} | SP:${i.story_points || 0} | status:${i.status}${i.descricao ? ` | desc:${String(i.descricao).slice(0, 200)}` : ''}`).join('\n');
}

const MODEL = 'claude_sonnet_4_6';

// O InvokeLLM às vezes embrulha o resultado em { response: {...} }. Normaliza.
function unwrap(r) {
  if (r && typeof r === 'object' && r.response && typeof r.response === 'object') return r.response;
  return r || {};
}

// 1) PRIORIZAÇÃO (RICE) — sugere prioridade + RICE por item.
export async function suggestPrioritization(items) {
  const schema = {
    type: 'object',
    properties: {
      itens: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            titulo: { type: 'string' },
            prioridade: { type: 'string', enum: ['baixa', 'media', 'alta', 'critica'] },
            rice: {
              type: 'object',
              properties: {
                reach: { type: 'number' }, impact: { type: 'number' },
                confidence: { type: 'number' }, effort: { type: 'number' }, score: { type: 'number' },
              },
            },
            justificativa: { type: 'string' },
          },
          required: ['id', 'prioridade'],
        },
      },
    },
    required: ['itens'],
  };
  const prompt = `Você é um Product Manager sênior. Priorize os itens de backlog abaixo usando o framework RICE (Reach, Impact, Confidence, Effort; score = R*I*C/E). Para cada item, defina prioridade (baixa/media/alta/critica) e os valores RICE, com breve justificativa. Sempre valor de negócio antes de esforço técnico.\n\nITENS:\n${itemsContext(items)}\n\nResponda estritamente no schema JSON.`;
  const r = unwrap(await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema, model: MODEL }));
  return r?.itens || [];
}

// 2) REFINAMENTO — melhora título/descrição/critérios de aceite/DoR/DoD.
export async function suggestRefinement(items) {
  const schema = {
    type: 'object',
    properties: {
      itens: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            titulo: { type: 'string' },
            descricao: { type: 'string' },
            criterio_aceite: { type: 'string' },
            definition_of_ready: { type: 'string' },
            definition_of_done: { type: 'string' },
          },
          required: ['id'],
        },
      },
    },
    required: ['itens'],
  };
  const prompt = `Você é um Agile Coach. Refine os itens de backlog abaixo: melhore o título (formato Scrum quando for story), a descrição, escreva critérios de aceite claros (Gherkin Given/When/Then quando fizer sentido), Definition of Ready e Definition of Done. Não invente escopo novo; apenas clarifique.\n\nITENS:\n${itemsContext(items)}\n\nResponda estritamente no schema JSON.`;
  const r = unwrap(await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema, model: MODEL }));
  return r?.itens || [];
}

// 3) DIVISÃO — quebra um item grande em sub-stories.
export async function suggestSplit(item) {
  const schema = {
    type: 'object',
    properties: {
      novos_itens: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            titulo: { type: 'string' },
            descricao: { type: 'string' },
            prioridade: { type: 'string', enum: ['baixa', 'media', 'alta', 'critica'] },
            story_points: { type: 'number' },
            criterio_aceite: { type: 'string' },
          },
          required: ['titulo'],
        },
      },
    },
    required: ['novos_itens'],
  };
  const prompt = `Você é um Agile Coach. Quebre o item de backlog abaixo em stories menores, independentes e entregáveis (INVEST). Cada nova story deve ter título, descrição, prioridade, story points (Fibonacci: 1,2,3,5,8,13,21) e critérios de aceite.\n\nITEM:\n- [${item.tipo}] "${item.titulo}"\n${item.descricao ? `Descrição: ${item.descricao}` : ''}\n${item.criterio_aceite ? `Critérios atuais: ${item.criterio_aceite}` : ''}\n\nResponda estritamente no schema JSON.`;
  const r = unwrap(await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema, model: MODEL }));
  return (r?.novos_itens || []).map(n => ({ ...n, story_points: nearestFibonacci(n.story_points) }));
}

// 4) MESCLAGEM — sugere itens duplicados/semelhantes para unificar.
export async function suggestMerge(items) {
  const schema = {
    type: 'object',
    properties: {
      grupos: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            ids: { type: 'array', items: { type: 'string' } },
            titulo_sugerido: { type: 'string' },
            motivo: { type: 'string' },
          },
          required: ['ids', 'titulo_sugerido'],
        },
      },
    },
    required: ['grupos'],
  };
  const prompt = `Você é um Product Manager. Identifique itens de backlog DUPLICADOS ou muito semelhantes que deveriam ser mesclados. Para cada grupo, liste os ids, um título unificado sugerido e o motivo. Só agrupe quando houver real sobreposição.\n\nITENS:\n${itemsContext(items)}\n\nResponda estritamente no schema JSON.`;
  const r = unwrap(await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema, model: MODEL }));
  return (r?.grupos || []).filter(g => (g.ids || []).length > 1);
}

// 5) STORY POINTS — estima pontos (Fibonacci) por item.
export async function suggestStoryPoints(items) {
  const schema = {
    type: 'object',
    properties: {
      itens: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            titulo: { type: 'string' },
            story_points: { type: 'number' },
            justificativa: { type: 'string' },
          },
          required: ['id', 'story_points'],
        },
      },
    },
    required: ['itens'],
  };
  const prompt = `Você é um Agile Coach. Estime Story Points (Fibonacci: 1,2,3,5,8,13,21) para cada item, considerando complexidade, esforço e incerteza, com breve justificativa.\n\nITENS:\n${itemsContext(items)}\n\nResponda estritamente no schema JSON.`;
  const r = unwrap(await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema, model: MODEL }));
  return (r?.itens || []).map(n => ({ ...n, story_points: nearestFibonacci(n.story_points) }));
}

// ── Persistência das sugestões aprovadas ──

export async function applyPrioritization(suggestions) {
  for (const s of suggestions) {
    await base44.entities.AgileBacklog.update(s.id, { prioridade: s.prioridade, rice: s.rice || undefined });
  }
}

export async function applyRefinement(suggestions) {
  for (const s of suggestions) {
    const patch = {};
    ['titulo', 'descricao', 'criterio_aceite', 'definition_of_ready', 'definition_of_done'].forEach(k => {
      if (s[k]) patch[k] = s[k];
    });
    if (Object.keys(patch).length) await base44.entities.AgileBacklog.update(s.id, patch);
  }
}

export async function applyStoryPoints(suggestions) {
  for (const s of suggestions) {
    await base44.entities.AgileBacklog.update(s.id, { story_points: s.story_points });
  }
}

export async function applySplit({ projectId, original, novos }) {
  await base44.entities.AgileBacklog.bulkCreate(novos.map(n => ({
    project_id: projectId,
    titulo: n.titulo,
    descricao: n.descricao || '',
    tipo: 'story',
    prioridade: n.prioridade || original.prioridade || 'media',
    story_points: n.story_points || 0,
    criterio_aceite: n.criterio_aceite || '',
    epic_id: original.epic_id || '',
    feature_id: original.tipo === 'feature' ? original.id : (original.feature_id || ''),
    produto: original.produto || '',
    sprint_id: original.sprint_id || '',
    status: 'backlog',
    board_status: 'backlog',
  })));
}

export async function applyMerge({ group, items }) {
  const [keepId, ...removeIds] = group.ids;
  const keep = items.find(i => i.id === keepId);
  if (!keep) return;
  await base44.entities.AgileBacklog.update(keepId, { titulo: group.titulo_sugerido || keep.titulo });
  for (const rid of removeIds) {
    await base44.entities.AgileBacklog.delete(rid);
  }
}