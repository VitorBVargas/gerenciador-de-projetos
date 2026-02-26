import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, AlertCircle, Loader2, Plus } from "lucide-react";
import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';
import ProjectRegistrationFlow from './ProjectRegistrationFlow';

// 12 etapas padrão — chave snake_case é a phase key, label é o título
const STANDARD_PHASES = [
  { key: 'planejamento_contrato', title: 'Planejamento/Contrato' },
  { key: 'kickoff', title: 'Kickoff' },
  { key: 'diagnostico', title: 'Diagnóstico' },
  { key: 'onboarding_cliente', title: 'Onboarding Cliente' },
  { key: 'configuracao_migracao_hml', title: 'Configuração/Migração de Homologação' },
  { key: 'homologacao_base', title: 'Homologação da Base' },
  { key: 'migracao_prd_blackout', title: 'Migração de PRD (Blackout)' },
  { key: 'configuracao_prd', title: 'Configuração de PRD' },
  { key: 'treinamento', title: 'Treinamento' },
  { key: 'go_live', title: 'Go-Live' },
  { key: 'operacao_assistida', title: 'Operação Assistida' },
  { key: 'encerramento_bastao', title: 'Encerramento/Passagem de Bastão' },
];

const inferEntityCode = (entityName) => {
  const name = entityName.toLowerCase();
  if (name.includes('prefeitura') || name.includes('município') || name.includes('municipio')) return 'PM';
  if (name.includes('câmara') || name.includes('camara')) return 'CM';
  if (name.includes('saude') || name.includes('saúde')) return 'FMS';
  if (name.includes('educação') || name.includes('educacao') || name.includes('fundo municipal de educa')) return 'FME';
  if (name.includes('previdencia') || name.includes('previdência') || name.includes('ipas') || name.includes('instituto')) return 'IPAS';
  if (name.includes('assistencia social') || name.includes('assistência social') || name.includes('fmas')) return 'FMAS';
  if (name.includes('meio ambiente')) return 'FMA';
  if (name.includes('fundeb')) return 'FUNDEB';
  return entityName.split(' ').filter(w => w.length > 2).map(w => w[0].toUpperCase()).join('').slice(0, 4);
};

const inferVertical = (productName) => {
  const name = productName.toLowerCase();
  // Contábil
  if (name.includes('contabilidade') || name.includes('tesouraria') || name.includes('orçamento') || name.includes('orcamento') ||
      name.includes('convênios') || name.includes('convenios') || name.includes('prestação de contas') || name.includes('prestacao de contas') ||
      name.includes('controladoria') || name.includes('planejamento') || name.includes('controle de caixa')) return 'contabil';
  // Compras
  if (name.includes('compras') || name.includes('contratos') || name.includes('almoxarifado') ||
      name.includes('patrimônio') || name.includes('patrimonio') || name.includes('frotas') ||
      name.includes('obras') || name.includes('monitor df')) return 'compras';
  // Pessoal
  if (name.includes('folha') || name.includes('pessoal') || name.includes('recursos humanos') ||
      name.includes('esocial') || name.includes('minha folha') || name.includes('ponto') || name.includes('pontual')) return 'pessoal';
  // Arrecadação
  if (name.includes('arrecadação') || name.includes('arrecadacao') || name.includes('tributos') ||
      name.includes('iss') || name.includes('procuradoria') || name.includes('livro eletrônico') ||
      name.includes('livro eletronico') || name.includes('gestão fiscal') || name.includes('gestao fiscal') ||
      name.includes('e-nota') || name.includes('e - nota') || name.includes('enota') ||
      name.includes('cadastro imobiliário') || name.includes('fatura') || name.includes('cidadão web')) return 'arrecadacao';
  // Saúde
  if (name.includes('saúde') || name.includes('saude') || name.includes('social')) return 'saude';
  // Educação
  if (name.includes('educação') || name.includes('educacao') || name.includes('professores') ||
      name.includes('biblioteca') || name.includes('merenda') || name.includes('transporte escolar')) return 'educacao';
  // Atendimento
  if (name.includes('protocolo') || name.includes('atendimento') || name.includes('transparência') ||
      name.includes('transparencia') || name.includes('beth') || name.includes('gov digital') ||
      name.includes('portal') || name.includes('cidadão') || name.includes('app minha cidade')) return 'atendimento';
  // Parceiros
  if (name.includes('alvará') || name.includes('alvara') || name.includes('controle interno') ||
      name.includes('cemitério') || name.includes('cemiterio')) return 'parceiros';
  // Plataforma (Conecta, Documentos, Studio)
  return 'plataforma';
};

