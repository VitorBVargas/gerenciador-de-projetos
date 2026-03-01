import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ImportTasksModal({ open, onOpenChange, onImport, productName }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null); // { sections: [{name, tasks:[]}] }
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const data = [
      ['Tipo', 'Nome'],
      ['Etapa', 'Exemplo de Etapa 1'],
      ['Tarefa', 'Primeira tarefa desta etapa'],
      ['Tarefa', 'Segunda tarefa desta etapa'],
      ['Etapa', 'Exemplo de Etapa 2'],
      ['Tarefa', 'Tarefa da segunda etapa'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Largura das colunas
    ws['!cols'] = [{ wch: 12 }, { wch: 50 }];

    // Estilo de cabeçalho
    XLSX.utils.book_append_sheet(wb, ws, 'Tarefas');
    XLSX.writeFile(wb, 'planilha_modelo_tarefas.xlsx');
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setError('');
    parsePreview(selected);
  };

  const parsePreview = async (f) => {
    try {
      const data = await f.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const sections = [];
      let currentSection = null;
      let totalTasks = 0;

      for (const row of rawData) {
        const colA = (row[0] || '').toString().trim().toLowerCase();
        const colB = (row[1] || '').toString().trim();
        if (!colA || !colB) continue;

        if (colA === 'etapa') {
          currentSection = { name: colB, tasks: [] };
          sections.push(currentSection);
        } else if (colA === 'tarefa') {
          if (!currentSection) {
            currentSection = { name: '(Sem etapa)', tasks: [] };
            sections.push(currentSection);
          }
          currentSection.tasks.push(colB);
          totalTasks++;
        }
      }

      if (totalTasks === 0) {
        setError('Nenhuma tarefa encontrada. Verifique se a planilha usa "Etapa" e "Tarefa" na Coluna A.');
        setPreview(null);
      } else {
        setPreview({ sections, totalTasks });
        setError('');
      }
    } catch {
      setError('Erro ao ler o arquivo. Verifique se é um .xlsx válido.');
      setPreview(null);
    }
  };

  const handleImport = async () => {
    if (!file || !preview) return;
    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      await onImport(rawData);
      onOpenChange(false);
      setFile(null);
      setPreview(null);
    } catch {
      setError('Erro ao importar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            Importar Tarefas via Excel
            {productName && <span className="text-slate-400 font-normal text-sm">— {productName}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instruções + Download */}
          <div className="bg-slate-700/50 rounded-lg p-4 space-y-2 border border-slate-600/50">
            <p className="text-sm text-slate-300 font-medium">Formato da planilha:</p>
            <div className="text-xs text-slate-400 space-y-1">
              <div className="grid grid-cols-2 gap-2 font-mono bg-slate-800 rounded p-2">
                <span className="text-cyan-400">Coluna A</span>
                <span className="text-slate-300">Coluna B</span>
                <span className="text-yellow-300">Etapa</span>
                <span className="text-slate-300">Nome da Etapa</span>
                <span className="text-green-300">Tarefa</span>
                <span className="text-slate-300">Nome da Tarefa</span>
              </div>
              <p className="text-slate-500 mt-1">As tarefas serão agrupadas dentro da etapa mais recente acima delas.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-blue-500/40 text-blue-400 hover:bg-blue-500/10 mt-2"
              onClick={handleDownloadTemplate}
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar Planilha Modelo
            </Button>
          </div>

          {/* Upload */}
          <div
            className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            {file ? (
              <p className="text-sm text-blue-400 font-medium">{file.name}</p>
            ) : (
              <p className="text-sm text-slate-400">Clique para selecionar ou arraste o arquivo .xlsx</p>
            )}
          </div>

          {/* Erro */}
          {error && (
            <div className="flex items-start gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="bg-slate-700/30 rounded-lg border border-slate-600/50 p-4 space-y-2 max-h-52 overflow-y-auto">
              <div className="flex items-center gap-2 text-green-400 mb-3">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">{preview.totalTasks} tarefas encontradas em {preview.sections.length} etapa(s)</span>
              </div>
              {preview.sections.map((sec, i) => (
                <div key={i}>
                  <p className="text-xs text-cyan-400 font-semibold uppercase">{sec.name} ({sec.tasks.length} tarefas)</p>
                  <ul className="ml-3 mt-1 space-y-0.5">
                    {sec.tasks.slice(0, 3).map((t, j) => (
                      <li key={j} className="text-xs text-slate-400 truncate">• {t}</li>
                    ))}
                    {sec.tasks.length > 3 && (
                      <li className="text-xs text-slate-500">... e mais {sec.tasks.length - 3}</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* Aviso de substituição */}
          {preview && (
            <p className="text-xs text-yellow-400/80 bg-yellow-500/10 border border-yellow-500/20 rounded px-3 py-2">
              ⚠️ A importação irá substituir todas as tarefas existentes do produto.
            </p>
          )}

          {/* Botões */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 border-slate-600 text-slate-300" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={!preview || loading}
              onClick={handleImport}
            >
              {loading ? 'Importando...' : 'Importar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}