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
  Trash2,
  ChevronUp,
  ChevronDown,
  CheckCircle,
  Upload,
  AlertTriangle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import EmptyState from '../components/ui/EmptyState';
import { getDefaultTasksForProduct, productHasMigration } from '../components/migration/migrationTasks';
import EntityFilter from '../components/filters/EntityFilter';

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

export default function Migration() {
  const queryClient = useQueryClient();
  const [selectedVertical, setSelectedVertical] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('PM');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [sectionOrder, setSectionOrder] = useState({});
  const fileInputRef = React.useRef(null);
  const creatingTasksRef = React.useRef(new Set());

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
      queryClient.invalidateQueries({ queryKey: ['migrationTasks', projectId] });
      setNewTaskTitle('');
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MigrationTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['migrationTasks', projectId] });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.MigrationTask.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['migrationTasks', projectId] });
    }
  });

  // Cria tarefas padrão para um produto se não existirem
  const createDefaultTasks = async (product) => {
    // Previne criação duplicada simultânea
    if (creatingTasksRef.current.has(product.id)) return;
    
    const existingTasks = tasks.filter(t => t.product_id === product.id);
    if (existingTasks.length > 0) return;

    const defaultSections = getDefaultTasksForProduct(product.name);
    if (!defaultSections) return; // Produto não tem migração

    creatingTasksRef.current.add(product.id);

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
      await base44.entities.MigrationTask.bulkCreate(tasksToCreate);
      queryClient.invalidateQueries({ queryKey: ['migrationTasks', projectId] });
    }
    
    creatingTasksRef.current.delete(product.id);
  };

  React.useEffect(() => {
    if (selectedProduct && products.length > 0 && tasks.length >= 0) {
      const product = getCurrentProduct();
      if (product) {
        const existingTasks = tasks.filter(t => t.product_id === product.id);
        if (existingTasks.length === 0 && productHasMigration(product.name)) {
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

  const allEntities = [...new Set(products.map(p => p.entity).filter(Boolean))].sort();
  const entityFilteredProducts = selectedEntity ? products.filter(p => p.entity === selectedEntity) : products;

  // Group products by vertical (apenas produtos com migração)
  const productsByVertical = entityFilteredProducts.reduce((acc, product) => {
    if (productHasMigration(product.name)) {
      const vertical = product.vertical || 'outros';
      if (!acc[vertical]) acc[vertical] = [];
      acc[vertical].push(product);
    }
    return acc;
  }, {});

  const verticals = Object.keys(productsByVertical).sort();

  // Set initial vertical and product
  React.useEffect(() => {
    if (verticals.length > 0 && !selectedVertical) {
      const firstVertical = verticals[0];
      setSelectedVertical(firstVertical);
      // Auto-seleciona o primeiro produto da vertical
      if (productsByVertical[firstVertical]?.length > 0) {
        setSelectedProduct(productsByVertical[firstVertical][0].id);
      }
    }
  }, [verticals.length, products.length]);

  // Auto-seleciona o primeiro produto quando mudar de vertical
  React.useEffect(() => {
    if (selectedVertical && productsByVertical[selectedVertical]?.length > 0) {
      setSelectedProduct(productsByVertical[selectedVertical][0].id);
    }
  }, [selectedVertical]);

  // Overall migration progress (apenas produtos com migração, filtrados por entidade)
  const productsWithMigration = entityFilteredProducts.filter(p => productHasMigration(p.name));
  const overallProgress = productsWithMigration.length > 0
    ? Math.round(productsWithMigration.reduce((sum, p) => sum + getProductProgress(p.id), 0) / productsWithMigration.length)
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

  const handleMarkAllTasks = async () => {
    if (!selectedProduct) return;
    try {
      const product = getCurrentProduct();
      const productTasks = tasks.filter(t => t.product_id === product.id);
      
      // Marca todas as tarefas como concluídas
      await Promise.all(productTasks.map(task => 
        base44.entities.MigrationTask.update(task.id, { completed: true })
      ));
      
      toast.success('Todas as tarefas foram marcadas como concluídas!');
      queryClient.invalidateQueries({ queryKey: ['migrationTasks', projectId] });
    } catch (error) {
      toast.error('Erro ao marcar tarefas');
      console.error(error);
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
      
      // Lê os dados como array de arrays para pegar coluna A e B
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Deleta todas as tarefas existentes (ignora erros se a tarefa já foi deletada)
      const existingTasks = tasks.filter(t => t.product_id === product.id);
      await Promise.all(existingTasks.map(task => 
        base44.entities.MigrationTask.delete(task.id).catch(() => {})
      ));

      // Processa a planilha: Coluna A = tipo (Etapa/Tarefa), Coluna B = nome
      const tasksToCreate = [];
      const seenTitles = new Set();
      let currentEtapa = '';
      let order = 0;
      
      for (const row of rawData) {
        const colA = (row[0] || '').toString().trim().toLowerCase();
        const colB = (row[1] || '').toString().trim();
        
        if (!colA || !colB) continue;
        
        // Se Coluna A = "Etapa", salva como etapa atual (seção azul)
        if (colA === 'etapa') {
          currentEtapa = colB;
        }
        // Se Coluna A = "Tarefa", cria a tarefa (branca) dentro da etapa atual
        else if (colA === 'tarefa') {
          const title = currentEtapa ? `||${currentEtapa}||${colB}` : colB;
          const titleLower = title.toLowerCase();
          
          // Evita adicionar tarefas duplicadas
          if (!seenTitles.has(titleLower)) {
            seenTitles.add(titleLower);
            tasksToCreate.push({
              title: title,
              project_id: projectId,
              product_id: product.id,
              completed: false,
              order: order++
            });
          }
        }
      }

      if (tasksToCreate.length > 0) {
        await base44.entities.MigrationTask.bulkCreate(tasksToCreate);
        toast.success(`${tasksToCreate.length} tarefas importadas com sucesso!`);
        queryClient.invalidateQueries({ queryKey: ['migrationTasks', projectId] });
      } else {
        toast.error('Nenhuma tarefa encontrada. Verifique se a planilha tem "Etapa" e "Tarefa" na Coluna A.');
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
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Migração</h1>
          <p className="text-slate-400 mt-1">Acompanhe o progresso de migração por produto</p>
        </div>
        {productsWithMigration.length > 0 && (
          <div className="flex items-center gap-4 bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <div className="text-sm text-slate-400">Progresso Geral</div>
            <div className="w-32">
              <Progress value={overallProgress} className="h-2" />
            </div>
            <div className="text-lg font-bold text-white">{overallProgress}%</div>
          </div>
        )}
      </div>

      {allEntities.length > 0 && (
        <EntityFilter entities={allEntities} selectedEntity={selectedEntity} onEntityChange={(e) => {
          setSelectedEntity(e);
          setSelectedVertical('');
          setSelectedProduct('');
        }} />
      )}

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
                    // Capitaliza primeira letra de cada palavra
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
                        {/* Add Task Input */}
                        <div className="space-y-4 mb-6">
                          <div className="flex gap-2">
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
                          
                          <div className="flex gap-2 flex-wrap">
                            <Button 
                              variant="outline" 
                              className="flex-1 min-w-[180px] border-green-500/30 text-green-400 hover:bg-green-500/10"
                              onClick={handleMarkAllTasks}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Marcar Todos
                            </Button>

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
                          

                        </div>

                        {/* Tasks List by Section */}
                        <div className="space-y-6">
                          {(() => {
                            const productTasks = getProductTasks(product.id);
                            const defaultSections = getDefaultTasksForProduct(product.name) || [];
                            
                            // Separar tarefas importadas (com ||) de tarefas padrão
                            const importedTasks = productTasks.filter(t => t.title.includes('||'));
                            const standardTasks = productTasks.filter(t => !t.title.includes('||'));
                            
                            // Agrupar tarefas importadas por etapa
                            const importedBySection = importedTasks.reduce((acc, task) => {
                              const match = task.title.match(/^\|\|(.+?)\|\|(.+)$/);
                              if (match) {
                                const [, sectionName, taskName] = match;
                                if (!acc[sectionName]) acc[sectionName] = [];
                                acc[sectionName].push({ ...task, displayTitle: taskName });
                              }
                              return acc;
                            }, {});
                            
                            const hasImportedTasks = Object.keys(importedBySection).length > 0;
                            const hasStandardSections = defaultSections.length > 0;
                            
                            return (
                              <>
                                {/* Renderizar seções importadas */}
                                {Object.entries(importedBySection).map(([sectionName, sectionTasks], idx) => {
                                  // Remover duplicados nas seções importadas
                                  const uniqueImportedTasks = [];
                                  const seenTitles = new Map();
                                  
                                  for (const task of sectionTasks) {
                                    const titleLower = task.displayTitle.toLowerCase();
                                    if (!seenTitles.has(titleLower)) {
                                      seenTitles.set(titleLower, task);
                                      uniqueImportedTasks.push(task);
                                    } else {
                                      const existing = seenTitles.get(titleLower);
                                      if (task.completed && !existing.completed) {
                                        const idx = uniqueImportedTasks.indexOf(existing);
                                        uniqueImportedTasks[idx] = task;
                                        seenTitles.set(titleLower, task);
                                      }
                                    }
                                  }
                                  
                                  return (
                                    <div key={`imported-${idx}`}>
                                      <div className="flex items-center justify-between mb-3 group/section">
                                        <h3 className="text-cyan-400 font-semibold text-sm uppercase">
                                          {sectionName}
                                        </h3>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/20 opacity-0 group-hover/section:opacity-100 transition-opacity"
                                          onClick={async () => {
                                            await Promise.all(sectionTasks.map(t => deleteTaskMutation.mutate(t.id)));
                                            toast.success(`Seção "${sectionName}" deletada`);
                                          }}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                      <div className="space-y-2">
                                        {uniqueImportedTasks.map(task => (
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
                                              {task.displayTitle}
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
                                
                                {/* Renderizar seções padrão */}
                                {hasStandardSections && getOrderedSections(product.id, defaultSections).map((section, displayIndex) => {
                                const sectionTasks = standardTasks.filter(task => 
                                  section.tasks.some(t => t.toLowerCase() === task.title.toLowerCase())
                                );

                                // Remover duplicados, mantendo o que está marcado
                                const uniqueTasks = [];
                                const seenTitles = new Map();

                                for (const task of sectionTasks) {
                                  const titleLower = task.title.toLowerCase();
                                  if (!seenTitles.has(titleLower)) {
                                    seenTitles.set(titleLower, task);
                                    uniqueTasks.push(task);
                                  } else {
                                    // Se já existe, mantém o marcado
                                    const existing = seenTitles.get(titleLower);
                                    if (task.completed && !existing.completed) {
                                      const idx = uniqueTasks.indexOf(existing);
                                      uniqueTasks[idx] = task;
                                      seenTitles.set(titleLower, task);
                                    }
                                  }
                                }

                                if (uniqueTasks.length === 0) return null;

                                 const totalSections = defaultSections.length;

                                 return (
                                   <div key={displayIndex}>
                                     <div className="flex items-center justify-between mb-3 group/section">
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
                                         <Button
                                           size="icon"
                                           variant="ghost"
                                           className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/20 opacity-0 group-hover/section:opacity-100 transition-opacity"
                                           onClick={async () => {
                                             await Promise.all(sectionTasks.map(t => deleteTaskMutation.mutate(t.id)));
                                             toast.success(`Seção "${section.section}" deletada`);
                                           }}
                                         >
                                           <Trash2 className="w-3 h-3" />
                                         </Button>
                                       </div>
                                     </div>
                                      <div className="space-y-2">
                                        {uniqueTasks.map(task => (
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
                                      </div>
                                    </div>
                                  );
                                })}
                              </>
                            );
                          })()}

                          {/* Custom tasks not in sections */}
                          {(() => {
                            const productTasks = getProductTasks(product.id);
                            const defaultSections = getDefaultTasksForProduct(product.name);
                            if (!defaultSections) return null;

                            const allSectionTasks = defaultSections
                              .flatMap(s => s.tasks.map(t => t.toLowerCase()));
                            const customTasks = productTasks.filter(task =>
                              !allSectionTasks.includes(task.title.toLowerCase()) && !task.title.includes('||')
                            );
                            
                            if (customTasks.length > 0) {
                              return (
                                <div>
                                  <h3 className="text-cyan-400 font-semibold text-sm mb-3 uppercase">
                                    TAREFAS PERSONALIZADAS
                                  </h3>
                                  <div className="space-y-2">
                                    {customTasks.map(task => (
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
          icon={ArrowLeftRight}
          title="Nenhum produto cadastrado"
          description="Adicione produtos para começar a criar checklists de migração"
        />
      )}
    </div>
  );
}