import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function RecognizedRevenueModal({ 
  isOpen, 
  onClose, 
  onSave,
  project,
  products = []
}) {
  const [formData, setFormData] = useState({
    amount: '',
    recognition_month: '',
    product_id: ''
  });

  const handleSave = () => {
    if (!formData.amount || !formData.recognition_month || !formData.product_id) {
      return;
    }
    
    onSave({
      ...formData,
      project_id: project.id,
      amount: parseFloat(formData.amount)
    });
    
    setFormData({ amount: '', recognition_month: '', product_id: '' });
  };

  // Agrupar produtos por vertical
  const productsByVertical = products.reduce((acc, product) => {
    const vertical = product.vertical || 'outros';
    if (!acc[vertical]) acc[vertical] = [];
    acc[vertical].push(product);
    return acc;
  }, {});

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>Registrar Valor Reconhecido</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Valor Reconhecido</Label>
            <Input
              type="number"
              placeholder="R$ 0,00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="bg-slate-700 border-slate-600"
            />
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
            <Label>Produto Reconhecido</Label>
            <Select
              value={formData.product_id}
              onValueChange={(value) => setFormData({ ...formData, product_id: value })}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600">
                <SelectValue placeholder="Selecione um produto" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {Object.entries(productsByVertical).map(([vertical, verticalProducts]) => (
                  <React.Fragment key={vertical}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-cyan-400 uppercase">
                      {verticalLabels[vertical] || vertical}
                    </div>
                    {verticalProducts.map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </React.Fragment>
                ))}
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
            disabled={!formData.amount || !formData.recognition_month || !formData.product_id}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}