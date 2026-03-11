// Tarefas de migração por produto - extraídas do arquivo RotinasdeMigrao.txt
// IMPORTANTE: Produtos que não aparecem aqui NÃO têm processo de migração (ex: Conecta, Documentos)

const parseTasksIntoSections = (tasks) => {
  const sections = [];
  let currentSection = null;

  tasks.forEach(task => {
    // Se a tarefa está em UPPERCASE completo ou começa com "ETAPA" ou "MIGRAÇÃO", é uma seção
    if (task === task.toUpperCase() || task.startsWith('ETAPA') || task.startsWith('MIGRAÇÃO')) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = { section: task, tasks: [] };
    } else if (currentSection) {
      currentSection.tasks.push(task);
    }
  });

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
};

// Mapa de produtos com suas tarefas de migração
export const migrationTasksByProduct = {
  'e-Nota (Cloud)': parseTasksIntoSections([
    'DADOS CADASTRAIS',
    'Extrair Competências',
    'Extrair Indexadores',
    'Extrair Lista de Serviços',
    'Extair Incentivos Fiscais',
    'Extrair Serviços Pessoa',
    'Extrair Simples Nacional',
    'Extrair Incentivo Pessoa',
    'Extrair Contribuinte Prestador',
    'Extrair Isenção Pessoa',
    'Extrair Perfil Prestador',
    'Extrair Serviço Contribuinte Prestador',
    'Extrair Tributos Federais do Contribuinte Prestador',
    'Extrair e-mail Prestador',
    'Extrair Cadastro de Tomadores',
    'DADOS DE LANÇAMENTOS',
    'Extrair RPS',
    'Extrair Impressão de RPS',
    'Extrair Notas Fiscais (Prestador, Tomador, Serviço, Obra...)',
    'Extrair XML Notas Fiscais',
    'Extrair Substituição Nota / Estorno',
    'Extrair Cancelamento Nota',
    'Extrair Resumo Créditos Tributários',
    'Extrair Movimentação Créditos Tributários',
    'Extrair Denúncias',
    'Extrair Infrações',
    'Extrair Autos',
    'Extrair Guias de Pagamentos'
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
// Retorna null se o produto não tiver processo de migração
export const getDefaultTasksForProduct = (productName) => {
  if (!productName) return null;
  
  const normalizedInput = normalizeProductName(productName);
  
  // Busca APENAS match exato (considerando com e sem Cloud)
  for (const [key, tasks] of Object.entries(migrationTasksByProduct)) {
    const normalizedKey = normalizeProductName(key);
    if (normalizedKey === normalizedInput) {
      return tasks;
    }
  }
  
  // Se não encontrou match exato, retorna null (produto sem migração)
  return null;
};

// Verifica se um produto tem processo de migração
export const productHasMigration = (productName) => {
  return getDefaultTasksForProduct(productName) !== null;
};