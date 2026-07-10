import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { TIPO_META } from './backlogMeta';
import { AlertTriangle, Users } from 'lucide-react';

export default function SprintPlanningModal({ open, onOpenChange, items, sprints, onSaved }) {
  const [sprintId, setSprintId] = useState('');
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  const sprint = sprints?.find(s => s.id === sprintId);
  const backlog = useMemo(() => (items || []).filter(i => !i.sprint_id && i.tipo !== 'epic' && i.tipo !== 'feature'), [items]);

  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const selItems = backlog.filter(i => selected.includes(i.id));
  const totalSP = selItems.reduce((s, i) => s + (i.story_points || 0), 0);
  const totalHoras = selItems.reduce((s, i) => s + (i.estimativa_horas || 0), 0);
  const pessoas = new Set(selItems.map(i => i.responsavel).filter(Boolean)).size;
  const capacidade = sprint?.capacidade || 0;
  const carga = capacidade > 0 ? Math.round((totalHoras / capacidade) * 100) : 0;

  const cargaColor = carga > 120 ? 'text-red-400' : carga > 100 ? 'text-yellow-400' : 'text-emerald-400';
  const cargaBar = carga > 120 ? 'bg-red-500' : carga > 100 ? 'bg-yellow-500' : 'bg-emerald-500';

  const handleSave = async () => {
    if (!sprintId || selected.length === 0) return;
    setSaving(true);
    await Promise.all(selected.map(id => base44.entities.AgileBacklog.update(id, { sprint_id: sprintId, status: 'to_do' })));
    if (sprint) {
      await base44.entities.AgileSprint.update(sprintId, {
        story_points_planejados: (sprint.story_points_planejados || 0) + totalSP,
      });
    }
    setSaving(false);
    setSelected([]);
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Planejar Sprint</DialogTitle>
        </DialogHeader>

        <div className="mb-3">
          <Select value={sprintId} onValueChange={setSprintId}>
            <SelectTrigger className="bg-slate-800 border-slate-700 max-w-xs"><SelectValue placeholder="Selecione a sprint" /></SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 text-white">
              {(sprints || []).map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 overflow-hidden">
          {/* Backlog */}
          <div className="md:col-span-2 overflow-y-auto pr-1 space-y-2">
            {backlog.length === 0 && <p className="text-slate-400 text-sm py-8 text-center">Nenhum item no backlog geral.</p>}
            {backlog.map(item => {
              const meta = TIPO_META[item.tipo] || TIPO_META.story;
              const Icon = meta.icon;
              return (
                <div key={item.id} className="flex items-center gap-3 bg-slate-800/60 rounded-lg p-3 border border-slate-700">
                  <Checkbox checked={selected.includes(item.id)} onCheckedChange={() => toggle(item.id)} />
                  <Icon className={`w-4 h-4 flex-shrink-0 ${meta.color}`} />
                  <span className="text-sm text-white flex-1 truncate">{item.titulo}</span>
                  <Badge variant="outline" className="bg-indigo-500/15 text-indigo-300 border-indigo-500/40">{item.story_points || 0} SP</Badge>
                  <span className="text-xs text-slate-400">{item.estimativa_horas || 0}h</span>
                </div>
              );
            })}
          </div>

          {/* Painel lateral */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 space-y-4 h-fit">
            <h4 className="font-semibold text-white">Carga da Sprint</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Capacidade</span><span className="text-white">{capacidade}h</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Horas estimadas</span><span className="text-white">{totalHoras}h</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Story Points</span><span className="text-white">{totalSP}</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-400 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Pessoas</span><span className="text-white">{pessoas}</span></div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-400">Carga</span>
                <span className={cargaColor}>{carga}%</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full ${cargaBar}`} style={{ width: `${Math.min(carga, 100)}%` }} />
              </div>
            </div>

            {capacidade > 0 && carga > 120 && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/40 rounded-lg p-2 text-xs text-red-300">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> Carga acima de 120% da capacidade!
              </div>
            )}
            {capacidade > 0 && carga > 100 && carga <= 120 && (
              <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/40 rounded-lg p-2 text-xs text-yellow-300">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> Capacidade ultrapassada.
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-3">
          <Button variant="outline" className="border-slate-700 text-slate-300" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !sprintId || selected.length === 0} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? 'Salvando...' : `Adicionar ${selected.length} item(ns)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}