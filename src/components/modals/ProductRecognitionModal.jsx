import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles } from 'lucide-react';

export default function ProductRecognitionModal({ open, onOpenChange, product, projectId, onSave }) {
  const [month, setMonth] = useState('');
  const [type, setType] = useState('implantacao');

  const handleSave = () => {
    if (!month) return;
    onSave({
      project_id: projectId,
      product_id: product.id,
      amount: type === 'implantacao' ? (product.implementation_value || 0) : (product.inclusion_value || 0),
      recognition_month: month + '-01',
      type
    });
    setMonth('');
    setType('implantacao');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Reconhecimento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="bg-slate-700/50 rounded-lg p-3">
            <p className="text-sm font-medium text-white">{product?.name}</p>
            <div className="flex gap-3 mt-1 text-xs text-slate-400">
              {product?.implementation_value > 0 && (
                <span>Impl: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(product.implementation_value)}</span>
              )}
              {product?.inclusion_value > 0 && (
                <span>Incl: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(product.inclusion_value)}</span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Tipo de Receita</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="implantacao">Implantação</SelectItem>
                <SelectItem value="recorrente">Recorrente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Mês do Reconhecimento</Label>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white h-9"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!month}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Reconhecer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}