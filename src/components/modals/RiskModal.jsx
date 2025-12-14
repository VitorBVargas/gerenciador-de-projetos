import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function RiskModal({ open, onOpenChange, risk, onSave, projectId }) {
  const [formData, setFormData] = useState({
    title: '',
    category: 'tecnico',
    probability: 'media',
    impact: 'medio',
    mitigation: '',
    status: 'identificado'
  });

  useEffect(() => {
    if (risk) {
      setFormData({
        title: risk.title || '',
        category: risk.category || 'tecnico',
        probability: risk.probability || 'media',
        impact: risk.impact || 'medio',
        mitigation: risk.mitigation || '',
        status: risk.status || 'identificado'
      });
    } else {
      setFormData({
        title: '',
        category: 'tecnico',
        probability: 'media',
        impact: 'medio',
        mitigation: '',
        status: 'identificado'
      });
    }
  }, [risk, open]);

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
            {risk ? 'Editar Risco' : 'Novo Risco'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Descrição do Risco</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
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
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="identificado">Identificado</SelectItem>
                  <SelectItem value="em_monitoramento">Em Monitoramento</SelectItem>
                  <SelectItem value="mitigado">Mitigado</SelectItem>
                  <SelectItem value="ocorreu">Ocorreu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Probabilidade</Label>
              <Select value={formData.probability} onValueChange={(value) => setFormData({ ...formData, probability: value })}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
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
              <Label>Impacto</Label>
              <Select value={formData.impact} onValueChange={(value) => setFormData({ ...formData, impact: value })}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
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
            <Label htmlFor="mitigation">Plano de Mitigação</Label>
            <Textarea
              id="mitigation"
              value={formData.mitigation}
              onChange={(e) => setFormData({ ...formData, mitigation: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white h-24"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              {risk ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}