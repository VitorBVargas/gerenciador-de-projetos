import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { phaseLabels } from '../timeline/phaseLabels';

const verticals = [
  { value: 'gerenciamento', label: 'Gerenciamento' },
  { value: 'arrecadacao', label: 'Arrecadação' },
  { value: 'compras', label: 'Contratos' },
  { value: 'contabil', label: 'Contábil' },
  { value: 'pessoal', label: 'Pessoal' },
  { value: 'educacao', label: 'Educação' },
  { value: 'iss', label: 'ISS' },
  { value: 'parceiros', label: 'Parceiros' },
  { value: 'plataforma', label: 'Plataforma' },
  { value: 'atendimento', label: 'Atendimento' },
  { value: 'migrador', label: 'Migrador' },
  { value: 'saude', label: 'Saúde' },
  { value: 'extensoes', label: 'Extensões' },
  { value: 'gestao_projetos', label: 'Gestão de Projetos' },
  { value: 'gestao_operacoes', label: 'Gestão de Operações' },
  { value: 'coordenacao_tecnica', label: 'Coordenação Técnica' },
  { value: 'outros', label: 'Outros' }
];

const normalizeVertical = (v) => {
  if (!v) return '';
  const map = {
    'arrecadação': 'arrecadacao', 'arrecadacao': 'arrecadacao',
    'compras': 'compras', 'compras/contratos': 'compras',
    'contábil': 'contabil', 'contabil': 'contabil', 'contabilidade': 'contabil',
    'pessoal': 'pessoal',
    'educação': 'educacao', 'educacao': 'educacao',
    'iss': 'iss',
    'parceiros': 'parceiros',
    'plataforma': 'plataforma',
    'saúde': 'saude', 'saude': 'saude',
    'atendimento': 'atendimento',
    'gerenciamento': 'gerenciamento',
    'migrador': 'migrador', 'migradores': 'migrador',
  };
  return map[v.toLowerCase()] || 'outros';
};

export default function TeamMemberModal({ open, onOpenChange, member, onSave, projectId, portfolio }) {
  const [formData, setFormData] = useState({
    name: '', vertical: '', role: '', entity: '', ticket_number: '', email: '', phone: '', ferias_inicio: '', ferias_fim: '', stages: []
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const nameRef = useRef(null);
  const suggestionsRef = useRef(null);

  const { data: collaborators = [] } = useQuery({
    queryKey: ['portfolioCollaborators', portfolio],
    queryFn: () => portfolio
      ? base44.entities.PortfolioCollaborator.filter({ portfolio })
      : base44.entities.PortfolioCollaborator.list(),
    staleTime: 5 * 60 * 1000
  });

  // Entidades já cadastradas no projeto (para seleção, não digitação)
  const { data: entidades = [] } = useQuery({
    queryKey: ['entidades', projectId],
    queryFn: () => base44.entities.Entidade.filter({ project_id: projectId }),
    enabled: !!projectId
  });
  const { data: products = [] } = useQuery({
    queryKey: ['products', projectId],
    queryFn: () => base44.entities.Product.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const entityOptions = React.useMemo(() => {
    const set = new Set();
    entidades.forEach(e => { if (e.nome) set.add(e.nome); });
    products.forEach(p => { if (p.entity) set.add(p.entity); });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [entidades, products]);

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name || '',
        vertical: member.vertical || '',
        role: member.role || '',
        entity: member.entity || '',
        ticket_number: member.ticket_number || '',
        email: member.email || '',
        phone: member.phone || '',
        ferias_inicio: member.ferias_inicio || '',
        ferias_fim: member.ferias_fim || '',
        stages: member.stages || []
      });
    } else {
      setFormData({ name: '', vertical: '', role: '', entity: '', ticket_number: '', email: '', phone: '', ferias_inicio: '', ferias_fim: '', stages: [] });
    }
  }, [member, open]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        nameRef.current && !nameRef.current.contains(e.target) &&
        suggestionsRef.current && !suggestionsRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredCollaborators = formData.name.length > 0
    ? collaborators.filter(c =>
        c.name?.toLowerCase().includes(formData.name.toLowerCase())
      )
    : collaborators;

  const handleSelectCollaborator = (collab) => {
    setFormData(prev => ({
      ...prev,
      name: collab.name,
      role: collab.role || prev.role,
      email: collab.email || prev.email,
      phone: collab.phone || prev.phone,
      vertical: normalizeVertical(collab.vertical1) || prev.vertical,
    }));
    setShowSuggestions(false);
  };

  const handleStageToggle = (stageKey) => {
    setFormData(prev => ({
      ...prev,
      stages: prev.stages.includes(stageKey)
        ? prev.stages.filter(stage => stage !== stageKey)
        : [...prev.stages, stageKey]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...formData, project_id: projectId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            {member ? 'Editar Membro' : 'Adicionar Membro'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name with autocomplete */}
          <div className="space-y-2 relative">
            <Label htmlFor="name">Nome</Label>
            <Input
              ref={nameRef}
              id="name"
              value={formData.name}
              onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="Nome completo"
              required
              autoComplete="off"
            />
            {showSuggestions && filteredCollaborators.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-50 left-0 right-0 top-full mt-1 bg-slate-700 border border-slate-600 rounded-md shadow-xl max-h-52 overflow-y-auto"
              >
                {filteredCollaborators.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={() => handleSelectCollaborator(c)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-600 transition-colors"
                  >
                    <div className="text-sm text-white font-medium">{c.name}</div>
                    {(c.role || c.vertical1) && (
                      <div className="text-xs text-slate-400">{[c.role, c.vertical1].filter(Boolean).join(' · ')}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Vertical */}
          <div className="space-y-2">
            <Label htmlFor="vertical">Vertical</Label>
            <input
              list="vertical-options"
              value={formData.vertical ? (verticals.find(v => v.value === formData.vertical)?.label || formData.vertical) : ''}
              onChange={(e) => {
                const match = verticals.find(v => v.label.toLowerCase() === e.target.value.toLowerCase());
                setFormData({ ...formData, vertical: match ? match.value : e.target.value });
              }}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Selecione ou digite a vertical"
            />
            <datalist id="vertical-options">
              {verticals.map((v) => <option key={v.value} value={v.label} />)}
            </datalist>
          </div>


          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entity">Entidade</Label>
              <select
                id="entity"
                value={formData.entity}
                onChange={(e) => setFormData({ ...formData, entity: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2 text-sm h-9 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Selecione a entidade</option>
                {entityOptions.map((ent) => (
                  <option key={ent} value={ent}>{ent}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticket">Chamado</Label>
              <Input
                id="ticket"
                value={formData.ticket_number}
                onChange={(e) => setFormData({ ...formData, ticket_number: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Número do chamado"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ferias_inicio">Início das Férias</Label>
              <Input
                id="ferias_inicio"
                type="date"
                value={formData.ferias_inicio}
                onChange={(e) => setFormData({ ...formData, ferias_inicio: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ferias_fim">Fim das Férias</Label>
              <Input
                id="ferias_fim"
                type="date"
                value={formData.ferias_fim}
                onChange={(e) => setFormData({ ...formData, ferias_fim: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Etapas</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-md border border-slate-600 bg-slate-700/50 p-3 max-h-64 overflow-y-auto">
              {Object.entries(phaseLabels).map(([key, label]) => {
                const selected = formData.stages.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleStageToggle(key)}
                    className={`text-left rounded-md border px-3 py-2 text-sm transition-colors ${selected ? 'border-blue-500 bg-blue-600/20 text-white' : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-600/40'}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-400">Você pode selecionar mais de uma etapa.</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              {member ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}