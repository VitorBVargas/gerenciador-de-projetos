import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';

// 12 etapas padrão do cronograma por produto
const STANDARD_PHASES = [
  "Planejamento/Contrato",
  "Kickoff",
  "Diagnóstico",
  "Onboarding Cliente",
  "Configuração/Migração de Homologação",
  "Homologação da Base",
  "Migração de PRD (Blackout)",
  "Configuração de PRD",
  "Treinamento",
  "Go-Live",
  "Operação Assistida",
  "Encerramento/Passagem de Bastão"
];

// Mapeia nome de entidade para sigla curta
const inferEntityCode = (entityName) => {
  const name = entityName.toLowerCase();
  if (name.includes('prefeitura') || name.includes('município') || name.includes('municipio')) return 'PM';
  if (name.includes('câmara') || name.includes('camara')) return 'CM';
  if (name.includes('saude') || name.includes('saúde') || name.includes('fundo municipal de saude') || name.includes('fundo municipal de saúde')) return 'FMS';
  if (name.includes('educação') || name.includes('educacao') || name.includes('fundo municipal de educa')) return 'FME';
  if (name.includes('previdencia') || name.includes('previdência') || name.includes('ipas') || name.includes('instituto')) return 'IPAS';
  if (name.includes('assistencia social') || name.includes('assistência social') || name.includes('fmas')) return 'FMAS';
  if (name.includes('meio ambiente')) return 'FMA';
  if (name.includes('fundeb')) return 'FUNDEB';
  // Fallback: pega as iniciais das primeiras palavras
  return entityName.split(' ').filter(w => w.length > 2).map(w => w[0].toUpperCase()).join('').slice(0, 4);
};

// Infere vertical do produto
const inferVertical = (productName) => {
  const name = productName.toLowerCase();
  if (name.includes('contabilidade')) return 'contabil';
  if (name.includes('compras') || name.includes('contratos') || name.includes('almoxarifado') || name.includes('patrimônio') || name.includes('patrimonio')) return 'compras';
  if (name.includes('folha') || name.includes('pessoal') || name.includes('recursos humanos') || name.includes('esocial') || name.includes('minha folha')) return 'pessoal';
  if (name.includes('arrecadação') || name.includes('arrecadacao') || name.includes('tributos') || name.includes('iss')) return 'arrecadacao';
  if (name.includes('saúde') || name.includes('saude')) return 'saude';
  if (name.includes('educação') || name.includes('educacao')) return 'educacao';
  if (name.includes('tesouraria') || name.includes('planejamento') || name.includes('orçamento') || name.includes('orcamento')) return 'contabil';
  if (name.includes('protocolo') || name.includes('atendimento')) return 'atendimento';
  if (name.includes('transparência') || name.includes('transparencia') || name.includes('portal') || name.includes('prestação de contas') || name.includes('prestacao de contas')) return 'plataforma';
  return 'plataforma';
};

