import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
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
import { Package, Plus, Pencil, Trash2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import AgilPageHeader from '@/components/agil/AgilPageHeader';
import { computeProductMetrics, healthLevel } from '@/components/agil/squadMetrics';

const statusMeta = {
  planejado: { label: 'Planejado', color: 'bg-slate-500/15 text-slate-300' },
  em_desenvolvimento: { label: 'Em Desenvolvimento', color: 'bg-blue-500/15 text-blue-300' },
  em_homologacao: { label: 'Em Homologação', color: 'bg-orange-500/15 text-orange-300' },
  concluido: { label: 'Concluído', color: 'bg-emerald-500/15 text-emerald-300' },
};
const empty = { produto: '', modulo: '', vertical: '', responsavel: '', descricao: '', status: 'planejado', observacao: '' };

function Mini({ label, value, accent }) {
  return (
    <div className="rounded-lg bg-slate-900/60 border border-slate-700/50 px-2 py-1.5 text-center">
      <p className={`text-base font-bold ${accent || 'text-white'}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}

export default function AgilProducts() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');
  const navigate = useNavigate();
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

  const { data: backlog = [] } = useQuery({
    queryKey: ['agilBacklog', projectId],
    enabled: !!projectId,
    queryFn: () => base44.entities.AgileBacklog.filter({ project_id: projectId }),
  });

  const { data: sprints = [] } = useQuery({
    queryKey: ['agilSprints', projectId],
    enabled: !!projectId,
    queryFn: () => base44.entities.AgileSprint.filter({ project_id: projectId }),
  });

  const productsWithMetrics = useMemo(
    () => products.map(p => ({ product: p, metrics: computeProductMetrics(p, backlog, sprints) })),
    [products, backlog, sprints]
  );

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['agilProducts', projectId] });

  const openNew = () => { setForm(empty); setEditingId(null); setModalOpen(true); };
  const openEdit = (p) => {
    setForm({ produto: p.produto || '', modulo: p.modulo || '', vertical: p.vertical || '', responsavel: p.responsavel || '', descricao: p.descricao || '', status: p.status || 'planejado', observacao: p.observacao || '' });
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

  const openDashboard = (p) => navigate(createPageUrl(`AgilProductDashboard?project_id=${projectId}&product_id=${p.id}`));

  if (!projectId) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Projeto não informado.</div>;

  return (
    <div className="min-h-screen bg-slate-900 p-6 lg:p-8 space-y-6">
      <AgilPageHeader icon={Package} title="Produtos" projectName={project?.name}>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> Novo Produto</Button>
      </AgilPageHeader>

      {products.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700"><CardContent className="py-12 text-center text-slate-400">Nenhum produto cadastrado.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {productsWithMetrics.map(({ product: p, metrics }) => {
            const meta = statusMeta[p.status] || statusMeta.planejado;
            const hl = healthLevel(metrics.health);
            return (
              <Card key={p.id} className="bg-slate-800/50 border-slate-700 hover:border-emerald-600/50 transition-colors">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <button className="text-left" onClick={() => openDashboard(p)}>
                      <h3 className="text-white font-semibold hover:text-emerald-400 transition-colors">{p.produto}</h3>
                      {p.modulo && <p className="text-sm text-emerald-400">{p.modulo}</p>}
                    </button>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-white" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-400" onClick={() => setDeleteTarget(p)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 items-center">
                    <Badge className={`${meta.color} border-0`}>{meta.label}</Badge>
                    <Badge className={`${hl.badge} border-0`}>Health: {metrics.health}%</Badge>
                    {p.vertical && <span className="text-xs text-slate-400">{p.vertical}</span>}
                  </div>

                  {p.responsavel && <p className="text-sm text-slate-300"><span className="text-slate-500">Responsável:</span> {p.responsavel}</p>}

                  <div className="grid grid-cols-3 gap-2">
                    <Mini label="Epics" value={metrics.epics} accent="text-purple-400" />
                    <Mini label="Features" value={metrics.features} accent="text-blue-400" />
                    <Mini label="Stories" value={metrics.stories} accent="text-emerald-400" />
                    <Mini label="Bugs" value={metrics.bugsAbertos} accent="text-red-400" />
                    <Mini label="Déb. Téc." value={metrics.debitoTecnico} accent="text-amber-400" />
                    <Mini label="Últ. Sprint" value={metrics.ultimaSprint?.nome?.replace(/[^0-9]/g, '') || '—'} accent="text-cyan-400" />
                  </div>

                  <Button variant="ghost" className="w-full text-emerald-400 hover:text-emerald-300 hover:bg-emerald-600/10" onClick={() => openDashboard(p)}>
                    Abrir dashboard <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
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
              <div><Label className="text-slate-300">Responsável</Label><Input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
            </div>
            <div>
              <Label className="text-slate-300">Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(statusMeta).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
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