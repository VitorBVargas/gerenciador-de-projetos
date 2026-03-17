// Tarefas de homologação específicas para produtos de Arrecadação não incluídos no arquivo principal

const parseTasksIntoSections = (tasks) => {
  const sections = [];
  let currentSection = null;

  tasks.forEach(task => {
    if (task === task.toUpperCase() || task.startsWith('ETAPA') || task.startsWith('HOMOLOGAÇÃO') || task.startsWith('SPRINT')) {
      if (currentSection) sections.push(currentSection);
      currentSection = { section: task, tasks: [] };
    } else if (currentSection) {
      currentSection.tasks.push(task);
    }
  });

  if (currentSection) sections.push(currentSection);
  return sections;
};

export const arrecadacaoTasksByProduct = {
  'Gestão Fiscal': parseTasksIntoSections([
    'CADASTROS',
    'Contas COSIF (Validar contas migradas)',
    'Fiscais (Validar cadastro de fiscais)',
    'PROCESSOS',
    'Ações Fiscais (Validar ações fiscais migradas)',
    'PRESTAÇÃO DE CONTAS',
    'Validar necessidade de campos relacionados às prestações de contas'
  ])
};

const normalizeProductName = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\(cloud\)/gi, '')
    .replace(/[()]/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
};

export const getArrecadacaoTasksForProduct = (productName) => {
  if (!productName) return null;
  const normalizedInput = normalizeProductName(productName);
  for (const [key, tasks] of Object.entries(arrecadacaoTasksByProduct)) {
    if (normalizeProductName(key) === normalizedInput) return tasks;
  }
  return null;
};