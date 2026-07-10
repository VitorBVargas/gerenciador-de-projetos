import { base44 } from '@/api/base44Client';
import { buildDiscoveryContext } from './agilBacklogAI';

// Itens obrigatórios avaliados no Gate de Qualidade do Discovery.
export const MATURITY_ITEMS = [
  'Objetivo', 'Problema', 'Contexto', 'Impacto', 'Persona', 'Stakeholders',
  '5 Porquês', 'Causa Raiz', 'AS IS', 'TO BE', 'Hipóteses', 'Plano de Ação',
  'Dependências', 'Premissas', 'Restrições', 'Riscos', 'Critérios de Sucesso',
  'Valor Esperado', 'Indicadores', 'Escopo', 'Itens Fora do Escopo',
];

// Classificação do Discovery Score.
export function classifyScore(score) {
  const s = Number(score) || 0;
  if (s >= 90) return { label: 'Excelente', sub: 'Pronto para Desenvolvimento', color: 'emerald' };
  if (s >= 80) return { label: 'Muito Bom', sub: 'Poucos ajustes recomendados', color: 'green' };
  if (s >= 70) return { label: 'Bom', sub: 'Pode seguir, porém existem lacunas', color: 'lime' };
  if (s >= 50) return { label: 'Atenção', sub: 'Discovery incompleto', color: 'amber' };
  return { label: 'Crítico', sub: 'Não recomendado iniciar desenvolvimento', color: 'red' };
}

const responseSchema = {
  type: 'object',
  properties: {
    score: { type: 'number', description: 'Discovery Score de 0 a 100' },
    complexidade: { type: 'string', enum: ['Baixa', 'Média', 'Alta', 'Muito Alta'], description: 'Complexidade estimada do produto' },
    resumo_executivo: { type: 'string', description: 'Resumo executivo crítico da qualidade do Discovery (3 a 6 frases)' },
    itens: {
      type: 'array',
      description: 'Um objeto para cada item avaliado do Discovery',
      items: {
        type: 'object',
        properties: {
          nome: { type: 'string', description: 'Nome do item avaliado' },
          status: { type: 'string', enum: ['completo', 'parcial', 'pouco_detalhado', 'nao_encontrado'] },
          observacao: { type: 'string', description: 'Observação curta sobre o item' },
        },
        required: ['nome', 'status'],
      },
    },
    sugestoes: {
      type: 'array',
      description: 'Sugestões de melhoria do Discovery',
      items: { type: 'string' },
    },
    riscos: {
      type: 'array',
      description: 'Riscos decorrentes de baixa maturidade (preencher especialmente quando score < 70)',
      items: {
        type: 'object',
        properties: {
          titulo: { type: 'string' },
          descricao: { type: 'string' },
          probabilidade: { type: 'string', enum: ['baixa', 'media', 'alta'] },
          impacto: { type: 'string', enum: ['baixo', 'medio', 'alto'] },
          mitigacao: { type: 'string' },
        },
        required: ['titulo'],
      },
    },
    estimativa: {
      type: 'object',
      properties: {
        epics: { type: 'number' },
        features: { type: 'number' },
        stories: { type: 'number' },
        sprints: { type: 'number' },
        tempo_estimado: { type: 'string', description: 'Tempo estimado, ex: 3 a 4 meses' },
        equipe: { type: 'array', items: { type: 'string' }, description: 'Equipe recomendada, ex: "1 Product Owner", "5 Desenvolvedores"' },
      },
    },
  },
  required: ['score', 'itens', 'resumo_executivo'],
};

// Executa a Análise de Maturidade do Discovery (Gate de Qualidade).
export async function analyzeDiscoveryMaturity({ project, discovery }) {
  const context = buildDiscoveryContext(discovery);

  const prompt = `Você é um Product Manager Sênior realizando uma REVISÃO CRÍTICA de qualidade de um Discovery de produto ANTES de gerar o Product Backlog. Seu papel é atuar como um Gate Oficial de Qualidade: impedir que um backlog seja construído sobre informações insuficientes.

PROJETO: ${project?.name || ''}
${project?.agil_objetivo ? `Objetivo declarado: ${project.agil_objetivo}` : ''}

DISCOVERY:
${context || '(sem conteúdo detalhado — o Discovery está praticamente vazio; avalie com rigor)'}

TAREFA:
1. Atribua um DISCOVERY SCORE de 0 a 100 refletindo a maturidade real do Discovery (seja rigoroso e honesto — não infle).
2. Estime a COMPLEXIDADE do produto: Baixa, Média, Alta ou Muito Alta.
3. Avalie CADA UM dos itens a seguir e classifique como: "completo", "parcial", "pouco_detalhado" ou "nao_encontrado", com uma observação curta:
${MATURITY_ITEMS.map(i => `- ${i}`).join('\n')}
4. Escreva um RESUMO EXECUTIVO crítico apontando pontos fortes e lacunas.
5. Liste SUGESTÕES objetivas de melhoria (ex: Adicionar Personas, Definir Indicadores, Detalhar Critérios de Aceite, Revisar Escopo, Melhorar Hipóteses, Adicionar Métricas, Definir MVP, Melhorar Plano de Validação).
6. Se o SCORE for inferior a 70, gere RISCOS de baixa maturidade (ex: Escopo mal definido, Requisitos incompletos, Retrabalho, Mudanças frequentes, Baixa previsibilidade, Baixa aderência do MVP), com probabilidade, impacto e mitigação.
7. ESTIME a quantidade provável de Épicos, Features, User Stories e Sprints, o tempo estimado e a equipe recomendada.

Responda estritamente no schema JSON solicitado.`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: responseSchema,
    model: 'claude_sonnet_4_6',
  });

  // Garante score em faixa válida
  if (result) result.score = Math.max(0, Math.min(100, Math.round(Number(result.score) || 0)));
  return result;
}

// Cria os riscos de baixa maturidade no projeto (enviados ao Gerente de Riscos).
export async function persistMaturityRisks({ projectId, riscos }) {
  if (!(riscos || []).length) return 0;
  const probMap = { baixa: 2, media: 3, alta: 4 };
  const impMap = { baixo: 2, medio: 3, alto: 4 };
  try {
    await base44.entities.Risk.bulkCreate(riscos.map(r => ({
      project_id: projectId,
      title: r.titulo,
      description: r.descricao || '',
      category: 'produto',
      probability: probMap[r.probabilidade] || 3,
      impact: impMap[r.impacto] || 3,
      mitigation: r.mitigacao || '',
      source: 'ia',
      origem: 'discovery_maturidade',
      status: 'aberto',
    })));
    return riscos.length;
  } catch (e) {
    console.warn('Não foi possível criar riscos de maturidade:', e?.message);
    return 0;
  }
}