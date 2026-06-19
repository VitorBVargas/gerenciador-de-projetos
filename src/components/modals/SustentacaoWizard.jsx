import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, ChevronLeft, Check, X, Plus, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const STEPS = [
  { id: 'project', label: 'Projeto', icon: '📋' },
  { id: 'team', label: 'Equipe', icon: '👥' },
  { id: 'stakeholders', label: 'Stakeholders', icon: '🤝' },
  { id: 'products', label: 'Produtos', icon: '📦' },
];

const VERTICALS = [
  { value: 'arrecadacao', label: 'Arrecadação' },
  { value: 'compras', label: 'Compras/Contratos' },
  { value: 'contabil', label: 'Contábil' },
  { value: 'pessoal', label: 'Pessoal' },
  { value: 'educacao', label: 'Educação' },
  { value: 'saude', label: 'Saúde' },
  { value: 'atendimento', label: 'Atendimento' },
  { value: 'plataforma', label: 'Plataforma' },
  { value: 'gerenciamento', label: 'Gerenciamento' },
  { value: 'parceiros', label: 'Parceiros' },
  { value: 'outros', label: 'Outros' },
];

const VERTICAL_LABELS = Object.fromEntries(VERTICALS.map(v => [v.value, v.label]));

// Normaliza a grafia livre das verticais vindas do banco (PortfolioCollaborator)
// para os valores fixos usados no agrupamento.
const normalizeVertical = (raw) => {
  const v = (raw || '').toLowerCase().trim();
  if (!v) return 'outros';
  if (v.includes('arrecad') || v.includes('tributo') || v.includes('iss') || v.includes('procurad')) return 'arrecadacao';
  if (v.includes('compra') || v.includes('contrato') || v.includes('patrim') || v.includes('almox') || v.includes('frota')) return 'compras';
  if (v.includes('contab') || v.includes('contábil') || v.includes('orçament') || v.includes('orcament') || v.includes('tesourar')) return 'contabil';
  if (v.includes('pessoal') || v.includes('folha') || v.includes('rh') || v.includes('recursos humanos') || v.includes('esocial') || v.includes('ponto')) return 'pessoal';
  if (v.includes('educa')) return 'educacao';
  if (v.includes('saude') || v.includes('saúde')) return 'saude';
  if (v.includes('atend') || v.includes('protocolo') || v.includes('ouvidoria') || v.includes('cidad') || v.includes('portal')) return 'atendimento';
  if (v.includes('platafor') || v.includes('cloud') || v.includes('sso') || v.includes('integr')) return 'plataforma';
  if (v.includes('geren') || v.includes('coorden') || v.includes('projeto')) return 'gerenciamento';
  if (v.includes('parceir')) return 'parceiros';
  return 'outros';
};

// Produtos fixos por vertical
const PRODUCTS_BY_VERTICAL = {
  arrecadacao: ['IPTU', 'ISS', 'ITBI', 'Dívida Ativa', 'NFS-e', 'Fiscalização', 'Alvará', 'CAE', 'Arrecadação Geral'],
  compras: ['Compras', 'Contratos', 'Licitações', 'Patrimônio', 'Almoxarifado', 'Frota'],
  contabil: ['Contabilidade', 'Orçamento', 'PCA', 'Tesouraria', 'eSocial Contábil'],
  pessoal: ['Folha de Pagamento', 'RH', 'Ponto Eletrônico', 'eSocial Pessoal', 'Portal do Servidor'],
  educacao: ['Diário Escolar', 'Matrícula', 'Gestão Escolar', 'Transporte Escolar', 'Merenda'],
  saude: ['Prontuário Eletrônico', 'Regulação', 'Farmácia', 'Vigilância Sanitária', 'SISAB'],
  atendimento: ['Protocolo', 'Ouvidoria', 'Portal do Cidadão', 'e-Gov'],
  plataforma: ['Betha Cloud', 'SSO', 'BFC', 'Integração'],
  gerenciamento: ['GP Projetos', 'Gestão de Contratos', 'Gestão Documental'],
  parceiros: ['Nota Fiscal', 'Emissão', 'Outros Parceiros'],
  outros: ['Outros'],
};

