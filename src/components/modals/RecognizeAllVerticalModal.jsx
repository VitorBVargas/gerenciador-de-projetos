import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function RecognizeAllVerticalModal({ 
  isOpen, 
  onClose, 
  onSave,
  project,
  vertical,
  products = []
}) {
  const [formData, setFormData] = useState({
    amount: '',
    recognition_month: '',
    type: 'implantacao'
  });

  const verticalLabels = {
    arrecadacao: 'Arrecadação',
    compras: 'Compras/Contratos',
    contabil: 'Contábil',
    pessoal: 'Pessoal',
    educacao: 'Educação',
    iss: 'ISS',
    parceiros: 'Parceiros',
    plataforma: 'Plataforma',
    atendimento: 'Atendimento',
    outros: 'Outros'
  };

  const handleSave = () => {
    if (!formData.amount || !formData.recognition_month || !formData.type) {
      return;
    }
    
    const amountPerProduct = parseFloat(formData.amount) / products.length;
    
    const recognitions = products.map(product => ({
      project_id: project.id,
      product_id: product.id,
      amount: amountPerProduct,
      recognition_month: formData.recognition_month,
      type: formData.type
    }));
    
    onSave(recognitions);
    setFormData({ amount: '', recognition_month: '', type: 'implantacao' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>Reconhecer Todos - {verticalLabels[vertical] || vertical}</DialogTitle>
          <p className="text-sm text-slate-400">{products.length} produtos serão reconhecidos</p>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Valor Total Reconhecido</Label>
            <Input
              type="number"
              placeholder="R$ 0,00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="bg-slate-700 border-slate-600"
            />
            {formData.amount && products.length > 0 && (
              <p className="text-xs text-slate-400">
                {new Intl.NumberFormat('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL' 
                }).format(parseFloat(formData.amount) / products.length)} por produto
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Mês do Reconhecimento</Label>
            <Input
              type="month"
              value={formData.recognition_month}
              onChange={(e) => setFormData({ ...formData, recognition_month: e.target.value + '-01' })}
              className="bg-slate-700 border-slate-600"
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de Receita</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="implantacao">Implantação</SelectItem>
                <SelectItem value="recorrente">Recorrente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-slate-600">
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!formData.amount || !formData.recognition_month || !formData.type}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Reconhecer Todos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}