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

const obrasCloudTasks = parseTasksIntoSections([
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
]);

const educacaoCloudTasks = parseTasksIntoSections([
  'Cadastro de Entidade',
  'Escola cadastrada corretamente (Nome)',
  'Código INEP informado',
  'Endereço completo (logradouro, número, bairro, CEP, município, UF)',
  'Área de atuação',
  'Infraestrutura/Dependências',
  'Oferta Educacional',
  'Etapas de ensino cadastradas',
  'Modalidades de ensino cadastradas',
  'Série(s) cadastrada(s)',
  'Turmas cadastradas',
  'Alunos cadastrados',
  'Matrículas ativas',
  'Turmas do ensino regular ativas',
  'Turmas de EJA ativas',
  'Professorado',
  'Professores cadastrados',
  'Profissionais de educação cadastrados',
  'Coordenadores/Supervisores cadastrados',
  'Funcionários administrativos cadastrados',
  'Estrutura Física',
  'Salas de aula cadastradas',
  'Laboratórios cadastrados',
  'Biblioteca/Sala de leitura cadastrada',
  'Quadra de esportes/Ginásio cadastrado',
  'Refeitório/Cantina cadastrado',
  'Auditório/Sala de reunião cadastrado',
  'Parques/Áreas de lazer cadastradas',
  'Recursos Tecnológicos',
  'Computadores cadastrados',
  'Impressoras cadastradas',
  'Projetores cadastrados',
  'Lousa digital cadastrada',
  'Acesso à internet verificado',
  'Sistema de Ponto/Presença',
  'Professores com ponto configurado',
  'Funcionários com ponto configurado',
  'Alunos com presença configurada',
  'Financeiro',
  'Dados bancários da escola verificados',
  'Calendário escolar definido',
  'Calendário letivo definido',
  'Períodos de matrícula definidos',
  'Períodos de avaliação definidos',
  'Manutenção/Suporte',
  'Dados de contato do gestor da escola verificados',
  'Dados de contato do responsável técnico verificados',
  'Acesso de usuários administrativos configurados',
  'Acesso de usuários docentes configurados',
  'Acesso de usuários gestores configurados',
  'Acesso para pais/responsáveis configurado',
  'Treinamento realizado com gestor',
  'Treinamento realizado com equipe técnica'
]);

const professoresCloudTasks = parseTasksIntoSections([
  'Diário de Classe',
  'Diário aberto para a turma',
  'Frequência disponível',
  'Avaliações lançadas corretamente',
  'Conteúdos registrados',
  'Fechamento do diário realizado'
]);

const paisAlunosCloudTasks = parseTasksIntoSections([
  'Pais e Alunos',
  'Geração e distribuição de acessos (tokens/chaves) para pais, alunos e responsáveis',
  'Habilitação da consulta online de desempenho escolar (notas, provas e atividades)',
  'Habilitação da consulta de frequência e emissão de boletim escolar online',
  'Configuração do ambiente para publicação de materiais, conteúdos e informativos pelos professores/gestores',
  'Parametrização da funcionalidade de registro de interesse por rematrícula online'
]);

export const getExtendedTasksForProduct = (productName) => {
  const tasks = {
    'obras': obrasCloudTasks,
    'obras (cloud)': obrasCloudTasks,
    'educacao': educacaoCloudTasks,
    'educacao (cloud)': educacaoCloudTasks,
    'professores': professoresCloudTasks,
    'professores (cloud)': professoresCloudTasks,
    'pais e alunos': paisAlunosCloudTasks,
    'pais e alunos (cloud)': paisAlunosCloudTasks
  };
  
  const normalized = (productName || '').toLowerCase().replace(/\(cloud\)/g, '').trim();
  return tasks[normalized] || null;
};