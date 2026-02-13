import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export default function PasswordGracePeriodModal({ open, onOpenChange, onSave, isLoading }) {
  const [hasGracePeriod, setHasGracePeriod] = useState('no');
  const [gracePeriodDate, setGracePeriodDate] = useState('');

  const handleSave = () => {
    onSave({
      production_password: true,
      password_grace_period_until: hasGracePeriod === 'yes' ? gracePeriodDate : null
    });
    setHasGracePeriod('no');
    setGracePeriodDate('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Liberar Senha de Produção</DialogTitle>
          <DialogDescription className="text-slate-400">
            A senha será liberada imediatamente. Deseja estabelecer um período de carência?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <RadioGroup value={hasGracePeriod} onValueChange={setHasGracePeriod}>
            <div className="flex items-center gap-3">
              <RadioGroupItem value="no" id="no-grace" />
              <Label htmlFor="no-grace" className="text-white cursor-pointer">
                Sem carência
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <RadioGroupItem value="yes" id="yes-grace" />
              <Label htmlFor="yes-grace" className="text-white cursor-pointer">
                Com carência até uma data específica
              </Label>
            </div>
          </RadioGroup>

          {hasGracePeriod === 'yes' && (
            <div className="space-y-2">
              <Label htmlFor="grace-date" className="text-slate-300">
                Data da carência
              </Label>
              <Input
                id="grace-date"
                type="date"
                value={gracePeriodDate}
                onChange={(e) => setGracePeriodDate(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700"
            disabled={hasGracePeriod === 'yes' && !gracePeriodDate || isLoading}
          >
            {isLoading ? 'Salvando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}