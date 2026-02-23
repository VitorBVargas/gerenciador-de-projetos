import React, { useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Check, X, Plus, Search, Loader2, Crown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import StepCronograma from './StepCronograma';
// useQuery still used by StepTeam

const PORTFOLIOS = ['Grandes Contas SC/MG', 'Grandes Contas SC/SP', 'Médias Contas'];

const VERTICAL_LABELS = {
  arrecadacao: 'Arrecadação', compras: 'Compras', contabil: 'Contábil',
  pessoal: 'Pessoal', educacao: 'Educação', saude: 'Saúde',
  gerenciamento: 'Gerenciamento', plataforma: 'Plataforma', atendimento: 'Atendimento',
  iss: 'ISS', parceiros: 'Parceiros', outros: 'Outros',
  Suporte: 'Suporte', 'Extensão': 'Extensão', Migrador: 'Migrador',
};

const VERTICAL_AVATAR_COLORS = {
  arrecadacao: 'from-yellow-500 to-yellow-600',
  compras: 'from-blue-500 to-blue-600',
  contabil: 'from-indigo-500 to-indigo-600',
  pessoal: 'from-purple-500 to-purple-600',
  educacao: 'from-green-500 to-green-600',
  saude: 'from-red-500 to-red-600',
  gerenciamento: 'from-slate-500 to-slate-600',
  plataforma: 'from-cyan-500 to-cyan-600',
  atendimento: 'from-orange-500 to-orange-600',
  iss: 'from-pink-500 to-pink-600',
};

const STEPS = [
  { id: 'overview', label: 'Visão Geral', icon: '📋' },
  { id: 'cronograma', label: 'Cronograma', icon: '📅' },
  { id: 'team', label: 'Equipe', icon: '👥' },
  { id: 'stakeholders', label: 'Stakeholders', icon: '🤝' },
  { id: 'risks', label: 'Riscos', icon: '⚠️' },
];

function RangeSlider({ value, onChange, label, color = 'blue' }) {
  const levelLabel = ['', 'Muito Baixo', 'Baixo', 'Médio', 'Alto', 'Muito Alto'];
  const levelColor = ['', 'text-green-400', 'text-lime-400', 'text-yellow-400', 'text-orange-400', 'text-red-400'];
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <Label className="text-slate-400 text-xs">{label}</Label>
        <span className={`text-xs font-bold ${levelColor[value]}`}>{value} – {levelLabel[value]}</span>
      </div>
      <input type="range" min={1} max={5} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-lg cursor-pointer" />
      <div className="flex justify-between text-xs text-slate-600">
        <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
      </div>
    </div>
  );
}

