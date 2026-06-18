import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const TIPOS = [
  { value: 'alinhamento', label: 'Alinhamento' },
  { value: 'revisao', label: 'Revisão' },
  { value: 'apresentacao', label: 'Apresentação' },
  { value: 'emergencial', label: 'Emergencial' },
  { value: 'kickoff', label: 'Kickoff' },
  { value: 'outro', label: 'Outro' },
];

const STATUS = [
  { value: 'agendada', label: 'Agendada' },
  { value: 'realizada', label: 'Realizada' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'reagendada', label: 'Reagendada' },
];

const EMPTY = { titulo: '', cliente: '', tipo: 'alinhamento', data: '', horario: '', participantes: '', responsavel: '', status: 'agendada', objetivo: '', link_gravacao: '' };

export default function ReuniaoModal({ open, onOpenChange, reuniao, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(reuniao ? {
      titulo: reuniao.titulo || '', cliente: reuniao.cliente || '', tipo: reuniao.tipo || 'alinhamento',
      data: reuniao.data || '', horario: reuniao.horario || '', participantes: reuniao.participantes || '',
      responsavel: reuniao.responsavel || '', status: reuniao.status || 'agendada',
      objetivo: reuniao.objetivo || '', link_gravacao: reuniao.link_gravacao || '',
    } : EMPTY);
  }, [reuniao, open]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.titulo || !form.data) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-slate-900 border-slate-700 text-slate-200">
        <DialogHeader>
          <DialogTitle>{reuniao ? 'Editar Reunião' : 'Nova Reunião'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
          <div className="col-span-2 space-y-1">
            <Label className="text-slate-300 text-xs">Título *</Label>
            <Input value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Título da reunião" className="bg-slate-800 border-slate-700" />
          </div>
          <div className="space-y-1">
            <Label className="text-slate-300 text-xs">Tipo</Label>
            <Select value={form.tipo} onValueChange={v => set('tipo', v)}>
              <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-slate-300 text-xs">Status</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-slate-300 text-xs">Data *</Label>
            <Input type="date" value={form.data} onChange={e => set('data', e.target.value)} className="bg-slate-800 border-slate-700" />
          </div>
          <div className="space-y-1">
            <Label className="text-slate-300 text-xs">Horário</Label>
            <Input type="time" value={form.horario} onChange={e => set('horario', e.target.value)} className="bg-slate-800 border-slate-700" />
          </div>
          <div className="space-y-1">
            <Label className="text-slate-300 text-xs">Responsável</Label>
            <Input value={form.responsavel} onChange={e => set('responsavel', e.target.value)} placeholder="Nome" className="bg-slate-800 border-slate-700" />
          </div>
          <div className="space-y-1">
            <Label className="text-slate-300 text-xs">Cliente</Label>
            <Input value={form.cliente} onChange={e => set('cliente', e.target.value)} placeholder="Nome do cliente" className="bg-slate-800 border-slate-700" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-slate-300 text-xs">Participantes</Label>
            <Input value={form.participantes} onChange={e => set('participantes', e.target.value)} placeholder="Nome1, Nome2, Nome3..." className="bg-slate-800 border-slate-700" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-slate-300 text-xs">Objetivo</Label>
            <Textarea value={form.objetivo} onChange={e => set('objetivo', e.target.value)} rows={2} placeholder="Objetivo da reunião..." className="bg-slate-800 border-slate-700 resize-none" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-slate-300 text-xs">Link da gravação</Label>
            <Input value={form.link_gravacao} onChange={e => set('link_gravacao', e.target.value)} placeholder="https://..." className="bg-slate-800 border-slate-700" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.titulo || !form.data} className="bg-blue-600 hover:bg-blue-700">
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}