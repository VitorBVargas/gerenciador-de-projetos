import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const TIPO_OPTIONS = [
  { value: 'atendimento', label: 'Atendimento' },
  { value: 'reuniao', label: 'Reunião' },
  { value: 'treinamento', label: 'Treinamento' },
  { value: 'configuracao', label: 'Configuração' },
  { value: 'analise', label: 'Análise' },
  { value: 'documentacao', label: 'Documentação' },
  { value: 'suporte', label: 'Suporte' },
  { value: 'implantacao', label: 'Implantação' },
  { value: 'sustentacao', label: 'Sustentação' },
  { value: 'administrativo', label: 'Administrativo' },
];

export default function LancamentoModal({ open, onOpenChange, lancamento, onSave, teamMembers, activities, objectives, products }) {
  const [formData, setFormData] = useState({
    colaborador: '',
    data: new Date().toISOString().split('T')[0],
    hora_inicio: '09:00',
    hora_fim: '18:00',
    total_horas: 0,
    produto: '',
    objetivo: '',
    atividade_id: '',
    atividade_titulo: '',
    tipo: 'sustentacao',
    descricao: '',
    observacoes: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (lancamento) {
      setFormData({
        colaborador: lancamento.colaborador || '',
        data: lancamento.data || new Date().toISOString().split('T')[0],
        hora_inicio: lancamento.hora_inicio || '09:00',
        hora_fim: lancamento.hora_fim || '18:00',
        total_horas: lancamento.total_horas || 0,
        produto: lancamento.produto || '',
        objetivo: lancamento.objetivo || '',
        atividade_id: lancamento.atividade_id || '',
        atividade_titulo: lancamento.atividade_titulo || '',
        tipo: lancamento.tipo || 'sustentacao',
        descricao: lancamento.descricao || '',
        observacoes: lancamento.observacoes || '',
      });
    } else {
      setFormData(prev => ({
        ...prev,
        data: new Date().toISOString().split('T')[0],
      }));
    }
  }, [lancamento, open]);

  useEffect(() => {
    const start = formData.hora_inicio.split(':').map(Number);
    const end = formData.hora_fim.split(':').map(Number);
    const startMin = start[0] * 60 + start[1];
    const endMin = end[0] * 60 + end[1];
    const diff = endMin - startMin;
    const hours = diff > 0 ? diff / 60 : 0;
    setFormData(prev => ({ ...prev, total_horas: parseFloat(hours.toFixed(2)) }));
  }, [formData.hora_inicio, formData.hora_fim]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const reference_month = formData.data ? formData.data.slice(0, 7) : new Date().toISOString().slice(0, 7);
      await onSave({
        ...formData,
        reference_month,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedActivity = activities.find(a => a.id === formData.atividade_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">
            {lancamento ? 'Editar Lançamento' : 'Novo Lançamento de Horas'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Colaborador */}
          <div>
            <Label className="text-slate-300">Colaborador</Label>
            <Select value={formData.colaborador} onValueChange={v => setFormData(prev => ({ ...prev, colaborador: v }))}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {teamMembers.map(m => (
                  <SelectItem key={m.id} value={m.name} className="text-white">{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data */}
          <div>
            <Label className="text-slate-300">Data</Label>
            <Input
              type="date"
              value={formData.data}
              onChange={e => setFormData(prev => ({ ...prev, data: e.target.value }))}
              className="bg-slate-800 border-slate-600 text-white"
            />
          </div>

          {/* Hora início/fim */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Hora Início</Label>
              <Input
                type="time"
                value={formData.hora_inicio}
                onChange={e => setFormData(prev => ({ ...prev, hora_inicio: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Hora Fim</Label>
              <Input
                type="time"
                value={formData.hora_fim}
                onChange={e => setFormData(prev => ({ ...prev, hora_fim: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
          </div>

          {/* Total horas */}
          <div>
            <Label className="text-slate-300">Total de Horas</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.total_horas}
              onChange={e => setFormData(prev => ({ ...prev, total_horas: parseFloat(e.target.value) || 0 }))}
              className="bg-slate-800 border-slate-600 text-white"
            />
          </div>

          {/* Produto */}
          <div>
            <Label className="text-slate-300">Produto</Label>
            <Select value={formData.produto} onValueChange={v => setFormData(prev => ({ ...prev, produto: v }))}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value={null} className="text-white">Nenhum</SelectItem>
                {products.map(p => (
                  <SelectItem key={p.id} value={p.name} className="text-white">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Objetivo */}
          <div>
            <Label className="text-slate-300">Objetivo (Roadmap)</Label>
            <Select value={formData.objetivo} onValueChange={v => setFormData(prev => ({ ...prev, objetivo: v }))}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value={null} className="text-white">Nenhum</SelectItem>
                {objectives.map(o => (
                  <SelectItem key={o.id} value={o.titulo} className="text-white">{o.titulo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Atividade */}
          <div>
            <Label className="text-slate-300">Atividade</Label>
            <Select 
              value={formData.atividade_id} 
              onValueChange={v => {
                const act = activities.find(a => a.id === v);
                setFormData(prev => ({ 
                  ...prev, 
                  atividade_id: v,
                  atividade_titulo: act?.title || ''
                }));
              }}
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value={null} className="text-white">Nenhuma</SelectItem>
                {activities.map(a => (
                  <SelectItem key={a.id} value={a.id} className="text-white">{a.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedActivity && (
              <p className="text-xs text-slate-500 mt-1">
                Status: {selectedActivity.status} | Responsável: {selectedActivity.assignee || '—'}
              </p>
            )}
          </div>

          {/* Tipo */}
          <div>
            <Label className="text-slate-300">Tipo</Label>
            <Select value={formData.tipo} onValueChange={v => setFormData(prev => ({ ...prev, tipo: v }))}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {TIPO_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-white">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Descrição */}
          <div>
            <Label className="text-slate-300">Descrição</Label>
            <Textarea
              value={formData.descricao}
              onChange={e => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Descreva o trabalho realizado..."
              className="bg-slate-800 border-slate-600 text-white min-h-[80px]"
            />
          </div>

          {/* Observações */}
          <div>
            <Label className="text-slate-300">Observações</Label>
            <Textarea
              value={formData.observacoes}
              onChange={e => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Observações adicionais..."
              className="bg-slate-800 border-slate-600 text-white min-h-[60px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}