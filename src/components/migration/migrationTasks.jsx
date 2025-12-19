// Tarefas padrão de migração por produto
export const migrationTasksByProduct = {
  'livro eletronico': [
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
  'tributos': [
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
    ]}
  ],
  'procuradoria': [
    { section: 'MIGRAÇÃO: TABELAS AUXILIARES E GERAIS', tasks: [
      'Extrair Países',
      'Extrair Estados',
      'Extrair Cidades',
      'Extrair Distritos',
      'Extrair Bairros'
    ]}
  ],
  'e-nota': [
    { section: 'MIGRAÇÃO: TABELAS AUXILIARES E GERAIS', tasks: [
      'Extrair Países',
      'Extrair Estados',
      'Extrair Cidades',
      'Extrair Distritos',
      'Extrair Bairros'
    ]}
  ],
  'default': [
    { section: 'MIGRAÇÃO: TABELAS AUXILIARES E GERAIS', tasks: [
      'Extrair Países',
      'Extrair Estados',
      'Extrair Cidades',
      'Extrair Distritos',
      'Extrair Bairros',
      'Extrair Logradouros',
      'Extrair Bancos',
      'Extrair Agências'
    ]}
  ]
};

export const getDefaultTasksForProduct = (productName) => {
  const normalizedName = productName.toLowerCase().trim();
  
  // Tenta encontrar correspondência exata ou parcial
  for (const [key, tasks] of Object.entries(migrationTasksByProduct)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return tasks;
    }
  }
  
  return migrationTasksByProduct.default;
};