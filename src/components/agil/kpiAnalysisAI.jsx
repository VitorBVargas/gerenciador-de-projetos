import { base44 } from '@/api/base44Client';
import { KPI_CATALOG } from './kpiCatalog';

// Gera uma análise da IA para os indicadores ágeis, com diagnóstico e recomendações.
export async function analisarKpisIA({ projectName, kpis, history }) {
  const catalogLines = KPI_CATALOG.map(k => `- ${k.nome} (${k.id}): ${k.desc} | Faixa ideal: ${k.faixa}`).join('\n');
  const valoresLines = KPI_CATALOG.map(k => `- ${k.nome}: ${kpis[k.id]}${k.unidade ? ' ' + k.unidade : ''}`).join('\n');
  const histLine = history && history.length
    ? `Histórico recente (por sprint): ${JSON.stringify(history.slice(-6))}`
    : 'Sem histórico suficiente.';

  const prompt = `Você é um Scrum Master/Agile Coach sênior analisando os indicadores de um projeto ágil chamado "${projectName}".

Catálogo de indicadores:
${catalogLines}

Valores atuais:
${valoresLines}

${histLine}

Analise de forma objetiva e prática (em português do Brasil). Aponte:
1. Diagnóstico geral da saúde do time e do fluxo.
2. Indicadores em situação de alerta ou fora da faixa ideal, explicando o porquê.
3. Tendências relevantes com base no histórico.
4. Recomendações acionáveis priorizadas.`;

  const schema = {
    type: 'object',
    properties: {
      resumo: { type: 'string', description: 'Diagnóstico geral em 2-3 frases' },
      status_geral: { type: 'string', enum: ['saudavel', 'atencao', 'critico'] },
      alertas: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            kpi: { type: 'string' },
            severidade: { type: 'string', enum: ['baixa', 'media', 'alta'] },
            causa: { type: 'string' },
          },
        },
      },
      tendencias: { type: 'array', items: { type: 'string' } },
      recomendacoes: { type: 'array', items: { type: 'string' } },
    },
    required: ['resumo', 'status_geral', 'recomendacoes'],
  };

  return await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema });
}