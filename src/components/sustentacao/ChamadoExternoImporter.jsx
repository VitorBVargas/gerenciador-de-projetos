import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

// Importador de Chamados Externos — modelo da aba "Chamados_ASI"
// Ticket -> numero | Assunto -> descricao | Categoria -> categoria
// Data de abertura -> data_abertura | Solucionado? -> status
const STATUS_MAP = {
  'sim': 'resolvido',
  'resolvido': 'resolvido',
  'fechado': 'fechado',
  'nao': 'aberto',
  'não': 'aberto',
};

function normalizeDate(value) {
  if (!value) return '';
  const s = String(value).trim();
  // já formato ISO ou "2026-05-06 00:00:00"
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  // dd/mm/yyyy
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return '';
}

export default function ChamadoExternoImporter({ open, onOpenChange, projectId }) {
  const qc = useQueryClient();
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null);
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
                ticket: { type: 'string', description: 'Número do ticket' },
                assunto: { type: 'string', description: 'Assunto / descrição' },
                categoria: { type: 'string', description: 'Categoria do chamado' },
                data_abertura: { type: 'string', description: 'Data de abertura' },
                solucionado: { type: 'string', description: 'Solucionado? (Sim/Não ou texto)' },
              }
            }
          }
        }
      };
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({ file_url, json_schema: schema });
      if (extracted.status !== 'success') throw new Error(extracted.details || 'Falha na extração');

      const rows = extracted.output?.items || (Array.isArray(extracted.output) ? extracted.output : []);
      let created = 0, updated = 0, errors = 0;

      const existing = await base44.entities.Chamado.filter({ project_id: projectId, tipo: 'externo' });
      const byNumero = {};
      existing.forEach(c => { byNumero[c.numero] = c; });

      for (const row of rows) {
        const numero = row.ticket ? String(row.ticket).trim().replace(/\.0$/, '') : '';
        if (!numero || !row.assunto) { errors++; continue; }
        const solved = String(row.solucionado || '').trim().toLowerCase();
        const payload = {
          project_id: projectId,
          tipo: 'externo',
          numero,
          descricao: String(row.assunto).trim(),
          categoria: row.categoria ? String(row.categoria).trim() : '',
          data_abertura: normalizeDate(row.data_abertura) || new Date().toISOString().split('T')[0],
          status: STATUS_MAP[solved] || (solved ? 'em_andamento' : 'aberto'),
        };
        const ex = byNumero[numero];
        if (ex) {
          await base44.entities.Chamado.update(ex.id, payload);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Chamados Externos</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p className="text-slate-400 text-sm">
            Importe a planilha de chamados externos (aba <span className="text-slate-200 font-medium">Chamados_ASI</span>).
            O importador mapeia: <span className="text-slate-300">Ticket → Número, Assunto → Descrição, Categoria, Data de abertura, Solucionado? → Status</span>.
            Produto, responsável e prioridade são preenchidos depois.
          </p>

          <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
            <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-slate-400 text-sm mb-3">Selecione o arquivo (.xlsx)</p>
            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile}
              className="hidden" id="chamado-externo-file-input" />
            <label htmlFor="chamado-externo-file-input"
              className="cursor-pointer bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2 rounded-lg transition-colors">
              {file ? file.name : 'Escolher arquivo'}
            </label>
          </div>

          {status === 'done' && result && (
            <div className="bg-emerald-900/30 border border-emerald-700 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-emerald-300">
                <p className="font-medium">Importação concluída!</p>
                <p>{result.created} criados · {result.updated} atualizados · {result.errors} ignorados de {result.total} linhas</p>
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