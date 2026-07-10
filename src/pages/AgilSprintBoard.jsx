import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DragDropContext } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Kanban, CalendarPlus, CalendarRange, RefreshCw, Sparkles, Flag, Heart, Zap, Target as TargetIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { BOARD_COLUMNS, BOARD_TO_STATUS, effectiveColumn } from '@/components/agil/boardMeta';
import { computeSprintMetrics, computeBurndown } from '@/components/agil/boardMetrics';
import SprintKPIs from '@/components/agil/SprintKPIs';
import SprintBurndown from '@/components/agil/SprintBurndown';
import BoardColumn from '@/components/agil/BoardColumn';
import BoardCardModal from '@/components/agil/BoardCardModal';
import BoardCardMenu from '@/components/agil/BoardCardMenu';
import BoardToolbar from '@/components/agil/BoardToolbar';
import BlockItemModal from '@/components/agil/BlockItemModal';
import SprintModal from '@/components/agil/SprintModal';
import SprintPlanningModal from '@/components/agil/SprintPlanningModal';
import BacklogItemModal from '@/components/agil/BacklogItemModal';

const HEALTH = {
  ok: { label: 'Saudável', color: 'text-emerald-300', bg: 'bg-emerald-500/15 border-emerald-500/40' },
  atencao: { label: 'Atenção', color: 'text-yellow-300', bg: 'bg-yellow-500/15 border-yellow-500/40' },
  critico: { label: 'Crítico', color: 'text-red-300', bg: 'bg-red-500/15 border-red-500/40' },
};

