// Utilitários para os cálculos de Discovery (GUT, RICE)

export const gutScore = (gap) => {
  const g = Number(gap?.gravidade) || 0;
  const u = Number(gap?.urgencia) || 0;
  const t = Number(gap?.tendencia) || 0;
  return g * u * t;
};

export const riceScore = (a) => {
  const reach = Number(a?.reach) || 0;
  const impact = Number(a?.impact) || 0;
  const confidence = Number(a?.confidence) || 0;
  const effort = Number(a?.effort) || 1;
  if (effort <= 0) return 0;
  return Math.round((reach * impact * (confidence / 100)) / effort * 10) / 10;
};

export const ricePriority = (score) => {
  if (score >= 50) return 'critica';
  if (score >= 20) return 'alta';
  if (score >= 5) return 'media';
  return 'baixa';
};

export const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const emptyDiscovery = (name = '') => ({
  name,
  status: 'em_andamento',
  diagnostico: { problema: '', porque_resolver: '', cinco_porques: ['', '', '', '', ''], causa_raiz: '', observacoes: '' },
  as_is: { descricao_processo: '', gaps: [], bpmn_link: '', ideias: [] },
  to_be: { descricao: '', melhorias: '', beneficios: '' },
  acoes: [],
  mvp: { descricao: '', validacao: '', criterios_sucesso: '' }
});