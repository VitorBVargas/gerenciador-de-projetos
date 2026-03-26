import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  { value: 'outros', label: 'Outros' }
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
        entity: member.entity || '',
        ticket_number: member.ticket_number || '',
        email: member.email || '',
        phone: member.phone || ''
      });
    } else {
      setFormData({
        name: '',
        vertical: '',
        role: '',
        entity: '',
        ticket_number: '',
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
            <div className="relative">
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
                {verticals.map((v) => (
                  <option key={v.value} value={v.label} />
                ))}
              </datalist>
            </div>
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
              <Label htmlFor="entity">Entidade</Label>
              <Input
                id="entity"
                value={formData.entity}
                onChange={(e) => setFormData({ ...formData, entity: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Ex: CM, IPASI, PM"
              />
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