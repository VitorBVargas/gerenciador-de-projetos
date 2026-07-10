import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Lock } from 'lucide-react';

export default function BlockItemModal({ open, onOpenChange, item, onConfirm }) {
  const [form, setForm] = useState({ motivo: '', dependencia: '', responsavel: '', previsao: '' });

  useEffect(() => {
    if (item) setForm({
      motivo: item.bloqueio_motivo || '',
      dependencia: item.bloqueio_dependencia || '',
      responsavel: item.bloqueio_responsavel || '',
      previsao: item.bloqueio_previsao || '',
    });
  }, [item]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Lock className="w-4 h-4 text-red-400" /> Bloquear Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-slate-300">Motivo do bloqueio *</Label>
            <Textarea value={form.motivo} onChange={(e) => set('motivo', e.target.value)} placeholder="Descreva o motivo" className="bg-slate-800 border-slate-700 mt-1" />
          </div>
          <div>
            <Label className="text-slate-300">Dependência</Label>
            <Input value={form.dependencia} onChange={(e) => set('dependencia', e.target.value)} placeholder="Do que depende para desbloquear" className="bg-slate-800 border-slate-700 mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-300">Responsável</Label>
              <Input value={form.responsavel} onChange={(e) => set('responsavel', e.target.value)} placeholder="Responsável pelo desbloqueio" className="bg-slate-800 border-slate-700 mt-1" />
            </div>
            <div>
              <Label className="text-slate-300">Previsão desbloqueio</Label>
              <Input type="date" value={form.previsao} onChange={(e) => set('previsao', e.target.value)} className="bg-slate-800 border-slate-700 mt-1" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="bg-red-600 hover:bg-red-700" disabled={!form.motivo.trim()} onClick={() => onConfirm(form)}>Bloquear</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}