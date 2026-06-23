import React, { useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Plus, CheckCircle, Clock, AlertTriangle, XCircle, FileText, TrendingUp, Award, MessageSquare
} from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';
import ObrigacaoModal from './ObrigacaoModal';
import { useCurrentUser } from '@/lib/permissions';
import ObrigacoesPorTipo from './ObrigacoesPorTipo';
import CNDStatusCard from './CNDStatus';
import { entityMatchesObligation } from '@/lib/entityRegistry';

const OBRIGACOES_PADRAO = ['AM', 'SIOPE', 'SIOPS', 'Balancete', 'RGF', 'RREO', 'MSC', 'DECASP', 'IP', 'Balancete 13', 'Folha', 'Contratos'];
const OBRIGACOES_ANUAIS = ['DECASP', 'IP', 'Balancete 13'];

function getSemaforo(obrigacao) {
  if (obrigacao.status === 'aceito') return null;
  if (!obrigacao.data_limite) return null;
  const days = differenceInDays(parseISO(obrigacao.data_limite), new Date());
  if (days < 0) return 'vermelho';
  if (days <= 7) return 'amarelo';
  return 'verde';
}

function KPIBox({ icon: Icon, label, value, color, bg }) {
  return (
    <Card className="bg-slate-800/60 border-slate-700/50">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-slate-400">{label}</p>
          <p className="text-xl font-bold text-white">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function scoreConformidade(obrigacoes) {
  if (!obrigacoes.length) return 100;
  const total = obrigacoes.length;
  const aceitos = obrigacoes.filter(o => o.status === 'aceito').length;
  const atrasados = obrigacoes.filter(o => getSemaforo(o) === 'vermelho').length;
  const rejeitados = obrigacoes.filter(o => o.status === 'rejeitado').length;
  const score = Math.round(((aceitos / total) * 60) + ((1 - atrasados / total) * 25) + ((1 - rejeitados / total) * 15));
  return Math.min(100, Math.max(0, score));
}

export default function ObrigacoesLegais({ projectId, project, vertical = null, entity = null, allEntities = [], entityTabs = null }) {
  const { user: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const initialized = useRef(false);

  const { data: decisoes = [] } = useQuery({
    queryKey: ['decisoes', projectId],
    queryFn: () => base44.entities.Decisao.filter({ project_id: projectId }),
    enabled: !!projectId,
    staleTime: 60000,
  });

  const observacoesCriticas = useMemo(() =>
    decisoes.filter(d => d.impacto === 'alto' && d.status !== 'cancelada' && d.status !== 'concluida')
      .sort((a, b) => (b.data || '').localeCompare(a.data || '')),
    [decisoes]
  );

  const { data: allObrigacoes = [], isLoading } = useQuery({
    queryKey: ['obrigacoes', projectId],
    queryFn: () => base44.entities.ObrigacaoLegal.filter({ project_id: projectId }),
    enabled: !!projectId,
    refetchInterval: 30000,
  });

  React.useEffect(() => {
    initialized.current = false;
  }, [projectId, vertical, entity?.id]);

  const obrigacoes = useMemo(() => {
    return allObrigacoes.filter((obrigacao) => {
      const sameVertical = !vertical || (obrigacao.vertical || vertical) === vertical;
      const sameEntity = entityMatchesObligation(obrigacao, entity, allEntities);
      return sameVertical && sameEntity;
    });
  }, [allObrigacoes, vertical, entity, allEntities]);

  const initDefaults = async () => {
    const existing = obrigacoes.map(o => o.nome);
    const missing = OBRIGACOES_PADRAO.filter(nome => !existing.includes(nome));
    if (missing.length === 0) return;
    const now = new Date();
    const comp = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const compAnual = `01/${now.getFullYear() + 1}`;
    await Promise.all(missing.map(nome =>
      base44.entities.ObrigacaoLegal.create({
        project_id: projectId,
        ...(vertical ? { vertical } : {}),
        ...(entity ? { entity_id: entity.id, entity_name: entity.nome } : {}),
        nome,
        competencia: OBRIGACOES_ANUAIS.includes(nome) ? compAnual : comp,
        ordem: OBRIGACOES_PADRAO.indexOf(nome),
        status: 'nao_iniciado',
        is_padrao: true,
      })
    ));
    queryClient.invalidateQueries(['obrigacoes', projectId]);
  };

  React.useEffect(() => {
    if (!isLoading && !initialized.current) {
      const existing = obrigacoes.map(o => o.nome);
      const missing = OBRIGACOES_PADRAO.filter(nome => !existing.includes(nome));
      if (missing.length > 0) {
        initialized.current = true;
        initDefaults();
      }
    }
  }, [isLoading, obrigacoes]);

  const handleSave = async (data) => {
    if (editing?.id) {
      await base44.entities.ObrigacaoLegal.update(editing.id, {
        ...data,
        ...(entity ? { entity_id: entity.id, entity_name: entity.nome } : {}),
      });
    } else {
      await base44.entities.ObrigacaoLegal.create({
        ...data,
        project_id: projectId,
        ...(vertical ? { vertical } : {}),
        ...(entity ? { entity_id: entity.id, entity_name: entity.nome } : {}),
      });
    }
    queryClient.invalidateQueries(['obrigacoes', projectId]);
  };

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const pendentes = obrigacoes.filter(o => o.status === 'nao_iniciado').length;
  const emElaboracao = obrigacoes.filter(o => o.status === 'em_elaboracao').length;
  const enviados = obrigacoes.filter(o => o.status === 'enviado').length;
  const aceitos = obrigacoes.filter(o => o.status === 'aceito').length;
  const rejeitados = obrigacoes.filter(o => o.status === 'rejeitado').length;
  const proximosPrazo = obrigacoes.filter(o => getSemaforo(o) === 'amarelo').length;
  const score = scoreConformidade(obrigacoes);
  const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400';
  const scoreBg = score >= 80 ? 'bg-emerald-500/10' : score >= 60 ? 'bg-yellow-500/10' : 'bg-red-500/10';

  if (isLoading) {
    return <div className="flex items-center justify-center h-40"><div className="w-7 h-7 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Obrigações Legais</h2>
          <p className="text-sm text-slate-400">
            Controle de entregas obrigatórias e conformidade regulatória{entity ? ` — ${entity.nome_completo || entity.nome}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${scoreBg} border border-slate-700/50`}>
            <Award className={`w-4 h-4 ${scoreColor}`} />
            <span className="text-xs text-slate-400">Score</span>
            <span className={`text-lg font-bold ${scoreColor}`}>{score}</span>
          </div>
          <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-sm" size="sm">
            <Plus className="w-4 h-4 mr-1" /> Nova Obrigação
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPIBox icon={Clock} label="Pendentes" value={pendentes} color="text-slate-400" bg="bg-slate-700/60" />
        <KPIBox icon={FileText} label="Em elaboração" value={emElaboracao} color="text-yellow-400" bg="bg-yellow-500/10" />
        <KPIBox icon={TrendingUp} label="Enviados" value={enviados} color="text-blue-400" bg="bg-blue-500/10" />
        <KPIBox icon={CheckCircle} label="Aceitos" value={aceitos} color="text-emerald-400" bg="bg-emerald-500/10" />
        <KPIBox icon={XCircle} label="Rejeitados" value={rejeitados} color="text-red-400" bg="bg-red-500/10" />
        <KPIBox icon={AlertTriangle} label="Próx. do prazo" value={proximosPrazo} color="text-orange-400" bg="bg-orange-500/10" />
      </div>

      {project && <CNDStatusCard project={project} obrigacoes={obrigacoes} showToggle />}

      {entityTabs}

      <ObrigacoesPorTipo obrigacoes={obrigacoes} projectId={projectId} currentUser={currentUser} vertical={vertical} entity={entity} />

      {observacoesCriticas.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider">Observações Críticas</h3>
          </div>
          {observacoesCriticas.map(d => (
            <div key={d.id} className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <p className="text-sm text-white leading-relaxed">{d.descricao}</p>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400">
                {d.data && <span>{format(parseISO(d.data), 'dd/MM/yyyy')}</span>}
                {d.responsavel && <span className="font-medium text-red-300">{d.responsavel}</span>}
                <span className="capitalize">{d.status?.replace('_', ' ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <ObrigacaoModal open={modalOpen} onOpenChange={setModalOpen} obrigacao={editing} onSave={handleSave} currentUser={currentUser} />
    </div>
  );
}