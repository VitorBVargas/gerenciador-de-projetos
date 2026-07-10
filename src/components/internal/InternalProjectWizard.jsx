import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronLeft, Check, Plus, X, Pencil, Trash2, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { INTERNAL_TYPE_META } from './internalProjectTypes';

const ALL_STEPS = [
  { id: 'general', label: 'Dados Gerais', icon: '📋' },
  { id: 'schedule', label: 'Cronograma', icon: '📅' },
  { id: 'team', label: 'Equipe', icon: '👥' },
  { id: 'stakeholders', label: 'Stakeholders', icon: '🤝' },
  { id: 'products', label: 'Produtos', icon: '📦' },
  { id: 'checklist', label: 'Checklist', icon: '✅' },
  { id: 'risks', label: 'Riscos', icon: '⚠️' },
];

// Passos exibidos por tipo de projeto. Ágil não usa cronograma/checklist tradicionais
// (o fluxo é Discovery → Product Backlog, disponível no dashboard após a criação).
const STEPS_BY_TYPE = {
  implantacao: ['general', 'schedule', 'team', 'stakeholders', 'products', 'checklist', 'risks'],
  sustentacao: ['general', 'schedule', 'team', 'stakeholders', 'products', 'checklist', 'risks'],
  agil: ['general', 'team', 'stakeholders', 'products'],
};

function getSteps(projectType) {
  const ids = STEPS_BY_TYPE[projectType] || STEPS_BY_TYPE.implantacao;
  return ids.map(id => ALL_STEPS.find(s => s.id === id));
}

const defaultGeneral = { name: '', project_type: 'implantacao', manager: '', description: '', deadline: '', budget: '', status: 'planejamento' };
const defaultScheduleItem = { title: '', start_date: '', end_date: '' };
const defaultTeamItem = { name: '', role: '', email: '', phone: '' };
const defaultStakeholder = { name: '', role: '', email: '', phone: '' };
const defaultProduct = { name: '', delivery: '', monitoring: '', status: 'pendente' };
const defaultChecklist = { action: '', responsible: '' };
const defaultRisk = { title: '', category: 'tecnico', probability: 'media', impact: 'medio', mitigation: '' };

