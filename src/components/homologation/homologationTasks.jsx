// Tarefas de homologação por produto - serão preenchidas depois
// IMPORTANTE: Produtos que não aparecem aqui NÃO têm processo de homologação

// Função para dividir texto por vírgulas, respeitando parênteses
const splitByComma = (text) => {
  const parts = [];
  let current = '';
  let depth = 0;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (char === '(') {
      depth++;
      current += char;
    } else if (char === ')') {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0) {
      const trimmed = current.trim();
      if (trimmed) parts.push(trimmed);
      current = '';
    } else {
      current += char;
    }
  }
  
  const trimmed = current.trim();
  if (trimmed) parts.push(trimmed);
  
  return parts;
};

const parseTasksIntoSections = (tasks) => {
  const sections = [];
  let currentSection = null;

  tasks.forEach(task => {
    // Se a tarefa está em UPPERCASE completo ou começa com "ETAPA", "HOMOLOGAÇÃO" ou "SPRINT", é uma seção
    if (task === task.toUpperCase() || task.startsWith('ETAPA') || task.startsWith('HOMOLOGAÇÃO') || task.startsWith('SPRINT')) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = { section: task, tasks: [] };
    } else if (currentSection) {
      // Divide a tarefa por vírgulas (respeitando parênteses)
      const subtasks = splitByComma(task);
      currentSection.tasks.push(...subtasks);
    }
  });

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
};

