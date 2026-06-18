import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Plus, Flag, ChevronDown, ChevronUp, CheckCircle2, Clock, XCircle, History, Pencil } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { cn } from "@/lib/utils";
import CicloModal from '@/components/roadmap/CicloModal';
import ObjetivoCard from '@/components/roadmap/ObjetivoCard';
import EncerramentoCicloModal from '@/components/roadmap/EncerramentoCicloModal';
import { toast } from 'sonner';

const PERIODOS = [
  { key: '30dias', label: '30 Dias', color: 'text-blue-400', border: 'border-blue-500/40', bg: 'bg-blue-500/5' },
  { key: '60dias', label: '60 Dias', color: 'text-purple-400', border: 'border-purple-500/40', bg: 'bg-purple-500/5' },
  { key: '90dias', label: '90 Dias', color: 'text-emerald-400', border: 'border-emerald-500/40', bg: 'bg-emerald-500/5' },
];

export default function SustentacaoRoadmap() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');
  const queryClient = useQueryClient();

  const [cicloModalOpen, setCicloModalOpen] = useState(false);
  const [encerramentoOpen, setEncerramentoOpen] = useState(false);
  const [editCiclo, setEditCiclo] = useState(null);
  const [selectedCicloId, setSelectedCicloId] = useState(null);
  const [showHistorico, setShowHistorico] = useState(false);
  const [newObjetivos, setNewObjetivos] = useState({ '30dias': '', '60dias': '', '90dias': '' });

  const { data: ciclos = [] } = useQuery({
    queryKey: ['roadmapCiclos', projectId],
    queryFn: () => base44.entities.RoadmapCiclo.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: objetivos = [] } = useQuery({
    queryKey: ['roadmapObjetivos', projectId],
    queryFn: () => base44.entities.RoadmapObjetivo.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: iniciativas = [] } = useQuery({
    queryKey: ['roadmapIniciativas', projectId],
    queryFn: () => base44.entities.RoadmapIniciativa.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const ciclosAtivos = ciclos.filter(c => c.status === 'ativo').sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const ciclosEncerrados = ciclos.filter(c => c.status === 'encerrado').sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const cicloAtual = selectedCicloId
    ? ciclos.find(c => c.id === selectedCicloId)
    : ciclosAtivos[0] || null;

  const objCiclo = objetivos.filter(o => o.ciclo_id === cicloAtual?.id);
  const iniCiclo = iniciativas.filter(i => i.ciclo_id === cicloAtual?.id);

  // Progress calculations
  const calcPeriodPct = (periodo) => {
    const objs = objCiclo.filter(o => o.periodo === periodo);
    if (!objs.length) return 0;
    let total = 0, done = 0;
    objs.forEach(obj => {
      const inis = iniCiclo.filter(i => i.objetivo_id === obj.id);
      total += inis.length || 1;
      done += inis.filter(i => i.concluido).length;
    });
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  const pct30 = calcPeriodPct('30dias');
  const pct60 = calcPeriodPct('60dias');
  const pct90 = calcPeriodPct('90dias');
  const pctTotal = objCiclo.length > 0 ? Math.round((pct30 + pct60 + pct90) / 3) : 0;

  const addObjetivo = useMutation({
    mutationFn: ({ titulo, periodo }) => base44.entities.RoadmapObjetivo.create({
      project_id: projectId, ciclo_id: cicloAtual.id, titulo, periodo, status: 'pendente'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmapObjetivos', projectId] });
    }
  });

  const deleteObjetivo = useMutation({
    mutationFn: async (objId) => {
      const inis = iniCiclo.filter(i => i.objetivo_id === objId);
      await Promise.all(inis.map(i => base44.entities.RoadmapIniciativa.delete(i.id)));
      return base44.entities.RoadmapObjetivo.delete(objId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmapObjetivos', projectId] });
      queryClient.invalidateQueries({ queryKey: ['roadmapIniciativas', projectId] });
    }
  });

  const handleAddObjetivo = (periodo) => {
    const titulo = newObjetivos[periodo]?.trim();
    if (!titulo || !cicloAtual) return;
    addObjetivo.mutate({ titulo, periodo });
    setNewObjetivos(prev => ({ ...prev, [periodo]: '' }));
  };

  const diasRestantes = cicloAtual ? differenceInDays(parseISO(cicloAtual.end_date), new Date()) : 0;

  return (
    <div className="p-6 lg:p-8 space-y-6 text-white">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Roadmap de Evolução</h1>
          <p className="text-slate-400 mt-1">Ciclos de 30, 60 e 90 dias para planejamento da sustentação guiada</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowHistorico(!showHistorico)}
            className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800">
            <History className="w-4 h-4 mr-2" />
            Histórico ({ciclosEncerrados.length})
          </Button>
          <Button onClick={() => { setEditCiclo(null); setCicloModalOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Ciclo
          </Button>
        </div>
      </div>

      {/* Ciclo selector (se houver mais de um ativo) */}
      {ciclosAtivos.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {ciclosAtivos.map(c => (
            <button key={c.id} onClick={() => setSelectedCicloId(c.id)}
              className={cn("px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                cicloAtual?.id === c.id ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700")}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Sem ciclo */}
      {!cicloAtual && (
        <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-12 text-center">
          <Flag className="w-12 h-12 mx-auto text-slate-600 mb-4" />
          <p className="text-slate-300 font-medium text-lg">Nenhum ciclo ativo</p>
          <p className="text-slate-500 text-sm mt-1 mb-5">Crie um ciclo de 90 dias para iniciar o planejamento</p>
          <Button onClick={() => setCicloModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />Criar Primeiro Ciclo
          </Button>
        </div>
      )}

      {cicloAtual && (
        <>
          {/* Ciclo Atual Card */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full",
                    cicloAtual.status === 'ativo' ? "bg-green-500/20 text-green-400" : "bg-slate-600 text-slate-400")}>
                    {cicloAtual.status === 'ativo' ? '● Ativo' : 'Encerrado'}
                  </span>
                  {diasRestantes > 0 && (
                    <span className="text-xs text-slate-500">{diasRestantes} dias restantes</span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-white">{cicloAtual.name}</h2>
                <p className="text-slate-400 text-sm mt-0.5">
                  {format(parseISO(cicloAtual.start_date), 'dd/MM/yyyy')} → {format(parseISO(cicloAtual.end_date), 'dd/MM/yyyy')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => { setEditCiclo(cicloAtual); setCicloModalOpen(true); }}
                  className="border-slate-700 text-slate-300 bg-transparent hover:bg-slate-800">
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />Editar
                </Button>
                {cicloAtual.status === 'ativo' && (
                  <Button size="sm" onClick={() => setEncerramentoOpen(true)}
                    className="bg-green-700 hover:bg-green-600 text-white">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Encerrar Ciclo
                  </Button>
                )}
              </div>
            </div>

            {/* Progress Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
              {[
                { label: '30 Dias', pct: pct30, color: 'bg-blue-500' },
                { label: '60 Dias', pct: pct60, color: 'bg-purple-500' },
                { label: '90 Dias', pct: pct90, color: 'bg-emerald-500' },
                { label: 'Ciclo Geral', pct: pctTotal, color: 'bg-orange-500', highlight: true },
              ].map(item => (
                <div key={item.label} className={cn("rounded-xl p-3", item.highlight ? "bg-slate-700/80" : "bg-slate-800")}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-slate-400">{item.label}</span>
                    <span className={cn("text-sm font-bold", item.highlight ? "text-orange-400" : "text-white")}>{item.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", item.color)} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Visual */}
          <div className="bg-slate-800/30 border border-slate-700 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Timeline do Ciclo</h3>
            <div className="relative">
              {/* Track */}
              <div className="h-2 bg-slate-700 rounded-full w-full" />
              {/* Markers */}
              {[
                { pos: '33%', label: '30 dias', pct: pct30, color: 'bg-blue-500' },
                { pos: '66%', label: '60 dias', pct: pct60, color: 'bg-purple-500' },
                { pos: '100%', label: '90 dias', pct: pct90, color: 'bg-emerald-500' },
              ].map(m => (
                <div key={m.label} className="absolute top-0" style={{ left: m.pos, transform: 'translateX(-50%)' }}>
                  <div className={cn("w-2 h-2 rounded-full -mt-0", m.color)} />
                  <div className="mt-3 text-center">
                    <div className="text-xs text-slate-400">{m.label}</div>
                    <div className="text-xs font-bold text-white">{m.pct}%</div>
                  </div>
                </div>
              ))}
              {/* Progress fill */}
              <div className="absolute top-0 left-0 h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 rounded-full transition-all"
                style={{ width: `${pctTotal}%` }} />
            </div>
          </div>

          {/* Períodos / Objetivos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {PERIODOS.map(periodo => {
              const objsPeriodo = objCiclo.filter(o => o.periodo === periodo.key);
              const pct = calcPeriodPct(periodo.key);

              return (
                <div key={periodo.key} className={cn("border rounded-2xl p-4 space-y-3", periodo.border, periodo.bg)}>
                  {/* Period Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={cn("font-bold text-base", periodo.color)}>{periodo.label}</h3>
                      <p className="text-xs text-slate-500">{objsPeriodo.length} objetivos · {pct}% concluído</p>
                    </div>
                    <div className="text-right">
                      <span className={cn("text-2xl font-bold", periodo.color)}>{pct}%</span>
                    </div>
                  </div>

                  <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", periodo.color.replace('text-', 'bg-'))}
                      style={{ width: `${pct}%` }} />
                  </div>

                  {/* Objetivos */}
                  <div className="space-y-2">
                    {objsPeriodo.map(obj => (
                      <ObjetivoCard key={obj.id} objetivo={obj} projectId={projectId}
                        iniciativas={iniCiclo.filter(i => i.objetivo_id === obj.id)}
                        onDeleteObjetivo={(id) => deleteObjetivo.mutate(id)} />
                    ))}
                  </div>

                  {/* Add objetivo */}
                  <div className="flex gap-2 pt-1">
                    <Input value={newObjetivos[periodo.key]} placeholder="Novo objetivo..."
                      onChange={e => setNewObjetivos(prev => ({ ...prev, [periodo.key]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleAddObjetivo(periodo.key)}
                      className="bg-slate-800 border-slate-600 text-white h-8 text-xs" />
                    <Button size="sm" onClick={() => handleAddObjetivo(periodo.key)}
                      className="h-8 px-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300">
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Histórico */}
      {showHistorico && ciclosEncerrados.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
            <History className="w-5 h-5 text-slate-400" />
            Histórico de Roadmaps
          </h2>
          <div className="grid gap-3">
            {ciclosEncerrados.map(c => (
              <div key={c.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded-full">Encerrado</span>
                    </div>
                    <h3 className="font-semibold text-white">{c.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {format(parseISO(c.start_date), 'dd/MM/yyyy')} → {format(parseISO(c.end_date), 'dd/MM/yyyy')}
                    </p>
                    {c.resultado_final && <p className="text-xs text-slate-400 mt-1">{c.resultado_final}</p>}
                  </div>
                  <div className="text-center lg:text-right">
                    <p className="text-3xl font-bold text-emerald-400">{c.percent_concluded || 0}%</p>
                    <p className="text-xs text-slate-500">concluído</p>
                  </div>
                </div>
                {c.licoes_aprendidas && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <p className="text-xs text-slate-500 font-medium mb-1">Lições Aprendidas</p>
                    <p className="text-xs text-slate-400">{c.licoes_aprendidas}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <CicloModal open={cicloModalOpen} onOpenChange={setCicloModalOpen} projectId={projectId} ciclo={editCiclo} />
      {cicloAtual && (
        <EncerramentoCicloModal open={encerramentoOpen} onOpenChange={setEncerramentoOpen}
          ciclo={cicloAtual} projectId={projectId} percentTotal={pctTotal} />
      )}
    </div>
  );
}