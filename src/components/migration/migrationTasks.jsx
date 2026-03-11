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
  ]),
  'Tributos (Cloud)': parseTasksIntoSections([
    'Dados Cadastrais',
    'Extrair Paises',
    'Extrair Estados',
    'Extrair Cidades',
    'Extrair Faces',
    'Extrair TiposLogradouros',
    'Extrair Distritos',
    'Extrair Bairros',
    'Extrair Ruas',
    'Extrair RuasBairros',
    'Extrair RuasCeps',
    'Extrair Loteamentos',
    'Extrair Condominios',
    'Extrair Bancos',
    'Extrair AgenciasBancarias',
    'Extrair TiposAtos',
    'Extrair FontesDivulgacao',
    'Extrair NaturezaTextoJuridico',
    'Extrair Atos',
    'Extrair AtosFontes',
    'Extrair Motivos',
    'Extrair Agrupamentos',
    'Extrair UnidadeMedida',
    'Extrair CamposAdicionais',
    'Extrair CamposAdicionaisCompl',
    'Extrair CamposAdicionaisReceitas',
    'Extrair CamposAdicionaisAgrupamentos',
    'Extrair Indexadores',
    'Extrair IndexadoresValores',
    'Extrair CreditosTributarios',
    'Extrair Receitas',
    'Extrair CreditosReceitas',
    'Extrair Feriados',
    'Extrair MateriaisServicos',
    'Extrair ConfigImovel',
    'Extrair ConfigInscrImobiliaria',
    'Extrair ConfigMelhoria',
    'Extrair ReceitasDiversasConfig',
    'Extrair NotasConfig',
    'Extrair ITBIConfig',
    'Extrair DividasConfig',
    'Extrair DividasConfigLivro',
    'Extrair PagamentosConfig',
    'Extrair ParcelamentosConfigCreditos',
    'Extrair ParcelamentosConfigTaxas',
    'Extrair Config2Via',
    'Extrair ParcelasConfig',
    'Extrair ParcelasConfigReceitas',
    'Extrair Pessoa',
    'Extrair PessoaTelefone',
    'Extrair PessoaEmail',
    'Extrair PessoaFisica',
    'Extrair PessoaJuridica',
    'Extrair PessoaFisicaDocumento',
    'Extrair PessoasEndereco',
    'Extrair PessoaSocio',
    'Extrair PessoaCampoAdicional',
    'Extrair PessoaCampoAdicionalCompl',
    'Extrair PessoaAverbacao',
    'Extrair PessoaContas',
    'Extrair PessoaSimples',
    'Extrair PessoaMEI',
    'Extrair Secoes',
    'Extrair SecaoCampoAdicional',
    'Extrair SecaoCampoAdicionalCompl',
    'Extrair PlantasValores',
    'Extrair Imobiliarias',
    'Extrair Imoveis',
    'Extrair ImoveisInfComplem',
    'Extrair ImoveisDebitoConta',
    'Extrair ImoveisCamposAdicionais',
    'Extrair ImoveisCamposAdicionaisCompl',
    'Extrair ImoveisEnglobados',
    'Extrair ImoveisTestadas',
    'Extrair ImoveisResponsaveis',
    'Extrair ImoveisMovimentacoes',
    'Extrair ImoveisHistoricos',
    'Extrair ImoveisMovimentacoes_historico',
    'Extrair ImoveisImagens',
    'Extrair Contador',
    'Extrair Cartorios',
    'Extrair ListaServicos',
    'Extrair Cnaes',
    'Extrair Atividades',
    'Extrair AtividadesCamposAdicionais',
    'Extrair AtividadesCamposAdicionaisCompl',
    'Extrair AtividadesRelacionamento',
    'Extrair Horarios',
    'Extrair HorariosDias',
    'Extrair TiposEntidades',
    'Extrair Economicos',
    'Extrair EconomicosCnaes',
    'Extrair EconomicosCnaesCamposAdicionais',
    'Extrair EconomicosCnaesCamposAdicionaisCompl',
    'Extrair EconomicosCnaesValores',
    'Extrair EconomicosServicos',
    'Extrair EconomicosServicosValores',
    'Extrair EconomicosCamposAdicionais',
    'Extrair EconomicosCamposAdicionaisCompl',
    'Extrair EconomicosMovimentacoes',
    'Extrair Melhorias',
    'Extrair MelhoriasMateriais',
    'Extrair MelhoriasBairros',
    'Extrair MelhoriasCamposAdicionais',
    'Extrair MelhoriasCamposAdicionaisCompl',
    'Extrair MelhoriasImoveis',
    'Extrair MelhoriasImoveisCamposAdicionais',
    'Extrair Engenheiros',
    'Extrair EngenheirosCBO',
    'Extrair Construtoras',
    'Extrair ConstrutorasEngenheiros',
    'Extrair Obras',
    'Extrair ObrasConstrutoras',
    'Extrair ObrasOpcoes',
    'Extrair ObrasOpcoesCompl',
    'Extrair ObrasEngenheiros',
    'Dados de Lançamentos',
    'Extrair ReceitasDiversas',
    'Extrair ReceitasDiversasMovimentacoes',
    'Extrair ReceitasDiversasCamposAdicionais',
    'Extrair ReceitasDiversasLancamentos',
    'Extrair ReceitasDiversasLancamentosReceitas',
    'Extrair Notas',
    'Extrair NotasServicos',
    'Extrair NotasMovtos',
    'Extrair ITBI',
    'Extrair ITBIImoveis',
    'Extrair ITBIImoveisProcessos',
    'Extrair ITBIImoveisItens',
    'Extrair ITBICompradores',
    'Extrair  ImoveisMovimentacoes',
    'Extrair Desmembramentos',
    'Extrair DesmembramentosImoveis',
    'Extrair DesmembramentosOrigem',
    'Extrair Remembramentos',
    'Extrair RemembramentosImoveis',
    'Extrair CorrecaoDividas',
    'Extrair Dividas',
    'Extrair DividasReceitas',
    'Extrair DividasComentario',
    'Extrair DividasResponsaveis',
    'Extrair DividasStatus',
    'Extrair DividasDoctos',
    'Extrair DividasDebitos',
    'Extrair lancamentos',
    'Extrair Guias',
    'Extrair NumerosBaixas',
    'Extrair GuiasEmitidas',
    'Extrair GuiasEmitidasReceitas',
    'Extrair GuiaUnificada',
    'Extrair GuiaUnificadaComposicoes',
    'Extrair PagamentosConvenios',
    'Extrair Pagamentos',
    'Extrair PagamentosDetalhamentos',
    'Extrair PagamentosTaxas',
    'Extrair Parcelamentos',
    'Extrair ParcelamentosCancelados',
    'Extrair ParcelamentosCreditos',
    'Extrair ParcelamentosReferentes',
    'Extrair ParcelamentosOrigem',
    'Extrair ParcelamentosComposicoes',
    'Extrair ParcelamentosAbatimentos',
    'Extrair ParcelamentosOrdens',
    'Extrair ParcelamentosParcelas',
    'Extrair ParcelamentosTaxas',
    'Extrair Convenios',
    'Extrair ConveniosCreditos',
    'Extrair ConveniosMensagens',
    'Extrair Beneficios',
    'Extrair Tabelas',
    'Extrair TabelasCampos',
    'Extrair TabelasConjuntos',
    'Extrair TabelasRelacionadas',
    'Extrair TabelasValores',
    'Extrair Competencias',
    'Extrair Parcelas',
    'Extrair ParcelasParcelas',
    'Extrair ParcelasReceitas',
    'Extrair Lancamentos',
    'Extrair LancamentosEnglobados',
    'Extrair LancamentosReceitas',
    'Extrair LancamentosDebitos',
    'Extrair LancamentosDebitosReceitas',
    'Extrair LancamentosDeclaracoes',
    'Extrair LancamentosDeclaracoesServicos',
    'Extrair ManutencoesCalculo',
    'Extrair ManutencoesCalculoCreditos',
    'Extrair ManutencoesCalculoReferentes',
    'Extrair ManutencoesCalculoReceitas',
    'Extrair ManutencoesCalculoGuias',
    'Extrair ManutencoesCalculoMovto'
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