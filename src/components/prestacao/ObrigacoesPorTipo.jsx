import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, AlertTriangle, XCircle, FileText, Plus, Calendar, ChevronDown, ChevronUp, Trash2, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';
import ObrigacaoModal from './ObrigacaoModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STATUS_CFG = {
  nao_iniciado: { label: 'Pendente', color: 'text-slate-400', bg: 'bg-slate-700/60', icon: Clock },
  em_elaboracao: { label: 'Em elaboração', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/30', icon: FileText },
  enviado: { label: 'Enviado', color: 'text-blue-400', bg: 'bg-blue-500/10 border border-blue-500/30', icon: CheckCircle },
  aceito: { label: 'Aceito', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border border-emerald-500/30', icon: CheckCircle },
  rejeitado: { label: 'Rejeitado', color: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30', icon: XCircle },
};

function getSemaforo(o) {
  if (o.status === 'aceito') return 'aceito';
  if (!o.data_limite) return null;
  const days = differenceInDays(parseISO(o.data_limite), new Date());
  if (days < 0) return 'vermelho';
  if (days <= 7) return 'amarelo';
  return 'verde';
}

// Considera "com registro" apenas competências que tenham algum dado de fato preenchido,
// e não os registros padrão vazios criados automaticamente (status nao_iniciado e sem dados).
function temRegistro(o) {
  if (!o.id) return false;
  return (o.status && o.status !== 'nao_iniciado')
    || !!o.responsavel || !!o.data_limite || !!o.data_envio || !!o.observacoes;
}

function StatusCell({ obrigacao }) {
  const cfg = STATUS_CFG[obrigacao.status] || STATUS_CFG.nao_iniciado;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function PrazoCell({ obrigacao }) {
  const sem = getSemaforo(obrigacao);
  if (sem === 'aceito') return <span className="text-xs text-emerald-400">✓</span>;
  if (!obrigacao.data_limite) return <span className="text-xs text-slate-500">—</span>;
  const days = differenceInDays(parseISO(obrigacao.data_limite), new Date());
  const color = days < 0 ? 'text-red-400' : days <= 7 ? 'text-yellow-400' : 'text-emerald-400';
  return (
    <span className={`text-xs font-semibold ${color}`}>
      {days < 0 ? `${Math.abs(days)}d atr.` : days === 0 ? 'Hoje' : `${days}d`}
    </span>
  );
}

export default function ObrigacoesPorTipo({ obrigacoes, projectId, currentUser }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState({}); // Track expanded state per obligation type — fechados por padrão

// Obrigações anuais: têm apenas 1 competência (janeiro do ano seguinte ao exercício)
const OBRIGACOES_ANUAIS = ['DECASP', 'Balancete 13'];

  // Get current year from data or use current year
  const years = useMemo(() => {
    const yrs = new Set(obrigacoes.map(o => {
      const [, y] = (o.competencia || '').split('/');
      return y;
    }));
    const currentYear = new Date().getFullYear().toString();
    yrs.add(currentYear);
    return Array.from(yrs).sort().reverse();
  }, [obrigacoes]);
  
  const [selectedYear, setSelectedYear] = useState(years[0] || new Date().getFullYear().toString());

  // Generate all 12 months for the selected year
  const allMonths = useMemo(() => {
    const months = [];
    for (let i = 1; i <= 12; i++) {
      months.push(`${String(i).padStart(2, '0')}/${selectedYear}`);
    }
    return months;
  }, [selectedYear]);

  // Group by nome (type), filtered by selected year, ensuring all 12 months exist
  const grouped = useMemo(() => {
    const map = {};
    
    // First, collect existing obligations for this year.
    // Obrigações anuais pertencem ao exercício anterior (competência = jan do ano seguinte).
    const anoSeguinte = String(Number(selectedYear) + 1);
    obrigacoes.forEach(o => {
      const [, y] = (o.competencia || '').split('/');
      const isAnual = OBRIGACOES_ANUAIS.includes(o.nome);
      const pertence = isAnual ? y === anoSeguinte : y === selectedYear;
      if (!pertence) return;
      if (!map[o.nome]) map[o.nome] = {};
      map[o.nome][o.competencia] = o;
    });
    
    // Para obrigações anuais (DECASP, Balancete 13): apenas janeiro do ano seguinte ao exercício
    const competenciaAnual = `01/${Number(selectedYear) + 1}`;

    // Ensure the right competências exist for each obligation type
    Object.keys(map).forEach(nome => {
      const meses = OBRIGACOES_ANUAIS.includes(nome) ? [competenciaAnual] : allMonths;
      meses.forEach(month => {
        if (!map[nome][month]) {
          // Create placeholder for missing month
          map[nome][month] = {
            competencia: month,
            status: 'nao_iniciado',
            project_id: projectId
          };
        }
      });
    });
    
    // Convert back to arrays sorted by competência
    const result = {};
    Object.keys(map).forEach(nome => {
      const meses = OBRIGACOES_ANUAIS.includes(nome) ? [`01/${Number(selectedYear) + 1}`] : allMonths;
      result[nome] = meses.map(month => map[nome][month]);
    });
    
    return result;
  }, [obrigacoes, selectedYear, allMonths, projectId]);

  const nomes = Object.keys(grouped).sort();

  const toggleExpand = (nome) => setExpanded(p => ({ ...p, [nome]: !p[nome] }));

  const handleSave = async (data) => {
    if (editing?.id) {
      await base44.entities.ObrigacaoLegal.update(editing.id, data);
    } else {
      await base44.entities.ObrigacaoLegal.create({ ...data, project_id: projectId });
    }
    queryClient.invalidateQueries(['obrigacoes', projectId]);
  };

  const handleDelete = async (id) => {
    await base44.entities.ObrigacaoLegal.delete(id);
    queryClient.invalidateQueries(['obrigacoes', projectId]);
  };

  const handleStatusChange = async (o, newStatus, nome) => {
    const tipoNome = o.nome || nome;
    if (!tipoNome) return; // nunca cria registro sem nome de obrigação
    if (!o.id) {
      // placeholder — create new record para o tipo correto
      await base44.entities.ObrigacaoLegal.create({ nome: tipoNome, competencia: o.competencia, status: newStatus, project_id: projectId });
    } else {
      await base44.entities.ObrigacaoLegal.update(o.id, { status: newStatus });
    }
    queryClient.invalidateQueries(['obrigacoes', projectId]);
  };

  const openNew = (nome) => {
    const now = new Date();
    const comp = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    setEditing({ nome, competencia: comp, status: 'nao_iniciado', project_id: projectId });
    setModalOpen(true);
  };

  // Edita uma competência específica. Para placeholders (sem id), garante nome/competência
  // para que o salvamento crie/atualize apenas o registro daquela competência.
  const openEdit = (o, nome) => {
    setEditing({ ...o, nome: o.nome || nome, project_id: projectId });
    setModalOpen(true);
  };

  // Summary stats per type
  const getTypeSummary = (items) => {
    const aceitos = items.filter(o => o.status === 'aceito').length;
    const rejeitados = items.filter(o => o.status === 'rejeitado').length;
    const atrasados = items.filter(o => getSemaforo(o) === 'vermelho').length;
    const last = items[0];
    return { aceitos, rejeitados, atrasados, total: items.length, last };
  };

  const currentYearIdx = years.indexOf(selectedYear);
  const canGoPrev = currentYearIdx < years.length - 1;
  const canGoNext = currentYearIdx > 0;

  const addNewYear = () => {
    const maxYear = Math.max(...years.map(Number));
    const newYear = String(maxYear + 1);
    setSelectedYear(newYear);
  };

  return (
    <div className="space-y-4">
      {/* Year selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-400">Exercício:</span>
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg px-1">
            <button
              onClick={() => canGoPrev && setSelectedYear(years[currentYearIdx + 1])}
              disabled={!canGoPrev}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-white font-semibold text-sm px-2 min-w-[48px] text-center">{selectedYear}</span>
            <button
              onClick={() => canGoNext && setSelectedYear(years[currentYearIdx - 1])}
              disabled={!canGoNext}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={addNewYear} className="border-slate-600 text-slate-300 hover:bg-slate-700 gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Novo Exercício
        </Button>
      </div>
      {nomes.map(nome => {
        const items = grouped[nome];
        const { aceitos, rejeitados, atrasados, total, last } = getTypeSummary(items);
        const hasAlert = atrasados > 0 || rejeitados > 0;
        const isExpanded = expanded[nome] === true; // Fechado por padrão

        return (
          <Card key={nome} className={`border ${hasAlert ? 'border-red-500/30 bg-slate-800/80' : 'border-slate-700/50 bg-slate-800/60'}`}>
            {/* Header row - clickable to expand/collapse */}
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-700/20 transition-colors rounded-t-lg"
              onClick={() => toggleExpand(nome)}
            >
              <div className="flex items-center gap-3">
                {hasAlert
                  ? <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  : aceitos === total
                    ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    : <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                }
                <span className="font-semibold text-white">{nome}</span>
                <span className="text-xs text-slate-500">{total} {total === 1 ? 'registro' : 'registros'}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 text-xs">
                  <span className="text-emerald-400">{aceitos} aceitos</span>
                  {rejeitados > 0 && <span className="text-red-400">{rejeitados} rejeit.</span>}
                  {atrasados > 0 && <span className="text-red-400 animate-pulse">{atrasados} atrasados</span>}
                </div>
                {last && <StatusCell obrigacao={last} />}
                <button
                  onClick={(e) => { e.stopPropagation(); openNew(nome); }}
                  className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                  title="Adicionar competência"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </div>

            {/* Table - expandable */}
            {isExpanded && (
              <CardContent className="px-0 pb-0 pt-0">
                <div className="border-t border-slate-700/50 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-900/60 text-xs text-slate-400 uppercase tracking-wider">
                        <th className="px-4 py-2 text-left">Competência</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-left">Responsável</th>
                        <th className="px-4 py-2 text-left">Data Limite</th>
                        <th className="px-4 py-2 text-left">Data Envio</th>
                        <th className="px-4 py-2 text-left">Prazo</th>
                        <th className="px-4 py-2 text-left">Observações</th>
                        <th className="px-4 py-2 w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(o => {
                        const sem = getSemaforo(o);
                        const rowBg = sem === 'vermelho' ? 'bg-red-500/5' : sem === 'amarelo' ? 'bg-yellow-500/5' : '';
                        return (
                          <tr key={o.competencia} className={`border-t border-slate-700/30 hover:bg-slate-700/20 transition-colors ${rowBg}`}>
                            <td className="px-4 py-2.5 font-medium text-white">{o.competencia}</td>
                            <td className="px-4 py-2.5">
                             <select
                               value={o.status || 'nao_iniciado'}
                               onChange={e => handleStatusChange(o, e.target.value, nome)}
                               className={`text-xs font-medium rounded-full px-2 py-0.5 border cursor-pointer bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 ${STATUS_CFG[o.status]?.color || 'text-slate-400'} ${STATUS_CFG[o.status]?.bg || 'bg-slate-700/60'}`}
                             >
                               {Object.entries(STATUS_CFG).map(([val, cfg]) => (
                                 <option key={val} value={val} className="bg-slate-800 text-white">{cfg.label}</option>
                               ))}
                             </select>
                            </td>
                            <td className="px-4 py-2.5 text-slate-300">{o.responsavel || '—'}</td>
                            <td className="px-4 py-2.5 text-slate-300">
                             {o.data_limite ? format(parseISO(o.data_limite), 'dd/MM/yyyy') : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-slate-300">
                             {o.data_envio ? format(parseISO(o.data_envio), 'dd/MM/yyyy') : '—'}
                            </td>
                            <td className="px-4 py-2.5"><PrazoCell obrigacao={o} /></td>
                            <td className="px-4 py-2.5 text-slate-400 max-w-[160px]">
                             <span className="truncate block text-xs">{o.observacoes || '—'}</span>
                            </td>
                            <td className="px-4 py-2.5">
                             <div className="flex items-center gap-1">
                               <button onClick={() => openEdit(o, nome)} className="p-1 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors" title="Editar competência">
                                 <Edit className="w-3.5 h-3.5" />
                               </button>
                               {temRegistro(o) && (
                                 <button onClick={() => { if (confirm(`Remover a competência ${o.competencia} de ${nome}?`)) handleDelete(o.id); }} className="p-1 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title="Remover competência">
                                   <Trash2 className="w-3.5 h-3.5" />
                                 </button>
                               )}
                             </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      <ObrigacaoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        obrigacao={editing}
        onSave={handleSave}
        currentUser={currentUser}
      />
    </div>
  );
}