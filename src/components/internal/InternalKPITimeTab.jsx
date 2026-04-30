import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts';
import { Clock, TrendingUp, Activity, Target, Users, CheckSquare } from 'lucide-react';
import KPICard from '../reports/KPICard';
import { phaseLabels } from '../timeline/phaseLabels';

const verticalLabels = {
  arrecadacao: 'Arrecadação',
  compras: 'Compras',
  contabil: 'Contábil',
  pessoal: 'Pessoal',
  educacao: 'Educação',
  iss: 'ISS',
  parceiros: 'Parceiros',
  plataforma: 'Plataforma',
  saude: 'Saúde',
  gerenciamento: 'Gerenciamento'
};

export default function InternalKPITimeTab({ projectId }) {
  const [selectedKPI, setSelectedKPI] = useState(null);
  const [kpiTimeVertical, setKpiTimeVertical] = useState('all');

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', projectId],
    queryFn: () => projectId ? base44.entities.ProjectActivity.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const kpiTimeVerticals = useMemo(() => {
    const verts = new Set();
    activities.forEach(a => { if (a.vertical) verts.add(a.vertical); });
    return Array.from(verts).sort();
  }, [activities]);

  const activityMetrics = useMemo(() => {
    const filteredActivities = kpiTimeVertical === 'all'
      ? activities
      : activities.filter(a => a.vertical === kpiTimeVertical);

    if (!filteredActivities.length) return {
      leadTime: 0, cycleTime: 0, velocity: 0,
      throughput: 0, analystsCount: 0, analystProductivity: [], avgProductivity: 0,
      burndownData: [], velocityData: [], sampleTasks: [], pessoasPorEtapa: [], avgPessoasPorEtapa: 0
    };

    const doneActivities = filteredActivities.filter(a => a.status === 'done' || a.status === 'concluido');

    const phaseAssigneesMap = {};
    filteredActivities.forEach(a => {
      if (a.phase && a.assignee) {
        if (!phaseAssigneesMap[a.phase]) phaseAssigneesMap[a.phase] = new Set();
        phaseAssigneesMap[a.phase].add(a.assignee);
      }
    });

    const pessoasPorEtapa = Object.entries(phaseAssigneesMap)
      .map(([phase, assignees]) => ({ phase, count: assignees.size }))
      .sort((a, b) => b.count - a.count);

    const totalPessoasNasEtapas = pessoasPorEtapa.reduce((acc, curr) => acc + curr.count, 0);
    const avgPessoasPorEtapa = pessoasPorEtapa.length > 0 ? Math.round((totalPessoasNasEtapas / pessoasPorEtapa.length) * 10) / 10 : 0;
    const throughput = doneActivities.length;

    let totalLeadTime = 0, leadTimeCount = 0;
    let totalCycleTime = 0, cycleTimeCount = 0;

    const analystMap = {};
    const allAnalysts = new Set();
    filteredActivities.forEach(a => { if (a.assignee) allAnalysts.add(a.assignee); });

    doneActivities.forEach(act => {
      if (act.assignee) analystMap[act.assignee] = (analystMap[act.assignee] || 0) + 1;
      if (act.created_date && act.updated_date) {
        const lead = new Date(act.updated_date).getTime() - new Date(act.created_date).getTime();
        totalLeadTime += lead;
        leadTimeCount++;
      }
      if (act.start_date && act.end_date) {
        const cycle = new Date(act.end_date).getTime() - new Date(act.start_date).getTime();
        if (cycle >= 0) {
          totalCycleTime += cycle;
          cycleTimeCount++;
        }
      }
    });

    const analystProductivity = Object.entries(analystMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    const analystsCount = allAnalysts.size;
    const avgProductivity = analystsCount > 0 ? Math.round((throughput / analystsCount) * 10) / 10 : 0;

    const avgLeadTime = leadTimeCount ? Math.round(totalLeadTime / leadTimeCount / (1000 * 60 * 60 * 24)) : 0;
    const avgCycleTime = cycleTimeCount ? Math.round(totalCycleTime / cycleTimeCount / (1000 * 60 * 60 * 24)) : 0;

    const velocityMap = {};
    doneActivities.forEach(act => {
      if (act.updated_date) {
        const date = new Date(act.updated_date);
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        const weekKey = `Sem ${weekNum}`;
        velocityMap[weekKey] = (velocityMap[weekKey] || 0) + 1;
      }
    });

    const velocityData = Object.entries(velocityMap)
      .map(([week, count]) => ({ week, concluidas: count }))
      .sort((a, b) => parseInt(a.week.replace('Sem ', '')) - parseInt(b.week.replace('Sem ', '')));

    const avgVelocity = velocityData.length ? Math.round(doneActivities.length / velocityData.length) : 0;

    const dates = filteredActivities
      .map(a => a.created_date ? new Date(a.created_date).toISOString().split('T')[0] : null)
      .filter(Boolean)
      .sort();

    let burndownData = [];
    if (dates.length > 0) {
      const startDate = new Date(dates[0]);
      const endDate = new Date();
      let currentDate = new Date(startDate);
      const totalCreated = filteredActivities.length;
      const totalDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
      const dailyBurn = totalCreated / totalDays;
      let dayCount = 0;
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const doneUpToDate = doneActivities.filter(a => a.updated_date && a.updated_date.split('T')[0] <= dateStr).length;
        burndownData.push({
          date: currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          restantes: totalCreated - doneUpToDate,
          ideal: Math.max(0, Math.round(totalCreated - (dailyBurn * dayCount)))
        });
        currentDate.setDate(currentDate.getDate() + 1);
        dayCount++;
      }
    }

    return {
      leadTime: avgLeadTime,
      cycleTime: avgCycleTime,
      velocity: avgVelocity,
      throughput,
      analystsCount,
      analystProductivity,
      avgProductivity,
      burndownData,
      velocityData,
      sampleTasks: doneActivities.slice(0, 5),
      pessoasPorEtapa,
      avgPessoasPorEtapa
    };
  }, [activities, kpiTimeVertical]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">KPI / Indicadores</h1>
        <p className="text-slate-400 mt-1">Métricas de desempenho do time</p>
      </div>

      <div className="flex items-center justify-between bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
        <h2 className="text-white font-medium">Filtro de Vertical</h2>
        <select
          value={kpiTimeVertical}
          onChange={(e) => { setKpiTimeVertical(e.target.value); setSelectedKPI(null); }}
          className="bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2 outline-none focus:border-indigo-500 transition-colors"
        >
          <option value="all">Todas as Verticais</option>
          {kpiTimeVerticals.map(v => (
            <option key={v} value={v}>{verticalLabels[v] || v}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard title="Lead Time Médio" value={`${activityMetrics.leadTime}d`} subtitle="Criação até Conclusão" icon={Clock} color="blue"
          onClick={() => setSelectedKPI(selectedKPI === 'lead_time' ? null : 'lead_time')} isSelected={selectedKPI === 'lead_time'} />
        <KPICard title="Cycle Time Médio" value={`${activityMetrics.cycleTime}d`} subtitle="Início até Conclusão" icon={Activity} color="purple"
          onClick={() => setSelectedKPI(selectedKPI === 'cycle_time' ? null : 'cycle_time')} isSelected={selectedKPI === 'cycle_time'} />
        <KPICard title="Velocidade Média" value={activityMetrics.velocity} subtitle="Tarefas por semana" icon={TrendingUp} color="green"
          onClick={() => setSelectedKPI(selectedKPI === 'velocidade_time' ? null : 'velocidade_time')} isSelected={selectedKPI === 'velocidade_time'} />
        <KPICard title="Throughput" value={activityMetrics.throughput} subtitle="Total de tarefas concluídas" icon={CheckSquare} color="orange"
          onClick={() => setSelectedKPI(selectedKPI === 'throughput' ? null : 'throughput')} isSelected={selectedKPI === 'throughput'} />
        <KPICard title="Produtividade" value={activityMetrics.avgProductivity} subtitle="Tarefas / Analista" icon={Target} color="cyan"
          onClick={() => setSelectedKPI(selectedKPI === 'produtividade' ? null : 'produtividade')} isSelected={selectedKPI === 'produtividade'} />
        <KPICard title="Analistas" value={activityMetrics.analystsCount} subtitle="Total na vertical" icon={Users} color="yellow"
          onClick={() => setSelectedKPI(selectedKPI === 'analistas' ? null : 'analistas')} isSelected={selectedKPI === 'analistas'} />
      </div>

      {selectedKPI && (
        <Card className="bg-slate-800/80 border-indigo-500/30 ring-1 ring-indigo-500/20">
          <CardContent className="p-6">
            {selectedKPI === 'lead_time' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2"><Clock className="w-5 h-5 text-blue-400" /><h3 className="text-lg font-medium text-white">Lead Time Médio</h3></div>
                <p className="text-slate-300 text-sm">Tempo total desde a criação da atividade até a conclusão. Mede o tempo de resposta do time.</p>
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 mt-4">
                  <h4 className="text-white font-medium mb-3">Exemplos de Tarefas Concluídas</h4>
                  <div className="space-y-2">
                    {activityMetrics.sampleTasks.map(t => (
                      <div key={t.id} className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                        <span className="text-slate-300">{t.title}</span>
                        <Badge className="bg-slate-800 text-slate-400 border-none font-normal">{t.assignee || 'Sem responsável'}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {selectedKPI === 'cycle_time' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2"><Activity className="w-5 h-5 text-purple-400" /><h3 className="text-lg font-medium text-white">Cycle Time Médio</h3></div>
                <p className="text-slate-300 text-sm">Tempo entre início e conclusão da atividade. Mede o tempo de execução.</p>
              </div>
            )}
            {selectedKPI === 'velocidade_time' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-5 h-5 text-green-400" /><h3 className="text-lg font-medium text-white">Velocidade Média</h3></div>
                <p className="text-slate-300 text-sm">Média de tarefas concluídas por semana, considerando semanas ativas.</p>
              </div>
            )}
            {selectedKPI === 'throughput' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2"><CheckSquare className="w-5 h-5 text-orange-400" /><h3 className="text-lg font-medium text-white">Throughput</h3></div>
                <p className="text-slate-300 text-sm">Quantidade absoluta de tarefas concluídas dentro da vertical selecionada.</p>
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 mt-4">
                  <p className="text-2xl font-bold text-white mb-1">{activityMetrics.throughput}</p>
                  <p className="text-xs text-slate-500">Tarefas entregues até o momento.</p>
                </div>
              </div>
            )}
            {selectedKPI === 'produtividade' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2"><Target className="w-5 h-5 text-cyan-400" /><h3 className="text-lg font-medium text-white">Produtividade por Analista</h3></div>
                <p className="text-slate-300 text-sm">Quantidade de tarefas concluídas por cada analista.</p>
                <div className="space-y-2 mt-4">
                  {activityMetrics.analystProductivity.length > 0 ? (
                    activityMetrics.analystProductivity.map((a, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                        <span className="text-white font-medium text-sm">{a.name}</span>
                        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">{a.count} tarefas</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500">Nenhuma tarefa concluída com responsável atribuído.</p>
                  )}
                </div>
              </div>
            )}
            {selectedKPI === 'analistas' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2"><Users className="w-5 h-5 text-yellow-400" /><h3 className="text-lg font-medium text-white">Contador de Analistas</h3></div>
                <p className="text-slate-300 text-sm">Quantidade total de analistas vinculados às tarefas do filtro atual.</p>
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 mt-4">
                  <p className="text-2xl font-bold text-white mb-1">{activityMetrics.analystsCount}</p>
                  <p className="text-xs text-slate-500">Pessoas diferentes com tarefas atribuídas.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader><CardTitle className="text-white">Burndown de Tarefas</CardTitle></CardHeader>
          <CardContent>
            {activityMetrics.burndownData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={activityMetrics.burndownData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} labelStyle={{ color: '#fff' }} />
                  <Legend />
                  <Line type="monotone" dataKey="restantes" name="Tarefas Restantes" stroke="#6366f1" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="ideal" name="Tendência Ideal" stroke="#94a3b8" strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-500">Sem dados para o Burndown</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader><CardTitle className="text-white">Velocidade do Time</CardTitle></CardHeader>
          <CardContent>
            {activityMetrics.velocityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={activityMetrics.velocityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="week" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} labelStyle={{ color: '#fff' }} />
                  <Legend />
                  <Bar dataKey="concluidas" name="Tarefas Concluídas" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-500">Sem dados de velocidade</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Pessoas por Etapa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {activityMetrics.pessoasPorEtapa.length > 0 ? (
              activityMetrics.pessoasPorEtapa.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                  <span className="text-white font-medium text-sm">{phaseLabels[p.phase] || p.phase}</span>
                  <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">{p.count} pessoa(s)</Badge>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-sm">Nenhuma etapa com analistas atribuídos.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}