import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function RecognitionImporter({ open, onOpenChange }) {
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResults(null);
  };

  const normalizeStr = (str) => {
    if (!str) return '';
    return str.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/prefeitura municipal (de|do|da|dos|das) /gi, '')
      .replace(/municipio (de|do|da|dos|das) /gi, '')
      .replace(/prefeitura (de|do|da|dos|das) /gi, '')
      .replace(/município (de|do|da|dos|das) /gi, '')
      .trim();
  };

  const namesMatch = (sheetName, projectName) => {
    const a = normalizeStr(sheetName);
    const b = normalizeStr(projectName);
    return b.includes(a) || a.includes(b);
  };

  const productsMatch = (sheetProduct, productName) => {
    const a = sheetProduct.toLowerCase().trim();
    const b = productName.toLowerCase().trim();
    return b.includes(a) || a.includes(b);
  };

  const handleImport = async () => {
    if (!file) return;
    setProcessing(true);

    try {
      // Parse Excel
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      // Load all projects and products
      const [projects, products] = await Promise.all([
        base44.entities.Project.list(),
        base44.entities.Product.list()
      ]);

      const matched = [];
      const notFound = [];
      const alreadyExists = [];

      // Load existing recognitions to avoid duplicates
      const existingRecognitions = await base44.entities.RecognizedRevenue.list();

      for (const row of rows) {
        const accountName = row['Nome da conta'];
        const productName = row['Produto'];
        const dateRaw = row['Data'];
        const valor = row['Valor'] || 0;
        const tipo = (row['Tipo'] || '').toLowerCase().includes('recorr') ? 'recorrente' : 'implantacao';

        if (!accountName || !productName) continue;

        // Parse date
        let recognitionMonth;
        if (typeof dateRaw === 'number') {
          // Excel serial date
          const d = XLSX.SSF.parse_date_code(dateRaw);
          recognitionMonth = `${d.y}-${String(d.m).padStart(2, '0')}-01`;
        } else {
          const d = new Date(dateRaw);
          if (!isNaN(d)) {
            recognitionMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
          }
        }

        if (!recognitionMonth) {
          notFound.push({ accountName, productName, reason: 'Data inválida' });
          continue;
        }

        // Find matching project
        const matchedProject = projects.find(p => namesMatch(accountName, p.name));
        if (!matchedProject) {
          notFound.push({ accountName, productName, reason: 'Projeto não encontrado' });
          continue;
        }

        // Find matching product within project
        const projectProducts = products.filter(p => p.project_id === matchedProject.id);
        const matchedProduct = projectProducts.find(p => productsMatch(productName, p.name));
        if (!matchedProduct) {
          notFound.push({ accountName, productName, reason: `Produto não encontrado no projeto "${matchedProject.name}"` });
          continue;
        }

        // Check for duplicate
        const isDuplicate = existingRecognitions.some(r =>
          r.product_id === matchedProduct.id &&
          r.recognition_month === recognitionMonth &&
          r.type === tipo
        );

        if (isDuplicate) {
          alreadyExists.push({ accountName, productName, projectName: matchedProject.name });
          continue;
        }

        // Create recognition
        await base44.entities.RecognizedRevenue.create({
          project_id: matchedProject.id,
          product_id: matchedProduct.id,
          amount: valor,
          recognition_month: recognitionMonth,
          type: tipo,
        });

        matched.push({
          accountName,
          productName,
          projectName: matchedProject.name,
          recognitionMonth
        });
      }

      setResults({ matched, notFound, alreadyExists });
    } catch (err) {
      alert('Erro ao processar planilha: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResults(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Importar Reconhecimentos</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-slate-400 text-sm">
            Selecione a planilha de reconhecimento. O sistema irá cruzar os dados de <strong className="text-white">Nome da conta</strong> e <strong className="text-white">Produto</strong> com os projetos e produtos cadastrados.
          </p>

          <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="recognition-file"
            />
            <label htmlFor="recognition-file" className="cursor-pointer">
              <Upload className="w-10 h-10 mx-auto mb-3 text-slate-500" />
              {file ? (
                <p className="text-green-400 font-medium">{file.name}</p>
              ) : (
                <p className="text-slate-400">Clique para selecionar o arquivo Excel</p>
              )}
            </label>
          </div>

          {file && !results && (
            <Button
              onClick={handleImport}
              disabled={processing}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {processing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" /> Iniciar Importação</>
              )}
            </Button>
          )}

          {results && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-green-400">{results.matched.length}</p>
                  <p className="text-xs text-slate-400">Importados</p>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
                  <AlertCircle className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-yellow-400">{results.alreadyExists.length}</p>
                  <p className="text-xs text-slate-400">Já existiam</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
                  <XCircle className="w-5 h-5 text-red-400 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-red-400">{results.notFound.length}</p>
                  <p className="text-xs text-slate-400">Não encontrados</p>
                </div>
              </div>

              {/* Matched */}
              {results.matched.length > 0 && (
                <div>
                  <h3 className="text-green-400 font-medium mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Reconhecimentos importados
                  </h3>
                  <div className="bg-slate-900 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
                    {results.matched.map((r, i) => (
                      <div key={i} className="text-xs text-slate-300">
                        <span className="text-white">{r.projectName}</span> → {r.productName}
                        <span className="text-slate-500 ml-2">{r.recognitionMonth?.substring(0, 7)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Not found */}
              {results.notFound.length > 0 && (
                <div>
                  <h3 className="text-red-400 font-medium mb-2 flex items-center gap-2">
                    <XCircle className="w-4 h-4" /> Não encontrados
                  </h3>
                  <div className="bg-slate-900 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
                    {results.notFound.map((r, i) => (
                      <div key={i} className="text-xs">
                        <span className="text-white">{r.accountName}</span> / {r.productName}
                        <span className="text-red-400 ml-2">— {r.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleClose} className="w-full bg-slate-700 hover:bg-slate-600">
                Fechar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}