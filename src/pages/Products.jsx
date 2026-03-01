import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Search, 
  Package,
  Pencil,
  Trash2,
  Check,
  Sparkles,
  X
} from 'lucide-react';
import { cn } from "@/lib/utils";
import ProductModal from '../components/modals/ProductModal';
import { VERTICAL_BADGE_COLORS } from '../components/verticalColors';
import EmptyState from '../components/ui/EmptyState';
import PasswordGracePeriodModal from '../components/modals/PasswordGracePeriodModal';
import EntityFilter from '../components/filters/EntityFilter';
import ProductRecognitionModal from '../components/modals/ProductRecognitionModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  saude: 'Saúde'
};

// imported from verticalColors

const statusColors = {
  pendente: 'bg-slate-500',
  em_homologacao: 'bg-yellow-500',
  homologado: 'bg-green-500',
  em_producao: 'bg-blue-500'
};

const statusLabels = {
  pendente: 'Pendente',
  em_homologacao: 'Em Homologação',
  homologado: 'Homologado',
  em_producao: 'Em Produção'
};

const priorityColors = {
  baixa: 'text-slate-400',
  media: 'text-blue-400',
  alta: 'text-orange-400',
  critica: 'text-red-400'
};

export default function Products() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [productForPassword, setProductForPassword] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState('PM');
  const [recognitionModalOpen, setRecognitionModalOpen] = useState(false);
  const [productForRecognition, setProductForRecognition] = useState(null);
  const [flagFilters, setFlagFilters] = useState([]);

  // Get project_id from URL
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products', projectId],
    queryFn: () => projectId ? base44.entities.Product.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const { data: recognizedRevenues = [] } = useQuery({
    queryKey: ['recognizedRevenues', projectId],
    queryFn: () => projectId ? base44.entities.RecognizedRevenue.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const createRecognitionMutation = useMutation({
    mutationFn: (data) => base44.entities.RecognizedRevenue.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recognizedRevenues', projectId] });
      queryClient.invalidateQueries({ queryKey: ['allRecognizedRevenues'] });
      setRecognitionModalOpen(false);
      setProductForRecognition(null);
    }
  });

  const deleteRecognitionMutation = useMutation({
    mutationFn: (recognitionId) => base44.entities.RecognizedRevenue.delete(recognitionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recognizedRevenues', projectId] });
      queryClient.invalidateQueries({ queryKey: ['allRecognizedRevenues'] });
    }
  });

  const activeProject = projects.find(p => p.id === projectId);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', projectId] });
      setModalOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', projectId] });
      setModalOpen(false);
      setSelectedProduct(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', projectId] });
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  });

  const togglePasswordMutation = useMutation({
    mutationFn: ({ id, value }) => base44.entities.Product.update(id, { production_password: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', projectId] });
    }
  });

  const toggleAcceptanceMutation = useMutation({
    mutationFn: ({ id, value }) => base44.entities.Product.update(id, { implementation_accepted: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', projectId] });
    }
  });

  const handleSave = (data) => {
    if (selectedProduct) {
      updateMutation.mutate({ id: selectedProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const handleDelete = (product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleTogglePassword = (product) => {
    if (!product.production_password) {
      // Se vai ativar, abre o modal
      setProductForPassword(product);
      setPasswordModalOpen(true);
    } else {
      // Se vai desativar, faz direto e limpa a carência
      updateMutation.mutate({ 
        id: product.id, 
        data: { production_password: false, password_grace_period_until: null }
      });
    }
  };

  const handlePasswordModalSave = (data) => {
    if (productForPassword) {
      updateMutation.mutate({ 
        id: productForPassword.id, 
        data
      });
      setPasswordModalOpen(false);
      setProductForPassword(null);
    }
  };

  const handleToggleAcceptance = (product) => {
    toggleAcceptanceMutation.mutate({ 
      id: product.id, 
      value: !product.implementation_accepted 
    });
  };

  const toggleFlagFilter = (flag) => {
    setFlagFilters(prev => prev.includes(flag) ? prev.filter(f => f !== flag) : [...prev, flag]);
  };

  let filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (activeTab !== 'all') {
    filteredProducts = filteredProducts.filter(p => p.vertical === activeTab);
  }

  // Flag filters
  if (flagFilters.length > 0) {
    filteredProducts = filteredProducts.filter(p => {
      return flagFilters.every(flag => {
        if (flag === 'aceite') return p.implementation_accepted;
        if (flag === 'reconhecimento') return recognizedRevenues.some(r => r.product_id === p.id);
        if (flag === 'senha') return p.production_password && !p.password_grace_period_until;
        if (flag === 'senha_carencia') return p.production_password && !!p.password_grace_period_until;
        return true;
      });
    });
  }

  // Unique entities for filter
  const entities = [...new Set(products.map(p => p.entity).filter(Boolean))].sort();
  const entityFilteredProducts = selectedEntity
    ? filteredProducts.filter(p => p.entity === selectedEntity)
    : filteredProducts;

  // Get unique verticals and organize by vertical
  const usedVerticals = [...new Set(products.map(p => p.vertical).filter(Boolean))].sort();
  const productsByVertical = {};
  usedVerticals.forEach(v => {
    productsByVertical[v] = entityFilteredProducts.filter(p => p.vertical === v);
  });

  return (
    <div className="min-h-screen bg-slate-900 p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Produtos</h1>
          <p className="text-slate-400 mt-1">{products.length} produtos cadastrados</p>
        </div>
        <Button 
          onClick={() => { setSelectedProduct(null); setModalOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Produto
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Buscar produto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 w-64"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: 'aceite', label: 'Aceite de Implantação', activeClass: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
              { key: 'reconhecimento', label: 'Reconhecimento', activeClass: 'bg-purple-500/20 text-purple-400 border-purple-500/40' },
              { key: 'senha', label: 'Senha Liberada', activeClass: 'bg-green-500/20 text-green-400 border-green-500/40' },
              { key: 'senha_carencia', label: 'Senha c/ Carência', activeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
            ].map(({ key, label, activeClass }) => (
              <button
                key={key}
                onClick={() => toggleFlagFilter(key)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  flagFilters.includes(key)
                    ? activeClass
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500"
                )}
              >
                {flagFilters.includes(key) && <span className="mr-1">✓</span>}
                {label}
              </button>
            ))}
            {flagFilters.length > 0 && (
              <button
                onClick={() => setFlagFilters([])}
                className="px-2 py-1 rounded text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
        <EntityFilter entities={entities} selectedEntity={selectedEntity} onEntityChange={setSelectedEntity} />
      </div>

      {/* Products Table by Vertical */}
      {entityFilteredProducts.length > 0 ? (
        <div className="overflow-x-auto -mx-6 lg:-mx-8 px-6 lg:px-8">
          <div className="inline-flex gap-4 pb-4 min-w-full">
            {usedVerticals.map((vertical) => {
              const verticalProducts = productsByVertical[vertical];
              if (verticalProducts.length === 0) return null;
              
              return (
                <div key={vertical} className="flex-shrink-0 w-56">
                  <div className={cn(
                    "rounded-t-lg px-2.5 py-1.5 border-t border-x",
                    VERTICAL_BADGE_COLORS[vertical] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                  )}>
                    <h3 className="font-semibold text-xs">{verticalLabels[vertical]}</h3>
                    <p className="text-xs opacity-75 mt-0.5">{verticalProducts.length} produtos</p>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700 rounded-b-lg p-1.5 space-y-1.5 min-h-[160px]">
                    {verticalProducts.map((product) => (
                      <Card key={product.id} className="bg-slate-800 border-slate-700 hover:bg-slate-750 transition-all group">
                        <CardContent className="p-2">
                          <div className="flex items-start justify-between mb-1.5">
                            <div className="flex items-center gap-1">
                              <div 
                                className={cn(
                                  "w-2 h-2 rounded-full transition-all",
                                  product.production_password 
                                    ? product.password_grace_period_until
                                      ? "bg-amber-500 shadow-lg shadow-amber-500/50 ring-2 ring-amber-500/30"
                                      : "bg-green-500 shadow-lg shadow-green-500/50 ring-2 ring-green-500/30" 
                                    : "bg-slate-600"
                                )}
                              />
                              <div 
                                className={cn(
                                  "w-2 h-2 rounded-full transition-all",
                                  product.implementation_accepted 
                                    ? "bg-orange-500 shadow-lg shadow-orange-500/50 ring-2 ring-orange-500/30" 
                                    : "bg-slate-600"
                                )}
                              />
                              {recognizedRevenues.some(r => r.product_id === product.id) && (
                                <div className="w-2 h-2 rounded-full bg-purple-500 shadow-lg shadow-purple-500/50 ring-2 ring-purple-500/30" />
                              )}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5 text-slate-400 hover:text-white hover:bg-slate-600"
                                onClick={() => handleEdit(product)}
                              >
                                <Pencil className="w-2.5 h-2.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                onClick={() => handleDelete(product)}
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </Button>
                            </div>
                          </div>
                          <h4 className="font-semibold text-white text-xs mb-1.5 line-clamp-2">{product.name}</h4>
                          {product.entity && (
                            <p className="text-[10px] text-slate-400 mb-1 truncate">
                              <span className="text-slate-500">Entidade:</span> {product.entity}
                            </p>
                          )}
                          {product.ticket_number && (
                             <p className="text-[10px] text-slate-400 truncate">
                               <span className="text-slate-500">Chamado:</span> {product.ticket_number}
                             </p>
                           )}
                           {(product.implementation_value > 0 || product.inclusion_value > 0) && (
                             <div className="text-[10px] text-slate-300 space-y-0.5 mt-1 pt-1 border-t border-slate-700">
                               {product.implementation_value > 0 && (
                                 <p><span className="text-slate-500">Impl:</span> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(product.implementation_value)}</p>
                               )}
                               {product.inclusion_value > 0 && (
                                 <p><span className="text-slate-500">Incl:</span> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(product.inclusion_value)}</p>
                               )}
                             </div>
                           )}
                           <div className="space-y-1 mt-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePassword(product);
                              }}
                              className={cn(
                                "w-full px-2 py-1 rounded text-[10px] font-medium transition-all flex items-center justify-center gap-1",
                                product.production_password
                                  ? product.password_grace_period_until
                                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
                                    : "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                                  : "bg-slate-700/50 text-slate-400 border border-slate-600/50 hover:bg-slate-600/50"
                              )}
                            >
                              {product.production_password && <Check className="w-3 h-3" />}
                              Senha Liberada
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleAcceptance(product);
                              }}
                              className={cn(
                                "w-full px-2 py-1 rounded text-[10px] font-medium transition-all flex items-center justify-center gap-1",
                                product.implementation_accepted
                                  ? "bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30"
                                  : "bg-slate-700/50 text-slate-400 border border-slate-600/50 hover:bg-slate-600/50"
                              )}
                            >
                              {product.implementation_accepted && <Check className="w-3 h-3" />}
                              Aceite de Implantação
                            </button>
                            <div className="space-y-1">
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setProductForRecognition(product);
                                 setRecognitionModalOpen(true);
                               }}
                               className={cn(
                                 "w-full px-2 py-1 rounded text-[10px] font-medium transition-all flex items-center justify-center gap-1",
                                 recognizedRevenues.some(r => r.product_id === product.id)
                                   ? "bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30"
                                   : "bg-slate-700/50 text-slate-400 border border-slate-600/50 hover:bg-slate-600/50"
                               )}
                             >
                               {recognizedRevenues.some(r => r.product_id === product.id) && <Check className="w-3 h-3" />}
                               Reconhecimento
                             </button>
                             {recognizedRevenues.some(r => r.product_id === product.id) && (
                               <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   const recognitions = recognizedRevenues.filter(r => r.product_id === product.id);
                                   recognitions.forEach(rec => deleteRecognitionMutation.mutate(rec.id));
                                 }}
                                 className="w-full px-2 py-1 rounded text-[10px] font-medium transition-all flex items-center justify-center gap-1 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                               >
                                 <X className="w-3 h-3" />
                                 Desreconhecer
                               </button>
                             )}
                            </div>
                            </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Package}
          title={searchQuery || activeTab !== 'all' ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
          description={searchQuery || activeTab !== 'all' ? "Tente outro filtro" : "Adicione os produtos contratados"}
          action={!searchQuery && activeTab === 'all' && (
            <Button onClick={() => setModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Produto
            </Button>
          )}
        />
      )}

      {/* Modal */}
      <ProductModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        product={selectedProduct}
        onSave={handleSave}
        projectId={activeProject?.id}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja excluir o produto "{productToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(productToDelete?.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Recognition Modal */}
      {productForRecognition && (
        <ProductRecognitionModal
          open={recognitionModalOpen}
          onOpenChange={setRecognitionModalOpen}
          product={productForRecognition}
          projectId={projectId}
          onSave={(data) => createRecognitionMutation.mutate(data)}
        />
      )}

      {/* Password Grace Period Modal */}
      <PasswordGracePeriodModal
        open={passwordModalOpen}
        onOpenChange={setPasswordModalOpen}
        onSave={handlePasswordModalSave}
        isLoading={togglePasswordMutation.isPending}
      />
    </div>
  );
}