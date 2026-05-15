import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';
import { REASON_OPTIONS } from './baselineUtils';

export default function BaselineReasonModal({ open, onOpenChange, onConfirm, nextVersion, saving }) {
  const [reason, setReason] = useState('');
  const [observation, setObservation] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
      setObservation('');
    }
  }, [open]);

  const handleConfirm = () => {
    if (!reason) return;
    onConfirm({ reason, observation });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Nova revisão da Linha de Base (V{nextVersion})</DialogTitle>
          <DialogDescription className="text-slate-400">
            Informe o motivo da alteração para manter o histórico executivo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Motivo *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Selecione um motivo" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-white">
                {REASON_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Observação</Label>
            <Textarea
              value={observation}
              onChange={e => setObservation(e.target.value)}
              placeholder="Descreva o contexto da revisão..."
              className="bg-slate-800 border-slate-700 text-white h-24 resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800" disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!reason || saving} className="bg-indigo-600 hover:bg-indigo-700">
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
            Salvar revisão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}