// Tarefas de homologação por produto - serão preenchidas depois
// IMPORTANTE: Produtos que não aparecem aqui NÃO têm processo de homologação

const parseTasksIntoSections = (tasks) => {
  const sections = [];
  let currentSection = null;

  tasks.forEach(task => {
    // Se a tarefa está em UPPERCASE completo ou começa com "ETAPA" ou "HOMOLOGAÇÃO", é uma seção
    if (task === task.toUpperCase() || task.startsWith('ETAPA') || task.startsWith('HOMOLOGAÇÃO')) {
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

// Mapa de produtos com suas tarefas de homologação (será preenchido)
export const homologationTasksByProduct = {
  // Exemplos serão adicionados depois
};

// Normaliza o nome do produto removendo "(Cloud)" e caracteres especiais
const normalizeProductName = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\(cloud\)/gi, '')
    .replace(/[()]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
};

// Função para buscar tarefas por nome de produto
// Retorna null se o produto não tiver processo de homologação
export const getDefaultTasksForProduct = (productName) => {
  if (!productName) return null;
  
  const normalizedInput = normalizeProductName(productName);
  
  // Busca exata primeiro (considerando com e sem Cloud)
  for (const [key, tasks] of Object.entries(homologationTasksByProduct)) {
    const normalizedKey = normalizeProductName(key);
    if (normalizedKey === normalizedInput) {
      return tasks;
    }
  }
  
  // Busca parcial - só se o input inteiro estiver contido na key
  for (const [key, tasks] of Object.entries(homologationTasksByProduct)) {
    const normalizedKey = normalizeProductName(key);
    if (normalizedKey === normalizedInput || 
        (normalizedKey.startsWith(normalizedInput + ' ') || 
         normalizedKey.endsWith(' ' + normalizedInput))) {
      return tasks;
    }
  }
  
  // Se não encontrou, retorna null (produto sem homologação)
  return null;
};

// Verifica se um produto tem processo de homologação
export const productHasHomologation = (productName) => {
  return getDefaultTasksForProduct(productName) !== null;
};