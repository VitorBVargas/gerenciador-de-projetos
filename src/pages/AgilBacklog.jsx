import React, { useState, useMemo, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Plus, CalendarPlus, Upload, Download, Search, ListTodo, CalendarRange, Sparkles, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import BacklogStats from '@/components/agil/BacklogStats';
import BacklogFilters from '@/components/agil/BacklogFilters';
import BacklogTable from '@/components/agil/BacklogTable';
import BacklogItemModal from '@/components/agil/BacklogItemModal';
import BacklogItemDetails from '@/components/agil/BacklogItemDetails';
import SprintModal from '@/components/agil/SprintModal';
import SprintPlanningModal from '@/components/agil/SprintPlanningModal';
import BacklogAIModal from '@/components/agil/BacklogAIModal';
import { exportBacklogCsv, parseBacklogCsv } from '@/components/agil/backlogCsv';

export default function AgilBacklog() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [currentUser, setCurrentUser] = useState(null);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsItem, setDetailsItem] = useState(null);
  const [sprintModalOpen, setSprintModalOpen] = useState(false);
  const [planningOpen, setPlanningOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [aiMode, setAiMode] = useState(null);
  const [aiSplitTarget, setAiSplitTarget] = useState(null);

  useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

  const { data: project } = useQuery({
    queryKey: ['agilProject', projectId],
    enabled: !!projectId,
    queryFn: async () => (await base44.entities.Project.filter({ id: projectId }))?.[0] || null,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['agileBacklog', projectId],
    enabled: !!projectId,
    queryFn: () => base44.entities.AgileBacklog.filter({ project_id: projectId }, '-updated_date', 500),
  });

  const { data: sprints = [] } = useQuery({
    queryKey: ['agileSprints', projectId],
    enabled: !!projectId,
    queryFn: () => base44.entities.AgileSprint.filter({ project_id: projectId }, 'ordem'),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['agileBacklog', projectId] });
    queryClient.invalidateQueries({ queryKey: ['agileSprints', projectId] });
  };

  const filterOptions = useMemo(() => ({
    produtos: [...new Set(items.map(i => i.produto).filter(Boolean))],
    verticals: [...new Set(items.map(i => i.vertical).filter(Boolean))],
    responsaveis: [...new Set(items.map(i => i.responsavel).filter(Boolean))],
    tags: [...new Set(items.flatMap(i => i.tags || []))],
    storyPoints: [...new Set(items.map(i => String(i.story_points || 0)))].sort((a, b) => Number(a) - Number(b)),
    sprints: sprints.map(s => ({ value: s.id, label: s.nome })),
    epics: items.filter(i => i.tipo === 'epic').map(e => ({ value: e.id, label: e.titulo })),
  }), [items, sprints]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(i => {
      if (q && !`${i.titulo} ${i.descricao || ''} ${i.responsavel || ''} ${(i.tags || []).join(' ')}`.toLowerCase().includes(q)) return false;
      if (filters.produto && i.produto !== filters.produto) return false;
      if (filters.vertical && i.vertical !== filters.vertical) return false;
      if (filters.sprint_id && i.sprint_id !== filters.sprint_id) return false;
      if (filters.tipo && i.tipo !== filters.tipo) return false;
      if (filters.responsavel && i.responsavel !== filters.responsavel) return false;
      if (filters.prioridade && i.prioridade !== filters.prioridade) return false;
      if (filters.status && i.status !== filters.status) return false;
      if (filters.epic_id && i.epic_id !== filters.epic_id) return false;
      if (filters.tag && !(i.tags || []).includes(filters.tag)) return false;
      if (filters.story_points && String(i.story_points || 0) !== filters.story_points) return false;
      return true;
    });
  }, [items, search, filters]);

  const handleNew = () => { setEditingItem(null); setItemModalOpen(true); };
  const handleEdit = (item) => { setEditingItem(item); setItemModalOpen(true); };
  const handleRowClick = (item) => { setDetailsItem(item); setDetailsOpen(true); };

  const handleDuplicate = async (item) => {
    const { id, created_date, updated_date, created_by_id, ...rest } = item;
    await base44.entities.AgileBacklog.create({ ...rest, titulo: `${item.titulo} (cópia)` });
    toast.success('Item duplicado');
    refresh();
  };

  const handleMove = async (item, sprintId) => {
    await base44.entities.AgileBacklog.update(item.id, { sprint_id: sprintId });
    toast.success('Item movido');
    refresh();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await base44.entities.AgileBacklog.delete(deleteTarget.id);
    toast.success('Item excluído');
    setDeleteTarget(null);
    refresh();
  };

  const handleExport = () => {
    if (filtered.length === 0) { toast.error('Nenhum item para exportar'); return; }
    exportBacklogCsv(filtered);
  };

  const openAI = (mode) => {
    if (filtered.length === 0) { toast.error('Nenhum item no backlog para analisar.'); return; }
    if (mode === 'divisao') {
      const stories = filtered.filter(i => i.tipo === 'story' || i.tipo === 'feature');
      const target = (stories.length ? stories : filtered).slice().sort((a, b) => (b.story_points || 0) - (a.story_points || 0))[0];
      if (!target) { toast.error('Nenhuma story/feature para dividir.'); return; }
      setAiSplitTarget(target);
      toast.info(`Dividindo: "${target.titulo}"`);
    }
    setAiMode(mode);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseBacklogCsv(text, projectId);
    if (rows.length === 0) { toast.error('Nenhum item válido no CSV'); e.target.value = ''; return; }
    await base44.entities.AgileBacklog.bulkCreate(rows);
    toast.success(`${rows.length} item(ns) importado(s)`);
    e.target.value = '';
    refresh();
  };

  if (!projectId) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Projeto não informado.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-600/20 flex items-center justify-center">
            <ListTodo className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">Product Backlog</h1>
              <Badge className="bg-emerald-600/20 text-emerald-300 border border-emerald-600/30">Ágil</Badge>
            </div>
            <p className="text-slate-400 text-sm">{project?.name}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleNew} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> Novo Item</Button>
          <Button onClick={() => setSprintModalOpen(true)} variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800"><CalendarPlus className="w-4 h-4 mr-1" /> Nova Sprint</Button>
          <Button onClick={() => setPlanningOpen(true)} variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800"><CalendarRange className="w-4 h-4 mr-1" /> Planejar Sprint</Button>
          <Button onClick={handleImportClick} variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800"><Upload className="w-4 h-4 mr-1" /> Importar CSV</Button>
          <Button onClick={handleExport} variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800"><Download className="w-4 h-4 mr-1" /> Exportar</Button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportFile} />
        </div>
      </div>

      {/* IA Scrum Master */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => openAI('priorizacao')} variant="outline" className="border-emerald-700/50 text-emerald-300 hover:bg-emerald-600/10"><Sparkles className="w-4 h-4 mr-1" /> Priorização</Button>
        <Button onClick={() => openAI('refinamento')} variant="outline" className="border-emerald-700/50 text-emerald-300 hover:bg-emerald-600/10"><Sparkles className="w-4 h-4 mr-1" /> Refinamento</Button>
        <Button onClick={() => openAI('divisao')} variant="outline" className="border-emerald-700/50 text-emerald-300 hover:bg-emerald-600/10"><Sparkles className="w-4 h-4 mr-1" /> Divisão</Button>
        <Button onClick={() => openAI('mesclagem')} variant="outline" className="border-emerald-700/50 text-emerald-300 hover:bg-emerald-600/10"><Sparkles className="w-4 h-4 mr-1" /> Mesclagem</Button>
        <Button onClick={() => openAI('story_points')} variant="outline" className="border-emerald-700/50 text-emerald-300 hover:bg-emerald-600/10"><Sparkles className="w-4 h-4 mr-1" /> Story Points</Button>
        <span className="text-xs text-slate-500 self-center">IA Scrum Master</span>
      </div>

      {/* Indicadores */}
      <BacklogStats items={items} />

      {/* Pesquisa + filtros */}
      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisa inteligente..." className="bg-slate-800 border-slate-700 pl-9 text-white" />
        </div>
        <BacklogFilters filters={filters} setFilters={setFilters} options={filterOptions} />
      </div>

      {/* Listagem */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <ChevronRight className="w-4 h-4" /> {filtered.length} item(ns)
      </div>
      <BacklogTable
        items={filtered}
        sprints={sprints}
        onRowClick={handleRowClick}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onMove={handleMove}
        onDelete={(item) => setDeleteTarget(item)}
      />

      {/* Modais */}
      <BacklogItemModal
        open={itemModalOpen}
        onOpenChange={setItemModalOpen}
        item={editingItem}
        projectId={projectId}
        items={items}
        sprints={sprints}
        onSaved={refresh}
      />
      <BacklogItemDetails
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        item={detailsItem}
        items={items}
        sprints={sprints}
        currentUser={currentUser}
        onChanged={refresh}
      />
      <SprintModal
        open={sprintModalOpen}
        onOpenChange={setSprintModalOpen}
        projectId={projectId}
        onSaved={refresh}
      />
      <SprintPlanningModal
        open={planningOpen}
        onOpenChange={setPlanningOpen}
        items={items}
        sprints={sprints}
        onSaved={refresh}
      />
      <BacklogAIModal
        open={!!aiMode}
        onOpenChange={(v) => { if (!v) { setAiMode(null); setAiSplitTarget(null); } }}
        mode={aiMode}
        items={filtered}
        projectId={projectId}
        splitTarget={aiSplitTarget}
        onApplied={refresh}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja excluir "{deleteTarget?.titulo}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}