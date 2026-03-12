/**
 * Entity Name Map - Infere código de entidade baseado em regras de palavras-chave e extração de siglas
 * SEM persistência entre projetos (evita contaminação de dados)
 */

// Mapa de palavras-chave para detectar tipos de entidade
const KEYWORD_RULES = {
  CM: ['câmara', 'camara', 'câmara municipal', 'camara municipal'],
  PM: ['prefeitura municipal', 'prefeitura de', 'município de', 'municipio de'],
  IPASI: [
    'instituto de previdência', 'instituto de previdencia',
    'previdência social', 'previdencia social',
    'instituto previdenciário', 'instituto previdenciario',
    'regime próprio', 'regime proprio', 'rpps',
    'ipasi', 'ipas'
  ],
  FMAS: [
    'fundo municipal de assistência social', 'fundo municipal de assistencia social',
    'assistência social', 'assistencia social',
    'fmas'
  ],
  FMS: [
    'fundo municipal de saúde', 'fundo municipal de saude',
    'fundo de saúde', 'fundo de saude',
    'fms'
  ],
  FME: [
    'fundo municipal de educação', 'fundo municipal de educacao',
    'fundo de educação', 'fundo de educacao',
    'fme'
  ],
  FMCA: [
    'fundo municipal da criança', 'fundo da criança',
    'criança e adolescente', 'crianca e adolescente',
    'fmca'
  ],
  FMHIS: [
    'fundo municipal de habitação', 'fundo de habitacao',
    'habitação de interesse social', 'habitacao de interesse social',
    'fmhis'
  ],
  FMII: [
    'fundo municipal do idoso', 'fundo do idoso',
    'fmii'
  ],
  FMMA: [
    'fundo municipal de meio ambiente', 'meio ambiente',
    'fmma'
  ],
  FUNDEB: ['fundeb'],
};

/**
 * Infere código de entidade com lógica robusta (sem persistência)
 * @param {string} entityName - Nome completo da entidade (ex: "IPASI - Instituto de Previdência")
 * @returns {string} - Código abreviado (ex: "IPASI")
 */
export const inferEntityCode = (entityName) => {
  if (!entityName) return 'ENTIDADE';
  
  const normalized = entityName.toLowerCase().trim();
  const raw = entityName.trim();
  
  // 1. Tentar extrair sigla do início PRIMEIRO (ex: "IPASI - Instituto..." ou "CM - Câmara...")
  // Isso tem prioridade sobre palavras-chave para evitar conflitos
  const siglaMatch = raw.match(/^([A-Z]{2,10})(?:\s*[-–—,]|\s+)/);
  if (siglaMatch) {
    return siglaMatch[1];
  }
  
  // 2. Sigla entre parênteses no início (ex: "(IPASI) Instituto...")
  const parenMatch = raw.match(/^\(([A-Z]{2,10})\)/);
  if (parenMatch) {
    return parenMatch[1];
  }
  
  // 3. Checar palavras-chave específicas (ordem importa - mais específicas primeiro)
  for (const [code, keywords] of Object.entries(KEYWORD_RULES)) {
    if (keywords.some(kw => normalized.includes(kw))) {
      return code;
    }
  }
  
  // 4. Fallback: primeiras letras de palavras significativas (>2 caracteres)
  const words = raw
    .split(/[\s\-–—]+/)
    .filter(w => 
      w.length > 2 && 
      /^[A-Za-zÀ-ú]/.test(w) &&
      !['fundo', 'municipal', 'instituto'].includes(w.toLowerCase())
    );
  
  const fallbackCode = words
    .map(w => w[0].toUpperCase())
    .join('')
    .slice(0, 5);
  
  return fallbackCode || 'ENT';
};

/**
 * Normaliza um nome de entidade para comparação
 * Remove acentos, converte para minúsculas e remove espaços extras
 */
export const normalizeEntityName = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Obtém o nome completo de uma entidade usando seu código abreviado
 * Como não há mais persistência, retorna apenas o código
 * @param {string} code - Código abreviado (ex: "IPASI")
 * @returns {string} - Retorna o próprio código
 */
export const getEntityFullName = (code) => {
  return code || '';
};