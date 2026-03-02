import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { phaseLabels } from '../timeline/phaseLabels';

const verticalLabels = {
  arrecadacao: 'Arrecadação', compras: 'Compras/Contratos', contabil: 'Contábil',
  pessoal: 'Pessoal', educacao: 'Educação', iss: 'ISS',
  parceiros: 'Parceiros', plataforma: 'Plataforma', atendimento: 'Atendimento',
  saude: 'Saúde', gerenciamento: 'Gerenciamento', outros: 'Outros',
};

// Build insertion position options: before each phase key
const phaseOrder = [
  'planejamento_contrato', 'kickoff', 'diagnostico', 'onboarding_cliente',
  'configuracao_migracao_hml', 'homologacao_base', 'migracao_prd_blackout',
  'configuracao_prd', 'treinamento', 'go_live', 'operacao_assistida', 'encerramento_bastao'
];

export default function AddTimelineStepModal({ open, onOpenChange, products, timelineEvents, onAdd }) {
  const [title, setTitle] = useState('');
  const [insertAfterPhase, setInsertAfterPhase] = useState('kickoff');
  const [applyTo, setApplyTo] = useState('all'); // 'all' | productId
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleClose = () => {
    setTitle('');
    setInsertAfterPhase('kickoff');
    setApplyTo('all');
    setStartDate('');
    setEndDate('');
    onOpenChange(false);
  };

  const handleSave = () => {
    if (!title.trim()) return;

    // Determine which products to apply to
    const targetProducts = applyTo === 'all' ? products : products.filter(p => p.id === applyTo);

    // For each product, calculate the order value (between insertAfterPhase and next phase)
    const newEvents = targetProducts.map(product => {
      const productEvents = timelineEvents
        .filter(e => e.product_id === product.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      // Find the event with phase = insertAfterPhase
      const afterEvent = productEvents.find(e => e.phase === insertAfterPhase);
      const afterOrder = afterEvent?.order ?? 0;

      // Find the next event after that
      const eventsAfter = productEvents.filter(e => (e.order || 0) > afterOrder).sort((a, b) => a.order - b.order);
      const nextOrder = eventsAfter[0]?.order ?? (afterOrder + 200);

      // Insert between
      const newOrder = (afterOrder + nextOrder) / 2;

      return {
        project_id: product.project_id,
        product_id: product.id,
        title: title.trim(),
        phase: null,
        vertical: product.vertical,
        start_date: startDate || null,
        end_date: endDate || null,
        status: 'nao_iniciado',
        progress: 0,
        order: newOrder,
      };
    });

    onAdd(newEvents);
    handleClose();
  };

  // Unique verticals/products for scope selector
  const productOptions = products.map(p => ({ id: p.id, label: `${p.name} (${verticalLabels[p.vertical] || p.vertical})` }));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Adicionar Etapa ao Cronograma</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1">
            <Label className="text-slate-300">Nome da Etapa *</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Reunião de alinhamento"
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          {/* Insert after which phase */}
          <div className="space-y-1">
            <Label className="text-slate-300">Inserir após a etapa</Label>
            <Select value={insertAfterPhase} onValueChange={setInsertAfterPhase}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {phaseOrder.map(phase => (
                  <SelectItem key={phase} value={phase} className="text-white hover:bg-slate-600">
                    {phaseLabels[phase]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Apply to */}
          <div className="space-y-1">
            <Label className="text-slate-300">Aplicar a</Label>
            <Select value={applyTo} onValueChange={setApplyTo}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="all" className="text-white hover:bg-slate-600 font-semibold">
                  Todos os cronogramas
                </SelectItem>
                {productOptions.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-white hover:bg-slate-600">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dates (optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-slate-300">Data Início (opcional)</Label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-300">Data Fim (opcional)</Label>
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={handleClose} className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()} className="flex-1 bg-blue-600 hover:bg-blue-700">
            Adicionar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}