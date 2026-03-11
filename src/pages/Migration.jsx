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
  Trash2,
  ChevronUp,
  ChevronDown,
  Upload,
  Loader2
} from 'lucide-react';
import { getDefaultTasksForProduct } from '../components/migration/migrationTasks';
import * as XLSX from 'xlsx';
import ImportTasksModal from '../components/modals/ImportTasksModal';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import EmptyState from '../components/ui/EmptyState';

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
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [sectionOrder, setSectionOrder] = useState({});
  const [importedSectionOrder, setImportedSectionOrder] = useState({});
  const [addTaskSection, setAddTaskSection] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [markingProgress, setMarkingProgress] = useState({ isLoading: false, current: 0, total: 0 });
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



  const handleAddTask = () => {
    if (!newTaskTitle.trim() || !selectedProduct) return;
    const title = addTaskSection ? `||${addTaskSection}||${newTaskTitle.trim()}` : newTaskTitle.trim();
    createTaskMutation.mutate({
      title,
      project_id: activeProject?.id,
      product_id: selectedProduct,
      completed: false
    });
    setAddTaskSection('');
  };

  const handleToggleTask = (task) => {
    const newCompleted = !task.completed;
    updateTaskMutation.mutate({
      id: task.id,
      data: { 
        completed: newCompleted,
        completed_date: newCompleted ? new Date().toISOString() : null
      }
    });
  };

  const getCurrentProduct = () => products.find(p => p.id === selectedProduct);

  const getProductTasks = (productId) => {
    return tasks.filter(t => t.product_id === productId);
  };

  const getProductProgress = (productId) => {
    const productTasks = getProductTasks(productId);
    const product = products.find(p => p.id === productId);
    
    // Se houver tarefas no BD, usa essas
    if (productTasks.length > 0) {
      const completed = productTasks.filter(t => t.completed).length;
      return Math.round((completed / productTasks.length) * 100);
    }
    
    // Fallback: busca tarefas padrão do arquivo hardcoded
    const defaultSections = getDefaultTasksForProduct(product?.name) || [];
    const totalDefaultTasks = defaultSections.reduce((sum, s) => sum + s.tasks.length, 0);
    if (totalDefaultTasks === 0) return 0;
    
    return 0; // Se não há tarefas criadas ainda
  };

  const allEntities = [...new Set(products.map(p => p.entity).filter(Boolean))].sort();
  
  // Auto-select first entity
  React.useEffect(() => {
    if (allEntities.length > 0 && !selectedEntity) {
      const firstEntity = allEntities.find(e => e === 'PM') || allEntities[0];
      setSelectedEntity(firstEntity);
    }
  }, [allEntities.length, products.length]);
  
  const entityFilteredProducts = selectedEntity ? products.filter(p => p.entity === selectedEntity) : products;

  // Group products by vertical (todos os produtos)
  const productsByVertical = entityFilteredProducts.reduce((acc, product) => {
    const vertical = product.vertical || 'outros';
    if (!acc[vertical]) acc[vertical] = [];
    acc[vertical].push(product);
    return acc;
  }, {});

  const verticals = Object.keys(productsByVertical).sort();

  // Set initial vertical and product when entity changes
  React.useEffect(() => {
    if (verticals.length > 0) {
      const firstVertical = verticals[0];
      setSelectedVertical(firstVertical);
      if (productsByVertical[firstVertical]?.length > 0) {
        setSelectedProduct(productsByVertical[firstVertical][0].id);
      }
    }
  }, [verticals.length, selectedEntity]);

  // Auto-seleciona o primeiro produto quando mudar de vertical
  React.useEffect(() => {
    if (selectedVertical && productsByVertical[selectedVertical]?.length > 0) {
      setSelectedProduct(productsByVertical[selectedVertical][0].id);
    }
  }, [selectedVertical]);

  // Overall migration progress (todos os produtos)
  const overallProgress = entityFilteredProducts.length > 0
    ? Math.round(entityFilteredProducts.reduce((sum, p) => sum + getProductProgress(p.id), 0) / entityFilteredProducts.length)
    : 0;

  const moveSectionUp = (productId, sectionIndex) => {
    if (sectionIndex === 0) return;
    setSectionOrder(prev => {
      const key = productId;
      const currentOrder = prev[key] || [];
      const newOrder = [...currentOrder];
      [newOrder[sectionIndex - 1], newOrder[sectionIndex]] = [newOrder[sectionIndex], newOrder[sectionIndex - 1]];
      return { ...prev, [key]: newOrder };
    });
  };

  const moveSectionDown = (productId, sectionIndex, totalSections) => {
    if (sectionIndex >= totalSections - 1) return;
    setSectionOrder(prev => {
      const key = productId;
      const currentOrder = prev[key] || [];
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

  const moveImportedSectionUp = (productId, sectionNames, sectionIndex) => {
    if (sectionIndex === 0) return;
    setImportedSectionOrder(prev => {
      const key = productId;
      const currentOrder = prev[key] || sectionNames.map((_, i) => i);
      const newOrder = [...currentOrder];
      [newOrder[sectionIndex - 1], newOrder[sectionIndex]] = [newOrder[sectionIndex], newOrder[sectionIndex - 1]];
      return { ...prev, [key]: newOrder };
    });
  };

  const moveImportedSectionDown = (productId, sectionNames, sectionIndex) => {
    if (sectionIndex >= sectionNames.length - 1) return;
    setImportedSectionOrder(prev => {
      const key = productId;
      const currentOrder = prev[key] || sectionNames.map((_, i) => i);
      const newOrder = [...currentOrder];
      [newOrder[sectionIndex], newOrder[sectionIndex + 1]] = [newOrder[sectionIndex + 1], newOrder[sectionIndex]];
      return { ...prev, [key]: newOrder };
    });
  };

  const getOrderedImportedSections = (productId, sectionEntries) => {
    const key = productId;
    const sectionNames = sectionEntries.map(([name]) => name);
    const order = importedSectionOrder[key] || sectionNames.map((_, i) => i);
    return order.map(i => sectionEntries[i]).filter(Boolean);
  };

  const handleMarkSectionTasks = async (sectionTasks, completed) => {
    const tasksToUpdate = sectionTasks.filter(t => t.completed !== completed);
    
    if (tasksToUpdate.length === 0) return;

    setMarkingProgress({ isLoading: true, current: 0, total: tasksToUpdate.length });

    // Processar em batches de 5 com delay de 300ms (sustentável)
    const batchSize = 5;
    const batchDelay = 300;

    for (let i = 0; i < tasksToUpdate.length; i += batchSize) {
      const batch = tasksToUpdate.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(task => base44.entities.MigrationTask.update(task.id, { 
          completed,
          completed_date: completed ? new Date().toISOString() : null
        }))
      );

      const processed = Math.min(i + batchSize, tasksToUpdate.length);
      setMarkingProgress({ isLoading: true, current: processed, total: tasksToUpdate.length });

      if (i + batchSize < tasksToUpdate.length) {
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }
    }

    setMarkingProgress({ isLoading: false, current: 0, total: 0 });
    queryClient.invalidateQueries({ queryKey: ['migrationTasks', projectId] });
  };

  const handleImportTasks = async (rawData) => {
    const product = getCurrentProduct();
    if (!product) return;

    const existingTasks = tasks.filter(t => t.product_id === product.id);
    await Promise.all(existingTasks.map(task =>
      base44.entities.MigrationTask.delete(task.id).catch(() => {})
    ));

    const tasksToCreate = [];
    const seenTitles = new Set();
    let currentEtapa = '';
    let order = 0;

    for (const row of rawData) {
      const colA = (row[0] || '').toString().trim().toLowerCase();
      const colB = (row[1] || '').toString().trim();
      if (!colA || !colB) continue;
      if (colA === 'etapa') {
        currentEtapa = colB;
      } else if (colA === 'tarefa') {
        const title = currentEtapa ? `||${currentEtapa}||${colB}` : colB;
        if (!seenTitles.has(title.toLowerCase())) {
          seenTitles.add(title.toLowerCase());
          tasksToCreate.push({ title, project_id: projectId, product_id: product.id, completed: false, order: order++ });
        }
      }
    }

    if (tasksToCreate.length > 0) {
      await base44.entities.MigrationTask.bulkCreate(tasksToCreate);
      toast.success(`${tasksToCreate.length} tarefas importadas com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['migrationTasks', projectId] });
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
        {entityFilteredProducts.length > 0 && (
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
        }} showAllButton={false} />
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
                        <div className="space-y-3 mb-6">
                          {(() => {
                            const productTasks = getProductTasks(product.id);
                            const importedSectionNames = [...new Set(
                              productTasks
                                .filter(t => t.title.includes('||'))
                                .map(t => t.title.match(/^\|\|(.+?)\|\|/)?.[1])
                                .filter(Boolean)
                            )];
                            return (
                              <>
                                {importedSectionNames.length > 0 && (
                                  <select
                                    value={addTaskSection}
                                    onChange={e => setAddTaskSection(e.target.value)}
                                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2 text-sm"
                                  >
                                    <option value="">Selecione a etapa (opcional)</option>
                                    {importedSectionNames.map(s => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </select>
                                )}
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
                              </>
                            );
                          })()}
                          <Button 
                            variant="outline" 
                            className="w-full border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                            onClick={() => setImportModalOpen(true)}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Importar Excel
                          </Button>
                        </div>

                        {/* Tasks List by Section */}
                        <div className="space-y-6">
                          {(() => {
                             const productTasks = getProductTasks(product.id);
                             const defaultSections = getDefaultTasksForProduct(product.name) || [];

                             // Se houver tarefas no BD, usa essas
                             if (productTasks.length > 0) {
                               // Agrupar tarefas por seções (procuram por ||)
                               const tasksBySection = productTasks.reduce((acc, task) => {
                                 if (task.title.includes('||')) {
                                   const match = task.title.match(/^\|\|(.+?)\|\|(.+)$/);
                                   if (match) {
                                     const [, sectionName, taskName] = match;
                                     if (!acc[sectionName]) acc[sectionName] = [];
                                     acc[sectionName].push({ ...task, displayTitle: taskName });
                                   }
                                 }
                                 return acc;
                               }, {});

                               const sectionEntries = Object.entries(tasksBySection);

return (
  <>
    {/* Renderizar seções do banco de dados */}
    {sectionEntries.map(([sectionName, sectionTasks], displayIndex) => {
                                   // Remover duplicados
                                    const uniqueTasks = [];
                                    const seenTitles = new Map();

                                    for (const task of sectionTasks) {
                                      const titleLower = task.displayTitle.toLowerCase();
                                      if (!seenTitles.has(titleLower)) {
                                        seenTitles.set(titleLower, task);
                                        uniqueTasks.push(task);
                                      } else {
                                        const existing = seenTitles.get(titleLower);
                                        if (task.completed && !existing.completed) {
                                          const idx = uniqueTasks.indexOf(existing);
                                          uniqueTasks[idx] = task;
                                          seenTitles.set(titleLower, task);
                                        }
                                      }
                                    }

                                  return (
                                    <div key={`section-${displayIndex}`}>
                                      <div className="flex items-center justify-between mb-3 group/section">
                                        <h3 className="text-cyan-400 font-semibold text-sm uppercase flex-1">
                                          {sectionName}
                                        </h3>
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() => {
                                              const allDone = uniqueTasks.every(t => t.completed);
                                              handleMarkSectionTasks(uniqueTasks, !allDone);
                                            }}
                                            disabled={markingProgress.isLoading}
                                            className="text-[10px] px-2 py-0.5 rounded border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                          >
                                            {markingProgress.isLoading ? (
                                              <>
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                Processando...
                                              </>
                                            ) : uniqueTasks.every(t => t.completed) ? (
                                              'Desmarcar'
                                            ) : (
                                              'Marcar todos'
                                            )}
                                          </button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            disabled={displayIndex === 0}
                                            className="h-6 w-6 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-30"
                                            onClick={() => moveImportedSectionUp(product.id, sectionEntries.map(([name]) => name), displayIndex)}
                                          >
                                            <ChevronUp className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            disabled={displayIndex >= sectionEntries.length - 1}
                                            className="h-6 w-6 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-30"
                                            onClick={() => moveImportedSectionDown(product.id, sectionEntries.map(([name]) => name), displayIndex)}
                                          >
                                            <ChevronDown className="w-4 h-4" />
                                          </Button>
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
                                      </div>
                                      <div className="space-y-2">
                                        {uniqueTasks.map(task => (
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
                                               {task.completed && task.completed_date && (
                                                 <span className="text-slate-400 text-xs ml-2 no-underline">
                                                   ({new Date(task.completed_date).toLocaleDateString('pt-BR')})
                                                 </span>
                                               )}
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

                                      {/* Loading indicator */}
                                      {markingProgress.isLoading && (
                                        <div className="p-4 bg-blue-600/10 border border-blue-600/50 rounded">
                                          <div className="flex items-center gap-2 mb-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                                            <span className="text-sm text-blue-300">Marcando tarefas...</span>
                                          </div>
                                          <Progress value={(markingProgress.current / markingProgress.total) * 100} className="h-2" />
                                          <p className="text-xs text-slate-400 text-center mt-2">{markingProgress.current}/{markingProgress.total}</p>
                                        </div>
                                      )}
                                      </>
                                      );
                                      }

                                      // Fallback: Mostrar tarefas padrão do arquivo hardcoded
                                      if (defaultSections.length > 0) {
                                      return (
                                      <>
                                        {defaultSections.map((section, displayIndex) => (
                                          <div key={`default-${displayIndex}`}>
                                            <div className="flex items-center justify-between mb-3 group/section">
                                              <h3 className="text-cyan-400 font-semibold text-sm uppercase flex-1">
                                                {section.section}
                                              </h3>
                                            </div>
                                            <div className="space-y-2">
                                              {section.tasks.map((taskTitle, idx) => (
                                                <div key={`${displayIndex}-${idx}`} className="flex items-center gap-3 group">
                                                  <Checkbox
                                                    checked={false}
                                                    disabled
                                                    className="border-slate-500"
                                                  />
                                                  <span className="flex-1 text-sm text-slate-400">
                                                    {taskTitle}
                                                  </span>
                                                  <span className="text-xs text-slate-500">
                                                    (click Importar Excel para criar)
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        ))}
                                      </>
                                      );
                                      }

                                      return (
                                      <p className="text-center text-slate-500 py-4 text-sm">
                                      Nenhuma tarefa de migração encontrada
                                      </p>
                                      );
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

      <ImportTasksModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImport={handleImportTasks}
        productName={getCurrentProduct()?.name}
      />
    </div>
  );
}