import React from 'react';
import {
  ListTodo, Target, CheckCircle2, Loader, Lock, Bug, Timer, Repeat, TrendingUp, Gauge, CalendarClock, Percent
} from 'lucide-react';

const Kpi = ({ icon: Icon, label, value, sub, tone = 'slate' }) => {
  const tones = {
    slate: 'text-slate-300 bg-slate-500/15',
    emerald: 'text-emerald-300 bg-emerald-500/15',
    blue: 'text-blue-300 bg-blue-500/15',
    yellow: 'text-yellow-300 bg-yellow-500/15',
    red: 'text-red-300 bg-red-500/15',
    indigo: 'text-indigo-300 bg-indigo-500/15',
    cyan: 'text-cyan-300 bg-cyan-500/15',
    orange: 'text-orange-300 bg-orange-500/15',
  };
  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-[11px] text-slate-400 leading-tight">{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      {sub && <p className="text-[10px] text-slate-500">{sub}</p>}
    </div>
  );
};

export default function SprintKPIs({ m }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <Kpi icon={ListTodo} label="Itens da Sprint" value={m.total} tone="slate" />
      <Kpi icon={Target} label="Story Points" value={m.sp} sub={`${m.spRest} restantes`} tone="indigo" />
      <Kpi icon={CheckCircle2} label="Concluídos" value={m.done} sub={`${m.spDone} SP`} tone="emerald" />
      <Kpi icon={Loader} label="Em andamento" value={m.emAndamento} tone="yellow" />
      <Kpi icon={Lock} label="Bloqueados" value={m.bloqueados} tone="red" />
      <Kpi icon={Bug} label="Bugs" value={m.bugs} tone="red" />
      <Kpi icon={Timer} label="Lead Time" value={`${m.leadTime}h`} tone="blue" />
      <Kpi icon={Repeat} label="Cycle Time" value={`${m.cycleTime}h`} tone="cyan" />
      <Kpi icon={TrendingUp} label="Throughput" value={m.throughput} sub="itens entregues" tone="emerald" />
      <Kpi icon={Gauge} label="Capacidade Util." value={`${m.capacidadeUtilizada}%`} sub={`${m.tempoGasto}h / ${m.capacidade}h`} tone="orange" />
      <Kpi icon={CalendarClock} label="Dias Restantes" value={m.diasRestantes === null ? '—' : m.diasRestantes} tone="blue" />
      <Kpi icon={Percent} label="Percentual Sprint" value={`${m.percentSprint}%`} tone="emerald" />
    </div>
  );
}