import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Package, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import AgilPageHeader from '@/components/agil/AgilPageHeader';

const statusMeta = {
  planejado: { label: 'Planejado', color: 'bg-slate-500/15 text-slate-300' },
  em_desenvolvimento: { label: 'Em Desenvolvimento', color: 'bg-blue-500/15 text-blue-300' },
  em_homologacao: { label: 'Em Homologação', color: 'bg-orange-500/15 text-orange-300' },
  concluido: { label: 'Concluído', color: 'bg-emerald-500/15 text-emerald-300' },
};
const empty = { produto: '', modulo: '', vertical: '', descricao: '', status: 'planejado', responsavel: '', observacao: '' };

export default function AgilProducts() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: project } = useQuery({
    queryKey: ['agilProject', projectId],
    enabled: !!projectId,
    queryFn: async () => (await base44.entities.Project.filter({ id: projectId }))?.[0] || null,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['agilProducts', projectId],
    enabled: !!projectId,
    queryFn: () => base44.entities.AgilProduct.filter({ project_id: projectId }),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['agilProducts', projectId] });

  const openNew = () => { setForm(empty); setEditingId(null); setModalOpen(true); };
  const openEdit = (p) => {
    setForm({ produto: p.produto || '', modulo: p.modulo || '', vertical: p.vertical || '', descricao: p.descricao || '', status: p.status || 'planejado', responsavel: p.responsavel || '', observacao: p.observacao || '' });
    setEditingId(p.id);
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.produto.trim()) { toast.error('Informe o nome do produto'); return; }
    setSaving(true);
    try {
      if (editingId) await base44.entities.AgilProduct.update(editingId, form);
      else await base44.entities.AgilProduct.create({ ...form, project_id: projectId });
      toast.success('Produto salvo');
      setModalOpen(false);
      refresh();
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await base44.entities.AgilProduct.delete(deleteTarget.id);
    toast.success('Produto excluído');
    setDeleteTarget(null);
    refresh();
  };

  if (!projectId) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Projeto não informado.</div>;

  return (
    <div className="min-h-screen bg-slate-900 p-6 lg:p-8 space-y-6">
      <AgilPageHeader icon={Package} title="Produtos" projectName={project?.name}>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> Novo Produto</Button>
      </AgilPageHeader>

      {products.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700"><CardContent className="py-12 text-center text-slate-400">Nenhum produto cadastrado.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => {
            const meta = statusMeta[p.status] || statusMeta.planejado;
            return (
              <Card key={p.id} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-white font-semibold">{p.produto}</h3>
                      {p.modulo && <p className="text-sm text-emerald-400">{p.modulo}</p>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-white" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-400" onClick={() => setDeleteTarget(p)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                  <Badge className={`${meta.color} border-0`}>{meta.label}</Badge>
                  {p.vertical && <p className="text-sm text-slate-300"><span className="text-slate-500">Vertical:</span> {p.vertical}</p>}
                  {p.responsavel && <p className="text-sm text-slate-300"><span className="text-slate-500">Responsável:</span> {p.responsavel}</p>}
                  {p.descricao && <p className="text-sm text-slate-400">{p.descricao}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? 'Editar Produto' : 'Novo Produto'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-slate-300">Produto *</Label><Input value={form.produto} onChange={e => setForm({ ...form, produto: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
              <div><Label className="text-slate-300">Módulo</Label><Input value={form.modulo} onChange={e => setForm({ ...form, modulo: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-slate-300">Vertical</Label><Input value={form.vertical} onChange={e => setForm({ ...form, vertical: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
              <div>
                <Label className="text-slate-300">Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(statusMeta).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-slate-300">Responsável</Label><Input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
            <div><Label className="text-slate-300">Descrição</Label><Textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Excluir "{deleteTarget?.produto}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}