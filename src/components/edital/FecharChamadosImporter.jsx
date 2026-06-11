import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { CheckCircle2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * Lê uma planilha do Service Desk (Jira) e atualiza o STATUS dos itens
 * já existentes no dashboard com base nas colunas:
 *   - B "Chave"    → casa com EditalItem.chamado OU EditalItem.chamado_link (contém)
 *   - J "Situação" → vira o novo status do item
 *
 * Não cria nada. Apenas atualiza itens existentes.
 */
export default function FecharChamadosImporter({ items, portfolio, onDone }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null); // { updated, notFound, skipped }
  const inputRef = useRef(null);

  const norm = (s) => String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  const findHeaderRow = (rows) => {
    // Procura a linha com cabeçalhos "Chave" e "Situação" (sem acento, case-insensitive)
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const row = rows[i] || [];
      const cells = row.map(norm);
      if (cells.includes('chave') && cells.includes('situacao')) return i;
    }
    return -1;
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    setResult(null);

    try {
      const isCsv = file.name.toLowerCase().endsWith('.csv');
      let rows;
      if (isCsv) {
        const text = await file.text();
        const wb = XLSX.read(text, { type: 'string' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      } else {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      }

      const headerIdx = findHeaderRow(rows);
      if (headerIdx === -1) {
        toast.error('Não encontrei as colunas "Chave" e "Situação" na planilha.');
        setIsProcessing(false);
        e.target.value = '';
        return;
      }

      const headers = rows[headerIdx].map(norm);
      const chaveIdx = headers.findIndex(h => h === 'chave');
      const situacaoIdx = headers.findIndex(h => h === 'situacao');

      // Monta pares chave → situação a partir das linhas de dados
      const planilhaItens = [];
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i] || [];
        const chave = String(row[chaveIdx] || '').trim();
        const situacao = String(row[situacaoIdx] || '').trim();
        if (chave && situacao) planilhaItens.push({ chave, situacao });
      }

      // Para cada chave da planilha, procura no dashboard onde chamado OU chamado_link contém a chave
      const updates = [];
      const notFound = [];
      const skipped = []; // já tinha o mesmo status

      planilhaItens.forEach(({ chave, situacao }) => {
        const match = items.find(it => {
          const chamado = String(it.chamado || '');
          const link = String(it.chamado_link || '');
          return chamado.includes(chave) || link.includes(chave);
        });

        if (!match) {
          notFound.push(chave);
          return;
        }

        if ((match.status || '').trim() === situacao) {
          skipped.push(chave);
          return;
        }

        updates.push({ id: match.id, chave, novoStatus: situacao });
      });

      // Aplica updates
      for (const u of updates) {
        await base44.entities.EditalItem.update(u.id, { status: u.novoStatus });
      }

      setResult({
        updated: updates.length,
        notFound: notFound.length,
        skipped: skipped.length,
        notFoundList: notFound,
      });

      if (updates.length > 0) {
        toast.success(`${updates.length} chamado${updates.length > 1 ? 's' : ''} atualizado${updates.length > 1 ? 's' : ''}.`);
        onDone?.();
      } else {
        toast.info('Nenhum chamado precisou ser atualizado.');
      }
    } catch (err) {
      toast.error('Erro ao processar: ' + err.message);
    } finally {
      setIsProcessing(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <>
      <label
        className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition-colors ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
      >
        {isProcessing
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <CheckCircle2 className="w-4 h-4" />}
        Fechar Chamados
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleFile}
        />
      </label>

      <Dialog open={!!result} onOpenChange={(open) => !open && setResult(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              Resultado da atualização
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Itens cruzados pela coluna "Chave" da planilha.
            </DialogDescription>
          </DialogHeader>
          {result && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-700">
                <span className="text-slate-300">Atualizados</span>
                <span className="font-bold text-green-400">{result.updated}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-700">
                <span className="text-slate-300">Já estavam com o mesmo status</span>
                <span className="font-bold text-slate-400">{result.skipped}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-300">Não encontrados no dashboard</span>
                <span className="font-bold text-yellow-400">{result.notFound}</span>
              </div>
              {result.notFoundList?.length > 0 && (
                <div className="bg-slate-900 rounded-lg p-3 max-h-40 overflow-y-auto">
                  <p className="text-xs text-slate-400 mb-1">Chaves não encontradas:</p>
                  <p className="text-xs text-slate-500 font-mono">{result.notFoundList.join(', ')}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setResult(null)} className="bg-slate-700 hover:bg-slate-600">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}