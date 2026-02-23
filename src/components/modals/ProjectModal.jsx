import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ProjectModal({ open, onOpenChange, project, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    manager: '',
    value: '',
    deadline: '',
    contract_link: '',
    documents_folder_link: '',
    status: 'planejamento'
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        manager: project.manager || '',
        value: project.value || '',
        deadline: project.deadline || '',
        contract_link: project.contract_link || '',
        documents_folder_link: project.documents_folder_link || '',
        status: project.status || 'planejamento'
      });
    } else {
      setFormData({
        name: '',
        manager: '',
        value: '',
        deadline: '',
        contract_link: '',
        documents_folder_link: '',
        status: 'planejamento'
      });
    }
  }, [project, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      value: parseFloat(formData.value) || 0
    });
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
              <Label htmlFor="value">Valor (R$)</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="0.00"
              />
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