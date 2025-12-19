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
  CheckCircle,
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

export default function Homologation() {
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState(null);
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
    queryKey: ['homologationTasks', projectId],
    queryFn: () => projectId ? base44.entities.HomologationTask.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const activeProject = projects.find(p => p.id === projectId);

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.HomologationTask.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homologationTasks', projectId] });
      setNewTaskTitle('');
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HomologationTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homologationTasks', projectId] });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.HomologationTask.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homologationTasks', projectId] });
    }
  });

  // Cria tarefas padrão para um produto se não existirem
  const createDefaultTasks = async (product) => {
    const existingTasks = tasks.filter(t => t.product_id === product.id);
    if (existingTasks.length > 0) return;

    const defaultSections = getDefaultTasksForProduct(product.name);
    if (!defaultSections) return; // Produto não tem homologação

    const tasksToCreate = [];
    let order = 0;

    for (const section of defaultSections) {
      for (const taskTitle of section.tasks) {
        tasksToCreate.push({
          title: taskTitle,
          project_id: projectId,
          product_id: product.id,
          completed: false,
          order: order++
        });
      }
    }

    if (tasksToCreate.length > 0) {
      await base44.entities.HomologationTask.bulkCreate(tasksToCreate);
      queryClient.invalidateQueries({ queryKey: ['homologationTasks', projectId] });
    }
  };

  // Criar tarefas padrão quando o produto for selecionado
  React.useEffect(() => {
    if (selectedProduct && getCurrentProduct()) {
      createDefaultTasks(getCurrentProduct());
    }
  }, [selectedProduct]);

  const handleAddTask = () => {
    if (!newTaskTitle.trim() || !selectedProduct) return;
    createTaskMutation.mutate({
      title: newTaskTitle,
      project_id: activeProject?.id,
      product_id: selectedProduct.id,
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

  const verticals = Object.keys(productsByVertical);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Homologação</h1>
        <p className="text-slate-400 mt-1">Acompanhe o checklist de homologação por produto</p>
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products List */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-white">Produtos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                {verticals.map(vertical => (
                  <div key={vertical} className="mb-4">
                    <p className="text-xs font-medium text-slate-500 uppercase mb-2">
                      {verticalLabels[vertical] || vertical}
                    </p>
                    {productsByVertical[vertical].map(product => {
                      const progress = getProductProgress(product.id);
                      const isSelected = selectedProduct?.id === product.id;
                      return (
                        <button
                          key={product.id}
                          onClick={() => setSelectedProduct(product)}
                          className={cn(
                            "w-full text-left p-3 rounded-lg mb-2 transition-all",
                            isSelected 
                              ? "bg-blue-600/20 border border-blue-500/50" 
                              : "bg-slate-700/30 hover:bg-slate-700/50 border border-transparent"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-white text-sm">{product.name}</span>
                            <span className="text-xs text-slate-400">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-1" />
                        </button>
                      );
                    })}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Checklist */}
          <div className="lg:col-span-2">
            {selectedProduct ? (
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader className="border-b border-slate-700/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl text-white">{selectedProduct.name}</CardTitle>
                      <p className="text-sm text-slate-400 mt-1">
                        {getProductTasks(selectedProduct.id).filter(t => t.completed).length} de {getProductTasks(selectedProduct.id).length} tarefas concluídas
                      </p>
                    </div>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 border">
                      {getProductProgress(selectedProduct.id)}% Concluído
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Add Task */}
                  <div className="flex gap-2 mb-6">
                    <Input
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Nova tarefa de homologação..."
                      className="bg-slate-700 border-slate-600 text-white"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                    />
                    <Button onClick={handleAddTask} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Tasks List */}
                  <div className="space-y-2">
                    {getProductTasks(selectedProduct.id).map(task => (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg transition-all group",
                          task.completed ? "bg-green-500/10" : "bg-slate-700/30 hover:bg-slate-700/50"
                        )}
                      >
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => handleToggleTask(task)}
                          className="border-slate-500 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
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
                          className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteTaskMutation.mutate(task.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    {getProductTasks(selectedProduct.id).length === 0 && (
                      <p className="text-center text-slate-500 py-8">
                        Nenhuma tarefa cadastrada. Adicione tarefas de homologação.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardContent className="py-12">
                  <EmptyState
                    icon={Package}
                    title="Selecione um produto"
                    description="Escolha um produto na lista para gerenciar o checklist de homologação"
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={CheckCircle}
          title="Nenhum produto cadastrado"
          description="Adicione produtos para começar a criar checklists de homologação"
        />
      )}
    </div>
  );
}