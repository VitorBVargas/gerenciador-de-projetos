import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { cn } from "@/lib/utils";
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// UI
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  LayoutDashboard, Users, UserCircle, Package, Calendar, ArrowLeftRight,
  CheckSquare, Plane, DollarSign, AlertTriangle, LogOut, ChevronLeft, ChevronRight,
  ArrowLeft, Plus, Pencil, Trash2, X, Search, Mail, Phone, TrendingUp,
  TrendingDown, AlertCircle, Shield, CheckCircle, Upload, Activity, BarChart3, Lightbulb
} from 'lucide-react';

import EmptyState from '../components/ui/EmptyState';
import ExpenseModal from '../components/modals/ExpenseModal';
import ExpenseImporter from '../components/import/ExpenseImporter';
import InternalActivitiesTab from '../components/internal/InternalActivitiesTab';
import InternalKPITimeTab from '../components/internal/InternalKPITimeTab';
import InternalDiscoveryTab from '../components/internal/InternalDiscoveryTab';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

// ─── Navigation ───────────────────────────────────────────────────────────────
const NAV = [
  { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'team', label: 'Equipe', icon: Users },
  { id: 'stakeholders', label: 'Stakeholders', icon: UserCircle },
  { id: 'products', label: 'Produtos', icon: Package },
  { id: 'schedule', label: 'Cronograma', icon: Calendar },
  { id: 'migration', label: 'Migração', icon: ArrowLeftRight },
  { id: 'checklist', label: 'Checklist', icon: CheckSquare },
  { id: 'activities', label: 'Atividades', icon: Activity },
  { id: 'discovery', label: 'Discovery', icon: Lightbulb },
  { id: 'travels', label: 'Viagens', icon: Plane },
  { id: 'budget', label: 'Orçamento', icon: DollarSign },
  { id: 'risks', label: 'Riscos', icon: AlertTriangle },
  { id: 'kpi', label: 'KPI / Indicadores', icon: BarChart3 },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ activeTab, setActiveTab, projectId, collapsed, setCollapsed, user }) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
    >
      <Link
        to={createPageUrl('InternalProjectsList')}
        className="flex items-center h-16 px-4 border-b border-slate-800 hover:bg-slate-800 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-xl">B</span>
        </div>
        {!collapsed && (
          <div className="ml-3 overflow-hidden">
            <p className="text-white font-semibold text-sm truncate">Projetos Internos</p>
            <p className="text-slate-500 text-xs truncate">Dashboard</p>
          </div>
        )}
      </Link>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full text-left",
                activeTab === item.id
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
            </button>
          ))}
        </div>
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-20 -right-3 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      <div className="p-4 border-t border-slate-800">
        {user && !collapsed && (
          <div className="mb-3 px-2">
            <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={() => base44.auth.logout()}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="text-sm">Sair</span>}
        </button>
      </div>
    </aside>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ project, teamMembers, checklist, risks, schedule, budget }) {
  const totalTasks = checklist.length;
  const completedTasks = checklist.filter(c => c.completed).length;
  const checklistProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const highRisks = risks.filter(r => r.probability === 'alta' && r.impact === 'alto').length;
  const totalSpent = budget.reduce((s, e) => s + (e.amount || 0), 0);
  const daysToDeadline = project?.deadline ? differenceInDays(new Date(project.deadline), new Date()) : null;

  const statusColors = {
    planejamento: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    em_andamento: 'bg-green-500/20 text-green-400 border-green-500/30',
    pausado: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    concluido: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };
  const statusLabels = { planejamento: 'Planejamento', em_andamento: 'Em Andamento', pausado: 'Pausado', concluido: 'Concluído' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Visão Geral</h1>
        <p className="text-slate-400 mt-1">Resumo do projeto interno</p>
      </div>

      {/* Project Card */}
      <Card className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border-slate-700/50">
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-xl font-bold text-white">{project?.name}</h2>
                {project?.status && (
                  <Badge className={cn("border text-xs", statusColors[project.status])}>
                    {statusLabels[project.status]}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {project?.manager && (
                  <div className="text-slate-400"><span className="text-slate-500">Responsável:</span> <span className="text-white">{project.manager}</span></div>
                )}
                {project?.deadline && (
                  <div className="text-slate-400">
                    <span className="text-slate-500">Prazo:</span>{' '}
                    <span className={cn(daysToDeadline < 0 ? "text-red-400" : daysToDeadline < 30 ? "text-yellow-400" : "text-white")}>
                      {format(new Date(project.deadline), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                    </span>
                  </div>
                )}
                {project?.budget > 0 && (
                  <div className="text-slate-400">
                    <span className="text-slate-500">Orçamento:</span>{' '}
                    <span className="text-emerald-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(project.budget)}</span>
                  </div>
                )}
              </div>
              {project?.description && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Objetivo / Descrição</p>
                  <p className="text-slate-300 text-sm leading-relaxed">{project.description}</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div><p className="text-xs text-slate-400">Equipe</p><p className="text-xl font-bold text-white">{teamMembers.length}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-green-400" />
              </div>
              <div><p className="text-xs text-slate-400">Checklist</p><p className="text-xl font-bold text-white">{checklistProgress}%</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", highRisks > 0 ? "bg-red-500/20" : "bg-green-500/20")}>
                <AlertTriangle className={cn("w-5 h-5", highRisks > 0 ? "text-red-400" : "text-green-400")} />
              </div>
              <div><p className="text-xs text-slate-400">Riscos Altos</p><p className="text-xl font-bold text-white">{highRisks}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-orange-400" />
              </div>
              <div><p className="text-xs text-slate-400">Gasto</p><p className="text-xl font-bold text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSpent)}</p></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Checklist Progress */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader><CardTitle className="text-white text-base">Checklist do Projeto</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">{completedTasks} de {totalTasks} itens concluídos</span>
                <span className="text-white font-semibold">{checklistProgress}%</span>
              </div>
              <Progress value={checklistProgress} className="h-3" />
              {checklist.slice(0, 5).map(item => (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  <div className={cn("w-2 h-2 rounded-full flex-shrink-0", item.completed ? "bg-green-500" : "bg-slate-600")} />
                  <span className={cn(item.completed ? "text-slate-500 line-through" : "text-slate-300")}>{item.action}</span>
                </div>
              ))}
              {checklist.length > 5 && <p className="text-xs text-slate-500">+{checklist.length - 5} itens...</p>}
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader><CardTitle className="text-white text-base">Cronograma</CardTitle></CardHeader>
          <CardContent>
            {schedule.length > 0 ? (() => {
              const avgProg = Math.round(schedule.reduce((s, i) => s + (i.progress || 0), 0) / schedule.length);
              const concluded = schedule.filter(i => i.status === 'concluido').length;
              const inProgress = schedule.filter(i => i.status === 'em_andamento').length;
              const delayed = schedule.filter(i => i.status === 'atrasado').length;
              return (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Progresso Geral</span>
                      <span className="text-white font-semibold">{avgProg}%</span>
                    </div>
                    <Progress value={avgProg} className="h-3" />
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-green-500/10 rounded-lg p-2">
                      <p className="text-xl font-bold text-green-400">{concluded}</p>
                      <p className="text-xs text-slate-400">Concluídas</p>
                    </div>
                    <div className="bg-blue-500/10 rounded-lg p-2">
                      <p className="text-xl font-bold text-blue-400">{inProgress}</p>
                      <p className="text-xs text-slate-400">Em Andamento</p>
                    </div>
                    <div className="bg-red-500/10 rounded-lg p-2">
                      <p className="text-xl font-bold text-red-400">{delayed}</p>
                      <p className="text-xs text-slate-400">Atrasadas</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 text-center">{schedule.length} etapas no total</p>
                </div>
              );
            })() : (
              <p className="text-slate-500 text-sm text-center py-4">Nenhuma etapa cadastrada</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Team Tab ─────────────────────────────────────────────────────────────────
function TeamTab({ projectId }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [form, setForm] = useState({ name: '', role: '', email: '', phone: '' });
  const [search, setSearch] = useState('');

  const { data: members = [] } = useQuery({
    queryKey: ['internalTeam', projectId],
    queryFn: () => base44.entities.InternalTeamMember.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const createM = useMutation({ mutationFn: d => base44.entities.InternalTeamMember.create(d), onSuccess: () => { queryClient.invalidateQueries(['internalTeam', projectId]); setModalOpen(false); } });
  const updateM = useMutation({ mutationFn: ({ id, data }) => base44.entities.InternalTeamMember.update(id, data), onSuccess: () => { queryClient.invalidateQueries(['internalTeam', projectId]); setModalOpen(false); setSelected(null); } });
  const deleteM = useMutation({ mutationFn: id => base44.entities.InternalTeamMember.delete(id), onSuccess: () => { queryClient.invalidateQueries(['internalTeam', projectId]); setDeleteOpen(false); setToDelete(null); } });

  const openCreate = () => { setSelected(null); setForm({ name: '', role: '', email: '', phone: '' }); setModalOpen(true); };
  const openEdit = (m) => { setSelected(m); setForm({ name: m.name, role: m.role || '', email: m.email || '', phone: m.phone || '' }); setModalOpen(true); };
  const handleSave = () => { if (selected) updateM.mutate({ id: selected.id, data: { ...form, project_id: projectId } }); else createM.mutate({ ...form, project_id: projectId }); };

  const filtered = members.filter(m => m.name?.toLowerCase().includes(search.toLowerCase()) || m.role?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-white">Equipe do Projeto</h1><p className="text-slate-400 mt-1">{members.length} membros cadastrados</p></div>
        <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2" />Adicionar Membro</Button>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
      </div>
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(m => (
            <div key={m.id} className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 hover:bg-slate-800 transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  {m.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm truncate">{m.name}</p>
                  {m.role && <p className="text-xs text-slate-400 truncate">{m.role}</p>}
                  {m.email && <p className="text-xs text-slate-500 truncate">{m.email}</p>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-white" onClick={() => openEdit(m)}><Pencil className="w-3 h-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400 hover:text-red-300" onClick={() => { setToDelete(m); setDeleteOpen(true); }}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Users} title="Nenhum membro cadastrado" action={<Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2" />Adicionar</Button>} />
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader><DialogTitle>{selected ? 'Editar Membro' : 'Novo Membro'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {[['name','Nome *'],['role','Cargo/Função'],['email','E-mail'],['phone','Telefone']].map(([field, label]) => (
              <div key={field} className="space-y-1">
                <Label className="text-slate-300 text-xs">{label}</Label>
                <Input value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} className="bg-slate-700 border-slate-600 text-white" />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name} className="bg-indigo-600 hover:bg-indigo-700">{selected ? 'Salvar' : 'Adicionar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader><AlertDialogTitle className="text-white">Excluir membro?</AlertDialogTitle><AlertDialogDescription className="text-slate-400">Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteM.mutate(toDelete?.id)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Stakeholders Tab ─────────────────────────────────────────────────────────
function StakeholdersTab({ projectId }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [form, setForm] = useState({ name: '', role: '', email: '', phone: '' });
  const [search, setSearch] = useState('');

  const { data: stakeholders = [] } = useQuery({
    queryKey: ['internalStakeholders', projectId],
    queryFn: () => base44.entities.InternalStakeholder.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const createM = useMutation({ mutationFn: d => base44.entities.InternalStakeholder.create(d), onSuccess: () => { queryClient.invalidateQueries(['internalStakeholders', projectId]); setModalOpen(false); } });
  const updateM = useMutation({ mutationFn: ({ id, data }) => base44.entities.InternalStakeholder.update(id, data), onSuccess: () => { queryClient.invalidateQueries(['internalStakeholders', projectId]); setModalOpen(false); setSelected(null); } });
  const deleteM = useMutation({ mutationFn: id => base44.entities.InternalStakeholder.delete(id), onSuccess: () => { queryClient.invalidateQueries(['internalStakeholders', projectId]); setDeleteOpen(false); setToDelete(null); } });

  const openCreate = () => { setSelected(null); setForm({ name: '', role: '', email: '', phone: '' }); setModalOpen(true); };
  const openEdit = (s) => { setSelected(s); setForm({ name: s.name, role: s.role || '', email: s.email || '', phone: s.phone || '' }); setModalOpen(true); };
  const handleSave = () => { if (selected) updateM.mutate({ id: selected.id, data: { ...form, project_id: projectId } }); else createM.mutate({ ...form, project_id: projectId }); };

  const filtered = stakeholders.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()) || s.role?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-white">Stakeholders</h1><p className="text-slate-400 mt-1">{stakeholders.length} cadastrados</p></div>
        <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2" />Adicionar</Button>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
      </div>
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => (
            <Card key={s.id} className="bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 transition-all group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                      {s.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm">{s.name}</h3>
                      {s.role && <p className="text-xs text-slate-400">{s.role}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-white" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => { setToDelete(s); setDeleteOpen(true); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  {s.email && <div className="flex items-center gap-2 text-xs text-slate-400"><Mail className="w-3 h-3" />{s.email}</div>}
                  {s.phone && <div className="flex items-center gap-2 text-xs text-slate-400"><Phone className="w-3 h-3" />{s.phone}</div>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={UserCircle} title="Nenhum stakeholder cadastrado" action={<Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2" />Adicionar</Button>} />
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader><DialogTitle>{selected ? 'Editar Stakeholder' : 'Novo Stakeholder'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {[['name','Nome *'],['role','Cargo/Papel'],['email','E-mail'],['phone','Telefone']].map(([field, label]) => (
              <div key={field} className="space-y-1">
                <Label className="text-slate-300 text-xs">{label}</Label>
                <Input value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} className="bg-slate-700 border-slate-600 text-white" />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name} className="bg-indigo-600 hover:bg-indigo-700">{selected ? 'Salvar' : 'Adicionar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader><AlertDialogTitle className="text-white">Excluir stakeholder?</AlertDialogTitle><AlertDialogDescription className="text-slate-400">Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteM.mutate(toDelete?.id)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Products Tab ─────────────────────────────────────────────────────────────
function ProductsTab({ projectId }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const defaultForm = { name: '', delivery: '', monitoring: '', status: 'pendente' };
  const [form, setForm] = useState(defaultForm);

  const { data: products = [] } = useQuery({
    queryKey: ['internalProducts', projectId],
    queryFn: () => base44.entities.InternalProduct.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const createM = useMutation({ mutationFn: d => base44.entities.InternalProduct.create(d), onSuccess: () => { queryClient.invalidateQueries(['internalProducts', projectId]); setModalOpen(false); } });
  const updateM = useMutation({ mutationFn: ({ id, data }) => base44.entities.InternalProduct.update(id, data), onSuccess: () => { queryClient.invalidateQueries(['internalProducts', projectId]); setModalOpen(false); setSelected(null); } });
  const deleteM = useMutation({ mutationFn: id => base44.entities.InternalProduct.delete(id), onSuccess: () => { queryClient.invalidateQueries(['internalProducts', projectId]); setDeleteOpen(false); setToDelete(null); } });

  const openCreate = () => { setSelected(null); setForm(defaultForm); setModalOpen(true); };
  const openEdit = (p) => { setSelected(p); setForm({ name: p.name, delivery: p.delivery || '', monitoring: p.monitoring || '', status: p.status || 'pendente' }); setModalOpen(true); };
  const handleSave = () => { if (selected) updateM.mutate({ id: selected.id, data: { ...form, project_id: projectId } }); else createM.mutate({ ...form, project_id: projectId }); };

  const statusColors = { pendente: 'bg-slate-500/20 text-slate-400 border-slate-500/30', em_andamento: 'bg-blue-500/20 text-blue-400 border-blue-500/30', concluido: 'bg-green-500/20 text-green-400 border-green-500/30' };
  const statusLabels = { pendente: 'Pendente', em_andamento: 'Em Andamento', concluido: 'Concluído' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-white">Produtos</h1><p className="text-slate-400 mt-1">{products.length} produtos cadastrados</p></div>
        <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2" />Adicionar Produto</Button>
      </div>
      {products.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map(p => (
            <Card key={p.id} className="bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 transition-all group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-white">{p.name}</h3>
                    <Badge className={cn("border text-xs mt-1", statusColors[p.status])}>{statusLabels[p.status]}</Badge>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-white" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => { setToDelete(p); setDeleteOpen(true); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                {p.delivery && <div className="text-xs text-slate-400 mb-1"><span className="text-slate-500">Entrega: </span>{p.delivery}</div>}
                {p.monitoring && <div className="text-xs text-slate-400"><span className="text-slate-500">Monitorar: </span>{p.monitoring}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={Package} title="Nenhum produto cadastrado" action={<Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2" />Adicionar</Button>} />
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader><DialogTitle>{selected ? 'Editar Produto' : 'Novo Produto'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-slate-300 text-xs">Software/Produto *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="bg-slate-700 border-slate-600 text-white" /></div>
            <div className="space-y-1"><Label className="text-slate-300 text-xs">O que será entregue</Label><Textarea value={form.delivery} onChange={e => setForm(p => ({ ...p, delivery: e.target.value }))} className="bg-slate-700 border-slate-600 text-white h-16 resize-none" /></div>
            <div className="space-y-1"><Label className="text-slate-300 text-xs">O que precisa ser monitorado</Label><Textarea value={form.monitoring} onChange={e => setForm(p => ({ ...p, monitoring: e.target.value }))} className="bg-slate-700 border-slate-600 text-white h-16 resize-none" /></div>
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name} className="bg-indigo-600 hover:bg-indigo-700">{selected ? 'Salvar' : 'Adicionar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader><AlertDialogTitle className="text-white">Excluir produto?</AlertDialogTitle><AlertDialogDescription className="text-slate-400">Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteM.mutate(toDelete?.id)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Schedule Tab ─────────────────────────────────────────────────────────────
function ScheduleTab({ projectId }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = React.useRef(null);
  const defaultForm = { title: '', responsible: '', real_start_date: '', real_end_date: '', progress: 0, status: 'nao_iniciado', parent_id: '' };
  const [form, setForm] = useState(defaultForm);

  const { data: schedule = [] } = useQuery({
    queryKey: ['internalSchedule', projectId],
    queryFn: () => base44.entities.InternalSchedule.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const createM = useMutation({ mutationFn: d => base44.entities.InternalSchedule.create(d), onSuccess: () => { queryClient.invalidateQueries(['internalSchedule', projectId]); setModalOpen(false); } });
  const updateM = useMutation({ mutationFn: ({ id, data }) => base44.entities.InternalSchedule.update(id, data), onSuccess: () => { queryClient.invalidateQueries(['internalSchedule', projectId]); setModalOpen(false); setSelected(null); } });
  const deleteM = useMutation({ mutationFn: id => base44.entities.InternalSchedule.delete(id), onSuccess: () => { queryClient.invalidateQueries(['internalSchedule', projectId]); setDeleteOpen(false); setToDelete(null); } });

  // Get headers (items with ▌ prefix)
  const macroHeaders = [...schedule].filter(s => s.title?.startsWith('▌ ')).map(s => ({ id: s.id, title: s.title.replace('▌ ', '') }));

  const openCreate = () => { setSelected(null); setForm({ ...defaultForm, parent_id: macroHeaders.length > 0 ? macroHeaders[0].id : '' }); setModalOpen(true); };
   const openEdit = (s) => { setSelected(s); setForm({ title: s.title, responsible: s.responsible || '', real_start_date: s.real_start_date || '', real_end_date: s.real_end_date || '', progress: s.progress || 0, status: s.status || 'nao_iniciado', parent_id: s.parent_id || '' }); setModalOpen(true); };
   const handleSave = () => { const saveData = { ...form, project_id: projectId }; delete saveData.parent_id; if (selected) updateM.mutate({ id: selected.id, data: saveData }); else createM.mutate({ ...saveData, order: schedule.length }); };

  const parseExcelDate = (val) => {
    if (!val) return '';
    // Excel serial number
    if (typeof val === 'number') {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    }
    // String date
    const str = String(val).trim();
    // DD/MM/YYYY
    const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (brMatch) return `${brMatch[3]}-${brMatch[2].padStart(2,'0')}-${brMatch[1].padStart(2,'0')}`;
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    return '';
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { cellDates: false });

      // Try to find the "Cronograma" sheet, fallback to first
      const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('cronograma')) || wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      // Check if it's the standard model (has "Nome da Tarefa" column)
      const isStandardModel = rows.length > 0 && 'Nome da Tarefa' in rows[0];

      const toCreate = [];

      if (isStandardModel) {
        // Standard model: EDT, Nome da Tarefa, Responsável, % Conclusão, Previsão Início, Previsão Término, Real Início, Real Término
        const parseDateField = (val) => {
          if (!val || val === '') return '';
          const str = String(val).trim();
          const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (m) return `${m[1]}-${m[2]}-${m[3]}`;
          return parseExcelDate(val);
        };

        // Helper: count dots to determine level
        // "1"     → 0 dots → level 1 (grupo principal) — skip, só agrupa
        // "1.2"   → 1 dot  → level 2 (etapa chave)
        // "1.1.1" → 2 dots → level 3 (sub-etapa)
        const getEdtLevel = (edt) => (edt.match(/\./g) || []).length + 1;

        for (const row of rows) {
          const title = String(row['Nome da Tarefa'] || '').trim();
          if (!title) continue;
          const edt = String(row['EDT'] || '').trim();
          if (!edt || edt.toLowerCase() === 'edt') continue;

          const level = getEdtLevel(edt);

          // Level 1 (ex: "1", "2") = grupo principal — importa como separador/título
          // Level 2 (ex: "1.2") = etapa chave
          // Level 3+ (ex: "1.1.1") = sub-etapa

          const progressRaw = row['% Conclusão'];
          const progressVal = typeof progressRaw === 'number'
            ? (progressRaw <= 1 ? Math.round(progressRaw * 100) : Math.round(progressRaw))
            : 0;

          let status = 'nao_iniciado';
          if (progressVal >= 100) status = 'concluido';
          else if (progressVal > 0) status = 'em_andamento';

          const previsaoInicio = row['Previsão\nInício'] || row['Previsão Início'] || row['PrevisaoInicio'] || '';
          const previsaoFim = row['Previsão\nTérmino'] || row['Previsão Término'] || row['PrevisaoTermino'] || '';
          const realInicio = row['Real\nInício'] || row['Real Início'] || '';
          const realFim = row['Real\nTérmino'] || row['Real Término'] || '';
          const responsible = String(row['Responsável'] || '').trim();

          // Format title with hierarchy indentation prefix
          let displayTitle = title;
          if (level === 1) {
          displayTitle = `▌ ${title}`; // grupo principal — destaque
          } else if (level === 3) {
          displayTitle = `    • ${title}`; // sub-etapa — indentada
          } else if (level >= 4) {
          displayTitle = `        ◦ ${title}`; // sub-sub-etapa
          }

          toCreate.push({
            title: displayTitle,
            edt, // salva o EDT original
            responsible,
            start_date: parseDateField(previsaoInicio),
            end_date: parseDateField(previsaoFim),
            real_start_date: parseDateField(realInicio),
            real_end_date: parseDateField(realFim),
            progress: progressVal,
            status,
            project_id: projectId,
            order: schedule.length + toCreate.length,
          });
        }
      } else {
        // Generic model: col A = nome, col B = início, col C = fim
        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const headerKeywords = ['etapa', 'nome', 'título', 'titulo', 'tarefa', 'atividade', 'inicio', 'início', 'fim'];
        const isHeader = (row) => row.some(c => headerKeywords.includes(String(c).toLowerCase().trim()));
        let startIdx = rawRows.length > 0 && isHeader(rawRows[0]) ? 1 : 0;
        for (let i = startIdx; i < rawRows.length; i++) {
          const row = rawRows[i];
          const title = String(row[0] || '').trim();
          if (!title) continue;
          toCreate.push({
            title,
            start_date: parseExcelDate(row[1]),
            end_date: parseExcelDate(row[2]),
            status: 'nao_iniciado',
            progress: 0,
            project_id: projectId,
            order: schedule.length + toCreate.length,
          });
        }
      }

      if (toCreate.length === 0) {
        toast.error('Nenhuma etapa encontrada no arquivo.');
      } else {
        await base44.entities.InternalSchedule.bulkCreate(toCreate);
        queryClient.invalidateQueries(['internalSchedule', projectId]);
        toast.success(`${toCreate.length} etapa(s) importada(s) com sucesso!`);
      }
    } catch {
      toast.error('Erro ao ler o arquivo. Verifique o formato.');
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const statusConfig = {
    nao_iniciado: { color: 'bg-slate-500', label: 'Não Iniciado', badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
    em_andamento: { color: 'bg-blue-500', label: 'Em Andamento', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    concluido: { color: 'bg-green-500', label: 'Concluído', badge: 'bg-green-500/20 text-green-400 border-green-500/30' },
    atrasado: { color: 'bg-red-500', label: 'Atrasado', badge: 'bg-red-500/20 text-red-400 border-red-500/30' },
  };

  const sorted = [...schedule].sort((a, b) => a.order - b.order);
  const completedCount = sorted.filter(s => s.status === 'concluido').length;
  const avgProgress = sorted.length > 0
    ? Math.round(sorted.reduce((sum, s) => sum + (s.progress || 0), 0) / sorted.length)
    : 0;

  const statusColorMap = {
    nao_iniciado: 'bg-slate-600', em_andamento: 'bg-blue-600',
    concluido: 'bg-green-600', atrasado: 'bg-red-600'
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-white">Cronograma</h1><p className="text-slate-400 mt-1">{sorted.length} etapas · {completedCount} concluídas</p></div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="hidden" />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <Upload className="w-4 h-4 mr-2" />{importing ? 'Importando...' : 'Importar Excel'}
          </Button>
          <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2" />Nova Etapa</Button>
        </div>
      </div>

      {/* Excel format hint */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg px-4 py-3 text-xs text-slate-400">
        <span className="font-semibold text-slate-300">Formatos aceitos:</span>{' '}
        <span className="text-white">Modelo padrão interno</span> (colunas: EDT, Nome da Tarefa, Responsável, % Conclusão, Previsão Início/Término, Real Início/Término) ou{' '}
        <span className="text-white">planilha simples</span> (col A: nome · col B: início · col C: fim).
      </div>

      {sorted.length > 0 && (
        <div className="flex items-center gap-4 bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <div className="text-sm text-slate-400 min-w-[120px]">Progresso Médio</div>
          <div className="flex-1"><Progress value={avgProgress} className="h-3" /></div>
          <div className="text-lg font-bold text-white min-w-[50px] text-right">{avgProgress}%</div>
        </div>
      )}

      {sorted.length > 0 ? (
        <div className="overflow-x-auto bg-slate-800 rounded-lg border border-slate-700">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 w-16">EDT</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 w-[28%]">Etapa</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Responsável</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Data Inicial</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Data Final</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Conclusão</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(item => {
                // Detect header/group rows by the ▌ prefix (EDT was empty during import)
                const isHeader = item.title?.startsWith('▌ ');

                if (isHeader) {
                  return (
                    <tr key={item.id} className="border-b border-slate-700/50 bg-slate-900/40 group">
                      <td className="px-3 py-3 text-xs text-slate-500 font-mono"></td>
                      <td className="px-4 py-3" colSpan={8}>
                        <span className="font-semibold text-white text-base">
                          {item.title.replace('▌ ', '')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(item)} className="text-slate-400 hover:text-blue-400 transition"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => { setToDelete(item); setDeleteOpen(true); }} className="text-slate-400 hover:text-red-400 transition"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={item.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 group">
                    <td className="px-3 py-3 text-xs text-slate-500 font-mono">{item.edt || ''}</td>
                    <td className="px-4 py-3 text-sm text-white font-medium">{item.title}</td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2.5 py-1 rounded text-xs font-medium text-white", statusColorMap[item.status] || 'bg-slate-600')}>
                        {statusConfig[item.status]?.label || item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">{item.responsible || '-'}</td>
                     <td className="px-4 py-3 text-sm text-slate-300">
                       {item.real_start_date ? format(new Date(item.real_start_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                     </td>
                     <td className="px-4 py-3 text-sm text-slate-300">
                       {item.real_end_date ? format(new Date(item.real_end_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                     </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <Progress value={item.progress || 0} className="h-2 flex-1" />
                        <span className="text-xs text-slate-400 min-w-[35px] text-right">{item.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(item)} className="text-slate-400 hover:text-blue-400 transition"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => { setToDelete(item); setDeleteOpen(true); }} className="text-slate-400 hover:text-red-400 transition"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={Calendar} title="Nenhuma etapa cadastrada" description="Adicione etapas para acompanhar o cronograma" action={<Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2" />Adicionar Etapa</Button>} />
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader><DialogTitle>{selected ? 'Editar Etapa' : 'Nova Etapa'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-slate-300 text-xs">Nome da Etapa *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="bg-slate-700 border-slate-600 text-white" /></div>
            <div className="space-y-1"><Label className="text-slate-300 text-xs">Responsável</Label><Input value={form.responsible || ''} onChange={e => setForm(p => ({ ...p, responsible: e.target.value }))} placeholder="Nome do responsável" className="bg-slate-700 border-slate-600 text-white" /></div>
            {macroHeaders.length > 0 && (
              <div className="space-y-1">
                <Label className="text-slate-300 text-xs">Etapa Macro</Label>
                <Select value={form.parent_id || ''} onValueChange={v => setForm(p => ({ ...p, parent_id: v }))}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue placeholder="Selecionar etapa..." /></SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {macroHeaders.map(h => <SelectItem key={h.id} value={h.id}>{h.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-slate-300 text-xs">Data Inicial</Label><Input type="date" value={form.real_start_date || ''} onChange={e => setForm(p => ({ ...p, real_start_date: e.target.value }))} className="bg-slate-700 border-slate-600 text-white" /></div>
              <div className="space-y-1"><Label className="text-slate-300 text-xs">Data Final</Label><Input type="date" value={form.real_end_date || ''} onChange={e => setForm(p => ({ ...p, real_end_date: e.target.value }))} className="bg-slate-700 border-slate-600 text-white" /></div>
            </div>
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">% Conclusão: {form.progress || 0}%</Label>
              <input type="range" min="0" max="100" step="5" value={form.progress || 0} onChange={e => setForm(p => ({ ...p, progress: Number(e.target.value) }))} className="w-full accent-indigo-500" />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="nao_iniciado">Não Iniciado</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.title} className="bg-indigo-600 hover:bg-indigo-700">{selected ? 'Salvar' : 'Adicionar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader><AlertDialogTitle className="text-white">Excluir etapa?</AlertDialogTitle><AlertDialogDescription className="text-slate-400">Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteM.mutate(toDelete?.id)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Migration Tab (reused from existing) ────────────────────────────────────
function MigrationTab({ projectId }) {
  const queryClient = useQueryClient();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');

  const { data: products = [] } = useQuery({
    queryKey: ['internalProducts', projectId],
    queryFn: () => base44.entities.InternalProduct.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['internalMigTasks', projectId],
    queryFn: () => base44.entities.InternalChecklist.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  React.useEffect(() => {
    if (products.length > 0 && !selectedProduct) setSelectedProduct(products[0].id);
  }, [products.length]);

  const createM = useMutation({ mutationFn: d => base44.entities.InternalChecklist.create(d), onSuccess: () => { queryClient.invalidateQueries(['internalMigTasks', projectId]); setNewTaskTitle(''); } });
  const toggleM = useMutation({ mutationFn: ({ id, completed }) => base44.entities.InternalChecklist.update(id, { completed }), onSuccess: () => queryClient.invalidateQueries(['internalMigTasks', projectId]) });
  const deleteM = useMutation({ mutationFn: id => base44.entities.InternalChecklist.delete(id), onSuccess: () => queryClient.invalidateQueries(['internalMigTasks', projectId]) });

  const productTasks = tasks.filter(t => t.project_id === projectId);
  const progress = productTasks.length > 0 ? Math.round(productTasks.filter(t => t.completed).length / productTasks.length * 100) : 0;

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    createM.mutate({ action: newTaskTitle, project_id: projectId, order: productTasks.length });
    setNewTaskTitle('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-white">Migração</h1><p className="text-slate-400 mt-1">Checklist de migração do projeto</p></div>
        {productTasks.length > 0 && (
          <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-4 py-2 border border-slate-700/50">
            <span className="text-sm text-slate-400">Progresso</span>
            <div className="w-24"><Progress value={progress} className="h-2" /></div>
            <span className="text-white font-bold text-sm">{progress}%</span>
          </div>
        )}
      </div>

      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader><CardTitle className="text-white text-base">Tarefas de Migração</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()} placeholder="Nova tarefa de migração..." className="bg-slate-700 border-slate-600 text-white" />
            <Button onClick={addTask} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="space-y-2">
            {productTasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 group">
                <Checkbox checked={task.completed} onCheckedChange={c => toggleM.mutate({ id: task.id, completed: c })} className="border-slate-500 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600" />
                <span className={cn("flex-1 text-sm", task.completed ? "text-slate-500 line-through" : "text-white")}>{task.action}</span>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100" onClick={() => deleteM.mutate(task.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            ))}
            {productTasks.length === 0 && <p className="text-slate-500 text-sm text-center py-6">Nenhuma tarefa cadastrada. Adicione tarefas de migração acima.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Checklist Tab ────────────────────────────────────────────────────────────
function ChecklistTab({ projectId }) {
  const queryClient = useQueryClient();
  const [newAction, setNewAction] = useState('');
  const [newResponsible, setNewResponsible] = useState('');

  const { data: checklist = [] } = useQuery({
    queryKey: ['internalChecklist', projectId],
    queryFn: () => base44.entities.InternalChecklist.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const createM = useMutation({ mutationFn: d => base44.entities.InternalChecklist.create(d), onSuccess: () => { queryClient.invalidateQueries(['internalChecklist', projectId]); setNewAction(''); setNewResponsible(''); } });
  const toggleM = useMutation({ mutationFn: ({ id, completed }) => base44.entities.InternalChecklist.update(id, { completed }), onSuccess: () => queryClient.invalidateQueries(['internalChecklist', projectId]) });
  const deleteM = useMutation({ mutationFn: id => base44.entities.InternalChecklist.delete(id), onSuccess: () => queryClient.invalidateQueries(['internalChecklist', projectId]) });

  const sorted = [...checklist].sort((a, b) => a.order - b.order);
  const completed = sorted.filter(c => c.completed).length;
  const progress = sorted.length > 0 ? Math.round((completed / sorted.length) * 100) : 0;

  const addItem = () => {
    if (!newAction.trim()) return;
    createM.mutate({ action: newAction, responsible: newResponsible, project_id: projectId, order: sorted.length });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-white">Checklist do Projeto</h1><p className="text-slate-400 mt-1">{completed} de {sorted.length} itens concluídos</p></div>
        {sorted.length > 0 && (
          <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-4 py-2 border border-slate-700/50">
            <span className="text-sm text-slate-400">Progresso</span>
            <div className="w-24"><Progress value={progress} className="h-2" /></div>
            <span className="text-white font-bold text-sm">{progress}%</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {sorted.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><p className="text-2xl font-bold text-white">{sorted.length}</p><p className="text-xs text-slate-400">Total</p></div>
              <div><p className="text-2xl font-bold text-green-400">{completed}</p><p className="text-xs text-slate-400">Concluídos</p></div>
              <div><p className="text-2xl font-bold text-orange-400">{sorted.length - completed}</p><p className="text-xs text-slate-400">Pendentes</p></div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader><CardTitle className="text-white text-base">Itens do Checklist</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={newAction} onChange={e => setNewAction(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()} placeholder="Ação a ser executada..." className="bg-slate-700 border-slate-600 text-white flex-1" />
            <Input value={newResponsible} onChange={e => setNewResponsible(e.target.value)} placeholder="Responsável" className="bg-slate-700 border-slate-600 text-white w-40" />
            <Button onClick={addItem} disabled={!newAction.trim()} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="space-y-2">
            {sorted.map(item => (
              <div key={item.id} className={cn("flex items-center gap-3 p-3 rounded-lg transition-all group", item.completed ? "bg-slate-800/30" : "bg-slate-700/30 hover:bg-slate-700/50")}>
                <Checkbox checked={item.completed} onCheckedChange={c => toggleM.mutate({ id: item.id, completed: c })} className="border-slate-500 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600" />
                <div className="flex-1 min-w-0">
                  <span className={cn("text-sm", item.completed ? "text-slate-500 line-through" : "text-white")}>{item.action}</span>
                  {item.responsible && <p className="text-xs text-slate-500 mt-0.5">Resp: {item.responsible}</p>}
                </div>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100" onClick={() => deleteM.mutate(item.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            ))}
            {sorted.length === 0 && <p className="text-slate-500 text-sm text-center py-8">Nenhum item adicionado ao checklist.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Travels Tab ──────────────────────────────────────────────────────────────
function TravelsTab({ projectId }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const defaultForm = { title: '', start_date: '', end_date: '', location: '', status: 'planejada', notes: '' };
  const [form, setForm] = useState(defaultForm);

  const { data: travels = [] } = useQuery({
    queryKey: ['travels', projectId],
    queryFn: () => base44.entities.Travel.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const createM = useMutation({ mutationFn: d => base44.entities.Travel.create(d), onSuccess: () => { queryClient.invalidateQueries(['travels', projectId]); setModalOpen(false); } });
  const updateM = useMutation({ mutationFn: ({ id, data }) => base44.entities.Travel.update(id, data), onSuccess: () => { queryClient.invalidateQueries(['travels', projectId]); setModalOpen(false); setSelected(null); } });
  const deleteM = useMutation({ mutationFn: id => base44.entities.Travel.delete(id), onSuccess: () => { queryClient.invalidateQueries(['travels', projectId]); setDeleteOpen(false); setToDelete(null); } });

  const openCreate = () => { setSelected(null); setForm(defaultForm); setModalOpen(true); };
  const openEdit = (t) => { setSelected(t); setForm({ title: t.title, start_date: t.start_date || '', end_date: t.end_date || '', location: t.location || '', status: t.status || 'planejada', notes: t.notes || '' }); setModalOpen(true); };
  const handleSave = () => { if (selected) updateM.mutate({ id: selected.id, data: { ...form, project_id: projectId } }); else createM.mutate({ ...form, project_id: projectId }); };

  const statusColors = { planejada: 'bg-blue-500/20 text-blue-400', confirmada: 'bg-green-500/20 text-green-400', realizada: 'bg-purple-500/20 text-purple-400', cancelada: 'bg-red-500/20 text-red-400' };
  const statusLabels = { planejada: 'Planejada', confirmada: 'Confirmada', realizada: 'Realizada', cancelada: 'Cancelada' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-white">Viagens</h1><p className="text-slate-400 mt-1">{travels.length} viagem(ns) registrada(s)</p></div>
        <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2" />Nova Viagem</Button>
      </div>
      {travels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {travels.map(t => (
            <Card key={t.id} className="bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 transition-all group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{t.title}</h3>
                    <Badge className={cn("text-xs mt-1", statusColors[t.status])}>{statusLabels[t.status]}</Badge>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-white" onClick={() => openEdit(t)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => { setToDelete(t); setDeleteOpen(true); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                <div className="mt-2 space-y-1 text-xs text-slate-400">
                  {t.location && <p>📍 {t.location}</p>}
                  {t.start_date && <p>📅 {format(new Date(t.start_date), 'dd/MM/yyyy', { locale: ptBR })}{t.end_date ? ` → ${format(new Date(t.end_date), 'dd/MM/yyyy', { locale: ptBR })}` : ''}</p>}
                  {t.notes && <p className="text-slate-500 line-clamp-1">{t.notes}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={Plane} title="Nenhuma viagem registrada" action={<Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2" />Nova Viagem</Button>} />
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader><DialogTitle>{selected ? 'Editar Viagem' : 'Nova Viagem'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-slate-300 text-xs">Título/Objetivo *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="bg-slate-700 border-slate-600 text-white" /></div>
            <div className="space-y-1"><Label className="text-slate-300 text-xs">Destino</Label><Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} className="bg-slate-700 border-slate-600 text-white" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-slate-300 text-xs">Início</Label><Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} className="bg-slate-700 border-slate-600 text-white" /></div>
              <div className="space-y-1"><Label className="text-slate-300 text-xs">Fim</Label><Input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} className="bg-slate-700 border-slate-600 text-white" /></div>
            </div>
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-slate-300 text-xs">Observações</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="bg-slate-700 border-slate-600 text-white h-16 resize-none" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.title} className="bg-indigo-600 hover:bg-indigo-700">{selected ? 'Salvar' : 'Adicionar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader><AlertDialogTitle className="text-white">Excluir viagem?</AlertDialogTitle><AlertDialogDescription className="text-slate-400">Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteM.mutate(toDelete?.id)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Budget Tab ───────────────────────────────────────────────────────────────
function BudgetTab({ projectId, project }) {
  const queryClient = useQueryClient();
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [importerOpen, setImporterOpen] = useState(false);

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', projectId],
    queryFn: () => base44.entities.Expense.filter({ project_id: projectId }, '-date'),
    enabled: !!projectId
  });

  const createM = useMutation({ mutationFn: d => base44.entities.Expense.create(d), onSuccess: () => { queryClient.invalidateQueries(['expenses', projectId]); setExpenseModalOpen(false); setSelectedExpense(null); } });
  const updateM = useMutation({ mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data), onSuccess: () => { queryClient.invalidateQueries(['expenses', projectId]); setExpenseModalOpen(false); setSelectedExpense(null); } });
  const deleteM = useMutation({ mutationFn: id => base44.entities.Expense.delete(id), onSuccess: () => { queryClient.invalidateQueries(['expenses', projectId]); setDeleteOpen(false); setToDelete(null); } });

  const handleSave = (data) => { if (selectedExpense) updateM.mutate({ id: selectedExpense.id, data }); else createM.mutate({ ...data, project_id: projectId }); };

  const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const totalBudget = project?.budget || 0;
  const totalSpent = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const remaining = totalBudget - totalSpent;
  const spentPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const categoryLabels = { viagem: 'Viagem', hospedagem: 'Hospedagem', alimentacao: 'Alimentação', transporte: 'Transporte', material: 'Material', servico: 'Serviço', outros: 'Outros' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-white">Orçamento</h1><p className="text-slate-400 mt-1">Controle financeiro do projeto</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImporterOpen(true)} className="border-slate-600 text-slate-300 hover:bg-slate-700"><Upload className="w-4 h-4 mr-2" />Importar</Button>
          <Button onClick={() => { setSelectedExpense(null); setExpenseModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2" />Nova Despesa</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1"><p className="text-sm text-blue-200">Orçamento Total</p><DollarSign className="w-5 h-5 text-blue-400" /></div>
            <p className="text-2xl font-bold text-white">{fmt(totalBudget)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-600/20 to-red-800/20 border-red-500/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1"><p className="text-sm text-red-200">Valor Gasto</p><TrendingDown className="w-5 h-5 text-red-400" /></div>
            <p className="text-2xl font-bold text-white">{fmt(totalSpent)}</p>
            <p className="text-xs text-red-300 mt-1">{spentPct}% do orçamento</p>
          </CardContent>
        </Card>
        <Card className={cn("border", remaining >= 0 ? "bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/30" : "bg-gradient-to-br from-orange-600/20 to-orange-800/20 border-orange-500/30")}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <p className={cn("text-sm", remaining >= 0 ? "text-green-200" : "text-orange-200")}>Saldo Restante</p>
              {remaining >= 0 ? <TrendingUp className="w-5 h-5 text-green-400" /> : <AlertCircle className="w-5 h-5 text-orange-400" />}
            </div>
            <p className="text-2xl font-bold text-white">{fmt(remaining)}</p>
            {remaining < 0 && <p className="text-xs text-orange-300 mt-1">Orçamento excedido!</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-5">
          <div className="flex justify-between text-sm mb-2"><span className="text-slate-400">Execução do Orçamento</span><span className="text-white font-medium">{spentPct}%</span></div>
          <Progress value={Math.min(spentPct, 100)} className="h-3" />
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader><CardTitle className="text-white text-base">Despesas Registradas</CardTitle></CardHeader>
        <CardContent>
          {expenses.length > 0 ? (
            <div className="space-y-2">
              {expenses.map(e => (
                <div key={e.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors group">
                  <div className="flex-1">
                    <h3 className="text-white font-medium text-sm">{e.title}</h3>
                    <p className="text-xs text-slate-400">{categoryLabels[e.category] || e.category} · {format(new Date(e.date), 'dd/MM/yyyy', { locale: ptBR })}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white">{fmt(e.amount)}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-400 hover:text-blue-300" onClick={() => { setSelectedExpense(e); setExpenseModalOpen(true); }}><Pencil className="w-3 h-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => { setToDelete(e); setDeleteOpen(true); }}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <DollarSign className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <p className="text-slate-400">Nenhuma despesa registrada</p>
              <Button onClick={() => setExpenseModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 mt-4"><Plus className="w-4 h-4 mr-2" />Adicionar Despesa</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ExpenseModal open={expenseModalOpen} onOpenChange={setExpenseModalOpen} expense={selectedExpense} onSave={handleSave} />
      <ExpenseImporter open={importerOpen} onOpenChange={setImporterOpen} projectId={projectId} onImported={() => queryClient.invalidateQueries(['expenses', projectId])} />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader><AlertDialogTitle className="text-white">Excluir despesa?</AlertDialogTitle><AlertDialogDescription className="text-slate-400">Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteM.mutate(toDelete?.id)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Risks Tab ────────────────────────────────────────────────────────────────
function RisksTab({ projectId }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const defaultForm = { title: '', category: 'tecnico', probability: 'media', impact: 'medio', mitigation: '', status: 'identificado' };
  const [form, setForm] = useState(defaultForm);

  const { data: risks = [] } = useQuery({
    queryKey: ['internalRisks', projectId],
    queryFn: () => base44.entities.InternalRisk.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const createM = useMutation({ mutationFn: d => base44.entities.InternalRisk.create(d), onSuccess: () => { queryClient.invalidateQueries(['internalRisks', projectId]); setModalOpen(false); } });
  const updateM = useMutation({ mutationFn: ({ id, data }) => base44.entities.InternalRisk.update(id, data), onSuccess: () => { queryClient.invalidateQueries(['internalRisks', projectId]); setModalOpen(false); setSelected(null); } });
  const deleteM = useMutation({ mutationFn: id => base44.entities.InternalRisk.delete(id), onSuccess: () => { queryClient.invalidateQueries(['internalRisks', projectId]); setDeleteOpen(false); setToDelete(null); } });

  const openCreate = () => { setSelected(null); setForm(defaultForm); setModalOpen(true); };
  const openEdit = (r) => { setSelected(r); setForm({ title: r.title, category: r.category || 'tecnico', probability: r.probability || 'media', impact: r.impact || 'medio', mitigation: r.mitigation || '', status: r.status || 'identificado' }); setModalOpen(true); };
  const handleSave = () => { if (selected) updateM.mutate({ id: selected.id, data: { ...form, project_id: projectId } }); else createM.mutate({ ...form, project_id: projectId }); };

  const probImpactScore = { baixa: 1, media: 2, alta: 3, baixo: 1, medio: 2, alto: 3 };
  const getSeverity = (r) => {
    const score = (probImpactScore[r.probability] || 2) * (probImpactScore[r.impact] || 2);
    if (score >= 9) return { label: 'Crítico', color: 'bg-red-600', badge: 'bg-red-500/20 text-red-400 border-red-500/30' };
    if (score >= 6) return { label: 'Alto', color: 'bg-orange-500', badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30' };
    if (score >= 3) return { label: 'Médio', color: 'bg-yellow-500', badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
    return { label: 'Baixo', color: 'bg-green-600', badge: 'bg-green-500/20 text-green-400 border-green-500/30' };
  };

  const categoryLabels = { tecnico: 'Técnico', cronograma: 'Cronograma', recurso: 'Recurso', externo: 'Externo', outro: 'Outro' };
  const statusColors = { identificado: 'bg-slate-500', em_monitoramento: 'bg-yellow-500', mitigado: 'bg-green-500', ocorreu: 'bg-red-500' };
  const statusLabels = { identificado: 'Identificado', em_monitoramento: 'Monitorando', mitigado: 'Mitigado', ocorreu: 'Ocorreu' };

  const activeRisks = risks.filter(r => r.status !== 'mitigado');
  const mitigated = risks.filter(r => r.status === 'mitigado');
  const critical = risks.filter(r => (probImpactScore[r.probability] || 2) * (probImpactScore[r.impact] || 2) >= 9).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-white">Riscos do Projeto</h1><p className="text-slate-400 mt-1">{activeRisks.length} riscos ativos</p></div>
        <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2" />Adicionar Risco</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Críticos', value: critical, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20' },
          { label: 'Monitorando', value: risks.filter(r => r.status === 'em_monitoramento').length, icon: Shield, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
          { label: 'Mitigados', value: mitigated.length, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20' },
        ].map(s => (
          <Card key={s.label} className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("p-2.5 rounded-xl", s.bg)}><s.icon className={cn("w-5 h-5", s.color)} /></div>
              <div><p className="text-xl font-bold text-white">{s.value}</p><p className="text-xs text-slate-400">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {risks.length > 0 ? (
        <div className="space-y-3">
          {activeRisks.sort((a, b) => (probImpactScore[b.probability] || 2) * (probImpactScore[b.impact] || 2) - (probImpactScore[a.probability] || 2) * (probImpactScore[a.impact] || 2)).map(risk => {
            const sev = getSeverity(risk);
            return (
              <Card key={risk.id} className="bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 transition-all group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <div className={cn("w-2 h-2 rounded-full flex-shrink-0", statusColors[risk.status])} />
                        <Badge className={cn("border text-xs", sev.badge)}>{sev.label}</Badge>
                        <Badge className="bg-slate-700/50 text-slate-300 text-xs">{categoryLabels[risk.category]}</Badge>
                      </div>
                      <h3 className="font-semibold text-white text-sm">{risk.title}</h3>
                      <div className="flex gap-4 text-xs mt-1 text-slate-400">
                        <span>Prob: <span className="text-white">{risk.probability}</span></span>
                        <span>Impacto: <span className="text-white">{risk.impact}</span></span>
                        <span className="text-slate-500">{statusLabels[risk.status]}</span>
                      </div>
                      {risk.mitigation && <p className="text-xs text-slate-500 mt-1 line-clamp-1">Mitigação: {risk.mitigation}</p>}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-white" onClick={() => openEdit(risk)}><Pencil className="w-3 h-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => { setToDelete(risk); setDeleteOpen(true); }}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {mitigated.length > 0 && (
            <div className="opacity-50">
              <p className="text-xs text-slate-500 mb-2">Mitigados ({mitigated.length})</p>
              {mitigated.map(r => (
                <Card key={r.id} className="bg-slate-800/30 border-slate-700/30 group mb-2">
                  <CardContent className="p-3 flex items-center justify-between">
                    <p className="text-sm text-slate-400 line-through">{r.title}</p>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400 opacity-0 group-hover:opacity-100" onClick={() => { setToDelete(r); setDeleteOpen(true); }}><Trash2 className="w-3 h-3" /></Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <EmptyState icon={AlertTriangle} title="Nenhum risco cadastrado" action={<Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2" />Adicionar Risco</Button>} />
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
          <DialogHeader><DialogTitle>{selected ? 'Editar Risco' : 'Novo Risco'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-slate-300 text-xs">Descrição do Risco *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="bg-slate-700 border-slate-600 text-white" /></div>
            <div className="grid grid-cols-3 gap-3">
              {[['category','Categoria', { tecnico:'Técnico', cronograma:'Cronograma', recurso:'Recurso', externo:'Externo', outro:'Outro' }], ['probability','Probabilidade', { baixa:'Baixa', media:'Média', alta:'Alta' }], ['impact','Impacto', { baixo:'Baixo', medio:'Médio', alto:'Alto' }]].map(([field, label, opts]) => (
                <div key={field} className="space-y-1">
                  <Label className="text-slate-300 text-xs">{label}</Label>
                  <Select value={form[field]} onValueChange={v => setForm(p => ({ ...p, [field]: v }))}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm h-9"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {Object.entries(opts).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="identificado">Identificado</SelectItem>
                  <SelectItem value="em_monitoramento">Em Monitoramento</SelectItem>
                  <SelectItem value="mitigado">Mitigado</SelectItem>
                  <SelectItem value="ocorreu">Ocorreu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-slate-300 text-xs">Plano de Mitigação</Label><Textarea value={form.mitigation} onChange={e => setForm(p => ({ ...p, mitigation: e.target.value }))} className="bg-slate-700 border-slate-600 text-white h-16 resize-none" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.title} className="bg-indigo-600 hover:bg-indigo-700">{selected ? 'Salvar' : 'Adicionar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader><AlertDialogTitle className="text-white">Excluir risco?</AlertDialogTitle><AlertDialogDescription className="text-slate-400">Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteM.mutate(toDelete?.id)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InternalDashboard() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');

  const [activeTab, setActiveTab] = useState('overview');
  const [collapsed, setCollapsed] = useState(true);
  const [user, setUser] = useState(null);

  React.useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: project } = useQuery({
    queryKey: ['internalProject', projectId],
    queryFn: () => base44.entities.InternalProject.filter({ id: projectId }).then(r => r[0]),
    enabled: !!projectId
  });

  const { data: teamMembers = [] } = useQuery({ queryKey: ['internalTeam', projectId], queryFn: () => base44.entities.InternalTeamMember.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: checklist = [] } = useQuery({ queryKey: ['internalChecklist', projectId], queryFn: () => base44.entities.InternalChecklist.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: risks = [] } = useQuery({ queryKey: ['internalRisks', projectId], queryFn: () => base44.entities.InternalRisk.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: schedule = [] } = useQuery({ queryKey: ['internalSchedule', projectId], queryFn: () => base44.entities.InternalSchedule.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: budget = [] } = useQuery({ queryKey: ['expenses', projectId], queryFn: () => base44.entities.Expense.filter({ project_id: projectId }), enabled: !!projectId });

  if (!projectId) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Nenhum projeto selecionado.</p>
          <Link to={createPageUrl('InternalProjectsList')}><Button className="bg-indigo-600 hover:bg-indigo-700">Ver Projetos Internos</Button></Link>
        </div>
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab project={project} teamMembers={teamMembers} checklist={checklist} risks={risks} schedule={schedule} budget={budget} />;
      case 'team': return <TeamTab projectId={projectId} />;
      case 'stakeholders': return <StakeholdersTab projectId={projectId} />;
      case 'products': return <ProductsTab projectId={projectId} />;
      case 'schedule': return <ScheduleTab projectId={projectId} />;
      case 'migration': return <MigrationTab projectId={projectId} />;
      case 'checklist': return <ChecklistTab projectId={projectId} />;
      case 'activities': return <InternalActivitiesTab projectId={projectId} />;
      case 'discovery': return <InternalDiscoveryTab projectId={projectId} />;
      case 'travels': return <TravelsTab projectId={projectId} />;
      case 'budget': return <BudgetTab projectId={projectId} project={project} />;
      case 'risks': return <RisksTab projectId={projectId} />;
      case 'kpi': return <InternalKPITimeTab projectId={projectId} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} projectId={projectId} collapsed={collapsed} setCollapsed={setCollapsed} user={user} />
      <main className={cn("flex-1 transition-all duration-300", collapsed ? "ml-20" : "ml-64")}>
        <div className="p-6 lg:p-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6 text-sm text-slate-500">
            <Link to={createPageUrl('InternalProjectsList')} className="hover:text-white transition-colors">Projetos Internos</Link>
            <span>/</span>
            <span className="text-slate-300">{project?.name || 'Carregando...'}</span>
          </div>
          {renderTab()}
        </div>
      </main>
    </div>
  );
}