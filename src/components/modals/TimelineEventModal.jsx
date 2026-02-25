import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

const phases = [
  { value: 'planejamento', label: 'Planejamento e Monitoramento' },
  { value: 'kickoff', label: 'Kick-off' },
  { value: 'diagnostico', label: 'Diagnóstico Técnico' },
  { value: 'migracao_hml', label: 'Migração de HML' },
  { value: 'configuracao_hml', label: 'Configuração de HML' },
  { value: 'homologacao_hml', label: 'Homologação de HML' },
  { value: 'migracao_producao', label: 'Migração de Produção' },
  { value: 'treinamento', label: 'Treinamento' },
  { value: 'configuracao_producao', label: 'Configuração em Produção' },
  { value: 'estabilizacao', label: 'Estabilização' },
  { value: 'operacao_assistida', label: 'Operação Assistida' }
];

export default function TimelineEventModal({ open, onOpenChange, event, onSave, projectId, productId }) {
  const [formData, setFormData] = useState({
    title: '',
    phase: 'planejamento',
    start_date: '',
    end_date: '',
    status: 'nao_iniciado',
    progress: 0,
    vertical: ''
  });

  const subtractOneDay = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || '',
        phase: event.phase || 'planejamento',
        start_date: subtractOneDay(event.start_date),
        end_date: subtractOneDay(event.end_date),
        status: event.status || 'nao_iniciado',
        progress: event.progress || 0,
        vertical: event.vertical || ''
      });
    } else {
      setFormData({
        title: '',
        phase: 'planejamento',
        start_date: '',
        end_date: '',
        status: 'nao_iniciado',
        progress: 0,
        vertical: ''
      });
    }
  }, [event, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      project_id: projectId,
      product_id: productId
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            {event ? 'Editar Etapa' : 'Nova Etapa do Cronograma'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Fase</Label>
            <Select value={formData.phase} onValueChange={(value) => setFormData({ ...formData, phase: value })}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {phases.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Data Início</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Data Fim</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="nao_iniciado">Não Iniciado</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="atrasado">Atrasado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Progresso: {formData.progress}%</Label>
            <Slider
              value={[formData.progress]}
              onValueChange={(value) => setFormData({ ...formData, progress: value[0] })}
              max={100}
              step={5}
              className="py-4"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              {event ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}