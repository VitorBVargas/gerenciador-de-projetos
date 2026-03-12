import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const verticals = [
  { value: 'arrecadacao', label: 'Arrecadação' },
  { value: 'compras', label: 'Contratos' },
  { value: 'contabil', label: 'Contábil' },
  { value: 'pessoal', label: 'Pessoal' },
  { value: 'educacao', label: 'Educação' },
  { value: 'iss', label: 'ISS' },
  { value: 'parceiros', label: 'Parceiros' },
  { value: 'plataforma', label: 'Plataforma' }
];

export default function TeamMemberModal({ open, onOpenChange, member, onSave, projectId }) {
  const [formData, setFormData] = useState({
    name: '',
    vertical: '',
    role: '',
    entity: '',
    ticket_number: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name || '',
        vertical: member.vertical || '',
        role: member.role || '',
        email: member.email || '',
        phone: member.phone || ''
      });
    } else {
      setFormData({
        name: '',
        vertical: '',
        role: '',
        email: '',
        phone: ''
      });
    }
  }, [member, open]);

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
            {member ? 'Editar Membro' : 'Adicionar Membro'}
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
              placeholder="Nome completo"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vertical">Vertical</Label>
            <Select value={formData.vertical} onValueChange={(value) => setFormData({ ...formData, vertical: value })}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Selecione a vertical" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {verticals.map((v) => (
                  <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Responsabilidade</Label>
            <Input
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="Ex: Analista de Sistemas"
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