import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Users, Plus, Pencil, Trash2, Mail, Phone, Flame, Activity } from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, LabelList
} from 'recharts';
import AgilPageHeader from '@/components/agil/AgilPageHeader';
import { computeMemberMetrics, burnoutLevel, senioridadeMeta } from '@/components/agil/squadMetrics';

const empty = {
  nome: '', funcao: '', cargo: '', especialidade: '', senioridade: '', skills: '',
  capacidade_semanal: '', dias_disponiveis: '', disponibilidade: '100',
  horas_planejadas: '', horas_executadas: '', email: '', telefone: '', observacao: ''
};

function Stat({ label, value, accent }) {
  return (
    <div className="rounded-lg bg-slate-900/60 border border-slate-700/50 px-2.5 py-2 text-center">
      <p className={`text-lg font-bold ${accent || 'text-white'}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}

function Meter({ label, value, bar, unit = '%' }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200 font-medium">{value}{unit}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
        <div className={`h-full ${bar}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

const tooltipStyle = { backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#fff' };

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

  const membersWithMetrics = useMemo(
    () => team.map(m => ({ member: m, metrics: computeMemberMetrics(m, backlog, sprints) })),
    [team, backlog, sprints]
  );

  const charts = useMemo(() => {
    return membersWithMetrics.map(({ member, metrics }) => ({
      nome: (member.nome || '').split(' ')[0] || member.nome,
      capacidade: metrics.capacidade,
      ocupacao: metrics.ocupacao,
      burnout: metrics.burnout,
      disponibilidade: metrics.disponibilidade,
    }));
  }, [membersWithMetrics]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['agilTeam', projectId] });

  const openNew = () => { setForm(empty); setEditingId(null); setModalOpen(true); };
  const openEdit = (m) => {
    setForm({
      nome: m.nome || '', funcao: m.funcao || '', cargo: m.cargo || '', especialidade: m.especialidade || '',
      senioridade: m.senioridade || '', skills: m.skills || '',
      capacidade_semanal: m.capacidade_semanal ?? '', dias_disponiveis: m.dias_disponiveis || '',
      disponibilidade: m.disponibilidade ?? '100', horas_planejadas: m.horas_planejadas ?? '',
      horas_executadas: m.horas_executadas ?? '', email: m.email || '', telefone: m.telefone || '', observacao: m.observacao || '',
    });
    setEditingId(m.id);
    setModalOpen(true);
  };

  const numOrUndef = (v) => v === '' ? undefined : Number(v);

  const save = async () => {
    if (!form.nome.trim()) { toast.error('Informe o nome'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        senioridade: form.senioridade || undefined,
        capacidade_semanal: numOrUndef(form.capacidade_semanal),
        disponibilidade: numOrUndef(form.disponibilidade),
        horas_planejadas: numOrUndef(form.horas_planejadas),
        horas_executadas: numOrUndef(form.horas_executadas),
      };
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

  const squadTotals = membersWithMetrics.reduce((acc, { metrics }) => ({
    sp: acc.sp + metrics.storyPointsEntregues,
    bugs: acc.bugs + metrics.bugs,
    cap: acc.cap + metrics.capacidade,
    plan: acc.plan + metrics.horasPlanejadas,
  }), { sp: 0, bugs: 0, cap: 0, plan: 0 });

  return (
    <div className="min-h-screen bg-slate-900 p-6 lg:p-8 space-y-6">
      <AgilPageHeader icon={Users} title="Equipe" projectName={project?.name}>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> Novo Membro</Button>
      </AgilPageHeader>

      {team.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700"><CardContent className="py-12 text-center text-slate-400">Nenhum membro cadastrado.</CardContent></Card>
      ) : (
        <>
          {/* Resumo do Squad */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat label="Membros" value={team.length} accent="text-white" />
            <Stat label="SP Entregues" value={squadTotals.sp} accent="text-emerald-400" />
            <Stat label="Bugs Abertos" value={squadTotals.bugs} accent="text-red-400" />
            <Stat label="Capacidade (h/sem)" value={squadTotals.cap} accent="text-blue-400" />
            <Stat label="Horas Planejadas" value={squadTotals.plan} accent="text-amber-400" />
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-blue-400" /> Capacidade x Ocupação</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={charts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="nome" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="capacidade" name="Capacidade (h)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ocupacao" name="Ocupação (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Flame className="w-4 h-4 text-orange-400" /> Risco de Burnout x Disponibilidade</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={charts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="nome" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="disponibilidade" name="Disponibilidade (%)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="burnout" name="Burnout (%)" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="burnout" position="top" fill="#94a3b8" fontSize={10} />
                      {charts.map((c, i) => (
                        <Cell key={i} fill={c.burnout >= 70 ? '#ef4444' : c.burnout >= 45 ? '#f97316' : c.burnout >= 20 ? '#f59e0b' : '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Cards dos membros */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {membersWithMetrics.map(({ member: m, metrics }) => {
              const bl = burnoutLevel(metrics.burnout);
              return (
                <Card key={m.id} className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-white font-semibold">{m.nome}</h3>
                        <p className="text-sm text-emerald-400">{m.cargo || m.funcao || '—'}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {m.senioridade && <Badge className="bg-slate-700/60 text-slate-200 border-0 text-[10px]">{senioridadeMeta[m.senioridade]}</Badge>}
                          {m.especialidade && <span className="text-xs text-slate-400">{m.especialidade}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-white" onClick={() => openEdit(m)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-400" onClick={() => setDeleteTarget(m)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <Stat label="SP entregues" value={metrics.storyPointsEntregues} accent="text-emerald-400" />
                      <Stat label="Em andamento" value={metrics.storiesAndamento} accent="text-blue-400" />
                      <Stat label="Bugs" value={metrics.bugs} accent="text-red-400" />
                      <Stat label="Veloc. média" value={metrics.velocidadeMedia} accent="text-purple-400" />
                      <Stat label="Sprints" value={metrics.sprintsParticipadas} accent="text-cyan-400" />
                      <Stat label="Capac. h/sem" value={metrics.capacidade} accent="text-white" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                      <span><span className="text-slate-500">Horas plan.:</span> {metrics.horasPlanejadas}h</span>
                      <span><span className="text-slate-500">Horas exec.:</span> {metrics.horasExecutadas}h</span>
                    </div>

                    <div className="space-y-2">
                      <Meter label="Carga atual" value={metrics.cargaAtual} bar={metrics.cargaAtual > 100 ? 'bg-red-500' : metrics.cargaAtual > 85 ? 'bg-amber-500' : 'bg-emerald-500'} />
                      <Meter label="Ocupação" value={metrics.ocupacao} bar={metrics.ocupacao > 100 ? 'bg-red-500' : 'bg-blue-500'} />
                      <Meter label="Disponibilidade" value={metrics.disponibilidade} bar="bg-cyan-500" />
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-700/50">
                      <span className="text-xs text-slate-400 flex items-center gap-1.5"><Flame className={`w-3.5 h-3.5 ${bl.color}`} /> Burnout</span>
                      <span className={`text-xs font-semibold ${bl.color}`}>{bl.label} ({metrics.burnout}%)</span>
                    </div>

                    {(m.email || m.telefone) && (
                      <div className="pt-1 space-y-1">
                        {m.email && <p className="text-xs text-slate-400 flex items-center gap-1.5"><Mail className="w-3 h-3" /> {m.email}</p>}
                        {m.telefone && <p className="text-xs text-slate-400 flex items-center gap-1.5"><Phone className="w-3 h-3" /> {m.telefone}</p>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? 'Editar Membro' : 'Novo Membro'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-slate-300">Nome *</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
              <div><Label className="text-slate-300">Cargo</Label><Input value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} placeholder="Ex: Desenvolvedor Backend" className="bg-slate-800 border-slate-700 text-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-slate-300">Função (papel ágil)</Label><Input value={form.funcao} onChange={e => setForm({ ...form, funcao: e.target.value })} placeholder="Ex: Scrum Master" className="bg-slate-800 border-slate-700 text-white" /></div>
              <div>
                <Label className="text-slate-300">Senioridade</Label>
                <Select value={form.senioridade} onValueChange={v => setForm({ ...form, senioridade: v })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{Object.entries(senioridadeMeta).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-slate-300">Especialidade</Label><Input value={form.especialidade} onChange={e => setForm({ ...form, especialidade: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
              <div><Label className="text-slate-300">Skills</Label><Input value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} placeholder="React, Node..." className="bg-slate-800 border-slate-700 text-white" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-slate-300">Capacidade (h/sem)</Label><Input type="number" value={form.capacidade_semanal} onChange={e => setForm({ ...form, capacidade_semanal: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
              <div><Label className="text-slate-300">Disponibilidade (%)</Label><Input type="number" value={form.disponibilidade} onChange={e => setForm({ ...form, disponibilidade: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
              <div><Label className="text-slate-300">Dias disponíveis</Label><Input value={form.dias_disponiveis} onChange={e => setForm({ ...form, dias_disponiveis: e.target.value })} placeholder="Seg-Sex" className="bg-slate-800 border-slate-700 text-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-slate-300">Horas planejadas (sprint)</Label><Input type="number" value={form.horas_planejadas} onChange={e => setForm({ ...form, horas_planejadas: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
              <div><Label className="text-slate-300">Horas executadas (sprint)</Label><Input type="number" value={form.horas_executadas} onChange={e => setForm({ ...form, horas_executadas: e.target.value })} className="bg-slate-800 border-slate-700 text-white" /></div>
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