export default function InternalProjectWizard({ open, onOpenChange, onComplete, projectType = 'implantacao' }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = React.useRef(null);

  const [general, setGeneral] = useState({ ...defaultGeneral, project_type: projectType });
  const STEPS = getSteps(general.project_type);
  const currentStepId = STEPS[step]?.id;

  // Sincroniza o tipo escolhido na tela de seleção quando o wizard abre
  React.useEffect(() => {
    if (open) {
      setGeneral({ ...defaultGeneral, project_type: projectType });
      setStep(0);
    }
  }, [open, projectType]);

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
    setGeneral({ ...defaultGeneral, project_type: projectType });
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

    // Adiciona automaticamente o Responsável à equipe (se preenchido e ainda não estiver na lista)
    const responsavelNome = (general.manager || '').trim();
    const teamToCreate = [...teamItems];
    if (responsavelNome) {
      const alreadyIncluded = teamToCreate.some(t => (t.name || '').trim().toLowerCase() === responsavelNome.toLowerCase());
      if (!alreadyIncluded) {
        teamToCreate.push({ name: responsavelNome, role: 'Responsável pelo Projeto', email: '', phone: '' });
      }
    }

    // ── Projeto Ágil interno: usa a entidade Project (is_internal) para reaproveitar
    // as telas Ágeis completas (Backlog, Sprint Board, Roadmap, Cerimônias, Métricas). ──
    if (general.project_type === 'agil') {
      const project = await base44.entities.Project.create({
        name: general.name,
        project_type: 'agil',
        is_internal: true,
        manager: general.manager,
        agil_responsavel: general.manager,
        agil_descricao: general.description,
        agil_objetivo: general.description,
        agil_start_date: general.deadline || null,
        budget: general.budget ? parseFloat(general.budget) : undefined,
        status: general.status || 'planejamento',
      });
      const pid = project.id;
      const creates = [];
      teamToCreate.forEach(t => creates.push(base44.entities.AgilTeamMember.create({ nome: t.name, funcao: t.role || '', email: t.email || '', telefone: t.phone || '', project_id: pid })));
      stakeholders.forEach(s => creates.push(base44.entities.Stakeholder.create({ name: s.name, role: s.role || '', email: s.email || '', phone: s.phone || '', project_id: pid })));
      products.forEach(p => creates.push(base44.entities.AgilProduct.create({ produto: p.name, descricao: p.delivery || '', observacao: p.monitoring || '', project_id: pid })));
      await Promise.all(creates);
      queryClient.invalidateQueries({ queryKey: ['internalProjects'] });
      setSaving(false);
      handleClose();
      onComplete?.();
      // Abre direto no dashboard Ágil (telas idênticas ao projeto normal)
      window.location.href = `/AgilDashboard?project_id=${pid}`;
      return;
    }

    const project = await base44.entities.InternalProject.create({
      name: general.name,
      project_type: general.project_type || 'implantacao',
      manager: general.manager,
      description: general.description,
      deadline: general.deadline || null,
      budget: general.budget ? parseFloat(general.budget) : undefined,
      status: general.status || 'planejamento',
    });
    const pid = project.id;
    const creates = [];
    scheduleItems.forEach((s, i) => creates.push(base44.entities.InternalSchedule.create({ ...s, project_id: pid, order: i })));
    teamToCreate.forEach(t => creates.push(base44.entities.InternalTeamMember.create({ ...t, project_id: pid })));
    stakeholders.forEach(s => creates.push(base44.entities.InternalStakeholder.create({ ...s, project_id: pid })));
    products.forEach(p => creates.push(base44.entities.InternalProduct.create({ ...p, project_id: pid })));
    checklistItems.forEach((c, i) => creates.push(base44.entities.InternalChecklist.create({ ...c, project_id: pid, order: i })));
    risks.forEach(r => creates.push(base44.entities.InternalRisk.create({ ...r, project_id: pid })));
    await Promise.all(creates);
    queryClient.invalidateQueries({ queryKey: ['internalProjects'] });
    queryClient.invalidateQueries({ queryKey: ['internalTeam', pid] });
    setSaving(false);
    handleClose();
    onComplete?.();
  };

  const canProceed = () => step === 0 ? general.name.trim().length > 0 : true;

  const parseExcelDate = (val) => {
    if (!val) return '';
    if (typeof val === 'number') {
      // Excel serial: número de dias desde 1900-01-01
      // 25569 = dias entre 1900-01-01 e 1970-01-01
      const daysSince1970 = val - 25569;
      const date = new Date(daysSince1970 * 86400 * 1000);
      // Pega ano/mês/dia locais (sem conversão UTC)
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const str = String(val).trim();
    const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (brMatch) return `${brMatch[3]}-${brMatch[2].padStart(2,'0')}-${brMatch[1].padStart(2,'0')}`;
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
      const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('cronograma')) || wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const isStandardModel = rows.length > 0 && 'Nome da Tarefa' in rows[0];
      const toImport = [];

      if (isStandardModel) {
        const parseDateField = (val) => {
          if (!val || val === '') return '';
          const str = String(val).trim();
          const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (m) return `${m[1]}-${m[2]}-${m[3]}`;
          return parseExcelDate(val);
        };
        const getEdtLevel = (edt) => (edt.match(/\./g) || []).length + 1;

        for (const row of rows) {
           const title = String(row['Nome da Tarefa'] || '').trim();
           if (!title) continue;
           const edtRaw = row['EDT'];
           const edt = String(edtRaw || '').trim();
           if (!title || (edt.toLowerCase() === 'edt')) continue;

           // Detect headers: EDT is empty OR EDT doesn't match X.Y or X.Y.Z format (e.g., "Macro", "Iniciação", etc.)
           const isNormalEdt = /^\d+(\.\d+)+$/.test(edt);
           const isHeader = !edt || !isNormalEdt;

           const previsaoInicio = row['Previsão\nInício'] || row['Previsão Início'] || row['PrevisaoInicio'] || '';
           const previsaoFim = row['Previsão\nTérmino'] || row['Previsão Término'] || row['PrevisaoTermino'] || '';

           let displayTitle = title;
           if (isHeader) {
             displayTitle = `▌ ${title}`;
           } else {
             const level = getEdtLevel(edt);
             if (level === 3) displayTitle = `    • ${title}`;
             else if (level >= 4) displayTitle = `        ◦ ${title}`;
           }

           toImport.push({
             title: displayTitle,
             start_date: parseDateField(previsaoInicio),
             end_date: parseDateField(previsaoFim),
           });
         }
      } else {
        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const headerKeywords = ['etapa', 'nome', 'título', 'titulo', 'tarefa', 'atividade', 'inicio', 'início', 'fim'];
        const isHeader = (row) => row.some(c => headerKeywords.includes(String(c).toLowerCase().trim()));
        let startIdx = rawRows.length > 0 && isHeader(rawRows[0]) ? 1 : 0;
        for (let i = startIdx; i < rawRows.length; i++) {
          const row = rawRows[i];
          const title = String(row[0] || '').trim();
          if (!title) continue;
          toImport.push({
            title,
            start_date: parseExcelDate(row[1]),
            end_date: parseExcelDate(row[2]),
          });
        }
      }

      if (toImport.length === 0) {
        toast.error('Nenhuma etapa encontrada no arquivo.');
      } else {
        setScheduleItems(toImport);
        toast.success(`${toImport.length} etapa(s) importada(s)! Avançando...`);
        setTimeout(() => setStep(s => s + 1), 800);
      }
    } catch {
      toast.error('Erro ao ler o arquivo. Verifique o formato.');
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            Novo Projeto Interno
            <Badge className={INTERNAL_TYPE_META[general.project_type]?.badge}>
              {INTERNAL_TYPE_META[general.project_type]?.label}
            </Badge>
          </DialogTitle>
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

          {/* Dados Gerais */}
          {currentStepId === 'general' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Nome do Projeto *</Label>
                <Input value={general.name} onChange={e => setGeneral(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Implantação ERP" className="bg-slate-700 border-slate-600 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Tipo de Projeto</Label>
                <div className="flex items-center gap-2">
                  <Badge className={INTERNAL_TYPE_META[general.project_type]?.badge}>
                    {INTERNAL_TYPE_META[general.project_type]?.label}
                  </Badge>
                </div>
              </div>
              {general.project_type === 'agil' && (
                <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-xs text-emerald-200">
                  <span className="mt-0.5">💡</span>
                  <span>Projeto Ágil: após a criação, use a aba <strong>Discovery</strong> para mapear o problema e gerar o <strong>Product Backlog</strong> com IA. Por isso o cadastro não inclui cronograma nem checklist tradicionais.</span>
                </div>
              )}
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

          {/* Cronograma */}
          {currentStepId === 'schedule' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Adicione as etapas do cronograma com início e fim.</p>
                <div>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="hidden" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />{importing ? 'Importando...' : 'Importar Excel'}
                  </Button>
                </div>
              </div>
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

          {/* Equipe */}
          {currentStepId === 'team' && (
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

          {/* Stakeholders */}
          {currentStepId === 'stakeholders' && (
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

          {/* Produtos */}
          {currentStepId === 'products' && (
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

          {/* Checklist */}
          {currentStepId === 'checklist' && (
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

          {/* Riscos */}
          {currentStepId === 'risks' && (
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