// Helper para pegar o valor de uma coluna aceitando múltiplos nomes possíveis
const getCol = (row, ...keys) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== '') return String(row[key]).trim();
  }
  return '';
};

// Converte valor Excel de data (número serial ou string) para string 'yyyy-MM-dd'
const parseExcelDate = (val) => {
  if (!val) return null;
  if (typeof val === 'number') {
    // número serial do Excel
    const date = XLSX.SSF.parse_date_code(val);
    if (date) {
      const y = date.y;
      const m = String(date.m).padStart(2, '0');
      const d = String(date.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  const str = String(val).trim();
  // formato 'yyyy-mm-dd HH:MM:SS' ou 'yyyy-mm-dd'
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  // formato 'dd/mm/yyyy'
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  return null;
};

const parseCrmData = (workbook) => {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
  if (rows.length === 0) throw new Error('Planilha vazia');

  const entityProductMap = {};
  const entityNames = {};

  rows.forEach(row => {
    // Aceita tanto nomes antigos quanto novos
    const entityFull = getCol(row, 'Entidade', 'Nome da conta');
    const productName = getCol(row, 'Produto', 'Descrição', 'Descricao');
    const chamado = getCol(row, 'Chamado', 'Código da Integração', 'Codigo da Integração', 'Codigo da Integracao');
    const tipo = getCol(row, 'Tipo').toLowerCase();
    const rawDate = row['Data prevista fechamento'] || row['Data Prevista Fechamento'] || '';

    // Parse valor
    let valorStr = String(row['Valor'] || '0').replace(/R\$\s*/g, '').trim();
    let valor = 0;
    if (valorStr && valorStr !== '0') {
      if (valorStr.includes(',') && valorStr.includes('.')) {
        const lastCommaIdx = valorStr.lastIndexOf(',');
        const lastDotIdx = valorStr.lastIndexOf('.');
        if (lastCommaIdx > lastDotIdx) {
          valorStr = valorStr.replace(/\./g, '').replace(',', '.');
        } else {
          valorStr = valorStr.replace(/,/g, '');
        }
      } else if (valorStr.includes(',')) {
        valorStr = valorStr.replace(',', '.');
      }
      valor = parseFloat(valorStr) || 0;
    }

    if (!entityFull || !productName) return;

    const entityCode = inferEntityCode(entityFull);
    entityNames[entityCode] = entityFull;

    if (!entityProductMap[entityCode]) entityProductMap[entityCode] = {};
    if (!entityProductMap[entityCode][productName]) {
      entityProductMap[entityCode][productName] = { impl: 0, incl: 0, chamado: '', operacao_assistida_end: null };
    }

    const isCrmTicket = chamado.toUpperCase().startsWith('BTHSC');
    const parsedDate = parseExcelDate(rawDate);

    if (tipo.includes('implantação') || tipo.includes('implantacao')) {
      entityProductMap[entityCode][productName].impl += valor;
      if (isCrmTicket) entityProductMap[entityCode][productName].chamado = chamado;
      if (parsedDate) entityProductMap[entityCode][productName].operacao_assistida_end = parsedDate;
    } else if (tipo.includes('inclusão') || tipo.includes('inclusao')) {
      entityProductMap[entityCode][productName].incl += valor;
    }
  });

  return { entityProductMap, entityNames };
};

export default function CrmImporter({ open, onOpenChange }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [flowOpen, setFlowOpen] = useState(false);
  const [parsedData, setParsedData] = useState(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  const handleStart = async () => {
    if (!file) return;
    setError('');
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const { entityProductMap, entityNames } = parseCrmData(workbook);
      const entities = Object.keys(entityProductMap);
      if (entities.length === 0) throw new Error('Nenhuma entidade encontrada na planilha');

      let totalImpl = 0;
      let totalIncl = 0;
      entities.forEach(ent => {
        Object.values(entityProductMap[ent]).forEach(p => {
          totalImpl += p.impl;
          totalIncl += p.incl;
        });
      });

      setParsedData({ entityProductMap, entityNames, totalImpl, totalIncl });
      onOpenChange(false); // fecha este modal
      setFlowOpen(true);   // abre o flow
    } catch (err) {
      setError(err.message || 'Erro ao processar o arquivo.');
    }
  };

  const handleFlowComplete = async (formData) => {
    const { entityProductMap, totalImpl, totalIncl } = parsedData;
    const entities = Object.keys(entityProductMap);

    // 1. Criar projeto
    const project = await base44.entities.Project.create({
      name: formData.projectInfo.name,
      manager: formData.projectInfo.manager,
      coordinator: formData.projectInfo.coordinator,
      portfolio_manager: formData.projectInfo.portfolio_manager,
      implementation_value: totalImpl,
      recurring_value: totalIncl,
      budget: formData.projectInfo.budget ? parseFloat(formData.projectInfo.budget) : 0,
      deadline: formData.projectInfo.deadline || null,
      contract_link: formData.projectInfo.contract_link || '',
      status: 'em_andamento',
      scheduling_type: formData.schedulingType || 'por_vertical'
    });

    // 2. Criar produtos
    const allProducts = [];
    entities.forEach(entityCode => {
      Object.entries(entityProductMap[entityCode]).forEach(([productName, vals]) => {
        allProducts.push({
          project_id: project.id,
          name: productName,
          entity: entityCode,
          vertical: inferVertical(productName),
          ticket_number: vals.chamado,
          implementation_value: vals.impl,
          inclusion_value: vals.incl,
          status: 'pendente',
          priority: 'media'
        });
      });
    });

    const createdProducts = await base44.entities.Product.bulkCreate(allProducts);

    // 3. Criar eventos de cronograma com datas dos cronogramas configurados
    const allEvents = [];
    const cronogramaByVertical = {};  // vertical -> dates
    const cronogramaByProduct = {};   // productName -> dates

    if (formData.cronogramas && formData.cronogramas.length > 0) {
      formData.cronogramas.forEach(crono => {
        // Ambos os tipos ('vertical' e 'produto') agora usam seleção por vertical
        if (crono.verticals) {
          crono.verticals.forEach(v => { cronogramaByVertical[v] = crono.dates; });
        } else if (crono.type === 'produto' && crono.productName) {
          cronogramaByProduct[crono.productName] = crono.dates;
        }
      });
    }

    // Função para corrigir datas (adiciona 1 dia para compensar timezone shift do SDK)
    const fixDateTimezoneShift = (dateStr) => {
      if (!dateStr) return null;
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      date.setDate(date.getDate() + 1);
      return date.toISOString().split('T')[0];
    };

    // Mapa de data de operação assistida por produto (vinda do CRM)
    const operacaoAssistidaByProduct = {};
    entities.forEach(entityCode => {
      Object.entries(parsedData.entityProductMap[entityCode]).forEach(([productName, vals]) => {
        if (vals.operacao_assistida_end) {
          operacaoAssistidaByProduct[productName] = vals.operacao_assistida_end;
        }
      });
    });

    createdProducts.forEach((product, pIdx) => {
       const crondates = cronogramaByProduct[product.name] || cronogramaByVertical[product.vertical] || {};
       const crmOperacaoEnd = operacaoAssistidaByProduct[product.name] || null;

       STANDARD_PHASES.forEach(({ key, title }, phaseIdx) => {
         // Para operacao_assistida, usa a data do CRM se não houver data configurada no cronograma
         let endDate = crondates[`${key}_end`] ? fixDateTimezoneShift(crondates[`${key}_end`]) : null;
         if (key === 'operacao_assistida' && !endDate && crmOperacaoEnd) {
           endDate = crmOperacaoEnd;
         }

         allEvents.push({
           project_id: project.id,
           product_id: product.id,
           title: title,
           phase: key,
           vertical: product.vertical,
           start_date: crondates[`${key}_start`] ? fixDateTimezoneShift(crondates[`${key}_start`]) : null,
           end_date: endDate,
           status: 'nao_iniciado',
           progress: 0,
           order: pIdx * 100 + phaseIdx
         });
       });
      });
     console.log('DEBUG: eventos antes de salvar:', JSON.stringify(allEvents.slice(0, 2), null, 2));
     if (allEvents.length > 0) await base44.entities.TimelineEvent.bulkCreate(allEvents);

    // Normalize vertical from PortfolioCollaborator (may have accents/capitals) to TeamMember enum
    const normalizeVertical = (v) => {
      if (!v) return 'gerenciamento';
      const map = {
        'arrecadação': 'arrecadacao', 'arrecadacao': 'arrecadacao',
        'compras': 'compras', 'compras/contratos': 'compras',
        'contábil': 'contabil', 'contabil': 'contabil',
        'pessoal': 'pessoal',
        'educação': 'educacao', 'educacao': 'educacao',
        'iss': 'iss',
        'parceiros': 'parceiros',
        'plataforma': 'plataforma',
        'saúde': 'saude', 'saude': 'saude',
        'atendimento': 'atendimento',
        'gerenciamento': 'gerenciamento',
        'suporte': 'outros', 'extensão': 'outros', 'migrador': 'outros',
      };
      return map[v.toLowerCase()] || 'outros';
    };

    // 4. Criar membros da equipe
    if (formData.team?.length > 0) {
      await base44.entities.TeamMember.bulkCreate(
        formData.team.map(c => ({
          project_id: project.id,
          name: c.name,
          role: c.role || '',
          vertical: normalizeVertical(c.vertical1),
          email: c.email || '',
          phone: c.phone || '',
          is_leader: !!c.is_leader
        }))
      );
    }

    // 5. Criar stakeholders
    if (formData.stakeholders?.length > 0) {
      await base44.entities.Stakeholder.bulkCreate(
        formData.stakeholders.map(s => ({
          project_id: project.id,
          name: s.name,
          role: s.role || '',
          email: s.email || '',
          phone: s.phone || '',
          vertical: s.vertical || 'outros',
        }))
      );
    }

    // 6. Criar riscos
    if (formData.risks?.length > 0) {
      await base44.entities.Risk.bulkCreate(
        formData.risks.map(r => ({
          project_id: project.id,
          title: r.title,
          category: r.category,
          probability: r.probability,
          impact: r.impact,
          mitigation: r.mitigation || '',
          status: 'em_monitoramento'
        }))
      );
    }

    // 7. Redirecionar
    window.location.href = `/dashboard?project_id=${project.id}`;
  };

  const handleClose = () => {
    setFile(null);
    setError('');
    setParsedData(null);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-400" />
              Cadastrar Novo Projeto
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-400">
              Selecione a planilha exportada do CRM. Após isso, você preencherá os dados do projeto em um formulário guiado.
            </p>

            {!file ? (
              <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-green-500 transition-colors">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="crm-file-input"
                />
                <label htmlFor="crm-file-input" className="cursor-pointer">
                  <Upload className="w-10 h-10 mx-auto mb-3 text-slate-500" />
                  <p className="text-white font-medium mb-1">Clique para selecionar o arquivo</p>
                  <p className="text-sm text-slate-400">Planilha CRM (.xlsx)</p>
                </label>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-slate-700/50 rounded-lg px-4 py-3">
                <FileSpreadsheet className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button onClick={() => setFile(null)} className="text-slate-500 hover:text-slate-300 text-xs">trocar</button>
              </div>
            )}

            {error && (
              <Alert className="bg-red-500/10 border-red-500/30">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <AlertDescription className="text-red-400">{error}</AlertDescription>
              </Alert>
            )}

            <div className="bg-slate-700/30 rounded-lg p-3 text-xs text-slate-500 space-y-1">
              <p className="font-medium text-slate-400 mb-1">Colunas esperadas na planilha:</p>
              <p>Entidade (ou Nome da conta) • Produto (ou Descrição) • Chamado (ou Código da Integração) • Tipo • Valor • Data prevista fechamento (opcional)</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700">
              Cancelar
            </Button>
            <Button onClick={handleStart} disabled={!file} className="flex-1 bg-green-600 hover:bg-green-700">
              Continuar →
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {flowOpen && parsedData && (
        <ProjectRegistrationFlow
          open={flowOpen}
          onOpenChange={setFlowOpen}
          parsedData={parsedData}
          onComplete={handleFlowComplete}
        />
      )}
    </>
  );
}