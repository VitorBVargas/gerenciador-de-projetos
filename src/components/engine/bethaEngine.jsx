// ============================================================================
// BETHA PRESENTATION ENGINE
// ----------------------------------------------------------------------------
// Motor de template corporativo. NÃO gera layouts nem reinventa apresentações.
// Define UMA fonte da verdade do design system Betha e resolve placeholders.
// Todos os documentos da plataforma devem consumir este motor.
// ============================================================================

// --- DESIGN SYSTEM (identidade Betha) ---------------------------------------
export const BETHA = {
  colors: {
    primary: '#2563EB',     // Cor primária
    secondary: '#1D4ED8',   // Cor secundária
    support: '#DBEAFE',     // Cor de apoio
    text: '#FFFFFF',        // Texto sobre fundo de marca
    ink: '#0F172A',         // Texto sobre fundo claro
    muted: '#64748B',
  },
  gradients: {
    brand: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 45%, #1E40AF 100%)',
    brandSky: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 50%, #0EA5E9 100%)',
    light: 'linear-gradient(135deg, #EFF6FF 0%, #ECFEFF 100%)',
    closing: 'linear-gradient(135deg, #2563EB 0%, #BAE6FD 100%)',
  },
  card: {
    radius: 16,             // Cards: borda arredondada 16px
    shadow: '0 10px 25px -5px rgba(37, 99, 235, 0.20)', // Sombras leves
  },
  font: "'Inter', system-ui, sans-serif",
  slide: { ratio: '16/9' },
};

// --- PLACEHOLDERS -----------------------------------------------------------
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Monta o dicionário de placeholders a partir dos dados do projeto.
export function buildPlaceholders(project) {
  const now = new Date();
  const p = project || {};
  return {
    CLIENTE: p.city || p.name || '—',
    PROJETO: p.name || '—',
    PORTFOLIO: p.portfolio_manager || '—',
    GERENTE: p.manager || '—',
    COORDENADOR: p.coordinator || '—',
    DATA: now.toLocaleDateString('pt-BR'),
    MES: MESES[now.getMonth()],
    ANO: String(now.getFullYear()),
  };
}

// Substitui {{CHAVE}} pelos valores resolvidos. Só toca em campos variáveis.
export function applyPlaceholders(text, values) {
  if (typeof text !== 'string') return text;
  return text.replace(/\{\{\s*([A-Z_]+)\s*\}\}/g, (m, key) =>
    (values && values[key] != null) ? values[key] : m
  );
}