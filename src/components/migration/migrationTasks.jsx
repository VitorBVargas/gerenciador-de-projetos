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
    'MIGRAÇÃO: INICIAIS',
    'Extrair Competências', 'Extrair Indexadores', 'Extrair Lista de Serviços', 'Extrair Incentivos Fiscais',
    'MIGRAÇÃO: CONTRIBUINTES',
    'Extrair Serviços Pessoa', 'Extrair Simples Nacional', 'Extrair Incentivo Pessoa', 'Extrair Contribuinte Prestador',
    'Extrair Isenção Pessoa', 'Extrair Perfil Prestador', 'Extrair Serviço Contribuinte Prestador',
    'Extrair Tributos Federais do Contribuinte Prestador', 'Extrair e-mail Prestador', 'Extrair Cadastro de Tomadores',
    'MIGRAÇÃO: OPERACIONAL E DOCUMENTOS',
    'Extrair RPS', 'Extrair Impressão de RPS', 'Extrair Notas Fiscais (Prestador, Tomador, Serviço, Obra...)',
    'Extrair XML Notas Fiscais', 'Extrair Substituição Nota / Estorno', 'Extrair Cancelamento Nota',
    'Extrair Denúncias', 'Extrair Infrações', 'Extrair Autos',
    'MIGRAÇÃO: FINANCEIRA',
    'Extrair Resumo Créditos Tributários', 'Extrair Movimentação Créditos Tributários', 'Extrair Guias de Pagamentos'
  ]),

  // ISS - Livro Eletrônico
  'Livro Eletronico': parseTasksIntoSections([
    'ETAPA: CONFIGURAÇÕES E PARÂMETROS',
    'Extrair Competências', 'Extrair Indexadores', 'Extrair Lista de Serviços', 'Extrair CNAE',
    'Extrair Plano de Conta', 'Extrair Entidades Especiais',
    'ETAPA: CADASTRO DE PESSOAS E EMPRESAS',
    'Extrair Contadores', 'Extrair Contribuintes', 'Extrair Cadastro de Tomadores', 'Extrair Cadastro de Prestadores',
    'ETAPA: DADOS DE MOVIMENTAÇÃO',
    'Extrair Contribuintes Serviços / Movimento', 'Extrair Movimento Optante Simples', 'Extrair Simples Nacional',
    'Extrair Notas Fiscais', 'Extrair Declarações', 'Extrair Notas Avulsas',
    'ETAPA: INCENTIVOS FISCAIS',
    'Extrair Incentivos Fiscais', 'Extrair Contribuinte Incentivos Fiscais'
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
    "Extrair Sincronização de CBO's", 'Extrair Eventos', 'Extrair Sincronização das Contas', 'Extrair Tipos de Bases',
    'Extrair Configuração de Encargos', 'Extrair Configuração de Médias e Vantagens', 'Extrair Configuração de Licença Prêmio',
    'Extrair Licpremio Config', 'Extrair Licpremio Faixas', 'Extrair Planos de Previdência',
    'Extrair Configuração de Cancelamento de Férias', 'Extrair Configuração de Férias', 'Extrair Configuração da DIRF',
    'Extrair Modalidades GFIP', 'Extrair Variáveis',
    'MIGRAÇÃO: CADASTRO DE PESSOAS E FUNCIONÁRIOS',
    'Extrair Pessoas Jurídicas', 'Extrair Pessoas Físicas', 'Extrair Dependentes', 'Extrair Formação das Pessoas',
    'Extrair Entidades e Entidades Folha', 'Extrair Concursos', 'Extrair Funcionários', 'Extrair Conselheiros Tutelares',
    'Extrair Estagiários', 'Extrair Autônomos', 'Extrair Profissionais', 'Extrair Aposentados', 'Extrair Pensionistas',
    'Extrair Dependentes Func', 'Extrair Empresas Ant',
    'MIGRAÇÃO: HISTÓRICOS E MOVIMENTAÇÕES',
    'Extrair Hist Funcionários', 'Extrair Hist Salariais', 'Extrair Hist Cargos', 'Extrair Tipos de Movimentação de Pessoal',
    'Extrair Movimentação de Pessoal', 'Extrair Transferências', 'Extrair Afastamentos', 'Extrair Rescisões',
    'Extrair Cessação Aposentados', 'Extrair Cessação e Suspensão Pensionistas', 'Extrair Licenca Premio e Licenca Premio Disp',
    'MIGRAÇÃO: CÁLCULOS E LANÇAMENTOS',
    'Extrair Período Aquisitivo de Férias', 'Extrair Período Aquisitivo de Décimo Terceiro', 'Extrair Cálculo de Folha de Rescisão',
    'Extrair Cálculo de Folha Mensal', 'Extrair Cálculo de Folha de Décimo Terceiro', 'Extrair Cálculo de Folha de Férias',
    'Extrair Concessão de Férias', 'Extrair Concessão de Décimo Terceiro', 'Extrair Movimentações de Folhas',
    'Extrair Lançamentos de Eventos', 'Extrair Faltas', 'Extrair Ferias Proc', 'Extrair Bases Calc',
    'MIGRAÇÃO: DADOS COMPLEMENTARES',
    'Extrair Serviços de Autônomos', 'Extrair Tipos de Atestados', 'Extrair Motivos Consultas Médicas', 'Extrair Motivos Faltas',
    'Extrair Controle de Envio do eSocial', 'Extrair Acid Trab', 'Extrair Funcoes Exerc', 'Extrair Funcoes Func', 'Extrair Atos e Fontes Atos',
    'Extrair Atos Func', 'Extrair Beneficiarios', 'Extrair Atestados', 'Extrair Linhas Onibus', 'Extrair Faixas ValTransp',
    'Extrair Vales Transportes', 'Extrair Caracteristicas', 'Extrair Funcionarios Prop Adic', 'Extrair Distância',
    'Extrair Região', 'Extrair Natureza Diária', 'Extrair Diária', 'Extrair Cursos', 'Extrair Pessoa Física Curso',
    'Extrair Bolsa de Estudo', 'Extrair Locais de Avaliação', 'Extrair Equipamentos de Proteção', 'Extrair Configurações de Avaliação',
    'Extrair Configuração de Concurso', 'Extrair Áreas de Atuação'
  ]),

  // Pessoal - Recursos Humanos
  'Recursos Humanos (Cloud)': parseTasksIntoSections([
    'MIGRAÇÃO: CONCURSOS E SELEÇÕES',
    'Extrair Concursos Públicos e Processo Seletivos', 'Extrair Edital de Concurso',
    'Extrair Cargos dos Concursos Públicos e Processos Selet', 'Extrair Concurso Processo Seletivo Cargo Vaga',
    'Extrair Concurso Processo Seletivo Cargo Avaliação', 'Extrair Concurso Processo Seletivo Candidato',
    'Extrair Concurso Processo Seletivo Candidato Avaliação', 'Extrair Concurso Processo Seletivo Cargo Classificação',
    'Extrair Concurso Processo Seletivo Candidato Classificação', 'Extrair Candidatos dos Concursos Públicos e Processos',
    'Extrair Convocação dos Candidatos dos Concursos Públicos',
    'MIGRAÇÃO: GESTÃO DE BENEFÍCIOS',
    'Extrair Solicitação de Equipamento de Proteção', 'Extrair Configuração de Planos de Saúde', 'Extrair Verba para Empréstimo',
    'Extrair Rotas', 'Extrair Vale Transporte', 'Extrair Benefícios',
    'MIGRAÇÃO: SAÚDE E SEGURANÇA DO TRABALHO',
    'Extrair Procedimentos Médicos', 'Extrair Despesas com Procedimentos Médicos', 'Extrair Despesas com Planos de Saúde',
    'Extrair Junta Médica', 'Extrair Laudo Médico', 'Extrair CIPA', 'Extrair PPRA', 'Extrair Acidente de Trabalho',
    'Extrair Atendimento de Acidente de Trabalho', 'Extrair Risco Ambiental', 'Extrair ASO', 'Extrair ASO Procedimento',
    'MIGRAÇÃO: AVALIAÇÃO DE DESEMPENHO',
    'Extrair Comissões de Avaliação', 'Extrair Conceitos de Avaliação de Desempenho', 'Extrair Competências de Avaliação de Desempenho',
    'Extrair Configuração de Avaliação de Desempenho', 'Extrair Desempenho Avaliador', 'Extrair Desempenho Avaliações',
    'Extrair Gestão de Avaliação de Desempenho',
    'MIGRAÇÃO: DADOS FUNCIONAIS',
    'Extrair Configuração de Licença Prêmio', 'Extrair Configuração de Adicional', 'Extrair Matrícula Adicional',
    'Extrair Matrícula Licença Prêmio', 'Extrair Experiência Anterior', 'Extrair Averbação',
    'Extrair Averbação Matrícula', 'Extrair Período Aquisitivo de Adicional', 'Extrair Período Aquisitivo de Licença Prêmio',
    'Extrair Aposentadoria e Pensão'
  ]),

  // Pessoal - Ponto
  'Ponto (Cloud)': parseTasksIntoSections([
    'MIGRAÇÃO: DADOS DO PONTO ELETRÔNICO',
    'Extrair Tipos de Função de Relógio',
    'Extrair Horários',
    'Extrair Jornada de Trabalho',
    'Extrair Lançamento de Ausências',
    'Extrair Relógios',
    'Extrair Compensação de Horas',
    'Extrair Ocorrências do Ponto',
    'Extrair Períodos de Apuração do Ponto'
  ]),

  // Compras - Compras
  'Compras (Cloud)': parseTasksIntoSections([
    'MIGRAÇÃO: SOLICITAÇÕES E COTAÇÕES',
    'Extrair Solicitação Compra', 'Extrair Solicitação Compra Item', 'Extrair Solicitação Compra Despesa',
    'Extrair Solicitação Compra Atualizar Valores', 'Extrair Cotação Preço', 'Extrair Cotação Preço Itens',
    'Extrair Cotação Vínculo Solicitação', 'Extrair Cotação Participantes', 'Extrair Cotação Participantes Item',
    'Extrair Cotação Finalizar',
    'MIGRAÇÃO: PROCESSOS ADMINISTRATIVOS',
    'Extrair Processo Adm', 'Extrair Processo Adm Documento', 'Extrair Processo Adm Entidade',
    'Extrair Processo Adm Tipos Textos', 'Extrair Processo Adm Textos', 'Extrair Processo Adm Anexos',
    'Extrair Processo Adm Pareceres', 'Extrair Processo Adm Item Livre', 'Extrair Processo Adm Item Reservado',
    'Extrair Processo Adm Despesa', 'Extrair Processo Adm Lote', 'Extrair Processo Adm Lote Item',
    'Extrair Processo Adm Entidade Item', 'Extrair Processo Adm Processo Origem Adesão',
    'Extrair Processo Adm Processo Origem Adesão Itens', 'Extrair Processo Adm Convidado',
    'Extrair Processo Adm Publicação', 'Extrair Processo Adm Impugnação', 'Extrair Processo Adm Sessão Julgamento',
    'Extrair Processo Adm Participante', 'Extrair Processo Adm Participante Documento', 'Extrair Processo Adm Participante Proposta',
    'Extrair Processo Adm Sessão Julgamento Ata', 'Extrair Processo Adm Interposição Recurso',
    'Extrair Processo Adm Ato Final', 'Extrair Processo Adm Ato Final Revogação', 'Extrair Processo Adm Atualizar Valores',
    'MIGRAÇÃO: ATAS DE REGISTRO DE PREÇO',
    'Extrair Ata Registro Preço', 'Extrair Ata Registro Preço Item', 'Extrair Ata Registro Preço Ocorrência',
    'Extrair Ata Registro Preço Ocorrência Item', 'Extrair Ata Registro Preço Atualizar Valores'
  ]),

  // Compras - Contratos
  'Contratos (Cloud)': parseTasksIntoSections([
    'MIGRAÇÃO: INSTRUMENTOS CONTRATUAIS',
    'Extrair Compras Diretas', 'Extrair Compras Diretas Item', 'Extrair Compras Diretas Despesa',
    'Extrair Compras Diretas Publicação', 'Extrair Contratações', 'Extrair Contratações Sem Processo',
    'Extrair Contratação Item', 'Extrair Contratação Responsável Adm', 'Extrair Contratação Publicação',
    'Extrair Contratação Despesa', 'Extrair Contratação Textos', 'Extrair Contratação Anexos',
    'MIGRAÇÃO: ALTERAÇÕES E TERMOS ADITIVOS',
    'Extrair Contratação Aditivo', 'Extrair Contratação Aditivo Item', 'Extrair Contratação Aditivo Sem Processo',
    'Extrair Contratação Aditivo Item Não Previsto', 'Extrair Contratação Apostila', 'Extrair Contratação Apostila Item',
    'MIGRAÇÃO: EXECUÇÃO E FORNECIMENTO',
    'Extrair Solicitação Fornecimento Compra Direta', 'Extrair Solicitação Fornecimento Compra Direta Item',
    'Extrair Solicitação Fornecimento', 'Extrair Solicitação Fornecimento Multi', 'Extrair Solicitação Fornecimento Item',
    'Extrair Recebimento Compra Direta', 'Extrair Recebimento Item Compra Direta', 'Extrair Comprovante Compra Direta',
    'Extrair Comprovante Recebimentos', 'Extrair Recebimento', 'Extrair Recebimento Item', 'Extrair Comprovante',
    'MIGRAÇÃO: ENCERRAMENTO E SANÇÕES',
    'Extrair Rescisão Contratual', 'Extrair Sanção'
  ]),

  // Compras - Almoxarifado
  'Almoxarifado': parseTasksIntoSections([
    'MIGRAÇÃO: MOVIMENTAÇÃO DE ESTOQUE',
    'Extrair Requisições', 'Extrair Requisições Item', 'Extrair Lote', 'Extrair Entradas',
    'Extrair Entradas Itens', 'Extrair Entradas Itens Lotes', 'Extrair Entradas Finalizar',
    'Extrair Saídas', 'Extrair Saídas Itens', 'Extrair Saídas Itens Lotes', 'Extrair Saídas Finalizar',
    'MIGRAÇÃO: CONTROLE E ENCERRAMENTO',
    'Extrair Estoque', 'Extrair Posição Estoque', 'Extrair Movimento Atualização', 'Extrair Encerramentos'
  ]),

  // Compras - Frotas
  'Frotas (Cloud)': parseTasksIntoSections([
    'MIGRAÇÃO: OPERAÇÃO E CONTROLE DE VIAGENS',
    'Extrair Reserva Veículo', 'Extrair Ocorrência', 'Extrair Controle Viagem',
    'Extrair Controle Viagem Finalidade', 'Extrair Controle Viagem Rota',
    'MIGRAÇÃO: MANUTENÇÃO E DESPESAS',
    'Extrair Controle Revisão', 'Extrair Acompanhamento Mensal', 'Extrair Taxa Licenciamento',
    'Extrair Taxa Licenciamento Parcela', 'Extrair Ordem Abastecimento', 'Extrair Ordem Abastecimento Item',
    'Extrair Lançamento Despesa', 'Extrair Lançamento Despesa Item'
  ]),

  // Compras - Patrimônio
  'Patrimônio (Cloud)': parseTasksIntoSections([
    'MIGRAÇÃO: MOVIMENTAÇÃO DE BENS PATRIMONIAIS',
    'Extrair Manutenção Bem', 'Extrair Transferência Bem', 'Extrair Reavaliação Bem',
    'Extrair Baixa', 'Extrair Baixa Bem', 'Extrair Baixa Finalizar'
  ]),

  // Contábil - Planejamento
  'Planejamento (Cloud)': parseTasksIntoSections([
    'MIGRAÇÃO: CONFIGURAÇÕES GERAIS E PARÂMETROS',
    'Extrair Configurações - PPAs', 'Extrair Configurações - LDOS', 'Extrair Configurações - LOAs',
    'Extrair Configurações - Funcionais', 'Extrair Configurações - Natureza Despesa',
    'Extrair Configurações - Natureza Receita', 'Extrair Configurações - Organogramas',
    'Extrair Configurações - Plano de Contas', 'Extrair Configurações - Recursos',
    'Extrair Configurações - Parâmetros Orçamentários', 'Extrair Configurações - Parâmetros Escrituração',
    'MIGRAÇÃO: CADASTROS AUXILIARES (TIPOS)',
    'Extrair Tipos Administração', 'Extrair Tipos Compensações', 'Extrair Tipos Renuncias',
    'Extrair Tipos Resultados Nominais', 'Extrair Tipos Riscos fiscais', 'Extrair Tipos Responsaveis',
    'Extrair Tipos Alteração Orçamentária Receita', 'Extrair Tipos Bloqueios', 'Extrair Transações Financeiras',
    'Extrair Tipos Comprovantes', 'Extrair Tipos Precatórios', 'Extrair Tipos Dividas',
    'Extrair Tipos Movimentos', 'Extrair Tipos documentos', 'Extrair Tipos Atos', 'Extrair Tipos Logradouros',
    'Extrair Tipos Aplicações', 'Extrair Fontes de Divulgação', 'Extrair Natureza Texto Jurídico',
    'MIGRAÇÃO: CADASTROS ESTRUTURAIS',
    'Extrair Países', 'Extrair - Estados', 'Extrair Cidades', 'Extrair Bairros', 'Extrair Distritos', 'Extrair Logradouros',
    'Extrair Loteamentos', 'Extrair Condominios', 'Extrair Recursos', 'Extrair Funções', 'Extrair SubFunções',
    'Extrair Programas', 'Extrair Ações', 'Extrair Dedução Receitas', 'Extrair Organogramas', 'Extrair Natureza Despesa',
    'Extrair Natureza Receita', 'Extrair Atos', 'Extrair Credores', 'Extrair Responsáveis', 'Extrair Ordenadores',
    'Extrair Equipe Planejamento', 'Extrair Localizadores', 'Extrair Produtos', 'Extrair Unidade de Medida', 'Extrair Comprovantes',
    'MIGRAÇÃO: PEÇAS ORÇAMENTÁRIAS (PPA, LDO, LOA)',
    'Extrair Receitas PPA', 'Extrair Grupo Despesas PPA', 'Extrair Despesas PPA', 'Extrair Metas Fiscais Despesas PPA',
    'Extrair Orientações Estratégicas', 'Extrair Audiências', 'Extrair Sugestões', 'Extrair Receitas LDO',
    'Extrair Grupo Despesas LDO', 'Extrair Despesas LDO', 'Extrair Renúncias Fiscais', 'Extrair Expansões Despesa',
    'Extrair Resultado Nominal', 'Extrair Riscos Fiscais', 'Extrair Projeções Atuariais', 'Extrair Atuário',
    'Extrair Metas Fiscais Despesas LDO', 'Extrair Metas Fiscais Receitas LDO', 'Extrair Transferências Financeiras LDO',
    'Extrair Receitas LOA', 'Extrair Grupo Despesas LOA', 'Extrair Transferências Financeiras LOA', 'Extrair Despesas LOA',
    'MIGRAÇÃO: MOVIMENTAÇÕES E SALDOS',
    'Extrair Alteracao Despesa', 'Extrair Tipos Alteração Orçamentária Receita Ativar', 'Extrair Tipos Bloqueios Ativar',
    'Extrair Transações Financeiras Ativar', 'Extrair Tipos Movimentos Ativar', 'Extrair Tipos Documentos Ativar',
    'Extrair Tipos Aplicações Ativar', 'Extrair Alteração Despesa Ativar', 'Extrair Data Inicial', 'Extrair Data Abertura',
    'Extrair Fase Saldos', 'Extrair Dedução Receitas Ativar'
  ]),

  // Contábil - Contabilidade
  'Contabilidade (Cloud)': parseTasksIntoSections([
    'MIGRAÇÃO: CADASTROS E CONFIGURAÇÕES INICIAIS',
    'Extrair Dividas', 'Extrair Precatórios', 'Extrair Diarias', 'Extrair Bancos', 'Extrair Agências',
    'Extrair Contas Bancárias', 'Extrair Contas Contábeis', 'Extrair Retenções', 'Extrair Cheques',
    'Extrair Retenções Ativar', 'Extrair Configuração Componentes', 'Extrair Configuração Contas Correntes',
    'MIGRAÇÃO: ORÇAMENTO (RECEITA E DESPESA)',
    'Extrair Receitas Não Previstas', 'Extrair Receitas Extras', 'Extrair Receitas Extras Ativar',
    'Extrair Alterações Receitas', 'Extrair Programação Receitas', 'Extrair Despesas Não Previstas',
    'Extrair Alteração Orçamentária Despesa - Suplementação', 'Extrair Alteração Orçamentária Despesa - Sanção',
    'Extrair Programação Despesas', 'Extrair Bloqueios', 'Extrair Desbloqueios',
    'MIGRAÇÃO: EXECUÇÃO DA RECEITA',
    'Extrair Lançamento Receitas', 'Extrair Anulação Lançamento Receitas', 'Extrair Arrecadações',
    'Extrair Anulação Arrecadações', 'Extrair Arrecadações Extras', 'Extrair Anulação Arrecadações Extras',
    'Extrair Devoluções Receitas',
    'MIGRAÇÃO: EXECUÇÃO DA DESPESA',
    'Extrair Empenhos', 'Extrair Anulação Empenhos', 'Extrair SubEmpenhos', 'Extrair Anulação SubEmpenhos',
    'Extrair Em liquidações', 'Extrair Anulação Em Liquidações', 'Extrair Liquidações', 'Extrair Anulação Liquidações',
    'Extrair Pagamentos', 'Extrair Anulação Pagamentos', 'Extrair Despesas Extras', 'Extrair Anulação Despesas Extras',
    'Extrair Adiantamentos', 'Extrair Despesas Ordena', 'Extrair Prestação de Contas', 'Extrair Cvs Restos',
    'MIGRAÇÃO: ESCRITURAÇÃO E SALDOS',
    'Extrair Lançamentos Contábeis', 'Extrair Lançamentos Contábeis Contas Correntes', 'Extrair Saldos Iniciais',
    'Extrair Saldos Iniciais Contas Correntes', 'Extrair Saldos Abertura', 'Extrair Saldos Abertura Contas Correntes',
    'Extrair Escrituração', 'Extrair Consignações',
    'MIGRAÇÃO: DADOS PATRIMONIAIS E TRANSFERÊNCIAS',
    'Extrair Contas Bancárias Aplicações', 'Extrair Contas Bancárias Transferências',
    'Extrair Contas Bancárias Transferências Aplicações', 'Extrair Créditos Tributários Curto Prazo',
    'Extrair Créditos Tributários Longo Prazo', 'Extrair Depósitos', 'Extrair Dívida Ativa Não Tributária Curto Prazo',
    'Extrair Dívida Ativa Não Tributária Longo Prazo', 'Extrair Dívida Ativa Tributária Curto Prazo',
    'Extrair Dívida Ativa Tributária Longo Prazo', 'Extrair Faturas e Duplicatas Curto Prazo',
    'Extrair Faturas e Duplicatas Longo Prazo', 'Extrair Imobilizado', 'Extrair Pagamentos Antecipados',
    'Extrair Transferências Concedidas', 'Extrair Transferências Recebidas', 'Extrair VPA', 'Extrair VPD'
  ]),

  // Contábil - Tesouraria
  'Tesouraria (Cloud)': parseTasksIntoSections([
    'MIGRAÇÃO: OPERAÇÕES DE TESOURARIA',
    'Extrair Ajustes Bancários',
    'Extrair Transferências',
    'Extrair Conciliações Bancárias',
    'Extrair Saldos Bancários',
    'Extrair Gestão Bancária'
  ]),

  // Educação - Educação Básica
  'Educação Básica (Cloud)': parseTasksIntoSections([
    'MIGRAÇÃO: ESTRUTURA ACADÊMICA',
    'Extrair Anos Letivos', 'Extrair Disciplinas', 'Extrair Eixos Temáticos', 'Extrair Campos Experiências',
    'Extrair Unidades Temáticas', 'Extrair Objetos Conhecimento', 'Extrair Objetos Aprendizagem',
    'Extrair Competências CHA', 'Extrair Cursos', 'Extrair Matriz Curricular', 'Extrair Etapas Matriz',
    'Extrair Etapas Matriz Disciplinas',
    'MIGRAÇÃO: CADASTRO DE PESSOAS',
    'Extrair Países', 'Extrair Estados', 'Extrair Municípios', 'Extrair Bairros', 'Extrair Responsáveis',
    'Extrair Filiações', 'Extrair Religiões', 'Extrair Deficiências', 'Extrair Alunos', 'Extrair Observações Alunos',
    'Extrair Funcionários', 'Extrair Matrículas Funcionários', 'Extrair Locais Trabalho Matrículas',
    'Extrair Etapas Níveis Matrículas', 'Extrair Disciplinas Matrículas', 'Extrair Pessoa e-mail', 'Extrair Pessoa telefone',
    'MIGRAÇÃO: ORGANIZAÇÃO ESCOLAR',
    'Extrair Estabelecimentos', 'Extrair Históricos Escolares', 'Extrair Dependências Físicas', 'Extrair Tipos Cargos',
    'Extrair Tipos Dependências Físicas', 'Extrair Cargos', 'Extrair Lotações Físicas', 'Extrair Turmas',
    'Extrair Enturmações Funcionários', 'Extrair Disponibilidades', 'Extrair Quadro Horários', 'Extrair Aulas Quadros de Horários',
    'MIGRAÇÃO: CALENDÁRIO E EVENTOS',
    'Extrair Feriados', 'Extrair Eventos', 'Extrair Calendários Secretarias', 'Extrair Calendários Estabelecimentos',
    'Extrair Calendários Matrizes Curriculares', 'Extrair Calendários Feriados', 'Extrair Calendários Eventos', 'Extrair Calendários Exceções',
    'MIGRAÇÃO: DADOS DE MATRÍCULA E AVALIAÇÃO',
    'Extrair Atividades AEE', 'Extrair Atividades Complementares', 'Extrair Motivos Movimentação',
    'Extrair Motivos Dispensas', 'Extrair Horas Aulas', 'Extrair Quadro Vagas', 'Extrair Tipos Avaliações Turmas',
    'Extrair Notas Máximas', 'Extrair Turmas EJA Modular', 'Extrair Disciplinas EJA Modular',
    'Extrair Módulos Disciplinas EJA Modular', 'Extrair Configurações Avaliação', 'Extrair Campos Adicionais Disciplinas',
    'Extrair Campos Adicionais Cursos', 'Extrair Campos Adicionais Alunos', 'Extrair Campos Adicionais Turmas',
    'Extrair Programas Sociais', 'Extrair Legislações', 'Extrair Convenções', 'Extrair Avaliações Externas',
    'Extrair Estabelecimentos Avaliações Externas', 'Extrair Documentos Estabelecimentos', 'Extrair Funções Gratificadas',
    'Extrair Cursos Aperfeiçoamento', 'Extrair Cursos Aperfeiçoamento Funcionários', 'Extrair Formações Funcionários',
    'Extrair Formações Pós Gradução Funcionários', 'Extrair Equipes Diretivas', 'Extrair Configurações Lista Espera',
    'Extrair Matrículas', 'Extrair Matrículas EJA Modular', 'Extrair Matrículas Movimentação',
    'Extrair Registros Dispensas Atividades', 'Extrair Registros Dispensas Componentes', 'Extrair Inscrições Lista Espera',
    'Extrair Encaminhamentos Lista Espera', 'Extrair Registros Faltas', 'Extrair Registros Faltas Aulas',
    'Extrair Registros Faltas Dias', 'Extrair Registros Faltas EJA Modular', 'Extrair Registros Avaliações',
    'Extrair Registros Avaliações CHA', 'Extrair Registros Abonos', 'Extrair Acompanhamentos Pedagógicos',
    'Extrair Encerramentos', 'Extrair Situações Enturmação Componentes Curriculares', 'Extrair Alocações Aulas',
    'Extrair Aulas Realizadas'
  ]),

  // Educação - Biblioteca
  'Biblioteca': parseTasksIntoSections([
    'MIGRAÇÃO: DADOS DA BIBLIOTECA',
    'Extrair Empréstimos', 'Extrair Suspensões', 'Extrair Baixa de Materiais'
  ]),

  // Plataforma - Protocolo
  'Protocolo (Cloud)': parseTasksIntoSections([
    'MIGRAÇÃO: CADASTROS BÁSICOS E ESTRUTURA',
    'Extrair Pessoa', 'Extrair Pessoa e-Mail', 'Extrair Pessoa Telefone', 'Extrair Paises', 'Extrair Estados',
    'Extrair Cidades', 'Extrair Bairros', 'Extrair Tipo Logradouro', 'Extrair Logradouro', 'Extrair Bairro Logradouro',
    'Extrair CEP Logradouro', 'Extrair Loteamento', 'Extrair Organograma Config', 'Extrair Organograma Nível',
    'Extrair Organograma', 'Extrair Organograma Responsável', 'Extrair Feriado', 'Extrair Indexadores',
    'MIGRAÇÃO: CONFIGURAÇÃO DO PROCESSO',
    'Extrair Documentos', 'Extrair Classificação', 'Extrair Assuntos', 'Extrair Assuntos Documentos',
    'Extrair Assuntos Organogramas', 'Extrair Taxas', 'Extrair Taxas Valores', 'Extrair Assuntos Taxas',
    'MIGRAÇÃO: DADOS DE MOVIMENTAÇÃO',
    'Extrair Protocolos', 'Extrair Processos', 'Extrair Processos Partes', 'Extrair Entrega Documentos',
    'Extrair Andamentos', 'Extrair Pareceres', 'Extrair Arquivamentos', 'Extrair Localização'
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
  
  // Busca exata primeiro (considerando com e sem Cloud)
  for (const [key, tasks] of Object.entries(migrationTasksByProduct)) {
    const normalizedKey = normalizeProductName(key);
    if (normalizedKey === normalizedInput) {
      return tasks;
    }
  }
  
  // Busca parcial - só se o input inteiro estiver contido na key
  // Isso evita que "Cidadão Web Tributos" pegue "Tributos (Cloud)"
  for (const [key, tasks] of Object.entries(migrationTasksByProduct)) {
    const normalizedKey = normalizeProductName(key);
    // Só aceita se o input está contido COMPLETAMENTE na key E começa no início ou após espaço
    if (normalizedKey === normalizedInput || 
        (normalizedKey.startsWith(normalizedInput + ' ') || 
         normalizedKey.endsWith(' ' + normalizedInput))) {
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