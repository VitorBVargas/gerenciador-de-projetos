import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronLeft, Check, Plus, X, Pencil, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

const STEPS = [
  { id: 'general', label: 'Dados Gerais', icon: '📋' },
  { id: 'schedule', label: 'Cronograma', icon: '📅' },
  { id: 'team', label: 'Equipe', icon: '👥' },
  { id: 'stakeholders', label: 'Stakeholders', icon: '🤝' },
  { id: 'products', label: 'Produtos', icon: '📦' },
  { id: 'checklist', label: 'Checklist', icon: '✅' },
  { id: 'risks', label: 'Riscos', icon: '⚠️' },
];

const defaultGeneral = { name: '', manager: '', description: '', deadline: '', budget: '', status: 'planejamento' };
const defaultScheduleItem = { title: '', start_date: '', end_date: '' };
const defaultTeamItem = { name: '', role: '', email: '', phone: '' };
const defaultStakeholder = { name: '', role: '', email: '', phone: '' };
const defaultProduct = { name: '', delivery: '', monitoring: '', status: 'pendente' };
const defaultChecklist = { action: '', responsible: '' };
const defaultRisk = { title: '', category: 'tecnico', probability: 'media', impact: 'medio', mitigation: '' };

export default function InternalProjectWizard({ open, onOpenChange, onComplete }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [general, setGeneral] = useState(defaultGeneral);
  const [scheduleItems, setScheduleItems] = useState([]);
  const [scheduleForm, setScheduleForm] = useState(defaultScheduleItem);
  const [editingScheduleIdx, setEditingScheduleIdx] = useState(null);

  const [teamItems, setTeamItems] = useState([]);
  const [teamForm, setTeamForm] = useState(defaultTeamItem);

  const [stakeholders, setStakeholders] = useState([]);
  const [stakeholderForm, setStakeholderForm] = useState(defaultStakeholder);

  const [products, setProducts] = useState([]);
  const [productForm, setProductForm] = useState(defaultProduct);

  const [checklistItems, setChecklistItems] = useState([]);
  const [checklistForm, setChecklistForm] = useState(defaultChecklist);

  const [risks, setRisks] = useState([]);
  const [riskForm, setRiskForm] = useState(defaultRisk);

  const handleClose = () => {
    setStep(0);
    setGeneral(defaultGeneral);
    setScheduleItems([]); setScheduleForm(defaultScheduleItem); setEditingScheduleIdx(null);
    setTeamItems([]); setTeamForm(defaultTeamItem);
    setStakeholders([]); setStakeholderForm(defaultStakeholder);
    setProducts([]); setProductForm(defaultProduct);
    setChecklistItems([]); setChecklistForm(defaultChecklist);
    setRisks([]); setRiskForm(defaultRisk);
    onOpenChange(false);
  };

  // Schedule
  const addOrEditSchedule = () => {
    if (!scheduleForm.title) return;
    if (editingScheduleIdx !== null) {
      setScheduleItems(prev => prev.map((item, i) => i === editingScheduleIdx ? { ...scheduleForm } : item));
      setEditingScheduleIdx(null);
    } else {
      setScheduleItems(prev => [...prev, { ...scheduleForm }]);
    }
    setScheduleForm(defaultScheduleItem);
  };
  const editSchedule = (idx) => { setScheduleForm({ ...scheduleItems[idx] }); setEditingScheduleIdx(idx); };
  const deleteSchedule = (idx) => setScheduleItems(prev => prev.filter((_, i) => i !== idx));

  // Team
  const addTeam = () => { if (!teamForm.name) return; setTeamItems(prev => [...prev, { ...teamForm }]); setTeamForm(defaultTeamItem); };
  const removeTeam = (idx) => setTeamItems(prev => prev.filter((_, i) => i !== idx));

  // Stakeholders
  const addStakeholder = () => { if (!stakeholderForm.name) return; setStakeholders(prev => [...prev, { ...stakeholderForm }]); setStakeholderForm(defaultStakeholder); };
  const removeStakeholder = (idx) => setStakeholders(prev => prev.filter((_, i) => i !== idx));

  // Products
  const addProduct = () => { if (!productForm.name) return; setProducts(prev => [...prev, { ...productForm }]); setProductForm(defaultProduct); };
  const removeProduct = (idx) => setProducts(prev => prev.filter((_, i) => i !== idx));

  // Checklist
  const addChecklist = () => { if (!checklistForm.action) return; setChecklistItems(prev => [...prev, { ...checklistForm }]); setChecklistForm(defaultChecklist); };
  const removeChecklist = (idx) => setChecklistItems(prev => prev.filter((_, i) => i !== idx));

  // Risks
  const addRisk = () => { if (!riskForm.title) return; setRisks(prev => [...prev, { ...riskForm }]); setRiskForm(defaultRisk); };
  const removeRisk = (idx) => setRisks(prev => prev.filter((_, i) => i !== idx));

  const handleFinish = async () => {
    setSaving(true);
    const project = await base44.entities.InternalProject.create({
      name: general.name,
      manager: general.manager,
      description: general.description,
      deadline: general.deadline || null,
      budget: general.budget ? parseFloat(general.budget) : undefined,
      status: general.status || 'planejamento',
    });
    const pid = project.id;
    const creates = [];
    scheduleItems.forEach((s, i) => creates.push(base44.entities.InternalSchedule.create({ ...s, project_id: pid, order: i })));
    teamItems.forEach(t => creates.push(base44.entities.InternalTeamMember.create({ ...t, project_id: pid })));
    stakeholders.forEach(s => creates.push(base44.entities.InternalStakeholder.create({ ...s, project_id: pid })));
    products.forEach(p => creates.push(base44.entities.InternalProduct.create({ ...p, project_id: pid })));
    checklistItems.forEach((c, i) => creates.push(base44.entities.InternalChecklist.create({ ...c, project_id: pid, order: i })));
    risks.forEach(r => creates.push(base44.entities.InternalRisk.create({ ...r, project_id: pid })));
    await Promise.all(creates);
    queryClient.invalidateQueries({ queryKey: ['internalProjects'] });
    setSaving(false);
    handleClose();
    onComplete?.();
  };

  const canProceed = () => step === 0 ? general.name.trim().length > 0 : true;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Novo Projeto Interno</DialogTitle>
          {/* Steps */}
          <div className="flex flex-wrap items-center gap-1 mt-3">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1">
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                  i === step ? 'bg-indigo-600 text-white' :
                  i < step ? 'bg-green-600/30 text-green-400' :
                  'bg-slate-700 text-slate-500'
                }`}>
                  {i < step ? <Check className="w-3 h-3" /> : <span>{s.icon}</span>}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">

          {/* Step 0: Dados Gerais */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Nome do Projeto *</Label>
                <Input value={general.name} onChange={e => setGeneral(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Implantação ERP" className="bg-slate-700 border-slate-600 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Responsável</Label>
                  <Input value={general.manager} onChange={e => setGeneral(p => ({ ...p, manager: e.target.value }))} placeholder="Nome do responsável" className="bg-slate-700 border-slate-600 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Prazo Final</Label>
                  <Input type="date" value={general.deadline} onChange={e => setGeneral(p => ({ ...p, deadline: e.target.value }))} className="bg-slate-700 border-slate-600 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Orçamento (R$)</Label>
                  <Input type="number" value={general.budget} onChange={e => setGeneral(p => ({ ...p, budget: e.target.value }))} placeholder="0,00" className="bg-slate-700 border-slate-600 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Status</Label>
                  <Select value={general.status} onValueChange={v => setGeneral(p => ({ ...p, status: v }))}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="planejamento">Planejamento</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="pausado">Pausado</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Descrição</Label>
                <Textarea value={general.description} onChange={e => setGeneral(p => ({ ...p, description: e.target.value }))} placeholder="Objetivo do projeto..." className="bg-slate-700 border-slate-600 text-white h-20 resize-none" />
              </div>
            </div>
          )}

          {/* Step 1: Cronograma */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">Adicione as etapas do cronograma com início e fim.</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 col-span-3 sm:col-span-1">
                  <Label className="text-slate-300 text-xs">Nome da Etapa *</Label>
                  <Input value={scheduleForm.title} onChange={e => setScheduleForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Planejamento" className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Início</Label>
                  <Input type="date" value={scheduleForm.start_date} onChange={e => setScheduleForm(p => ({ ...p, start_date: e.target.value }))} className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Fim</Label>
                  <Input type="date" value={scheduleForm.end_date} onChange={e => setScheduleForm(p => ({ ...p, end_date: e.target.value }))} className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
              </div>
              <Button onClick={addOrEditSchedule} disabled={!scheduleForm.title} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 w-full">
                <Plus className="w-4 h-4 mr-2" /> {editingScheduleIdx !== null ? 'Salvar Edição' : 'Adicionar Etapa'}
              </Button>
              {editingScheduleIdx !== null && (
                <Button variant="ghost" onClick={() => { setEditingScheduleIdx(null); setScheduleForm(defaultScheduleItem); }} className="w-full text-slate-400 hover:text-white text-xs">Cancelar edição</Button>
              )}
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {scheduleItems.map((s, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-white">{s.title}</p>
                      <p className="text-xs text-slate-400">{s.start_date || '—'} → {s.end_date || '—'}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => editSchedule(i)} className="text-slate-400 hover:text-blue-400 p-1"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteSchedule(i)} className="text-slate-400 hover:text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
                {scheduleItems.length === 0 && <p className="text-center text-slate-500 py-6 text-sm">Nenhuma etapa adicionada.</p>}
              </div>
            </div>
          )}

          {/* Step 2: Equipe */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">Adicione os membros da equipe do projeto.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Nome *</Label>
                  <Input value={teamForm.name} onChange={e => setTeamForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome completo" className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Cargo/Função</Label>
                  <Input value={teamForm.role} onChange={e => setTeamForm(p => ({ ...p, role: e.target.value }))} placeholder="Ex: Desenvolvedor" className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">E-mail</Label>
                  <Input value={teamForm.email} onChange={e => setTeamForm(p => ({ ...p, email: e.target.value }))} placeholder="email@betha.com.br" className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Telefone</Label>
                  <Input value={teamForm.phone} onChange={e => setTeamForm(p => ({ ...p, phone: e.target.value }))} placeholder="(00) 00000-0000" className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
              </div>
              <Button onClick={addTeam} disabled={!teamForm.name} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 w-full">
                <Plus className="w-4 h-4 mr-2" /> Adicionar Membro
              </Button>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {teamItems.map((t, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-white">{t.name}</p>
                      <p className="text-xs text-slate-400">{t.role}{t.email ? ` • ${t.email}` : ''}</p>
                    </div>
                    <button onClick={() => removeTeam(i)} className="text-slate-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                {teamItems.length === 0 && <p className="text-center text-slate-500 py-6 text-sm">Nenhum membro adicionado.</p>}
              </div>
            </div>
          )}

          {/* Step 3: Stakeholders */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">Adicione os stakeholders do projeto.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Nome *</Label>
                  <Input value={stakeholderForm.name} onChange={e => setStakeholderForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome completo" className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Cargo</Label>
                  <Input value={stakeholderForm.role} onChange={e => setStakeholderForm(p => ({ ...p, role: e.target.value }))} placeholder="Cargo/Papel" className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">E-mail</Label>
                  <Input value={stakeholderForm.email} onChange={e => setStakeholderForm(p => ({ ...p, email: e.target.value }))} placeholder="email@..." className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Telefone</Label>
                  <Input value={stakeholderForm.phone} onChange={e => setStakeholderForm(p => ({ ...p, phone: e.target.value }))} placeholder="(00) 00000-0000" className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
              </div>
              <Button onClick={addStakeholder} disabled={!stakeholderForm.name} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 w-full">
                <Plus className="w-4 h-4 mr-2" /> Adicionar Stakeholder
              </Button>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {stakeholders.map((s, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-white">{s.name}</p>
                      <p className="text-xs text-slate-400">{s.role}{s.email ? ` • ${s.email}` : ''}</p>
                    </div>
                    <button onClick={() => removeStakeholder(i)} className="text-slate-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                {stakeholders.length === 0 && <p className="text-center text-slate-500 py-6 text-sm">Nenhum stakeholder adicionado.</p>}
              </div>
            </div>
          )}

          {/* Step 4: Produtos */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">Registre os softwares/produtos envolvidos e o que precisa ser monitorado.</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Software/Produto *</Label>
                  <Input value={productForm.name} onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: ERP Financeiro" className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">O que será entregue</Label>
                  <Input value={productForm.delivery} onChange={e => setProductForm(p => ({ ...p, delivery: e.target.value }))} placeholder="Descreva a entrega..." className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">O que precisa ser monitorado</Label>
                  <Input value={productForm.monitoring} onChange={e => setProductForm(p => ({ ...p, monitoring: e.target.value }))} placeholder="Indicadores, métricas..." className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
              </div>
              <Button onClick={addProduct} disabled={!productForm.name} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 w-full">
                <Plus className="w-4 h-4 mr-2" /> Adicionar Produto
              </Button>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {products.map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-white">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.delivery}</p>
                    </div>
                    <button onClick={() => removeProduct(i)} className="text-slate-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                {products.length === 0 && <p className="text-center text-slate-500 py-6 text-sm">Nenhum produto adicionado.</p>}
              </div>
            </div>
          )}

          {/* Step 5: Checklist */}
          {step === 5 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">Adicione as ações que devem ser executadas e seus responsáveis.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <Label className="text-slate-300 text-xs">Ação *</Label>
                  <Input value={checklistForm.action} onChange={e => setChecklistForm(p => ({ ...p, action: e.target.value }))} placeholder="Descreva a ação..." className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Responsável</Label>
                  <Input value={checklistForm.responsible} onChange={e => setChecklistForm(p => ({ ...p, responsible: e.target.value }))} placeholder="Nome do responsável" className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
              </div>
              <Button onClick={addChecklist} disabled={!checklistForm.action} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 w-full">
                <Plus className="w-4 h-4 mr-2" /> Adicionar Item
              </Button>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {checklistItems.map((c, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-white">{c.action}</p>
                      {c.responsible && <p className="text-xs text-slate-400">Responsável: {c.responsible}</p>}
                    </div>
                    <button onClick={() => removeChecklist(i)} className="text-slate-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                {checklistItems.length === 0 && <p className="text-center text-slate-500 py-6 text-sm">Nenhum item adicionado.</p>}
              </div>
            </div>
          )}

          {/* Step 6: Riscos */}
          {step === 6 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">Identifique os riscos do projeto.</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Descrição do Risco *</Label>
                  <Input value={riskForm.title} onChange={e => setRiskForm(p => ({ ...p, title: e.target.value }))} placeholder="Descreva o risco..." className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Categoria</Label>
                    <Select value={riskForm.category} onValueChange={v => setRiskForm(p => ({ ...p, category: v }))}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm h-9"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="tecnico">Técnico</SelectItem>
                        <SelectItem value="cronograma">Cronograma</SelectItem>
                        <SelectItem value="recurso">Recurso</SelectItem>
                        <SelectItem value="externo">Externo</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Probabilidade</Label>
                    <Select value={riskForm.probability} onValueChange={v => setRiskForm(p => ({ ...p, probability: v }))}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm h-9"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Impacto</Label>
                    <Select value={riskForm.impact} onValueChange={v => setRiskForm(p => ({ ...p, impact: v }))}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm h-9"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="baixo">Baixo</SelectItem>
                        <SelectItem value="medio">Médio</SelectItem>
                        <SelectItem value="alto">Alto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Plano de Mitigação</Label>
                  <Textarea value={riskForm.mitigation} onChange={e => setRiskForm(p => ({ ...p, mitigation: e.target.value }))} placeholder="Como mitigar este risco..." className="bg-slate-700 border-slate-600 text-white text-sm h-16 resize-none" />
                </div>
              </div>
              <Button onClick={addRisk} disabled={!riskForm.title} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 w-full">
                <Plus className="w-4 h-4 mr-2" /> Adicionar Risco
              </Button>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {risks.map((r, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-white">{r.title}</p>
                      <p className="text-xs text-slate-400">{r.category} • prob. {r.probability} • impacto {r.impact}</p>
                    </div>
                    <button onClick={() => removeRisk(i)} className="text-slate-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                {risks.length === 0 && <p className="text-center text-slate-500 py-6 text-sm">Nenhum risco adicionado.</p>}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between border-t border-slate-700 pt-4">
          <Button
            variant="outline"
            onClick={() => step > 0 ? setStep(s => s - 1) : handleClose()}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            {step > 0 ? <><ChevronLeft className="w-4 h-4 mr-1" />Voltar</> : 'Cancelar'}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="bg-indigo-600 hover:bg-indigo-700">
              Próximo <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={saving} className="bg-green-600 hover:bg-green-700">
              {saving ? 'Salvando...' : <><Check className="w-4 h-4 mr-1" />Criar Projeto</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}