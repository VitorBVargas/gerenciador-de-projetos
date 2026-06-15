import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Upload, ArrowLeft, Loader2, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import EditalDashboard from '@/components/edital/EditalDashboard';
import EditalTable from '@/components/edital/EditalTable';
import FecharChamadosImporter from '@/components/edital/FecharChamadosImporter';
import { useCurrentUser, isPrivileged } from '@/lib/permissions';

const PORTFOLIO_LABELS = {
  grandes_contas_sc_mg: 'Grandes Contas SC/MG',
  grandes_contas_sc_sp: 'Grandes Contas SC/SP',
  medias_contas: 'Médias Contas',
};

export default function PendenciaEdital() {
  const urlParams = new URLSearchParams(window.location.search);
  const portfolio = urlParams.get('portfolio') || '';

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isImporting, setIsImporting] = useState(false);
  const queryClient = useQueryClient();
  const { user: currentUser, loading: loadingUser } = useCurrentUser();
  const allowed = isPrivileged(currentUser);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['editalItems', portfolio],
    queryFn: () => base44.entities.EditalItem.filter({ portfolio }),
    enabled: !!portfolio && allowed,
    staleTime: 60 * 1000,
  });

  const projects = useMemo(() =>
    [...new Set(items.map(i => i.projeto).filter(Boolean))].sort(),
    [items]
  );

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellStyles: true });

      // Build existing map for dedup: key = projeto|numero_item
      const existingMap = {};
      items.forEach(i => { existingMap[`${i.projeto}|${i.numero_item}`] = i; });

      const toCreate = [];
      const toUpdate = [];

      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        // Skip sheets without PROJETO column (like "Melhorias importantes")
        const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] || [];
        if (!headers.includes('PROJETO') && !headers.includes('Projeto')) continue;

        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        // Build hyperlink map: cell address -> URL
        const hyperlinkMap = {};
        for (const cellAddr in sheet) {
          if (sheet[cellAddr] && sheet[cellAddr].l) {
            hyperlinkMap[cellAddr] = sheet[cellAddr].l.Target || '';
          }
        }

        // Find CHAMADO column letter for hyperlink extraction
        const headerRow = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] || [];
        const chamadoColIdx = headerRow.findIndex(h => typeof h === 'string' && h.toUpperCase() === 'CHAMADO');
        const chamadoColLetter = chamadoColIdx >= 0
          ? XLSX.utils.encode_col(chamadoColIdx)
          : null;

        rows.forEach((row, rowIdx) => {
          const projeto = String(row['PROJETO'] || row['Projeto'] || sheetName).trim();
          const chamadoText = String(row['CHAMADO'] || row['Chamado'] || '').trim();

          // Extract hyperlink URL for chamado
          let chamadoLink = '';
          if (chamadoColLetter) {
            const cellAddr = `${chamadoColLetter}${rowIdx + 2}`; // +2: 1 for header, 1 for 1-indexed
            chamadoLink = hyperlinkMap[cellAddr] || '';
          }
          if (!chamadoLink && chamadoText.startsWith('http')) chamadoLink = chamadoText;

          // Normalize NÚMERO DO ITEM — can be float (139.0) or weird date string ('2001-01-17 00:00:00')
          let numeroItem = row['NÚMERO DO ITEM'] ?? row['Número do Item'] ?? row['NUMERO DO ITEM'] ?? '';
          if (typeof numeroItem === 'number') {
            // Float like 139.0 → "139"
            numeroItem = Number.isInteger(numeroItem)
              ? String(numeroItem)
              : String(Math.round(numeroItem * 1000) / 1000);
          } else {
            numeroItem = String(numeroItem).trim();
            // Remove date artifact like '2001-01-17 00:00:00' that came from Excel serial
            // (Excel serial 17 = Jan 17, 1900 — just use the day number)
            const dateArtifact = numeroItem.match(/^\d{4}-0[01]-\d{2} 00:00:00$/);
            if (dateArtifact) {
              const parts = numeroItem.split('-');
              numeroItem = String(parseInt(parts[2], 10)); // just the day
            }
          }

          if (!numeroItem && !chamadoText) return;

          // Normalize DATA PREVISTA
          let dataPrevista = row['DATA PREVISTA'] ?? row['Data Prevista'] ?? '';
          if (dataPrevista && typeof dataPrevista === 'string') {
            dataPrevista = dataPrevista.trim();
            // '2026-04-29 00:00:00' → '2026-04-29'
            if (dataPrevista.includes(' ')) dataPrevista = dataPrevista.split(' ')[0];
            // DD/MM/YYYY → YYYY-MM-DD
            if (dataPrevista.includes('/')) {
              const parts = dataPrevista.split('/');
              if (parts.length === 3) dataPrevista = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
            }
          } else if (typeof dataPrevista === 'number') {
            // Excel serial date → JS date
            const d = XLSX.SSF.parse_date_code(dataPrevista);
            if (d) dataPrevista = `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
            else dataPrevista = '';
          } else {
            dataPrevista = '';
          }

          const itemData = {
            portfolio,
            projeto,
            chamado: chamadoText,
            chamado_link: chamadoLink,
            tipo: String(row['TIPO'] || row['Tipo'] || '').trim(),
            vertical: String(row['VERTICAL'] || row['Vertical'] || '').trim(),
            sistema: String(row['SISTEMA'] || row['Sistema'] || '').trim(),
            numero_item: numeroItem || chamadoText,
            item_edital: String(row['ITEM DO EDITAL'] || row['Item do Edital'] || '').trim(),
            status: String(row['STATUS'] || row['Status'] || '').trim(),
            data_prevista: dataPrevista || null,
          };

          const key = `${projeto}|${itemData.numero_item}`;
          const existing = existingMap[key];
          if (existing) {
            // Only update if something changed
            const changed = Object.keys(itemData).some(k => itemData[k] !== (existing[k] || ''));
            if (changed) toUpdate.push({ id: existing.id, data: itemData });
          } else {
            toCreate.push(itemData);
          }
        });
      }

      for (const u of toUpdate) {
        await base44.entities.EditalItem.update(u.id, u.data);
      }
      if (toCreate.length > 0) {
        await base44.entities.EditalItem.bulkCreate(toCreate);
      }

      queryClient.invalidateQueries({ queryKey: ['editalItems', portfolio] });
      toast.success(`${toCreate.length} novos criados, ${toUpdate.length} atualizados.`);
    } catch (err) {
      toast.error('Erro ao importar: ' + err.message);
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md text-center bg-slate-800 border border-slate-700 rounded-xl p-8">
          <ClipboardList className="w-12 h-12 text-orange-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Acesso restrito</h2>
          <p className="text-sm text-slate-400 mb-6">
            Esta área está disponível apenas para administradores, gerentes e coordenadores.
          </p>
          <Link
            to={createPageUrl('Home')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar para o início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800/80 border-b border-slate-700 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to={createPageUrl('PortfolioSelect?mode=edital')}
              className="text-slate-400 hover:text-white flex items-center gap-1.5 text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Portfólios
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-orange-400" />
                Pendência Edital
              </h1>
              <p className="text-xs text-slate-400">{PORTFOLIO_LABELS[portfolio] || portfolio}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {items.length > 0 && (
              <span className="text-xs text-slate-400">{items.length} itens</span>
            )}
            {items.length > 0 && (
              <FecharChamadosImporter
                items={items}
                portfolio={portfolio}
                onDone={() => queryClient.invalidateQueries({ queryKey: ['editalItems', portfolio] })}
              />
            )}
            <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white transition-colors ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}>
              {isImporting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Upload className="w-4 h-4" />}
              Importar Planilha
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            </label>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-400">
            <ClipboardList className="w-16 h-16 mb-4 text-slate-600" />
            <p className="text-lg font-medium text-slate-300 mb-2">Nenhum item importado</p>
            <p className="text-sm">Importe uma planilha Excel para começar.</p>
            <p className="text-xs mt-2 text-slate-500">Cada aba da planilha representa um projeto/cidade.</p>
            <div className="mt-4 text-xs text-slate-500 bg-slate-800 rounded-lg p-4 max-w-md text-left space-y-1">
              <p className="font-medium text-slate-400 mb-2">Colunas esperadas:</p>
              <p>• Projeto, Chamado, Vertical, Sistema</p>
              <p>• Número do Item, Item do Edital</p>
              <p>• Status, Data Prevista (DD/MM/AAAA)</p>
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="overflow-x-auto mb-4">
              <TabsList className="bg-slate-800 border border-slate-700 flex h-auto gap-1 p-1 w-max min-w-full">
                <TabsTrigger value="dashboard" className="data-[state=active]:bg-orange-600 text-xs whitespace-nowrap">
                  📊 Dashboard
                </TabsTrigger>
                <TabsTrigger value="lista" className="data-[state=active]:bg-orange-600 text-xs whitespace-nowrap">
                  📋 Lista Geral
                </TabsTrigger>
                {projects.map(p => (
                  <TabsTrigger
                    key={p}
                    value={`proj_${p}`}
                    className="data-[state=active]:bg-orange-600 text-xs whitespace-nowrap max-w-[160px] truncate"
                    title={p}
                  >
                    {p}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="dashboard">
              <EditalDashboard items={items} />
            </TabsContent>
            <TabsContent value="lista">
              <EditalTable items={items} portfolio={portfolio} showProject={true} />
            </TabsContent>
            {projects.map(p => (
              <TabsContent key={p} value={`proj_${p}`}>
                <EditalTable
                  items={items.filter(i => i.projeto === p)}
                  portfolio={portfolio}
                  showProject={false}
                  showFilters={true}
                  projectName={p}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  );
}