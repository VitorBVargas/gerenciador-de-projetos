// Periodicidade das obrigações legais de prestação de contas.
// Define quais meses (1-12) cada tipo de obrigação possui competência em um exercício.

// Anuais: competência única em janeiro do ano seguinte ao exercício
export const OBRIGACOES_ANUAIS = ['DECASP', 'Balancete 13'];

// Mensais: todos os 12 meses
export const OBRIGACOES_MENSAIS = ['MSC', 'AM', 'Balancete'];

// Bimestrais: fechamento ao fim de cada bimestre
export const OBRIGACOES_BIMESTRAIS = ['RREO', 'SIOPE', 'SIOPS'];

// Quadrimestrais: fechamento ao fim de cada quadrimestre
export const OBRIGACOES_QUADRIMESTRAIS = ['RGF'];

export const MESES_BIMESTRE = [2, 4, 6, 8, 10, 12];
export const MESES_QUADRIMESTRE = [4, 8, 12];

// Retorna o array de meses (1-12) esperados para um tipo de obrigação no exercício.
// Anuais retornam [] aqui (tratadas à parte, pois caem em jan do ano seguinte).
export function mesesEsperados(nome) {
  if (OBRIGACOES_ANUAIS.includes(nome)) return [];
  if (OBRIGACOES_BIMESTRAIS.includes(nome)) return MESES_BIMESTRE;
  if (OBRIGACOES_QUADRIMESTRAIS.includes(nome)) return MESES_QUADRIMESTRE;
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // mensais (default)
}

// Verifica se um mês (0-indexed) faz parte da periodicidade da obrigação
export function mesPertence(nome, mesIdx0) {
  if (OBRIGACOES_ANUAIS.includes(nome)) return mesIdx0 === 0;
  return mesesEsperados(nome).includes(mesIdx0 + 1);
}