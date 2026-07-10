import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { UserCircle, Plus, Pencil, Trash2, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import AgilPageHeader from '@/components/agil/AgilPageHeader';

const commLevels = { alto: 'Alto', medio: 'Médio', baixo: 'Baixo' };
const empty = { name: '', role: '', email: '', phone: '', communication_level: '', communication_routine: '' };

export default function AgilStakeholders() {
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

  const { data: stakeholders = [] } = useQuery({
    queryKey: ['agilStakeholders', projectId],
    enabled: !!projectId,
    queryFn: () => base44.entities.Stakeholder.filter({ project_id: projectId }),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['agilStakeholders', projectId] });

  const openNew = () => { setForm(empty); setEditingId(null); setModalOpen(true); };
  const openEdit = (s) => {
    setForm({ name: s.name || '', role: s.role || '', email: s.email || '', phone: s.phone || '', communication_level: s.communication_level || '', communication_routine: s.communication_routine || '' });
    setEditingId(s.id);
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Informe o nome'); return; }
    setSaving(true);
    try {
      const payload = { ...form, communication_level: form.communication_level || undefined };
      if (editingId) await base44.entities.Stakeholder.update(editingId, payload);
      else await base44.entities.Stakeholder.create({ ...payload, project_id: projectId });
      toast.success('Stakeholder salvo');
      setModalOpen(false);
      refresh();
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await base44.entities.Stakeholder.delete(deleteTarget.id);
    toast.success('Stakeholder excluído');
    setDeleteTarget(null);
    refresh();
  };

  if (!projectId) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Projeto não informado.</div>;

  return (
    <div className="min-h-screen bg-slate-900 p-6 lg:p-8 space-y-6">
      <AgilPageHeader icon={UserCircle} title="Stakeholders" projectName={project?.name}>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> Novo Stakeholder</Button>
      </AgilPageHeader>

      {stakeholders.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700"><CardContent className="py-12 text-center text-slate-400">Nenhum stakeholder cadastrado.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stakeholders.map(s => (
            <Card key={s.id} className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-white font-semibold">{s.name}</h3>
                    {s.role && <p className="text-sm text-emerald-400">{s.role}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-white" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-400" onClick={() => setDeleteTarget(s)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                {s.communication_level && <p className="text-sm text-slate-300"><span className="text-slate-500">Comunicação:</span> {commLevels[s.communication_level]}</p>}
                {s.communication_routine && <p className="text-sm text-slate-400">{s.communication_routine}</p>}
                {s.email && <p className="text-xs text-slate-400 flex items-center gap-1.5"><Mail className="w-3 h-3" /> {s.email}</p>}
                {s.phone && <p className="text-xs text-slate-400 flex items-center gap-1.5"><Phone className="w-3 h-3" /> {s.phone}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? 'Editar Stakeholder' : 'Novo Stakeholder'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-slate-300">Nome *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
              <div><Label className="text-slate-300">Papel</Label><Input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-slate-300">E-mail</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
              <div><Label className="text-slate-300">Telefone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-300">Nível de comunicação</Label>
                <Select value={form.communication_level} onValueChange={v => setForm({ ...form, communication_level: v })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{Object.entries(commLevels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-slate-300">Rotina de comunicação</Label><Input value={form.communication_routine} onChange={e => setForm({ ...form, communication_routine: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
            </div>
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
            <AlertDialogTitle>Excluir stakeholder</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Excluir "{deleteTarget?.name}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
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