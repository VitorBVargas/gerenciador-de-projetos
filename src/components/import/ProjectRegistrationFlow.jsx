import React, { useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Check, X, Plus, Search, Loader2, Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const PORTFOLIOS = [
  'Grandes Contas SC/MG',
  'Grandes Contas SC/SP',
  'Médias Contas',
];

const VERTICAL_LABELS = {
  arrecadacao: 'Arrecadação',
  compras: 'Compras',
  contabil: 'Contábil',
  pessoal: 'Pessoal',
  educacao: 'Educação',
  saude: 'Saúde',
  gerenciamento: 'Gerenciamento',
  plataforma: 'Plataforma',
  atendimento: 'Atendimento',
  iss: 'ISS',
  parceiros: 'Parceiros',
  outros: 'Outros',
};

const VERTICAL_COLORS = {
  arrecadacao: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  compras: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  contabil: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  pessoal: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  educacao: 'bg-green-500/20 text-green-300 border-green-500/30',
  saude: 'bg-red-500/20 text-red-300 border-red-500/30',
  gerenciamento: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  plataforma: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  atendimento: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  iss: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
};

const STEPS = [
  { id: 'overview', label: 'Visão Geral', icon: '📋' },
  { id: 'team', label: 'Equipe', icon: '👥' },
  { id: 'stakeholders', label: 'Stakeholders', icon: '🤝' },
  { id: 'risks', label: 'Riscos', icon: '⚠️' },
];

// --- Slider de 1 a 5 ---
function RangeSlider({ value, onChange, label, color = 'blue' }) {
  const colors = {
    blue: 'accent-blue-500',
    red: 'accent-red-500',
    orange: 'accent-orange-500',
  };
  const levelLabel = ['', 'Muito Baixo', 'Baixo', 'Médio', 'Alto', 'Muito Alto'];
  const levelColor = ['', 'text-green-400', 'text-lime-400', 'text-yellow-400', 'text-orange-400', 'text-red-400'];
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <Label className="text-slate-400 text-xs">{label}</Label>
        <span className={`text-xs font-bold ${levelColor[value]}`}>{value} – {levelLabel[value]}</span>
      </div>
      <input
        type="range" min={1} max={5} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className={`w-full h-2 rounded-lg cursor-pointer ${colors[color]}`}
      />
      <div className="flex justify-between text-xs text-slate-600">
        <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
      </div>
    </div>
  );
}