export default function CrmImporter({ open, onOpenChange, onSuccess }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      setSuccess(false);
    }
  };

  const parseCrmData = (workbook) => {
    // Pega a primeira aba
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) throw new Error('Planilha vazia');

    // Estrutura: { entity: { product: { impl: val, incl: val, chamado: str } } }
    const entityProductMap = {};
    // Lista de entidades únicas (nome completo)
    const entityNames = {};

    rows.forEach(row => {
      const entityFull = String(row['Entidade'] || '').trim();
      const productName = String(row['Produto'] || '').trim();
      const chamado = String(row['Chamado'] || '').trim();
      const tipo = String(row['Tipo'] || '').trim().toLowerCase();
      const valor = parseFloat(String(row['Valor'] || '0').replace(',', '.')) || 0;

      if (!entityFull || !productName) return;

      const entityCode = inferEntityCode(entityFull);
      entityNames[entityCode] = entityFull;

      if (!entityProductMap[entityCode]) entityProductMap[entityCode] = {};
      if (!entityProductMap[entityCode][productName]) {
        entityProductMap[entityCode][productName] = { impl: 0, incl: 0, chamado: '' };
      }

      const isCrmTicket = chamado.toUpperCase().startsWith('BTHSC');

      if (tipo.includes('implantação') || tipo.includes('implantacao')) {
        entityProductMap[entityCode][productName].impl += valor;
        if (isCrmTicket) {
          entityProductMap[entityCode][productName].chamado = chamado;
        }
      } else if (tipo.includes('inclusão') || tipo.includes('inclusao')) {
        entityProductMap[entityCode][productName].incl += valor;
      }
    });

    return { entityProductMap, entityNames };
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

      setStatus('Processando dados do CRM...');
      setProgress(15);

      const { entityProductMap, entityNames } = parseCrmData(workbook);
      const entities = Object.keys(entityProductMap);

      if (entities.length === 0) throw new Error('Nenhuma entidade encontrada na planilha');

      // Calcular totais do projeto
      let totalImpl = 0;
      let totalIncl = 0;
      entities.forEach(ent => {
        Object.values(entityProductMap[ent]).forEach(p => {
          totalImpl += p.impl;
          totalIncl += p.incl;
        });
      });

      setStatus('Criando projeto...');
      setProgress(25);

      // Criar projeto com nome temporário (será preenchido no wizard)
      const project = await base44.entities.Project.create({
        name: `Projeto - ${file.name.replace('.xlsx', '').replace('.xls', '')}`,
        implementation_value: totalImpl,
        recurring_value: totalIncl,
        status: 'planejamento'
      });

      setStatus('Criando produtos...');
      setProgress(40);

      // Criar produtos por entidade
      const allProducts = [];
      entities.forEach(entityCode => {
        const products = entityProductMap[entityCode];
        Object.entries(products).forEach(([productName, vals]) => {
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
      setProgress(60);

      setStatus('Criando cronogramas...');
      // Criar cronograma para cada produto (12 etapas padrão)
      const allEvents = [];
      createdProducts.forEach((product, pIdx) => {
        STANDARD_PHASES.forEach((phase, phaseIdx) => {
          allEvents.push({
            project_id: project.id,
            product_id: product.id,
            title: phase,
            vertical: product.vertical,
            status: 'nao_iniciado',
            progress: 0,
            order: pIdx * 100 + phaseIdx
          });
        });
      });

      if (allEvents.length > 0) {
        await base44.entities.TimelineEvent.bulkCreate(allEvents);
      }
      setProgress(90);

      setStatus('Finalizado! Abrindo configuração do projeto...');
      setProgress(100);
      setSuccess(true);

      setTimeout(() => {
        window.location.href = `/dashboard?project_id=${project.id}&isNewProject=true&crmImport=true`;
      }, 1500);

    } catch (err) {
      console.error('Erro ao importar CRM:', err);
      setError(err.message || 'Erro ao processar o arquivo.');
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
            <FileSpreadsheet className="w-5 h-5 text-green-400" />
            Importar CRM
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!file && !importing && (
            <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-green-500 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="crm-file-input"
              />
              <label htmlFor="crm-file-input" className="cursor-pointer">
                <Upload className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                <p className="text-white font-medium mb-1">Clique para selecionar o arquivo</p>
                <p className="text-sm text-slate-400">Planilha exportada do CRM (.xlsx)</p>
              </label>
            </div>
          )}

          {file && !importing && !success && (
            <Alert className="bg-slate-700 border-slate-600">
              <FileSpreadsheet className="w-4 h-4 text-green-400" />
              <AlertDescription className="text-white">
                Arquivo: <span className="font-medium">{file.name}</span>
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
              <div className="flex items-center justify-center gap-2 text-green-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Processando...</span>
              </div>
            </div>
          )}

          {success && (
            <Alert className="bg-green-500/10 border-green-500/30">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <AlertDescription className="text-green-400">{status}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="bg-red-500/10 border-red-500/30">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <AlertDescription className="text-red-400">{error}</AlertDescription>
            </Alert>
          )}

          <div className="bg-slate-700/30 rounded-lg p-4 text-sm text-slate-400 space-y-2">
            <p className="font-medium text-white mb-2">Colunas esperadas:</p>
            <ul className="space-y-1 text-xs">
              <li>• <span className="text-slate-300">Entidade</span> – Nome da entidade</li>
              <li>• <span className="text-slate-300">Produto</span> – Nome do produto</li>
              <li>• <span className="text-slate-300">Chamado</span> – Número do chamado (BTHSC-xxx = implantação)</li>
              <li>• <span className="text-slate-300">Tipo</span> – Implantação ou Inclusão</li>
              <li>• <span className="text-slate-300">Valor</span> – Valor em reais</li>
            </ul>
            <p className="text-xs text-slate-500 pt-1">Após a importação, um wizard irá guiar o preenchimento do restante do projeto.</p>
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
            className="bg-green-600 hover:bg-green-700"
          >
            {importing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importando...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" />Importar</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}