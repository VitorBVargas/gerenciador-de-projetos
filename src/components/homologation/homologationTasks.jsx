// Tarefas de homologação por produto - serão preenchidas depois
// IMPORTANTE: Produtos que não aparecem aqui NÃO têm processo de homologação

// Função para dividir texto por vírgulas, respeitando parênteses
const splitByComma = (text) => {
  const parts = [];
  let current = '';
  let depth = 0;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (char === '(') {
      depth++;
      current += char;
    } else if (char === ')') {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0) {
      const trimmed = current.trim();
      if (trimmed) parts.push(trimmed);
      current = '';
    } else {
      current += char;
    }
  }
  
  const trimmed = current.trim();
  if (trimmed) parts.push(trimmed);
  
  return parts;
};

const parseTasksIntoSections = (tasks) => {
  const sections = [];
  let currentSection = null;

  tasks.forEach(task => {
    // Se a tarefa está em UPPERCASE completo ou começa com "ETAPA", "HOMOLOGAÇÃO" ou "SPRINT", é uma seção
    if (task === task.toUpperCase() || task.startsWith('ETAPA') || task.startsWith('HOMOLOGAÇÃO') || task.startsWith('SPRINT')) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = { section: task, tasks: [] };
    } else if (currentSection) {
      // Divide a tarefa por vírgulas (respeitando parênteses)
      const subtasks = splitByComma(task);
      currentSection.tasks.push(...subtasks);
    }
  });

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
};

// Mapa de produtos com suas tarefas de homologação
export const homologationTasksByProduct = {
  'e-Nota (Cloud)': parseTasksIntoSections([
    'CADASTROS',
    'Entidades',
    'Pessoas',
    'Usuários',
    'Auto de infração (Auto de infração e infrações)',
    'Base cadastral (Lista de serviços Lei 116/03, alíquota do Simples Nacional, taxas diversas, séries do RPS, unidades e contadores)',
    'Configurações (Gerais, pendências financeiras. créditos tributários, tomadores descontados, substitutos tributários, guias de pagamento, solicitações de acesso, liberação de RPS, carta de correção, saldos, mensagem ao prestador, integrações e gerenciador de certificado)',
    'Endereços (Bairros, condomínios, logradouros e loteamentos)',
    'Financeiros (Competências, convênios, indexadores, feriados e incentivos fiscais)',
    'Manutenção de incentivos fiscais',
    'Mensagens',
    'Relatórios personalizados',
    'Rotinas externas',
    'Scripts',
    'PROCESSOS',
    'Liberação',
    'Denúncia fiscal',
    'Prestadores',
    'Autorização para impressão de RPS',
    'Gerar competências',
    'Saldos (consultar saldos, lançar saldos. liberar saldos bloqueados, cancelar saldos e utilizar saldos por restituição)',
    'Créditos tributários (Liberar créditos, cancelar créditos, expirar créditos, gerar créditos, transferir créditos e gerar por script)',
    'Cancelar notas (Sem solicitação, com solicitação e estornar cancelamento)',
    'Substituir notas (Com solicitação e estornar substituição de nota fiscal)',
    'Manutenção de guias de pagamento (Vencimento das guias, cancelamentod as guias, integração das guias)',
    'Manutenções fiscais (Alteração de dedução fiscal e regime tributário, manutenção e remuneração de nota fiscal)',
    'Importação de arquivos (Optantes do simples nacional/SIMEI)',
    'Exportação de notas (Notas fiscais e TSE)',
    'Sincronizar cadastros',
    'Gerenciador de processos',
    'RELATÓRIOS',
    'Acessos (Acessos dos usuários, adesão ao sistema, denúncia fiscal e solicitação de acessos pendentes)',
    'Cadastrais (Bairros e usuários de prestadores)',
    'Créditos (Créditos tributários. extrato dos créditos tributários, créditos tributários por prestadores e créditos tributários por tomadores)',
    'Notas fiscais (Evolução das notas fiscais, maiores eminentes de notas fiscais, manutenções fiscais, notas fiscais, prestadores por notas, serviços prestados e substituições de notas fiscais)',
    'Pagamentos (Evolução da arrecadação, relação de pagamentos, e situação das guias de pagamentos)',
    'RPS (Autorização para impressão de RPS, RPS convertidos e não liberados e RPS convertidos fora do prazo)',
    'Serviços x CNAE',
    'Gerenciador de relatórios',
    'CONSULTAS',
    'Consulta geral',
    'Consultar notas',
    'Consultar lotes de RPS',
    'RPS convertidos fora do prazo',
    'Consultar créditos',
    'Consultar manutenção fiscal',
    'Consultar remunerações de nota fiscal',
    'Cobrança registrada',
    'Importação de nota nacional',
    'RESUMOS',
    'Estatísticos dos valores do ISS',
    'Notas emitidas',
    'GRÁFICOS',
    'Arrecadação por competência',
    'Notas fiscais por atividade',
    'Evolução das notas fiscais',
    'Notas fiscais emitidas por período',
    'Notas fiscais emitidas por prestador',
    'Notas fiscais emitidas por tomador',
    'ACESSOS',
    'Módulo contribuinte',
    'PRESTAÇÃO DE CONTAS',
    'Validar necessidade de campos relacionados às prestações de contas'
  ])
};

// Normaliza o nome do produto removendo "(Cloud)" e caracteres especiais
const normalizeProductName = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\(cloud\)/gi, '')
    .replace(/[()]/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .trim()
    .replace(/\s+/g, ' ');
};

// Função para buscar tarefas por nome de produto
// Retorna null se o produto não tiver processo de homologação
export const getDefaultTasksForProduct = (productName) => {
  if (!productName) return null;
  
  const normalizedInput = normalizeProductName(productName);
  
  // Busca APENAS match exato (considerando com e sem Cloud)
  for (const [key, tasks] of Object.entries(homologationTasksByProduct)) {
    const normalizedKey = normalizeProductName(key);
    if (normalizedKey === normalizedInput) {
      return tasks;
    }
  }
  
  // Se não encontrou match exato, retorna null (produto sem homologação)
  return null;
};

// Verifica se um produto tem processo de homologação
export const productHasHomologation = (productName) => {
  return getDefaultTasksForProduct(productName) !== null;
};