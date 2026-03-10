/**
 * Entity Name Map - mantém histórico de entidades criadas com suas abreviações
 * Armazenado no localStorage para persistência entre sessões
 */

const STORAGE_KEY = 'betha_entity_names';

// Mapa de palavras-chave diretas (muito robustas)
const KEYWORD_RULES = {
  cm: ['câmara', 'camara', 'câmara municipal'],
  pm: ['prefeitura', 'município', 'municipio'],
  fms: ['fundo municipal de saúde', 'fundo municipal de saude', 'saúde', 'saude'],
  fme: ['fundo municipal de educação', 'fundo municipal de educacao', 'educação', 'educacao'],
  araprev: ['araprev'],
  ipas: [
    'previdencia', 'previdência', 'ipas', 
    'instituto de previdencia', 'instituto de previdência',
    'instituto de previdência social', 'instituto de previdencia social',
    'instituto previdenciário', 'instituto previdenciario',
    'servidor público', 'servidor publico', 'servidores públicos', 'servidores publicos'
  ],
  fmas: ['assistencia social', 'assistência social', 'fundo municipal assistencia social'],
  fma: ['meio ambiente'],
  fundeb: ['fundeb'],
};

const getStoredMap = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const saveStoredMap = (map) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('Failed to save entity map to localStorage:', e);
  }
};

/**
 * Infere código de entidade com lógica robusta
 * @param {string} entityName - Nome completo da entidade (ex: "SAEMA - Serviço de Água")
 * @returns {string} - Código abreviado (ex: "SAEMA")
 */
export const inferEntityCode = (entityName) => {
  if (!entityName) return 'UNKN';
  
  const storedMap = getStoredMap();
  const normalized = entityName.toLowerCase().trim();
  
  // 1. Checar se já foi visto antes (most important - usa histórico)
  for (const [code, fullNames] of Object.entries(storedMap)) {
    if (fullNames.includes(entityName)) {
      return code;
    }
  }
  
  // 2. Checar palavras-chave específicas (muito robustas)
  for (const [code, keywords] of Object.entries(KEYWORD_RULES)) {
    if (keywords.some(kw => normalized.includes(kw))) {
      // Armazenar mapeamento para próximas vezes
      const upperCode = code.toUpperCase();
      storedMap[upperCode] = [...(storedMap[upperCode] || []), entityName];
      saveStoredMap(storedMap);
      return upperCode;
    }
  }
  
  // 3. Tentar extrair sigla do início (ex: "SAEMA - Serviço..." ou "ARAPREV - ...")
  const raw = entityName.trim();
  const siglaMatch = raw.match(/^([A-Z]{2,8})(?:\s*[-–,]|\s+(?=[a-záéíóúâêôãõç])|\s*$)/);
  if (siglaMatch) {
    const code = siglaMatch[1];
    storedMap[code] = [...(storedMap[code] || []), entityName];
    saveStoredMap(storedMap);
    return code;
  }
  
  // 4. Sigla entre parênteses no início
  const parenMatch = raw.match(/^\(([A-Z]{2,8})\)/);
  if (parenMatch) {
    const code = parenMatch[1];
    storedMap[code] = [...(storedMap[code] || []), entityName];
    saveStoredMap(storedMap);
    return code;
  }
  
  // 5. Fallback: primeiras letras de palavras com mais de 2 caracteres
  const words = raw.split(/[\s\-–]+/).filter(w => w.length > 2 && /^[A-Za-zÀ-ú]/.test(w));
  const code = words.map(w => w[0].toUpperCase()).join('').slice(0, 5) || 'ENT';
  
  storedMap[code] = [...(storedMap[code] || []), entityName];
  saveStoredMap(storedMap);
  
  return code;
};

/**
 * Obtém o nome completo de uma entidade usando seu código abreviado
 * @param {string} code - Código abreviado (ex: "SAEMA")
 * @returns {string|null} - Nome completo ou null se não encontrado
 */
export const getEntityFullName = (code) => {
  const storedMap = getStoredMap();
  const names = storedMap[code?.toUpperCase()] || [];
  // Retorna o primeiro (mais recente registrado)
  return names.length > 0 ? names[0] : null;
};

/**
 * Registra ou atualiza um mapeamento de código para nome completo
 * @param {string} code - Código abreviado
 * @param {string} fullName - Nome completo
 */
export const registerEntity = (code, fullName) => {
  const storedMap = getStoredMap();
  const key = code?.toUpperCase();
  if (!key || !fullName) return;
  
  // Evitar duplicatas
  if (!storedMap[key]) {
    storedMap[key] = [];
  }
  if (!storedMap[key].includes(fullName)) {
    storedMap[key].unshift(fullName); // Adiciona no início
  }
  
  saveStoredMap(storedMap);
};

/**
 * Limpa o mapa armazenado (útil para testes ou reset)
 */
export const clearEntityMap = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear entity map:', e);
  }
};