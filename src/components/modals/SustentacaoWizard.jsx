import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, LifeBuoy } from 'lucide-react';

const EMPTY = {
  name: '',
  city: '',
  manager: '',
  sustentacao_start_date: new Date().toISOString().split('T')[0],
  notes: '',
};

export default function SustentacaoWizard({ open, onOpenChange, portfolioFilter, onComplete }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      await base44.entities.Project.create({
        ...form,
        portfolio: portfolioFilter,
        project_type: 'sustentacao',
        status: 'sustentacao',
      });
      onComplete?.();
      setForm(EMPTY);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-slate-900 border-slate-700 text-slate-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-purple-400" />
            Novo Projeto de Sustentação
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-slate-300 text-xs">Nome do Projeto *</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Sustentação Ibirité/MG" className="bg-slate-800 border-slate-700" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Cidade</Label>
              <Input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Cidade/UF" className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Responsável</Label>
              <Input value={form.manager} onChange={e => set('manager', e.target.value)} placeholder="Nome" className="bg-slate-800 border-slate-700" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-slate-300 text-xs">Início da Sustentação</Label>
            <Input type="date" value={form.sustentacao_start_date} onChange={e => set('sustentacao_start_date', e.target.value)} className="bg-slate-800 border-slate-700" />
          </div>
          <div className="space-y-1">
            <Label className="text-slate-300 text-xs">Observações</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Observações..." className="bg-slate-800 border-slate-700 resize-none" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.name} className="bg-purple-600 hover:bg-purple-700">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Criar Projeto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}