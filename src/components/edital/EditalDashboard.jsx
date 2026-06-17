import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import EditalTable from '@/components/edital/EditalTable';
import { X } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { AlertTriangle, Clock, CheckCircle2, Activity, CalendarOff } from 'lucide-react';

const STATUS_LABELS = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

const STATUS_COLORS = {
  pendente: '#f59e0b',
  em_andamento: '#3b82f6',
  concluido: '#10b981',
  cancelado: '#6b7280',
};

const isDone = (s = '') => {
  const sl = s.toLowerCase();
  return sl.includes('conclu') || sl.includes('entregue') || sl.includes('aprovad') || sl.includes('finaliz') || sl.includes('cancel') || sl.includes('recusad') || sl.includes('atendid');
};

const isReprovado = (s = '') => {
  const sl = s.toLowerCase();
  return sl.includes('reprov');
};

const getSemaforo = (items, today, soon) => {
  const pendingItems = items.filter(i => !isDone(i.status));
  const active = pendingItems.filter(i => i.data_prevista && i.data_prevista.length >= 10);
  const semPrazo = pendingItems.filter(i => !i.data_prevista || i.data_prevista.length < 10).length;
  const semPrazoRatio = pendingItems.length > 0 ? semPrazo / pendingItems.length : 0;

  const hasAtrasado = active.some(i => i.data_prevista && i.data_prevista < today);
  if (hasAtrasado) return { dot: '🔴', label: 'Com atraso', note: null, rowClass: 'bg-red-900/20 border-red-700/40' };

  if (semPrazoRatio > 0.7) {
    return { dot: '🟡', label: 'Em alerta', note: 'Muitos chamados sem prazo', rowClass: 'bg-yellow-900/20 border-yellow-700/40' };
  }

  const hasProximo = active.some(i => i.data_prevista && i.data_prevista >= today && i.data_prevista <= soon);
  if (hasProximo) return { dot: '🟡', label: 'Atenção (prazo próximo)', note: null, rowClass: 'bg-yellow-900/20 border-yellow-700/40' };

  return { dot: '🟢', label: 'No prazo', note: null, rowClass: 'bg-green-900/20 border-green-700/40' };
};

