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

const pontualTasks = parseTasksIntoSections([
  'CADASTROS BÁSICOS',
  'Validar configurações gerais do sistema',
  'Verificar integração com folha de pagamento',
  'Testar acesso de usuários',
  'Validar calendário de períodos',
  'FUNCIONALIDADES',
  'Testar registro de ponto/marcação',
  'Validar cálculo de horas',
  'Testar relatórios de presença',
  'Validar integração com RH',
  'DADOS E INTEGRAÇÕES',
  'Verificar sincronização de dados',
  'Testar exportação de relatórios',
  'Validar permissões de acesso',
  'Testar recuperação de dados'
]);

const esocialTasks = parseTasksIntoSections([
  'CONFIGURAÇÕES INICIAIS',
  'Validar dados da empresa/entidade',
  'Verificar configurações de envio',
  'Testar conexão com servidores da RFB',
  'Validar certificados digitais',
  'EVENTOS E COMUNICAÇÕES',
  'Testar envio de eventos obrigatórios',
  'Validar respostas do eSocial',
  'Testar retificações de eventos',
  'Validar comunicações recebidas',
  'CONFORMIDADE E RELATÓRIOS',
  'Verificar conformidade de dados',
  'Testar relatórios de validação',
  'Validar histórico de transmissões',
  'Testar recuperação de falhas'
]);

const minhaFolhaTasks = parseTasksIntoSections([
  'ACESSO E AUTENTICAÇÃO',
  'Validar acesso do funcionário',
  'Testar recuperação de senha',
  'Validar segurança de dados pessoais',
  'Testar navegação do portal',
  'VISUALIZAÇÃO DE DADOS',
  'Testar exibição de contracheque',
  'Validar exibição de férias',
  'Testar histórico de pagamentos',
  'Validar informações de benefícios',
  'FUNCIONALIDADES',
  'Testar download de documentos',
  'Validar impressão de comprovantes',
  'Testar envio de dúvidas/mensagens',
  'Validar atualização de dados pessoais'
]);

const transporteEscolarTasks = parseTasksIntoSections([
  'CADASTROS E CONFIGURAÇÃO',
  'Validar cadastro de rotas',
  'Testar cadastro de veículos',
  'Validar cadastro de motoristas',
  'Testar configuração de paradas',
  'OPERACIONAL',
  'Validar atribuição de alunos às rotas',
  'Testar acompanhamento de rotas',
  'Validar comunicação com pais',
  'Testar relatórios de frequência',
  'CONFORMIDADE',
  'Validar segurança dos alunos',
  'Testar rastreamento de veículos',
  'Validar documentação obrigatória',
  'Testar procedimentos de emergência'
]);

const saudeDomiciliarTasks = parseTasksIntoSections([
  'CADASTROS E DADOS',
  'Validar cadastro de pacientes',
  'Testar registro de endereços',
  'Validar informações de contato',
  'Testar histórico de atendimentos',
  'FUNCIONALIDADES CLÍNICAS',
  'Validar agendamento de visitas',
  'Testar registro de avaliação clínica',
  'Validar prescrição de medicamentos',
  'Testar evolução do paciente',
  'INTEGRAÇÃO E CONFORMIDADE',
  'Validar integração com prontuário eletrônico',
  'Testar conformidade com HIPAA/LGPD',
  'Validar geração de relatórios clínicos',
  'Testar auditoria de acessos'
]);

const conectaTasks = parseTasksIntoSections([
  'CONFIGURAÇÃO INICIAL',
  'Validar credenciais e autenticação',
  'Testar conectividade com parceiros',
  'Validar certificados de segurança',
  'Testar sincronização inicial de dados',
  'FLUXO DE DADOS',
  'Validar envio de transações',
  'Testar recebimento de mensagens',
  'Validar formato de dados trocados',
  'Testar confirmações de entrega',
  'MONITORAMENTO',
  'Validar logs de transações',
  'Testar alertas de falhas',
  'Validar relatórios de atividade',
  'Testar recuperação de erros'
]);

const documentosTasks = parseTasksIntoSections([
  'CONFIGURAÇÃO DO SISTEMA',
  'Validar tipos de documentos',
  'Testar categorias/classificações',
  'Validar regras de retenção',
  'Testar fluxos de aprovação',
  'FUNCIONALIDADES',
  'Validar upload de documentos',
  'Testar busca e localização',
  'Validar compartilhamento de acesso',
  'Testar versionamento de documentos',
  'CONFORMIDADE E SEGURANÇA',
  'Validar assinatura digital',
  'Testar criptografia de dados',
  'Validar rastreabilidade de acesso',
  'Testar backup e recuperação'
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
    'patrimônio': patrimonioCloudTasks,
    'pontual': pontualTasks,
    'esocial': esocialTasks,
    'minha folha': minhaFolhaTasks,
    'transporte escolar': transporteEscolarTasks,
    'saude domiciliar': saudeDomiciliarTasks,
    'conecta': conectaTasks,
    'documentos': documentosTasks
  };
  
  const normalized = (productName || '').toLowerCase().replace(/\(cloud\)/gi, '').trim();
  return tasks[normalized] || null;
};