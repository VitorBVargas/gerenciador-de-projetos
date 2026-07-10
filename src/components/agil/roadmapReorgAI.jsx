import { base44 } from '@/api/base44Client';

// IA sugere reorganização do roadmap ágil (ordem de releases/sprints e itens)
// considerando dependências, riscos e valor.
export async function sugerirReorganizacaoRoadmap({ projectName, releases }) {
  const resumo = releases.map(r => ({
    sprint: r.sprint.nome,
    status: r.sprint.status,
    objetivo: r.sprint.objetivo || '',
    data_fim: r.sprint.data_fim || '',
    itens: r.items.map(i => ({
      id: i.id, titulo: i.titulo, tipo: i.tipo, prioridade: i.prioridade,
      story_points: i.story_points || 0, bloqueado: !!i.bloqueado,
      dependencias: (i.dependencias || []).length,
    })),
  }));

  const prompt = `Você é um Agile Coach/Product Manager analisando o roadmap do projeto "${projectName}".

Roadmap atual (releases/sprints em ordem, com seus itens):
${JSON.stringify(resumo, null, 2)}

Analise dependências, itens bloqueados, prioridades, riscos de entrega e balanceamento de story points.
Sugira uma reorganização do roadmap que reduza riscos e melhore o fluxo de valor.
Responda em português do Brasil, de forma prática e acionável.`;

  const schema = {
    type: 'object',
    properties: {
      resumo: { type: 'string' },
      sugestoes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            titulo: { type: 'string' },
            descricao: { type: 'string' },
            impacto: { type: 'string', enum: ['baixo', 'medio', 'alto'] },
          },
        },
      },
      riscos_identificados: { type: 'array', items: { type: 'string' } },
    },
    required: ['resumo', 'sugestoes'],
  };

  return await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema });
}