export default function AgilSprintBoard() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');
  const queryClient = useQueryClient();

  const [currentUser, setCurrentUser] = useState(null);
  const [selectedSprintId, setSelectedSprintId] = useState(null);
  const [filters, setFilters] = useState({});
  const [swimlane, setSwimlane] = useState('none');

  const [cardOpen, setCardOpen] = useState(false);
  const [cardItem, setCardItem] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [menu, setMenu] = useState(null);
  const [blockTarget, setBlockTarget] = useState(null);
  const [sprintModalOpen, setSprintModalOpen] = useState(false);
  const [planningOpen, setPlanningOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [finishOpen, setFinishOpen] = useState(false);

  useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

  const { data: project } = useQuery({
    queryKey: ['agilProject', projectId],
    enabled: !!projectId,
    queryFn: async () => (await base44.entities.Project.filter({ id: projectId }))?.[0] || null,
  });

  const { data: allItems = [] } = useQuery({
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

  // Sprint atual: selecionada > em andamento > primeira
  const activeSprint = useMemo(() => {
    if (selectedSprintId) return sprints.find(s => s.id === selectedSprintId) || null;
    return sprints.find(s => s.status === 'em_andamento') || sprints[0] || null;
  }, [sprints, selectedSprintId]);

  // Itens da sprint atual (não subtasks aparecem no board principal)
  const sprintItems = useMemo(
    () => allItems.filter(i => activeSprint && i.sprint_id === activeSprint.id && !i.is_subtask),
    [allItems, activeSprint]
  );

  const metrics = useMemo(() => computeSprintMetrics(sprintItems, activeSprint), [sprintItems, activeSprint]);
  const burndown = useMemo(() => computeBurndown(sprintItems, activeSprint), [sprintItems, activeSprint]);

  const epicsById = useMemo(() => {
    const map = {};
    allItems.filter(i => i.tipo === 'epic').forEach(e => { map[e.id] = e; });
    return map;
  }, [allItems]);

  const toolbarOptions = useMemo(() => ({
    responsaveis: [...new Set(sprintItems.map(i => i.responsavel).filter(Boolean))],
    produtos: [...new Set(sprintItems.map(i => i.produto).filter(Boolean))],
    tags: [...new Set(sprintItems.flatMap(i => i.tags || []))],
    epics: allItems.filter(i => i.tipo === 'epic').map(e => ({ value: e.id, label: e.titulo })),
  }), [sprintItems, allItems]);

  // Aplica filtros
  const filtered = useMemo(() => sprintItems.filter(i => {
    if (filters.responsavel && i.responsavel !== filters.responsavel) return false;
    if (filters.produto && i.produto !== filters.produto) return false;
    if (filters.epic_id && i.epic_id !== filters.epic_id) return false;
    if (filters.tipo && i.tipo !== filters.tipo) return false;
    if (filters.prioridade && i.prioridade !== filters.prioridade) return false;
    if (filters.tag && !(i.tags || []).includes(filters.tag)) return false;
    if (filters.bloqueados && !i.bloqueado) return false;
    if (filters.somenteBugs && i.tipo !== 'bug') return false;
    if (filters.somenteDebito && i.tipo !== 'debito_tecnico') return false;
    return true;
  }), [sprintItems, filters]);

  // Swimlanes
  const swimlanes = useMemo(() => {
    if (swimlane === 'none') return [{ key: 'all', label: null, items: filtered }];
    const groups = {};
    filtered.forEach(i => {
      let key = i[swimlane] || '__none__';
      let label = key;
      if (swimlane === 'epic_id') label = epicsById[key]?.titulo || 'Sem Epic';
      if (swimlane === 'responsavel') label = key === '__none__' ? 'Sem responsável' : key;
      if (swimlane === 'produto') label = key === '__none__' ? 'Sem produto' : key;
      if (swimlane === 'prioridade') label = key === '__none__' ? '—' : key;
      if (swimlane === 'tipo') label = key === '__none__' ? '—' : key;
      if (!groups[key]) groups[key] = { key, label, items: [] };
      groups[key].items.push(i);
    });
    return Object.values(groups);
  }, [filtered, swimlane, epicsById]);

  const itemsByColumn = (items) => {
    const map = {};
    BOARD_COLUMNS.forEach(c => { map[c.id] = []; });
    items.forEach(i => {
      const col = effectiveColumn(i);
      (map[col] || map.backlog).push(i);
    });
    return map;
  };

  // Drag and drop -> automações
  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;
    const item = allItems.find(i => i.id === draggableId);
    if (!item) return;

    const newCol = destination.droppableId;
    const newStatus = BOARD_TO_STATUS[newCol];
    const nowIso = new Date().toISOString();

    const patch = {
      board_status: newCol,
      status: item.bloqueado ? item.status : newStatus,
      coluna_entrou_em: nowIso,
    };

    // Início do fluxo (primeira vez em desenvolvimento) -> started_at (Cycle Time)
    if (newCol === 'em_desenvolvimento' && !item.started_at) {
      patch.started_at = nowIso;
    }

    // Conclusão -> completed_at + lead/cycle time
    if (newCol === 'concluido') {
      patch.completed_at = nowIso;
      const created = item.created_date ? new Date(item.created_date).getTime() : null;
      if (created) patch.lead_time_horas = Math.round((Date.now() - created) / 3600000);
      if (item.started_at) patch.cycle_time_horas = Math.round((Date.now() - new Date(item.started_at).getTime()) / 3600000);
    } else if (item.completed_at) {
      patch.completed_at = null;
    }

    // Histórico
    const history = [...(item.history || []), {
      date: nowIso, field: 'Coluna',
      from: BOARD_COLUMNS.find(c => c.id === effectiveColumn(item))?.label || '',
      to: BOARD_COLUMNS.find(c => c.id === newCol)?.label || '',
      user: currentUser?.full_name || '',
    }];
    patch.history = history;

    await base44.entities.AgileBacklog.update(item.id, patch);

    // Automação: Epic concluída quando todos os filhos concluídos
    if (newCol === 'concluido' && item.epic_id) {
      await maybeCompleteEpic(item.epic_id, item.id, nowIso);
    }

    refresh();
  };

  const maybeCompleteEpic = async (epicId, movedId, nowIso) => {
    const epic = allItems.find(i => i.id === epicId);
    if (!epic || effectiveColumn(epic) === 'concluido') return;
    const children = allItems.filter(i => i.epic_id === epicId && !i.is_subtask);
    const allDone = children.every(c => c.id === movedId || effectiveColumn(c) === 'concluido');
    if (children.length > 0 && allDone) {
      await base44.entities.AgileBacklog.update(epicId, {
        board_status: 'concluido', status: 'concluido', completed_at: nowIso,
      });
      toast.success(`Epic "${epic.titulo}" concluída automaticamente 🎉`);
    }
  };

  // Ações
  const openCard = (item) => { setCardItem(item); setCardOpen(true); };
  const openContext = (e, item) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, item }); };

  const handleEdit = (item) => { setEditItem(item); setEditOpen(true); };
  const handleDuplicate = async (item) => {
    const { id, created_date, updated_date, created_by_id, ...rest } = item;
    await base44.entities.AgileBacklog.create({ ...rest, titulo: `${item.titulo} (cópia)`, completed_at: null, started_at: null });
    toast.success('Item duplicado'); refresh();
  };
  const handleMoveSprint = async (item, sprintId) => {
    await base44.entities.AgileBacklog.update(item.id, { sprint_id: sprintId });
    toast.success('Item movido de sprint'); refresh();
  };
  const handleConvertBug = async (item) => {
    await base44.entities.AgileBacklog.update(item.id, { tipo: 'bug' });
    toast.success('Convertido em Bug'); refresh();
  };
  const handleCreateSubtask = (item) => { openCard(item); };
  const requestDelete = (item) => setDeleteTarget(item);
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await base44.entities.AgileBacklog.delete(deleteTarget.id);
    toast.success('Item excluído'); setDeleteTarget(null); refresh();
  };

  // Bloqueio
  const handleBlockAction = (item) => {
    if (item.bloqueado) { handleUnblock(item); return; }
    setBlockTarget(item);
  };
  const confirmBlock = async (form) => {
    await base44.entities.AgileBacklog.update(blockTarget.id, {
      bloqueado: true, status: 'bloqueado',
      bloqueio_motivo: form.motivo, bloqueio_dependencia: form.dependencia,
      bloqueio_responsavel: form.responsavel, bloqueio_previsao: form.previsao || null,
    });
    toast.success('Item bloqueado'); setBlockTarget(null); refresh();
  };
  const handleUnblock = async (item) => {
    await base44.entities.AgileBacklog.update(item.id, {
      bloqueado: false, status: BOARD_TO_STATUS[effectiveColumn(item)] || 'to_do',
      bloqueio_motivo: '', bloqueio_dependencia: '', bloqueio_responsavel: '', bloqueio_previsao: null,
    });
    toast.success('Item desbloqueado'); refresh();
  };

  // Finalizar sprint
  const confirmFinish = async () => {
    if (!activeSprint) return;
    await base44.entities.AgileSprint.update(activeSprint.id, {
      status: 'concluida',
      story_points_entregues: metrics.spDone,
    });
    toast.success('Sprint finalizada'); setFinishOpen(false); refresh();
  };

  if (!projectId) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Projeto não informado.</div>;
  }

  const health = HEALTH[metrics.health];

  return (
    <div className="min-h-screen bg-slate-900 p-6 lg:p-8 space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-600/20 flex items-center justify-center">
            <Kanban className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-white">Sprint Board</h1>
              <Badge className="bg-emerald-600/20 text-emerald-300 border border-emerald-600/30">Ágil</Badge>
              {activeSprint && <Badge variant="outline" className={health.bg + ' ' + health.color}><Heart className="w-3 h-3 mr-1" />{health.label}</Badge>}
            </div>
            <p className="text-slate-400 text-sm">{project?.name}</p>
            {activeSprint?.objetivo && <p className="text-slate-500 text-xs mt-1 max-w-xl"><TargetIcon className="w-3 h-3 inline mr-1" />{activeSprint.objetivo}</p>}
            {activeSprint && (
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-yellow-400" />Velocity: <b className="text-white">{metrics.velocity} SP</b></span>
                <span className="inline-flex items-center gap-1"><CalendarRange className="w-3.5 h-3.5 text-blue-400" />Dias restantes: <b className="text-white">{metrics.diasRestantes === null ? '—' : metrics.diasRestantes}</b></span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {sprints.length > 0 && (
            <Select value={activeSprint?.id || ''} onValueChange={setSelectedSprintId}>
              <SelectTrigger className="h-9 w-44 bg-slate-800 border-slate-700 text-slate-200"><SelectValue placeholder="Sprint" /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                {sprints.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button onClick={() => setPlanningOpen(true)} variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800"><CalendarRange className="w-4 h-4 mr-1" />Planejar Sprint</Button>
          <Button onClick={() => setFinishOpen(true)} disabled={!activeSprint} variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800"><Flag className="w-4 h-4 mr-1" />Finalizar Sprint</Button>
          <Button onClick={() => setSprintModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><CalendarPlus className="w-4 h-4 mr-1" />Nova Sprint</Button>
          <Button onClick={refresh} variant="outline" size="icon" className="border-slate-700 text-slate-200 hover:bg-slate-800"><RefreshCw className="w-4 h-4" /></Button>
          <Button disabled variant="outline" className="border-slate-700 text-slate-500 cursor-not-allowed"><Sparkles className="w-4 h-4 mr-1" />Analisar Sprint</Button>
        </div>
      </div>

      {!activeSprint ? (
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-12 text-center">
          <Kanban className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-300 font-medium">Nenhuma sprint criada ainda</p>
          <p className="text-slate-500 text-sm mb-4">Crie uma sprint e planeje os itens do Product Backlog para começar.</p>
          <Button onClick={() => setSprintModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><CalendarPlus className="w-4 h-4 mr-1" />Criar Sprint</Button>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <SprintKPIs m={metrics} />

          {/* Burndown */}
          <SprintBurndown data={burndown.data} totalSp={burndown.totalSp} />

          {/* Toolbar de filtros + swimlanes */}
          <BoardToolbar filters={filters} setFilters={setFilters} swimlane={swimlane} setSwimlane={setSwimlane} options={toolbarOptions} />

          {/* Board */}
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="space-y-5">
              {swimlanes.map(lane => {
                const cols = itemsByColumn(lane.items);
                return (
                  <div key={lane.key}>
                    {lane.label && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-slate-200">{lane.label}</span>
                        <Badge className="bg-slate-700 text-slate-300">{lane.items.length}</Badge>
                      </div>
                    )}
                    <div className="flex gap-3 overflow-x-auto pb-3">
                      {BOARD_COLUMNS.map(col => (
                        <BoardColumn
                          key={col.id}
                          column={col}
                          items={cols[col.id]}
                          epicsById={epicsById}
                          onCardClick={openCard}
                          onCardContext={openContext}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        </>
      )}

      {/* Menu de contexto */}
      {menu && (
        <BoardCardMenu
          x={menu.x} y={menu.y} item={menu.item} sprints={sprints}
          onClose={() => setMenu(null)}
          onEdit={handleEdit}
          onDuplicate={handleDuplicate}
          onMoveSprint={handleMoveSprint}
          onBlock={handleBlockAction}
          onConvertBug={handleConvertBug}
          onSubtask={handleCreateSubtask}
          onDelete={requestDelete}
        />
      )}

      {/* Modal completo do cartão */}
      <BoardCardModal
        open={cardOpen} onOpenChange={setCardOpen}
        item={cardItem} items={allItems} sprints={sprints} currentUser={currentUser}
        onChanged={refresh}
        onBlock={(it) => { setCardOpen(false); setBlockTarget(it); }}
        onUnblock={(it) => { handleUnblock(it); setCardOpen(false); }}
      />

      {/* Editar item (reaproveita modal do backlog) */}
      <BacklogItemModal
        open={editOpen} onOpenChange={setEditOpen}
        item={editItem} projectId={projectId} items={allItems} sprints={sprints}
        onSaved={refresh}
      />

      {/* Bloqueio */}
      <BlockItemModal open={!!blockTarget} onOpenChange={(o) => !o && setBlockTarget(null)} item={blockTarget} onConfirm={confirmBlock} />

      {/* Sprint modal + planning */}
      <SprintModal open={sprintModalOpen} onOpenChange={setSprintModalOpen} projectId={projectId} onSaved={refresh} />
      <SprintPlanningModal open={planningOpen} onOpenChange={setPlanningOpen} items={allItems} sprints={sprints} onSaved={refresh} />

      {/* Excluir */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Excluir "{deleteTarget?.titulo}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Finalizar sprint */}
      <AlertDialog open={finishOpen} onOpenChange={setFinishOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar sprint</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Finalizar "{activeSprint?.nome}"? Serão registrados {metrics.spDone} SP entregues. Itens não concluídos permanecem para replanejamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmFinish} className="bg-emerald-600 hover:bg-emerald-700">Finalizar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}