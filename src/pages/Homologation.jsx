import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, CheckCircle, Trash2, ChevronUp, ChevronDown, Upload, Loader2 } from 'lucide-react';
import ImportTasksModal from '../components/modals/ImportTasksModal';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import EmptyState from '../components/ui/EmptyState';
import { getDefaultTasksForProduct, productHasHomologation } from '../components/homologation/homologationTasksHelper';
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

export default function Homologation() {
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
  const creatingTasksRef = useRef(new Set());

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

  const { data: tasks = [], isFetched: tasksFetched } = useQuery({
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
    if (creatingTasksRef.current.has(product.id)) return;
    const existingTasks = tasks.filter(t => t.product_id === product.id);
    if (existingTasks.length > 0) return;
    const defaultSections = getDefaultTasksForProduct(product.name);
    if (!defaultSections) return;

    creatingTasksRef.current.add(product.id);
    try {
      const freshTasks = await base44.entities.HomologationTask.filter({
        project_id: projectId,
        product_id: product.id
      });
      if (freshTasks.length > 0) return;

      const tasksToCreate = [];
      let order = 0;
      for (const section of defaultSections) {
        for (const taskTitle of section.tasks) {
          tasksToCreate.push({ title: taskTitle, project_id: projectId, product_id: product.id, completed: false, order: order++ });
        }
      }
      if (tasksToCreate.length > 0) {
        await base44.entities.HomologationTask.bulkCreate(tasksToCreate);
        queryClient.invalidateQueries({ queryKey: ['homologationTasks', projectId] });
      }
    } finally {
      creatingTasksRef.current.delete(product.id);
    }
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim() || !selectedProduct) return;
    const title = addTaskSection ? `||${addTaskSection}||${newTaskTitle.trim()}` : newTaskTitle.trim();
    createTaskMutation.mutate({ title, project_id: activeProject?.id, product_id: selectedProduct, completed: false });
    setAddTaskSection('');
  };

  const handleToggleTask = (task) => {
    const newCompleted = !task.completed;
    updateTaskMutation.mutate({ id: task.id, data: { completed: newCompleted, completed_date: newCompleted ? new Date().toISOString() : null } });
  };

  const getProductTasks = (productId) => tasks.filter(t => t.product_id === productId);

  const getProductProgress = (productId) => {
    const productTasks = getProductTasks(productId);
    const product = products.find(p => p.id === productId);
    const defaultSections = getDefaultTasksForProduct(product?.name) || [];
    const importedTasks = productTasks.filter(t => t.title.includes('||'));
    const standardTasks = productTasks.filter(t => !t.title.includes('||'));

    const importedBySection = importedTasks.reduce((acc, task) => {
      const match = task.title.match(/^\|\|(.+?)\|\|(.+)$/);
      if (match) {
        const [, sectionName, taskName] = match;
        const titleLower = taskName.toLowerCase();
        if (!acc[sectionName]) acc[sectionName] = new Map();
        if (!acc[sectionName].has(titleLower)) acc[sectionName].set(titleLower, task);
      }
      return acc;
    }, {});

    const claimedIds = new Set();
    let visibleCount = 0;
    let completedCount = 0;
    for (const section of defaultSections) {
      const seenInSection = new Set();
      for (const task of standardTasks) {
        if (claimedIds.has(task.id)) continue;
        if (!section.tasks.some(st => st.toLowerCase() === task.title.toLowerCase())) continue;
        const tl = task.title.toLowerCase();
        if (!seenInSection.has(tl)) {
          seenInSection.add(tl);
          claimedIds.add(task.id);
          visibleCount++;
          if (task.completed) completedCount++;
        }
      }
    }

    const importedVisible = Object.values(importedBySection).flatMap(map => Array.from(map.values()));
    visibleCount += importedVisible.length;
    completedCount += importedVisible.filter(t => t.completed).length;

    if (defaultSections.length === 0) {
      const unclaimed = standardTasks.filter(t => !claimedIds.has(t.id));
      visibleCount += unclaimed.length;
      completedCount += unclaimed.filter(t => t.completed).length;
    }

    if (visibleCount === 0) return 0;
    return Math.round((completedCount / visibleCount) * 100);
  };

  // Entity filter
  const entityMap = new Map();
  products.forEach(p => { if (p.entity) entityMap.set(p.entity, p.entity_full_name || p.entity); });
  const allEntities = Array.from(entityMap.entries()).map(([code, fullName]) => ({ code, fullName })).sort((a, b) => {
    const af = a.fullName.toLowerCase(), bf = b.fullName.toLowerCase(), ac = a.code.toLowerCase(), bc = b.code.toLowerCase();
    if (af.includes('prefeitura') && !bf.includes('prefeitura')) return -1;
    if (!af.includes('prefeitura') && bf.includes('prefeitura')) return 1;
    if ((af.includes('câmara') || ac === 'cm') && !(bf.includes('câmara') || bc === 'cm')) return -1;
    if (!(af.includes('câmara') || ac === 'cm') && (bf.includes('câmara') || bc === 'cm')) return 1;
    return af.localeCompare(bf);
  });

  React.useEffect(() => {
    if (allEntities.length > 0 && !selectedEntity) {
      const entityWithProducts = allEntities.find(entity => products.some(p => p.entity === entity.code && productHasHomologation(p.name)));
      setSelectedEntity(entityWithProducts?.code || allEntities[0]?.code);
    }
  }, [allEntities.length, products.length]);

  const entityFilteredProducts = selectedEntity ? products.filter(p => p.entity === selectedEntity) : products;

  const productsByVertical = entityFilteredProducts.reduce((acc, product) => {
    if (productHasHomologation(product.name)) {
      const vertical = product.vertical || 'outros';
      if (!acc[vertical]) acc[vertical] = [];
      acc[vertical].push(product);
    }
    return acc;
  }, {});

  const verticals = Object.keys(productsByVertical).sort();

  React.useEffect(() => {
    if (verticals.length > 0) {
      const firstVertical = verticals[0];
      setSelectedVertical(firstVertical);
      if (productsByVertical[firstVertical]?.length > 0) setSelectedProduct(productsByVertical[firstVertical][0].id);
    }
  }, [verticals.length, selectedEntity]);

  React.useEffect(() => {
    if (selectedVertical && productsByVertical[selectedVertical]?.length > 0) setSelectedProduct(productsByVertical[selectedVertical][0].id);
  }, [selectedVertical]);

  React.useEffect(() => {
    if (!selectedProduct || products.length === 0 || !tasksFetched) return;
    const product = getCurrentProduct();
    if (!product || !productHasHomologation(product.name)) return;
    if (creatingTasksRef.current.has(product.id)) return;

    const existingTasks = tasks.filter(t => t.product_id === product.id);
    if (existingTasks.length > 0) return;

    createDefaultTasks(product);
  }, [selectedProduct, products, tasksFetched, tasks]);

  const productsWithHomologation = entityFilteredProducts.filter(p => productHasHomologation(p.name));
  const overallProgress = productsWithHomologation.length > 0
    ? Math.round(productsWithHomologation.reduce((sum, p) => sum + getProductProgress(p.id), 0) / productsWithHomologation.length)
    : 0;

  const getCurrentProduct = () => products.find(p => p.id === selectedProduct);

  const moveSectionUp = (productId, sectionIndex) => {
    if (sectionIndex === 0) return;
    setSectionOrder(prev => {
      const currentOrder = prev[productId] || getDefaultTasksForProduct(getCurrentProduct()?.name)?.map((_, i) => i) || [];
      const newOrder = [...currentOrder];
      [newOrder[sectionIndex - 1], newOrder[sectionIndex]] = [newOrder[sectionIndex], newOrder[sectionIndex - 1]];
      return { ...prev, [productId]: newOrder };
    });
  };

  const moveSectionDown = (productId, sectionIndex, totalSections) => {
    if (sectionIndex >= totalSections - 1) return;
    setSectionOrder(prev => {
      const currentOrder = prev[productId] || getDefaultTasksForProduct(getCurrentProduct()?.name)?.map((_, i) => i) || [];
      const newOrder = [...currentOrder];
      [newOrder[sectionIndex], newOrder[sectionIndex + 1]] = [newOrder[sectionIndex + 1], newOrder[sectionIndex]];
      return { ...prev, [productId]: newOrder };
    });
  };

  const getOrderedSections = (productId, sections) => {
    const order = sectionOrder[productId] || sections?.map((_, i) => i) || [];
    return order.map(i => sections[i]).filter(Boolean);
  };

  const moveImportedSectionUp = (productId, sectionNames, sectionIndex) => {
    if (sectionIndex === 0) return;
    setImportedSectionOrder(prev => {
      const currentOrder = prev[productId] || sectionNames.map((_, i) => i);
      const newOrder = [...currentOrder];
      [newOrder[sectionIndex - 1], newOrder[sectionIndex]] = [newOrder[sectionIndex], newOrder[sectionIndex - 1]];
      return { ...prev, [productId]: newOrder };
    });
  };

  const moveImportedSectionDown = (productId, sectionNames, sectionIndex) => {
    if (sectionIndex >= sectionNames.length - 1) return;
    setImportedSectionOrder(prev => {
      const currentOrder = prev[productId] || sectionNames.map((_, i) => i);
      const newOrder = [...currentOrder];
      [newOrder[sectionIndex], newOrder[sectionIndex + 1]] = [newOrder[sectionIndex + 1], newOrder[sectionIndex]];
      return { ...prev, [productId]: newOrder };
    });
  };

  const getOrderedImportedSections = (productId, sectionEntries) => {
    const sectionNames = sectionEntries.map(([name]) => name);
    const order = importedSectionOrder[productId] || sectionNames.map((_, i) => i);
    return order.map(i => sectionEntries[i]).filter(Boolean);
  };

  const handleMarkSectionTasks = async (sectionTasks, completed) => {
    const tasksToUpdate = sectionTasks.filter(t => t.completed !== completed);
    if (tasksToUpdate.length === 0) return;
    setMarkingProgress({ isLoading: true, current: 0, total: tasksToUpdate.length });
    const completedDate = completed ? new Date().toISOString() : null;
    for (let i = 0; i < tasksToUpdate.length; i++) {
      const task = tasksToUpdate[i];
      try {
        await base44.entities.HomologationTask.update(task.id, { completed, completed_date: completedDate });
      } catch (e) {
        await new Promise(resolve => setTimeout(resolve, 500));
        await base44.entities.HomologationTask.update(task.id, { completed, completed_date: completedDate }).catch(() => {});
      }
      setMarkingProgress({ isLoading: true, current: i + 1, total: tasksToUpdate.length });
    }
    setMarkingProgress({ isLoading: false, current: 0, total: 0 });
    queryClient.invalidateQueries({ queryKey: ['homologationTasks', projectId] });
  };

  const handleImportTasks = async (rawData) => {
    const product = getCurrentProduct();
    if (!product) return;
    const freshTasks = await base44.entities.HomologationTask.filter({ project_id: projectId, product_id: product.id });
    const tasksToCreate = [];
    const seenTitles = new Set();
    let currentEtapa = '';
    let order = freshTasks.length;
    for (const row of rawData) {
      const colA = (row[0] || '').toString().trim().toLowerCase();
      const colB = (row[1] || '').toString().trim();
      if (!colA || !colB) continue;
      if (colA === 'etapa') { currentEtapa = colB; }
      else if (colA === 'tarefa') {
        const title = currentEtapa ? `||${currentEtapa}||${colB}` : colB;
        const alreadyExists = freshTasks.some(t => t.title.toLowerCase() === title.toLowerCase());
        if (!alreadyExists && !seenTitles.has(title.toLowerCase())) {
          seenTitles.add(title.toLowerCase());
          tasksToCreate.push({ title, project_id: projectId, product_id: product.id, completed: false, order: order++ });
        }
      }
    }
    if (tasksToCreate.length > 0) {
      await base44.entities.HomologationTask.bulkCreate(tasksToCreate);
      toast.success(`${tasksToCreate.length} tarefas novas importadas!`);
    } else {
      toast.info('Nenhuma tarefa nova encontrada. Todas já estavam cadastradas.');
    }
    queryClient.invalidateQueries({ queryKey: ['homologationTasks', projectId] });
  };

  const renderTaskRow = (task, displayTitle) => (
    <div key={task.id} className="flex items-center gap-3 group">
      <Checkbox checked={task.completed} onCheckedChange={() => handleToggleTask(task)} className="border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" />
      <span className={cn("flex-1 text-sm", task.completed ? "text-slate-400" : "text-white")}>
        {displayTitle || task.title}
        {task.completed && task.completed_date && (
          <span className="text-slate-400 text-xs ml-2 font-bold">({new Date(task.completed_date).toLocaleDateString('pt-BR')})</span>
        )}
      </span>
      <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteTaskMutation.mutate(task.id)}>
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );

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
            <div className="w-32"><Progress value={overallProgress} className="h-2" /></div>
            <div className="text-lg font-bold text-white">{overallProgress}%</div>
          </div>
        )}
      </div>

      {allEntities.length > 0 && (
        <EntityFilter entities={allEntities} selectedEntity={selectedEntity} onEntityChange={(e) => { setSelectedEntity(e); setSelectedVertical(''); setSelectedProduct(''); }} showAllButton={false} />
      )}

      {products.length > 0 ? (
        <Tabs value={selectedVertical} onValueChange={setSelectedVertical} className="space-y-4">
          <TabsList className="bg-slate-800 border border-slate-700">
            {verticals.map(vertical => (
              <TabsTrigger key={vertical} value={vertical} className="data-[state=active]:bg-blue-600">
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
                    const capitalizedName = product.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                    return (
                      <TabsTrigger key={product.id} value={product.id} className="data-[state=active]:bg-blue-600 flex items-center gap-2">
                        {capitalizedName} <span className="text-xs">({progress}%)</span>
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
                            {product.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}
                          </CardTitle>
                          <Badge className={cn("border", getProductProgress(product.id) === 100 ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-orange-500/20 text-orange-400 border-orange-500/30")}>
                            {getProductProgress(product.id)}% Concluído
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        {/* Add task / Import */}
                        <div className="space-y-3 mb-6">
                          {(() => {
                            const defaultSections = getDefaultTasksForProduct(product.name) || [];
                            const importedSectionNames = [...new Set(getProductTasks(product.id).filter(t => t.title.includes('||')).map(t => t.title.match(/^\|\|(.+?)\|\|/)?.[1]).filter(Boolean))];
                            const allSections = [...defaultSections.map(s => s.section), ...importedSectionNames];
                            return (
                              <>
                                {allSections.length > 0 && (
                                  <select value={addTaskSection} onChange={e => setAddTaskSection(e.target.value)} className="w-full bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2 text-sm">
                                    <option value="">Selecione a etapa (opcional)</option>
                                    {allSections.map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                )}
                                <div className="flex gap-2">
                                  <Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Nova tarefa de homologação..." className="bg-slate-700 border-slate-600 text-white" onKeyDown={(e) => e.key === 'Enter' && handleAddTask()} />
                                  <Button onClick={handleAddTask} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4" /></Button>
                                </div>
                              </>
                            );
                          })()}
                          <Button variant="outline" className="w-full border-blue-500/30 text-blue-400 hover:bg-blue-500/10" onClick={() => setImportModalOpen(true)}>
                            <Upload className="w-4 h-4 mr-2" />Importar Excel
                          </Button>
                        </div>

                        {/* Task list */}
                        <div className="space-y-6">
                          {(() => {
                            const productTasks = getProductTasks(product.id);
                            const defaultSections = getDefaultTasksForProduct(product.name) || [];
                            const importedTasks = productTasks.filter(t => t.title.includes('||'));
                            const standardTasks = productTasks.filter(t => !t.title.includes('||'));

                            const importedBySection = importedTasks.reduce((acc, task) => {
                              const match = task.title.match(/^\|\|(.+?)\|\|(.+)$/);
                              if (match) {
                                const [, sectionName, taskName] = match;
                                if (!acc[sectionName]) acc[sectionName] = [];
                                acc[sectionName].push({ ...task, displayTitle: taskName });
                              }
                              return acc;
                            }, {});

                            return (
                              <>
                                {/* Seções importadas */}
                                {getOrderedImportedSections(product.id, Object.entries(importedBySection)).map(([sectionName, sectionTasks], displayIndex) => {
                                  const totalImportedSections = Object.keys(importedBySection).length;
                                  const uniqueImportedTasks = [];
                                  const seenTitles = new Map();
                                  for (const task of sectionTasks) {
                                    const tl = task.displayTitle.toLowerCase();
                                    if (!seenTitles.has(tl)) { seenTitles.set(tl, task); uniqueImportedTasks.push(task); }
                                    else { const ex = seenTitles.get(tl); if (task.completed && !ex.completed) { uniqueImportedTasks[uniqueImportedTasks.indexOf(ex)] = task; seenTitles.set(tl, task); } }
                                  }
                                  return (
                                    <div key={`imported-${displayIndex}`}>
                                      <div className="flex items-center justify-between mb-3 group/section">
                                        <h3 className="text-cyan-400 font-semibold text-sm uppercase flex-1">{sectionName}</h3>
                                        <div className="flex items-center gap-1">
                                          <button onClick={() => handleMarkSectionTasks(uniqueImportedTasks, !uniqueImportedTasks.every(t => t.completed))} disabled={markingProgress.isLoading} className="text-[10px] px-2 py-0.5 rounded border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
                                            {markingProgress.isLoading ? <><Loader2 className="w-3 h-3 animate-spin" />Processando...</> : uniqueImportedTasks.every(t => t.completed) ? 'Desmarcar' : 'Marcar todos'}
                                          </button>
                                          <Button size="icon" variant="ghost" disabled={displayIndex === 0} className="h-6 w-6 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-30" onClick={() => moveImportedSectionUp(product.id, Object.keys(importedBySection), displayIndex)}><ChevronUp className="w-4 h-4" /></Button>
                                          <Button size="icon" variant="ghost" disabled={displayIndex >= totalImportedSections - 1} className="h-6 w-6 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-30" onClick={() => moveImportedSectionDown(product.id, Object.keys(importedBySection), displayIndex)}><ChevronDown className="w-4 h-4" /></Button>
                                          <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/20 opacity-0 group-hover/section:opacity-100 transition-opacity" onClick={async () => { await Promise.all(sectionTasks.map(t => deleteTaskMutation.mutate(t.id))); toast.success(`Seção "${sectionName}" deletada`); }}><Trash2 className="w-3 h-3" /></Button>
                                        </div>
                                      </div>
                                      <div className="space-y-2">{uniqueImportedTasks.map(task => renderTaskRow(task, task.displayTitle))}</div>
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

                                {/* Seções padrão */}
                                {defaultSections.length > 0 && (() => {
                                  const claimedRenderIds = new Set();
                                  return getOrderedSections(product.id, defaultSections).map((section, displayIndex) => {
                                    const rawSectionTasks = standardTasks.filter(task =>
                                      !claimedRenderIds.has(task.id) &&
                                      section.tasks.some(st => st.toLowerCase() === task.title.toLowerCase())
                                    );
                                    const uniqueTasks = [];
                                    const seenInSection = new Map();
                                    for (const task of rawSectionTasks) {
                                      const tl = task.title.toLowerCase();
                                      if (!seenInSection.has(tl)) {
                                        seenInSection.set(tl, task);
                                        uniqueTasks.push(task);
                                      } else {
                                        const ex = seenInSection.get(tl);
                                        if (task.completed && !ex.completed) {
                                          uniqueTasks[uniqueTasks.indexOf(ex)] = task;
                                          seenInSection.set(tl, task);
                                        }
                                      }
                                    }
                                    uniqueTasks.forEach(t => claimedRenderIds.add(t.id));
                                    if (uniqueTasks.length === 0) return null;
                                    const totalSections = defaultSections.length;
                                    return (
                                      <div key={displayIndex}>
                                        <div className="flex items-center justify-between mb-3 group/section">
                                          <h3 className="text-cyan-400 font-semibold text-sm uppercase flex-1">{section.section}</h3>
                                          <div className="flex items-center gap-1">
                                            <button onClick={() => handleMarkSectionTasks(uniqueTasks, !uniqueTasks.every(t => t.completed))} disabled={markingProgress.isLoading} className="text-[10px] px-2 py-0.5 rounded border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
                                              {markingProgress.isLoading ? <><Loader2 className="w-3 h-3 animate-spin" />Processando...</> : uniqueTasks.every(t => t.completed) ? 'Desmarcar' : 'Marcar todos'}
                                            </button>
                                            <Button size="icon" variant="ghost" disabled={displayIndex === 0} className="h-6 w-6 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-30" onClick={() => moveSectionUp(product.id, displayIndex)}><ChevronUp className="w-4 h-4" /></Button>
                                            <Button size="icon" variant="ghost" disabled={displayIndex >= totalSections - 1} className="h-6 w-6 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-30" onClick={() => moveSectionDown(product.id, displayIndex, totalSections)}><ChevronDown className="w-4 h-4" /></Button>
                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/20 opacity-0 group-hover/section:opacity-100 transition-opacity" onClick={async () => { await Promise.all(rawSectionTasks.map(t => deleteTaskMutation.mutate(t.id))); toast.success(`Seção "${section.section}" deletada`); }}><Trash2 className="w-3 h-3" /></Button>
                                          </div>
                                        </div>
                                        <div className="space-y-2">{uniqueTasks.map(task => renderTaskRow(task))}</div>
                                      </div>
                                    );
                                  });
                                })()}

                                {/* Tarefas personalizadas - só mostra se produto não tem template */}
                                {(() => {
                                  if (defaultSections.length > 0) return null;
                                  const customTasks = standardTasks;
                                  if (customTasks.length === 0) return null;
                                  return (
                                    <div>
                                      <h3 className="text-cyan-400 font-semibold text-sm mb-3 uppercase">TAREFAS PERSONALIZADAS</h3>
                                      <div className="space-y-2">{customTasks.map(task => renderTaskRow(task))}</div>
                                    </div>
                                  );
                                })()}
                              </>
                            );
                          })()}

                          {tasksFetched && creatingTasksRef.current.has(product.id) && (
                            <p className="text-center text-slate-500 py-4 text-sm">Carregando tarefas padrão...</p>
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
        <EmptyState icon={CheckCircle} title="Nenhum produto cadastrado" description="Adicione produtos para começar a criar checklists de homologação" />
      )}

      <ImportTasksModal open={importModalOpen} onOpenChange={setImportModalOpen} onImport={handleImportTasks} productName={getCurrentProduct()?.name} />
    </div>
  );
}