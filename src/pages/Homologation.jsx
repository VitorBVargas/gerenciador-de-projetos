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
import { Plus, CheckCircle, Trash2, ChevronUp, ChevronDown, RotateCcw, Upload, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import EmptyState from '../components/ui/EmptyState';
import { getDefaultTasksForProduct, productHasHomologation } from '../components/homologation/homologationTasks';

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

export default function Homologation() {
  const queryClient = useQueryClient();
  const [selectedVertical, setSelectedVertical] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [sectionOrder, setSectionOrder] = useState({});
  const [isResetting, setIsResetting] = useState(false);
  const fileInputRef = React.useRef(null);

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

  const createDefaultTasks = async (product) => {
    const existingTasks = tasks.filter(t => t.product_id === product.id);
    if (existingTasks.length > 0) return;

    const defaultSections = getDefaultTasksForProduct(product.name);
    if (!defaultSections) return;

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

  const tasksInitializedRef = React.useRef(new Set());

  React.useEffect(() => {
    if (selectedProduct && products.length > 0 && tasks.length >= 0) {
      const product = getCurrentProduct();
      if (product && !tasksInitializedRef.current.has(product.id)) {
        const existingTasks = tasks.filter(t => t.product_id === product.id);
        if (existingTasks.length === 0) {
          tasksInitializedRef.current.add(product.id);
          createDefaultTasks(product);
        }
      }
    }
  }, [selectedProduct, products.length, tasks.length]);

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
      data: { completed: !task.completed }
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

  const productsByVertical = products.reduce((acc, product) => {
    if (productHasHomologation(product.name)) {
      const vertical = product.vertical || 'outros';
      if (!acc[vertical]) acc[vertical] = [];
      acc[vertical].push(product);
    }
    return acc;
  }, {});

  const verticals = Object.keys(productsByVertical).sort();

  React.useEffect(() => {
    if (verticals.length > 0 && !selectedVertical) {
      const firstVertical = verticals[0];
      setSelectedVertical(firstVertical);
      if (productsByVertical[firstVertical]?.length > 0) {
        setSelectedProduct(productsByVertical[firstVertical][0].id);
      }
    }
  }, [verticals.length, products.length]);

  React.useEffect(() => {
    if (selectedVertical && productsByVertical[selectedVertical]?.length > 0) {
      setSelectedProduct(productsByVertical[selectedVertical][0].id);
    }
  }, [selectedVertical]);

  const productsWithHomologation = products.filter(p => productHasHomologation(p.name));
  const overallProgress = productsWithHomologation.length > 0
    ? Math.round(productsWithHomologation.reduce((sum, p) => sum + getProductProgress(p.id), 0) / productsWithHomologation.length)
    : 0;

  const getCurrentProduct = () => products.find(p => p.id === selectedProduct);

  const moveSectionUp = (productId, sectionIndex) => {
    if (sectionIndex === 0) return;
    setSectionOrder(prev => {
      const key = productId;
      const currentOrder = prev[key] || getDefaultTasksForProduct(getCurrentProduct()?.name)?.map((_, i) => i) || [];
      const newOrder = [...currentOrder];
      [newOrder[sectionIndex - 1], newOrder[sectionIndex]] = [newOrder[sectionIndex], newOrder[sectionIndex - 1]];
      return { ...prev, [key]: newOrder };
    });
  };

  const moveSectionDown = (productId, sectionIndex, totalSections) => {
    if (sectionIndex >= totalSections - 1) return;
    setSectionOrder(prev => {
      const key = productId;
      const currentOrder = prev[key] || getDefaultTasksForProduct(getCurrentProduct()?.name)?.map((_, i) => i) || [];
      const newOrder = [...currentOrder];
      [newOrder[sectionIndex], newOrder[sectionIndex + 1]] = [newOrder[sectionIndex + 1], newOrder[sectionIndex]];
      return { ...prev, [key]: newOrder };
    });
  };

  const getOrderedSections = (productId, sections) => {
    const key = productId;
    const order = sectionOrder[key] || sections?.map((_, i) => i) || [];
    return order.map(i => sections[i]).filter(Boolean);
  };

  const handleResetTasks = async () => {
    if (!selectedProduct) return;
    setIsResetting(true);
    try {
      const product = getCurrentProduct();
      const existingTasks = tasks.filter(t => t.product_id === product.id);
      
      // Deleta todas as tarefas existentes em paralelo
      await Promise.all(existingTasks.map(task => 
        base44.entities.HomologationTask.delete(task.id)
      ));
      
      // Aguarda um pouco para garantir que as deleções foram processadas
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Recria as tarefas padrão
      await createDefaultTasks(product);
      
      toast.success('Tarefas zeradas e recriadas com sucesso!');
    } catch (error) {
      toast.error('Erro ao zerar tarefas');
      console.error(error);
    } finally {
      setIsResetting(false);
      queryClient.invalidateQueries({ queryKey: ['homologationTasks', projectId] });
    }
  };

  const handleImportTasks = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedProduct) return;

    try {
      const product = getCurrentProduct();
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Deleta todas as tarefas existentes
      const existingTasks = tasks.filter(t => t.product_id === product.id);
      for (const task of existingTasks) {
        await base44.entities.HomologationTask.delete(task.id);
      }

      // Cria novas tarefas do Excel com suporte a Etapa/Sprint + Tarefa
      const tasksToCreate = jsonData.map((row, index) => {
        const etapa = row.Etapa || row.etapa || row['Nome da Etapa'] || row['nome da etapa'] || '';
        const tarefa = row.Tarefa || row.tarefa || row['Nome da Tarefa'] || row['nome da tarefa'] || '';
        
        // Se tiver etapa, usa formato "||ETAPA||Tarefa", senão só o nome da tarefa
        const title = etapa.trim() ? `||${etapa.trim()}||${tarefa.trim()}` : tarefa.trim();
        
        return {
          title: title,
          project_id: projectId,
          product_id: product.id,
          completed: false,
          order: index
        };
      }).filter(t => t.title.trim() && t.title !== '||||');

      if (tasksToCreate.length > 0) {
        await base44.entities.HomologationTask.bulkCreate(tasksToCreate);
        toast.success(`${tasksToCreate.length} tarefas importadas com sucesso!`);
        queryClient.invalidateQueries({ queryKey: ['homologationTasks', projectId] });
      }
    } catch (error) {
      toast.error('Erro ao importar tarefas. Verifique o formato do arquivo.');
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Homologação</h1>
          <p className="text-slate-400 mt-1">Acompanhe o progresso de homologação por produto</p>
        </div>
        {productsWithHomologation.length > 0 && (
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
              <Tabs value={selectedProduct} onValueChange={setSelectedProduct}>
                <TabsList className="bg-slate-800/50 border border-slate-700/50">
                  {productsByVertical[vertical]?.map(product => {
                    const progress = getProductProgress(product.id);
                    const capitalizedName = product.name
                      .split(' ')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                      .join(' ');
                    return (
                      <TabsTrigger 
                        key={product.id} 
                        value={product.id}
                        className="data-[state=active]:bg-blue-600 flex items-center gap-2"
                      >
                        {capitalizedName}
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
                          <CardTitle className="text-xl text-white">
                            {product.name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                          </CardTitle>
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
                        <div className="space-y-4 mb-6">
                          <div className="flex gap-2">
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
                          
                          <div className="flex gap-2 flex-wrap">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" className="flex-1 min-w-[180px] border-orange-500/30 text-orange-400 hover:bg-orange-500/10">
                                  <RotateCcw className="w-4 h-4 mr-2" />
                                  Zerar Tarefas
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-slate-800 border-slate-700">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-white">Zerar todas as tarefas?</AlertDialogTitle>
                                  <AlertDialogDescription className="text-slate-400">
                                    Isso irá deletar todas as tarefas atuais deste produto (incluindo duplicatas) e recriar as tarefas padrão. Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-slate-700 text-white border-slate-600">Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleResetTasks} className="bg-orange-600 hover:bg-orange-700" disabled={isResetting}>
                                    {isResetting ? 'Processando...' : 'Zerar'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>

                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".xlsx,.xls"
                              onChange={handleImportTasks}
                              className="hidden"
                            />
                            <Button 
                              variant="outline" 
                              className="flex-1 min-w-[180px] border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Importar Excel
                            </Button>
                          </div>
                          
                          {(() => {
                            const productTasks = tasks.filter(t => t.product_id === product.id);
                            const uniqueTitles = new Set(productTasks.map(t => t.title.toLowerCase()));
                            const hasDuplicates = productTasks.length > uniqueTitles.size;
                            
                            if (hasDuplicates) {
                              return (
                                <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
                                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                  <span className="flex-1">Foram detectadas tarefas duplicadas neste produto ({productTasks.length - uniqueTitles.size} duplicatas). Use "Zerar Tarefas" para corrigir.</span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>

                        <div className="space-y-6">
                          {getOrderedSections(product.id, getDefaultTasksForProduct(product.name) || []).map((section, displayIndex) => {
                            const sectionTasks = getProductTasks(product.id).filter(task => 
                              section.tasks.some(t => t.toLowerCase() === task.title.toLowerCase())
                            );
                            
                            const totalSections = getDefaultTasksForProduct(product.name)?.length || 0;
                            
                            return (
                              <div key={displayIndex}>
                                <div className="flex items-center justify-between mb-3">
                                  <h3 className="text-cyan-400 font-semibold text-sm uppercase">
                                    {section.section}
                                  </h3>
                                  <div className="flex gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      disabled={displayIndex === 0}
                                      className="h-6 w-6 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-30"
                                      onClick={() => moveSectionUp(product.id, displayIndex)}
                                    >
                                      <ChevronUp className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      disabled={displayIndex >= totalSections - 1}
                                      className="h-6 w-6 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-30"
                                      onClick={() => moveSectionDown(product.id, displayIndex, totalSections)}
                                    >
                                      <ChevronDown className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  {sectionTasks.map(task => (
                                    <div key={task.id} className="flex items-center gap-3 group">
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
                                </div>
                              </div>
                            );
                          })}

                          {(() => {
                            const defaultSections = getDefaultTasksForProduct(product.name);
                            if (!defaultSections) return null;

                            const allSectionTasks = defaultSections.flatMap(s => s.tasks.map(t => t.toLowerCase()));
                            const customTasks = getProductTasks(product.id).filter(task =>
                              !allSectionTasks.includes(task.title.toLowerCase())
                            );
                            
                            if (customTasks.length > 0) {
                              return (
                                <div>
                                  <h3 className="text-cyan-400 font-semibold text-sm mb-3 uppercase">
                                    TAREFAS PERSONALIZADAS
                                  </h3>
                                  <div className="space-y-2">
                                    {customTasks.map(task => (
                                      <div key={task.id} className="flex items-center gap-3 group">
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
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {getProductTasks(product.id).length === 0 && (
                            <p className="text-center text-slate-500 py-4 text-sm">
                              Carregando tarefas padrão...
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
          icon={CheckCircle}
          title="Nenhum produto cadastrado"
          description="Adicione produtos para começar a criar checklists de homologação"
        />
      )}
    </div>
  );
}