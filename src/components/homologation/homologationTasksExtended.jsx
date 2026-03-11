// Tarefas de homologação estendidas para novos produtos
const parseTasksIntoSections = (tasks) => {
  const sections = [];
  let currentSection = null;

  tasks.forEach(task => {
    if (task === task.toUpperCase() || task.startsWith('ETAPA')) {
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

export const homologationTasksExtended = {
  'Obras (Cloud)': parseTasksIntoSections([
    'OBRAS',
    'Verificar se as obras foram migradas corretamente',
    'TIPOS DE OBRA',
    'Verificar se os tipos de obra foram migrados corretamente',
    'CATEGORIAS',
    'Verificar se as categorias foram migradas corretamente',
    'ORGANOGRAMAS',
    'Verificar se os organogramas foram migrados corretamente',
    'MEDIÇÕES',
    'Verificar se as medições das obras cadastradas foram migradas corretamente',
    'SITUAÇÕES',
    'Verificar se as situações das obras foram migradas corretamente'
  ])
};