// Mapa de produtos com suas tarefas de homologação
export const homologationTasksByProduct = {
  'e-Nota (Cloud)': parseTasksIntoSections([
    'CADASTROS',
    'Entidades',
    'Pessoas',
    'Usuários',
    'Auto de infração (Auto de infração e infrações)',
    'Base cadastral (Lista de serviços Lei 116/03, alíquota do Simples Nacional, taxas diversas, séries do RPS, unidades e contadores)',
    'Configurações (Gerais, pendências financeiras. créditos tributários, tomadores descontados, substitutos tributários, guias de pagamento, solicitações de acesso, liberação de RPS, carta de correção, saldos, mensagem ao prestador, integrações e gerenciador de certificado)',
    'Endereços (Bairros, condomínios, logradouros e loteamentos)',
    'Financeiros (Competências, convênios, indexadores, feriados e incentivos fiscais)',
    'Manutenção de incentivos fiscais',
    'Mensagens',
    'Relatórios personalizados',
    'Rotinas externas',
    'Scripts',
    'PROCESSOS',
    'Liberação',
    'Denúncia fiscal',
    'Prestadores',
    'Autorização para impressão de RPS',
    'Gerar competências',
    'Saldos (consultar saldos, lançar saldos. liberar saldos bloqueados, cancelar saldos e utilizar saldos por restituição)',
    'Créditos tributários (Liberar créditos, cancelar créditos, expirar créditos, gerar créditos, transferir créditos e gerar por script)',
    'Cancelar notas (Sem solicitação, com solicitação e estornar cancelamento)',
    'Substituir notas (Com solicitação e estornar substituição de nota fiscal)',
    'Manutenção de guias de pagamento (Vencimento das guias, cancelamentod as guias, integração das guias)',
    'Manutenções fiscais (Alteração de dedução fiscal e regime tributário, manutenção e remuneração de nota fiscal)',
    'Importação de arquivos (Optantes do simples nacional/SIMEI)',
    'Exportação de notas (Notas fiscais e TSE)',
    'Sincronizar cadastros',
    'Gerenciador de processos',
    'RELATÓRIOS',
    'Acessos (Acessos dos usuários, adesão ao sistema, denúncia fiscal e solicitação de acessos pendentes)',
    'Cadastrais (Bairros e usuários de prestadores)',
    'Créditos (Créditos tributários. extrato dos créditos tributários, créditos tributários por prestadores e créditos tributários por tomadores)',
    'Notas fiscais (Evolução das notas fiscais, maiores eminentes de notas fiscais, manutenções fiscais, notas fiscais, prestadores por notas, serviços prestados e substituições de notas fiscais)',
    'Pagamentos (Evolução da arrecadação, relação de pagamentos, e situação das guias de pagamentos)',
    'RPS (Autorização para impressão de RPS, RPS convertidos e não liberados e RPS convertidos fora do prazo)',
    'Serviços x CNAE',
    'Gerenciador de relatórios',
    'CONSULTAS',
    'Consulta geral',
    'Consultar notas',
    'Consultar lotes de RPS',
    'RPS convertidos fora do prazo',
    'Consultar créditos',
    'Consultar manutenção fiscal',
    'Consultar remunerações de nota fiscal',
    'Cobrança registrada',
    'Importação de nota nacional',
    'RESUMOS',
    'Estatísticos dos valores do ISS',
    'Notas emitidas',
    'GRÁFICOS',
    'Arrecadação por competência',
    'Notas fiscais por atividade',
    'Evolução das notas fiscais',
    'Notas fiscais emitidas por período',
    'Notas fiscais emitidas por prestador',
    'Notas fiscais emitidas por tomador',
    'ACESSOS',
    'Módulo contribuinte',
    'PRESTAÇÃO DE CONTAS',
    'Validar necessidade de campos relacionados às prestações de contas'
  ]),
  'Tributos (Cloud)': parseTasksIntoSections([
    'Módulo Imobiliário',
    'Validar Contribuintes',
    'Validar Econômico',
    'Validar Imóvel',
    'Créditos tributarios (Descrição, abreviatura, indexador, vincular com, transferência para dívida e receitas)',
    'Parcelas (Ano e crédito tributário)',
    'Moratórios (Tipo de lançamento, ano, crédito tributário e script)',
    'Compensatório (Tipo de lançamento, ano, crédito tributário e script)',
    'IPTU',
    'Tabelas de cálculo (Ano, descrição e origem dos campos)',
    'Cadastros gerais (Descrição, exibição, identificador, descrição da coluna e tipo)',
    'Planta de valores (Ano, nº do ato, distrito, bairro, logradouro, seção, face, inscrição imobiliária, indexador e valor do m²)',
    'Contribuintes (Dados pessoais e de endereço, documentos, campos adicionais e anexos)',
    'Construtoras (Descrição, número do CREA e data de registro)',
    'Imobiliárias (Nome e número do CRECI)',
    'Engenheiros/ Arquitetos (Nome, Nº dp CREA/ CAU e data de registro)',
    'Cartórios (Contribuinte e tipo)',
    'Agências (Número, dígito, nome, banco, CEP, município, logradouro, Nº, bairro)',
    'Bancos',
    'Indexadores (Descrição, sigla, tipo e movimentações)',
    'Limites de arrecadação (Topos de crédito, tipo de baixa, forma de pagamento, valor máximo de diferença, crédito)',
    'Convênios',
    'Documentos',
    'Imóveis',
    'Englobamento (Contribuinte, tipo de imóvel e filtros)',
    'Desmembramentos',
    'Remembramentos',
    'Geoprocessamento',
    'Obras',
    'Receita diversas (TIpo de serviço/crédito tributário, dados do serviço e lançamento)',
    'Requerimento/Manutenção de lançamento (Dados gerais, requerimento, receita de crédito e manutenção)',
    'Antecipação/Prorrogação de vencimentos (Definir filtros e prorrograr/antecipar vencimentos)',
    'Naturezas do texto jurídico (Descrição)',
    'Fontes de divulgação (Descrição e meio de comunicação)',
    'Atos',
    'Feriados (Descrição, abrangência, tipo e data)',
    'Unidades de medida (Símbolo, descrição singular, descrição plural, grandeza e gracionável?)',
    'Endereços (Faces, logradouros, condomínios, loteamentos, bairros, distritos, estados, municípios, seções e localidades)',
    'Benefícios fiscais (Descrição, tipo, ato/lei, validade e fundamentação legal)',
    'Motivos (Tipo, Lei/Ato e descrição)',
    'Materiais e serviços (Tipo, descrição, unidade de medida e tipo de cálculo)',
    'Guias (Tipo de lançamento, 2ª via?, crécdito tributário, convênio, data para pagamento, indexador, mostrar código de barras cobrar taxa de expediente?,)',
    'Transferência de imóveis (Informar dados, definir imóveis, configurar transferência e visualizar resumo)',
    'Não análisada',
    'Em análise',
    'Aguardando resposta',
    'Resposta recebida',
    'Deferida',
    'Indeferida',
    'Manutenção de pagamentos - pagamentos e saldos (Tipo de pagamento, tipo de inconsistência, nº do processo, observações, filtrar pagamento e gerar saldo)',
    'Cálculo (Ano e crédito tributário)',
    'Controle de saldo devedor',
    'Baixa automática/ estorno (Convênio, script, arquivo, baixa retroativa? data)',
    'Baixa manual/ estorno (Contribuinte, guia unificada, tipo de lançamento, exercício e Nº da parcela)',
    'Integração contábil (Validar integração no todo)',
    'Parcelamento de créditos (Dados gerais e filtros,  lançamentos a serem parcelados e confirmar parcelamento)',
    'Cancelamento/Reativação de documentos (Definir filtros e visualizar resultados)',
    'Encerramento',
    'Validar necessidade de campos relacionados às prestações de contas',
    'Módulo Dívida Ativa',
    'Parcelamento de créditos (Dados gerais, créditos tributários e taxas, parcelas)',
    'Documentos',
    'Agências (Número, dígito, nome, banco, CEP, município, logradouro, Nº, bairro)',
    'Bancos',
    'Indexadores (Descrição, sigla, tipo e movimentações)',
    'Limites de arrecadação (Topos de crédito, tipo de baixa, forma de pagamento, valor máximo de diferença, crédito)',
    'Convênios',
    'Receita diversas (TIpo de serviço/crédito tributário, dados do serviço e lançamento)',
    'Naturezas do texto jurídico (Descrição)',
    'Fontes de divulgação (Descrição e meio de comunicação)',
    'Atos',
    'Feriados (Descrição, abrangência, tipo e data)',
    'Unidades de medida (Símbolo, descrição singular, descrição plural, grandeza e gracionável?)',
    'Endereços (Faces, logradouros, condomínios, loteamentos, bairros, distritos, estados, municípios, seções e localidades)',
    'Motivos (Tipo, Lei/Ato e descrição)',
    'Benefícios fiscais (Descrição, tipo, Ato/Lei, validade e fundamentação legal)',
    'Materiais e serviços (Tipo, descrição, unidade de medida e tipo de cálculo)',
    'Guias (Tipo de lançamento, 2ª via?, crédito tributário, convênio, data para pagamento, indexador, mostrar código de barras?, cobrar taxa de expediente? e filtros)',
    'Livros de dívida ativa (Modelo e filtros)',
    'Termos de abertura/ encerramento do livro (Modelo e filtros)',
    'Baixa automática/ estorno - homologados e estornados (Convênio, script, arquivo baixa retroativa? e data)',
    'Baixa manual/ estorno (Contribuintes, guia unificada, tipo de lançamento, exercício e Nº da parcela)',
    'Integração contábil (Validar integração no todo)',
    'Inscrição em dívida (Débitos a serem inscritos e inscritos)',
    'Estorno de inscrição (Abertos e estornados)',
    'Parcelamento de créditos - Quitados e cancelados (Dados gerais e filtros,  lançamentos a serem parcelados e confirmar parcelamento)',
    'Anistias (Tipo, data, número do processo, fórmula, motivo, observações e filtros)',
    'Cancelamentos (Tipo, data, número do processo, fórmula, motivo, observações e filtros)',
    'Prescrições (Tipo, data, número do processo, fórmula, motivo, observações e filtros)',
    'Remissões (Tipo, data, número do processo, fórmula, motivo, observações e filtros)',
    'Suspensões (Tipo, data, número do processo, fórmula, motivo, observações e filtros)',
    'Prestações diversas (Tipo, data, número do processo, fórmula, motivo, observações e filtros)',
    'Transferência de dívida (Validar dívidas transferidas e processo de transferência)',
    'Cancelamento/ reativação de documentos  (Status, natureza, Nº do documento, modelo e contribuintes)',
    'Encerramento',
    'Validar necessidade de campos relacionados às prestações de contas',
    'Módulo Mobiliário',
    'TABELAS',
    'BASE CADASTRAL',
    'PESSOAS',
    'LANÇAMENTOS',
    'DOCUMENTOS',
    'FINANCEIRO',
    'Bancos',
    'TAXAS',
    'EMPRESAS',
    'CADASTROS AUXILIARES',
    'EMISSÃO',
    'CONSULTAS',
    'MOVIMENTAÇÃO FINANCEIRA',
    'MANUTENÇÕES',
    'ENCERRAMENTO MENSAL',
    'PRESTAÇÃO DE CONTAS'
  ]),
  'Procuradoria (Cloud)': parseTasksIntoSections([
    'AGENDA',
    'Validar funcionabilidade da agenda',
    'PESSOAS',
    'Contribuintes (Dados pessoais, dados de endereço, documentos e anexos)',
    'Referentes (Tipo, código, contribuinte, logradouro, número, bairro, município, corresponsável, proprietários, quadra, lote, inscrição imobiliária e complemento)',
    'Cartórios (Nome e tipo)',
    'Advogados e procuradores (Tipo, nome, inscrição na OAB, seccional OAB, complemento OAB e usuário)',
    'FINANCEIRO',
    'Agências (Número, dígito, nome, banco, CEP, município, logradouro, Nº, bairro)',
    'Bancos',
    'Convênios (Descrição, número, banco, agência, fórmula, modelo de carne, conta bancária. créditos tributarios, pode utilizar em parcelamentos? usa validade para número de baixa?, validade do número de baixa. homologar baixa e mensagens)',
    'Créditos tributários',
    'CADASTROS AUXILIARES',
    'Endereços (Faces, logradouros, condomínios, loteamentos, bairros, distritos, estados, municípios, seções e localidades)',
    'Áreas e assuntos (Código e descrição)',
    'Locais de tramitação (Tribunal)',
    'Grupos de trabalho (Descrição do grupo, data de ativação, áreas e pessoas que fazem parte do grupo)',
    'Classes (Código e descrição)',
    'Motivos (Descrição e tipo)',
    'CONTROLE DE DOCUMENTOS',
    'Cancelamento/ Reativação de documentos (Validar documentos ativos e cancelados)',
    'Modelos de petições intermediárias (Validar petições)',
    'Documentos emitidos (Certidão de dívida ativa, petição inicial e petição intermediária)',
    'DÍVIDAS',
    'Dívidas ativas (Sem certidão, com certidão, com petição,  protestada, protestada com petição, executada, executada e protestada)',
    'Processos  (execuções fiscais. quitadas/canceladas, parceladas/ suspensas e suspensas com dívidas em aberto)',
    'GERENCIADOR DE PROTESTOS',
    'Protestos (protestos, quitadas/ canceladas, parceladas/ suspensas)',
    'Validar necessidade de campos relacionados às prestações de contas',
    'EMISSÃO',
    'CONSULTAS',
    'MOVIMENTAÇÃO FINANCEIRA',
    'MANUTENÇÕES',
    'ENCERRAMENTO MENSAL',
    'PRESTAÇÃO DE CONTAS'
  ]),
  'Livro Eletrônico': parseTasksIntoSections([
    'CADASTROS',
    'Entidade',
    'Configurações (Gerais, fórmulas, autos de infrações, notas avulsas, certidão negativa, solicitações de acesso, configurações auxiliares e integrações)',
    'Pessoa',
    'Contribuintes',
    'Contadores',
    'Gráficas',
    'Financeiros (Competências, convênios, indexadores, feriados e incentivos fiscais)',
    'Base cadastral (Lista de serviços da lei 116/03, alíquotas do simples nacional, faixas do IRRF, plano de contas, despesas, materiais, taxas diversas, motivos da alteração de alíquota, entidades especiais, intes de ISS fixo e séries)',
    'Auto de infração (Infrações e autos de infrações)',
    'Endereços (Bairros, condemínios, logradouros e loteamentos)',
    'Fiscalizações por período',
    'PROCESSOS',
    'Liberação de acesso',
    'AIDF (Liberação de AIDF e Validação de recibos de AIDF)',
    'Contador (Desvínculo de contador e transferência de contador)',
    'Notas Avulsas',
    'Guias Tributos Cloud',
    'Saldos (Consultar saldos, lançar saldos, liberar saldos bloqueados, bloquear saldos liberados, cancelar saldos e utilizar saldos por restituição)',
    'Encerramento de declarações',
    'Reabertura das declarações (Serviços e despesas)',
    'Análise das declarações  (Gerenciados de pendências e cruzamento de documentos)',
    'Alteração cadastral',
    'Sincronizar dados',
    'Gerenciador de processos',
    'RELATÓRIOS',
    'Movimentação cadastral (Contribuintes e plano de contas)',
    'Movimentação fiscal',
    'Análise dos documentos',
    'Análise dos documentos importados',
    'Serviços prestados não declarados pelo tomador',
    'Serviços prestados por município',
    'Serviços tomados não declarados pelo prestador',
    'Serviços tomados por município',
    'Situação dos contribuintes',
    'Encerramento simples nacional',
    'Taxas diversas',
    'Cruzamento entre declarações dos serviços e dos valores recebidos em cartão',
    'Movimentação financeira (Arrecadações de ISS, lançamentos de ISS, arrecadações e lançamentos de ISS, maiores prestadores, maiores tomadores, maiores atividades, situação das guias de pagamento, guias registradas e maiores contribuintes por condições em cartão)',
    'Contador (Certidão de desvínculo de contador, comprovante de transferência de contador, contribuintes por contador e transferências de contador)',
    'Conferência do livro do ISS',
    'Recibo de ISS retido/por substituição',
    'Recibos de declarações',
    'Fiscalização por período',
    'AIDF (Documentos fiscais liberados e não declarados, documentos fiscais não autorizados e relatório de AIDF)',
    'Gerenciador de relatórios',
    'CONSULTAS',
    'Cobrança registrada',
    'ACESSO',
    'Módulo contribuinte',
    'PRESTAÇÃO DE CONTAS',
    'Validar necessidade de campos relacionados às prestações de contas',
    'EMISSÃO',
    'CONSULTAS',
    'MOVIMENTAÇÃO FINANCEIRA',
    'MANUTENÇÕES',
    'ENCERRAMENTO MENSAL',
    'PRESTAÇÃO DE CONTAS'
  ]),
  'Protocolo (Cloud)': parseTasksIntoSections([
    'PESSOAS',
    'Nome',
    'CPF/CNPJ',
    'Nome Social',
    'Endereços',
    'Telefone',
    'E-mail',
    'Filiações',
    'Estado Civil',
    'Sexo',
    'Data de nascimento',
    'Data de óbito',
    'ORGANOGRAMAS',
    'Configuração de organograma',
    'Usuários/Responsáveis do organograma',
    'ENDEREÇOS',
    'Países',
    'Estados',
    'Municipios',
    'Bairros',
    'Tipo de logradouro',
    'Logradouros',
    'Condominio',
    'CEP do logradouro',
    'Bairro do logradouro',
    'GESTÃO DE PROCESSOS',
    'Processo',
    'Confirmações',
    'Andamentos',
    'Transferências',
    'Estorno de processos',
    'Localização do processo (processo-organograma-usuario)',
    'Processo-Volume',
    'Movimentações',
    'Classificação',
    'Arquivamentos',
    'Processo Organograma',
    'Partes interessadas do processo',
    'Geolocalização',
    'Juntamentos de processos',
    'Guias de pagamento',
    'Parecer',
    'Deferidos',
    'Indeferido',
    'Confirmado',
    'Anulado',
    'Conhecimento',
    'Parcial',
    'Outros',
    'ASSUNTOS',
    'Validar informações adicionais',
    'Configurações do Assunto',
    'Documentos do assunto',
    'Guias de pagamento',
    'Taxas do assunto',
    'EMISSÃO',
    'CONSULTAS',
    'MOVIMENTAÇÃO FINANCEIRA',
    'MANUTENÇÕES',
    'ENCERRAMENTO MENSAL',
    'PRESTAÇÃO DE CONTAS'
  ]),
  'Portal Gestor (Cloud)': parseTasksIntoSections([
    'CONTÁBIL',
    'Configurações gerais',
    'Cargas',
    'Índices',
    'ARRECADAÇÃO',
    'Configurações gerais',
    'Cargas',
    'Índices',
    'Configurações gerais',
    'Cargas',
    'Índices',
    'PESSOAL',
    'Configurações gerais',
    'Cargas',
    'Índices',
    'SAÚDE',
    'Configurações gerais',
    'Cargas',
    'Índices',
    'EDUCAÇÃO',
    'Configurações gerais',
    'Cargas',
    'Índices',
    'CONTRATOS',
    'Configurações gerais',
    'Cargas',
    'Índices',
    'Processo-Volume',
    'Movimentações',
    'Classificação',
    'Arquivamentos',
    'Processo Organograma',
    'Partes interessadas do processo',
    'Geolocalização',
    'Juntamentos de processos',
    'Guias de pagamento',
    'Deferidos',
    'Indeferido',
    'Confirmado',
    'Anulado',
    'Conhecimento',
    'Parcial',
    'Outros',
    'Validar informações adicionais',
    'Configurações do Assunto',
    'Documentos do assunto',
    'Guias de pagamento',
    'Taxas do assunto',
    'EMISSÃO',
    'CONSULTAS',
    'MOVIMENTAÇÃO FINANCEIRA',
    'MANUTENÇÕES',
    'ENCERRAMENTO MENSAL',
    'PRESTAÇÃO DE CONTAS'
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
  
  // Busca APENAS match exato (considerando com e sem Cloud)
  for (const [key, tasks] of Object.entries(homologationTasksByProduct)) {
    const normalizedKey = normalizeProductName(key);
    if (normalizedKey === normalizedInput) {
      return tasks;
    }
  }
  
  // Se não encontrou match exato, retorna null (produto sem homologação)
  return null;
};

// Verifica se um produto tem processo de homologação
export const productHasHomologation = (productName) => {
  return getDefaultTasksForProduct(productName) !== null;
};