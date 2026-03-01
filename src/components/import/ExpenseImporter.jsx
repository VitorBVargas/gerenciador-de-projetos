import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";

// Mapeamento de tipo de despesa da planilha para a categoria da entidade
const tipoParaCategoria = {
  'aéreo': 'viagem',
  'aereo': 'viagem',
  'passagem': 'viagem',
  'hotel': 'hospedagem',
  'hospedagem': 'hospedagem',
  'diária': 'hospedagem',
  'diaria': 'hospedagem',
  'alimentação': 'alimentacao',
  'alimentacao': 'alimentacao',
  'refeição': 'alimentacao',
  'refeicao': 'alimentacao',
  'taxi': 'transporte',
  'uber': 'transporte',
  'transporte': 'transporte',
  'combustível': 'transporte',
  'combustivel': 'transporte',
  'material': 'material',
  'serviço': 'servico',
  'servico': 'servico',
};

function normalizeTipo(tipo) {
  if (!tipo) return 'outros';
  const lower = tipo.toLowerCase().trim();
  for (const [key, val] of Object.entries(tipoParaCategoria)) {
    if (lower.includes(key)) return val;
  }
  return 'outros';
}

function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split('T')[0];
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d)) return d.toISOString().split('T')[0];
  }
  if (typeof val === 'number') {
    // Excel serial date
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
  }
  return null;
}

export default function ExpenseImporter({ open, onOpenChange, projectId, onImported }) {
  const [rows, setRows] = useState([]);
  const [step, setStep] = useState('upload'); // upload | preview | done
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Generate hash for deduplication when external_id is missing
  function generateHash(collaborator, date, amount, category) {
    return `${(collaborator || '').substring(0, 3)}-${date}-${amount}-${category}`.toLowerCase();
  }

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { defval: null });

      // Deduplicate by exact row match (same values across key fields)
      const seen = new Set();
      const deduped = data.filter(row => {
        const key = `${row['#']}-${row['Identificador']}-${row['Data despesa']}-${row['Valor nacional'] || row['Valor']}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const parsed = deduped
         .filter(row => row['Valor'] && row['Situação'] === 'Finalizada')
         .map(row => {
           const date = parseDate(row['Data despesa']);
           const amount = parseFloat(row['Valor nacional'] || row['Valor']) || 0;
           const category = normalizeTipo(row['Tipo despesa']);
           const collaborator = row['Colaborador'] || row['Fornecedor'] || '';

           return {
             title: `${row['Tipo despesa'] || 'Despesa'} - ${collaborator}`,
             amount,
             date,
             category,
             notes: [
               collaborator,
               row['Centro de custo'],
               row['Tipo despesa']
             ].filter(Boolean).join(' | '),
             project_id: projectId,
             external_id: row['Identificador'] && row['#'] ? `${row['Identificador']}-${row['#']}-${date}` : generateHash(collaborator, date, amount, category),
           };
         })
         .filter(r => r.date && r.amount > 0);

      setRows(parsed);
      setStep('preview');
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    setImporting(true);
    let success = 0, errors = 0, skipped = 0;

    // Fetch existing expenses to check for duplicates
    const existingExpenses = await base44.entities.Expense.filter({ project_id: projectId });
    const existingIds = new Set(existingExpenses.map(e => e.external_id).filter(Boolean));

    for (const row of rows) {
      try {
        // Skip if external_id already exists
        if (row.external_id && existingIds.has(row.external_id)) {
          skipped++;
          continue;
        }
        await base44.entities.Expense.create(row);
        success++;
      } catch {
        errors++;
      }
    }
    setImportResult({ success, errors, skipped });
    setStep('done');
    setImporting(false);
    if (success > 0) onImported?.();
  };

  const handleClose = () => {
    setRows([]);
    setStep('upload');
    setImportResult(null);
    onOpenChange(false);
  };

  const totalValue = rows.reduce((s, r) => s + r.amount, 0);
  const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const categoryColors = {
    viagem: 'bg-blue-500/20 text-blue-400',
    hospedagem: 'bg-purple-500/20 text-purple-400',
    alimentacao: 'bg-green-500/20 text-green-400',
    transporte: 'bg-orange-500/20 text-orange-400',
    material: 'bg-cyan-500/20 text-cyan-400',
    servico: 'bg-pink-500/20 text-pink-400',
    outros: 'bg-slate-500/20 text-slate-400',
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-bold">Importar Despesas do Excel</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                <Upload className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-slate-300 text-center max-w-xs">
                Selecione a planilha de despesas.<br />
                Serão lidos: <strong>Colaborador, Tipo despesa, Data despesa, Centro de custo, Valor</strong>.
              </p>
              <label className="cursor-pointer">
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
                <div className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                  Selecionar Arquivo
                </div>
              </label>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-700/40 rounded-lg p-4">
                <div>
                  <p className="text-white font-semibold">{rows.length} despesas encontradas</p>
                  <p className="text-slate-400 text-sm">Total: {formatCurrency(totalValue)}</p>
                </div>
                <label className="cursor-pointer text-xs text-blue-400 hover:text-blue-300 underline">
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
                  Trocar arquivo
                </label>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {rows.map((row, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-700/30 rounded-lg px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{row.title}</p>
                      <p className="text-slate-500 text-xs truncate">{row.date} • {row.notes}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <Badge className={cn("text-xs", categoryColors[row.category])}>
                        {row.category}
                      </Badge>
                      <span className="text-white font-semibold text-sm whitespace-nowrap">
                        {formatCurrency(row.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'done' && importResult && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              {importResult.errors === 0 ? (
                <CheckCircle className="w-14 h-14 text-green-400" />
              ) : (
                <AlertCircle className="w-14 h-14 text-yellow-400" />
              )}
              <p className="text-white font-semibold text-lg">Importação concluída</p>
              <p className="text-green-400">{importResult.success} despesas importadas com sucesso</p>
              {importResult.skipped > 0 && (
                <p className="text-blue-400">{importResult.skipped} despesas já existentes (ignoradas)</p>
              )}
              {importResult.errors > 0 && (
                <p className="text-red-400">{importResult.errors} despesas com erro</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t border-slate-700">
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Cancelar
            </Button>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={handleClose} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                Cancelar
              </Button>
              <Button onClick={handleImport} disabled={importing || rows.length === 0} className="bg-blue-600 hover:bg-blue-700">
                {importing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importando...</> : `Importar ${rows.length} despesas`}
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button onClick={handleClose} className="bg-blue-600 hover:bg-blue-700">
              Concluir
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}