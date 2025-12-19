import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';

const verticalMapping = {
  'arrecadação': 'arrecadacao',
  'arrecadacao': 'arrecadacao',
  'compras': 'compras',
  'contratos': 'compras',
  'compras/contratos': 'compras',
  'contábil': 'contabil',
  'contabil': 'contabil',
  'pessoal': 'pessoal',
  'educação': 'educacao',
  'educacao': 'educacao',
  'iss': 'iss',
  'parceiros': 'parceiros',
  'plataforma': 'plataforma',
  'atendimento': 'atendimento',
  'saúde': 'saude',
  'saude': 'saude'
};

const statusMapping = {
  'planejamento': 'planejamento',
  'em andamento': 'em_andamento',
  'pausado': 'pausado',
  'concluído': 'concluido',
  'concluido': 'concluido'
};

const phaseMapping = {
  'planejamento e monitoramento': 'planejamento',
  'kick-off': 'kickoff',
  'kickoff': 'kickoff',
  'diagnóstico': 'diagnostico',
  'diagnostico': 'diagnostico',
  'diagnóstico técnico': 'diagnostico',
  'diagnostico técnico': 'diagnostico',
  'diagnostico tecnico': 'diagnostico',
  'migração de homologação': 'migracao_hml',
  'migracao de homologacao': 'migracao_hml',
  'migração de hml': 'migracao_hml',
  'migracao de hml': 'migracao_hml',
  'homologação e configuração da migração': 'homologacao_hml',
  'homologacao e configuracao da migracao': 'homologacao_hml',
  'configuração de hml': 'configuracao_hml',
  'configuracao de hml': 'configuracao_hml',
  'homologação de hml': 'homologacao_hml',
  'homologacao de hml': 'homologacao_hml',
  'migração em produção': 'migracao_producao',
  'migracao em producao': 'migracao_producao',
  'migração de produção': 'migracao_producao',
  'migracao de producao': 'migracao_producao',
  'configuração de prd': 'configuracao_producao',
  'configuracao de prd': 'configuracao_producao',
  'treinamento e simulação da operação': 'treinamento',
  'treinamento e simulacao da operacao': 'treinamento',
  'treinamento': 'treinamento',
  'configuração em produção': 'configuracao_producao',
  'configuracao em producao': 'configuracao_producao',
  'estabilização': 'estabilizacao',
  'estabilizacao': 'estabilizacao',
  'operação assistida': 'operacao_assistida',
  'operacao assistida': 'operacao_assistida'
};

const situationMapping = {
  'não iniciado': 'nao_iniciado',
  'nao iniciado': 'nao_iniciado',
  'não iniciada': 'nao_iniciado',
  'nao iniciada': 'nao_iniciado',
  'em andamento': 'em_andamento',
  'concluído': 'concluido',
  'concluido': 'concluido',
  'concluída': 'concluido',
  'concluida': 'concluido',
  'paralisado': 'atrasado',
  'paralisada': 'atrasado',
  'atrasado': 'atrasado',
  'atrasada': 'atrasado'
};

