import React, { useMemo, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Map, Sparkles, Loader2, GripVertical, Target, Calendar, AlertTriangle,
  Lightbulb, ChevronDown, ChevronUp, Rocket
} from 'lucide-react';
import { toast } from 'sonner';
import AgilPageHeader from '@/components/agil/AgilPageHeader';
import { computeSprintMetrics } from '@/components/agil/boardMetrics';
import { releaseHealthScore } from '@/components/agil/kpiCatalog';
import ReleaseHealthBadge from '@/components/agil/ReleaseHealthBadge';
import RoadmapItemRow from '@/components/agil/RoadmapItemRow';
import { sugerirReorganizacaoRoadmap } from '@/components/agil/roadmapReorgAI';

const statusMeta = {
  planejada: { label: 'Planejada', color: 'bg-slate-500/15 text-slate-300' },
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-500/15 text-blue-300' },
  concluida: { label: 'Concluída', color: 'bg-emerald-500/15 text-emerald-300' },
};
const impactoColor = { alto: 'text-red-300', medio: 'text-yellow-300', baixo: 'text-slate-300' };

export default function AgilRoadmap() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');
  const queryClient = useQueryClient();

  const [order, setOrder] = useState([]);
  const [collapsed, setCollapsed] = useState({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [showAi, setShowAi] = useState(false);

  const { data: project } = useQuery({
    queryKey: ['agilProject', projectId],
    enabled: !!projectId,
    queryFn: async () => (await base44.entities.Project.filter({ id: projectId }))?.[0] || null,
  });

  const { data: sprints = [] } = useQuery({
    queryKey: ['agileSprints', projectId],
    enabled: !!projectId,
    queryFn: () => base44.entities.AgileSprint.filter({ project_id: projectId }, 'ordem'),
  });

  const { data: items = [] } = useQuery({
    queryKey: ['agileBacklog', projectId],
    enabled: !!projectId,
    queryFn: () => base44.entities.AgileBacklog.filter({ project_id: projectId }, '-updated_date', 500),
  });

  useEffect(() => {
    if (sprints.length) setOrder(sprints.map(s => s.id));
  }, [sprints]);

  // Monta hierarquia Release(Sprint) → Features → Stories(+ itens soltos)
  const releases = useMemo(() => {
    const ordered = order.length
      ? order.map(id => sprints.find(s => s.id === id)).filter(Boolean)
      : sprints;
    return ordered.map(s => {
      const sprintItems = items.filter(i => i.sprint_id === s.id && !i.is_subtask);
      const m = computeSprintMetrics(sprintItems, s);
      const features = sprintItems.filter(i => i.tipo === 'feature');
      const featureTree = features.map(f => ({
        feature: f,
        children: sprintItems.filter(i => i.feature_id === f.id),
      }));
      const soltos = sprintItems.filter(i => i.tipo !== 'feature' && !i.feature_id);
      return { sprint: s, metrics: m, health: releaseHealthScore(m, s), featureTree, soltos, items: sprintItems };
    });
  }, [order, sprints, items]);

  const backlogGeral = useMemo(() => items.filter(i => !i.sprint_id && !i.is_subtask), [items]);

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const next = Array.from(order);
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    setOrder(next);
    // Persiste nova ordem
    await Promise.all(next.map((id, idx) => base44.entities.AgileSprint.update(id, { ordem: idx })));
    toast.success('Roadmap reorganizado.');
    queryClient.invalidateQueries({ queryKey: ['agileSprints', projectId] });
  };

  const analisarIA = async () => {
    setAiLoading(true);
    setShowAi(true);
    try {
      const r = await sugerirReorganizacaoRoadmap({ projectName: project?.name, releases });
      setAiResult(r);
    } catch (e) {
      toast.error('Não foi possível gerar a sugestão da IA.');
    } finally {
      setAiLoading(false);
    }
  };

  const toggle = (id) => setCollapsed(c => ({ ...c, [id]: !c[id] }));

  if (!projectId) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Projeto não informado.</div>;

  return (
    <div className="min-h-screen bg-slate-900 p-6 lg:p-8 space-y-5">
      <AgilPageHeader icon={Map} title="Roadmap Timeline" projectName={project?.name}>
        <Button onClick={analisarIA} disabled={aiLoading} className="bg-indigo-600 hover:bg-indigo-700">
          {aiLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
          Sugerir Reorganização (IA)
        </Button>
      </AgilPageHeader>

      {showAi && (
        <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-5 h-5 text-indigo-300" />
            <h2 className="text-white font-semibold">Sugestão de Reorganização</h2>
          </div>
          {aiLoading ? (
            <p className="text-sm text-slate-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Analisando dependências, riscos e valor...</p>
          ) : aiResult ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-200">{aiResult.resumo}</p>
              {aiResult.sugestoes?.map((s, i) => (
                <div key={i} className="bg-slate-800/60 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{s.titulo}</span>
                    <Badge variant="outline" className={`text-[10px] ${impactoColor[s.impacto] || 'text-slate-300'} border-current/30`}>{s.impacto}</Badge>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">{s.descricao}</p>
                </div>
              ))}
              {aiResult.riscos_identificados?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-orange-300 uppercase mb-1 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Riscos identificados</p>
                  <ul className="space-y-0.5">{aiResult.riscos_identificados.map((r, i) => <li key={i} className="text-sm text-slate-300">• {r}</li>)}</ul>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      <p className="text-xs text-slate-500">Arraste as releases pela alça para reorganizar a timeline. Estrutura: Release → Sprint → Features → Stories.</p>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="roadmap">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
              {releases.map(({ sprint, metrics, health, featureTree, soltos, items: relItems }, index) => {
                const meta = statusMeta[sprint.status] || statusMeta.planejada;
                const isCollapsed = collapsed[sprint.id];
                return (
                  <Draggable key={sprint.id} draggableId={sprint.id} index={index}>
                    {(prov, snapshot) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        className={`bg-slate-800/50 border rounded-xl overflow-hidden ${snapshot.isDragging ? 'border-emerald-500' : 'border-slate-700'}`}
                      >
                        <div className="flex items-center gap-2 p-4">
                          <div {...prov.dragHandleProps} className="text-slate-500 hover:text-slate-300 cursor-grab">
                            <GripVertical className="w-5 h-5" />
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center flex-shrink-0">
                            <Rocket className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-white font-semibold truncate">{sprint.nome}</h3>
                              <Badge className={`${meta.color} border-0 text-[10px]`}>{meta.label}</Badge>
                              <ReleaseHealthBadge score={health} />
                            </div>
                            {sprint.objetivo && <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate"><Target className="w-3 h-3" />{sprint.objetivo}</p>}
                          </div>
                          <div className="hidden sm:flex flex-col items-end gap-1 w-40 flex-shrink-0">
                            {(sprint.data_inicio || sprint.data_fim) && (
                              <span className="text-[11px] text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{sprint.data_inicio || '?'} → {sprint.data_fim || '?'}</span>
                            )}
                            <div className="w-full">
                              <Progress value={metrics.percentSprint} className="h-1.5 bg-slate-700" />
                              <p className="text-[10px] text-slate-500 text-right mt-0.5">{metrics.percentSprint}% · {metrics.sp} SP</p>
                            </div>
                          </div>
                          <button onClick={() => toggle(sprint.id)} className="text-slate-500 hover:text-white ml-1">
                            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                          </button>
                        </div>

                        {!isCollapsed && (
                          <div className="px-4 pb-3 border-t border-slate-700/50 pt-2">
                            {relItems.length === 0 && <p className="text-xs text-slate-600 py-2">Nenhum item nesta release.</p>}
                            {featureTree.map(({ feature, children }) => (
                              <div key={feature.id}>
                                <RoadmapItemRow item={feature} depth={0} />
                                {children.map(c => <RoadmapItemRow key={c.id} item={c} depth={1} />)}
                              </div>
                            ))}
                            {soltos.map(s => <RoadmapItemRow key={s.id} item={s} depth={0} />)}
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {backlogGeral.length > 0 && (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2"><Map className="w-4 h-4" /> Backlog não planejado ({backlogGeral.length})</h3>
          <div>
            {backlogGeral.slice(0, 12).map(i => <RoadmapItemRow key={i.id} item={i} depth={0} />)}
            {backlogGeral.length > 12 && <p className="text-xs text-slate-600 pl-2 pt-1">+{backlogGeral.length - 12} itens no Product Backlog.</p>}
          </div>
        </div>
      )}
    </div>
  );
}