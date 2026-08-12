import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Download, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Mapeia rótulos amigáveis (cabeçalho da planilha) para os campos da entidade
const VERTICAIS = 'gerenciamento, arrecadacao, compras, contabil, pessoal, educacao, iss, parceiros, plataforma, saude, atendimento, extensoes, gestao_projetos, gestao_operacoes, coordenacao_tecnica, outros';
const NIVEIS = 'alto, medio, baixo';

const COLUNAS = [
  { header: 'Nome', field: 'name', exemplo: 'João da Silva' },
  { header: 'Papel/Atuação', field: 'role', exemplo: 'Secretário de Fazenda' },
  { header: 'Entidade', field: 'entity', exemplo: 'PM' },
  { header: 'Vertical', field: 'vertical', exemplo: 'arrecadacao', ajuda: VERTICAIS },
  { header: 'E-mail', field: 'email', exemplo: 'joao@prefeitura.gov.br' },
  { header: 'Telefone', field: 'phone', exemplo: '(51) 99999-0000' },
  { header: 'Interesse', field: 'interesse', exemplo: 'alto', ajuda: NIVEIS },
  { header: 'Influência', field: 'influencia', exemplo: 'alto', ajuda: NIVEIS },
  { header: 'Nível de Comunicação', field: 'communication_level', exemplo: 'medio', ajuda: NIVEIS },
  { header: 'Rotina de Comunicação', field: 'communication_routine', exemplo: 'Reunião semanal às segundas' },
  { header: 'Expectativa', field: 'expectativa', exemplo: 'Sistema estável até o fim do ano' },
];

const normalize = (v) => String(v ?? '').trim();
const normalizeLower = (v) => normalize(v).toLowerCase().replace(/\s+/g, '_');

export function baixarPlanilhaStakeholders() {
  const wb = XLSX.utils.book_new();

  // Linha de exemplo
  const exemploRow = {};
  COLUNAS.forEach(c => { exemploRow[c.header] = c.exemplo; });
  const ws = XLSX.utils.json_to_sheet([exemploRow], { header: COLUNAS.map(c => c.header) });
  ws['!cols'] = COLUNAS.map(c => ({ wch: Math.max(c.header.length + 4, 22) }));
  XLSX.utils.book_append_sheet(wb, ws, 'Stakeholders');

  // Aba de instruções com valores aceitos
  const instrucoes = COLUNAS.map(c => ({
    'Coluna': c.header,
    'Obrigatório': c.field === 'name' ? 'Sim' : 'Não',
    'Valores aceitos / Observação': c.ajuda || 'Texto livre',
  }));
  const wsInfo = XLSX.utils.json_to_sheet(instrucoes);
  wsInfo['!cols'] = [{ wch: 24 }, { wch: 12 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Instruções');

  XLSX.writeFile(wb, 'Modelo_Stakeholders.xlsx');
}

export default function StakeholderImporter({ projectId }) {
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [importing, setImporting] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!projectId) { toast.error('Projeto não identificado.'); return; }
    setImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets['Stakeholders'] || wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      const headerToField = Object.fromEntries(COLUNAS.map(c => [c.header, c.field]));
      const registros = [];
      rows.forEach(row => {
        const rec = { project_id: projectId };
        Object.entries(row).forEach(([header, val]) => {
          const field = headerToField[header.trim()];
          if (!field) return;
          if (['vertical', 'interesse', 'influencia', 'communication_level'].includes(field)) {
            rec[field] = normalizeLower(val);
          } else {
            rec[field] = normalize(val);
          }
        });
        // Ignora a linha de exemplo e linhas vazias
        if (rec.name && rec.email !== 'joao@prefeitura.gov.br') registros.push(rec);
      });

      if (registros.length === 0) {
        toast.error('Nenhum stakeholder válido encontrado na planilha (a coluna Nome é obrigatória).');
        return;
      }

      await base44.entities.Stakeholder.bulkCreate(registros);
      queryClient.invalidateQueries({ queryKey: ['stakeholders', projectId] });
      toast.success(`${registros.length} stakeholder(s) importado(s) com sucesso!`);
    } catch (err) {
      toast.error('Erro ao importar: ' + err.message);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
      <Button
        variant="outline"
        className="border-slate-600 text-slate-300 hover:bg-slate-700"
        onClick={baixarPlanilhaStakeholders}
      >
        <Download className="w-4 h-4 mr-2" />
        Baixar planilha padrão
      </Button>
      <Button
        variant="outline"
        className="border-emerald-600/50 text-emerald-400 hover:bg-emerald-500/10"
        onClick={() => fileRef.current?.click()}
        disabled={importing}
      >
        {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
        Importar planilha
      </Button>
    </div>
  );
}