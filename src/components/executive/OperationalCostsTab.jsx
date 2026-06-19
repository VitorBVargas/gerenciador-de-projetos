import React, { useState, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, TrendingUp, TrendingDown, Minus, DollarSign, AlertCircle, X, Target, Trash2 } from 'lucide-react';
import BudgetForecastModal from './BudgetForecastModal';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, Legend, ReferenceLine,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];
const fmtBRL = (v) => 
  new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL', 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }).format(v || 0);
const fmtMonth = (m, y) => {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[m - 1]}/${String(y).slice(2)}`;
};

// Parse a date string/value from the spreadsheet → {month, year} or null
function parseDateValue(val) {
  if (!val) return null;
  if (val instanceof Date) return { month: val.getMonth() + 1, year: val.getFullYear() };
  
  const s = String(val).trim();
  
  // Formato ISO: YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return { month: parseInt(iso[2], 10), year: parseInt(iso[1], 10) };
  
  // Formato BR Completo: DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) return { month: parseInt(dmy[2], 10), year: parseInt(dmy[3], 10) };

  // Formato BR Curto: MM/YYYY
  const my = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (my) return { month: parseInt(my[1], 10), year: parseInt(my[2], 10) };
  
  // Formato Extenso: jan/23, fev/2024
  const mNames = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };
  const named = s.match(/^([a-záàâãéêíóôõúç]{3})[^\d]*(\d{2,4})/i);
  if (named) {
    const m = mNames[named[1].toLowerCase()];
    const y = named[2].length === 2 ? 2000 + parseInt(named[2], 10) : parseInt(named[2], 10);
    if (m) return { month: m, year: y };
  }
  return null;
}

function parseNumber(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  
  // Limpa R$, espaços e caracteres invisíveis
  let s = String(val).replace(/[R$\s]/ig, '').trim();
  
  // Se for padrão BR com ponto de milhar (ex: 1.500,00 ou -1.500,00)
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
  } 
  // Se tiver só vírgula separando decimais (ex: 1500,50)
  else if (s.includes(',') && !s.includes('.')) {
    s = s.replace(',', '.');
  }
  // Se for algo muito sujo, remove o que não for dígito, ponto ou sinal negativo
  else {
    s = s.replace(/[^\d.-]/g, '');
  }

  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// Find column index by name (case-insensitive, partial match)
function findCol(headers, ...names) {
  for (const name of names) {
    const idx = headers.findIndex(h => h && String(h).toLowerCase().includes(name.toLowerCase()));
    if (idx >= 0) return idx;
  }
  return -1;
}

// Parse a PIVOT sheet (months across columns, categories down rows).
// Returns array of { category, month, year, value }.
// - categoryColHeader: text that identifies the header cell of the category column
//   (e.g. "Descrição Conta Financeira" or "Tipo Ticket Pai")
function parsePivotSheet(rows, categoryColHeader) {
  // 1) Locate the header row: the row whose cells contain the category header label
  let headerIdx = -1, catCol = -1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const r = rows[i];
    if (!r) continue;
    for (let c = 0; c < r.length; c++) {
      const cell = String(r[c] || '').toLowerCase().trim();
      if (cell.includes(categoryColHeader.toLowerCase())) {
        headerIdx = i;
        catCol = c;
        break;
      }
    }
    if (headerIdx >= 0) break;
  }
  if (headerIdx < 0) return [];

  // 2) Map each column to a {month, year} by parsing the header cells (the date columns)
  const headerRow = rows[headerIdx];
  const monthCols = []; // { col, month, year }
  for (let c = 0; c < headerRow.length; c++) {
    if (c === catCol) continue;
    const dateVal = parseDateValue(headerRow[c]);
    if (dateVal) monthCols.push({ col: c, month: dateVal.month, year: dateVal.year });
  }
  if (monthCols.length === 0) return [];

  // 3) Walk data rows, reading each month column's value for the category in catCol.
  //    The "Total Resultado" column has no parseable date, so it is naturally excluded.
  const out = [];
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const category = row[catCol] ? String(row[catCol]).trim() : null;
    if (!category) continue;
    // Skip total/summary rows
    if (/^total/i.test(category)) continue;
    for (const mc of monthCols) {
      const value = parseNumber(row[mc.col]);
      if (!value || value === 0) continue;
      out.push({ category, month: mc.month, year: mc.year, value: Math.abs(value) });
    }
  }
  return out;
}

// ─── Import Modal ───────────────────────────────────────────────────────────────
function ImportModal({ projects, onClose, onSuccess }) {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [importing, setImporting] = useState(false);
  const [file, setFile] = useState(null);

  const activeProjects = projects.filter(p => p.status !== 'concluido');
  const concludedProjects = projects.filter(p => p.status === 'concluido');

  const handleImport = useCallback(async () => {
    if (!selectedProjectId || !file) {
      toast.error('Selecione o projeto e o arquivo');
      return;
    }
    setImporting(true);
    try {
      const user = await base44.auth.me();
      const project = projects.find(p => p.id === selectedProjectId);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });

      const allRecords = [];
      const fmtLabel = (month, year) => `${String(month).padStart(2, '0')}/${year}`;

      const baseRecord = (extra) => ({
        project_id: selectedProjectId,
        project_name: project.name,
        portfolio_name: project.portfolio || '',
        city: project.city || '',
        import_date: new Date().toISOString(),
        import_user: user?.full_name || user?.email || 'Sistema',
        ...extra,
      });

      // ── Sheet: Dinâmica Custos Gerais (PIVOT: meses nas colunas) ──
      const geralSheetName = workbook.SheetNames.find(n => /din[aâ]mica custos gerais/i.test(n));
      if (geralSheetName) {
        const sheet = workbook.Sheets[geralSheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
        const parsed = parsePivotSheet(rows, 'Descrição Conta Financeira');
        parsed.forEach(({ category, month, year, value }) => {
          allRecords.push(baseRecord({
            category,
            ticket_parent: null,
            month,
            year,
            month_year: fmtLabel(month, year),
            value,
            cost_type: 'geral',
          }));
        });
      }

      // ── Sheet: Dinâmica Custo Pessoal (PIVOT: meses nas colunas) ──
      const pessoalSheetName = workbook.SheetNames.find(n => /din[aâ]mica custo pessoal/i.test(n));
      if (pessoalSheetName) {
        const sheet = workbook.Sheets[pessoalSheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
        const parsed = parsePivotSheet(rows, 'Tipo Ticket Pai');
        parsed.forEach(({ category, month, year, value }) => {
          allRecords.push(baseRecord({
            category,
            ticket_parent: category,
            month,
            year,
            month_year: fmtLabel(month, year),
            value,
            cost_type: 'operacional',
          }));
        });
      }

      if (allRecords.length === 0) {
        toast.error('Nenhum dado encontrado. Certifique-se que a planilha tem as abas "Dinâmica Custos Gerais" e "Dinâmica Custo Pessoal".');
        setImporting(false);
        return;
      }

      // Upsert: sum values per category+month+year+cost_type key before saving
      const aggregated = {};
      allRecords.forEach(r => {
        const key = `${r.cost_type}__${r.category}__${r.month}__${r.year}`;
        if (!aggregated[key]) aggregated[key] = { ...r };
        else aggregated[key].value += r.value;
      });
      const finalRecords = Object.values(aggregated);

      // 1. Busca os registros antigos APENAS deste projeto selecionado
      const existing = await base44.entities.ProjectOperationalCosts.filter({ project_id: selectedProjectId });
      
      // 2. Remove de forma limpa os registros antigos para evitar dados duplicados/órfãos
      for (const e of existing) {
        await base44.entities.ProjectOperationalCosts.delete(e.id);
      }

      // 3. Insere os novos dados consolidados da planilha atual
      let created = 0;
      for (const record of finalRecords) {
        // Garantindo que o valor final inserido preserve as casas decimais corretas
        record.value = Number(record.value.toFixed(2));
        record.import_version = 1; // Como limpamos o passado, este lote vira a versão atual estável
        
        await base44.entities.ProjectOperationalCosts.create(record);
        created++;
      }

      toast.success(`Importação concluída com sucesso! ${created} registros atualizados.`);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Erro na importação: ' + err.message);
    } finally {
      setImporting(false);
    }
  }, [selectedProjectId, file, projects, onSuccess, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-800 border border-slate-600 rounded-xl w-full max-w-lg p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Importar Planilha de Custos</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-3 text-xs text-slate-300 space-y-1">
          <p className="font-medium text-slate-200">Abas esperadas na planilha:</p>
          <p>• <span className="text-amber-300">Dinâmica Custos Gerais</span> — hospedagem, viagens, etc.</p>
          <p>• <span className="text-emerald-300">Dinâmica Custo Pessoal</span> — custo por tipo de ticket</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Projeto *</label>
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-sm text-slate-200"
            >
              <option value="">Selecione um projeto...</option>
              {activeProjects.length > 0 && (
                <optgroup label="── Projetos Ativos ──">
                  {activeProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </optgroup>
              )}
              {concludedProjects.length > 0 && (
                <optgroup label="── Projetos Concluídos ──">
                  {concludedProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </optgroup>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Arquivo (Excel) *</label>
            <div
              className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors"
              onClick={() => document.getElementById('cost-file-input').click()}
            >
              {file ? (
                <div className="text-green-400 text-sm font-medium">{file.name}</div>
              ) : (
                <div className="space-y-1">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-slate-300 text-sm">Clique para selecionar</p>
                  <p className="text-slate-500 text-xs">.xlsx, .xls</p>
                </div>
              )}
              <input id="cost-file-input" type="file" accept=".xlsx,.xls" className="hidden"
                onChange={e => setFile(e.target.files[0] || null)} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="ghost" onClick={onClose} className="text-slate-400">Cancelar</Button>
          <Button onClick={handleImport} disabled={importing || !selectedProjectId || !file} className="bg-blue-600 hover:bg-blue-700">
            {importing ? 'Importando...' : 'Importar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Category Table (shared by all sub-tabs) ─────────────────────────────────────
function CategoryTable({ costs }) {
  const totalCost = costs.reduce((s, c) => s + (c.value || 0), 0);
  const byCategory = useMemo(() => {
    const map = {};
    costs.forEach(c => {
      if (!map[c.category]) map[c.category] = 0;
      map[c.category] += c.value || 0;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([cat, val]) => ({ cat, val }));
  }, [costs]);

const monthlyData = useMemo(() => {
    const map = {};
    costs.forEach(c => {
      const key = `${c.year}-${String(c.month).padStart(2, '0')}`;
      if (!map[key]) map[key] = { key, label: fmtMonth(c.month, c.year), total: 0, operacional: 0, geral: 0 };
      
      // Armazena e soma tratando floats com precisão de centavos
      map[key].total = Number((map[key].total + (c.value || 0)).toFixed(2));
      if (c.cost_type === 'operacional') {
        map[key].operacional = Number((map[key].operacional + (c.value || 0)).toFixed(2));
      } else {
        map[key].geral = Number((map[key].geral + (c.value || 0)).toFixed(2));
      }
    });
    const sorted = Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
    let accum = 0;
    return sorted.map(m => { 
      accum = Number((accum + m.total).toFixed(2)); 
      return { ...m, acumulado: accum }; 
    });
  }, [costs]);

  if (costs.length === 0) {
    return <p className="text-slate-500 text-sm text-center py-8">Nenhum dado nesta categoria.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Monthly chart */}
      <Card className="bg-slate-800 border-slate-600">
        <CardHeader><CardTitle className="text-white text-sm">Evolução Mensal</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" stroke="#94a3b8" style={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" style={{ fontSize: 10 }} tickFormatter={v => new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v)} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff' }} formatter={v => fmtBRL(v)} />
              <Bar dataKey="total" fill="#3b82f6" name="Mensal" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category breakdown */}
      <Card className="bg-slate-800 border-slate-600">
        <CardHeader><CardTitle className="text-white text-sm">Por Categoria</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-sm">
              <thead className="bg-slate-700 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs text-slate-300 font-semibold">Categoria</th>
                  <th className="px-4 py-2 text-right text-xs text-slate-300 font-semibold">Total</th>
                  <th className="px-4 py-2 text-right text-xs text-slate-300 font-semibold">%</th>
                </tr>
              </thead>
              <tbody>
                {byCategory.map((r, i) => (
                  <tr key={i} className="border-t border-slate-700 hover:bg-slate-700/30">
                    <td className="px-4 py-2 text-slate-200">{r.cat}</td>
                    <td className="px-4 py-2 text-right text-white font-medium">{fmtBRL(r.val)}</td>
                    <td className="px-4 py-2 text-right text-slate-400">{totalCost > 0 ? ((r.val / totalCost) * 100).toFixed(1) : 0}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-700/50">
                <tr>
                  <td className="px-4 py-2 text-xs text-slate-300 font-semibold">Total</td>
                  <td className="px-4 py-2 text-right text-white font-bold">{fmtBRL(totalCost)}</td>
                  <td className="px-4 py-2 text-right text-slate-400">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Forecast Badges (inline comparison) ─────────────────────────────────────────
function ForecastBadges({ real, realGeral, realPessoal, forecast }) {
  const prevTotal = (forecast.cost_pessoal || 0) + (forecast.cost_geral || 0);
  const diffTotal = real - prevTotal;
  const diffGeral = realGeral - (forecast.cost_geral || 0);
  const diffPessoal = realPessoal - (forecast.cost_pessoal || 0);
  const pct = prevTotal > 0 ? ((diffTotal / prevTotal) * 100).toFixed(0) : null;

  return (
    <div className="flex flex-wrap gap-2 text-xs mt-1">
      <span className="text-slate-500">Previsto {forecast.year}:</span>
      <span className={cn("font-semibold", diffTotal > 0 ? "text-red-400" : "text-green-400")}>
        {diffTotal > 0 ? '+' : ''}{fmtBRL(diffTotal)} {pct ? `(${pct > 0 ? '+' : ''}${pct}%)` : ''}
      </span>
      <span className="text-slate-600">|</span>
      <span className="text-amber-400">Logísticas: {diffGeral > 0 ? '+' : ''}{fmtBRL(diffGeral)}</span>
      <span className="text-slate-600">|</span>
      <span className="text-emerald-400">Pessoal: {diffPessoal > 0 ? '+' : ''}{fmtBRL(diffPessoal)}</span>
    </div>
  );
}

// ─── Comparison block (one estimate set vs real) ────────────────────────────────
function ComparisonBlock({ title, accentClass, prevGeral, prevPessoal, real, realGeral, realPessoal }) {
  const prevTotal = (prevPessoal || 0) + (prevGeral || 0);
  const diffTotal = real - prevTotal;
  const diffGeral = realGeral - (prevGeral || 0);
  const diffPessoal = realPessoal - (prevPessoal || 0);

  const cards = [
    { label: 'Custo Logísticas', real: realGeral, prev: prevGeral || 0, diff: diffGeral, colorReal: 'text-amber-400', colorPrev: 'text-amber-200' },
    { label: 'Custo Pessoal', real: realPessoal, prev: prevPessoal || 0, diff: diffPessoal, colorReal: 'text-emerald-400', colorPrev: 'text-emerald-200' },
    { label: 'Custo Total', real: real, prev: prevTotal, diff: diffTotal, colorReal: 'text-blue-400', colorPrev: 'text-blue-200' },
  ];

  return (
    <div className="space-y-3">
      <h4 className={cn("text-sm font-bold uppercase tracking-wider", accentClass)}>{title} vs Real</h4>

      {/* KPI comparison cards */}
      <div className="grid grid-cols-3 gap-3">
        {cards.map(item => (
          <Card key={item.label} className="bg-slate-800 border-slate-600">
            <CardContent className="p-3 space-y-1">
              <div className="text-xs text-slate-400 font-medium">{item.label}</div>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-[10px] text-slate-500">Real</div>
                  <div className={cn("text-sm font-bold", item.colorReal)}>{fmtBRL(item.real)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500">Previsto</div>
                  <div className={cn("text-sm", item.colorPrev)}>{fmtBRL(item.prev)}</div>
                </div>
              </div>
              <div className={cn("text-xs font-semibold text-center rounded px-1", item.diff > 0 ? "bg-red-900/30 text-red-400" : "bg-green-900/30 text-green-400")}>
                {item.diff > 0 ? '▲' : '▼'} {fmtBRL(Math.abs(item.diff))} {item.prev > 0 ? `(${Math.abs((item.diff / item.prev) * 100).toFixed(0)}%)` : ''}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bar chart */}
      <Card className="bg-slate-800 border-slate-600">
        <CardContent className="pt-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={[
              { name: 'Custo Logísticas', Real: realGeral, Previsto: prevGeral || 0 },
              { name: 'Custo Pessoal', Real: realPessoal, Previsto: prevPessoal || 0 },
              { name: 'Custo Total', Real: real, Previsto: prevTotal },
            ]} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" style={{ fontSize: 10 }} tickFormatter={v => new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v)} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff' }} formatter={v => fmtBRL(v)} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Bar dataKey="Previsto" fill="#7c3aed" opacity={0.7} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Real" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Comparative Chart ────────────────────────────────────────────────────────────
function ComparativeAnalysis({ real, realGeral, realPessoal, allForecasts }) {
  if (!allForecasts || allForecasts.length === 0) return null;

  const latestForecast = allForecasts[allForecasts.length - 1];

  return (
    <div className="space-y-6 pt-2">
      <ComparisonBlock
        title="Estimado Portfólio"
        accentClass="text-cyan-300"
        prevGeral={latestForecast.cost_geral_portfolio || 0}
        prevPessoal={latestForecast.cost_pessoal_portfolio || 0}
        real={real}
        realGeral={realGeral}
        realPessoal={realPessoal}
      />

      <ComparisonBlock
        title="Estimado Pré-Vendas"
        accentClass="text-purple-300"
        prevGeral={latestForecast.cost_geral || 0}
        prevPessoal={latestForecast.cost_pessoal || 0}
        real={real}
        realGeral={realGeral}
        realPessoal={realPessoal}
      />

      {latestForecast.notes && (
        <div className="bg-slate-700/30 rounded-lg px-3 py-2 text-xs text-slate-400">
          <span className="text-slate-300 font-medium">Obs (previsão {latestForecast.year}): </span>{latestForecast.notes}
        </div>
      )}
    </div>
  );
}

// ─── Accumulated Chart with Forecast Reference Line ──────────────────────────────
function AccumulatedChart({ monthlyData, forecastTotal, title = 'Evolução Acumulada', dataKey = 'acumulado', lineColor = '#a78bfa', lineName = 'Acumulado' }) {
  // Find the month when accumulated first exceeded forecast
  let exceededLabel = null;
  if (forecastTotal) {
    const hit = monthlyData.find(m => m[dataKey] >= forecastTotal);
    if (hit) exceededLabel = hit.label;
  }

  return (
    <Card className="bg-slate-800 border-slate-600">
      <CardHeader>
        <CardTitle className="text-white text-sm flex items-center gap-2">
          {title}
          {exceededLabel && (
            <span className="text-xs font-normal text-red-400 bg-red-900/30 px-2 py-0.5 rounded-full">
              Superou previsto em {exceededLabel}
            </span>
          )}
          {forecastTotal && !exceededLabel && (
            <span className="text-xs font-normal text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">
              Dentro do previsto
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="label" stroke="#94a3b8" style={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" style={{ fontSize: 10 }} tickFormatter={v => new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v)} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff' }}
              formatter={(v, name) => [fmtBRL(v), name]}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
            {forecastTotal && (
              <ReferenceLine
                y={forecastTotal}
                stroke="#f43f5e"
                strokeDasharray="6 3"
                strokeWidth={2}
                label={{ value: `Previsto: ${new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(forecastTotal)}`, fill: '#f43f5e', fontSize: 11, position: 'insideTopRight' }}
              />
            )}
            <Line type="monotone" dataKey={dataKey} stroke={lineColor} strokeWidth={2.5} dot={{ fill: lineColor, r: 3 }} name={lineName} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Project Detail Inline (accordion content) ──────────────────────────────────
function ProjectDetailInline({ costs, forecast, allForecasts }) {
  const [activeTab, setActiveTab] = useState('geral');

  const operacional = useMemo(() => costs.filter(c => c.cost_type === 'operacional'), [costs]);
  const geral = useMemo(() => costs.filter(c => c.cost_type === 'geral'), [costs]);

  const totalCost = costs.reduce((s, c) => s + (c.value || 0), 0);
  const totalOp = operacional.reduce((s, c) => s + (c.value || 0), 0);
  const totalGeral = geral.reduce((s, c) => s + (c.value || 0), 0);

  const monthlyData = useMemo(() => {
    const map = {};
    costs.forEach(c => {
      const key = `${c.year}-${String(c.month).padStart(2, '0')}`;
      if (!map[key]) map[key] = { key, label: fmtMonth(c.month, c.year), total: 0, operacional: 0, geral: 0 };
      map[key].total += c.value || 0;
      if (c.cost_type === 'operacional') map[key].operacional += c.value || 0;
      else map[key].geral += c.value || 0;
    });
    const sorted = Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
    let accum = 0;
    let accumGeral = 0;
    return sorted.map(m => { accum += m.total; accumGeral += m.geral; return { ...m, acumulado: accum, acumuladoGeral: accumGeral }; });
  }, [costs]);

  const hasForecast = allForecasts && allForecasts.length > 0;
  const forecastTotal = forecast ? (forecast.cost_pessoal || 0) + (forecast.cost_geral || 0) : null;
  const forecastGeral = forecast ? (forecast.cost_geral || 0) : null;

  const tabs = [
    { id: 'gerais', label: 'Custo Logísticas', count: geral.length, total: totalGeral, color: 'text-amber-400' },
    { id: 'pessoal', label: 'Custo Pessoal', count: operacional.length, total: totalOp, color: 'text-emerald-400' },
    { id: 'geral', label: 'Custo Total', count: costs.length, total: totalCost, color: 'text-blue-400' },
    ...(hasForecast ? [{ id: 'comparativo', label: '📊 Previsto vs Real', total: null, color: 'text-purple-400' }] : []),
  ];

  return (
    <div className="p-5 space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-amber-900/20 border-amber-700/40">
          <CardContent className="p-3 text-center">
            <div className="text-sm font-bold text-amber-400">{fmtBRL(totalGeral)}</div>
            <div className="text-xs text-slate-400 mt-0.5">Custo Logísticas</div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-900/20 border-emerald-700/40">
          <CardContent className="p-3 text-center">
            <div className="text-sm font-bold text-emerald-400">{fmtBRL(totalOp)}</div>
            <div className="text-xs text-slate-400 mt-0.5">Custo Pessoal</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-600">
          <CardContent className="p-3 text-center">
            <div className="text-sm font-bold text-white">{fmtBRL(totalCost)}</div>
            <div className="text-xs text-slate-400 mt-0.5">Custo Total</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-700">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2",
              activeTab === tab.id
                ? "border-blue-500 text-white bg-slate-800"
                : "border-transparent text-slate-400 hover:text-slate-200"
            )}
          >
            {tab.label}
            {tab.total !== null && tab.total !== undefined && (
              <span className={cn("ml-2 text-xs font-bold", tab.color)}>{fmtBRL(tab.total)}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'geral' && (
        <div className="space-y-4">
          {/* Gráfico mensal (sem acumulado) */}
          <Card className="bg-slate-800 border-slate-600">
            <CardHeader><CardTitle className="text-white text-sm">Evolução Mensal — Total (Logísticas + Pessoal)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" stroke="#94a3b8" style={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" style={{ fontSize: 10 }} tickFormatter={v => new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v)} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff' }} formatter={v => fmtBRL(v)} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                  <Bar dataKey="geral" stackId="a" fill="#f59e0b" name="Custo Logísticas" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="operacional" stackId="a" fill="#10b981" name="Custo Pessoal" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico acumulativo com linha do previsto */}
          <AccumulatedChart monthlyData={monthlyData} forecastTotal={forecastTotal} />

          {/* Pie split */}
          {totalCost > 0 && (
            <Card className="bg-slate-800 border-slate-600">
              <CardHeader><CardTitle className="text-white text-sm">Distribuição por Tipo</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
                  <RechartsPie>
                    <Pie
                      data={[
                        { name: 'Custo Logísticas', value: totalGeral },
                        { name: 'Custo Pessoal', value: totalOp },
                      ]}
                      cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                      dataKey="value" nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false} style={{ fontSize: 11 }}
                    >
                      <Cell fill="#f59e0b" />
                      <Cell fill="#10b981" />
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff' }} formatter={v => fmtBRL(v)} />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'gerais' && (
        <div className="space-y-4">
          <AccumulatedChart
            monthlyData={monthlyData}
            forecastTotal={forecastGeral}
            title="Evolução Acumulada — Custo Logísticas"
            dataKey="acumuladoGeral"
            lineColor="#f59e0b"
            lineName="Acumulado Logísticas"
          />
          <CategoryTable costs={geral} />
        </div>
      )}
      {activeTab === 'pessoal' && <CategoryTable costs={operacional} />}
      {activeTab === 'comparativo' && (
        <ComparativeAnalysis
          real={totalCost}
          realGeral={totalGeral}
          realPessoal={totalOp}
          allForecasts={allForecasts}
        />
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────────
export default function OperationalCostsTab({ projects, isAdmin }) {
  const [importOpen, setImportOpen] = useState(false);
  const [forecastOpen, setForecastOpen] = useState(false);
  const [expandedProject, setExpandedProject] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();

  const { data: allCosts = [], isLoading } = useQuery({
    queryKey: ['operational_costs'],
    queryFn: () => base44.entities.ProjectOperationalCosts.list('-import_date', 50000),
    staleTime: 2 * 60 * 1000,
  });

  const handleDeleteCosts = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const records = allCosts.filter(c => c.project_id === deleteTarget.project_id);
      for (const r of records) {
        await base44.entities.ProjectOperationalCosts.delete(r.id);
      }
      toast.success(`Custos de "${deleteTarget.project_name}" removidos (${records.length} registros)`);
      queryClient.invalidateQueries({ queryKey: ['operational_costs'] });
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao remover custos: ' + err.message);
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, allCosts, queryClient]);

  const { data: allForecasts = [] } = useQuery({
    queryKey: ['budget_forecasts'],
    queryFn: () => base44.entities.ProjectBudgetForecast.list(),
    staleTime: 2 * 60 * 1000,
  });

  const projectCostCards = useMemo(() => {
    const map = {};
    allCosts.forEach(c => {
      if (!map[c.project_id]) {
        map[c.project_id] = {
          project_id: c.project_id,
          project_name: c.project_name,
          total: 0,
          totalGeral: 0,
          totalPessoal: 0,
          records: 0,
          lastImport: c.import_date,
          months: new Set(),
        };
      }
      const p = map[c.project_id];
      p.total += c.value || 0;
      p.records++;
      if (c.cost_type === 'geral') p.totalGeral += c.value || 0;
      else p.totalPessoal += c.value || 0;
      if (c.import_date > p.lastImport) p.lastImport = c.import_date;
      p.months.add(`${c.year}-${c.month}`);
    });

    // Attach latest forecast per project
    const forecastMap = {};
    allForecasts.forEach(f => {
      if (!forecastMap[f.project_id] || f.year > forecastMap[f.project_id].year) {
        forecastMap[f.project_id] = f;
      }
    });

    return Object.values(map).map(p => ({
      ...p,
      avgMonthly: p.months.size > 0 ? p.total / p.months.size : 0,
      forecast: forecastMap[p.project_id] || null,
    })).sort((a, b) => b.total - a.total);
  }, [allCosts, allForecasts]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <p className="text-red-300 font-semibold">Você não possui permissão para acessar esta área.</p>
          <p className="text-slate-400 text-sm">Apenas administradores podem visualizar os Custos Operacionais.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-center text-slate-400 py-12">Carregando custos operacionais...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Custos Operacionais</h2>
          <p className="text-sm text-slate-400 mt-1">Análise por projeto — Custo Logísticas (viagens/hospedagem) + Custo Pessoal (tickets).</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button onClick={() => setForecastOpen(true)} className="bg-purple-600 hover:bg-purple-700">
            <Target className="w-4 h-4 mr-2" />
            Custo Previsto
          </Button>
          <Button onClick={() => setImportOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Upload className="w-4 h-4 mr-2" />
            Importar Planilha
          </Button>
        </div>
      </div>

      {allCosts.length === 0 ? (
        <Card className="bg-slate-800 border-slate-600">
          <CardContent className="py-16 text-center">
            <DollarSign className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-300 font-medium">Nenhum dado importado ainda</p>
            <p className="text-slate-500 text-sm mt-1">Clique em "Importar Planilha" para começar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {projectCostCards.map(p => {
            const isExpanded = expandedProject === p.project_id;
            const projectCosts = allCosts.filter(c => c.project_id === p.project_id);
            return (
              <Card key={p.project_id} className="bg-slate-800 border-slate-600 overflow-hidden">
                <CardContent
                  className="p-4 cursor-pointer hover:bg-slate-700/40 transition-colors"
                  onClick={() => setExpandedProject(isExpanded ? null : p.project_id)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <h4 className="text-sm font-semibold text-white truncate">{p.project_name}</h4>
                      <Badge className="bg-blue-600/20 text-blue-300 border-blue-600/30 text-xs flex-shrink-0">
                        {p.records} reg.
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="text-xs text-slate-400">Total</div>
                        <div className="text-sm font-bold text-white">{fmtBRL(p.total)}</div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <div className="text-xs text-slate-400">Custo Logísticas</div>
                        <div className="text-sm font-medium text-amber-400">{fmtBRL(p.totalGeral)}</div>
                      </div>
                      <div className="text-right hidden md:block">
                        <div className="text-xs text-slate-400">Custo Pessoal</div>
                        <div className="text-sm font-medium text-emerald-400">{fmtBRL(p.totalPessoal)}</div>
                      </div>
                      <div className="text-right hidden md:block">
                        <div className="text-xs text-slate-400">Média Mensal</div>
                        <div className="text-xs text-blue-400">{fmtBRL(p.avgMonthly)}</div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }}
                        className="p-1.5 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors flex-shrink-0"
                        title="Remover custos deste projeto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className={cn("transition-transform duration-200", isExpanded ? "rotate-180" : "rotate-0")}>
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-2 sm:hidden text-xs">
                    <div><span className="text-slate-400">Total: </span><span className="text-white font-bold">{fmtBRL(p.total)}</span></div>
                    <div><span className="text-slate-400">Logísticas: </span><span className="text-amber-400">{fmtBRL(p.totalGeral)}</span></div>
                  </div>
                </CardContent>

                {/* Forecast bar (inline, always visible when forecast exists) */}
                {p.forecast && !isExpanded && (
                  <div className="px-4 pb-3">
                    <ForecastBadges real={p.total} realGeral={p.totalGeral} realPessoal={p.totalPessoal} forecast={p.forecast} />
                  </div>
                )}

                {isExpanded && (
                  <div className="border-t border-slate-700 bg-slate-900/50">
                    <ProjectDetailInline costs={projectCosts} forecast={p.forecast} allForecasts={allForecasts.filter(f => f.project_id === p.project_id)} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {importOpen && (
        <ImportModal
          projects={projects}
          onClose={() => setImportOpen(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['operational_costs'] })}
        />
      )}

      {forecastOpen && (
        <BudgetForecastModal
          projects={projects}
          onClose={() => setForecastOpen(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['budget_forecasts'] })}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null); }}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remover custos operacionais</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja remover todos os custos operacionais de "{deleteTarget?.project_name}" ({deleteTarget?.records} registros)? Esta operação é irreversível e não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDeleteCosts(); }} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}