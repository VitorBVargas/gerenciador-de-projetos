import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { X, Target } from 'lucide-react';
import { toast } from 'sonner';

const fmtBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);

function parseBRLInput(s) {
  if (!s) return 0;
  const clean = String(s).replace(/[^\d,]/g, '').replace(',', '.');
  return parseFloat(clean) || 0;
}

function formatInputBRL(v) {
  if (!v && v !== 0) return '';
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(v);
}

export default function BudgetForecastModal({ projects, onClose, onSuccess }) {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [costPessoal, setCostPessoal] = useState('');
  const [costGeral, setCostGeral] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState(null);

  const activeProjects = projects.filter(p => p.status !== 'concluido');
  const concludedProjects = projects.filter(p => p.status === 'concluido');

  // Load existing forecast when project+year changes
  useEffect(() => {
    if (!selectedProjectId) { setExisting(null); return; }
    base44.entities.ProjectBudgetForecast.filter({ project_id: selectedProjectId, year })
      .then(results => {
        if (results && results.length > 0) {
          const r = results[0];
          setExisting(r);
          setCostPessoal(formatInputBRL(r.cost_pessoal || 0));
          setCostGeral(formatInputBRL(r.cost_geral || 0));
          setNotes(r.notes || '');
        } else {
          setExisting(null);
          setCostPessoal('');
          setCostGeral('');
          setNotes('');
        }
      })
      .catch(() => {});
  }, [selectedProjectId, year]);

  const handleSave = async () => {
    if (!selectedProjectId) { toast.error('Selecione um projeto'); return; }
    setSaving(true);
    try {
      const user = await base44.auth.me();
      const project = projects.find(p => p.id === selectedProjectId);
      const payload = {
        project_id: selectedProjectId,
        project_name: project?.name || '',
        year: Number(year),
        cost_pessoal: parseBRLInput(costPessoal),
        cost_geral: parseBRLInput(costGeral),
        notes,
        created_by: user?.full_name || user?.email || '',
      };
      if (existing) {
        await base44.entities.ProjectBudgetForecast.update(existing.id, payload);
        toast.success('Custo previsto atualizado!');
      } else {
        await base44.entities.ProjectBudgetForecast.create(payload);
        toast.success('Custo previsto salvo!');
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const totalPrevisto = parseBRLInput(costPessoal) + parseBRLInput(costGeral);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-800 border border-slate-600 rounded-xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold text-white">Custo Previsto</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {existing && (
          <div className="bg-purple-900/20 border border-purple-700/40 rounded-lg px-3 py-2 text-xs text-purple-300">
            Editando previsão existente para {existing.year} — {existing.project_name}
          </div>
        )}

        <div className="space-y-4">
          {/* Project */}
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

          {/* Year */}
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Ano</label>
            <input
              type="number"
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              min={2020} max={2035}
              className="w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-sm text-slate-200"
            />
          </div>

          {/* Costs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Custo Pessoal Previsto (R$)</label>
              <input
                type="text"
                value={costPessoal}
                onChange={e => setCostPessoal(e.target.value)}
                placeholder="0,00"
                className="w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-sm text-emerald-300"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Custo Geral Previsto (R$)</label>
              <input
                type="text"
                value={costGeral}
                onChange={e => setCostGeral(e.target.value)}
                placeholder="0,00"
                className="w-full h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-sm text-amber-300"
              />
            </div>
          </div>

          {/* Total preview */}
          {totalPrevisto > 0 && (
            <div className="bg-slate-700/50 rounded-lg p-3 flex justify-between items-center">
              <span className="text-xs text-slate-400">Total Previsto</span>
              <span className="text-sm font-bold text-purple-300">{fmtBRL(totalPrevisto)}</span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Observações</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex: Orçamento aprovado em reunião de planejamento..."
              className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="ghost" onClick={onClose} className="text-slate-400">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !selectedProjectId} className="bg-purple-600 hover:bg-purple-700">
            {saving ? 'Salvando...' : existing ? 'Atualizar' : 'Salvar Previsão'}
          </Button>
        </div>
      </div>
    </div>
  );
}