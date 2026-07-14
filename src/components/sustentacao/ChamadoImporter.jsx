import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { buildColumnIndex, rowToChamado } from './serviceDeskMapper';

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
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
      if (!matrix.length) throw new Error('Planilha vazia.');

      const idx = buildColumnIndex(matrix[0]);
      if (idx.chave < 0 || idx.resumo < 0) {
        throw new Error('Não encontrei as colunas "Chave" e "Resumo" no cabeçalho (linha 1).');
      }

      const dataRows = matrix.slice(1).filter(r => String(r[idx.chave] || '').trim());

      const existing = await base44.entities.Chamado.filter({ project_id: projectId, tipo: 'interno' });
      const byNumero = {};
      existing.forEach(c => { byNumero[c.numero] = c; });

      // Vincula produto pela vertical/nome quando possível
      const matchProduct = (payload) => {
        const p = (products || []).find(prod =>
          prod.entity_full_name && payload.entity_name &&
          prod.entity_full_name.toLowerCase() === payload.entity_name.toLowerCase()
        );
        if (p) { payload.product_id = p.id; payload.product_name = p.name; payload.vertical = p.vertical; }
        return payload;
      };

      let created = 0, updated = 0, errors = 0;
      for (const r of dataRows) {
        const payload = rowToChamado(r, idx, { projectId, tipo: 'interno' });
        if (!payload) { errors++; continue; }
        matchProduct(payload);
        const ex = byNumero[payload.numero];
        if (ex) { await base44.entities.Chamado.update(ex.id, payload); updated++; }
        else { await base44.entities.Chamado.create(payload); created++; }
      }

      setResult({ created, updated, errors, total: dataRows.length });
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
          <DialogTitle>Importar Chamados Internos</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p className="text-slate-400 text-sm">
            Importe a planilha exportada do ServiceDesk (.xlsx ou .csv). O importador lê pelo cabeçalho da linha 1 e mapeia:{' '}
            <span className="text-slate-300">Chave → Número, Resumo → Descrição, Tipo de Item → Categoria, Situação → Status, Prioridade, Solicitante → Responsável, Criado → Abertura, Entidade</span>.
            Chamados existentes (mesma Chave) são atualizados.
          </p>

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