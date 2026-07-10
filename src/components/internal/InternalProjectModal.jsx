import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INTERNAL_TYPE_OPTIONS } from './internalProjectTypes';

const defaultForm = {
  name: '',
  project_type: 'implantacao',
  manager: '',
  description: '',
  deadline: '',
  budget: '',
  status: 'planejamento',
};

export default function InternalProjectModal({ open, onOpenChange, onSave, project = null }) {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const isEditing = !!project;

  useEffect(() => {
    if (open) {
      if (project) {
        setForm({
          name: project.name || '',
          project_type: project.project_type || 'implantacao',
          manager: project.manager || '',
          description: project.description || '',
          deadline: project.deadline || '',
          budget: project.budget != null ? String(project.budget) : '',
          status: project.status || 'planejamento',
        });
      } else {
        setForm(defaultForm);
      }
    }
  }, [open, project]);

  const handleClose = () => {
    setForm(defaultForm);
    onOpenChange(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      ...form,
      budget: form.budget ? parseFloat(form.budget) : undefined,
    });
    setSaving(false);
    if (!isEditing) setForm(defaultForm);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white text-xl font-bold">
            {isEditing ? 'Editar Projeto Interno' : 'Novo Projeto Interno'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Projeto *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="Ex: Implantação do novo ERP"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de Projeto *</Label>
            <Select value={form.project_type} onValueChange={(v) => setForm({ ...form, project_type: v })}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {INTERNAL_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Responsável</Label>
            <Input
              value={form.manager}
              onChange={(e) => setForm({ ...form, manager: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="Nome do responsável"
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white h-20 resize-none"
              placeholder="Objetivo do projeto"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prazo Final</Label>
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label>Orçamento (R$)</Label>
              <Input
                type="number"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
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

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Projeto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}