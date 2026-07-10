import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  suggestPrioritization, suggestRefinement, suggestSplit, suggestMerge, suggestStoryPoints,
  applyPrioritization, applyRefinement, applyStoryPoints, applySplit, applyMerge,
} from './backlogRefineAI';

const TITLES = {
  priorizacao: 'Sugerir Priorização (RICE)',
  refinamento: 'Sugerir Refinamento',
  divisao: 'Sugerir Divisão',
  mesclagem: 'Sugerir Mesclagem',
  story_points: 'Sugerir Story Points',
};

export default function BacklogAIModal({ open, onOpenChange, mode, items, projectId, splitTarget, onApplied }) {
  const [phase, setPhase] = useState('loading'); // loading | review | applying | error
  const [data, setData] = useState(null);
  const [checked, setChecked] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !mode) return;
    setPhase('loading'); setData(null); setChecked({}); setError('');
    (async () => {
      try {
        let r;
        if (mode === 'priorizacao') r = await suggestPrioritization(items);
        else if (mode === 'refinamento') r = await suggestRefinement(items);
        else if (mode === 'story_points') r = await suggestStoryPoints(items);
        else if (mode === 'mesclagem') r = await suggestMerge(items);
        else if (mode === 'divisao') r = await suggestSplit(splitTarget);
        setData(r);
        // marca tudo por padrão
        const init = {};
        (Array.isArray(r) ? r : []).forEach((_, i) => { init[i] = true; });
        setChecked(init);
        setPhase('review');
      } catch (e) {
        setError(e?.message || 'Falha ao consultar a IA.');
        setPhase('error');
      }
    })();
  }, [open, mode]); // eslint-disable-line

  const toggle = (i) => setChecked(c => ({ ...c, [i]: !c[i] }));

  const apply = async () => {
    setPhase('applying');
    try {
      const selected = (Array.isArray(data) ? data : []).filter((_, i) => checked[i]);
      if (mode === 'priorizacao') await applyPrioritization(selected);
      else if (mode === 'refinamento') await applyRefinement(selected);
      else if (mode === 'story_points') await applyStoryPoints(selected);
      else if (mode === 'divisao') await applySplit({ projectId, original: splitTarget, novos: selected });
      else if (mode === 'mesclagem') { for (const g of selected) await applyMerge({ group: g, items }); }
      toast.success('Sugestões aplicadas.');
      onApplied?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e?.message || 'Erro ao aplicar.');
      setPhase('review');
    }
  };

  const renderItem = (s, i) => {
    if (mode === 'priorizacao') return <span className="text-sm text-slate-200">{s.titulo} → <Badge className="bg-emerald-600/20 text-emerald-300">{s.prioridade}</Badge>{s.rice?.score != null && <span className="text-cyan-300 text-xs ml-2">RICE {s.rice.score}</span>}{s.justificativa && <span className="block text-xs text-slate-500 mt-0.5">{s.justificativa}</span>}</span>;
    if (mode === 'story_points') return <span className="text-sm text-slate-200">{s.titulo} → <Badge className="bg-indigo-600/20 text-indigo-300">{s.story_points} pts</Badge>{s.justificativa && <span className="block text-xs text-slate-500 mt-0.5">{s.justificativa}</span>}</span>;
    if (mode === 'refinamento') return <span className="text-sm text-slate-200">{s.titulo}{s.criterio_aceite && <span className="block text-xs text-slate-500 mt-0.5">Aceite: {s.criterio_aceite}</span>}</span>;
    if (mode === 'divisao') return <span className="text-sm text-slate-200">{s.titulo} <Badge className="bg-indigo-600/20 text-indigo-300">{s.story_points} pts</Badge>{s.criterio_aceite && <span className="block text-xs text-slate-500 mt-0.5">{s.criterio_aceite}</span>}</span>;
    if (mode === 'mesclagem') return <span className="text-sm text-slate-200">Mesclar {s.ids.length} itens → "{s.titulo_sugerido}"{s.motivo && <span className="block text-xs text-slate-500 mt-0.5">{s.motivo}</span>}</span>;
    return null;
  };

  const list = Array.isArray(data) ? data : [];
  const selectedCount = list.filter((_, i) => checked[i]).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (phase !== 'applying' && phase !== 'loading') onOpenChange(v); }}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-emerald-400" /> {TITLES[mode] || 'IA'}</DialogTitle>
        </DialogHeader>

        {phase === 'loading' && <div className="py-16 flex flex-col items-center gap-3"><Loader2 className="w-8 h-8 text-emerald-400 animate-spin" /><p className="text-slate-400 text-sm">A IA está analisando o backlog…</p></div>}
        {phase === 'applying' && <div className="py-16 flex flex-col items-center gap-3"><Loader2 className="w-8 h-8 text-emerald-400 animate-spin" /><p className="text-slate-400 text-sm">Aplicando sugestões…</p></div>}
        {phase === 'error' && <div className="py-10 text-center text-red-400 text-sm">{error}</div>}

        {phase === 'review' && (
          <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1">
            {list.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">A IA não encontrou sugestões {mode === 'mesclagem' ? 'de mesclagem (nenhum item duplicado).' : '.'}</p>
            ) : list.map((s, i) => (
              <label key={i} className="flex items-start gap-3 bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 cursor-pointer">
                <Checkbox checked={!!checked[i]} onCheckedChange={() => toggle(i)} className="mt-0.5" />
                {renderItem(s, i)}
              </label>
            ))}
          </div>
        )}

        {phase === 'review' && list.length > 0 && (
          <DialogFooter>
            <Button variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={apply} disabled={selectedCount === 0}><CheckCircle2 className="w-4 h-4 mr-1" /> Aplicar {selectedCount}</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}