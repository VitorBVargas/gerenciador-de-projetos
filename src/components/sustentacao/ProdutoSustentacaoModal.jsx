import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

const VERTICAL_OPTIONS = [
  { value: 'arrecadacao', label: 'Arrecadação' },
  { value: 'compras', label: 'Compras/Contratos' },
  { value: 'contabil', label: 'Contábil' },
  { value: 'pessoal', label: 'Pessoal' },
  { value: 'educacao', label: 'Educação' },
  { value: 'saude', label: 'Saúde' },
  { value: 'atendimento', label: 'Atendimento' },
  { value: 'plataforma', label: 'Plataforma' },
  { value: 'gerenciamento', label: 'Gerenciamento' },
  { value: 'parceiros', label: 'Parceiros' },
  { value: 'outros', label: 'Outros' },
];

export default function ProdutoSustentacaoModal({ open, onOpenChange, produto, projectId }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', vertical: '', entity: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (produto) {
      setForm({ name: produto.name || '', vertical: produto.vertical || '', entity: produto.entity || '' });
    } else {
      setForm({ name: '', vertical: '', entity: '' });
    }
  }, [produto, open]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, project_id: projectId };
    if (produto?.id) {
      await base44.entities.Product.update(produto.id, data);
    } else {
      await base44.entities.Product.create({ ...data, status: 'pendente', priority: 'media' });
    }
    qc.invalidateQueries({ queryKey: ['products', projectId] });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>{produto ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-slate-300 text-xs">Nome do Produto *</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="ex: IPTU" className="bg-slate-800 border-slate-600 text-white mt-1" />
          </div>

          <div>
            <Label className="text-slate-300 text-xs">Vertical *</Label>
            <Select value={form.vertical} onValueChange={v => set('vertical', v)}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
                <SelectValue placeholder="Selecionar..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {VERTICAL_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-white hover:bg-slate-700">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-300 text-xs">Entidade / Órgão</Label>
            <Input value={form.entity} onChange={e => set('entity', e.target.value)}
              placeholder="ex: PM, CM, IPASI" className="bg-slate-800 border-slate-600 text-white mt-1" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.vertical}
              className="bg-purple-600 hover:bg-purple-700">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}