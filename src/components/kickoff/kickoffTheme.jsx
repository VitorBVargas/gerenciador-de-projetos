// ============================================================================
// IDENTIDADE BETHA — tokens do novo Kick-Off (cores, fontes, helpers)
// ============================================================================
export const BETHA = {
  blue: '#2563EB',
  blueDark: '#1D4ED8',
  blueDeep: '#1E3A8A',
  sky: '#0EA5E9',
  cyan: '#22D3EE',
  ink: '#0F172A',
  slate: '#475569',
  mist: '#EFF6FF',
  white: '#FFFFFF',
};

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MES_ABBR = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

export function buildContext(project) {
  const now = new Date();
  const p = project || {};
  return {
    cliente: p.city || p.name || '—',
    projeto: p.name || '—',
    portfolio: p.portfolio_manager || '—',
    gerente: p.manager || '—',
    coordenador: p.coordinator || '—',
    mes: MESES[now.getMonth()],
    ano: String(now.getFullYear()),
    mesAno: `${MES_ABBR[now.getMonth()]}/${now.getFullYear()}`,
  };
}

export function fmtMoney(v) {
  if (!v && v !== 0) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
}