export default function EditalDashboard({ items }) {
  const today = new Date().toISOString().split('T')[0];
  const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [modal, setModal] = useState(null); // null | 'atrasados' | 'proximos'

  const stats = useMemo(() => {
    const active = items.filter(i => !isDone(i.status));
    return {
      total: items.length,
      atrasados: active.filter(i => i.data_prevista && i.data_prevista.length >= 10 && i.data_prevista < today).length,
      proximos: active.filter(i => i.data_prevista && i.data_prevista.length >= 10 && i.data_prevista >= today && i.data_prevista <= soon).length,
      concluidos: items.filter(i => isDone(i.status)).length,
      semPrazo: items.filter(i => !isDone(i.status) && (!i.data_prevista || i.data_prevista.length < 10)).length,
    };
  }, [items, today, soon]);

  const modalItems = useMemo(() => {
    if (!modal) return [];
    const active = items.filter(i => !isDone(i.status));
    if (modal === 'atrasados') return active.filter(i => i.data_prevista && i.data_prevista.length >= 10 && i.data_prevista < today);
    if (modal === 'proximos') return active.filter(i => i.data_prevista && i.data_prevista.length >= 10 && i.data_prevista >= today && i.data_prevista <= soon);
    if (modal === 'semPrazo') return items.filter(i => !isDone(i.status) && (!i.data_prevista || i.data_prevista.length < 10));
    if (modal === 'concluidos') return items.filter(i => isDone(i.status));
    return [];
  }, [modal, items, today, soon]);

  const byStatus = useMemo(() => {
    const map = {};
    items.forEach(i => { map[i.status] = (map[i.status] || 0) + 1; });
    return Object.entries(map).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      color: STATUS_COLORS[status] || '#64748b',
    }));
  }, [items]);

  const byVertical = useMemo(() => {
    const map = {};
    items.forEach(i => { if (i.vertical) map[i.vertical] = (map[i.vertical] || 0) + 1; });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, count]) => ({ name, count }));
  }, [items]);

  const byProject = useMemo(() => {
    const map = {};
    items.forEach(i => { if (i.projeto) map[i.projeto] = (map[i.projeto] || 0) + 1; });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name: name.length > 22 ? name.substring(0, 22) + '…' : name, count }));
  }, [items]);

  const projectSemaforos = useMemo(() => {
    const map = {};
    items.forEach(i => {
      if (!map[i.projeto]) map[i.projeto] = [];
      map[i.projeto].push(i);
    });
    return Object.entries(map).map(([name, projectItems]) => {
      const active = projectItems.filter(i => !isDone(i.status) && i.data_prevista && i.data_prevista.length >= 10);
      const contracts = [...new Set(projectItems.map(i => i.numero_contrato).filter(Boolean))];
      return {
        name,
        contrato: contracts.join(', '),
        semaforo: getSemaforo(projectItems, today, soon),
        total: projectItems.length,
        atrasados: active.filter(i => i.data_prevista < today).length,
        concluidos: projectItems.filter(i => isDone(i.status)).length,
        reprovados: projectItems.filter(i => isReprovado(i.status)).length,
        pendentes: projectItems.filter(i => !isDone(i.status)).length,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [items, today, soon]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total de Itens', value: stats.total, icon: Activity, color: 'text-blue-400', onClick: null },
          { label: 'Atrasados', value: stats.atrasados, icon: AlertTriangle, color: stats.atrasados > 0 ? 'text-red-400' : 'text-slate-400', onClick: stats.atrasados > 0 ? () => setModal('atrasados') : null },
          { label: 'Próximos do Prazo', value: stats.proximos, icon: Clock, color: stats.proximos > 0 ? 'text-yellow-400' : 'text-slate-400', onClick: stats.proximos > 0 ? () => setModal('proximos') : null },
          { label: 'Sem Prazo', value: stats.semPrazo, icon: CalendarOff, color: stats.semPrazo > 0 ? 'text-slate-300' : 'text-slate-500', onClick: stats.semPrazo > 0 ? () => setModal('semPrazo') : null },
          { label: 'Concluídos', value: stats.concluidos, icon: CheckCircle2, color: 'text-green-400', onClick: stats.concluidos > 0 ? () => setModal('concluidos') : null },
        ].map(({ label, value, icon: Icon, color, onClick }) => (
          <Card
            key={label}
            className={`bg-slate-800 border-slate-700 ${onClick ? 'cursor-pointer hover:border-slate-500 transition-colors' : ''}`}
            onClick={onClick || undefined}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`w-8 h-8 ${color} flex-shrink-0`} />
              <div>
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-slate-400">{label}</div>
              </div>
              {onClick && <span className="ml-auto text-xs text-slate-500">Ver →</span>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal atrasados / proximos */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8" onClick={() => setModal(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="text-white font-bold text-base">
                {modal === 'atrasados' ? '🔴 Itens Atrasados' : modal === 'proximos' ? '🟡 Próximos do Prazo' : modal === 'semPrazo' ? '⚪ Itens Sem Prazo' : '✅ Itens Concluídos'}
                <span className="ml-2 text-sm font-normal text-slate-400">({modalItems.length} itens)</span>
              </h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4">
              <EditalTable items={modalItems} portfolio="" showProject={true} />
            </div>
          </div>
        </div>
      )}

      {/* Semáforo por projeto */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base">🚦 Semáforo por Projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {projectSemaforos.map(p => (
              <div key={p.name} className={`flex items-center justify-between p-3 rounded-lg border ${p.semaforo.rowClass}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl flex-shrink-0">{p.semaforo.dot}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{p.name}</p>
                    {p.contrato && (
                      <p className="text-[11px] text-slate-300 truncate">Contrato: <b className="text-white">{p.contrato}</b></p>
                    )}
                    <p className="text-xs text-slate-400">{p.semaforo.label}</p>
                    {p.semaforo.note && <p className="text-[11px] text-yellow-300 truncate">{p.semaforo.note}</p>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2 space-y-0.5">
                  <p className="text-xs text-slate-300">{p.total} itens</p>
                  {p.atrasados > 0 && <p className="text-xs text-red-400 font-medium">{p.atrasados} atrasados</p>}
                  <p className="text-xs text-green-400">{p.concluidos} concluídos</p>
                  {p.reprovados > 0 && <p className="text-xs text-orange-400">{p.reprovados} reprovados</p>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Status — Pie */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Itens por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={byStatus} dataKey="value" cx="50%" cy="50%" outerRadius={72} stroke="none">
                    {byStatus.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {byStatus.map(s => (
                  <div key={s.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-xs text-slate-300 flex-1">{s.name}</span>
                    <span className="text-xs font-bold text-white">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* By Vertical */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Itens por Vertical</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byVertical} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" style={{ fontSize: '10px' }} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" style={{ fontSize: '10px' }} width={80} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* By Project */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm">Itens por Projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byProject} margin={{ left: 0, right: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: '10px' }} angle={-20} textAnchor="end" />
              <YAxis stroke="#94a3b8" style={{ fontSize: '10px' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}