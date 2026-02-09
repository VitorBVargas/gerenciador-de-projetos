import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2 } from 'lucide-react';

export default function RecognizedRevenueModal({ 
  isOpen, 
  onClose, 
  onSave,
  onRecognizeAll,
  project,
  products = []
}) {
  const [formData, setFormData] = useState({
    amount: '',
    recognition_month: '',
    product_id: '',
    type: 'implantacao'
  });
  
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [selectedVertical, setSelectedVertical] = useState(null);

  const handleSave = () => {
    if (!formData.amount || !formData.recognition_month || !formData.type) {
      return;
    }
    
    if (isAllSelected && selectedVertical) {
      // Reconhecer todos os produtos da vertical
      const verticalProducts = productsByVertical[selectedVertical];
      onRecognizeAll(selectedVertical, verticalProducts, {
        amount: parseFloat(formData.amount),
        recognition_month: formData.recognition_month,
        type: formData.type
      });
    } else if (formData.product_id) {
      // Reconhecer produto individual
      onSave({
        ...formData,
        project_id: project.id,
        amount: parseFloat(formData.amount)
      });
    }
    
    setFormData({ amount: '', recognition_month: '', product_id: '', type: 'implantacao' });
    setIsAllSelected(false);
    setSelectedVertical(null);
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
            <Label>Produto Reconhecido</Label>
            <Select
              value={isAllSelected ? `all_${selectedVertical}` : formData.product_id}
              onValueChange={(value) => {
                if (value.startsWith('all_')) {
                  const vertical = value.replace('all_', '');
                  setIsAllSelected(true);
                  setSelectedVertical(vertical);
                  setFormData({ ...formData, product_id: '' });
                } else {
                  setIsAllSelected(false);
                  setSelectedVertical(null);
                  setFormData({ ...formData, product_id: value });
                }
              }}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600">
                <SelectValue placeholder="Selecione um produto" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {Object.entries(productsByVertical).map(([vertical, verticalProducts]) => (
                  <React.Fragment key={vertical}>
                    <div className="px-2 py-1.5 flex items-center justify-between group">
                      <span className="text-xs font-semibold text-cyan-400 uppercase">
                        {verticalLabels[vertical] || vertical}
                      </span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsAllSelected(true);
                          setSelectedVertical(vertical);
                          setFormData({ ...formData, product_id: '' });
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Todos
                      </button>
                    </div>
                    <SelectItem value={`all_${vertical}`} className="font-semibold text-blue-400">
                      {verticalLabels[vertical]} - Todos
                    </SelectItem>
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

          <div className="space-y-2">
            <Label>Valor Reconhecido {isAllSelected && '(Total)'}</Label>
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
              value={formData.recognition_month ? formData.recognition_month.substring(0, 7) : ''}
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
            disabled={!formData.amount || !formData.recognition_month || (!formData.product_id && !isAllSelected) || !formData.type}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}