// ─── STEP 1: Visão Geral ───────────────────────────────────────────────────
function StepOverview({ data, onChange }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1.5">
          <Label className="text-slate-300">Nome do Projeto *</Label>
          <Input value={data.name} onChange={e => onChange({ ...data, name: e.target.value })}
            placeholder="Ex: Implantação Betha – Município de Altamira"
            className="bg-slate-700 border-slate-600 text-white" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-slate-300">Gerente(s) do Projeto</Label>
          <Input value={data.manager} onChange={e => onChange({ ...data, manager: e.target.value })}
            placeholder="Nome(s) do gerente" className="bg-slate-700 border-slate-600 text-white" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-300">Coordenador Técnico</Label>
          <Input value={data.coordinator} onChange={e => onChange({ ...data, coordinator: e.target.value })}
            placeholder="Nome do coordenador" className="bg-slate-700 border-slate-600 text-white" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-slate-300">Gerente de Portfólio</Label>
          <Input value={data.portfolio_manager} onChange={e => onChange({ ...data, portfolio_manager: e.target.value })}
            placeholder="Nome do gerente" className="bg-slate-700 border-slate-600 text-white" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-300">Portfólio do Projeto</Label>
          <Select value={data.portfolio} onValueChange={v => onChange({ ...data, portfolio: v })}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {PORTFOLIOS.map(p => (
                <SelectItem key={p} value={p} className="text-white hover:bg-slate-700">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-slate-300">Prazo Contratual</Label>
          <Input type="date" value={data.deadline} onChange={e => onChange({ ...data, deadline: e.target.value })}
            className="bg-slate-700 border-slate-600 text-white" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-300">Orçamento do Projeto (R$)</Label>
          <Input type="number" value={data.budget} onChange={e => onChange({ ...data, budget: e.target.value })}
            placeholder="0,00" className="bg-slate-700 border-slate-600 text-white" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-slate-300">Link do Contrato</Label>
        <Input value={data.contract_link} onChange={e => onChange({ ...data, contract_link: e.target.value })}
          placeholder="https://..." className="bg-slate-700 border-slate-600 text-white" />
      </div>
    </div>
  );
}

// ─── STEP 2: Equipe ────────────────────────────────────────────────────────
function StepTeam({ selected, onToggle }) {
  const [search, setSearch] = useState('');
  const [activeVertical, setActiveVertical] = useState(null);

  const { data: collaborators = [], isLoading } = useQuery({
    queryKey: ['portfolioCollaborators'],
    queryFn: () => base44.entities.PortfolioCollaborator.list(),
  });

  const verticals = [...new Set(collaborators.map(c => c.vertical1).filter(Boolean))].sort();

  const filtered = collaborators.filter(c => {
    const matchVertical = !activeVertical || c.vertical1 === activeVertical || c.vertical2 === activeVertical;
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    return matchVertical && matchSearch;
  });

  return (
    <div className="space-y-4">
      {/* Vertical filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveVertical(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${!activeVertical ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-600 text-slate-400 hover:text-white hover:border-slate-500'}`}
        >
          Todos
        </button>
        {verticals.map(v => (
          <button
            key={v}
            onClick={() => setActiveVertical(activeVertical === v ? null : v)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${activeVertical === v
              ? 'bg-blue-600 text-white border-blue-600'
              : `${VERTICAL_COLORS[v] || 'border-slate-600 text-slate-400'} hover:opacity-80`
            }`}
          >
            {VERTICAL_LABELS[v] || v}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar colaborador..." className="bg-slate-700 border-slate-600 text-white pl-9" />
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-3 bg-slate-700/30 rounded-lg">
          <span className="text-xs text-slate-500 w-full mb-1">{selected.length} selecionado(s):</span>
          {selected.map(m => (
            <Badge key={m.id} className="bg-blue-600/30 text-blue-300 border border-blue-600/40 flex items-center gap-1 pr-1">
              {m.name}
              <button onClick={() => onToggle(m)} className="ml-1 hover:text-white"><X className="w-3 h-3" /></button>
            </Badge>
          ))}
        </div>
      )}

      {/* List */}
      <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-slate-500 py-6 text-sm">Nenhum colaborador encontrado</p>
        ) : filtered.map(c => {
          const isSelected = selected.find(m => m.id === c.id);
          return (
            <button key={c.id} onClick={() => onToggle(c)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all border ${isSelected ? 'bg-blue-600/15 border-blue-600/40' : 'hover:bg-slate-700 border-transparent'}`}
            >
              <div>
                <p className="text-sm font-medium text-white">{c.name}</p>
                <p className="text-xs text-slate-400">
                  {c.role}{c.vertical1 ? ` · ${VERTICAL_LABELS[c.vertical1] || c.vertical1}` : ''}
                  {c.vertical2 ? ` / ${VERTICAL_LABELS[c.vertical2] || c.vertical2}` : ''}
                </p>
              </div>
              {isSelected && <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── STEP 3: Stakeholders ──────────────────────────────────────────────────
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
      <p className="text-sm text-slate-400">Adicione os contatos do cliente (prefeitura, câmara, etc.) que serão stakeholders do projeto.</p>

      <div className="bg-slate-700/30 rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-slate-400 text-xs">Nome *</Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Nome completo" className="bg-slate-700 border-slate-600 text-white text-sm h-8" />
          </div>
          <div className="space-y-1">
            <Label className="text-slate-400 text-xs">Cargo / Papel</Label>
            <Input value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
              placeholder="Ex: Secretário de Finanças" className="bg-slate-700 border-slate-600 text-white text-sm h-8" />
          </div>
          <div className="space-y-1">
            <Label className="text-slate-400 text-xs">E-mail</Label>
            <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="email@municipio.gov.br" className="bg-slate-700 border-slate-600 text-white text-sm h-8" />
          </div>
          <div className="space-y-1">
            <Label className="text-slate-400 text-xs">Telefone</Label>
            <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="(00) 00000-0000" className="bg-slate-700 border-slate-600 text-white text-sm h-8" />
          </div>
        </div>
        <Button onClick={add} disabled={!form.name.trim()} size="sm"
          className="w-full bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-600/30">
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
              <button onClick={() => setStakeholders(prev => prev.filter((_, idx) => idx !== i))}
                className="text-slate-500 hover:text-red-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-slate-600 text-sm py-4">Nenhum stakeholder adicionado ainda. Você pode adicionar depois.</p>
      )}
    </div>
  );
}

// ─── STEP 4: Riscos ────────────────────────────────────────────────────────
function StepRisks({ risks, setRisks }) {
  const empty = { title: '', description: '', category: 'tecnico', probability: 3, impact: 3, mitigation: '' };
  const [form, setForm] = useState(empty);
  const [adding, setAdding] = useState(false);

  const add = () => {
    if (!form.title.trim()) return;
    setRisks(prev => [...prev, form]);
    setForm(empty);
    setAdding(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">Registre os riscos já identificados para este projeto.</p>

      {!adding ? (
        <Button onClick={() => setAdding(true)} variant="outline"
          className="w-full border-dashed border-slate-600 text-slate-400 hover:text-white hover:bg-slate-700">
          <Plus className="w-4 h-4 mr-2" /> Adicionar Risco
        </Button>
      ) : (
        <div className="bg-slate-700/30 rounded-lg p-4 space-y-4 border border-slate-600/50">
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Nome do Risco *</Label>
            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Ex: Atraso na entrega de dados pelo cliente"
              className="bg-slate-700 border-slate-600 text-white text-sm" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Descrição</Label>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Descreva o risco com mais detalhes..."
              className="bg-slate-700 border-slate-600 text-white text-sm h-16 resize-none" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Categoria</Label>
            <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="tecnico">Técnico</SelectItem>
                <SelectItem value="cronograma">Cronograma</SelectItem>
                <SelectItem value="recurso">Recurso</SelectItem>
                <SelectItem value="cliente">Cliente</SelectItem>
                <SelectItem value="externo">Externo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <RangeSlider label="Chance de Acontecer" value={form.probability} onChange={v => setForm(p => ({ ...p, probability: v }))} color="blue" />
            <RangeSlider label="Impacto se Acontecer" value={form.impact} onChange={v => setForm(p => ({ ...p, impact: v }))} color="red" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Plano de Mitigação</Label>
            <Textarea value={form.mitigation} onChange={e => setForm(p => ({ ...p, mitigation: e.target.value }))}
              placeholder="O que pode ser feito para reduzir este risco?"
              className="bg-slate-700 border-slate-600 text-white text-sm h-14 resize-none" />
          </div>

          <div className="flex gap-2">
            <Button onClick={() => { setAdding(false); setForm(empty); }} variant="outline"
              size="sm" className="flex-1 border-slate-600 text-slate-400 hover:bg-slate-700">Cancelar</Button>
            <Button onClick={add} disabled={!form.title.trim()} size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700">
              <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
            </Button>
          </div>
        </div>
      )}

      {risks.length > 0 && (
        <div className="space-y-2 max-h-52 overflow-y-auto">
          {risks.map((r, i) => {
            const severity = r.probability * r.impact;
            const sevColor = severity >= 20 ? 'text-red-400' : severity >= 10 ? 'text-orange-400' : 'text-yellow-400';
            return (
              <div key={i} className="flex items-start justify-between bg-slate-700/40 border border-slate-700 rounded-lg px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{r.title}</p>
                    <span className={`text-xs font-bold ${sevColor} flex-shrink-0`}>
                      {r.probability}×{r.impact}={severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{r.category} · Chance {r.probability}/5 · Impacto {r.impact}/5</p>
                </div>
                <button onClick={() => setRisks(prev => prev.filter((_, idx) => idx !== i))}
                  className="text-slate-500 hover:text-red-400 ml-2 flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MAIN FLOW ─────────────────────────────────────────────────────────────
export default function ProjectRegistrationFlow({ open, onOpenChange, parsedData, onComplete }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [projectInfo, setProjectInfo] = useState({
    name: '',
    manager: '',
    coordinator: '',
    portfolio_manager: '',
    portfolio: '',
    deadline: '',
    budget: '',
    contract_link: '',
  });
  const [team, setTeam] = useState([]);
  const [stakeholders, setStakeholders] = useState([]);
  const [risks, setRisks] = useState([]);

  const toggleTeam = (collab) => {
    setTeam(prev => {
      const exists = prev.find(m => m.id === collab.id);
      return exists ? prev.filter(m => m.id !== collab.id) : [...prev, collab];
    });
  };

  const canNext = () => {
    if (step === 0) return projectInfo.name.trim().length > 0;
    return true;
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await onComplete({ projectInfo, team, stakeholders, risks });
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  const { totalImpl, totalIncl } = parsedData || {};
  const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v || 0);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl p-0 gap-0 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold text-white">Cadastrar Novo Projeto</h2>
            {parsedData && (
              <div className="flex gap-3 text-xs text-slate-400">
                <span>Implantação: <span className="text-green-400 font-medium">{fmt(totalImpl)}</span></span>
                <span>Recorrente: <span className="text-blue-400 font-medium">{fmt(totalIncl)}</span></span>
              </div>
            )}
          </div>

          {/* Steps */}
          <div className="flex items-center gap-1 mt-4">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => i < step && setStep(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    i === step
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                      : i < step
                      ? 'bg-green-600/20 text-green-400 cursor-pointer hover:bg-green-600/30'
                      : 'bg-slate-700 text-slate-500 cursor-default'
                  }`}
                >
                  {i < step ? <Check className="w-3 h-3" /> : <span>{s.icon}</span>}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px max-w-8 ${i < step ? 'bg-green-600/40' : 'bg-slate-700'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 0 && <StepOverview data={projectInfo} onChange={setProjectInfo} />}
          {step === 1 && <StepTeam selected={team} onToggle={toggleTeam} />}
          {step === 2 && <StepStakeholders stakeholders={stakeholders} setStakeholders={setStakeholders} />}
          {step === 3 && <StepRisks risks={risks} setRisks={setRisks} />}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between flex-shrink-0 bg-slate-800/80">
          <Button
            variant="outline"
            onClick={() => step > 0 ? setStep(s => s - 1) : onOpenChange(false)}
            disabled={saving}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            {step > 0 ? <><ChevronLeft className="w-4 h-4 mr-1" />Voltar</> : 'Cancelar'}
          </Button>

          <span className="text-xs text-slate-500">{step + 1} de {STEPS.length}</span>

          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="bg-blue-600 hover:bg-blue-700">
              Próximo <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={saving || !canNext()} className="bg-green-600 hover:bg-green-700 min-w-32">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : <><Check className="w-4 h-4 mr-1" />Criar Projeto</>}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}