import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Plus, 
  ArrowLeftRight,
  Package,
  Trash2
} from 'lucide-react';
import { cn } from "@/lib/utils";
import EmptyState from '../components/ui/EmptyState';

const verticalLabels = {
  arrecadacao: 'Arrecadação',
  compras: 'Compras/Contratos',
  contabil: 'Contábil',
  pessoal: 'Pessoal',
  educacao: 'Educação',
  iss: 'ISS',
  parceiros: 'Parceiros',
  plataforma: 'Plataforma'
};

export default function Migration() {
  const queryClient = useQueryClient();
  const [selectedVertical, setSelectedVertical] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');

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

  const { data: tasks = [] } = useQuery({
    queryKey: ['migrationTasks', projectId],
    queryFn: () => projectId ? base44.entities.MigrationTask.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const activeProject = projects.find(p => p.id === projectId);

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.MigrationTask.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['migrationTasks'] });
      setNewTaskTitle('');
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MigrationTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['migrationTasks'] });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.MigrationTask.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['migrationTasks'] });
    }
  });

  const handleAddTask = () => {
    if (!newTaskTitle.trim() || !selectedProduct) return;
    createTaskMutation.mutate({
      title: newTaskTitle,
      project_id: activeProject?.id,
      product_id: selectedProduct,
      completed: false
    });
  };

  const handleToggleTask = (task) => {
    updateTaskMutation.mutate({
      id: task.id,
      data: { ...task, completed: !task.completed }
    });
  };

  const getProductTasks = (productId) => {
    return tasks.filter(t => t.product_id === productId);
  };

  const getProductProgress = (productId) => {
    const productTasks = getProductTasks(productId);
    if (productTasks.length === 0) return 0;
    const completed = productTasks.filter(t => t.completed).length;
    return Math.round((completed / productTasks.length) * 100);
  };

  // Group products by vertical
  const productsByVertical = products.reduce((acc, product) => {
    const vertical = product.vertical || 'outros';
    if (!acc[vertical]) acc[vertical] = [];
    acc[vertical].push(product);
    return acc;
  }, {});

  const verticals = Object.keys(productsByVertical).sort();

  // Set initial vertical and product
  React.useEffect(() => {
    if (verticals.length > 0 && !selectedVertical) {
      setSelectedVertical(verticals[0]);
    }
    if (selectedVertical && productsByVertical[selectedVertical]?.length > 0 && !selectedProduct) {
      setSelectedProduct(productsByVertical[selectedVertical][0].id);
    }
  }, [verticals.length, selectedVertical, productsByVertical]);

  // Overall migration progress
  const overallProgress = products.length > 0
    ? Math.round(products.reduce((sum, p) => sum + getProductProgress(p.id), 0) / products.length)
    : 0;

  const getCurrentProduct = () => products.find(p => p.id === selectedProduct);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Migração</h1>
          <p className="text-slate-400 mt-1">Acompanhe o progresso de migração por produto</p>
        </div>
        {products.length > 0 && (
          <div className="flex items-center gap-4 bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <div className="text-sm text-slate-400">Progresso Geral</div>
            <div className="w-32">
              <Progress value={overallProgress} className="h-2" />
            </div>
            <div className="text-lg font-bold text-white">{overallProgress}%</div>
          </div>
        )}
      </div>

      {products.length > 0 ? (
        <Tabs value={selectedVertical} onValueChange={setSelectedVertical} className="space-y-4">
          {/* Vertical Tabs */}
          <TabsList className="bg-slate-800 border border-slate-700">
            {verticals.map(vertical => (
              <TabsTrigger 
                key={vertical} 
                value={vertical} 
                className="data-[state=active]:bg-blue-600"
              >
                {verticalLabels[vertical] || vertical}
              </TabsTrigger>
            ))}
          </TabsList>

          {verticals.map(vertical => (
            <TabsContent key={vertical} value={vertical} className="space-y-4">
              {/* Product Tabs */}
              <Tabs value={selectedProduct} onValueChange={setSelectedProduct}>
                <TabsList className="bg-slate-800/50 border border-slate-700/50">
                  {productsByVertical[vertical]?.map(product => {
                    const progress = getProductProgress(product.id);
                    return (
                      <TabsTrigger 
                        key={product.id} 
                        value={product.id}
                        className="data-[state=active]:bg-blue-600 flex items-center gap-2"
                      >
                        {product.name}
                        <span className="text-xs">({progress}%)</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {productsByVertical[vertical]?.map(product => (
                  <TabsContent key={product.id} value={product.id}>
                    <Card className="bg-slate-800/50 border-slate-700/50">
                      <CardHeader className="border-b border-slate-700/50">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xl text-white">{product.name}</CardTitle>
                          <Badge className={cn(
                            "border",
                            getProductProgress(product.id) === 100 
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : "bg-orange-500/20 text-orange-400 border-orange-500/30"
                          )}>
                            {getProductProgress(product.id)}% Concluído
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        {/* Action Buttons */}
                        <div className="flex gap-2 mb-6">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                          >
                            Marcar/Desmarcar Todos
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar Tarefa
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                          >
                            Gerar Termo de Conversão de Dados
                          </Button>
                        </div>

                        {/* Section Title */}
                        <h3 className="text-cyan-400 font-semibold text-sm mb-4 uppercase">
                          MIGRAÇÃO: TABELAS AUXILIARES E GERAIS
                        </h3>

                        {/* Add Task Input */}
                        <div className="flex gap-2 mb-4">
                          <Input
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Nova tarefa de migração..."
                            className="bg-slate-700 border-slate-600 text-white"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                          />
                          <Button onClick={handleAddTask} className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Tasks List */}
                        <div className="space-y-2">
                          {getProductTasks(product.id).map(task => (
                            <div
                              key={task.id}
                              className="flex items-center gap-3 group"
                            >
                              <Checkbox
                                checked={task.completed}
                                onCheckedChange={() => handleToggleTask(task)}
                                className="border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                              />
                              <span className={cn(
                                "flex-1 text-sm",
                                task.completed ? "text-slate-500 line-through" : "text-white"
                              )}>
                                {task.title}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => deleteTaskMutation.mutate(task.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                          {getProductTasks(product.id).length === 0 && (
                            <p className="text-center text-slate-500 py-4 text-sm">
                              Nenhuma tarefa cadastrada. Adicione tarefas de migração acima.
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <EmptyState
          icon={ArrowLeftRight}
          title="Nenhum produto cadastrado"
          description="Adicione produtos para começar a criar checklists de migração"
        />
      )}
    </div>
  );
}