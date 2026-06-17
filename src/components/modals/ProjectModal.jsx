import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ProjectModal({ open, onOpenChange, project, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    manager: '',
    implementation_value: '',
    recurring_value: '',
    deadline: '',
    contract_number: '',
    contract_link: '',
    documents_folder_link: '',
    status: 'planejamento',
    hide_from_executive_status: false
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        city: project.city || '',
        manager: project.manager || '',
        implementation_value: project.implementation_value || '',
        recurring_value: project.recurring_value || '',
        deadline: project.deadline || '',
        contract_number: project.contract_number || '',
        contract_link: project.contract_link || '',
        documents_folder_link: project.documents_folder_link || '',
        status: project.status || 'planejamento',
        hide_from_executive_status: project.hide_from_executive_status || false
      });
    } else {
      setFormData({
        name: '',
        city: '',
        manager: '',
        implementation_value: '',
        recurring_value: '',
        deadline: '',
        contract_number: '',
        contract_link: '',
        documents_folder_link: '',
        status: 'planejamento',
        hide_from_executive_status: false
      });
    }
  }, [project, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      implementation_value: parseFloat(formData.implementation_value) || 0,
      recurring_value: parseFloat(formData.recurring_value) || 0,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            {project ? 'Editar Projeto' : 'Novo Projeto'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Projeto</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="Nome do projeto"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="Ex: Ibirité/MG"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manager">Gerente do Projeto</Label>
            <Input
              id="manager"
              value={formData.manager}
              onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="Nome do gerente"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="implementation_value">Valor de Implantação (R$)</Label>
              <Input
                id="implementation_value"
                type="number"
                step="0.01"
                value={formData.implementation_value}
                onChange={(e) => setFormData({ ...formData, implementation_value: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recurring_value">Valor de Inclusão/Recorrente (R$)</Label>
              <Input
                id="recurring_value"
                type="number"
                step="0.01"
                value={formData.recurring_value}
                onChange={(e) => setFormData({ ...formData, recurring_value: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadline">Prazo Final</Label>
            <Input
              id="deadline"
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="planejamento">Planejamento</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="pausado">Pausado</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contract_number">Número do Contrato *</Label>
              <Input
                id="contract_number"
                value={formData.contract_number}
                onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Ex: 2025/001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract_link">Link do Contrato</Label>
              <Input
                id="contract_link"
                value={formData.contract_link}
                onChange={(e) => setFormData({ ...formData, contract_link: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="documents_folder_link">Diretório Geral de Documentos</Label>
            <Input
              id="documents_folder_link"
              value={formData.documents_folder_link}
              onChange={(e) => setFormData({ ...formData, documents_folder_link: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="https://drive.google.com/..."
            />
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-slate-600 bg-slate-900/40 p-3">
            <input
              id="hide_from_executive_status"
              type="checkbox"
              checked={formData.hide_from_executive_status}
              onChange={(e) => setFormData({ ...formData, hide_from_executive_status: e.target.checked })}
              className="mt-0.5 w-4 h-4 rounded cursor-pointer accent-blue-600"
            />
            <div className="flex-1">
              <Label htmlFor="hide_from_executive_status" className="cursor-pointer text-slate-200">
                Ocultar do Status Executivo
              </Label>
              <p className="text-xs text-slate-400 mt-0.5">
                Quando marcado, este projeto não será exibido nem terá seus dados contabilizados nos painéis do Status Executivo do portfólio.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              {project ? 'Salvar' : 'Criar Projeto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}