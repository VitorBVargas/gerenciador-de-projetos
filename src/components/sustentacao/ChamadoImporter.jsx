import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function ChamadoImporter({ open, onOpenChange, projectId, products }) {
  const qc = useQueryClient();
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null); // null | 'processing' | 'done' | 'error'
  const [result, setResult] = useState(null);

  const handleFile = (e) => {
    setFile(e.target.files[0]);
    setStatus(null);
    setResult(null);
  };

  const handleImport = async () => {
    if (!file) return;
    setStatus('processing');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const schema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                numero: { type: 'string' },
                descricao: { type: 'string' },
                product_name: { type: 'string' },
                status: { type: 'string' },
                prioridade: { type: 'string' },
                responsavel: { type: 'string' },
                data_abertura: { type: 'string' },
                is_bloqueador: { type: 'boolean' },
                vertical: { type: 'string' },
                notes: { type: 'string' }
              }
            }
          }
        }
      };
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({ file_url, json_schema: schema });
      if (extracted.status !== 'success') throw new Error(extracted.details || 'Falha na extração');

      const rows = extracted.output?.items || (Array.isArray(extracted.output) ? extracted.output : []);
      let created = 0, updated = 0, errors = 0;

      const existingChamados = await base44.entities.Chamado.filter({ project_id: projectId });
      const byNumero = {};
      existingChamados.forEach(c => { byNumero[c.numero] = c; });

      const STATUS_MAP = {
        'aberto': 'aberto', 'open': 'aberto',
        'em andamento': 'em_andamento', 'em_andamento': 'em_andamento', 'in_progress': 'em_andamento',
        'aguardando': 'aguardando_cliente', 'aguardando_cliente': 'aguardando_cliente',
        'resolvido': 'resolvido', 'resolved': 'resolvido',
        'fechado': 'fechado', 'closed': 'fechado'
      };
      const PRIO_MAP = {
        'baixa': 'baixa', 'low': 'baixa',
        'media': 'media', 'média': 'media', 'medium': 'media', 'normal': 'media',
        'alta': 'alta', 'high': 'alta',
        'critica': 'critica', 'crítica': 'critica', 'critical': 'critica', 'urgente': 'critica'
      };

      for (const row of rows) {
        if (!row.numero || !row.descricao) { errors++; continue; }
        const product = products.find(p =>
          p.name?.toLowerCase() === row.product_name?.toLowerCase() ||
          p.vertical?.toLowerCase() === row.vertical?.toLowerCase()
        );
        const payload = {
          project_id: projectId,
          numero: String(row.numero).trim(),
          descricao: String(row.descricao).trim(),
          product_id: product?.id || '',
          product_name: product?.name || row.product_name || '',
          vertical: row.vertical || product?.vertical || '',
          status: STATUS_MAP[String(row.status || '').toLowerCase()] || 'aberto',
          prioridade: PRIO_MAP[String(row.prioridade || '').toLowerCase()] || 'media',
          responsavel: row.responsavel || '',
          data_abertura: row.data_abertura || new Date().toISOString().split('T')[0],
          is_bloqueador: row.is_bloqueador === true || String(row.is_bloqueador).toLowerCase() === 'sim' || String(row.is_bloqueador).toLowerCase() === 'true',
          notes: row.notes || ''
        };
        const existing = byNumero[payload.numero];
        if (existing) {
          await base44.entities.Chamado.update(existing.id, payload);
          updated++;
        } else {
          await base44.entities.Chamado.create(payload);
          created++;
        }
      }

      setResult({ created, updated, errors, total: rows.length });
      setStatus('done');
      qc.invalidateQueries({ queryKey: ['chamados', projectId] });
    } catch (e) {
      setResult({ error: e.message });
      setStatus('error');
    }
  };

  const downloadTemplate = () => {
    const csv = `numero,descricao,product_name,status,prioridade,responsavel,data_abertura,is_bloqueador,vertical,notes
CHM-001,Erro no fechamento do mês,Folha de Pagamento,aberto,alta,João Silva,2026-06-01,false,pessoal,
CHM-002,Integração com banco falhou,Arrecadação,em_andamento,critica,Maria Santos,2026-06-05,true,arrecadacao,Impacta faturamento`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'modelo_chamados.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Chamados</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p className="text-slate-400 text-sm">
            Importe uma planilha (.xlsx ou .csv) com os chamados. Chamados existentes (mesmo número) serão atualizados.
          </p>

          <Button variant="outline" onClick={downloadTemplate}
            className="w-full border-slate-600 text-slate-300 hover:bg-slate-800">
            <Download className="w-4 h-4 mr-2" />
            Baixar Modelo de Planilha
          </Button>

          <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
            <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-slate-400 text-sm mb-3">Selecione o arquivo</p>
            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile}
              className="hidden" id="chamado-file-input" />
            <label htmlFor="chamado-file-input"
              className="cursor-pointer bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2 rounded-lg transition-colors">
              {file ? file.name : 'Escolher arquivo'}
            </label>
          </div>

          {status === 'done' && result && (
            <div className="bg-emerald-900/30 border border-emerald-700 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-emerald-300">
                <p className="font-medium">Importação concluída!</p>
                <p>{result.created} criados · {result.updated} atualizados · {result.errors} erros de {result.total} linhas</p>
              </div>
            </div>
          )}

          {status === 'error' && result && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-300">{result.error}</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400">Fechar</Button>
            <Button onClick={handleImport} disabled={!file || status === 'processing'}
              className="bg-blue-600 hover:bg-blue-700">
              {status === 'processing' ? 'Importando...' : 'Importar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}