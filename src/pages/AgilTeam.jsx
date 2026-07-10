import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Users, Plus, Pencil, Trash2, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import AgilPageHeader from '@/components/agil/AgilPageHeader';

const empty = { nome: '', funcao: '', especialidade: '', skills: '', capacidade_semanal: '', dias_disponiveis: '', email: '', telefone: '', observacao: '' };

export default function AgilTeam() {
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

  const { data: team = [] } = useQuery({
    queryKey: ['agilTeam', projectId],
    enabled: !!projectId,
    queryFn: () => base44.entities.AgilTeamMember.filter({ project_id: projectId }),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['agilTeam', projectId] });

  const openNew = () => { setForm(empty); setEditingId(null); setModalOpen(true); };
  const openEdit = (m) => {
    setForm({
      nome: m.nome || '', funcao: m.funcao || '', especialidade: m.especialidade || '', skills: m.skills || '',
      capacidade_semanal: m.capacidade_semanal ?? '', dias_disponiveis: m.dias_disponiveis || '',
      email: m.email || '', telefone: m.telefone || '', observacao: m.observacao || '',
    });
    setEditingId(m.id);
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.nome.trim()) { toast.error('Informe o nome'); return; }
    setSaving(true);
    try {
      const payload = { ...form, capacidade_semanal: form.capacidade_semanal === '' ? undefined : Number(form.capacidade_semanal) };
      if (editingId) await base44.entities.AgilTeamMember.update(editingId, payload);
      else await base44.entities.AgilTeamMember.create({ ...payload, project_id: projectId });
      toast.success('Membro salvo');
      setModalOpen(false);
      refresh();
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await base44.entities.AgilTeamMember.delete(deleteTarget.id);
    toast.success('Membro excluído');
    setDeleteTarget(null);
    refresh();
  };

  if (!projectId) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Projeto não informado.</div>;

  return (
    <div className="min-h-screen bg-slate-900 p-6 lg:p-8 space-y-6">
      <AgilPageHeader icon={Users} title="Equipe" projectName={project?.name}>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> Novo Membro</Button>
      </AgilPageHeader>

      {team.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700"><CardContent className="py-12 text-center text-slate-400">Nenhum membro cadastrado.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {team.map(m => (
            <Card key={m.id} className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-white font-semibold">{m.nome}</h3>
                    {m.funcao && <p className="text-sm text-emerald-400">{m.funcao}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-white" onClick={() => openEdit(m)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-400" onClick={() => setDeleteTarget(m)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                {m.especialidade && <p className="text-sm text-slate-300"><span className="text-slate-500">Especialidade:</span> {m.especialidade}</p>}
                {m.skills && <p className="text-sm text-slate-400">{m.skills}</p>}
                {(m.capacidade_semanal || m.dias_disponiveis) && (
                  <p className="text-sm text-slate-300"><span className="text-slate-500">Capacidade:</span> {m.capacidade_semanal ? `${m.capacidade_semanal}h/sem` : ''} {m.dias_disponiveis || ''}</p>
                )}
                {m.email && <p className="text-xs text-slate-400 flex items-center gap-1.5"><Mail className="w-3 h-3" /> {m.email}</p>}
                {m.telefone && <p className="text-xs text-slate-400 flex items-center gap-1.5"><Phone className="w-3 h-3" /> {m.telefone}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? 'Editar Membro' : 'Novo Membro'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-slate-300">Nome *</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
              <div><Label className="text-slate-300">Função</Label><Input value={form.funcao} onChange={e => setForm({ ...form, funcao: e.target.value })} placeholder="Ex: Scrum Master" className="bg-slate-800 border-slate-700 text-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-slate-300">Especialidade</Label><Input value={form.especialidade} onChange={e => setForm({ ...form, especialidade: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
              <div><Label className="text-slate-300">Skills</Label><Input value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} placeholder="React, Node..." className="bg-slate-800 border-slate-700 text-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-slate-300">Capacidade (h/sem)</Label><Input type="number" value={form.capacidade_semanal} onChange={e => setForm({ ...form, capacidade_semanal: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
              <div><Label className="text-slate-300">Dias disponíveis</Label><Input value={form.dias_disponiveis} onChange={e => setForm({ ...form, dias_disponiveis: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-slate-300">E-mail</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
              <div><Label className="text-slate-300">Telefone</Label><Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
            </div>
            <div><Label className="text-slate-300">Observação</Label><Input value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
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
            <AlertDialogTitle>Excluir membro</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Excluir "{deleteTarget?.nome}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
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