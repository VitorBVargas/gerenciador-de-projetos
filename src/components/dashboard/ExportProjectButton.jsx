import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const verticalLabels = {
  arrecadacao: 'Arrecadação',
  compras: 'Compras/Contratos',
  contabil: 'Contábil',
  pessoal: 'Pessoal',
  educacao: 'Educação',
  iss: 'ISS',
  parceiros: 'Parceiros',
  plataforma: 'Plataforma',
  atendimento: 'Atendimento',
  saude: 'Saúde',
  extensoes: 'Extensões',
  outros: 'Outros',
};

const phaseLabels = {
  planejamento_contrato: 'Planejamento do Contrato',
  kickoff: 'Kickoff',
  diagnostico: 'Diagnóstico',
  onboarding_cliente: 'Onboarding do Cliente',
  configuracao_migracao_hml: 'Configuração / Migração HML',
  homologacao_base: 'Homologação da Base',
  migracao_prd_blackout: 'Migração PRD / Blackout',
  configuracao_prd: 'Configuração PRD',
  treinamento: 'Treinamento',
  go_live: 'Go-Live',
  operacao_assistida: 'Operação Assistida',
  encerramento_bastao: 'Encerramento / Passagem de Bastão',
};

const statusLabels = {
  nao_iniciado: 'Não iniciado',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  atrasado: 'Atrasado',
};

const safeSheetName = (name, used) => {
  let clean = String(name || 'Sem Nome').replace(/[:\\/?*[\]]/g, '-').slice(0, 31);
  let final = clean;
  let i = 1;
  while (used.has(final)) {
    const base = clean.slice(0, 31 - String(i).length - 1);
    final = `${base}_${i}`;
    i++;
  }
  used.add(final);
  return final;
};

const fmtDate = (d) => {
  if (!d) return '';
  try {
    return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return d;
  }
};

const calcEventProgress = (e) => {
  if (e.status === 'concluido') return 100;
  if (e.status === 'nao_iniciado') return 0;
  if (e.start_date && e.end_date) {
    const now = new Date();
    const start = new Date(e.start_date);
    const end = new Date(e.end_date);
    if (now <= start) return 0;
    if (now >= end) return 99;
    return Math.round(((now - start) / (end - start)) * 100);
  }
  return e.progress || 0;
};

export default function ExportProjectButton({
  project,
  products,
  timelineEvents,
  estimatedDeadline,
}) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    if (!project) return;
    setIsExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      const usedNames = new Set();

      const contractNumber = project.contract_number || '';
      const coordinator = project.coordinator || '';
      const prazoEntrega = fmtDate(estimatedDeadline);

      const sortedProducts = [...products].sort((a, b) => {
        const va = (a.vertical || '').localeCompare(b.vertical || '');
        if (va !== 0) return va;
        return (a.name || '').localeCompare(b.name || '');
      });

      // ===== Aba 1: Implantação (1 linha por produto) =====
      const implantacaoRows = sortedProducts.map(p => ({
        'N° Contrato': contractNumber,
        'Coordenador': coordinator,
        'Prazo de entrega': prazoEntrega,
        'Vertical': verticalLabels[p.vertical] || p.vertical || '',
        'Lista de Produto': p.name || '',
      }));

      const wsImpl = XLSX.utils.json_to_sheet(implantacaoRows);
      wsImpl['!cols'] = [{ wch: 16 }, { wch: 22 }, { wch: 18 }, { wch: 22 }, { wch: 32 }];
      XLSX.utils.book_append_sheet(wb, wsImpl, safeSheetName('Implantação', usedNames));

      // ===== Aba 2: Detalhado (1 linha por etapa do cronograma) =====
      const detalhadoRows = [];
      sortedProducts.forEach(product => {
        const productEvents = timelineEvents
          .filter(e => e.product_id === product.id)
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        productEvents.forEach(e => {
          detalhadoRows.push({
            'N° Contrato': contractNumber,
            'Atividade': phaseLabels[e.phase] || e.title || '-',
            'Status': statusLabels[e.status] || e.status || '',
            'Data Inicio': fmtDate(e.start_date),
            'Data Fim': fmtDate(e.end_date),
            'Progresso': `${calcEventProgress(e)} %`,
          });
        });
      });

      const wsDet = XLSX.utils.json_to_sheet(detalhadoRows);
      wsDet['!cols'] = [{ wch: 16 }, { wch: 38 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsDet, safeSheetName('Detalhado', usedNames));

      const today = new Date().toISOString().slice(0, 10);
      const fileName = `projeto_${(project.name || 'export').replace(/[^a-zA-Z0-9]+/g, '_')}_${today}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success('Projeto exportado com sucesso.');
    } catch (err) {
      toast.error('Erro ao exportar: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      className="bg-emerald-600 hover:bg-emerald-700 text-white"
      title="Extrair Projeto para Excel"
    >
      {isExporting
        ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        : <Download className="w-4 h-4 mr-2" />}
      Extrair Projeto
    </Button>
  );
}