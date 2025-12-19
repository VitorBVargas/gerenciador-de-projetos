// Tarefas padrão de migração por produto baseadas no script original
export const migrationTasksByProduct = {
  'Livro Eletrônico': [
    { section: 'ETAPA 1: CONFIGURAÇÕES E PARÂMETROS', tasks: [
      'Extrair Competências',
      'Extrair Indexadores',
      'Extrair Lista de Serviços',
      'Extrair CNAE',
      'Extrair Plano de Conta',
      'Extrair Entidades Especiais'
    ]},
    { section: 'ETAPA 2: CADASTRO DE PESSOAS E EMPRESAS', tasks: [
      'Extrair Contadores',
      'Extrair Contribuintes',
      'Extrair Cadastro de Tomadores',
      'Extrair Cadastro de Intermediadores'
    ]},
    { section: 'ETAPA 3: DADOS DE MOVIMENTAÇÃO', tasks: [
      'Extrair Contribuintes Serviços / Movimento',
      'Extrair Movimento Optante Simples',
      'Extrair Simples Nacional',
      'Extrair Notas Fiscais',
      'Extrair Declarações',
      'Extrair Notas Avulsas'
    ]},
    { section: 'ETAPA 4: INCENTIVOS FISCAIS', tasks: [
      'Extrair Incentivos Fiscais',
      'Extrair Contribuinte Incentivos Fiscais'
    ]}
  ],

  'Tributos (Cloud)': [
    { section: 'MIGRAÇÃO: TABELAS AUXILIARES E GERAIS', tasks: [
      'Extrair Países',
      'Extrair Estados',
      'Extrair Cidades',
      'Extrair Distritos',
      'Extrair Bairros',
      'Extrair Logradouros',
      'Extrair Bancos',
      'Extrair Agências',
      'Extrair Entidades Especiais',
      'Extrair Plano de Contas',
      'Extrair Indexadores',
      'Extrair CNAE'
    ]},
    { section: 'MIGRAÇÃO DE TRIBUTOS', tasks: [
      'Extrair Classificação do Bem',
      'Extrair Tipos de Certidões',
      'Extrair Origem do Débito',
      'Extrair Situação da Divida',
      'Extrair Tipo de Pagamento',
      'Extrair Contribuintes',
      'Extrair Bens Móveis',
      'Extrair Bens Imóveis',
      'Extrair Dívida',
      'Extrair Receita',
      'Extrair Parcelamento'
    ]}
  ],

  'Procuradoria (Cloud)': [
    { section: 'MIGRAÇÃO: TABELAS AUXILIARES E GERAIS', tasks: [
      'Extrair Países',
      'Extrair Estados',
      'Extrair Cidades',
      'Extrair Distritos',
      'Extrair Bairros'
    ]},
    { section: 'MIGRAÇÃO DE PROCURADORIA', tasks: [
      'Extrair Tipos de Ações',
      'Extrair Classificação de Ações',
      'Extrair Fases de Ações',
      'Extrair Juízos e Varas',
      'Extrair Advogados',
      'Extrair Cartório',
      'Extrair Partes da Ação',
      'Extrair Processos',
      'Extrair Tramitações'
    ]}
  ],

  'e-Nota (Cloud)': [
    { section: 'MIGRAÇÃO: TABELAS AUXILIARES E GERAIS', tasks: [
      'Extrair Países',
      'Extrair Estados',
      'Extrair Cidades',
      'Extrair Distritos',
      'Extrair Bairros'
    ]},
    { section: 'MIGRAÇÃO DE E-NOTA', tasks: [
      'Extrair Lista de Serviços',
      'Extrair Tomadores',
      'Extrair Contribuintes',
      'Extrair RPS',
      'Extrair Notas Emitidas',
      'Extrair Notas Tomadas'
    ]}
  ],

  'Educação Básica (Cloud)': [
    { section: 'MIGRAÇÃO: TABELAS AUXILIARES E GERAIS', tasks: [
      'Extrair Países',
      'Extrair Estados',
      'Extrair Cidades',
      'Extrair Distritos',
      'Extrair Bairros'
    ]},
    { section: 'MIGRAÇÃO DE EDUCAÇÃO', tasks: [
      'Extrair Escolas',
      'Extrair Níveis de Ensino',
      'Extrair Turmas',
      'Extrair Alunos',
      'Extrair Professores',
      'Extrair Matrícula',
      'Extrair Frequência',
      'Extrair Notas'
    ]}
  ],

  'Compras (Cloud)': [
    { section: 'MIGRAÇÃO: TABELAS AUXILIARES E GERAIS', tasks: [
      'Extrair Países',
      'Extrair Estados',
      'Extrair Cidades',
      'Extrair Distritos',
      'Extrair Bairros',
      'Extrair Logradouros',
      'Extrair Bancos',
      'Extrair Agências'
    ]},
    { section: 'MIGRAÇÃO DE COMPRAS', tasks: [
      'Extrair Fornecedores',
      'Extrair Produtos e Serviços',
      'Extrair Modalidades',
      'Extrair Processos de Compras',
      'Extrair Contratos',
      'Extrair Empenhos',
      'Extrair Liquidações',
      'Extrair Pagamentos'
    ]}
  ],

  'Contábil (Cloud)': [
    { section: 'MIGRAÇÃO: TABELAS AUXILIARES E GERAIS', tasks: [
      'Extrair Países',
      'Extrair Estados',
      'Extrair Cidades',
      'Extrair Distritos',
      'Extrair Bairros',
      'Extrair Logradouros',
      'Extrair Bancos',
      'Extrair Agências'
    ]},
    { section: 'MIGRAÇÃO CONTÁBIL', tasks: [
      'Extrair Plano de Contas',
      'Extrair Fornecedores',
      'Extrair Fontes de Recursos',
      'Extrair Empenhos',
      'Extrair Liquidações',
      'Extrair Pagamentos',
      'Extrair Lançamentos Contábeis',
      'Extrair Restos a Pagar'
    ]}
  ],

  'Pessoal (Cloud)': [
    { section: 'MIGRAÇÃO: TABELAS AUXILIARES E GERAIS', tasks: [
      'Extrair Países',
      'Extrair Estados',
      'Extrair Cidades',
      'Extrair Distritos',
      'Extrair Bairros',
      'Extrair Logradouros',
      'Extrair Bancos',
      'Extrair Agências'
    ]},
    { section: 'MIGRAÇÃO DE PESSOAL', tasks: [
      'Extrair Órgãos',
      'Extrair Cargos',
      'Extrair Eventos',
      'Extrair Lotações',
      'Extrair Servidores',
      'Extrair Vínculos',
      'Extrair Fichas Financeiras',
      'Extrair Folhas de Pagamento',
      'Extrair Férias',
      'Extrair 13º Salário',
      'Extrair Rescisões'
    ]}
  ]
};

export const getDefaultTasksForProduct = (productName) => {
  if (!productName) return migrationTasksByProduct['Tributos (Cloud)'];
  
  const normalizedName = productName.trim();
  
  // Busca exata primeiro
  if (migrationTasksByProduct[normalizedName]) {
    return migrationTasksByProduct[normalizedName];
  }
  
  // Busca parcial (case-insensitive)
  const lowerName = normalizedName.toLowerCase();
  for (const [key, tasks] of Object.entries(migrationTasksByProduct)) {
    if (key.toLowerCase().includes(lowerName) || lowerName.includes(key.toLowerCase())) {
      return tasks;
    }
  }
  
  // Fallback para Tributos
  return migrationTasksByProduct['Tributos (Cloud)'];
};