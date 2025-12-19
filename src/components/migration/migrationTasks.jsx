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
  // ISS - e-Nota
  'e-Nota (Cloud)': parseTasksIntoSections([
    'MIGRAÇÃO INICIAIS',
    'Extrair Competências', 'Extrair Indexadores', 'Extrair Lista de Serviços', 'Extair Incentivos Fiscais',
    'MIGRAÇÃO DE CONTRIBUINTES',
    'Extrair Serviços Pessoa', 'Extrair Simples Nacional', 'Extrair Incentivo Pessoa', 'Extrair Contribuinte Prestador',
    'Extrair Isenção Pessoa', 'Extrair Perfil Prestador', 'Extrair Serviço Contribuinte Prestador',
    'Extrair Tributos Federais do Contribuinte Prestador', 'Extrair e-mail Prestador', 'Extrair Cadastro de Tomadores',
    'MIGRAÇÃO OPERACIONAL E DOCUMENTOS',
    'Extrair RPS', 'Extrair Impressão de RPS', 'Extrair Notas Fiscais (Prestador, Tomador, Serviço, Obra...)',
    'Extrair XML Notas Fiscais', 'Extrair Substituição Nota / Estorno', 'Extrair Cancelamento Nota',
    'Extrair Denúncias', 'Extrair Infrações', 'Extrair Autos',
    'MIGRAÇÃO FINANCEIRA',
    'Extrair Resumo Créditos Tributários', 'Extrair Movimentação Créditos Tributários', 'Extrair Guias de Pagamentos'
  ]),

  // ISS - Livro Eletrônico
  'Livro Eletronico': parseTasksIntoSections([
    'ETAPA 1: CONFIGURAÇÕES E PARÂMETROS',
    'Extrair Competências', 'Extrair Indexadores', 'Extrair Lista de Serviços', 'Extrair CNAE',
    'Extrair Plano de Conta', 'Extrair Entidades Especiais',
    'ETAPA 2: CADASTRO DE PESSOAS E EMPRESAS',
    'Extrair Contadores', 'Extrair Contribuintes', 'Extrair Cadastro de Tomadores', 'Extrair Cadastro de Prestadores',
    'ETAPA 3: DADOS DE MOVIMENTAÇÃO',
    'Extrair Contribuintes Serviços / Movimento', 'Extrair Movimento Optante Simples', 'Extrair Simples Nacional',
    'Extrair Notas Fiscais', 'Extrair Declarações', 'Extrair Notas Avulsas',
    'ETAPA 4: INCENTIVOS FISCAIS',
    'Extarir Incentivos Fiscais', 'Extrair Contribuinte Incentivos Fiscais'
  ]),

  // Arrecadação - Tributos
  'Tributos (Cloud)': parseTasksIntoSections([
    'MIGRAÇÃO: TABELAS AUXILIARES E GERAIS',
    'Extrair Paises', 'Extrair Estados', 'Extrair Cidades', 'Extrair Distritos', 'Extrair Bairros', 'Extrair TiposLogradouros',
    'Extrair Ruas', 'Extrair RuasBairros', 'Extrair RuasCeps', 'Extrair Loteamentos', 'Extrair Condominios', 'Extrair Faces',
    'Extrair Bancos', 'Extrair AgenciasBancarias', 'Extrair TiposAtos', 'Extrair Fontes Divulgacao', 'Extrair Natureza Texto Juridico',
    'Extrair Atos', 'Extrair AtosFontes', 'Extrair Feriados', 'Extrair Motivos', 'Extrair Agrupamentos', 'Extrair Unidade Medida',
    'Extrair Indexadores', 'Extrair Indexadores Valores', 'Extrair Creditos Tributarios', 'Extrair Receitas', 'Extrair Creditos Receitas',
    'Extrair Materiais Servicos', 'Extrair CamposAdicionais', 'Extrair CamposAdicionais Compl', 'Extrair CamposAdicionais Receitas',
    'Extrair Campos Adicionais Agrupamentos', 'Extrair Tabelas', 'Extrair TabelasCampos', 'Extrair TabelasConjuntos',
    'Extrair Tabelas Relacionadas', 'Extrair TabelasValores', 'Extrair Competencias',
    'MIGRAÇÃO: CONFIGURAÇÕES DE CÁLCULO',
    'Extrair Configlmovel', 'Extrair ConfigInscrImobiliaria', 'Extrair ConfigMelhoria', 'Extrair Receitas Diversas Config',
    'Extrair NotasConfig', 'Extrair ITBIConfig', 'Extrair DividasConfig', 'Extrair DividasConfigLivro', 'Extrair PagamentosConfig',
    'Extrair Parcelamentos ConfigCreditos', 'Extrair Parcelamentos Config Taxas', 'Extrair Config2Via', 'Extrair ParcelasConfig',
    'Extrair Parcelas ConfigReceitas', 'Extrair Manutencoes Calculo', 'Extrair ManutencoesCalculoCreditos',
    'Extrair ManutencoesCalculoReferentes', 'Extrair ManutencoesCalculoReceitas', 'Extrair Manutencoes CalculoGuias', 'Extrair ManutencoesCalculoMovto',
    'MIGRAÇÃO: CADASTRO DE PESSOAS (CONTRIBUINTES)',
    'Extrair Pessoa', 'Extrair Pessoa Telefone', 'Extrair Pessoa Email', 'Extrair Pessoa Fisica', 'Extrair PessoaJuridica',
    'Extrair Pessoa Fisica Documento', 'Extrair PessoasEndereco', 'Extrair Pessoa Socio', 'Extrair PessoaCampoAdicional',
    'Extrair PessoaCampoAdicionalCompl', 'Extrair PessoaAverbacao', 'Extrair Pessoa Contas', 'Extrair PessoaSimples', 'Extrair PessoaMEI',
    'Extrair Contador', 'Extrair Cartorios', 'Extrair Engenheiros', 'Extrair EngenheirosCBO', 'Extrair Construtoras', 'Extrair Construtoras Engenheiros',
    'MIGRAÇÃO: CADASTRO TERRITORIAL (IMOBILIÁRIO)',
    'Extrair Plantas Valores', 'Extrair Imobiliarias', 'Extrair Imoveis', 'Extrair ImoveisInfComplem', 'Extrair Imoveis Debito Conta',
    'Extrair Imoveis CamposAdicionais', 'Extrair ImoveisCamposAdicionaisCompl', 'Extrair ImoveisEnglobados', 'Extrair Imoveis Testadas',
    'Extrair Imoveis Responsaveis', 'Extrair Imoveis Movimentacoes', 'Extrair Imoveis Historicos', 'Extrair Imoveis Movimentacoes_historico',
    'Extrair ImoveisImagens', 'Extrair Desmembramentos', 'Extrair DesmembramentosImoveis', 'Extrair Desmembramentos Origem',
    'Extrair Remembramentos', 'Extrair RemembramentosImoveis',
    'MIGRAÇÃO: CADASTRO ECONÔMICO (ATIVIDADES)',
    'Extrair ListaServicos', 'Extrair Cnaes', 'Extrair Atividades', 'Extrair Atividades CamposAdicionais', 'Extrair Atividades CamposAdicionais Compl',
    'Extrair Atividades Relacionamento', 'Extrair Horarios', 'Extrair Horarios Dias', 'Extrair TiposEntidades', 'Extrair Economicos',
    'Extrair EconomicosCnaes', 'Extrair Economicos Cnaes CamposAdicionais', 'Extrair Economicos Cnaes CamposAdicionais Compl',
    'Extrair EconomicosCnaes Valores', 'Extrair Economicos Servicos', 'Extrair Economicos Servicos Valores', 'Extrair Economicos CamposAdicionais',
    'Extrair Economicos CamposAdicionais Compl', 'Extrair Economicos Movimentacoes',
    'MIGRAÇÃO: OBRAS E MELHORIAS',
    'Extrair Melhorias', 'Extrair Melhorias Materiais', 'Extrair Melhorias Bairros', 'Extrair Melhorias CamposAdicionais',
    'Extrair Melhorias Campos Adicionais Compl', 'Extrair MelhoriasImoveis', 'Extrair MelhoriasImoveis CamposAdicionais', 'Extrair Obras',
    'Extrair Obras Construtoras', 'Extrair ObrasOpcoes', 'Extrair ObrasOpcoesCompl', 'Extrair ObrasEngenheiros',
    'MIGRAÇÃO: TRIBUTOS ESPECÍFICOS (ITBI, NOTAS, DIVERSAS)',
    'Extrair Receitas Diversas', 'Extrair Receitas Diversas Movimentacoes', 'Extrair Receitas Diversas CamposAdicionais',
    'Extrair Receitas DiversasLancamentos', 'Extrair Receitas Diversas Lancamentos Receitas', 'Extrair Notas', 'Extrair Notas Servicos',
    'Extrair Notas Movtos', 'Extrair ITBI', 'Extrair ITBIImoveis', 'Extrair ITBIImoveis Processos', 'Extrair ITBIlmoveisltens', 'Extrair ITBICompradores',
    'MIGRAÇÃO: DÍVIDA ATIVA',
    'Extrair Correcao Dividas', 'Extrair Dividas', 'Extrair DividasReceitas', 'Extrair Dividas Comentario', 'Extrair DividasResponsaveis',
    'Extrair DividasStatus', 'Extrair DividasDoctos', 'Extrair DividasDebitos', 'Extrair Convenios', 'Extrair Convenios Creditos',
    'Extrair Convenios Mensagens', 'Extrair Beneficios',
    'MIGRAÇÃO: LANÇAMENTOS, GUIAS E PAGAMENTOS',
    'Extrair lancamentos', 'Extrair Guias', 'Extrair Numeros Baixas', 'Extrair Guias Emitidas', 'Extrair Guias Emitidas Receitas',
    'Extrair GuiaUnificada', 'Extrair Guia Unificada Composicoes', 'Extrair Pagamentos Convenios', 'Extrair Pagamentos',
    'Extrair Pagamentos Detalhamentos', 'Extrair Pagamentos Taxas', 'Extrair Lancamentos', 'Extrair Lancamentos Englobados',
    'Extrair Lancamentos Receitas', 'Extrair Lancamentos Debitos', 'Extrair Lancamentos Debitos Receitas', 'Extrair Lancamentos Declaracoes',
    'Extrair Lancamentos DeclaracoesServicos',
    'MIGRAÇÃO: PARCELAMENTOS',
    'Extrair Parcelamentos', 'Extrair Parcelamentos Cancelados', 'Extrair Parcelamentos Creditos', 'Extrair Parcelamentos Referentes',
    'Extrair Parcelamentos Origem', 'Extrair Parcelamentos Composicoes', 'Extrair Parcelamentos Abatimentos', 'Extrair Parcelamentos Ordens',
    'Extrair Parcelamentos Parcelas', 'Extrair Parcelamentos Taxas', 'Extrair Parcelas', 'Extrair Parcelas Parcelas', 'Extrair Parcelas Receitas',
    'Extrair Secoes', 'Extrair SecaoCampoAdicional', 'Extrair SecaoCampoAdicional Compl'
  ]),

  // Arrecadação - Procuradoria
  'Procuradoria (Cloud)': parseTasksIntoSections([
    'ETAPA 1: EXECUÇÃO FISCAL',
    'Extrair dados de Execuções', 'Extrair dados de config execuções fiscais', 'Extrair dados de execuções fiscais',
    'Extrair dados de execuções fiscais mov', 'Extrair dados de execuções fiscais dividas', 'Extrair dados de execuções fiscais custas',
    'ETAPA 2: PROTESTOS E APENSOS',
    'Extrair dados de protestos', 'Extrair dados de protestos movtos', 'Extrair dados de apensos',
    'ETAPA 3: DADOS COMPLEMENTARES',
    'Extrair dados de Documentos', 'Extrair Contas COSIF', 'Extrair Fiscais'
  ]),

  // Pessoal - Folha
  'Folha (Cloud)': parseTasksIntoSections([
    'MIGRAÇÃO: TABELAS AUXILIARES E GERAIS',
    'Extrair Países', 'Extrair Estados', 'Extrair Municípios', 'Extrair Bairros', 'Extrair Logradouros', 'Extrair Bancos',
    'Extrair Agências Bancárias', 'Extrair Feriados', 'Extrair Formações', 'Extrair Fonte de Divulgação',
    'Extrair Natureza de Texto Jurídico', 'Extrair Tabelas Auxiliares', 'Extrair Tipos Atos', 'Extrair Tipos Movpes',
    'MIGRAÇÃO: ESTRUTURA DE CARGOS E SALÁRIOS',
    'Extrair Motivos de Alteração Salarial', 'Extrair Motivos de Alteração de Cargo', 'Extrair Funções',
    'Extrair Planos de Cargos e Salários', 'Extrair Planos Faixas e Níveis Salariais', 'Extrair Classes e Referências dos Níveis Salariais',
    'Extrair Tipos Cargos', 'Extrair Cargos',
    'MIGRAÇÃO: ESTRUTURA ORGANIZACIONAL',
    'Extrair Grupos Funcionais', 'Extrair Config Organ', 'Extrair Niveis Organ', 'Extrair Entidades Organ', 'Extrair Organogramas',
    'Extrair Configuração de Lotações Físicas', 'Extrair Lotações Físicas', 'Extrair Locais Trab',
    'MIGRAÇÃO: CONFIGURAÇÕES DA FOLHA',
    'Extrair Configurações de Entidades', 'Extrair Configuração de Campos Adicionais', 'Extrair Categoria do Trabalhador',
    'Extrair Configuração de Adicional', 'Extrair Motivos Rescisão', 'Extrair Tipos Afastamentos', 'Extrair Vinculos Empregatícios',
    'Extrair Sincronização de CBOs', 'Extrair Eventos', 'Extrair Sincronização das Contas', 'Extrair Tipos de Bases',
    'Extrair Configuração de Encargos', 'Extrair Configuração de Médias e Vantagens', 'Extrair Configuração de Licença Prêmio',
    'Extrair Licpremio Config', 'Extrair Licpremio Faixas', 'Extrair Planos de Previdência',
    'Extrair Configuração de Férias', 'Extrair Configuração de Salário Família', 'Extrair Configuração de Pensão Alimentícia',
    'Extrair Configuração de Consignações', 'Extrair Regime Jur', 'Extrair Escalas de Plantões', 'Extrair Horários de Trabalho',
    'MIGRAÇÃO: PESSOAS E SERVIDORES',
    'Extrair Grau de Parentesco', 'Extrair Situação de Pessoa', 'Extrair Pessoas', 'Extrair Dependentes',
    'Extrair Histórico de Nome', 'Extrair Pensionista', 'Extrair Config Serv', 'Extrair Situação de Servidor', 'Extrair Servidores',
    'Extrair Servidores Cargos', 'Extrair Adicional Tempo de Serviço', 'Extrair Histórico de Matrícula', 'Extrair Periculosidade',
    'Extrair Insalubridade', 'Extrair Outros Adicionais', 'Extrair Alterações Salariais',
    'MIGRAÇÃO: DADOS FINANCEIROS E FOLHA',
    'Extrair Fichas Financeiras', 'Extrair Folha Normal', 'Extrair Folha Complementar', 'Extrair Folha Adiantamento', 'Extrair Folha 13º',
    'Extrair Folha Complementar 13º', 'Extrair Folha Rescisão', 'Extrair Benefícios', 'Extrair Movimentos de Estoque de Férias',
    'Extrair Férias Programadas', 'Extrair Férias Gozo', 'Extrair Licenças Prêmio', 'Extrair Afastamentos', 'Extrair Consignações',
    'Extrair Pensões Alimentícias', 'Extrair Empréstimos Consignados', 'Extrair Cessões e Requisições'
  ]),

  // Pessoal - Ponto
  'Ponto (Cloud)': parseTasksIntoSections([
    'MIGRAÇÃO: TABELAS AUXILIARES',
    'Extrair Países', 'Extrair Estados', 'Extrair Municípios', 'Extrair Bairros', 'Extrair Logradouros',
    'MIGRAÇÃO: ESTRUTURA ORGANIZACIONAL',
    'Extrair Entidades', 'Extrair Departamentos', 'Extrair Seções', 'Extrair Setores',
    'MIGRAÇÃO: DADOS DE PESSOAS',
    'Extrair Pessoas', 'Extrair Funcionários',
    'MIGRAÇÃO: CONFIGURAÇÕES DE PONTO',
    'Extrair Horários de Trabalho', 'Extrair Escalas', 'Extrair Jornadas', 'Extrair Feriados', 'Extrair Tipos de Afastamento',
    'MIGRAÇÃO: REGISTROS DE PONTO',
    'Extrair Marcações', 'Extrair Batidas', 'Extrair Justificativas', 'Extrair Banco de Horas', 'Extrair Horas Extras',
    'Extrair Faltas', 'Extrair Atrasos', 'Extrair Saídas Antecipadas'
  ]),

  // Pessoal - Minha Folha / RH
  'Minha Folha': parseTasksIntoSections([
    'MIGRAÇÃO: DADOS BÁSICOS',
    'Extrair Usuários do Portal', 'Extrair Configurações de Acesso',
    'MIGRAÇÃO: DOCUMENTOS',
    'Extrair Contracheques', 'Extrair Informes de Rendimentos', 'Extrair Comprovantes de Férias',
    'MIGRAÇÃO: SOLICITAÇÕES',
    'Extrair Solicitações de Férias', 'Extrair Solicitações de Adiantamento', 'Extrair Outras Solicitações'
  ]),

  // Compras - Compras
  'Compras (Cloud)': parseTasksIntoSections([
    'MIGRAÇÃO: TABELAS AUXILIARES E GERAIS',
    'Extrair Países', 'Extrair Estados', 'Extrair Municípios', 'Extrair Bairros', 'Extrair Logradouros', 'Extrair Bancos', 'Extrair Agências',
    'Extrair Órgãos', 'Extrair Unidades', 'Extrair Unidade de Medida', 'Extrair Natureza Texto Jurídico', 'Extrair Tipos Atos',
    'Extrair Tabelas de Elementos de Despesas', 'Extrair Tabelas de Fontes de Recursos',
    'MIGRAÇÃO: FORNECEDORES E TERCEIROS',
    'Extrair Tipos de Terceiros', 'Extrair Dados de Terceiros', 'Extrair Terceiros', 'Extrair Terceiros Produto', 'Extrair Comissões',
    'MIGRAÇÃO: CLASSIFICAÇÃO E PRODUTOS',
    'Extrair Grupo de Material e Serviço', 'Extrair Classe de Material e Serviço', 'Extrair Material e Serviço',
    'Extrair Material e Serviço de Suprimentos', 'Extrair Estoques', 'Extrair Lotes',
    'MIGRAÇÃO: PLANEJAMENTO E PROGRAMAÇÃO',
    'Extrair Plano Plurianual', 'Extrair Lei Orçamentária', 'Extrair Solicitações de Compras', 'Extrair Solicitações de Compras Itens',
    'MIGRAÇÃO: LICITAÇÕES E CONTRATOS',
    'Extrair Modalidades', 'Extrair Licitações', 'Extrair Licitações Dotações', 'Extrair Licitações Itens', 'Extrair Licitações Fornecedores',
    'Extrair Contratos', 'Extrair Contratos Aditivos', 'Extrair Contratos Itens', 'Extrair Contratos Partes',
    'MIGRAÇÃO: ORDENS E EXECUÇÕES',
    'Extrair Ordens de Compras', 'Extrair Ordens de Compras Produtos', 'Extrair Autorizações de Fornecimentos',
    'Extrair Autorizações de Fornecimentos Itens', 'Extrair Requisições', 'Extrair Requisições Itens'
  ]),

  // Contábil
  'Contábil (Cloud)': parseTasksIntoSections([
    'MIGRAÇÃO: TABELAS AUXILIARES E GERAIS',
    'Extrair Países', 'Extrair Estados', 'Extrair Municípios', 'Extrair Bairros', 'Extrair Logradouros', 'Extrair Bancos', 'Extrair Agências',
    'Extrair Órgãos', 'Extrair Unidades', 'Extrair Natureza de Texto Jurídico', 'Extrair Tipos Atos',
    'MIGRAÇÃO: ESTRUTURA ORÇAMENTÁRIA',
    'Extrair Plano de Contas Contábil', 'Extrair Receitas Orçamentárias', 'Extrair Despesas Orçamentárias',
    'Extrair Fontes de Recursos', 'Extrair Configurações de Exercícios', 'Extrair PPA', 'Extrair LDO', 'Extrair LOA',
    'MIGRAÇÃO: LANÇAMENTOS CONTÁBEIS',
    'Extrair Lançamentos Contábeis', 'Extrair Lançamentos Diário', 'Extrair Lançamentos Razão',
    'MIGRAÇÃO: MOVIMENTAÇÕES ORÇAMENTÁRIAS',
    'Extrair Receitas Previstas', 'Extrair Receitas Arrecadadas', 'Extrair Créditos Orçamentários', 'Extrair Créditos Adicionais',
    'Extrair Empenhos', 'Extrair Empenhos Itens', 'Extrair Liquidações', 'Extrair Pagamentos', 'Extrair Restos a Pagar',
    'MIGRAÇÃO: CONTROLE FINANCEIRO',
    'Extrair Contas Bancárias', 'Extrair Movimentações Bancárias', 'Extrair Conciliações Bancárias', 'Extrair Transferências Financeiras'
  ]),

  // Educação
  'Educação Básica (Cloud)': parseTasksIntoSections([
    'MIGRAÇÃO: TABELAS AUXILIARES E GERAIS',
    'Extrair Países', 'Extrair Estados', 'Extrair Municípios', 'Extrair Bairros', 'Extrair Logradouros',
    'MIGRAÇÃO: ESTRUTURA ESCOLAR',
    'Extrair Escolas', 'Extrair Salas', 'Extrair Modalidades de Ensino', 'Extrair Níveis de Ensino', 'Extrair Etapas de Ensino',
    'Extrair Turnos', 'Extrair Calendários Escolares', 'Extrair Tipos de Avaliação', 'Extrair Disciplinas',
    'MIGRAÇÃO: PESSOAS',
    'Extrair Alunos', 'Extrair Responsáveis', 'Extrair Professores', 'Extrair Funcionários',
    'MIGRAÇÃO: TURMAS E MATRÍCULAS',
    'Extrair Turmas', 'Extrair Turmas Disciplinas', 'Extrair Matrículas', 'Extrair Transferências', 'Extrair Enturmações',
    'MIGRAÇÃO: DADOS PEDAGÓGICOS',
    'Extrair Frequências', 'Extrair Notas', 'Extrair Boletins', 'Extrair Ocorrências Disciplinares'
  ]),

  // Plataforma - Protocolo
  'Protocolo (Cloud)': parseTasksIntoSections([
    'MIGRAÇÃO: DADOS BÁSICOS',
    'Extrair Tipos de Processos', 'Extrair Assuntos', 'Extrair Setores', 'Extrair Usuários',
    'MIGRAÇÃO: PROCESSOS',
    'Extrair Processos', 'Extrair Documentos Anexos', 'Extrair Tramitações', 'Extrair Despachos', 'Extrair Arquivamentos'
  ])
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
// Retorna null se o produto não tiver processo de migração
export const getDefaultTasksForProduct = (productName) => {
  if (!productName) return null;
  
  const normalizedInput = normalizeProductName(productName);
  
  // Busca exata primeiro (considerando com e sem Cloud)
  for (const [key, tasks] of Object.entries(migrationTasksByProduct)) {
    const normalizedKey = normalizeProductName(key);
    if (normalizedKey === normalizedInput) {
      return tasks;
    }
  }
  
  // Busca parcial
  for (const [key, tasks] of Object.entries(migrationTasksByProduct)) {
    const normalizedKey = normalizeProductName(key);
    if (normalizedKey.includes(normalizedInput) || normalizedInput.includes(normalizedKey)) {
      return tasks;
    }
  }
  
  // Se não encontrou, retorna null (produto sem migração)
  return null;
};

// Verifica se um produto tem processo de migração
export const productHasMigration = (productName) => {
  return getDefaultTasksForProduct(productName) !== null;
};