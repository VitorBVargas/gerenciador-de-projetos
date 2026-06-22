import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useQuery } from '@tanstack/react-query';

const STATUS_OPTIONS = [
  { value: 'aberto', label: 'Aberto' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'aguardando_cliente', label: 'Aguardando cliente' },
  { value: 'resolvido', label: 'Resolvido' },
  { value: 'fechado', label: 'Fechado' },
];

const PRIORITY_OPTIONS = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
];

export default function ChamadoModal({ open, onOpenChange, chamado, projectId, products }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    numero: '', descricao: '', product_id: '', product_name: '',
    status: 'aberto', prioridade: 'media', responsavel: '',
    data_abertura: '', is_bloqueador: false, notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [selectedVertical, setSelectedVertical] = useState('');

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers', projectId],
    queryFn: () => base44.entities.TeamMember.filter({ project_id: projectId }),
    enabled: !!projectId && open,
  });
  const { data: stakeholders = [] } = useQuery({
    queryKey: ['stakeholders', projectId],
    queryFn: () => base44.entities.Stakeholder.filter({ project_id: projectId }),
    enabled: !!projectId && open,
  });

  // Nomes já presentes na lista (equipe + stakeholders), para detectar valor "fora da lista"
  const peopleNames = [...teamMembers.map(m => m.name), ...stakeholders.map(s => s.name)].filter(Boolean);

  // Verticais distintas presentes nos produtos do projeto
  const verticals = [...new Set((products || []).map(p => p.vertical).filter(Boolean))].sort();
  const productsInVertical = (products || []).filter(p => p.vertical === selectedVertical);

  useEffect(() => {
    if (chamado) {
      setForm({ ...chamado });
      const prod = (products || []).find(p => p.id === chamado.product_id);
      setSelectedVertical(prod?.vertical || '');
    } else {
      setSelectedVertical('');
      setForm({
        numero: '', descricao: '', product_id: '', product_name: '',
        status: 'aberto', prioridade: 'media', responsavel: '',
        data_abertura: new Date().toISOString().split('T')[0],
        is_bloqueador: false, notes: ''
      });
    }
  }, [chamado, open]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleVerticalChange = (vertical) => {
    setSelectedVertical(vertical);
    set('product_id', '');
    set('product_name', '');
  };

  const handleProductChange = (productId) => {
    const product = products.find(p => p.id === productId);
    set('product_id', productId);
    set('product_name', product?.name || '');
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, project_id: projectId };
    if (chamado?.id) {
      await base44.entities.Chamado.update(chamado.id, data);
    } else {
      await base44.entities.Chamado.create(data);
    }
    qc.invalidateQueries({ queryKey: ['chamados', projectId] });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>{chamado ? 'Editar Chamado' : 'Novo Chamado'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-300 text-xs">Número do Chamado *</Label>
              <Input value={form.numero} onChange={e => set('numero', e.target.value)}
                placeholder="ex: CHM-001" className="bg-slate-800 border-slate-600 text-white mt-1" />
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Data de Abertura</Label>
              <Input type="date" value={form.data_abertura} onChange={e => set('data_abertura', e.target.value)}
                className="bg-slate-800 border-slate-600 text-white mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-slate-300 text-xs">Descrição *</Label>
            <Textarea value={form.descricao} onChange={e => set('descricao', e.target.value)}
              placeholder="Descreva o chamado..." rows={3}
              className="bg-slate-800 border-slate-600 text-white mt-1 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-300 text-xs">Vertical</Label>
              <Select value={selectedVertical} onValueChange={handleVerticalChange}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
                  <SelectValue placeholder="Selecionar vertical..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {verticals.map(v => (
                    <SelectItem key={v} value={v} className="text-white hover:bg-slate-700">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Produto</Label>
              <Select value={form.product_id} onValueChange={handleProductChange} disabled={!selectedVertical}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
                  <SelectValue placeholder={selectedVertical ? 'Selecionar produto...' : 'Selecione a vertical primeiro'} />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {productsInVertical.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-white hover:bg-slate-700">{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-slate-300 text-xs">Solicitante</Label>
            <Select value={form.responsavel || ''} onValueChange={v => set('responsavel', v)}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
                <SelectValue placeholder="Selecionar pessoa..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {form.responsavel && !peopleNames.includes(form.responsavel) && (
                  <SelectItem value={form.responsavel} className="text-white hover:bg-slate-700">{form.responsavel}</SelectItem>
                )}
                {teamMembers.length > 0 && (
                  <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">Equipe</div>
                )}
                {[...new Set(teamMembers.map(m => m.name).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')).map(n => (
                  <SelectItem key={`t-${n}`} value={n} className="text-white hover:bg-slate-700">{n}</SelectItem>
                ))}
                {stakeholders.length > 0 && (
                  <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">Stakeholders</div>
                )}
                {[...new Set(stakeholders.map(s => s.name).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')).map(n => (
                  <SelectItem key={`s-${n}`} value={n} className="text-white hover:bg-slate-700">{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-300 text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {STATUS_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-white hover:bg-slate-700">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Prioridade</Label>
              <Select value={form.prioridade} onValueChange={v => set('prioridade', v)}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {PRIORITY_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-white hover:bg-slate-700">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input type="checkbox" id="bloqueador" checked={form.is_bloqueador}
              onChange={e => set('is_bloqueador', e.target.checked)}
              className="w-4 h-4 accent-red-500" />
            <Label htmlFor="bloqueador" className="text-slate-300 text-sm cursor-pointer">
              Marcar como chamado crítico / bloqueador
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.numero || !form.descricao}
              className="bg-blue-600 hover:bg-blue-700">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}