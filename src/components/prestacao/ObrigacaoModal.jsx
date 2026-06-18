import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const STATUS_OPTIONS = [
  { value: 'nao_iniciado', label: 'Não iniciado' },
  { value: 'em_elaboracao', label: 'Em elaboração' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'aceito', label: 'Aceito' },
  { value: 'rejeitado', label: 'Rejeitado' },
];

const EMPTY = { nome: '', competencia: '', status: 'nao_iniciado', responsavel: '', data_limite: '', data_envio: '', observacoes: '', motivo_rejeicao: '' };

export default function ObrigacaoModal({ open, onOpenChange, obrigacao, onSave, currentUser }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (obrigacao) {
      setForm({
        nome: obrigacao.nome || '',
        competencia: obrigacao.competencia || '',
        status: obrigacao.status || 'nao_iniciado',
        responsavel: obrigacao.responsavel || '',
        data_limite: obrigacao.data_limite || '',
        data_envio: obrigacao.data_envio || '',
        observacoes: obrigacao.observacoes || '',
        motivo_rejeicao: obrigacao.motivo_rejeicao || '',
      });
    } else {
      setForm(EMPTY);
    }
  }, [obrigacao, open]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.nome || !form.competencia) return;
    setSaving(true);
    const history = [];
    if (obrigacao) {
      ['status', 'responsavel', 'data_limite'].forEach(field => {
        if (obrigacao[field] !== form[field]) {
          history.push({ date: new Date().toISOString(), field, from: obrigacao[field] || '', to: form[field] || '', user: currentUser?.full_name || '' });
        }
      });
    }
    const payload = { ...form };
    if (history.length > 0) payload.history = [...(obrigacao?.history || []), ...history];
    await onSave(payload);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-slate-900 border-slate-700 text-slate-200">
        <DialogHeader>
          <DialogTitle>{obrigacao ? 'Editar Obrigação' : 'Nova Obrigação'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2 space-y-1">
            <Label className="text-slate-300 text-xs">Nome *</Label>
            <Input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: SICOM" className="bg-slate-800 border-slate-700" />
          </div>
          <div className="space-y-1">
            <Label className="text-slate-300 text-xs">Competência *</Label>
            <Input value={form.competencia} onChange={e => set('competencia', e.target.value)} placeholder="05/2026" className="bg-slate-800 border-slate-700" />
          </div>
          <div className="space-y-1">
            <Label className="text-slate-300 text-xs">Status</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-slate-300 text-xs">Responsável</Label>
            <Input value={form.responsavel} onChange={e => set('responsavel', e.target.value)} placeholder="Nome do responsável" className="bg-slate-800 border-slate-700" />
          </div>
          <div className="space-y-1">
            <Label className="text-slate-300 text-xs">Data Limite</Label>
            <Input type="date" value={form.data_limite} onChange={e => set('data_limite', e.target.value)} className="bg-slate-800 border-slate-700" />
          </div>
          <div className="space-y-1">
            <Label className="text-slate-300 text-xs">Data Envio</Label>
            <Input type="date" value={form.data_envio} onChange={e => set('data_envio', e.target.value)} className="bg-slate-800 border-slate-700" />
          </div>
          {form.status === 'rejeitado' && (
            <div className="col-span-2 space-y-1">
              <Label className="text-slate-300 text-xs">Motivo da Rejeição</Label>
              <Input value={form.motivo_rejeicao} onChange={e => set('motivo_rejeicao', e.target.value)} placeholder="Descreva o motivo" className="bg-slate-800 border-slate-700" />
            </div>
          )}
          <div className="col-span-2 space-y-1">
            <Label className="text-slate-300 text-xs">Observações</Label>
            <Textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={3} placeholder="Ocorrências, justificativas..." className="bg-slate-800 border-slate-700 resize-none" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.nome || !form.competencia} className="bg-blue-600 hover:bg-blue-700">
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}