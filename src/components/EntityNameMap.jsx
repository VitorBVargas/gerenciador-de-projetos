/**
 * Entity Name Map - Infere código de entidade baseado em extração de siglas ou iniciais
 * Lógica simplificada: sigla explícita > iniciais de palavras significativas
 */

// Palavras ignoradas na geração de siglas
const IGNORED_WORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'em', 'para', 'com'
]);

/**
 * Infere código de entidade
 * Prioridade: 1) Sigla explícita no nome, 2) Iniciais de palavras significativas
 * 
 * @param {string} entityName - Nome completo da entidade
 * @returns {string} - Código abreviado
 * 
 * Exemplos:
 * - "Prefeitura Municipal de Ibirité" → PMI
 * - "Câmara Municipal Ibirité" → CMI
 * - "Instituto de Previdência Social de Ibirité - IPASI" → IPASI
 * - "Fundo Municipal de Habitacao de Interesse Social de Ibirité MG" → FMHISI
 * - "Hospital de Criciuma" → HC
 * - "Consorcio de saude de Lagoa santa" → CSLS
 * - "Consorcio de Saude de Ibirita - AMREC" → AMREC
 */
export const inferEntityCode = (entityName) => {
  if (!entityName) return 'ENTIDADE';
  
  const raw = entityName.trim();
  
  // 1. Extrair sigla explícita após traço/hífen (ex: "Nome - SIGLA" ou "Nome -SIGLA")
  const dashSiglaMatch = raw.match(/[-–—]\s*([A-Z]{2,10})(?:\s|$)/);
  if (dashSiglaMatch) {
    return dashSiglaMatch[1];
  }
  
  // 2. Extrair sigla no início (ex: "SIGLA - Nome" ou "SIGLA Nome")
  const startSiglaMatch = raw.match(/^([A-Z]{2,10})(?:\s*[-–—,]|\s+)/);
  if (startSiglaMatch) {
    return startSiglaMatch[1];
  }
  
  // 3. Sigla entre parênteses (ex: "(SIGLA) Nome" ou "Nome (SIGLA)")
  const parenMatch = raw.match(/\(([A-Z]{2,10})\)/);
  if (parenMatch) {
    return parenMatch[1];
  }
  
  // 4. Gerar sigla a partir das iniciais de palavras significativas
  // Remove pontuação e separa por espaços/hífens
  const words = raw
    .replace(/[-–—]/g, ' ') // Substitui hífens por espaço
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => {
      const lower = w.toLowerCase();
      // Ignora palavras vazias, preposições e palavras muito curtas (≤ 1 letra)
      return w.length > 1 && !IGNORED_WORDS.has(lower);
    })
    .map(w => {
      // Remove pontuação do início/fim da palavra
      return w.replace(/^[^\w]+|[^\w]+$/g, '');
    })
    .filter(w => w.length > 0);
  
  // Pega primeira letra de cada palavra significativa (maiúscula)
  const initials = words
    .map(w => w.charAt(0).toUpperCase())
    .join('');
  
  return initials || 'ENT';
};

/**
 * Normaliza um nome de entidade para comparação
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
 * Obtém o nome completo (retorna o próprio código - sem persistência)
 */
export const getEntityFullName = (code) => {
  return code || '';
};

/**
 * Registra uma entidade (compatibilidade - não faz nada)
 */
export const registerEntity = (code, fullName) => {
  // Função mantida para compatibilidade
};