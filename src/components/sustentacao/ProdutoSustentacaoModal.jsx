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

// Mesma lista fixa de produtos por vertical usada no wizard de sustentação
const PRODUCTS_BY_VERTICAL = {
  arrecadacao: ['IPTU', 'ISS', 'ITBI', 'Dívida Ativa', 'NFS-e', 'Fiscalização', 'Alvará', 'CAE', 'Arrecadação Geral', 'Prestação de Contas'],
  compras: ['Compras', 'Contratos', 'Licitações', 'Patrimônio', 'Almoxarifado', 'Frota', 'Prestação de Contas'],
  contabil: ['Contabilidade', 'Orçamento', 'Tesouraria', 'eSocial Contábil', 'Convênios'],
  pessoal: ['Folha de Pagamento', 'RH', 'Ponto Eletrônico', 'eSocial Pessoal', 'Portal do Servidor', 'Prestação de Contas'],
  educacao: ['Biblioteca', 'Senso', 'Educação', 'Pais e Alunos', 'Merenda', 'Transporte', 'Professores'],
  saude: ['Prontuário Eletrônico', 'Regulação', 'Farmácia', 'Vigilância Sanitária', 'SISAB'],
  atendimento: ['Protocolo', 'Ouvidoria', 'Portal do Cidadão', 'e-Gov'],
  plataforma: ['Conecta', 'Documentos', 'Beth', 'Portal Gestor'],
  gerenciamento: ['GP Projetos', 'Gestão de Contratos', 'Gestão Documental'],
  parceiros: ['BI', 'Vigilância', 'Alvará', 'Assistência Social', 'Esporte'],
  outros: ['Outros'],
};

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

  // Ao trocar a vertical, limpa o produto se não pertencer à nova lista
  const handleVerticalChange = (v) => {
    setForm(f => {
      const list = PRODUCTS_BY_VERTICAL[v] || [];
      return { ...f, vertical: v, name: list.includes(f.name) ? f.name : '' };
    });
  };

  const productList = PRODUCTS_BY_VERTICAL[form.vertical] || [];
  // Produto existente com nome fora da lista padrão (ex: importado)
  const isCustomName = !!form.name && form.vertical && !productList.includes(form.name);

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
            <Label className="text-slate-300 text-xs">Vertical *</Label>
            <Select value={form.vertical} onValueChange={handleVerticalChange}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
                <SelectValue placeholder="Selecionar vertical..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {VERTICAL_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-white hover:bg-slate-700">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-300 text-xs">Produto *</Label>
            {isCustomName ? (
              <Input value={form.name} onChange={e => set('name', e.target.value)}
                className="bg-slate-800 border-slate-600 text-white mt-1" />
            ) : (
              <Select value={form.name} onValueChange={v => set('name', v)} disabled={!form.vertical}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
                  <SelectValue placeholder={form.vertical ? 'Selecionar produto...' : 'Selecione a vertical primeiro'} />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {productList.map(p => (
                    <SelectItem key={p} value={p} className="text-white hover:bg-slate-700">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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