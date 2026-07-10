import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell
} from 'recharts';
import {
  Package, ArrowLeft, Gauge, Rocket, Map, Bug, ListChecks, TrendingUp, Layers
} from 'lucide-react';
import AgilPageHeader from '@/components/agil/AgilPageHeader';
import { computeProductMetrics, healthLevel } from '@/components/agil/squadMetrics';

const tooltipStyle = { backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#fff' };
const DONE = ['concluido'];

function Kpi({ icon: Icon, label, value, accent }) {
  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent.bg}`}>
          <Icon className={`w-5 h-5 ${accent.text}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-white leading-tight">{value}</p>
          <p className="text-xs text-slate-400">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AgilProductDashboard() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');
  const productId = urlParams.get('product_id');
  const navigate = useNavigate();

  const { data: project } = useQuery({
    queryKey: ['agilProject', projectId],
    enabled: !!projectId,
    queryFn: async () => (await base44.entities.Project.filter({ id: projectId }))?.[0] || null,
  });

  const { data: product } = useQuery({
    queryKey: ['agilProduct', productId],
    enabled: !!productId,
    queryFn: async () => (await base44.entities.AgilProduct.filter({ id: productId }))?.[0] || null,
  });

  const { data: backlog = [] } = useQuery({
    queryKey: ['agilBacklog', projectId],
    enabled: !!projectId,
    queryFn: () => base44.entities.AgileBacklog.filter({ project_id: projectId }),
  });

  const { data: sprints = [] } = useQuery({
    queryKey: ['agilSprints', projectId],
    enabled: !!projectId,
    queryFn: () => base44.entities.AgileSprint.filter({ project_id: projectId }),
  });

  const items = useMemo(
    () => backlog.filter(b => product && (b.produto || '').trim() === (product.produto || '').trim()),
    [backlog, product]
  );

  const metrics = useMemo(
    () => product ? computeProductMetrics(product, backlog, sprints) : null,
    [product, backlog, sprints]
  );

  // Velocity por sprint (SP entregues do produto por sprint concluída/em andamento).
  const velocityData = useMemo(() => {
    const ordered = [...sprints].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    return ordered.map(s => {
      const sprintItems = items.filter(i => i.sprint_id === s.id);
      const planned = sprintItems.reduce((sum, i) => sum + (Number(i.story_points) || 0), 0);
      const done = sprintItems.filter(i => DONE.includes(i.status)).reduce((sum, i) => sum + (Number(i.story_points) || 0), 0);
      return { sprint: (s.nome || '').replace('Sprint', 'S').trim(), planejado: planned, entregue: done };
    }).filter(d => d.planejado > 0 || d.entregue > 0);
  }, [sprints, items]);

  // Evolução acumulada de conclusão de itens do produto ao longo das sprints.
  const evolutionData = useMemo(() => {
    const ordered = [...sprints].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    let acc = 0;
    return ordered.map(s => {
      const done = items.filter(i => i.sprint_id === s.id && DONE.includes(i.status)).length;
      acc += done;
      return { sprint: (s.nome || '').replace('Sprint', 'S').trim(), concluidos: acc };
    });
  }, [sprints, items]);

  const bugsData = useMemo(() => {
    const bugs = items.filter(i => i.tipo === 'bug');
    return [
      { name: 'Abertos', value: bugs.filter(b => !DONE.includes(b.status)).length },
      { name: 'Resolvidos', value: bugs.filter(b => DONE.includes(b.status)).length },
    ];
  }, [items]);

  // Roadmap = Epics/Features do produto com progresso.
  const roadmap = useMemo(() => {
    const epics = items.filter(i => i.tipo === 'epic' || i.tipo === 'feature');
    return epics.map(e => {
      const children = items.filter(i => i.epic_id === e.id || i.feature_id === e.id);
      const doneChildren = children.filter(c => DONE.includes(c.status)).length;
      const pct = children.length ? Math.round((doneChildren / children.length) * 100) : (DONE.includes(e.status) ? 100 : 0);
      return { id: e.id, titulo: e.titulo, tipo: e.tipo, pct, status: e.status };
    });
  }, [items]);

  const currentSprint = sprints.find(s => s.status === 'em_andamento');

  if (!projectId || !productId) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Produto não informado.</div>;
  if (!product) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Carregando produto...</div>;

  const hl = healthLevel(metrics.health);

  return (
    <div className="min-h-screen bg-slate-900 p-6 lg:p-8 space-y-6">
      <AgilPageHeader icon={Package} title={product.produto} projectName={project?.name}>
        <Button variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" onClick={() => navigate(createPageUrl(`AgilProducts?project_id=${projectId}`))}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
      </AgilPageHeader>

      <div className="flex flex-wrap items-center gap-2">
        {product.modulo && <Badge className="bg-emerald-500/15 text-emerald-300 border-0">{product.modulo}</Badge>}
        {product.vertical && <Badge className="bg-slate-700/60 text-slate-200 border-0">{product.vertical}</Badge>}
        <Badge className={`${hl.badge} border-0`}>Health {metrics.health}% — {hl.label}</Badge>
        {product.responsavel && <span className="text-sm text-slate-400">Responsável: {product.responsavel}</span>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi icon={Gauge} label="Velocity (SP/sprint)" value={metrics.velocity} accent={{ bg: 'bg-purple-500/15', text: 'text-purple-400' }} />
        <Kpi icon={ListChecks} label="Stories" value={metrics.stories} accent={{ bg: 'bg-emerald-500/15', text: 'text-emerald-400' }} />
        <Kpi icon={Layers} label="Features" value={metrics.features} accent={{ bg: 'bg-blue-500/15', text: 'text-blue-400' }} />
        <Kpi icon={Bug} label="Bugs abertos" value={metrics.bugsAbertos} accent={{ bg: 'bg-red-500/15', text: 'text-red-400' }} />
        <Kpi icon={Rocket} label="Sprint atual" value={currentSprint?.nome?.replace(/[^0-9]/g, '') || '—'} accent={{ bg: 'bg-cyan-500/15', text: 'text-cyan-400' }} />
        <Kpi icon={TrendingUp} label="Concluído" value={`${metrics.percentConcluido}%`} accent={{ bg: 'bg-amber-500/15', text: 'text-amber-400' }} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Gauge className="w-4 h-4 text-purple-400" /> Velocity por Sprint</h3>
            {velocityData.length === 0 ? <p className="text-slate-500 text-sm py-8 text-center">Sem sprints com itens deste produto.</p> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={velocityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="sprint" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="planejado" name="Planejado (SP)" fill="#475569" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="entregue" name="Entregue (SP)" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" /> Evolução de Entregas</h3>
            {evolutionData.length === 0 ? <p className="text-slate-500 text-sm py-8 text-center">Sem dados de evolução.</p> : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="sprint" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="concluidos" name="Itens concluídos (acum.)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Roadmap */}
        <Card className="bg-slate-800/50 border-slate-700 lg:col-span-2">
          <CardContent className="p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Map className="w-4 h-4 text-blue-400" /> Roadmap (Epics & Features)</h3>
            {roadmap.length === 0 ? <p className="text-slate-500 text-sm py-6 text-center">Nenhum epic/feature deste produto.</p> : (
              <div className="space-y-3">
                {roadmap.map(r => (
                  <div key={r.id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-200 flex items-center gap-2">
                        <Badge className={`border-0 text-[10px] ${r.tipo === 'epic' ? 'bg-purple-500/15 text-purple-300' : 'bg-blue-500/15 text-blue-300'}`}>{r.tipo}</Badge>
                        {r.titulo}
                      </span>
                      <span className="text-slate-400">{r.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${r.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bugs + Release/Sprint */}
        <div className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-5">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Bug className="w-4 h-4 text-red-400" /> Bugs</h3>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={bugsData} layout="vertical">
                  <XAxis type="number" stroke="#64748b" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={70} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    <Cell fill="#ef4444" />
                    <Cell fill="#10b981" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-5 space-y-2">
              <h3 className="text-white font-semibold flex items-center gap-2"><Rocket className="w-4 h-4 text-cyan-400" /> Sprint & Release</h3>
              <p className="text-sm text-slate-300"><span className="text-slate-500">Sprint atual:</span> {currentSprint?.nome || 'Nenhuma em andamento'}</p>
              {currentSprint?.objetivo && <p className="text-xs text-slate-400">{currentSprint.objetivo}</p>}
              <p className="text-sm text-slate-300"><span className="text-slate-500">Última sprint do produto:</span> {metrics.ultimaSprint?.nome || '—'}</p>
              <p className="text-sm text-slate-300"><span className="text-slate-500">Débito técnico:</span> {metrics.debitoTecnico}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}