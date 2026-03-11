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

const bibliotecaCloudTasks = parseTasksIntoSections([
  'Biblioteca',
  'Cadastro do acervo geral (livros, revistas, mídias digitais e especificações dos materiais)',
  'Cadastro de tabelas auxiliares (autores, assuntos e editoras)',
  'Cadastro/Integração de leitores (alunos, professores e comunidade)',
  'Parametrização de regras de gestão de empréstimos, limites de dias, atrasos e devoluções',
  'Configuração de alertas e envio de notificações automáticas de atraso'
]);

const merendaEscolarCloudTasks = parseTasksIntoSections([
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
]);

const patrimonioCloudTasks = parseTasksIntoSections([
  'PARÂMETROS GERAIS',
  'Por exercício',
  'Portal da Transparência (Email, CNPJ, Almoxarifado, Envia Transparência, Carga Inicial, Token e Script)',
  'Script de interações (Script e chave de acesso)',
  'MÉTODOS DE DEPRECIAÇÃO',
  'Método de depreciação (Descrição, Tipo, Classificação, Script e Dados adicionais)',
  'ESTRUTURA ORGANIZACIONAL',
  'Organogramas (sequencial: código e descrição)',
  'Entidades (Dados Gerais e de Contato)',
  'CADASTROS AUXILIARES',
  'Endereços (Informações cadastrais de Logradouros, Condomínios, Bairros, Distritos, Estados e Municípios)',
  'Natureza da Movimentação (Descrição, Tipo, Classificação e Dados adicionais)',
  'Unidades de Medida (Descrição e Dados Adicionais)',
  'Tipos de Bens (Descrição e Dados Adicionais)',
  'Estados de Conservação (Descrição e Dados Adicionais)',
  'Localidades (Descrição e Localização)',
  'Responsáveis (Nome, CPF, Matrícula, Cargo, Natureza do cargo, Função, Complemento, Funcionário do Município?, Endereços, Emails, Telefones e Situação)',
  'Fornecedores (Nome, Tipo, CPF/CNPJ, Data da inclusão, Dados Pessoais, Contas Bancárias e dados Adicionais)',
  'BENS PATRIMONIAIS',
  'Bens (Descrição, Número de controle, Tipo, Localização, Estado de conservação, Responsável, Anexos e Dados adicionais)',
  'Especificações Técnicas (Marca, Modelo, Série, Número de Patrimônio, Valor e Dados adicionais)',
  'Histórico de Movimentações (Transferências, Depreciação, Manutenção)',
  'Componentes de Bens (Itens que compõem um bem complexo)',
  'MOVIMENTAÇÃO',
  'Entradas (Data, Tipo de Entrada, Fornecedor, Valor, Localização, Responsável e Anexos)',
  'Transferências (Dados de origem e destino, Data, Responsável, Observações)',
  'Saídas (Motivo, Data, Responsável, Observações)',
  'Manutenção (Tipo, Data, Descrição, Valor, Fornecedor)',
  'Depreciação (Método, Período, Cálculo Automático)',
  'DEPRECIAÇÕES',
  'Cálculo de Depreciação (Método, Taxa, Período)',
  'Histórico de Depreciações (Exercício, Valor depreciado, Saldo)',
  'DESCARTES E ALIENAÇÕES',
  'Bens descartados/alienados (Data, Motivo, Valor contábil, Valor de venda)',
  'RELATÓRIOS',
  'Relatório de Patrimônio (Bens cadastrados, Valores, Estados)',
  'Relatório de Movimentações (Entradas, Transferências, Saídas)',
  'Relatório de Depreciação (Cálculos, Histórico)',
  'Relatório de Descartes (Bens alienados, Valores)',
  'INTEGRAÇÃO',
  'Integração com o sistema contábil',
  'Integração com o Portal da Transparência'
]);

export const getExtendedTasksForProduct = (productName) => {
  const tasks = {
    'obras': obrasCloudTasks,
    'educacao': educacaoCloudTasks,
    'professores': professoresCloudTasks,
    'pais e alunos': paisAlunosCloudTasks,
    'biblioteca': bibliotecaCloudTasks,
    'merenda escolar': merendaEscolarCloudTasks,
    'patrimonio': patrimonioCloudTasks,
    'patrimônio': patrimonioCloudTasks
  };
  
  const normalized = (productName || '').toLowerCase().replace(/\(cloud\)/gi, '').trim();
  return tasks[normalized] || null;
};