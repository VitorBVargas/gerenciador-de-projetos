import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, ChevronLeft, Check, X, Plus, Search, Users, UserCircle, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const STEPS = [
  { id: 'project', label: 'Projeto', icon: '📋' },
  { id: 'team', label: 'Equipe', icon: '👥' },
  { id: 'stakeholders', label: 'Stakeholders', icon: '🤝' },
  { id: 'risks', label: 'Riscos', icon: '⚠️' },
];

export default function ProjectSetupWizard({ open, onOpenChange, project, onComplete }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 0 - Project
  const [projectData, setProjectData] = useState({
    name: project?.name || '',
    manager: project?.manager || '',
    coordinator: project?.coordinator || '',
    portfolio_manager: project?.portfolio_manager || '',
    deadline: project?.deadline || '',
    contract_link: project?.contract_link || '',
  });

  // Step 1 - Team
  const [teamSearch, setTeamSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState([]);

  // Step 2 - Stakeholders
  const [stakeholders, setStakeholders] = useState([]);
  const [newStakeholder, setNewStakeholder] = useState({ name: '', role: '', email: '', phone: '', vertical: '' });

  // Step 3 - Risks
  const [risks, setRisks] = useState([]);
  const [newRisk, setNewRisk] = useState({ title: '', category: 'tecnico', probability: 'media', impact: 'medio', mitigation: '' });

  const portfolioForFilter = project?.portfolio;

  const { data: collaborators = [] } = useQuery({
    queryKey: ['portfolioCollaborators', portfolioForFilter],
    queryFn: async () => {
      if (portfolioForFilter) {
        return base44.entities.PortfolioCollaborator.filter({ portfolio: portfolioForFilter });
      }
      return base44.entities.PortfolioCollaborator.list();
    },
    enabled: open && step === 1
  });

  useEffect(() => {
    if (project) {
      setProjectData({
        name: project.name || '',
        manager: project.manager || '',
        coordinator: project.coordinator || '',
        portfolio_manager: project.portfolio_manager || '',
        deadline: project.deadline || '',
        contract_link: project.contract_link || '',
      });
    }
  }, [project]);

  const filteredCollaborators = collaborators.filter(c =>
    c.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
    (c.role || '').toLowerCase().includes(teamSearch.toLowerCase()) ||
    (c.vertical1 || '').toLowerCase().includes(teamSearch.toLowerCase())
  );

  const toggleTeamMember = (collab) => {
    setSelectedTeam(prev => {
      const exists = prev.find(m => m.id === collab.id);
      if (exists) return prev.filter(m => m.id !== collab.id);
      return [...prev, collab];
    });
  };

  const addStakeholder = () => {
    if (!newStakeholder.name) return;
    setStakeholders(prev => [...prev, { ...newStakeholder }]);
    setNewStakeholder({ name: '', role: '', email: '', phone: '' });
  };

  const removeStakeholder = (idx) => setStakeholders(prev => prev.filter((_, i) => i !== idx));

  const addRisk = () => {
    if (!newRisk.title) return;
    setRisks(prev => [...prev, { ...newRisk }]);
    setNewRisk({ title: '', category: 'tecnico', probability: 'media', impact: 'medio', mitigation: '' });
  };

  const removeRisk = (idx) => setRisks(prev => prev.filter((_, i) => i !== idx));

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Update project
      await base44.entities.Project.update(project.id, {
        name: projectData.name,
        manager: projectData.manager,
        coordinator: projectData.coordinator,
        portfolio_manager: projectData.portfolio_manager,
        deadline: projectData.deadline || null,
        contract_link: projectData.contract_link,
        status: 'em_andamento'
      });

      // Create team members
      if (selectedTeam.length > 0) {
        await base44.entities.TeamMember.bulkCreate(
          selectedTeam.map(c => ({
            project_id: project.id,
            name: c.name,
            role: c.role || '',
            vertical: c.vertical1 || 'gerenciamento',
            email: c.email || '',
            phone: c.phone || ''
          }))
        );
      }

      // Create stakeholders
      if (stakeholders.length > 0) {
        await base44.entities.Stakeholder.bulkCreate(
          stakeholders.map(s => ({ ...s, project_id: project.id }))
        );
      }

      // Create risks
      if (risks.length > 0) {
        await base44.entities.Risk.bulkCreate(
          risks.map(r => ({ ...r, project_id: project.id, status: 'em_monitoramento' }))
        );
      }

      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onComplete?.();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return projectData.name.trim().length > 0;
    return true;
  };

  const verticalLabels = {
    arrecadacao: 'Arrecadação', compras: 'Compras', contabil: 'Contábil',
    pessoal: 'Pessoal', educacao: 'Educação', saude: 'Saúde',
    gerenciamento: 'Gerência', plataforma: 'Plataforma', atendimento: 'Atendimento',
    'Suporte': 'Suporte', 'Extensão': 'Extensão', 'Migrador': 'Migrador',
    'Gerencia': 'Gerência'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            Configuração do Projeto
          </DialogTitle>
          {/* Steps indicator */}
          <div className="flex items-center gap-2 mt-4">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  i === step ? 'bg-blue-600 text-white' :
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
          {/* Step 0: Project Info */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Nome do Projeto *</Label>
                <Input
                  value={projectData.name}
                  onChange={e => setProjectData(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Altamira - Implantação Betha"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Gerente(s) do Projeto</Label>
                  <Input value={projectData.manager} onChange={e => setProjectData(p => ({ ...p, manager: e.target.value }))} placeholder="Nome do gerente" className="bg-slate-700 border-slate-600 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Coordenador Técnico</Label>
                  <Input value={projectData.coordinator} onChange={e => setProjectData(p => ({ ...p, coordinator: e.target.value }))} placeholder="Nome do coordenador" className="bg-slate-700 border-slate-600 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Gerente de Portfólio</Label>
                  <Input value={projectData.portfolio_manager} onChange={e => setProjectData(p => ({ ...p, portfolio_manager: e.target.value }))} placeholder="Nome do gerente de portfólio" className="bg-slate-700 border-slate-600 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Prazo Final</Label>
                  <Input type="date" value={projectData.deadline} onChange={e => setProjectData(p => ({ ...p, deadline: e.target.value }))} className="bg-slate-700 border-slate-600 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Link do Contrato</Label>
                <Input value={projectData.contract_link} onChange={e => setProjectData(p => ({ ...p, contract_link: e.target.value }))} placeholder="https://..." className="bg-slate-700 border-slate-600 text-white" />
              </div>
            </div>
          )}

          {/* Step 1: Team */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">Selecione os membros da equipe Betha que irão atuar neste projeto.</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={teamSearch}
                  onChange={e => setTeamSearch(e.target.value)}
                  placeholder="Buscar por nome, cargo ou vertical..."
                  className="bg-slate-700 border-slate-600 text-white pl-9"
                />
              </div>
              {selectedTeam.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTeam.map(m => (
                    <Badge key={m.id} className="bg-blue-600/30 text-blue-300 border-blue-600/50 flex items-center gap-1">
                      {m.name}
                      <button onClick={() => toggleTeamMember(m)}><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                {filteredCollaborators.map(c => {
                  const selected = selectedTeam.find(m => m.id === c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleTeamMember(c)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                        selected ? 'bg-blue-600/20 border border-blue-600/40' : 'hover:bg-slate-700 border border-transparent'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{c.name}</p>
                        <p className="text-xs text-slate-400">{c.role} {c.vertical1 ? `• ${verticalLabels[c.vertical1] || c.vertical1}` : ''}{c.vertical2 ? ` / ${verticalLabels[c.vertical2] || c.vertical2}` : ''}</p>
                      </div>
                      {selected && <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                    </button>
                  );
                })}
                {filteredCollaborators.length === 0 && (
                  <p className="text-center text-slate-500 py-8 text-sm">Nenhum colaborador encontrado</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Stakeholders */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">Adicione os stakeholders do cliente (contatos do município).</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs">Nome *</Label>
                  <Input value={newStakeholder.name} onChange={e => setNewStakeholder(p => ({ ...p, name: e.target.value }))} placeholder="Nome completo" className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs">Cargo</Label>
                  <Input value={newStakeholder.role} onChange={e => setNewStakeholder(p => ({ ...p, role: e.target.value }))} placeholder="Cargo/Função" className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs">Vertical</Label>
                  <Select value={newStakeholder.vertical} onValueChange={v => setNewStakeholder(p => ({ ...p, vertical: v }))}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="gerenciamento">Gerenciamento</SelectItem>
                      <SelectItem value="arrecadacao">Arrecadação</SelectItem>
                      <SelectItem value="compras">Compras/Contratos</SelectItem>
                      <SelectItem value="contabil">Contábil</SelectItem>
                      <SelectItem value="pessoal">Pessoal</SelectItem>
                      <SelectItem value="educacao">Educação</SelectItem>
                      <SelectItem value="iss">ISS</SelectItem>
                      <SelectItem value="parceiros">Parceiros</SelectItem>
                      <SelectItem value="plataforma">Plataforma</SelectItem>
                      <SelectItem value="saude">Saúde</SelectItem>
                      <SelectItem value="atendimento">Atendimento</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs">E-mail</Label>
                  <Input value={newStakeholder.email} onChange={e => setNewStakeholder(p => ({ ...p, email: e.target.value }))} placeholder="email@municipio.gov.br" className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs">Telefone</Label>
                  <Input value={newStakeholder.phone} onChange={e => setNewStakeholder(p => ({ ...p, phone: e.target.value }))} placeholder="(00) 00000-0000" className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
              </div>
              <Button onClick={addStakeholder} disabled={!newStakeholder.name} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 w-full">
                <Plus className="w-4 h-4 mr-2" /> Adicionar Stakeholder
              </Button>
              {stakeholders.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {stakeholders.map((s, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-white">{s.name}</p>
                        <p className="text-xs text-slate-400">{s.role}{s.email ? ` • ${s.email}` : ''}</p>
                      </div>
                      <button onClick={() => removeStakeholder(i)} className="text-slate-500 hover:text-red-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {stakeholders.length === 0 && (
                <p className="text-center text-slate-500 py-6 text-sm">Nenhum stakeholder adicionado. Você pode adicionar depois.</p>
              )}
            </div>
          )}

          {/* Step 3: Risks */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">Adicione os riscos identificados para este projeto.</p>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs">Descrição do Risco *</Label>
                  <Input value={newRisk.title} onChange={e => setNewRisk(p => ({ ...p, title: e.target.value }))} placeholder="Descreva o risco..." className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-xs">Categoria</Label>
                    <Select value={newRisk.category} onValueChange={v => setNewRisk(p => ({ ...p, category: v }))}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="tecnico">Técnico</SelectItem>
                        <SelectItem value="cronograma">Cronograma</SelectItem>
                        <SelectItem value="recurso">Recurso</SelectItem>
                        <SelectItem value="cliente">Cliente</SelectItem>
                        <SelectItem value="externo">Externo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-xs">Probabilidade</Label>
                    <Select value={newRisk.probability} onValueChange={v => setNewRisk(p => ({ ...p, probability: v }))}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-xs">Impacto</Label>
                    <Select value={newRisk.impact} onValueChange={v => setNewRisk(p => ({ ...p, impact: v }))}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="baixo">Baixo</SelectItem>
                        <SelectItem value="medio">Médio</SelectItem>
                        <SelectItem value="alto">Alto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs">Plano de Mitigação</Label>
                  <Textarea value={newRisk.mitigation} onChange={e => setNewRisk(p => ({ ...p, mitigation: e.target.value }))} placeholder="Descreva o plano de mitigação..." className="bg-slate-700 border-slate-600 text-white text-sm h-16 resize-none" />
                </div>
              </div>
              <Button onClick={addRisk} disabled={!newRisk.title} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 w-full">
                <Plus className="w-4 h-4 mr-2" /> Adicionar Risco
              </Button>
              {risks.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {risks.map((r, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-white">{r.title}</p>
                        <p className="text-xs text-slate-400">{r.category} • {r.probability} prob. • {r.impact} impacto</p>
                      </div>
                      <button onClick={() => removeRisk(i)} className="text-slate-500 hover:text-red-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {risks.length === 0 && (
                <p className="text-center text-slate-500 py-6 text-sm">Nenhum risco adicionado. Você pode adicionar depois.</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between border-t border-slate-700 pt-4">
          <Button
            variant="outline"
            onClick={() => step > 0 ? setStep(s => s - 1) : onOpenChange(false)}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            {step > 0 ? <><ChevronLeft className="w-4 h-4 mr-1" />Voltar</> : 'Cancelar'}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Próximo <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? 'Salvando...' : <><Check className="w-4 h-4 mr-1" />Concluir</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}