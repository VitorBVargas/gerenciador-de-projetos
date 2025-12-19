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

// Mapa de produtos com suas tarefas de homologação
export const homologationTasksByProduct = {
  // ARRECADAÇÃO
  'Tributos (Cloud)': parseTasksIntoSections([
    'SPRINT 1: CADASTROS BÁSICOS',
    'Módulo Imobiliário - Pessoas: Contribuintes (dados pessoais, endereço, documentos, campos adicionais, anexos), Construtoras, Imobiliárias, Engenheiros/Arquitetos, Cartórios',
    'Módulo Mobiliário - Pessoas: Contribuintes, Construtoras, Imobiliárias, Engenheiros/Arquitetos, Cartórios, Contadores',
    'Módulo Imobiliário - Auxiliares: Naturezas do texto jurídico, Fontes de divulgação, Atos, Feriados, Unidades de medida, Endereços, Benefícios fiscais, Motivos, Materiais e serviços',
    'Módulo Mobiliário - Auxiliares: Naturezas do texto jurídico, Fontes de divulgação, Atos, Feriados, Unidades de medida, Endereços, Tipos de documentos, Motivos, Benefícios fiscais, Alíquotas do IRRF, Materiais e serviços',
    'Módulo Dívida Ativa - Auxiliares: Naturezas do texto jurídico, Fontes de divulgação, Atos, Feriados, Unidades de medida, Endereços, Motivos, Benefícios fiscais, Materiais e serviços',
    'SPRINT 2: TRIBUTOS E LANÇAMENTOS',
    'Módulo Imobiliário: Créditos tributários, Parcelas (ano e crédito tributário), Requerimento/Manutenção de lançamento, Antecipação/Prorrogação de vencimentos',
    'Módulo Mobiliário: Créditos tributários, Parcelas (ano e crédito tributário), Competências, Requerimento/Manutenção de lançamento, Antecipação/Prorrogação de vencimentos',
    'SPRINT 3: FÓRMULAS E TABELAS',
    'Módulo Imobiliário: Moratórios, Compensatório, Tabelas de cálculo, Cadastros gerais, Planta de valores',
    'Módulo Mobiliário: Moratórios, Compensation, Tabelas de cálculo, Cadastros gerais',
    'Módulo Dívida Ativa: Moratórios, Compensatório',
    'SPRINT 4: PARCELAMENTO E BASE CADASTRAL',
    'Módulo Imobiliário: Dados gerais, Créditos tributários e taxas, Parcelas, Campos adicionais',
    'Módulo Mobiliário: Campos adicionais, Atividade econômica, Horários de funcionamento',
    'Módulo Dívida Ativa: Parcelamento de créditos',
    'SPRINT 5: DOCUMENTOS E TAXAS',
    'Módulo Imobiliário: Documentos, Receitas diversas',
    'Módulo Mobiliário: Documentos, Receitas diversas',
    'Módulo Dívida Ativa: Documentos, Receitas diversas',
    'SPRINT 6: FINANCEIRO',
    'Módulo Imobiliário: Agências, Bancos, Indexadores, Limites de arrecadação, Convênios',
    'Módulo Mobiliário: Agências, Bancos, Indexadores, Limites de arrecadação, Convênios',
    'Módulo Dívida Ativa: Agências, Bancos, Indexadores, Limites de arrecadação, Convênios',
    'SPRINT 7: EMISSÃO',
    'Módulo Imobiliário: Guias',
    'Módulo Mobiliário: Guias',
    'Módulo Dívida Ativa: Guias, Livros de dívida ativa, Termos de abertura/encerramento',
    'SPRINT 8: MOVIMENTAÇÃO FINANCEIRA',
    'Módulo Imobiliário: Manutenção de pagamentos, Cálculo, Controle de saldo devedor, Baixa automática/estorno, Baixa manual/estorno, Integração contábil',
    'Módulo Mobiliário: Manutenção de pagamentos, Cálculo, Declaração de ISS homologado, Notas avulsas, Baixa automática/estorno, Baixa manual/estorno, Integração contábil',
    'Módulo Dívida Ativa: Baixa automática/estorno, Baixa manual/estorno, Integração contábil',
    'SPRINT 9: MANUTENÇÕES',
    'Módulo Imobiliário: Parcelamento de créditos, Cancelamento/Reativação de documentos',
    'Módulo Mobiliário: Parcelamento de créditos, Cancelamento/Reativação de documentos',
    'Módulo Dívida Ativa: Parcelamento de créditos, Manutenção da dívida (anistias, cancelamentos, prescrições, etc.), Transferência de dívida, Cancelamento/Reativação de documentos',
    'SPRINT 10: ESPECÍFICOS DO MÓDULO IMOBILIÁRIO',
    'Módulo Único: Imóveis (Cadastro, Englobamento, Desmembramentos, Remembramentos), Geoprocessamento, Obras, Contribuições de melhoria, Movimentação Cadastral',
    'SPRINT 11: ESPECÍFICOS DO MÓDULO MOBILIÁRIO',
    'Módulo Único: Empresas (Econômicos), Consultas (Viabilidade, Gerenciador de econômicos)',
    'SPRINT 12: ESPECÍFICOS DO MÓDULO DÍVIDA ATIVA',
    'Módulo Único: Processos (Inscrição em dívida, Estorno de inscrição)',
    'SPRINT 13: ENCERRAMENTO E PRESTAÇÃO DE CONTAS',
    'Todos os Módulos: Encerramento Mensal (Imobiliário, Mobiliário, Dívida Ativa), Prestação de Contas (Imobiliário, Mobiliário, Dívida Ativa)'
  ]),

  'e-Nota (Cloud)': parseTasksIntoSections([
    'SPRINT 1: CADASTROS E CONFIGURAÇÕES',
    'Módulo Único: Cadastros (Entidades, Pessoas, Usuários), Auto de infração, Base cadastral (lista de serviços Lei 116/03, alíquotas, taxas), Configurações gerais, Endereços, Financeiros (competências, convênios, indexadores, feriados), Manutenção de incentivos fiscais, Mensagens, Relatórios personalizados, Rotinas externas, Scripts',
    'SPRINT 2: PROCESSOS E MOVIMENTAÇÕES',
    'Módulo Único: Processos (Liberação, Denúncia fiscal), Prestadores, Autorização para impressão de RPS, Gerar competências, Saldos, Créditos tributários, Cancelar notas, Substituir notas, Manutenção de guias de pagamento, Manutenções fiscais, Importação de arquivos (Simples Nacional/SIMEI), Exportação de notas, Sincronizar cadastros, Gerenciador de processos',
    'SPRINT 3: RELATÓRIOS, CONSULTAS E ACESSOS',
    'Módulo Único: Relatórios (Acessos, Cadastrais, Créditos, Notas fiscais, Pagamentos, RPS), Gerenciador de relatórios, Consultas, Resumos, Gráficos, Acessos, Prestação de Contas'
  ]),

  'Procuradoria (Cloud)': parseTasksIntoSections([
    'SPRINT 1: CADASTROS E PESSOAS',
    'Módulo Único: Agenda, Pessoas, Cadastros Auxiliares, Financeiro',
    'SPRINT 2: DOCUMENTOS E PROCESSOS',
    'Módulo Único: Controle de Documentos, Modelos de Documentos, Emissões de Documentos (CDA, Petição inicial), Dívidas ativas, Gerenciador de Processos (Execuções fiscais), Gerenciador de Protestos, Prestação de Contas'
  ]),

  'Livro Eletrônico': parseTasksIntoSections([
    'SPRINT 1: CADASTROS',
    'Módulo Único: Cadastros (Entidade, Configurações, Pessoa), Financeiros, Base cadastral, Auto de infração, Endereços, Fiscalizações por período',
    'SPRINT 2: PROCESSOS E DECLARAÇÕES',
    'Módulo Único: Processos (Liberação de acesso, AIDF, Contador, Notas Avulsas), Saldos, Encerramento de declarações, Reabertura das declarações, Análise das declarações, Alteração cadastral, Sincronizar dados, Gerenciador de processos',
    'SPRINT 3: RELATÓRIOS E ACESSOS',
    'Módulo Único: Relatórios, Gerenciador de relatórios, Consultas, Acessos, Prestação de Contas'
  ]),

  'Gestão Fiscal Cloud': parseTasksIntoSections([
    'SPRINT 1: CADASTROS E PESSOAS',
    'Módulo Único: Pessoas, Cadastros Gerais, Endereços, Cadastros Financeiros, Cálculo de planejamento fiscal, Procedimento fiscal',
    'SPRINT 2: INTELIGÊNCIA E FISCALIZAÇÃO',
    'Módulo Único: Inteligência Fiscal, Auto de infração, Gerenciador de fiscalizações'
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