// ─── STEP 1: Visão Geral ───────────────────────────────────────────────────
function StepOverview({ data, onChange }) {
  const [managerInput, setManagerInput] = useState('');

  const addManager = () => {
    const name = managerInput.trim();
    if (!name) return;
    const current = data.managers || [];
    if (!current.includes(name)) onChange({ ...data, managers: [...current, name] });
    setManagerInput('');
  };

  const removeManager = (name) => {
    onChange({ ...data, managers: (data.managers || []).filter(n => n !== name) });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-slate-300">Nome do Projeto *</Label>
        <Input value={data.name} onChange={e => onChange({ ...data, name: e.target.value })}
          placeholder="Ex: Implantação Betha – Município de Altamira"
          className="bg-slate-700 border-slate-600 text-white" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Gerente(s) do Projeto - campo livre, múltiplos */}
        <div className="space-y-1.5">
          <Label className="text-slate-300">Gerente(s) do Projeto <span className="text-slate-500 text-xs">(pode ser mais de um)</span></Label>
          <div className="flex gap-2">
            <Input
              value={managerInput}
              onChange={e => setManagerInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addManager(); } }}
              placeholder="Nome do gerente"
              className="bg-slate-700 border-slate-600 text-white text-sm"
            />
            <button type="button" onClick={addManager}
              className="px-3 py-2 rounded-lg bg-blue-600/20 border border-blue-600/30 text-blue-300 hover:bg-blue-600/40 text-sm flex-shrink-0">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {(data.managers || []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {(data.managers || []).map(n => (
                <Badge key={n} className="bg-blue-600/20 text-blue-300 border border-blue-600/30 text-xs">
                  {n} <button onClick={() => removeManager(n)} className="ml-1"><X className="w-2.5 h-2.5" /></button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Coordenador Técnico - campo livre */}
        <div className="space-y-1.5">
          <Label className="text-slate-300">Coordenador Técnico</Label>
          <Input value={data.coordinator || ''} onChange={e => onChange({ ...data, coordinator: e.target.value })}
            placeholder="Nome do coordenador"
            className="bg-slate-700 border-slate-600 text-white" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Gerente de Portfólio - campo livre */}
        <div className="space-y-1.5">
          <Label className="text-slate-300">Gerente de Portfólio</Label>
          <Input value={data.portfolio_manager || ''} onChange={e => onChange({ ...data, portfolio_manager: e.target.value })}
            placeholder="Nome do gerente de portfólio"
            className="bg-slate-700 border-slate-600 text-white" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-300">Portfólio do Projeto</Label>
          <Select value={data.portfolio} onValueChange={v => onChange({ ...data, portfolio: v })}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {PORTFOLIOS.map(p => (
                <SelectItem key={p} value={p} className="text-white">{p}</SelectItem>
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

      <div className="space-y-1.5">
        <Label className="text-slate-300">Diretório Geral de Documentos</Label>
        <Input value={data.documents_folder_link || ''} onChange={e => onChange({ ...data, documents_folder_link: e.target.value })}
          placeholder="https://drive.google.com/..." className="bg-slate-700 border-slate-600 text-white" />
      </div>
    </div>
  );
}

// ─── STEP 2: Equipe ────────────────────────────────────────────────────────
function StepTeam({ selected, onToggle, leaders, onToggleLeader }) {
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
    const isNotSelected = !selected.find(m => m.id === c.id);
    return matchVertical && matchSearch && isNotSelected;
  });

  // Group filtered (not selected) by vertical
  const grouped = {};
  filtered.forEach(c => {
    const v = c.vertical1 || 'outros';
    if (!grouped[v]) grouped[v] = [];
    grouped[v].push(c);
  });

  return (
    <div className="space-y-3">
      {/* Selected panel */}
      {selected.length > 0 && (
        <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            {selected.length} selecionado(s) — clique na <Crown className="w-3 h-3 inline text-yellow-400" /> para líder
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selected.map(m => {
              const isLeader = leaders.includes(m.id);
              const vertical = m.vertical1 || 'outros';
              return (
                <div key={m.id} className={`flex items-center gap-1.5 pl-1.5 pr-1 py-0.5 rounded-full border text-xs transition-all ${
                  isLeader ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-200' : 'bg-blue-600/15 border-blue-600/30 text-blue-200'
                }`}>
                  <div className={`w-4 h-4 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 ${VERTICAL_AVATAR_COLORS[vertical] || 'from-slate-500 to-slate-600'}`}>
                    {m.name?.charAt(0)}
                  </div>
                  <span className="max-w-[90px] truncate">{m.name}</span>
                  <button onClick={() => onToggleLeader(m.id)}
                    title={isLeader ? 'Remover líder' : 'Marcar como líder'}
                    className={`p-0.5 rounded transition-all ${isLeader ? 'text-yellow-400' : 'text-slate-500 hover:text-yellow-400'}`}>
                    <Crown className="w-3 h-3" />
                  </button>
                  <button onClick={() => onToggle(m)}
                    className="p-0.5 text-slate-400 hover:text-red-400 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vertical filter */}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setActiveVertical(null)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${!activeVertical ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-600 text-slate-400 hover:text-white'}`}>
          Todos
        </button>
        {verticals.map(v => (
          <button key={v} onClick={() => setActiveVertical(activeVertical === v ? null : v)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${activeVertical === v ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-600 text-slate-400 hover:text-white'}`}>
            {VERTICAL_LABELS[v] || v}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar colaborador..." className="bg-slate-700 border-slate-600 text-white pl-9 h-8 text-sm" />
      </div>

      {/* Grouped list (only unselected) */}
      <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        ) : Object.entries(grouped).map(([vertical, collabs]) => (
          <div key={vertical}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 px-1">
              {VERTICAL_LABELS[vertical] || vertical}
            </p>
            <div className="space-y-0.5">
              {collabs.map(c => (
                <button key={c.id} onClick={() => onToggle(c)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border border-transparent hover:bg-slate-700/50 hover:border-slate-600/50 transition-all text-left">
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${VERTICAL_AVATAR_COLORS[vertical] || 'from-slate-500 to-slate-600'}`}>
                    {c.name?.charAt(0)}
                  </div>
                  <span className="text-sm text-slate-300">{c.name}</span>
                  {c.entity && <span className="ml-auto text-[10px] text-slate-500 bg-slate-700 px-1.5 py-0.5 rounded">{c.entity}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(grouped).length === 0 && !isLoading && (
          <p className="text-center text-slate-500 text-sm py-4">
            {filtered.length === 0 && collaborators.length > 0 ? 'Todos os colaboradores já foram selecionados' : 'Nenhum colaborador encontrado'}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── STEP 3: Stakeholders ──────────────────────────────────────────────────
function StepStakeholders({ stakeholders, setStakeholders }) {
  const empty = { name: '', role: '', email: '', phone: '', vertical: '' };
  const [form, setForm] = useState(empty);

  const add = () => {
    if (!form.name.trim()) return;
    setStakeholders(prev => [...prev, form]);
    setForm(empty);
  };

  const VERTICAL_OPTIONS = [
    { value: 'gerenciamento', label: 'Gerenciamento' },
    { value: 'arrecadacao', label: 'Arrecadação' },
    { value: 'compras', label: 'Compras/Contratos' },
    { value: 'contabil', label: 'Contábil' },
    { value: 'pessoal', label: 'Pessoal' },
    { value: 'educacao', label: 'Educação' },
    { value: 'iss', label: 'ISS' },
    { value: 'parceiros', label: 'Parceiros' },
    { value: 'plataforma', label: 'Plataforma' },
    { value: 'saude', label: 'Saúde' },
    { value: 'atendimento', label: 'Atendimento' },
    { value: 'outros', label: 'Outros' },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">Adicione os contatos do cliente que serão stakeholders do projeto.</p>

      <div className="bg-slate-700/30 rounded-lg p-4 space-y-3 border border-slate-700/50">
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
            <Label className="text-slate-400 text-xs">Vertical</Label>
            <Select value={form.vertical} onValueChange={v => setForm(p => ({ ...p, vertical: v }))}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm h-8">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {VERTICAL_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-white">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <p className="text-xs text-slate-400">{[s.role, s.vertical ? VERTICAL_LABELS[s.vertical] : null, s.email].filter(Boolean).join(' · ')}</p>
              </div>
              <button onClick={() => setStakeholders(prev => prev.filter((_, idx) => idx !== i))}
                className="text-slate-500 hover:text-red-400 ml-2">
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
        <div className="bg-slate-700/30 rounded-lg p-4 space-y-3 border border-slate-600/50">
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Nome do Risco *</Label>
            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Ex: Atraso na entrega de dados pelo cliente"
              className="bg-slate-700 border-slate-600 text-white text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Descrição</Label>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Descreva o risco..." className="bg-slate-700 border-slate-600 text-white text-sm h-14 resize-none" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Categoria</Label>
            <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm h-8"><SelectValue /></SelectTrigger>
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
            <RangeSlider label="Chance de Acontecer" value={form.probability} onChange={v => setForm(p => ({ ...p, probability: v }))} />
            <RangeSlider label="Impacto se Acontecer" value={form.impact} onChange={v => setForm(p => ({ ...p, impact: v }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Plano de Mitigação</Label>
            <Textarea value={form.mitigation} onChange={e => setForm(p => ({ ...p, mitigation: e.target.value }))}
              placeholder="O que pode ser feito?" className="bg-slate-700 border-slate-600 text-white text-sm h-14 resize-none" />
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
        <div className="space-y-1.5 max-h-52 overflow-y-auto">
          {risks.map((r, i) => {
            const s = r.probability * r.impact;
            const sc = s >= 20 ? 'text-red-400' : s >= 10 ? 'text-orange-400' : 'text-yellow-400';
            return (
              <div key={i} className="flex items-center justify-between bg-slate-700/40 border border-slate-700 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{r.title}</p>
                    <span className={`text-xs font-bold flex-shrink-0 ${sc}`}>{r.probability}×{r.impact}={s}</span>
                  </div>
                  <p className="text-xs text-slate-400">{r.category}</p>
                </div>
                <button onClick={() => setRisks(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-red-400 ml-2">
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
    name: '', managers: [], coordinator: '', portfolio_manager: '',
    portfolio: '', deadline: '', budget: '', contract_link: '',
  });
  const [cronogramas, setCronogramas] = useState([]);
  const [team, setTeam] = useState([]);
  const [teamLeaders, setTeamLeaders] = useState([]); // array of collab ids
  const [stakeholders, setStakeholders] = useState([]);
  const [risks, setRisks] = useState([]);

  const toggleTeam = (collab) => {
    setTeam(prev => {
      const exists = prev.find(m => m.id === collab.id);
      if (exists) {
        setTeamLeaders(l => l.filter(id => id !== collab.id));
        return prev.filter(m => m.id !== collab.id);
      }
      return [...prev, collab];
    });
  };

  const toggleLeader = (id) => {
    setTeamLeaders(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]);
  };

  const canNext = () => step === 0 ? projectInfo.name.trim().length > 0 : true;

  const handleFinish = async () => {
    setSaving(true);
    try {
      await onComplete({
        projectInfo: {
          ...projectInfo,
          manager: projectInfo.managers.join(', '),
        },
        cronogramas,
        team: team.map(m => ({ ...m, is_leader: teamLeaders.includes(m.id) })),
        stakeholders,
        risks,
      });
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  const { totalImpl, totalIncl } = parsedData || {};
  const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v || 0);

  return (
    <Dialog open={open} onOpenChange={v => { if (!saving) onOpenChange(v); }}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl p-0 gap-0 max-h-[92vh] flex flex-col overflow-hidden">
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
          <div className="flex items-center gap-1 mt-4">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <button onClick={() => i < step && setStep(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    i === step ? 'bg-blue-600 text-white' : i < step ? 'bg-green-600/20 text-green-400 cursor-pointer' : 'bg-slate-700 text-slate-500 cursor-default'
                  }`}>
                  {i < step ? <Check className="w-3 h-3" /> : <span>{s.icon}</span>}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <div className={`flex-1 h-px max-w-8 ${i < step ? 'bg-green-600/40' : 'bg-slate-700'}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 0 && <StepOverview data={projectInfo} onChange={setProjectInfo} />}
          {step === 1 && <StepCronograma cronogramas={cronogramas} setCronogramas={setCronogramas} />}
          {step === 2 && <StepTeam selected={team} onToggle={toggleTeam} leaders={teamLeaders} onToggleLeader={toggleLeader} />}
          {step === 3 && <StepStakeholders stakeholders={stakeholders} setStakeholders={setStakeholders} />}
          {step === 4 && <StepRisks risks={risks} setRisks={setRisks} />}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between flex-shrink-0">
          <Button variant="outline" onClick={() => step > 0 ? setStep(s => s - 1) : onOpenChange(false)}
            disabled={saving} className="border-slate-600 text-slate-300 hover:bg-slate-700">
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