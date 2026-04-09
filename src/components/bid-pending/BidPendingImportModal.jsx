import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const normalizeText = (value) => String(value || '').trim();

const excelDateToJSDate = (excelDate) => {
  if (!excelDate && excelDate !== 0) return '';
  if (typeof excelDate === 'string') {
    const trimmed = excelDate.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().split('T')[0];
  }
  if (typeof excelDate === 'number') {
    const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
  }
  return '';
};

const findHeaderIndex = (headers, possibilities) => {
  const normalized = headers.map((header) => normalizeText(header).toLowerCase());
  return possibilities.reduce((found, possibility) => {
    if (found !== -1) return found;
    return normalized.findIndex((header) => header === possibility.toLowerCase());
  }, -1);
};

const getCellLink = (sheet, rowIndex, colIndex) => {
  const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
  const cell = sheet[cellRef];
  return cell?.l?.Target || '';
};

export default function BidPendingImportModal({ open, onOpenChange, portfolio, onSuccess }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const resetState = () => {
    setFile(null);
    setImporting(false);
    setProgress(0);
    setStatus('');
    setError('');
    setSuccess(false);
  };

  const handleClose = (nextOpen) => {
    if (!nextOpen) resetState();
    onOpenChange(nextOpen);
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setError('');
    setSuccess(false);

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetNames = workbook.SheetNames || [];
    const allRows = [];

    setStatus('Lendo abas da planilha...');
    setProgress(10);

    sheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (!rows.length) return;

      const headers = rows[0] || [];
      const chamadoIndex = findHeaderIndex(headers, ['Chamado']);
      const verticalIndex = findHeaderIndex(headers, ['Vertical']);
      const sistemaIndex = findHeaderIndex(headers, ['Sistema']);
      const numeroItemIndex = findHeaderIndex(headers, ['NÚMERO DO ITEM', 'NUMERO DO ITEM']);
      const itemEditalIndex = findHeaderIndex(headers, ['ITEM DO EDITAL']);
      const statusIndex = findHeaderIndex(headers, ['Status']);
      const dataPrevistaIndex = findHeaderIndex(headers, ['Data Prevista']);

      rows.slice(1).forEach((row, dataIndex) => {
        const ticketNumber = normalizeText(row[chamadoIndex]);
        const bidItemNumber = normalizeText(row[numeroItemIndex]);
        const description = normalizeText(row[itemEditalIndex]);
        if (!ticketNumber && !bidItemNumber && !description) return;

        const excelRowIndex = dataIndex + 1;
        allRows.push({
          portfolio,
          project_name: sheetName,
          ticket_number: ticketNumber,
          ticket_link: chamadoIndex >= 0 ? getCellLink(sheet, excelRowIndex, chamadoIndex) : '',
          vertical: normalizeText(row[verticalIndex]),
          system_name: normalizeText(row[sistemaIndex]),
          bid_item_number: bidItemNumber,
          bid_item_description: description,
          status: normalizeText(row[statusIndex]),
          due_date: excelDateToJSDate(row[dataPrevistaIndex]),
          unique_key: `${sheetName}__${bidItemNumber}__${ticketNumber}`
        });
      });
    });

    setStatus('Sincronizando registros...');
    setProgress(40);

    const existingItems = await base44.entities.BidPendingItem.filter({ portfolio }, '-updated_date', 10000);
    const existingByKey = new Map(existingItems.map((item) => [item.unique_key, item]));

    const toCreate = [];
    const toUpdate = [];

    allRows.forEach((row) => {
      const existing = existingByKey.get(row.unique_key);
      if (existing) {
        toUpdate.push({ id: existing.id, data: row });
      } else {
        toCreate.push(row);
      }
    });

    if (toCreate.length > 0) {
      await base44.entities.BidPendingItem.bulkCreate(toCreate);
    }

    let processedUpdates = 0;
    for (const item of toUpdate) {
      await base44.entities.BidPendingItem.update(item.id, item.data);
      processedUpdates += 1;
      const updateProgress = 40 + Math.round((processedUpdates / Math.max(toUpdate.length, 1)) * 50);
      setProgress(Math.min(updateProgress, 95));
    }

    setProgress(100);
    setStatus(`Importação concluída: ${toCreate.length} novos e ${toUpdate.length} atualizados.`);
    setSuccess(true);
    setImporting(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
            Importar Pendências de Edital
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!file && !importing && (
            <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-cyan-500 transition-colors">
              <input id="bid-pending-file" type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
              <label htmlFor="bid-pending-file" className="cursor-pointer">
                <Upload className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                <p className="text-white font-medium mb-1">Selecione a planilha</p>
                <p className="text-sm text-slate-400">Cada aba será tratada como um projeto</p>
              </label>
            </div>
          )}

          {file && !importing && !success && (
            <Alert className="bg-slate-700 border-slate-600">
              <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
              <AlertDescription className="text-white">Arquivo: <span className="font-medium">{file.name}</span></AlertDescription>
            </Alert>
          )}

          {importing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{status}</span>
                <span className="text-white font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-center gap-2 text-cyan-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Importando dados...</span>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={importing} className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</Button>
          <Button onClick={handleImport} disabled={!file || importing || success} className="bg-cyan-600 hover:bg-cyan-700">
            {importing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importando...</> : <><Upload className="w-4 h-4 mr-2" />Importar</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}