import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Check } from 'lucide-react';

const verticals = [
  { value: 'arrecadacao', label: 'Arrecadação' },
  { value: 'compras', label: 'Compras/Contratos' },
  { value: 'contabil', label: 'Contábil' },
  { value: 'pessoal', label: 'Pessoal' },
  { value: 'educacao', label: 'Educação' },
  { value: 'iss', label: 'ISS' },
  { value: 'parceiros', label: 'Parceiros' },
  { value: 'plataforma', label: 'Plataforma' },
  { value: 'atendimento', label: 'Atendimento' }
];

export default function ProductModal({ open, onOpenChange, product, onSave, projectId }) {
  const [formData, setFormData] = useState({
    name: '',
    vertical: '',
    entity: '',
    ticket_number: '',
    priority: 'media',
    production_password: false,
    implementation_value: 0,
    inclusion_value: 0
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        vertical: product.vertical || '',
        entity: product.entity || '',
        ticket_number: product.ticket_number || '',
        priority: product.priority || 'media',
        production_password: product.production_password || false,
        implementation_value: product.implementation_value || 0,
        inclusion_value: product.inclusion_value || 0
      });
    } else {
      setFormData({
        name: '',
        vertical: '',
        entity: '',
        ticket_number: '',
        priority: 'media',
        production_password: false,
        implementation_value: 0,
        inclusion_value: 0
      });
    }
  }, [product, open]);

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
            {product ? 'Editar Produto' : 'Adicionar Produto'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Produto</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Vertical</Label>
            <Select value={formData.vertical} onValueChange={(value) => setFormData({ ...formData, vertical: value })}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {verticals.map((v) => (
                  <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="entity">Entidade</Label>
            <Input
              id="entity"
              placeholder="Ex: CM, IPASI"
              value={formData.entity}
              onChange={(e) => setFormData({ ...formData, entity: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket">Chamado</Label>
            <Input
              id="ticket"
              placeholder="Ex: BTHSC-244286"
              value={formData.ticket_number}
              onChange={(e) => setFormData({ ...formData, ticket_number: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Senha PRD</Label>
              <div 
                onClick={() => setFormData({ ...formData, production_password: !formData.production_password })}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all cursor-pointer ${
                  formData.production_password 
                    ? 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30' 
                    : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600'
                }`}
              >
                {formData.production_password && <Check className="w-4 h-4" />}
                <span className="text-sm font-medium">
                  {formData.production_password ? 'Senha Liberada' : 'Senha Pendente'}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              {product ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}