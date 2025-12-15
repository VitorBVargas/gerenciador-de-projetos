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
  'atendimento': 'atendimento'
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
  'em andamento': 'em_andamento',
  'concluído': 'concluido',
  'concluido': 'concluido',
  'paralisado': 'atrasado',
  'atrasado': 'atrasado'
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
      value: parseFloat(data['valor do projeto']) || 0,
      deadline: excelDateToJSDate(data['prazo final']),
      contract_link: data['link do contrato'] || '',
      status: normalizeStatus(data['status'])
    };
  };

  const processTeamSheet = (workbook) => {
    const sheet = workbook.Sheets['Equipe do projeto'];
    if (!sheet) return [];

    const data = XLSX.utils.sheet_to_json(sheet);
    if (data.length === 0) return [];

    const headers = Object.keys(data[0]);
    const nameCol = findColumn(headers, ['Nome', 'Membro da Equipe']);
    const verticalCol = findColumn(headers, ['Vertical', 'Vertial', 'Área']);
    const respCol = findColumn(headers, ['Responsabilidade', 'Função', 'Papel']);
    const emailCol = findColumn(headers, ['Email', 'E-mail']);
    const phoneCol = findColumn(headers, ['Telefone', 'Fone']);

    return data.map(row => ({
      name: row[nameCol] || 'Nome não informado',
      vertical: normalizeVertical(row[verticalCol]),
      role: row[respCol] || '',
      email: row[emailCol] || '',
      phone: row[phoneCol] || ''
    })).filter(m => m.name !== 'Nome não informado');
  };

  const processStakeholderSheet = (workbook) => {
    const sheet = workbook.Sheets['Dados Cliente'];
    if (!sheet) return [];

    const data = XLSX.utils.sheet_to_json(sheet);
    if (data.length === 0) return [];

    const headers = Object.keys(data[0]);
    const atuacaoCol = findColumn(headers, ['Atuação', 'Papel']);
    const nomeCol = findColumn(headers, ['Nome', 'Contato']);
    const emailCol = findColumn(headers, ['Email', 'E-mail']);
    const telefoneCol = findColumn(headers, ['Telefone', 'Fone']);
    const comCol = findColumn(headers, ['Comunicação', 'Nível de Comunicação']);
    const rotinaCol = findColumn(headers, ['Rotina', 'Rotina de Comunicação']);

    const commMapping = { 'alto': 'alto', 'médio': 'medio', 'medio': 'medio', 'baixo': 'baixo' };

    return data.map(row => ({
      name: row[nomeCol] || 'Nome não informado',
      role: row[atuacaoCol] || '',
      email: row[emailCol] || '',
      phone: row[telefoneCol] || '',
      communication_level: commMapping[row[comCol]?.toLowerCase()] || 'medio',
      communication_routine: row[rotinaCol] || ''
    })).filter(s => s.name !== 'Nome não informado');
  };

  const processProductsSheet = (workbook) => {
    const sheet = workbook.Sheets['Produtos'];
    if (!sheet) {
      console.log('Aba Produtos não encontrada');
      return [];
    }

    const data = XLSX.utils.sheet_to_json(sheet);
    console.log('Dados da aba Produtos:', data);
    
    if (data.length === 0) return [];

    const headers = Object.keys(data[0]);
    console.log('Headers encontrados:', headers);
    
    const verticalCol = findColumn(headers, ['Vertical', 'Área', 'Vertial']);
    const nameCol = findColumn(headers, ['Produto', 'Nome', 'Produtos']);
    const entityCol = findColumn(headers, ['Entidade', 'Órgão', 'Orgao']);
    const ticketCol = findColumn(headers, ['Chamado', 'Ticket', 'Número']);

    console.log('Colunas mapeadas - Vertical:', verticalCol, 'Produto:', nameCol, 'Entidade:', entityCol, 'Chamado:', ticketCol);

    const products = data.map(row => {
      const name = row[nameCol];
      const vertical = row[verticalCol];
      
      if (!name || !vertical) return null;
      
      return {
        name: String(name).trim(),
        vertical: normalizeVertical(vertical),
        entity: row[entityCol] ? String(row[entityCol]).trim() : '',
        ticket_number: row[ticketCol] ? String(row[ticketCol]).trim() : '',
        status: 'pendente',
        priority: 'media'
      };
    }).filter(p => p !== null && p.vertical !== null);

    console.log('Produtos processados:', products);
    return products;
  };

  const processTimelineSheet = (workbook) => {
    const sheet = workbook.Sheets['Cronograma'];
    if (!sheet) {
      console.log('Aba Cronograma não encontrada');
      return [];
    }

    const data = XLSX.utils.sheet_to_json(sheet);
    console.log('Dados da aba Cronograma:', data);
    
    if (data.length === 0) return [];

    const headers = Object.keys(data[0]);
    console.log('Headers encontrados:', headers);
    
    const titleCol = findColumn(headers, ['Etapa', 'Título', 'Titulo', 'Fase', 'Atividade']);
    const startCol = findColumn(headers, ['Data Início', 'Data Inicio', 'Data Inicio', 'Início', 'Inicio']);
    const endCol = findColumn(headers, ['Data Fim', 'Data Fim', 'Fim', 'Término', 'Termino']);
    const statusCol = findColumn(headers, ['Situação', 'Situacao', 'Status', 'Estado']);

    console.log('Colunas mapeadas - Etapa:', titleCol, 'Data Início:', startCol, 'Data Fim:', endCol, 'Situação:', statusCol);

    const events = data.map(row => {
      const title = row[titleCol];
      if (!title) return null;
      
      const situation = row[statusCol] ? String(row[statusCol]).toLowerCase().trim() : 'nao_iniciado';
      const mappedStatus = situationMapping[situation] || 'nao_iniciado';
      
      // Calculate progress based on status
      let progress = 0;
      if (mappedStatus === 'concluido') progress = 100;
      else if (mappedStatus === 'em_andamento') progress = 50;
      
      return {
        title: String(title).trim(),
        phase: normalizePhase(title),
        start_date: excelDateToJSDate(row[startCol]),
        end_date: excelDateToJSDate(row[endCol]),
        status: mappedStatus,
        progress: progress
      };
    }).filter(e => e !== null);

    console.log('Eventos processados:', events);
    return events;
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
      if (teamMembers.length > 0) {
        await base44.entities.TeamMember.bulkCreate(
          teamMembers.map(m => ({ ...m, project_id: project.id }))
        );
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
      if (products.length > 0) {
        await base44.entities.Product.bulkCreate(
          products.map(p => ({ ...p, project_id: project.id }))
        );
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
              <li>• <span className="text-slate-300">Produtos</span> - Produtos contratados</li>
              <li>• <span className="text-slate-300">Cronograma</span> - Etapas do projeto</li>
              <li>• <span className="text-slate-300">Riscos</span> - Riscos identificados</li>
              <li>• <span className="text-slate-300">Viagens</span> - Viagens planejadas</li>
              <li>• <span className="text-slate-300">Treinamentos</span> - Treinamentos agendados</li>
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