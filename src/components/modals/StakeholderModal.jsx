import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function StakeholderModal({ open, onOpenChange, stakeholder, onSave, projectId }) {
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    vertical: 'outros',
    email: '',
    phone: '',
    communication_level: 'medio',
    communication_routine: ''
  });

  useEffect(() => {
    if (stakeholder) {
      setFormData({
        name: stakeholder.name || '',
        role: stakeholder.role || '',
        vertical: stakeholder.vertical || 'outros',
        email: stakeholder.email || '',
        phone: stakeholder.phone || '',
        communication_level: stakeholder.communication_level || 'medio',
        communication_routine: stakeholder.communication_routine || ''
      });
    } else {
      setFormData({
        name: '',
        role: '',
        vertical: 'outros',
        email: '',
        phone: '',
        communication_level: 'medio',
        communication_routine: ''
      });
    }
  }, [stakeholder, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      project_id: projectId
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            {stakeholder ? 'Editar Stakeholder' : 'Adicionar Stakeholder'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Atuação/Papel</Label>
            <Input
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="Ex: Secretário de Finanças"
            />
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
          <div className="space-y-2">
            <Label>Vertical</Label>
            <Select value={formData.vertical} onValueChange={(value) => setFormData({ ...formData, vertical: value })}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="gerenciamento">Gerenciamento</SelectItem>
                <SelectItem value="arrecadacao">Arrecadação</SelectItem>
                <SelectItem value="compras">Contratos</SelectItem>
                <SelectItem value="contabil">Contábil</SelectItem>
                <SelectItem value="pessoal">Pessoal</SelectItem>
                <SelectItem value="educacao">Educação</SelectItem>
                <SelectItem value="iss">ISS</SelectItem>
                <SelectItem value="parceiros">Parceiros</SelectItem>
                <SelectItem value="plataforma">Plataforma</SelectItem>
                <SelectItem value="saude">Saúde</SelectItem>
                <SelectItem value="atendimento">Atendimento</SelectItem>
                <SelectItem value="extensoes">Extensões</SelectItem>
                <SelectItem value="gestao_projetos">Gestão de Projetos</SelectItem>
                <SelectItem value="gestao_operacoes">Gestão de Operações</SelectItem>
                <SelectItem value="coordenacao_tecnica">Coordenação Técnica</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nível de Comunicação</Label>
            <Select value={formData.communication_level} onValueChange={(value) => setFormData({ ...formData, communication_level: value })}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="alto">Alto</SelectItem>
                <SelectItem value="medio">Médio</SelectItem>
                <SelectItem value="baixo">Baixo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="routine">Rotina de Comunicação</Label>
            <Textarea
              id="routine"
              value={formData.communication_routine}
              onChange={(e) => setFormData({ ...formData, communication_routine: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white h-20"
              placeholder="Ex: Reuniões semanais às segundas"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              {stakeholder ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}