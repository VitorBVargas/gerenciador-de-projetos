import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  
  // State for filters
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [selectedVertical, setSelectedVertical] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Get all entities and verticals from products
  const allEntities = [...new Set(products.map(p => p.entity).filter(Boolean))].sort((a, b) => {
    if (a === 'PM') return -1;
    if (b === 'PM') return 1;
    return a.localeCompare(b);
  });

  // Filter products based on selected entity
  const productsForEntity = selectedEntity 
    ? products.filter(p => p.entity === selectedEntity)
    : products;

  // Get verticals for filtered products
  const verticals = [...new Set(productsForEntity.map(p => p.vertical || 'outros'))].sort();

  // Filter products by vertical
  const productsForVertical = selectedVertical
    ? productsForEntity.filter(p => (p.vertical || 'outros') === selectedVertical)
    : productsForEntity;

  // Fetch standard documents (fixed for all products)
  const { data: standardDocs = [] } = useQuery({
    queryKey: ['standardDocuments'],
    queryFn: () => base44.entities.StandardDocument.filter({ vertical: 'all' }),
  });

  // Fetch product document statuses
  const { data: docStatuses = [] } = useQuery({
    queryKey: ['productDocumentStatus', selectedProduct?.id],
    queryFn: () => base44.entities.ProductDocumentStatus.filter({ product_id: selectedProduct?.id }),
    enabled: !!selectedProduct?.id,
  });

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

  if (allEntities.length === 0 || products.length === 0) {
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
        {/* Filters */}
        <div className="space-y-3 pb-4 border-b border-slate-700">
          {/* Entity Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-300">Entidades:</span>
            <TooltipProvider>
              {allEntities.map(entity => {
                const fullName = products.find(p => p.entity === entity)?.entity_full_name;
                return (
                  <Tooltip key={entity}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          setSelectedEntity(entity === selectedEntity ? null : entity);
                          setSelectedVertical(null);
                          setSelectedProduct(null);
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded text-xs font-medium transition-all border",
                          selectedEntity === entity
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-700 text-slate-400 hover:text-white border-slate-600'
                        )}
                      >
                        {entity}
                      </button>
                    </TooltipTrigger>
                    {fullName && (
                      <TooltipContent>
                        <p>{fullName}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>

          {/* Vertical Filter */}
          {selectedEntity && verticals.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-300">Vertical:</span>
              {verticals.map(v => (
                <button
                  key={v}
                  onClick={() => {
                    setSelectedVertical(v === selectedVertical ? null : v);
                    setSelectedProduct(null);
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-medium transition-all border",
                    selectedVertical === v
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-700 text-slate-400 hover:text-white border-slate-600'
                  )}
                >
                  {verticalLabels[v] || v}
                </button>
              ))}
            </div>
          )}

          {/* Product Filter */}
          {selectedEntity && selectedVertical && productsForVertical.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-300">Produto:</span>
              {productsForVertical.map(product => (
                <button
                  key={product.id}
                  onClick={() => setSelectedProduct(product === selectedProduct ? null : product)}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-medium transition-all border",
                    selectedProduct?.id === product.id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-700 text-slate-400 hover:text-white border-slate-600'
                  )}
                >
                  {product.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Documents List */}
        {selectedProduct ? (
          <div className="space-y-2">
            {standardDocs.length === 0 ? (
              <p className="text-slate-500 text-sm py-8 text-center">Nenhum documento disponível</p>
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
        ) : (
          <p className="text-slate-500 text-sm py-8 text-center">Selecione um produto para visualizar documentos</p>
        )}

        {selectedProduct && (
          <p className="text-xs text-slate-500 text-center mt-4 border-t border-slate-700 pt-4">
            Marcando status para: <span className="font-semibold text-slate-400">{selectedProduct.name}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}