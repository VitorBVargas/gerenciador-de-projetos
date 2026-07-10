import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, ChevronLeft, Check, X, Plus, Rocket } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const STEPS = [
  { id: 'overview', label: 'Visão Geral', icon: '📋' },
  { id: 'team', label: 'Equipe', icon: '👥' },
  { id: 'stakeholders', label: 'Stakeholders', icon: '🤝' },
  { id: 'products', label: 'Produtos', icon: '📦' },
];

const FUNCOES = ['Product Owner', 'Scrum Master', 'Desenvolvedor', 'QA', 'UX', 'Analista', 'DevOps', 'Gestor', 'Outros'];

const PRODUCT_STATUS = [
  { value: 'planejado', label: 'Planejado' },
  { value: 'em_desenvolvimento', label: 'Em Desenvolvimento' },
  { value: 'em_homologacao', label: 'Em Homologação' },
  { value: 'concluido', label: 'Concluído' },
];

const inputClass = "bg-slate-700 border-slate-600 text-white";

// ─── STEP 0: Visão Geral ────────────────────────────────────────────────────
function StepOverview({ data, onChange }) {
  const [tagInput, setTagInput] = useState('');

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!(data.tags || []).includes(t)) onChange({ ...data, tags: [...(data.tags || []), t] });
    setTagInput('');
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-slate-300">Nome do Projeto *</Label>
        <Input value={data.name} onChange={e => onChange({ ...data, name: e.target.value })}
          placeholder="Ex: App Minha Cidade — Squad Mobile" className={inputClass} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-slate-300">Descrição</Label>
        <Textarea value={data.descricao} onChange={e => onChange({ ...data, descricao: e.target.value })}
          placeholder="Descreva o projeto..." className={`${inputClass} resize-none h-16`} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-slate-300">Objetivo</Label>
        <Textarea value={data.objetivo} onChange={e => onChange({ ...data, objetivo: e.target.value })}
          placeholder="Qual o objetivo?" className={`${inputClass} resize-none h-16`} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-slate-300">Área</Label>
          <Input value={data.area} onChange={e => onChange({ ...data, area: e.target.value })} placeholder="Ex: Produto" className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-300">Responsável</Label>
          <Input value={data.responsavel} onChange={e => onChange({ ...data, responsavel: e.target.value })} placeholder="Nome" className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-slate-300">Product Owner</Label>
          <Input value={data.product_owner} onChange={e => onChange({ ...data, product_owner: e.target.value })} placeholder="Nome do PO" className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-300">Scrum Master</Label>
          <Input value={data.scrum_master} onChange={e => onChange({ ...data, scrum_master: e.target.value })} placeholder="Nome do SM" className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-slate-300">Data prevista de início</Label>
          <Input type="date" value={data.start_date} onChange={e => onChange({ ...data, start_date: e.target.value })} className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-300">Prioridade</Label>
          <Select value={data.priority} onValueChange={v => onChange({ ...data, priority: v })}>
            <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="critica">Crítica</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-slate-300">Tags</Label>
        <div className="flex gap-2">
          <Input value={tagInput} onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
            placeholder="Adicionar tag e Enter" className={inputClass} />
          <button type="button" onClick={addTag}
            className="px-3 py-2 rounded-lg bg-emerald-600/20 border border-emerald-600/30 text-emerald-300 hover:bg-emerald-600/40 flex-shrink-0">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {(data.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {(data.tags || []).map(t => (
              <Badge key={t} className="bg-emerald-600/20 text-emerald-300 border border-emerald-600/30 text-xs">
                {t} <button onClick={() => onChange({ ...data, tags: data.tags.filter(x => x !== t) })} className="ml-1"><X className="w-2.5 h-2.5" /></button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-slate-300">Observações</Label>
        <Textarea value={data.notes} onChange={e => onChange({ ...data, notes: e.target.value })}
          placeholder="Observações gerais..." className={`${inputClass} resize-none h-16`} />
      </div>
    </div>
  );
}

// ─── STEP 1: Equipe ─────────────────────────────────────────────────────────
function StepTeam({ team, setTeam }) {
  const empty = { nome: '', funcao: '', capacidade_semanal: '', dias_disponiveis: '', especialidade: '', skills: '', email: '', telefone: '', observacao: '' };
  const [form, setForm] = useState(empty);

  const add = () => {
    if (!form.nome.trim()) return;
    setTeam(prev => [...prev, form]);
    setForm(empty);
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-700/30 rounded-lg p-4 space-y-3 border border-slate-700/50">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-slate-400 text-xs">Nome *</Label>
            <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Nome completo" className={`${inputClass} text-sm h-8`} />
          </div>
          <div className="space-y-1">
            <Label className="text-slate-400 text-xs">Função</Label>
            <Select value={form.funcao} onValueChange={v => setForm(p => ({ ...p, funcao: v }))}>
              <SelectTrigger className={`${inputClass} text-sm h-8`}><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {FUNCOES.map(f => <SelectItem key={f} value={f} className="text-white">{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-slate-400 text-xs">Capacidade semanal (h)</Label>
            <Input type="number" value={form.capacidade_semanal} onChange={e => setForm(p => ({ ...p, capacidade_semanal: e.target.value }))} placeholder="Ex: 40" className={`${inputClass} text-sm h-8`} />
          </div>
          <div className="space-y-1">
            <Label className="text-slate-400 text-xs">Dias disponíveis</Label>
            <Input value={form.dias_disponiveis} onChange={e => setForm(p => ({ ...p, dias_disponiveis: e.target.value }))} placeholder="Ex: Seg a Sex" className={`${inputClass} text-sm h-8`} />
          </div>
          <div className="space-y-1">
            <Label className="text-slate-400 text-xs">Especialidade</Label>
            <Input value={form.especialidade} onChange={e => setForm(p => ({ ...p, especialidade: e.target.value }))} placeholder="Ex: Frontend" className={`${inputClass} text-sm h-8`} />
          </div>
          <div className="space-y-1">
            <Label className="text-slate-400 text-xs">Skills</Label>
            <Input value={form.skills} onChange={e => setForm(p => ({ ...p, skills: e.target.value }))} placeholder="React, Node..." className={`${inputClass} text-sm h-8`} />
          </div>
          <div className="space-y-1">
            <Label className="text-slate-400 text-xs">E-mail</Label>
            <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@..." className={`${inputClass} text-sm h-8`} />
          </div>
          <div className="space-y-1">
            <Label className="text-slate-400 text-xs">Telefone</Label>
            <Input value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} placeholder="(00) 00000-0000" className={`${inputClass} text-sm h-8`} />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-slate-400 text-xs">Observação</Label>
            <Input value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} placeholder="Observações..." className={`${inputClass} text-sm h-8`} />
          </div>
        </div>
        <Button onClick={add} disabled={!form.nome.trim()} size="sm"
          className="w-full bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-600/30">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Adicionar Membro
        </Button>
      </div>

      {team.length > 0 ? (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {team.map((m, i) => (
            <div key={i} className="flex items-center justify-between bg-slate-700/40 border border-slate-700 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium text-white">{m.nome}</p>
                <p className="text-xs text-slate-400">{[m.funcao, m.especialidade, m.capacidade_semanal ? `${m.capacidade_semanal}h/sem` : null].filter(Boolean).join(' · ')}</p>
              </div>
              <button onClick={() => setTeam(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-red-400 ml-2">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-slate-600 text-sm py-4">Nenhum membro adicionado. Você pode adicionar depois.</p>
      )}
    </div>
  );
}

// ─── STEP 2: Stakeholders ───────────────────────────────────────────────────
function StepStakeholders({ stakeholders, setStakeholders }) {
  const empty = { name: '', role: '', email: '', phone: '' };
  const [form, setForm] = useState(empty);

  const add = () => {
    if (!form.name.trim()) return;
    setStakeholders(prev => [...prev, form]);
    setForm(empty);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">Adicione os stakeholders do projeto.</p>
      <div className="bg-slate-700/30 rounded-lg p-4 space-y-3 border border-slate-700/50">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-slate-400 text-xs">Nome *</Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome completo" className={`${inputClass} text-sm h-8`} />
          </div>
          <div className="space-y-1">
            <Label className="text-slate-400 text-xs">Cargo / Papel</Label>
            <Input value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} placeholder="Ex: Patrocinador" className={`${inputClass} text-sm h-8`} />
          </div>
          <div className="space-y-1">
            <Label className="text-slate-400 text-xs">E-mail</Label>
            <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@..." className={`${inputClass} text-sm h-8`} />
          </div>
          <div className="space-y-1">
            <Label className="text-slate-400 text-xs">Telefone</Label>
            <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(00) 00000-0000" className={`${inputClass} text-sm h-8`} />
          </div>
        </div>
        <Button onClick={add} disabled={!form.name.trim()} size="sm"
          className="w-full bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-600/30">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Adicionar Stakeholder
        </Button>
      </div>

      {stakeholders.length > 0 ? (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {stakeholders.map((s, i) => (
            <div key={i} className="flex items-center justify-between bg-slate-700/40 border border-slate-700 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium text-white">{s.name}</p>
                <p className="text-xs text-slate-400">{[s.role, s.email].filter(Boolean).join(' · ')}</p>
              </div>
              <button onClick={() => setStakeholders(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-red-400 ml-2">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-slate-600 text-sm py-4">Nenhum stakeholder adicionado. Você pode adicionar depois.</p>
      )}
    </div>
  );
}

// ─── STEP 3: Produtos ───────────────────────────────────────────────────────
function StepProducts({ products, setProducts }) {
  const empty = { produto: '', modulo: '', vertical: '', descricao: '', status: 'planejado', responsavel: '', observacao: '' };
  const [form, setForm] = useState(empty);

  const add = () => {
    if (!form.produto.trim()) return;
    setProducts(prev => [...prev, form]);
    setForm(empty);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">Cadastre os produtos do projeto ágil.</p>
      <div className="bg-slate-700/30 rounded-lg p-4 space-y-3 border border-slate-700/50">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-slate-400 text-xs">Produto *</Label>
            <Input value={form.produto} onChange={e => setForm(p => ({ ...p, produto: e.target.value }))} placeholder="Nome do produto" className={`${inputClass} text-sm h-8`} />
          </div>
          <div className="space-y-1">
            <Label className="text-slate-400 text-xs">Módulo</Label>
            <Input value={form.modulo} onChange={e => setForm(p => ({ ...p, modulo: e.target.value }))} placeholder="Módulo" className={`${inputClass} text-sm h-8`} />
          </div>
          <div className="space-y-1">
            <Label className="text-slate-400 text-xs">Vertical</Label>
            <Input value={form.vertical} onChange={e => setForm(p => ({ ...p, vertical: e.target.value }))} placeholder="Vertical" className={`${inputClass} text-sm h-8`} />
          </div>
          <div className="space-y-1">
            <Label className="text-slate-400 text-xs">Status</Label>
            <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
              <SelectTrigger className={`${inputClass} text-sm h-8`}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {PRODUCT_STATUS.map(s => <SelectItem key={s.value} value={s.value} className="text-white">{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-slate-400 text-xs">Responsável</Label>
            <Input value={form.responsavel} onChange={e => setForm(p => ({ ...p, responsavel: e.target.value }))} placeholder="Nome" className={`${inputClass} text-sm h-8`} />
          </div>
          <div className="space-y-1">
            <Label className="text-slate-400 text-xs">Observação</Label>
            <Input value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} placeholder="Observações" className={`${inputClass} text-sm h-8`} />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-slate-400 text-xs">Descrição</Label>
            <Textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Descrição..." className={`${inputClass} text-sm resize-none h-14`} />
          </div>
        </div>
        <Button onClick={add} disabled={!form.produto.trim()} size="sm"
          className="w-full bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-600/30">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Adicionar Produto
        </Button>
      </div>

      {products.length > 0 ? (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {products.map((p, i) => (
            <div key={i} className="flex items-center justify-between bg-slate-700/40 border border-slate-700 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium text-white">{p.produto}</p>
                <p className="text-xs text-slate-400">{[p.modulo, p.vertical, PRODUCT_STATUS.find(s => s.value === p.status)?.label].filter(Boolean).join(' · ')}</p>
              </div>
              <button onClick={() => setProducts(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-red-400 ml-2">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-slate-600 text-sm py-4">Nenhum produto adicionado. Você pode adicionar depois.</p>
      )}
    </div>
  );
}

// ─── MAIN WIZARD ────────────────────────────────────────────────────────────
export default function AgilWizard({ open, onOpenChange, portfolioFilter, onComplete }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [projectInfo, setProjectInfo] = useState({
    name: '', descricao: '', objetivo: '', area: '', responsavel: '',
    product_owner: '', scrum_master: '', start_date: '', priority: 'media', tags: [], notes: '',
  });
  const [team, setTeam] = useState([]);
  const [stakeholders, setStakeholders] = useState([]);
  const [products, setProducts] = useState([]);

  const canProceed = () => {
    if (step === 0) return projectInfo.name.trim().length > 0;
    return true;
  };

  const resetAndClose = () => {
    setStep(0);
    setProjectInfo({ name: '', descricao: '', objetivo: '', area: '', responsavel: '', product_owner: '', scrum_master: '', start_date: '', priority: 'media', tags: [], notes: '' });
    setTeam([]);
    setStakeholders([]);
    setProducts([]);
    onOpenChange(false);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const project = await base44.entities.Project.create({
        name: projectInfo.name,
        portfolio: portfolioFilter,
        project_type: 'agil',
        status: 'em_andamento',
        priority: projectInfo.priority,
        notes: projectInfo.notes,
        manager: projectInfo.responsavel,
        agil_descricao: projectInfo.descricao,
        agil_objetivo: projectInfo.objetivo,
        agil_area: projectInfo.area,
        agil_responsavel: projectInfo.responsavel,
        agil_product_owner: projectInfo.product_owner,
        agil_scrum_master: projectInfo.scrum_master,
        agil_start_date: projectInfo.start_date || undefined,
        agil_tags: projectInfo.tags,
      });

      if (team.length > 0) {
        await base44.entities.AgilTeamMember.bulkCreate(team.map(m => ({
          project_id: project.id,
          nome: m.nome,
          funcao: m.funcao || '',
          capacidade_semanal: m.capacidade_semanal ? Number(m.capacidade_semanal) : undefined,
          dias_disponiveis: m.dias_disponiveis || '',
          especialidade: m.especialidade || '',
          skills: m.skills || '',
          email: m.email || '',
          telefone: m.telefone || '',
          observacao: m.observacao || '',
        })));
      }

      if (stakeholders.length > 0) {
        await base44.entities.Stakeholder.bulkCreate(stakeholders.map(s => ({
          project_id: project.id,
          name: s.name,
          role: s.role || '',
          email: s.email || '',
        })));
      }

      if (products.length > 0) {
        await base44.entities.AgilProduct.bulkCreate(products.map(p => ({
          project_id: project.id,
          produto: p.produto,
          modulo: p.modulo || '',
          vertical: p.vertical || '',
          descricao: p.descricao || '',
          status: p.status || 'planejado',
          responsavel: p.responsavel || '',
          observacao: p.observacao || '',
        })));
      }

      onComplete?.(project);
      resetAndClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!saving && !v) resetAndClose(); }}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-600/30 text-emerald-300 text-sm font-semibold flex items-center gap-1">
              <Rocket className="w-3.5 h-3.5" /> Ágil
            </span>
            Novo Projeto Ágil (Scrum/Kanban)
          </DialogTitle>
          <div className="flex items-center gap-2 mt-4">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  i === step ? 'bg-emerald-600 text-white' :
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

        <div className="flex-1 overflow-y-auto py-4">
          {step === 0 && <StepOverview data={projectInfo} onChange={setProjectInfo} />}
          {step === 1 && <StepTeam team={team} setTeam={setTeam} />}
          {step === 2 && <StepStakeholders stakeholders={stakeholders} setStakeholders={setStakeholders} />}
          {step === 3 && <StepProducts products={products} setProducts={setProducts} />}
        </div>

        <DialogFooter className="flex items-center justify-between border-t border-slate-700 pt-4">
          <Button variant="outline" onClick={() => step > 0 ? setStep(s => s - 1) : resetAndClose()} disabled={saving} className="border-slate-600 text-slate-300 hover:bg-slate-700">
            {step > 0 ? <><ChevronLeft className="w-4 h-4 mr-1" />Voltar</> : 'Cancelar'}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="bg-emerald-600 hover:bg-emerald-700">
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