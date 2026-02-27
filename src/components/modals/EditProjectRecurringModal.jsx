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

export default function EditProjectRecurringModal({ open, onOpenChange, project, onSave }) {
  const [recurringValue, setRecurringValue] = useState('');

  useEffect(() => {
    if (project) {
      setRecurringValue((project.contract_recurring_value || 0).toString());
    }
  }, [project, open]);

  const handleSave = () => {
    const value = parseFloat(recurringValue) || 0;
    onSave(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Editar Recorrente do Contrato</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="recurring" className="text-slate-300">
              Valor Recorrente (R$)
            </Label>
            <Input
              id="recurring"
              type="number"
              step="0.01"
              min="0"
              value={recurringValue}
              onChange={(e) => setRecurringValue(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="0,00"
            />
            <p className="text-xs text-slate-400">
              {recurringValue && parseFloat(recurringValue) > 0 
                ? `Valor: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(recurringValue))}`
                : 'Deixe em branco ou zero para não exibir'}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}