export default function ExcelImporter({ open, onOpenChange, onSuccess }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const findColumn = (headers, possibleNames) => {
    for (const name of possibleNames) {
      const header = headers.find(h => h && h.toLowerCase().trim() === name.toLowerCase().trim());
      if (header) return header;
    }
    return null;
  };

  const excelDateToJSDate = (excelDate) => {
    if (!excelDate) return null;
    if (typeof excelDate !== 'number') {
      if (typeof excelDate === 'string' && excelDate.match(/^\d{4}-\d{2}-\d{2}$/)) return excelDate;
      return null;
    }
    const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
  };

  const normalizeVertical = (vertical) => {
    if (!vertical) return null;
    const normalized = vertical.toLowerCase().trim();
    return verticalMapping[normalized] || null;
  };

  const normalizeStatus = (status) => {
    if (!status) return 'planejamento';
    const normalized = status.toLowerCase().trim();
    return statusMapping[normalized] || 'planejamento';
  };

  const normalizePhase = (phase) => {
    if (!phase) return 'planejamento';
    const normalized = phase.toLowerCase().trim();
    return phaseMapping[normalized] || 'planejamento';
  };

  const processProjectSheet = (workbook) => {
    const sheet = workbook.Sheets['Dados Gerais'];
    if (!sheet) return null;

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const data = {};
    rows.forEach(row => {
      if (row && row.length >= 2 && row[0] && row[1]) {
        data[row[0].toString().trim().toLowerCase()] = row[1];
      }
    });

    return {
      name: data['nome do projeto'] || 'Projeto Importado',
      manager: data['gerente do projeto'] || '',
      coordinator: data['coordenador técnico'] || data['coordenador tecnico'] || data['coordenador'] || '',
      portfolio_manager: data['gerente do portfólio'] || data['gerente do portifolio'] || data['gerente de portfólio'] || data['gerente de portifolio'] || '',
      implementation_value: parseFloat(data['implantação'] || data['implantacao'] || 0),
      recurring_value: parseFloat(data['inclusão'] || data['inclusao'] || 0),
      budget: parseFloat(data['orçamento do projeto'] || data['orcamento do projeto'] || 0),
      deadline: excelDateToJSDate(data['prazo final']),
      contract_link: data['contrato'] || '',
      status: normalizeStatus(data['status'])
    };
  };

const processTeamSheet = (workbook) => {
    const sheet = workbook.Sheets['Equipe do projeto'];
    if (!sheet) return [];

    const data = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
    console.log('Dados brutos da equipe:', data);
    
    if (data.length === 0) return [];

    // Get all headers including __EMPTY ones for debugging
    const allHeaders = Object.keys(data[0]);
    console.log('Todos os headers da equipe:', allHeaders);
    
    const headers = allHeaders.filter(h => !h.startsWith('__EMPTY'));
    console.log('Headers da equipe (filtrados):', headers);
    
    const nameCol = findColumn(allHeaders, ['Nome', 'Membro da Equipe', 'Name']);
    const verticalCol = findColumn(allHeaders, ['Vertial', 'Vertical', 'Área', 'Area']);
    const respCol = findColumn(allHeaders, ['Responsabilidade', 'Função', 'Papel', 'Funcao']);
    const emailCol = findColumn(allHeaders, ['Email', 'E-mail']);
    const phoneCol = findColumn(allHeaders, ['Telefone', 'Fone', 'Celular']);

    console.log('Colunas mapeadas - Nome:', nameCol, 'Vertical:', verticalCol, 'Resp:', respCol);

    // Remove duplicatas e linhas inválidas
    const seen = new Set();
    const members = data
      .map((row, index) => {
        const name = row[nameCol] ? String(row[nameCol]).trim() : '';
        const vertical = row[verticalCol] ? String(row[verticalCol]).trim() : '';
        const role = row[respCol] ? String(row[respCol]).trim() : '';
        const email = row[emailCol] ? String(row[emailCol]).trim() : '';
        const phone = row[phoneCol] ? String(row[phoneCol]).trim() : '';
        
        console.log(`Linha ${index}:`, { name, vertical, role, normalizedVertical: normalizeVertical(vertical) });
        
        return {
          name,
          vertical: normalizeVertical(vertical),
          role,
          email,
          phone
        };
      })
      .filter(m => {
        // Ignora se não tem nome
        if (!m.name) {
          console.log('Ignorando por falta de nome:', m);
          return false;
        }
        
        // Ignora se não tem vertical
        if (!m.vertical) {
          console.log('Ignorando por falta de vertical válida:', m);
          return false;
        }
        
        // Ignora se o nome é muito curto (provavelmente lixo)
        if (m.name.length < 2) {
          console.log('Ignorando nome muito curto:', m.name);
          return false;
        }
        
        // Remove duplicatas exatas
        const key = `${m.name}_${m.vertical}_${m.role}`.toLowerCase().trim();
        if (seen.has(key)) {
          console.log('Duplicata ignorada:', m.name);
          return false;
        }
        
        seen.add(key);
        return true;
      });

    console.log('Membros processados (final):', members);
    return members;
  };

  const inferCommunicationLevel = (role) => {
    if (!role) return 'medio';
    const roleLower = role.toLowerCase();

    // Alto: Cargos de gestão e diretoria
    if (roleLower.includes('gestor') || roleLower.includes('diretor') || 
        roleLower.includes('gerente') || roleLower.includes('coordenador') ||
        roleLower.includes('superintendente') || roleLower.includes('secretário') ||
        roleLower.includes('secretario') || roleLower.includes('chefe')) {
      return 'alto';
    }

    // Baixo: Cargos operacionais
    if (roleLower.includes('assistente') || roleLower.includes('auxiliar') ||
        roleLower.includes('estagiário') || roleLower.includes('estagiario') ||
        roleLower.includes('operador')) {
      return 'baixo';
    }

    // Médio: Analistas, técnicos e demais
    return 'medio';
  };

  const processStakeholderSheet = (workbook) => {
    const sheet = workbook.Sheets['Dados Cliente'];
    if (!sheet) return [];

    const data = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
    if (data.length === 0) return [];

    const allHeaders = Object.keys(data[0]);
    const nomeCol = findColumn(allHeaders, ['Nome', 'Contato', 'Name']);
    const cargoCol = findColumn(allHeaders, ['Cargo', 'Atuação', 'Papel', 'Função', 'Funcao']);
    const telefoneCol = findColumn(allHeaders, ['Telefone', 'Fone', 'Celular', 'Phone']);
    const emailCol = findColumn(allHeaders, ['Email', 'E-mail']);

    return data.map(row => {
      const name = row[nomeCol] ? String(row[nomeCol]).trim() : '';
      const role = row[cargoCol] ? String(row[cargoCol]).trim() : '';
      const phone = row[telefoneCol] ? String(row[telefoneCol]).trim() : '';
      const email = row[emailCol] ? String(row[emailCol]).trim() : '';

      if (!name || name.length < 2) return null;

      return {
        name,
        role,
        email,
        phone,
        communication_level: inferCommunicationLevel(role),
        communication_routine: ''
      };
    }).filter(s => s !== null);
  };

const processProductsSheet = (workbook) => {
    const sheet = workbook.Sheets['Produto Contratado'];
    if (!sheet) {
      console.log('❌ Aba Produto Contratado não encontrada');
      return [];
    }

    const data = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
    console.log('📊 Dados brutos da aba Produto Contratado:', data.length, 'linhas');

    if (data.length === 0) return [];

    const allHeaders = Object.keys(data[0]);
    console.log('📋 Headers encontrados:', allHeaders);

    const verticalCol = findColumn(allHeaders, ['Vertical', 'Vertial', 'Área', 'Area']);
    const nameCol = findColumn(allHeaders, ['Produto', 'Nome', 'Produtos', 'Product']);
    const entityCol = findColumn(allHeaders, ['Entidade', 'Órgão', 'Orgao', 'Entity', 'Cliente']);
    const ticketCol = findColumn(allHeaders, ['Chamado', 'Ticket', 'Número', 'Numero']);

    console.log('🔍 Mapeamento de colunas:', { verticalCol, nameCol, entityCol, ticketCol });

    // Remove duplicatas
    const seen = new Set();
    const products = data.map((row, index) => {
      const rawName = row[nameCol] ? String(row[nameCol]).trim() : '';
      const rawVertical = row[verticalCol] ? String(row[verticalCol]).trim() : '';
      const entity = row[entityCol] ? String(row[entityCol]).trim() : '';
      const ticket = row[ticketCol] ? String(row[ticketCol]).trim() : '';

      // Valida se tem dados mínimos
      if (!rawName || rawName.length < 2) {
        console.log(`⏭️  Linha ${index + 2}: Ignorada - nome inválido`);
        return null;
      }

      if (!rawVertical || rawVertical.length < 2) {
        console.log(`⏭️  Linha ${index + 2}: Ignorada - vertical inválida`);
        return null;
      }

      // Normaliza a vertical (aceita qualquer valor, remove acentos)
      const normalizedVertical = normalizeVertical(rawVertical) || rawVertical.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_');

      // Remove duplicatas exatas
      const key = `${normalizedVertical}_${rawName}_${entity}`.toLowerCase();
      if (seen.has(key)) {
        console.log(`⏭️  Linha ${index + 2}: Duplicata ignorada - ${rawName}`);
        return null;
      }
      seen.add(key);

      console.log(`✅ Linha ${index + 2}: ${rawName} (${normalizedVertical})`);

      return {
        name: rawName,
        vertical: normalizedVertical,
        entity,
        ticket_number: ticket,
        status: 'pendente',
        priority: 'media'
      };
    }).filter(p => p !== null);

    console.log(`✅ Total de produtos processados: ${products.length}`);
    return products;
  };

  const processTimelineSheet = (workbook) => {
    const allEvents = [];
    const sheetNames = workbook.SheetNames;
    console.log('📋 Todas as abas do Excel:', sheetNames);

    const cronogramaSheets = sheetNames.filter(name => name.startsWith('Cronograma -'));
    console.log(`📊 Abas de cronograma encontradas (${cronogramaSheets.length}):`, cronogramaSheets);

    if (cronogramaSheets.length === 0) {
      console.log('⚠️  Nenhuma aba "Cronograma - *" encontrada');
      return [];
    }

    let globalOrder = 0;

    cronogramaSheets.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

      console.log(`\n🔍 Processando ${sheetName}:`, data.length, 'linhas');

      if (data.length === 0) return;

      const headers = Object.keys(data[0]);

      const titleCol = findColumn(headers, ['Etapa', 'Título', 'Titulo', 'Fase', 'Atividade']);
      const startCol = findColumn(headers, ['Data Início', 'Data Inicio', 'Início', 'Inicio']);
      const endCol = findColumn(headers, ['Data Fim', 'Fim', 'Término', 'Termino']);
      const statusCol = findColumn(headers, ['Situação', 'Situacao', 'Status', 'Estado']);

      console.log('📌 Colunas:', { titleCol, startCol, endCol, statusCol });

      const vertical = sheetName.replace('Cronograma - ', '').trim();
      const normalizedVertical = normalizeVertical(vertical);

      console.log(`📍 Vertical: "${vertical}" → "${normalizedVertical}"`);

      const events = data.map((row, index) => {
        const title = row[titleCol] ? String(row[titleCol]).trim() : '';
        if (!title || title.length < 2) {
          console.log(`⏭️  Linha ${index + 2}: Ignorada - título vazio`);
          return null;
        }

        const rawSituation = row[statusCol] ? String(row[statusCol]).trim() : '';
        const normalizedSituation = rawSituation.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const mappedStatus = situationMapping[normalizedSituation] || 'nao_iniciado';

        const startDate = excelDateToJSDate(row[startCol]);
        const endDate = excelDateToJSDate(row[endCol]);

        // Calcula progresso baseado em status e datas
        let progress = 0;
        if (mappedStatus === 'concluido') {
          progress = 100;
        } else if (mappedStatus === 'nao_iniciado') {
          progress = 0;
        } else if (mappedStatus === 'em_andamento' && startDate && endDate) {
          const today = new Date();
          const start = new Date(startDate);
          const end = new Date(endDate);

          if (today <= start) {
            progress = 0;
          } else if (today >= end) {
            progress = 90; // 90% se está em andamento e passou do prazo
          } else {
            const totalDays = (end - start) / (1000 * 60 * 60 * 24);
            const daysPassed = (today - start) / (1000 * 60 * 60 * 24);
            progress = Math.min(Math.round((daysPassed / totalDays) * 100), 90);
          }
        } else if (mappedStatus === 'atrasado') {
          progress = 50; // Atrasado = 50%
        }

        console.log(`✅ Linha ${index + 2}: ${title} | ${rawSituation} → ${mappedStatus} | ${progress}%`);

        return {
          title,
          phase: normalizePhase(title),
          start_date: startDate,
          end_date: endDate,
          status: mappedStatus,
          progress,
          vertical: normalizedVertical,
          order: globalOrder++
        };
      }).filter(e => e !== null);

      allEvents.push(...events);
    });

    console.log(`\n✅ Total de ${allEvents.length} etapas processadas do cronograma`);
    return allEvents;
  };

  const processRisksSheet = (workbook) => {
    const sheet = workbook.Sheets['Riscos'];
    if (!sheet) return [];

    const data = XLSX.utils.sheet_to_json(sheet);
    if (data.length === 0) return [];

    const headers = Object.keys(data[0]);
    const titleCol = findColumn(headers, ['Risco', 'Descrição', 'Titulo']);
    const categoryCol = findColumn(headers, ['Categoria', 'Tipo']);
    const probCol = findColumn(headers, ['Probabilidade']);
    const impactCol = findColumn(headers, ['Impacto']);
    const mitigationCol = findColumn(headers, ['Mitigação', 'Mitigacao', 'Plano']);

    const catMapping = {
      'técnico': 'tecnico', 'tecnico': 'tecnico',
      'cronograma': 'cronograma',
      'recurso': 'recurso',
      'cliente': 'cliente',
      'externo': 'externo'
    };

    const levelMapping = {
      'baixa': 'baixa', 'baixo': 'baixo',
      'média': 'media', 'media': 'media', 'médio': 'medio', 'medio': 'medio',
      'alta': 'alta', 'alto': 'alto'
    };

    return data.map(row => ({
      title: row[titleCol] || 'Risco',
      category: catMapping[row[categoryCol]?.toLowerCase()] || 'tecnico',
      probability: levelMapping[row[probCol]?.toLowerCase()] || 'media',
      impact: levelMapping[row[impactCol]?.toLowerCase()] || 'medio',
      mitigation: row[mitigationCol] || '',
      status: 'identificado'
    })).filter(r => r.title !== 'Risco');
  };

  const processTravelsSheet = (workbook) => {
    const sheet = workbook.Sheets['Viagens'];
    if (!sheet) return [];

    const data = XLSX.utils.sheet_to_json(sheet);
    if (data.length === 0) return [];

    const headers = Object.keys(data[0]);
    const titleCol = findColumn(headers, ['Objetivo', 'Título', 'Titulo']);
    const startCol = findColumn(headers, ['Data Início', 'Data Inicio', 'Início']);
    const endCol = findColumn(headers, ['Data Fim', 'Fim']);
    const locationCol = findColumn(headers, ['Local', 'Destino']);

    return data.map(row => ({
      title: row[titleCol] || 'Viagem',
      start_date: excelDateToJSDate(row[startCol]),
      end_date: excelDateToJSDate(row[endCol]),
      location: row[locationCol] || '',
      status: 'planejada'
    })).filter(t => t.title !== 'Viagem' && t.start_date);
  };

  const processTrainingsSheet = (workbook) => {
    const sheet = workbook.Sheets['Treinamentos'];
    if (!sheet) return [];

    const data = XLSX.utils.sheet_to_json(sheet);
    if (data.length === 0) return [];

    const headers = Object.keys(data[0]);
    const titleCol = findColumn(headers, ['Treinamento', 'Título', 'Titulo']);
    const productCol = findColumn(headers, ['Produto']);
    const dateCol = findColumn(headers, ['Data']);

    return data.map(row => ({
      title: row[titleCol] || 'Treinamento',
      product: row[productCol] || '',
      date: excelDateToJSDate(row[dateCol]),
      location: 'remoto',
      status: 'agendado'
    })).filter(t => t.title !== 'Treinamento');
  };

  const processDocumentsSheet = (workbook) => {
    const sheet = workbook.Sheets['Documentos chaves'];
    if (!sheet) return [];

    const data = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
    if (data.length === 0) return [];

    const headers = Object.keys(data[0]);
    const titleCol = findColumn(headers, ['Documento', 'Título', 'Titulo', 'Nome']);
    const situationCol = findColumn(headers, ['Situação', 'Situacao', 'Status']);
    const linkCol = findColumn(headers, ['Link', 'URL']);

    return data.map((row, index) => {
      const title = row[titleCol] ? String(row[titleCol]).trim() : '';
      if (!title || title.length < 2) return null;

      const situation = row[situationCol] ? String(row[situationCol]).toLowerCase().trim() : 'em aberto';
      const completed = situation !== 'em aberto';
      const link = row[linkCol] ? String(row[linkCol]).trim() : '';

      return {
        title,
        link,
        completed,
        order: index
      };
    }).filter(d => d !== null);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      setSuccess(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setProgress(0);
    setError('');
    setSuccess(false);

    try {
      setStatus('Lendo arquivo...');
      setProgress(5);

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      setStatus('Processando dados do projeto...');
      setProgress(10);

      // 1. Create Project
      const projectData = processProjectSheet(workbook);
      let project = null;
      if (projectData) {
        project = await base44.entities.Project.create(projectData);
      }
      setProgress(20);

      if (!project) {
        throw new Error('Não foi possível criar o projeto');
      }

      // 2. Import Team Members
      setStatus('Importando equipe...');
      const teamMembers = processTeamSheet(workbook);
      console.log('Criando membros da equipe:', teamMembers.length);
      
      // Add manager(s), coordinator and portfolio manager to team if not already there
      const additionalMembers = [];
      
      if (projectData.manager) {
        const managers = projectData.manager.split(/[,/]/).map(m => m.trim()).filter(m => m);
        managers.forEach(managerName => {
          if (!teamMembers.some(m => m.name.toLowerCase() === managerName.toLowerCase())) {
            additionalMembers.push({
              name: managerName,
              role: 'Gerente do Projeto',
              vertical: 'plataforma'
            });
          }
        });
      }
      
      if (projectData.coordinator) {
        if (!teamMembers.some(m => m.name.toLowerCase() === projectData.coordinator.toLowerCase())) {
          additionalMembers.push({
            name: projectData.coordinator,
            role: 'Coordenador Técnico',
            vertical: 'plataforma'
          });
        }
      }
      
      if (projectData.portfolio_manager) {
        if (!teamMembers.some(m => m.name.toLowerCase() === projectData.portfolio_manager.toLowerCase())) {
          additionalMembers.push({
            name: projectData.portfolio_manager,
            role: 'Gerente do Portfólio',
            vertical: 'plataforma'
          });
        }
      }
      
      const allTeamMembers = [...teamMembers, ...additionalMembers];
      
      if (allTeamMembers.length > 0) {
        const created = await base44.entities.TeamMember.bulkCreate(
          allTeamMembers.map(m => ({ ...m, project_id: project.id }))
        );
        console.log('Membros criados:', created);
      }
      setProgress(35);

      // 3. Import Stakeholders
      setStatus('Importando stakeholders...');
      const stakeholders = processStakeholderSheet(workbook);
      if (stakeholders.length > 0) {
        await base44.entities.Stakeholder.bulkCreate(
          stakeholders.map(s => ({ ...s, project_id: project.id }))
        );
      }
      setProgress(50);

      // 4. Import Products
      setStatus('Importando produtos...');
      const products = processProductsSheet(workbook);
      console.log('Criando produtos:', products.length);
      
      // Remove duplicatas de produtos também
      const uniqueProducts = [];
      const productSeen = new Set();
      products.forEach(p => {
        const key = `${p.name}_${p.vertical}`.toLowerCase();
        if (!productSeen.has(key)) {
          productSeen.add(key);
          uniqueProducts.push(p);
        }
      });
      console.log('Produtos únicos:', uniqueProducts.length);
      
      if (uniqueProducts.length > 0) {
        const created = await base44.entities.Product.bulkCreate(
          uniqueProducts.map(p => ({ ...p, project_id: project.id }))
        );
        console.log('Produtos criados:', created);
      }
      setProgress(60);

      // 5. Import Timeline
      setStatus('Importando cronograma...');
      const timeline = processTimelineSheet(workbook);
      if (timeline.length > 0) {
        await base44.entities.TimelineEvent.bulkCreate(
          timeline.map(e => ({ ...e, project_id: project.id }))
        );
      }
      setProgress(70);

      // 6. Import Risks
      setStatus('Importando riscos...');
      const risks = processRisksSheet(workbook);
      if (risks.length > 0) {
        await base44.entities.Risk.bulkCreate(
          risks.map(r => ({ ...r, project_id: project.id }))
        );
      }
      setProgress(80);

      // 7. Import Travels
      setStatus('Importando viagens...');
      const travels = processTravelsSheet(workbook);
      if (travels.length > 0) {
        await base44.entities.Travel.bulkCreate(
          travels.map(t => ({ ...t, project_id: project.id }))
        );
      }
      setProgress(90);

      // 8. Import Trainings
      setStatus('Importando treinamentos...');
      const trainings = processTrainingsSheet(workbook);
      if (trainings.length > 0) {
        await base44.entities.Training.bulkCreate(
          trainings.map(t => ({ ...t, project_id: project.id }))
        );
      }
      setProgress(95);

      // 9. Import Documents
      setStatus('Importando documentos chave...');
      const documents = processDocumentsSheet(workbook);
      if (documents.length > 0) {
        await base44.entities.ProjectDocument.bulkCreate(
          documents.map(d => ({ ...d, project_id: project.id }))
        );
      }
      setProgress(100);

      setStatus('Importação concluída com sucesso!');
      setSuccess(true);

      // Wait a bit and close
      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 2000);

    } catch (err) {
      console.error('Erro ao importar:', err);
      setError(err.message || 'Erro ao processar o arquivo. Verifique o formato e tente novamente.');
      setProgress(0);
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setProgress(0);
    setStatus('');
    setError('');
    setSuccess(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            Importar Projeto do Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!file && !importing && (
            <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="excel-file-input"
              />
              <label htmlFor="excel-file-input" className="cursor-pointer">
                <Upload className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                <p className="text-white font-medium mb-1">Clique para selecionar o arquivo</p>
                <p className="text-sm text-slate-400">Formatos aceitos: .xlsx, .xls</p>
              </label>
            </div>
          )}

          {file && !importing && !success && (
            <Alert className="bg-slate-700 border-slate-600">
              <FileSpreadsheet className="w-4 h-4 text-blue-400" />
              <AlertDescription className="text-white">
                Arquivo selecionado: <span className="font-medium">{file.name}</span>
              </AlertDescription>
            </Alert>
          )}

          {importing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{status}</span>
                <span className="text-white font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-center gap-2 text-blue-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Importando dados...</span>
              </div>
            </div>
          )}

          {success && (
            <Alert className="bg-green-500/10 border-green-500/30">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <AlertDescription className="text-green-400">
                {status}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="bg-red-500/10 border-red-500/30">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <AlertDescription className="text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-slate-700/30 rounded-lg p-4 text-sm text-slate-400 space-y-2">
            <p className="font-medium text-white mb-2">Abas esperadas no Excel:</p>
            <ul className="space-y-1 text-xs">
              <li>• <span className="text-slate-300">Dados Gerais</span> - Informações do projeto</li>
              <li>• <span className="text-slate-300">Equipe do projeto</span> - Membros da equipe</li>
              <li>• <span className="text-slate-300">Dados Cliente</span> - Stakeholders</li>
              <li>• <span className="text-slate-300">Produto Contratado</span> - Produtos contratados</li>
              <li>• <span className="text-slate-300">Cronograma - *</span> - Etapas do projeto (uma aba por vertical)</li>
              <li>• <span className="text-slate-300">Riscos</span> - Riscos identificados</li>
              <li>• <span className="text-slate-300">Viagens</span> - Viagens planejadas</li>
              <li>• <span className="text-slate-300">Treinamentos</span> - Treinamentos agendados</li>
              <li>• <span className="text-slate-300">Documentos chaves</span> - Documentos do projeto</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose} 
            disabled={importing}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!file || importing || success}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Importar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}