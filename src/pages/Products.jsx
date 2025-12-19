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
  Trash2
} from 'lucide-react';
import { cn } from "@/lib/utils";
import ProductModal from '../components/modals/ProductModal';
import EmptyState from '../components/ui/EmptyState';
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
  atendimento: 'Atendimento'
};

const verticalColors = {
  arrecadacao: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  compras: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  contabil: 'bg-green-500/20 text-green-400 border-green-500/30',
  pessoal: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  educacao: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  iss: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  parceiros: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  plataforma: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  atendimento: 'bg-teal-500/20 text-teal-400 border-teal-500/30'
};

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

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const activeProject = projects[0];

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setModalOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setModalOpen(false);
      setSelectedProduct(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteDialogOpen(false);
      setProductToDelete(null);
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

  let filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (activeTab !== 'all') {
    filteredProducts = filteredProducts.filter(p => p.vertical === activeTab);
  }

  // Get unique verticals and organize by vertical
  const usedVerticals = [...new Set(products.map(p => p.vertical).filter(Boolean))].sort();
  const productsByVertical = {};
  usedVerticals.forEach(v => {
    productsByVertical[v] = filteredProducts.filter(p => p.vertical === v);
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
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          placeholder="Buscar produto..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
        />
      </div>

      {/* Products Table by Vertical */}
      {filteredProducts.length > 0 ? (
        <div className="overflow-x-auto -mx-6 lg:-mx-8 px-6 lg:px-8">
          <div className="inline-flex gap-4 pb-4 min-w-full">
            {usedVerticals.map((vertical) => {
              const verticalProducts = productsByVertical[vertical];
              if (verticalProducts.length === 0) return null;
              
              return (
                <div key={vertical} className="flex-shrink-0 w-72">
                  <div className={cn(
                    "rounded-t-lg px-4 py-3 border-t border-x",
                    verticalColors[vertical]
                  )}>
                    <h3 className="font-semibold text-sm">{verticalLabels[vertical]}</h3>
                    <p className="text-xs opacity-75 mt-0.5">{verticalProducts.length} produtos</p>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700 rounded-b-lg p-3 space-y-2 min-h-[200px]">
                    {verticalProducts.map((product) => (
                      <Card key={product.id} className="bg-slate-800 border-slate-700 hover:bg-slate-750 transition-all group">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className={cn("w-2 h-2 rounded-full mt-1", statusColors[product.status])} />
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-slate-400 hover:text-white hover:bg-slate-600"
                                onClick={() => handleEdit(product)}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                onClick={() => handleDelete(product)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <h4 className="font-semibold text-white text-sm mb-2">{product.name}</h4>
                          {product.entity && (
                            <p className="text-xs text-slate-400 mb-1">
                              <span className="text-slate-500">Entidade:</span> {product.entity}
                            </p>
                          )}
                          {product.ticket_number && (
                            <p className="text-xs text-slate-400">
                              <span className="text-slate-500">Chamado:</span> {product.ticket_number}
                            </p>
                          )}
                          <Badge variant="secondary" className="bg-slate-700/50 text-slate-300 text-xs mt-2">
                            {statusLabels[product.status]}
                          </Badge>
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
    </div>
  );
}