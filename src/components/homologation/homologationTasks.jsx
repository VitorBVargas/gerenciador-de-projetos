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
  ]),

  // COMPRAS
  'Compras (Cloud)': parseTasksIntoSections([
    'SPRINT 1: PARÂMETROS GERAIS',
    'Módulo Único: Por exercício, Por certificado, Geral, Validar scripts, Portal da transparência, PNPC, Validar modelos de relatórios, Data a quantidade e Plano preço unitário',
    'SPRINT 1: ESTRUTURA ORGANIZACIONAL',
    'Módulo Único: Organogramas, Entidades, Órgão externo',
    'SPRINT 1: CATÁLOGO',
    'Módulo Único: Grupos e Classes, Unidades de medida, Materiais e Serviços',
    'SPRINT 1: ORÇAMENTO',
    'Módulo Único: Despesas, Objetos',
    'SPRINT 1: PESSOAS',
    'Módulo Único: Membros do Pregão, Pregoeiros, CPC, Responsável, Comissão, Comissão de licitação, Grupos de servidores',
    'SPRINT 1: BANCÁRIOS',
    'Módulo Único: Agências',
    'SPRINT 1: ATOS',
    'Módulo Único: Ato, Tipo de ato, Naturezas de texto jurídico',
    'SPRINT 1: INFORMAÇÕES DE ENTREGA',
    'Módulo Único: Fontes de divulgação, Locais de entrega',
    'SPRINT 1: CADASTROS AUXILIARES',
    'Módulo Único: Modalidades de licitação, Modelos de documentos, Formas de julgamento, Tipos de objeto, Tipos de impropriedade de recurso, Tipos de votos de julgamento, Tipos de pareceres, Tipos de publicação do processo, Tipos de documento, Motivos de revogação, Endereços, Fundamentos Legais',
    'SPRINT 2: SOLICITAÇÕES DE COMPRA',
    'Módulo Único: Solicitações, Aguardando autorização, Autorizadas, Em cotação, Aguardando aprovação, Aprovadas, Atendidas',
    'SPRINT 2: COTAÇÃO DE PREÇOS',
    'Módulo Único: Cotações de preços',
    'SPRINT 2: PROCESSOS',
    'Módulo Único: Processos Administrativos (Base Interna/Externa), Validar Informações Gerais, PNPC, Itens adicionais, Validar fases (Em parecer contábil, Aguardando Autorização, Aguardando Formalização, Em parecer Técnico Inicial)',
    'SPRINT 3: PROCESSOS',
    'Módulo Único: Integração com Plataforma de Licitação, Atos Finais, Pareceres, Tramitação do processo',
    'SPRINT 3: REGISTROS DE PREÇOS',
    'Módulo Único: Atas de registros de preços, Validar Atas Vigentes e Encerradas, Validar ocorrência nas atas',
    'SPRINT 3: INTEGRAÇÕES ENTRE SISTEMAS',
    'Módulo Único: Validar Integração com o sistema contábil, Prestação de contas e scripts'
  ]),

  'Contratos (Cloud)': parseTasksIntoSections([
    'SPRINT 1: CONFIGURAÇÕES DO SISTEMA',
    'Módulo Único: Gerais, Por entidade, Scripts de integração, Modelos de relatórios, Numeração da contratação, Endereços, Tipos diversos (aditivo, garantias, instrumento, objeto, publicação, rescisão, responsáveis, apostilamento, sanções), Motivos de rescisão, Fontes de divulgação, Tipos de administração, Tipos de documento, Modelos de documentos, Fundamentos legais',
    'SPRINT 1: ESTRUTURA ORGANIZACIONAL',
    'Módulo Único: Organogramas, Entidades',
    'SPRINT 1: ORÇAMENTO',
    'Módulo Único: Despesas, Objetos',
    'SPRINT 1: BANCÁRIOS',
    'Módulo Único: Agências',
    'SPRINT 1: COMPROVANTES',
    'Módulo Único: Tipos de comprovantes, Comprovantes',
    'SPRINT 1: INFORMAÇÕES DE ENTREGA',
    'Módulo Único: Locais de entrega, Prazos de entrega/execução',
    'SPRINT 2: CONTRATAÇÕES',
    'Módulo Único: Compras diretas (todas as fases), Contratações (todas as fases), Atas de registro de preço (todas as fases)',
    'SPRINT 2: SOLICITAÇÕES DE FORNECIMENTO',
    'Módulo Único: Solicitações, Pendentes, Regional, Anuladas, Aguardando Autorização',
    'SPRINT 3: SOLICITAÇÕES DE FORNECIMENTO',
    'Módulo Único: Autorizadas, Concluídas',
    'SPRINT 3: SANÇÕES ADMINISTRATIVAS',
    'Módulo Único: Fornecedor, Tipo, Nº do contrato, Data, etc.',
    'SPRINT 3: INTEGRAÇÕES E PRESTAÇÃO DE CONTAS',
    'Módulo Único: Validar integração com sistemas (contábil, patrimonial, almoxarifado), Pesquisa de preços, Prestação de contas'
  ]),

  'Almoxarifado': parseTasksIntoSections([
    'SPRINT 1: PARÂMETROS E CADASTROS',
    'Módulo Único: Parâmetros, Portal da Transparência, Portal do Gestor, Organogramas, Entidades, Naturezas da movimentação, Endereços, Grupos e Classes, Unidades de medida, Materiais e serviços, Lotes, Almoxarifados, Localizações físicas',
    'SPRINT 2: PESSOAS E ESTOQUE',
    'Módulo Único: Fornecedores, Responsáveis, Posição do Estoque, Requisições Internas, Requisições entre Almoxarifados',
    'SPRINT 3: MOVIMENTAÇÕES',
    'Módulo Único: Entradas, Saídas, Transferências, Inventários, Encerramentos',
    'SPRINT 4: PRESTAÇÃO DE CONTAS',
    'Módulo Único: Validar necessidade de campos relacionados às prestações de contas'
  ]),

  'Frotas (Cloud)': parseTasksIntoSections([
    'SPRINT 1: PARÂMETROS E CADASTROS',
    'Módulo Único: Portal da Transparência, Portal do Gestor, Itens de Checklist, Organogramas, Entidades, Grupos e Classes, Unidades de medida, Veículos e Equipamentos, Acessórios e Itens Agregados',
    'SPRINT 2: OPERAÇÃO',
    'Módulo Único: Fornecedores, Motoristas, Reservas de Veículos, Viagens',
    'SPRINT 3: DESPESAS E DOCUMENTAÇÃO',
    'Módulo Único: Despesas, Taxas e Licenciamentos, Multas de Trânsito',
    'SPRINT 4: PRESTAÇÃO DE CONTAS',
    'Módulo Único: Validar necessidade de campos relacionados às prestações de contas'
  ]),

  'Patrimônio (Cloud)': parseTasksIntoSections([
    'SPRINT 1: PARÂMETROS E CADASTROS',
    'Módulo Único: Por exercício, Portal da Transparência, Scripts de Integração, Métodos de Depreciação, Organogramas, Entidades, Endereços, Localizações físicas, Unidades de medida, Tipos de Comprovante',
    'SPRINT 2: PESSOAS, SEGUROS E ATOS',
    'Módulo Único: Responsáveis, Comissões, Apólices de seguro, Tipos de atos, Naturezas de texto jurídico, Fontes de divulgação, Atos',
    'SPRINT 3: BENS E MOVIMENTAÇÕES',
    'Módulo Único: Bens, Depreciações, Baixas, Transferências',
    'SPRINT 4: AVALIAÇÕES E ROTINAS',
    'Módulo Único: Reavaliações, Inventários, Encerramento de periódicos, Integração com a contabilidade, Coleta de bens',
    'SPRINT 5: PRESTAÇÃO DE CONTAS',
    'Módulo Único: Validar necessidade de campos relacionados às prestações de contas'
  ]),

  'Obras': parseTasksIntoSections([
    'SPRINT 1: PARÂMETROS E CADASTROS',
    'Módulo Único: Por exercício e geral, Portal da Transparência, Organogramas, Entidades, Unidades de medida, Responsáveis técnicos, Atos, Tipos de atos, Naturezas do texto jurídico, Categorias da obra, Endereços, CNOS',
    'SPRINT 2: OBRAS E MEDIÇÕES',
    'Módulo Único: Obras (todas as situações), Medições, CNOS, Responsáveis técnicos na Obra',
    'SPRINT 3: PRESTAÇÃO DE CONTAS',
    'Módulo Único: Validar necessidade de campos relacionados às prestações de contas'
  ]),

  // CONTÁBIL
  'Planejamento (Cloud)': parseTasksIntoSections([
    'SPRINT 1: CADASTROS E ESTRUTURAS',
    'Módulo Único: Composição da receita e despesa (PPA), Receitas/Despesas/Programas/Ações (PPA/LDO/LOA), Programas, Funções e Subfunções, Indicadores, Organogramas, Entidades, Atos, Recursos, Natureza da Receita, Natureza da Despesa, Cadastros Auxiliares',
    'SPRINT 2: EXECUÇÃO PPA E SOLICITAÇÕES',
    'Módulo Único: Solicitações de Despesas, Limites das Despesas da LOA, Execução de Receitas (PPA), Execução de Despesas (PPA), Execução das metas físicas, Análise do PPA',
    'SPRINT 3: DETALHAMENTO LDO E EXECUÇÃO LOA',
    'Módulo Único: Detalhamento de Receitas/Despesas (LDO), Expansão de despesas, Projeções atuariais, Resultados nominais, Riscos fiscais, Metas físicas, Transferências financeiras, Execução de Receitas/Despesas (LOA), Alterações orçamentárias, Programação financeira',
    'SPRINT 4: PRESTAÇÃO DE CONTAS',
    'Módulo Único: Validar necessidade de campos relacionados às prestações de contas'
  ]),

  'Contabilidade (Cloud)': parseTasksIntoSections([
    'SPRINT 1: PARÂMETROS E CADASTROS',
    'Módulo Único: Parâmetros Gerais, Portal da transparência, EFD-Contribuições, Plano de contas, Eventos contábeis, Regras de documentos, Contas Correntes, Componentes, Equivalentes, Processos, Organogramas, Entidade, Localizadores, Recursos, Operações, Receitas, Comprovantes, Diários, Agências bancárias, Contas bancárias, Cadastros Auxiliares',
    'SPRINT 2: RECEITA, CONTROLE E INTEGRAÇÕES',
    'Módulo Único: Arrecadações, Lançamento de receita, Devolução de receita, Alteração orçamentária da receita, Adiantamentos e diárias, Duplicatas, Contratos de fusão, Prestação de contas de consórcio, Gerenciador de integrações',
    'SPRINT 3: DESPESA E PROGRAMAÇÃO',
    'Módulo Único: Empenhos, Despesa Extra, Alterações orçamentárias da despesa, Bloqueios/Desbloqueios da despesa, Programação financeira da receita, Programação financeira da despesa, Período Financeiro (Abertura, Encerramento)',
    'SPRINT 4: ESCRITURAÇÃO E PRESTAÇÃO DE CONTAS',
    'Módulo Único: Escriturações de documentos, Conferir balancete mês a mês, Períodos da escrituração, Validar necessidade de campos relacionados às prestações de contas'
  ]),

  'Tesouraria (Cloud)': parseTasksIntoSections([
    'SPRINT 1: PARÂMETROS E IMPLANTAÇÃO',
    'Módulo Único: Parâmetros Gerais, Movimentos, Remessas bancárias, Critérios de conciliação, Parâmetros da implantação, Saldo inicial em dinheiro, Cadastros Auxiliares',
    'SPRINT 2: PROCESSOS, PAGAMENTOS E BANCÁRIOS',
    'Módulo Único: Arrecadações, Pagamentos a Pagar e Pagos, Devoluções da receita, Ajuste de recursos, Gestão Bancária (Aplicação e Configuração), Contas Bancárias, Transferências',
    'SPRINT 3: PRESTAÇÃO DE CONTAS',
    'Módulo Único: Validar necessidade de campos relacionados às prestações de contas'
  ]),

  'Convênios': parseTasksIntoSections([
    'SPRINT 1: CONVÊNIOS E EXECUÇÃO',
    'Módulo Único: Convênios Repassados, Formalização e execução',
    'SPRINT 2: PRESTAÇÃO DE CONTAS E CONCLUSÃO',
    'Módulo Único: A comprovar, em comprovação e comprovada, Concluído, Validar necessidade de campos relacionados às prestações de contas'
  ]),

  // PESSOAL
  'Folha (Cloud)': parseTasksIntoSections([
    'SPRINT 1: CADASTROS INICIAIS',
    'Módulo Único: Cadastro de Entidade, Cadastro de Grupos Funcionais, Cadastro de Organogramas',
    'SPRINT 2: ESTRUTURA DE CARGOS',
    'Módulo Único: Cadastro de Lotações Físicas, Cadastro de Atos, Cadastro de Quadro de Cargos, Cadastro de Cargos, Cadastro de Áreas de Atuação, Cadastro de Planos de Cargos e Salários, Cadastro de Níveis Salariais',
    'SPRINT 3: CONFIGURAÇÕES DA FOLHA',
    'Módulo Único: Cadastro de Manutenção de Estabelecimentos, Cadastro de Tipos de Bases',
    'SPRINT 4: EVENTOS E CÁLCULO',
    'Módulo Único: Cadastro de Eventos, Cadastro de Médias e Vantagens, Configuração de Provisão',
    'SPRINT 5: VÍNCULOS E PREVIDÊNCIA',
    'Módulo Único: Cadastro de Concurso, Cadastro de Vínculos Empregatícios, Cadastro de Planos de Previdência e Assistência, Cadastro de Tipos de Administração, Cadastro de Endereços',
    'SPRINT 6: CADASTRO DE PESSOAL',
    'Módulo Único: Cadastro de Pessoas, Cadastro de Matrículas',
    'SPRINT 7: CADASTROS AUXILIARES',
    'Módulo Único: Cadastro de Empresas, Cadastro de Agências Bancárias, Cadastro de Profissionais',
    'SPRINT 8: GESTÃO DE PERÍODOS E MOVIMENTAÇÕES',
    'Módulo Único: Períodos Aquisitivos de Férias, Períodos Aquisitivos de Décimo Terceiro, Gestão de Processos, Afastamentos, Ocorrências Disciplinares, Avisos Prévios, Movimentações de Pessoal, Lançamentos de Variáveis',
    'SPRINT 9: CONSULTAS E HISTÓRICOS',
    'Módulo Único: Consulta de Cálculo, Histórico de Reajuste Salarial, Serviços de Autônomos',
    'SPRINT 10: BASES EXTERNAS',
    'Módulo Único: Bases de Outras Empresas',
    'SPRINT 11: OBRIGAÇÕES E INTEGRAÇÕES',
    'Módulo Único: DIRF, RAIS, Integração com o Transparência, Prestação de Contas'
  ]),

  'Recursos Humanos (Cloud)': parseTasksIntoSections([
    'SPRINT 1: CADASTROS GERAIS E BENEFÍCIOS',
    'Módulo Único: Experiências Anteriores, Manutenção de averbações, Cursos, Bolsa de estudos, Formações, Cadastro de Cursos, Configuração de Planos de Saúde, Configuração de Vale Alimentação',
    'SPRINT 2: BENEFÍCIOS E CONSIGNAÇÕES',
    'Módulo Único: Cadastro de Naturezas de Diárias, Cadastro de Rotas, Cadastro de Distâncias, Configuração de Margem Consignável',
    'SPRINT 3: ADICIONAIS E LICENÇAS',
    'Módulo Único: Configuração de Adicionais, Configuração de Licença Prêmio, Cadastro de Procedimentos Médicos',
    'SPRINT 4: EMPRÉSTIMOS',
    'Módulo Único: Cadastro de Empréstimos',
    'SPRINT 5: GESTÃO DE DESPESAS E RECRUTAMENTO',
    'Módulo Único: Cadastro de Margem Consignável, Despesas de Plano de Saúde/Vale Transporte/Vale Alimentação, Recrutamento e Seleção, Comissões de Avaliações, Avaliações, Locais de Avaliação',
    'SPRINT 6: GESTÃO DE PESSOAL',
    'Módulo Único: Vínculo Empregatício, Contratos Temporários, Substituições de Funcionários, Aposentadorias e Pensões, Gestão de Recrutamento e Seleção',
    'SPRINT 7: SAÚDE OCUPACIONAL',
    'Módulo Único: Equipamentos de Proteção, Juntas Médicas, Riscos Ambientais, Formulários de Anamnese',
    'SPRINT 8: SEGURANÇA DO TRABALHO',
    'Módulo Único: CIPA, Agendas, Atestados',
    'SPRINT 9: CONTROLE DE EPIS E REGISTROS',
    'Módulo Único: Solicitação de Equipamentos de Proteção, Controle de Entrega de EPIs, Registro de Extintores, ASO',
    'SPRINT 10: MEDICINA DO TRABALHO',
    'Módulo Único: Laudos Médicos, Agendamentos, Acidentes de Trabalho, PPRA, Visitas Técnicas',
    'SPRINT 11: DESENVOLVIMENTO E PRESTAÇÃO DE CONTAS',
    'Módulo Único: Avaliações de Desempenho, Conceitos, Competências, Gestão de Avaliações de Desempenho, Solicitações de Cursos, Planejamento de Cursos, Prestação de Contas'
  ]),

  'Ponto (Cloud)': parseTasksIntoSections([
    'SPRINT 1: PARÂMETROS E JORNADAS',
    'Módulo Único: Conferir Parâmetros Gerais e do Ponto, Cadastro de Relógios, Jornadas de Trabalhos, Cadastro de Horários, Cadastro de Escalas, Cadastro de Ocorrências',
    'SPRINT 2: CONFIGURAÇÕES E LANÇAMENTOS',
    'Módulo Único: Cadastro de Funções de Relógios, Cadastro de Períodos de Apuração, Cadastro de Funções para Fórmulas, Cadastro de Tipos de Funções de Relógios, Cadastro de Lançamento de Horas, Cadastro de Permutas, Cadastro de Compensação de Horas, Cadastro de Lançamento de Audiência, Cadastro de Eventos Extraordinários, Marcações de Ponto, Prestação de Contas'
  ]),

  'eSocial': parseTasksIntoSections([
    'SPRINT 1: CORREÇÕES E ENVIOS',
    'Módulo Único: Auditoria de ações manuais, Domínios integrados, Eventos Gerados, Envios periódicos (Validar recibos), Envios iniciais e não periódicos (Validar recibos), Agenda de envios',
    'SPRINT 2: EXECUÇÃO E PRESTAÇÃO DE CONTAS',
    'Módulo Único: Verificar artefatos, Validar necessidade de campos relacionados às prestações de contas'
  ]),

  // PLATAFORMA
  'Transparência (Cloud)': parseTasksIntoSections([
    'SPRINT 1: CONFIGURAÇÃO E INTEGRAÇÃO',
    'Configurações Iniciais: Configuração da Entidade (Brasão, Dados, Contatos), Configuração de Usuários e Permissões, Personalização do Layout',
    'Integrações: Validar Script de Integração (Contábil, Folha, Compras/Licitações), Configurar agendamento de sincronização',
    'SPRINT 2: VALIDAÇÃO DE DADOS',
    'Execução Orçamentária: Validar Receitas, Validar Despesas, Validar Transferências e Repasses',
    'Pessoal e Licitações: Validar Folha de Pagamento, Validar Diárias e Passagens, Validar Licitações, Validar Contratos e Aditivos',
    'SPRINT 3: CONFORMIDADE LEGAL',
    'Lei de Acesso à Informação: Validar e-SIC, Validar Acessibilidade (VLibras, Alto Contraste), Validar Responsividade, Publicação do Link'
  ]),

  'Conecta (Cloud)': parseTasksIntoSections([
    'SPRINT 1: IDENTIDADE E ACESSO',
    'Personalização: Configurar Identidade Visual, Banner Principal, Links de Redes Sociais',
    'Controle de Acesso: Configurar Login (Gov.br ou cadastro próprio), Recuperação de Senha, Termos de Uso',
    'SPRINT 2: CARTA DE SERVIÇOS',
    'Configuração de Serviços: Cadastrar Categorias, Configurar Serviços de Link Externo, Configurar Serviços Integrados, Validar Fluxo de Solicitação',
    'Notificações: Configurar disparos de e-mail, Push Notifications, Acompanhamento de solicitações',
    'SPRINT 3: PUBLICAÇÃO',
    'Homologação Final: Validar Download do App, Validar Acesso Web, Divulgação'
  ]),

  'Documentos (Cloud)': parseTasksIntoSections([
    'SPRINT 1: PARAMETRIZAÇÃO',
    'Estrutura Organizacional: Importar/Cadastrar Organograma, Usuários e Lotações, Grupos de Permissão',
    'Classificação: Cadastrar Tipos de Documentos, Classificação Arquivística',
    'SPRINT 2: MODELOS E FLUXOS',
    'Modelos: Criar Modelos (Ofícios, Memorandos, Pareceres), Configurar Variáveis Dinâmicas',
    'Assinatura Digital: Configurar Assinatura Eletrônica, Configurar Assinatura Digital, Testar Validação',
    'SPRINT 3: OPERAÇÃO',
    'Fluxo de Trabalho: Simular Criação, Tramitação, Arquivamento, Pesquisa e Localização'
  ]),

  // ATENDIMENTO
  'Protocolo (Cloud)': parseTasksIntoSections([
    'CADASTROS BÁSICOS',
    'Módulo Único: Cadastros Básicos',
    'CONFIGURAÇÃO DE ASSUNTOS',
    'Módulo Único: Configuração de Assuntos',
    'FLUXOS DE TRABALHO',
    'Módulo Único: Fluxo de Trabalho',
    'MODELOS DE DOCUMENTOS',
    'Módulo Único: Modelos de Documentos',
    'GESTÃO DE PROCESSOS',
    'Módulo Único: Gestão de Processos',
    'RELATÓRIOS',
    'Módulo Único: Relatórios'
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