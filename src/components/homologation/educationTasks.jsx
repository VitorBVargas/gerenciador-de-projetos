// Tasks para produtos de educação
const parseTasksIntoSections = (tasks) => {
  const sections = [];
  let currentSection = null;

  tasks.forEach(task => {
    if (task === task.toUpperCase() || task.startsWith('ETAPA') || task.startsWith('HOMOLOGAÇÃO') || task.startsWith('SPRINT')) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = { section: task, tasks: [] };
    } else if (currentSection) {
      const subtasks = task.includes(',') ? task.split(',').map(t => t.trim()) : [task];
      currentSection.tasks.push(...subtasks);
    }
  });

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
};

export const educationTasks = {
  'Educação (Cloud)': parseTasksIntoSections([
    'Dados Cadastrais',
    'Entidades e anos letivos (verificar cadastros)',
    'Escolas, turnos e modalidades (verificar cadastros)',
    'Séries, salas de aula e turmas (verificar cadastros)',
    'Professores, funcionários e equipe pedagógica (verificar cadastros)',
    'Alunos, matrículas e frequência (verificar cadastros)',
    'Componentes curriculares e avaliações (verificar estrutura)',
    'Calendário escolar e períodos letivos (verificar datas)',
    'Horários de aula e jornadas de trabalho (verificar configuração)',
    'Recursos e infraestrutura (verificar disponibilidade)',
    'Dados de Lançamentos',
    'Notas e conceitos (verificar lançamento)',
    'Frequência de alunos (verificar registro)',
    'Planos de aula e conteúdos (verificar publicação)',
    'Relatórios pedagógicos (verificar geração)',
    'Históricos escolares e certificados (verificar emissão)',
    'Movimentações de alunos (verificar registro)',
    'Integração com outros sistemas'
  ]),
  'Professores (Cloud)': parseTasksIntoSections([
    'Diário de Classe',
    'Diário aberto para a turma',
    'Frequência disponível',
    'Avaliações lançadas corretamente',
    'Conteúdos registrados',
    'Fechamento do diário realizado'
  ]),
  'Pais e Alunos (Cloud)': parseTasksIntoSections([
    'Pais e Alunos',
    'Geração e distribuição de acessos (tokens/chaves) para pais, alunos e responsáveis',
    'Habilitação da consulta online de desempenho escolar (notas, provas e atividades)',
    'Habilitação da consulta de frequência e emissão de boletim escolar online',
    'Configuração do ambiente para publicação de materiais, conteúdos e informativos pelos professores/gestores',
    'Parametrização da funcionalidade de registro de interesse por rematrícula online'
  ]),
  'Biblioteca (Cloud)': parseTasksIntoSections([
    'Dados Cadastrais',
    'Bibliotecas, títulos de materiais e autores (verificar cadastros)',
    'Classificações, assuntos e editoras (verificar configuração)',
    'Categorias e tipos de materiais (verificar cadastro)',
    'Leitores e empréstimos (verificar configuração)',
    'Dados de Lançamentos',
    'Empréstimos de materiais (verificar registro)',
    'Devoluções e multas (verificar cálculo)',
    'Reservas de materiais (verificar funcionamento)',
    'Relatórios de biblioteca (verificar geração)'
  ]),
  'Merenda Escolar (Cloud)': parseTasksIntoSections([
    'Merenda Escolar',
    'Cadastro de insumos/alimentos seguindo os padrões das tabelas TACO e IBGE',
    'Elaboração de receitas/cardápios com cálculo automático de informações nutricionais',
    'Mapeamento e registro de restrições alimentares e situação nutricional individual dos alunos',
    'Configuração do planejamento de demanda/quantidade (cálculo contra desperdício integrado à frequência)',
    'Acompanhamento de aferições de medidas e avaliação nutricional',
    'Registros de distribuição e consumo de refeições por turma',
    'Relatórios nutricionais e conformidade com diretrizes de alimentação escolar',
    'Integração com dados de frequência para ajuste automático de quantidades',
    'Configuração de fornecedores e registro de preços de insumos'
  ]),
  'Saúde Domiciliar (Cloud)': parseTasksIntoSections([
    'Saúde Domiciliar',
    'Cadastro de pacientes com dados pessoais, contatos e endereços',
    'Registro de alergias e reações adversas',
    'Histórico médico e autorização de tratamentos',
    'Agendamento de visitas domiciliares',
    'Registro de avaliação clínica',
    'Prescrição de medicamentos',
    'Evolução do paciente',
    'Integração com prontuário eletrônico',
    'Conformidade com HIPAA/LGPD',
    'Geração de relatórios clínicos',
    'Auditoria de acessos'
  ])
};