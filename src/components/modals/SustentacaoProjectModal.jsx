import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Building2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function SustentacaoProjectModal({ open, onOpenChange, project, onSave }) {
  const queryClient = useQueryClient();
  const projectId = project?.id;

  const [formData, setFormData] = useState({
    name: '',
    manager: '',
    contract_number: '',
    contract_link: '',
    documents_folder_link: '',
    sustentacao_start_date: '',
    last_meeting_date: '',
    next_meeting_date: '',
    notes: '',
    show_in_executive_status: false,
  });

  const [newEntity, setNewEntity] = useState({ nome: '', nome_completo: '' });
  const [savingEntity, setSavingEntity] = useState(false);

  const { data: entities = [], refetch: refetchEntities } = useQuery({
    queryKey: ['entities', projectId],
    queryFn: () => base44.entities.Entidade.filter({ project_id: projectId }),
    enabled: !!projectId && open,
  });

  const orderedEntities = [...entities].sort((a, b) => (a.ordem ?? 999) - (b.ordem ?? 999));

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        manager: project.manager || '',
        contract_number: project.contract_number || '',
        contract_link: project.contract_link || '',
        documents_folder_link: project.documents_folder_link || '',
        sustentacao_start_date: project.sustentacao_start_date || '',
        last_meeting_date: project.last_meeting_date || '',
        next_meeting_date: project.next_meeting_date || '',
        notes: project.notes || '',
        show_in_executive_status: project.show_in_executive_status || false,
      });
    }
    setNewEntity({ nome: '', nome_completo: '' });
  }, [project, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };

  const handleAddEntity = async () => {
    if (!newEntity.nome.trim() || !projectId) return;
    setSavingEntity(true);
    await base44.entities.Entidade.create({ ...newEntity, project_id: projectId, ordem: orderedEntities.length });
    setNewEntity({ nome: '', nome_completo: '' });
    refetchEntities();
    queryClient.invalidateQueries(['entities', projectId]);
    setSavingEntity(false);
  };

  const handleDeleteEntity = async (id) => {
    if (!confirm('Remover esta entidade?')) return;
    await base44.entities.Entidade.delete(id);
    refetchEntities();
    queryClient.invalidateQueries(['entities', projectId]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Editar Projeto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Projeto</Label>
            <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white" required />
          </div>
          <div className="space-y-2">
            <Label>Gerente</Label>
            <Input value={formData.manager} onChange={e => setFormData({ ...formData, manager: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nº Contrato</Label>
              <Input value={formData.contract_number} onChange={e => setFormData({ ...formData, contract_number: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white" />
            </div>
            <div className="space-y-2">
              <Label>Link do Contrato</Label>
              <Input value={formData.contract_link} onChange={e => setFormData({ ...formData, contract_link: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white" placeholder="https://..." />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Diretório de Documentos</Label>
            <Input value={formData.documents_folder_link} onChange={e => setFormData({ ...formData, documents_folder_link: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white" placeholder="https://drive.google.com/..." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Início Sustentação</Label>
              <Input type="date" value={formData.sustentacao_start_date} onChange={e => setFormData({ ...formData, sustentacao_start_date: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white" />
            </div>
            <div className="space-y-2">
              <Label>Última Reunião</Label>
              <Input type="date" value={formData.last_meeting_date} onChange={e => setFormData({ ...formData, last_meeting_date: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white" />
            </div>
            <div className="space-y-2">
              <Label>Próxima Reunião</Label>
              <Input type="date" value={formData.next_meeting_date} onChange={e => setFormData({ ...formData, next_meeting_date: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Input value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white" />
          </div>

          {/* ── Status Executivo ── */}
          <label className="flex items-start gap-3 rounded-lg border border-slate-600 bg-slate-900/40 p-3 cursor-pointer hover:bg-slate-900/60 transition-colors">
            <input
              type="checkbox"
              checked={formData.show_in_executive_status}
              onChange={e => setFormData({ ...formData, show_in_executive_status: e.target.checked })}
              className="w-4 h-4 mt-0.5 rounded accent-blue-600"
            />
            <div>
              <p className="text-sm font-medium text-white">Levar para o Status Executivo</p>
              <p className="text-xs text-slate-400">Por padrão, projetos de sustentação não aparecem no Status Executivo. Marque para exibir o card deste projeto lá.</p>
            </div>
          </label>

          {/* ── Entidades ── */}
          <div className="rounded-lg border border-slate-600 bg-slate-900/40 p-3 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
              <Building2 className="w-4 h-4 text-blue-400" /> Entidades da Prestação de Contas
            </div>
            {orderedEntities.length > 0 && (
              <div className="space-y-1.5">
                {orderedEntities.map(entity => (
                  <div key={entity.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-700/50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{entity.nome}</p>
                      {entity.nome_completo && <p className="text-xs text-slate-400 truncate">{entity.nome_completo}</p>}
                    </div>
                    <button type="button" onClick={() => handleDeleteEntity(entity.id)}
                      className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Sigla (ex: PM)"
                value={newEntity.nome}
                onChange={e => setNewEntity({ ...newEntity, nome: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white text-sm h-8 w-24"
              />
              <Input
                placeholder="Nome completo (opcional)"
                value={newEntity.nome_completo}
                onChange={e => setNewEntity({ ...newEntity, nome_completo: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white text-sm h-8 flex-1"
              />
              <Button type="button" size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 px-2"
                onClick={handleAddEntity} disabled={!newEntity.nome.trim() || savingEntity}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}