// Produtos que possuem aba extra de "Prestação de Contas"
const PRESTACAO_CONTAS_PRODUCTS = ['Prestação de Contas', 'PCA', 'Contabilidade'];

export default function SustentacaoWizard({ open, onOpenChange, portfolioFilter, onComplete }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 0 - Project info
  const [projectData, setProjectData] = useState({
    name: '', city: '', manager: '', priority: 'media', notes: ''
  });

  // Step 1 - Team
  const [teamSearch, setTeamSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState([]);
  const [newTeamMember, setNewTeamMember] = useState({ name: '', role: '', papel: '' });
  const [addingNew, setAddingNew] = useState(false);

  // Step 2 - Stakeholders
  const [stakeholders, setStakeholders] = useState([]);
  const [newStakeholder, setNewStakeholder] = useState({ name: '', cargo: '', organizacao: '', influencia: '', interesse: '' });

  // Step 3 - Products
  const [products, setProducts] = useState([]);
  const [selectedProductVertical, setSelectedProductVertical] = useState(null);
  // Prestação de Contas: null | 'SC' | 'MG'
  const [prestacaoContas, setPrestacaoContas] = useState(null);

  const [selectedVertical, setSelectedVertical] = useState(null);

  const { data: collaborators = [] } = useQuery({
    queryKey: ['portfolioCollaborators'],
    queryFn: () => base44.entities.PortfolioCollaborator.list(),
    enabled: open && step === 1
  });

  // Group collaborators by vertical (normalizando a grafia livre do banco)
  const collaboratorsByVertical = VERTICALS.reduce((acc, v) => {
    acc[v.value] = collaborators
      .filter(c =>
        normalizeVertical(c.vertical1) === v.value ||
        normalizeVertical(c.vertical2) === v.value
      )
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
    return acc;
  }, {});

  const verticalsWithMembers = VERTICALS.filter(v => collaboratorsByVertical[v.value]?.length > 0);

  const membersInSelectedVertical = selectedVertical
    ? (collaboratorsByVertical[selectedVertical] || [])
    : [];

  // Busca global por nome — ignora a vertical selecionada
  const searchedMembers = memberSearch.trim()
    ? collaborators
        .filter(c => (c.name || '').toLowerCase().includes(memberSearch.toLowerCase()))
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'))
    : [];

  const toggleTeamMember = (collab) => {
    setSelectedTeam(prev => {
      const exists = prev.find(m => m.id === collab.id);
      if (exists) return prev.filter(m => m.id !== collab.id);
      return [...prev, { ...collab, papel: '' }];
    });
  };

  const updateTeamMemberPapel = (id, papel) => {
    setSelectedTeam(prev => prev.map(m => m.id === id ? { ...m, papel } : m));
  };

  const addNewTeamMember = () => {
    if (!newTeamMember.name.trim()) return;
    const member = { id: `new_${Date.now()}`, ...newTeamMember, isNew: true };
    setSelectedTeam(prev => [...prev, member]);
    setNewTeamMember({ name: '', role: '', papel: '' });
    setAddingNew(false);
  };

  const addStakeholder = () => {
    if (!newStakeholder.name.trim()) return;
    setStakeholders(prev => [...prev, { ...newStakeholder }]);
    setNewStakeholder({ name: '', cargo: '', organizacao: '', influencia: '', interesse: '' });
  };

  const toggleProduct = (vertical, productName) => {
    setProducts(prev => {
      const exists = prev.find(p => p.vertical === vertical && p.product_name === productName);
      if (exists) return prev.filter(p => !(p.vertical === vertical && p.product_name === productName));
      return [...prev, { id: Date.now(), vertical, product_name: productName, status: 'ativo', prestacao_contas: false }];
    });
  };

  const hasPrestacaoContas = !!prestacaoContas;

  const canProceed = () => {
    if (step === 0) return projectData.name.trim().length > 0;
    return true;
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // 1. Criar projeto
      const project = await base44.entities.Project.create({
        name: projectData.name,
        city: projectData.city,
        manager: projectData.manager,
        priority: projectData.priority,
        notes: projectData.notes,
        portfolio: portfolioFilter,
        project_type: 'sustentacao',
        status: 'sustentacao',
      });

      // 2. Criar equipe
      const teamToCreate = selectedTeam.map(m => ({
        project_id: project.id,
        name: m.name,
        role: m.papel || m.role || '',
        vertical: m.vertical1 || 'gerenciamento',
        email: m.email || '',
        phone: m.phone || '',
      }));
      if (teamToCreate.length > 0) {
        await base44.entities.TeamMember.bulkCreate(teamToCreate);
      }

      // 3. Criar stakeholders
      if (stakeholders.length > 0) {
        await base44.entities.Stakeholder.bulkCreate(
          stakeholders.map(s => ({
            project_id: project.id,
            name: s.name,
            role: s.cargo || '',
            email: s.organizacao || '',
          }))
        );
      }

      // 4. Criar produtos
      const allProducts = [...products];
      if (prestacaoContas) {
        allProducts.push({
          id: Date.now(),
          vertical: 'contabil',
          product_name: `Prestação de Contas (${prestacaoContas})`,
          status: 'ativo',
          prestacao_contas: true,
        });
      }
      if (allProducts.length > 0) {
        await base44.entities.Product.bulkCreate(
          allProducts.map(p => ({
            project_id: project.id,
            name: p.product_name,
            vertical: p.vertical,
            status: p.status || 'ativo',
            priority: 'media',
            prestacao_contas: p.prestacao_contas || false,
          }))
        );
      }

      onComplete?.();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const resetAndClose = () => {
    setStep(0);
    setProjectData({ name: '', city: '', manager: '', priority: 'media', notes: '' });
    setSelectedTeam([]);
    setSelectedVertical(null);
    setMemberSearch('');
    setStakeholders([]);
    setProducts([]);
    setSelectedProductVertical(null);
    setPrestacaoContas(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-purple-600/30 text-purple-300 text-sm font-semibold">Sustentação</span>
            Novo Projeto de Sustentação
          </DialogTitle>
          <div className="flex items-center gap-2 mt-4">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  i === step ? 'bg-purple-600 text-white' :
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

          {/* Step 0: Project */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label className="text-slate-300">Nome do Projeto *</Label>
                  <Input
                    value={projectData.name}
                    onChange={e => setProjectData(p => ({ ...p, name: e.target.value }))}
                    placeholder="Ex: Sustentação Arrecadação - Ibirité"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Cidade</Label>
                  <Input value={projectData.city} onChange={e => setProjectData(p => ({ ...p, city: e.target.value }))} placeholder="Ex: Ibirité/MG" className="bg-slate-700 border-slate-600 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Gerente Responsável</Label>
                  <Input value={projectData.manager} onChange={e => setProjectData(p => ({ ...p, manager: e.target.value }))} placeholder="Nome do gerente" className="bg-slate-700 border-slate-600 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Prioridade</Label>
                  <Select value={projectData.priority} onValueChange={v => setProjectData(p => ({ ...p, priority: v }))}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="critica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-slate-300">Observações</Label>
                  <Textarea value={projectData.notes} onChange={e => setProjectData(p => ({ ...p, notes: e.target.value }))} placeholder="Contexto, acordos, observações..." className="bg-slate-700 border-slate-600 text-white resize-none h-20" />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Team */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Selected members summary */}
              {selectedTeam.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTeam.map(m => (
                    <div key={m.id} className="flex items-center gap-1.5 bg-purple-600/20 border border-purple-600/40 rounded-full px-3 py-1 text-xs text-purple-200">
                      <span>{m.name}</span>
                      <button onClick={() => setSelectedTeam(prev => prev.filter(x => x.id !== m.id))} className="text-purple-400 hover:text-red-400 ml-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Busca global por nome */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  placeholder="Buscar pessoa por nome..."
                  className="bg-slate-700 border-slate-600 text-white pl-9"
                />
                {memberSearch && (
                  <button onClick={() => setMemberSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Resultados da busca por nome */}
              {memberSearch.trim() ? (
                <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                  {searchedMembers.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">Nenhuma pessoa encontrada para "{memberSearch}".</p>
                  ) : searchedMembers.map(c => {
                    const isSelected = !!selectedTeam.find(m => m.id === c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleTeamMember(c)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                          isSelected
                            ? 'bg-purple-600/20 border border-purple-500/50'
                            : 'border border-transparent hover:bg-slate-700'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected ? 'bg-purple-600 border-purple-600' : 'border-slate-500'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{c.name}</p>
                          <p className="text-xs text-slate-400">{[c.role, c.vertical1].filter(Boolean).join(' • ') || '—'}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : !selectedVertical ? (
                <>
                  <p className="text-sm text-slate-400">Selecione uma vertical para ver os membros disponíveis:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {VERTICALS.map(v => {
                      const count = collaboratorsByVertical[v.value]?.length || 0;
                      const selectedCount = selectedTeam.filter(m =>
                        normalizeVertical(m.vertical1) === v.value ||
                        normalizeVertical(m.vertical2) === v.value
                      ).length;
                      return (
                        <button
                          key={v.value}
                          onClick={() => setSelectedVertical(v.value)}
                          className={`relative flex flex-col items-start p-3 rounded-lg border transition-all text-left ${
                            selectedCount > 0
                              ? 'border-purple-500/60 bg-purple-600/10'
                              : 'border-slate-600 bg-slate-700/40 hover:border-slate-500 hover:bg-slate-700'
                          }`}
                        >
                          <span className="text-sm font-medium text-white">{v.label}</span>
                          <span className="text-xs text-slate-400 mt-0.5">{count} membro{count !== 1 ? 's' : ''}</span>
                          {selectedCount > 0 && (
                            <span className="absolute top-2 right-2 w-5 h-5 bg-purple-600 rounded-full text-xs text-white flex items-center justify-center font-bold">{selectedCount}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {/* Manual add */}
                  {!addingNew ? (
                    <Button variant="outline" onClick={() => setAddingNew(true)} className="border-slate-600 text-slate-300 hover:bg-slate-700 w-full">
                      <Plus className="w-4 h-4 mr-2" /> Adicionar membro manualmente
                    </Button>
                  ) : (
                    <div className="bg-slate-700/50 rounded-lg p-3 space-y-3">
                      <p className="text-xs text-slate-400 font-medium">Novo membro</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={newTeamMember.name} onChange={e => setNewTeamMember(p => ({ ...p, name: e.target.value }))} placeholder="Nome *" className="bg-slate-700 border-slate-600 text-white text-sm" />
                        <Input value={newTeamMember.role} onChange={e => setNewTeamMember(p => ({ ...p, role: e.target.value }))} placeholder="Função" className="bg-slate-700 border-slate-600 text-white text-sm" />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={addNewTeamMember} disabled={!newTeamMember.name.trim()} className="bg-purple-600 hover:bg-purple-700">Adicionar</Button>
                        <Button size="sm" variant="outline" onClick={() => setAddingNew(false)} className="border-slate-600 text-slate-300">Cancelar</Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedVertical(null)} className="text-slate-400 hover:text-white">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium text-white">{VERTICAL_LABELS[selectedVertical]}</span>
                    <span className="text-xs text-slate-400">— clique para marcar/desmarcar</span>
                  </div>
                  <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                    {membersInSelectedVertical.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-6">Nenhum membro nesta vertical.</p>
                    ) : membersInSelectedVertical.map(c => {
                      const isSelected = !!selectedTeam.find(m => m.id === c.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() => toggleTeamMember(c)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                            isSelected
                              ? 'bg-purple-600/20 border border-purple-500/50'
                              : 'border border-transparent hover:bg-slate-700'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected ? 'bg-purple-600 border-purple-600' : 'border-slate-500'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white">{c.name}</p>
                            <p className="text-xs text-slate-400">{c.role || '—'}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <Button variant="outline" onClick={() => setSelectedVertical(null)} className="border-slate-600 text-slate-300 hover:bg-slate-700 w-full">
                    ← Voltar para verticais
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Step 2: Stakeholders */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">Adicione os stakeholders do projeto.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs">Nome *</Label>
                  <Input value={newStakeholder.name} onChange={e => setNewStakeholder(p => ({ ...p, name: e.target.value }))} placeholder="Nome completo" className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs">Cargo</Label>
                  <Input value={newStakeholder.cargo} onChange={e => setNewStakeholder(p => ({ ...p, cargo: e.target.value }))} placeholder="Cargo/Função" className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs">Organização</Label>
                  <Input value={newStakeholder.organizacao} onChange={e => setNewStakeholder(p => ({ ...p, organizacao: e.target.value }))} placeholder="Empresa/Órgão" className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs">Influência</Label>
                  <Select value={newStakeholder.influencia} onValueChange={v => setNewStakeholder(p => ({ ...p, influencia: v }))}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs">Interesse</Label>
                  <Select value={newStakeholder.interesse} onValueChange={v => setNewStakeholder(p => ({ ...p, interesse: v }))}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="baixo">Baixo</SelectItem>
                      <SelectItem value="medio">Médio</SelectItem>
                      <SelectItem value="alto">Alto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={addStakeholder} disabled={!newStakeholder.name.trim()} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 w-full">
                <Plus className="w-4 h-4 mr-2" /> Adicionar Stakeholder
              </Button>
              {stakeholders.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {stakeholders.map((s, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-white">{s.name}</p>
                        <p className="text-xs text-slate-400">{s.cargo}{s.organizacao ? ` • ${s.organizacao}` : ''}{s.influencia ? ` • Influência: ${s.influencia}` : ''}</p>
                      </div>
                      <button onClick={() => setStakeholders(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-red-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {stakeholders.length === 0 && (
                <p className="text-center text-slate-500 py-4 text-sm">Nenhum stakeholder adicionado. Você pode adicionar depois.</p>
              )}
            </div>
          )}

          {/* Step 3: Products */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Prestação de Contas — seção especial */}
              <div className={`rounded-xl border p-4 transition-colors ${hasPrestacaoContas ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-slate-600 bg-slate-700/30'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400 text-base">📋</span>
                    <span className="text-white font-semibold text-sm">Prestação de Contas</span>
                    {hasPrestacaoContas && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded-full px-2 py-0.5 font-medium">{prestacaoContas}</span>
                    )}
                  </div>
                  {hasPrestacaoContas && (
                    <button onClick={() => setPrestacaoContas(null)} className="text-slate-500 hover:text-red-400 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {!hasPrestacaoContas ? (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-400 mr-2">Habilitar módulo?</p>
                    <button onClick={() => setPrestacaoContas('SC')}
                      className="px-4 py-1.5 rounded-lg border border-slate-600 bg-slate-700 text-white text-xs font-medium hover:border-yellow-500/60 hover:bg-yellow-500/10 transition-colors">
                      SC (Santa Catarina)
                    </button>
                    <button onClick={() => setPrestacaoContas('MG')}
                      className="px-4 py-1.5 rounded-lg border border-slate-600 bg-slate-700 text-white text-xs font-medium hover:border-yellow-500/60 hover:bg-yellow-500/10 transition-colors">
                      MG (Minas Gerais)
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-400 mr-1">Estado:</p>
                    {['SC', 'MG'].map(uf => (
                      <button key={uf} onClick={() => setPrestacaoContas(uf)}
                        className={`px-4 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                          prestacaoContas === uf
                            ? 'border-yellow-500 bg-yellow-500/20 text-yellow-300'
                            : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-yellow-500/40'
                        }`}>
                        {uf === 'SC' ? 'SC (Santa Catarina)' : 'MG (Minas Gerais)'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected products summary */}
              {products.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {products.map(p => (
                    <div key={p.id} className="flex items-center gap-1 bg-purple-600/20 border border-purple-600/40 rounded-full px-2.5 py-1 text-xs text-purple-200">
                      <span>{p.product_name}</span>
                      <button onClick={() => toggleProduct(p.vertical, p.product_name)} className="text-purple-400 hover:text-red-400 ml-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!selectedProductVertical ? (
                <>
                  <p className="text-sm text-slate-400">Selecione uma vertical para ver os produtos disponíveis:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {VERTICALS.map(v => {
                      const selectedCount = products.filter(p => p.vertical === v.value).length;
                      return (
                        <button
                          key={v.value}
                          onClick={() => setSelectedProductVertical(v.value)}
                          className={`relative flex flex-col items-start p-3 rounded-lg border transition-all text-left ${
                            selectedCount > 0
                              ? 'border-purple-500/60 bg-purple-600/10'
                              : 'border-slate-600 bg-slate-700/40 hover:border-slate-500 hover:bg-slate-700'
                          }`}
                        >
                          <span className="text-sm font-medium text-white">{v.label}</span>
                          <span className="text-xs text-slate-400 mt-0.5">{(PRODUCTS_BY_VERTICAL[v.value] || []).length} produtos</span>
                          {selectedCount > 0 && (
                            <span className="absolute top-2 right-2 w-5 h-5 bg-purple-600 rounded-full text-xs text-white flex items-center justify-center font-bold">{selectedCount}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedProductVertical(null)} className="text-slate-400 hover:text-white">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium text-white">{VERTICAL_LABELS[selectedProductVertical]}</span>
                    <span className="text-xs text-slate-400">— clique para marcar/desmarcar</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                    {(PRODUCTS_BY_VERTICAL[selectedProductVertical] || []).map(productName => {
                      const isSelected = !!products.find(p => p.vertical === selectedProductVertical && p.product_name === productName);
                      const isPrestacao = PRESTACAO_CONTAS_PRODUCTS.includes(productName);
                      return (
                        <button
                          key={productName}
                          onClick={() => toggleProduct(selectedProductVertical, productName)}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left border transition-colors ${
                            isSelected
                              ? 'bg-purple-600/20 border-purple-500/50'
                              : 'border-transparent hover:bg-slate-700 border-slate-700/50'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected ? 'bg-purple-600 border-purple-600' : 'border-slate-500'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white leading-tight">{productName}</p>
                            {isPrestacao && (
                              <p className="text-xs text-yellow-400 mt-0.5">★ inclui aba Prestação de Contas</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {products.length === 0 && !selectedProductVertical && (
                <p className="text-center text-slate-500 py-2 text-sm">Nenhum produto adicionado. Você pode adicionar depois.</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between border-t border-slate-700 pt-4">
          <Button variant="outline" onClick={() => step > 0 ? setStep(s => s - 1) : resetAndClose()} className="border-slate-600 text-slate-300 hover:bg-slate-700">
            {step > 0 ? <><ChevronLeft className="w-4 h-4 mr-1" />Voltar</> : 'Cancelar'}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="bg-purple-600 hover:bg-purple-700">
              Próximo <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={saving} className="bg-green-600 hover:bg-green-700">
              {saving ? 'Salvando...' : <><Check className="w-4 h-4 mr-1" />Concluir</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}