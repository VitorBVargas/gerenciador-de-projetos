import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';

const empty = {
  nome: '',
  objetivo: '',
  data_inicio: '',
  data_fim: '',
  capacidade: 0,
  story_points_planejados: 0,
  status: 'planejada',
};

const STATUS = [
  { value: 'planejada', label: 'Planejada' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluida', label: 'Concluída' },
];

export default function SprintModal({ open, onOpenChange, sprint, projectId, onSaved }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(sprint ? { ...empty, ...sprint } : empty);
  }, [sprint, open]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.nome.trim()) return;
    setSaving(true);
    const payload = {
      ...form,
      project_id: projectId,
      capacidade: Number(form.capacidade) || 0,
      story_points_planejados: Number(form.story_points_planejados) || 0,
    };
    if (sprint?.id) {
      await base44.entities.AgileSprint.update(sprint.id, payload);
    } else {
      await base44.entities.AgileSprint.create(payload);
    }
    setSaving(false);
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>{sprint ? 'Editar Sprint' : 'Nova Sprint'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2">
            <Label className="text-slate-300">Nome *</Label>
            <Input value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Sprint 1" className="bg-slate-800 border-slate-700" />
          </div>
          <div className="col-span-2">
            <Label className="text-slate-300">Objetivo da Sprint</Label>
            <Textarea value={form.objetivo} onChange={(e) => set('objetivo', e.target.value)} className="bg-slate-800 border-slate-700" rows={2} />
          </div>
          <div>
            <Label className="text-slate-300">Data início</Label>
            <Input type="date" value={form.data_inicio || ''} onChange={(e) => set('data_inicio', e.target.value)} className="bg-slate-800 border-slate-700" />
          </div>
          <div>
            <Label className="text-slate-300">Data fim</Label>
            <Input type="date" value={form.data_fim || ''} onChange={(e) => set('data_fim', e.target.value)} className="bg-slate-800 border-slate-700" />
          </div>
          <div>
            <Label className="text-slate-300">Capacidade (horas)</Label>
            <Input type="number" value={form.capacidade} onChange={(e) => set('capacidade', e.target.value)} className="bg-slate-800 border-slate-700" />
          </div>
          <div>
            <Label className="text-slate-300">SP Planejados</Label>
            <Input type="number" value={form.story_points_planejados} onChange={(e) => set('story_points_planejados', e.target.value)} className="bg-slate-800 border-slate-700" />
          </div>
          <div className="col-span-2">
            <Label className="text-slate-300">Status</Label>
            <Select value={form.status} onValueChange={(v) => set('status', v)}>
              <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                {STATUS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="border-slate-700 text-slate-300" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.nome.trim()} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}