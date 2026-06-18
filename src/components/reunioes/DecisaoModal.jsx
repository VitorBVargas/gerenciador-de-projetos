import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const EMPTY = { descricao: '', data: '', responsavel: '', impacto: 'medio', status: 'pendente' };

export default function DecisaoModal({ open, onOpenChange, decisao, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(decisao ? {
      descricao: decisao.descricao || '', data: decisao.data || new Date().toISOString().split('T')[0],
      responsavel: decisao.responsavel || '', impacto: decisao.impacto || 'medio', status: decisao.status || 'pendente',
    } : { ...EMPTY, data: new Date().toISOString().split('T')[0] });
  }, [decisao, open]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.descricao) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] bg-slate-900 border-slate-700 text-slate-200">
        <DialogHeader>
          <DialogTitle>{decisao ? 'Editar Decisão' : 'Registrar Decisão'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-slate-300 text-xs">Decisão *</Label>
            <Textarea value={form.descricao} onChange={e => set('descricao', e.target.value)} rows={3} placeholder="Descreva a decisão..." className="bg-slate-800 border-slate-700 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Data</Label>
              <Input type="date" value={form.data} onChange={e => set('data', e.target.value)} className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Responsável</Label>
              <Input value={form.responsavel} onChange={e => set('responsavel', e.target.value)} placeholder="Nome" className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Impacto</Label>
              <Select value={form.impacto} onValueChange={v => set('impacto', v)}>
                <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="baixo">Baixo</SelectItem>
                  <SelectItem value="medio">Médio</SelectItem>
                  <SelectItem value="alto">Alto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.descricao} className="bg-blue-600 hover:bg-blue-700">
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}