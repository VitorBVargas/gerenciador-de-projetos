import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

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
  saude: 'Saúde',
  gerenciamento: 'Gerenciamento',
  outros: 'Outros',
};

export default function KeyDocuments({ projectId, project, products = [] }) {
  const queryClient = useQueryClient();
  
  // Group products by vertical
  const productsByVertical = {};
  products.forEach(p => {
    const v = p.vertical || 'outros';
    if (!productsByVertical[v]) productsByVertical[v] = [];
    productsByVertical[v].push(p);
  });
  
  const verticals = Object.keys(productsByVertical).sort();
  const [activeVertical, setActiveVertical] = useState(verticals[0] || '');
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Fetch standard documents for active vertical
  const { data: standardDocs = [] } = useQuery({
    queryKey: ['standardDocuments', activeVertical],
    queryFn: () => base44.entities.StandardDocument.filter({ vertical: activeVertical }),
    enabled: !!activeVertical,
  });

  // Fetch product document statuses
  const { data: docStatuses = [] } = useQuery({
    queryKey: ['productDocumentStatus', selectedProduct?.id],
    queryFn: () => base44.entities.ProductDocumentStatus.filter({ product_id: selectedProduct?.id }),
    enabled: !!selectedProduct?.id,
  });

  const verticalProducts = productsByVertical[activeVertical] || [];
  const entitiesInVertical = [...new Set(verticalProducts.map(p => p.entity).filter(Boolean))].sort((a, b) => {
    if (a === 'PM') return -1;
    if (b === 'PM') return 1;
    return a.localeCompare(b);
  });

  // Filter products by entity if a specific product is selected
  const currentProduct = selectedProduct;

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProductDocumentStatus.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productDocumentStatus'] });
    },
  });

  const createStatusMutation = useMutation({
    mutationFn: (data) => base44.entities.ProductDocumentStatus.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productDocumentStatus'] });
    },
  });

  const handleStatusChange = (docId, field, value) => {
    if (!currentProduct) return;

    const existing = docStatuses.find(s => s.document_id === docId);
    
    if (existing) {
      updateStatusMutation.mutate({
        id: existing.id,
        data: { [field]: value }
      });
    } else {
      createStatusMutation.mutate({
        product_id: currentProduct.id,
        document_id: docId,
        [field]: value
      });
    }
  };

  if (verticals.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="py-12 text-center">
          <p className="text-slate-500">Nenhum produto cadastrado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-white">Controle de Documentos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeVertical} onValueChange={(v) => {
          setActiveVertical(v);
          setSelectedProduct(null);
        }}>
          <TabsList className="bg-slate-700 border border-slate-600 flex-wrap h-auto p-1 gap-1">
            {verticals.map(v => (
              <TabsTrigger 
                key={v} 
                value={v} 
                className="data-[state=active]:bg-blue-600 text-xs"
              >
                {verticalLabels[v] || v}
              </TabsTrigger>
            ))}
          </TabsList>

          {verticals.map(vertical => (
            <TabsContent key={vertical} value={vertical} className="space-y-4 mt-4">
              {/* Product Filter */}
              {entitiesInVertical.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-400">Produto:</span>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
                      !selectedProduct
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-700 text-slate-400 hover:text-white border-slate-600'
                    )}
                  >
                    Todos
                  </button>
                  {verticalProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
                        selectedProduct?.id === product.id
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-700 text-slate-400 hover:text-white border-slate-600'
                      )}
                    >
                      {product.name} ({product.entity})
                    </button>
                  ))}
                </div>
              )}

              {/* Documents List */}
              <div className="space-y-2">
                {standardDocs.length === 0 ? (
                  <p className="text-slate-500 text-sm py-8 text-center">Nenhum documento padrão para esta vertical</p>
                ) : (
                  standardDocs.map(doc => {
                    const status = docStatuses.find(s => s.document_id === doc.id);
                    return (
                      <div key={doc.id} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-700">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{doc.name}</p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={status?.sent || false}
                              onCheckedChange={(checked) => handleStatusChange(doc.id, 'sent', checked)}
                              disabled={!currentProduct}
                              className={cn(
                                "border-slate-500",
                                !currentProduct && "opacity-50 cursor-not-allowed"
                              )}
                            />
                            <span className="text-xs text-slate-400">Enviado</span>
                          </label>
                          
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={status?.signed || false}
                              onCheckedChange={(checked) => handleStatusChange(doc.id, 'signed', checked)}
                              disabled={!currentProduct}
                              className={cn(
                                "border-slate-500",
                                !currentProduct && "opacity-50 cursor-not-allowed"
                              )}
                            />
                            <span className="text-xs text-slate-400">Assinado</span>
                          </label>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {currentProduct && (
                <p className="text-xs text-slate-500 text-center mt-4">
                  Marcando status para: <span className="font-semibold text-slate-400">{currentProduct.name}</span>
                </p>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}