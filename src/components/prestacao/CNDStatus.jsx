import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2, Edit2 } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { useCurrentUser, canEditProject } from '@/lib/permissions';

// Avalia risco de perder CND baseado nas obrigações legais
export function avaliarRiscoCND(obrigacoes) {
  if (!obrigacoes || obrigacoes.length === 0) return { nivel: 'indefinido', motivos: [] };

  const motivos = [];
  const rejeitados = obrigacoes.filter(o => o.status === 'rejeitado');
  const atrasados = obrigacoes.filter(o => {
    if (o.status === 'aceito' || o.status === 'enviado') return false;
    if (!o.data_limite) return false;
    return differenceInDays(parseISO(o.data_limite), new Date()) < 0;
  });
  const proximosPrazo = obrigacoes.filter(o => {
    if (o.status === 'aceito' || o.status === 'enviado') return false;
    if (!o.data_limite) return false;
    const days = differenceInDays(parseISO(o.data_limite), new Date());
    return days >= 0 && days <= 7;
  });

  if (rejeitados.length > 0) motivos.push(`${rejeitados.length} obrigação(ões) rejeitada(s): ${rejeitados.map(o => `${o.nome} (${o.competencia})`).join(', ')}`);
  if (atrasados.length > 0) motivos.push(`${atrasados.length} obrigação(ões) em atraso: ${atrasados.map(o => `${o.nome} (${o.competencia})`).join(', ')}`);
  if (proximosPrazo.length > 0) motivos.push(`${proximosPrazo.length} obrigação(ões) com prazo em até 7 dias`);

  let nivel = 'baixo';
  if (rejeitados.length > 0 || atrasados.length >= 2) nivel = 'alto';
  else if (atrasados.length > 0 || proximosPrazo.length > 0) nivel = 'medio';

  return { nivel, motivos, rejeitados: rejeitados.length, atrasados: atrasados.length, proximosPrazo: proximosPrazo.length };
}

const RISCO_CFG = {
  baixo: { label: 'Baixo risco CND', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle2 },
  medio: { label: 'Atenção — risco moderado CND', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', icon: AlertTriangle },
  alto: { label: 'RISCO ALTO de perda CND', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: ShieldAlert },
  indefinido: { label: 'Sem dados suficientes', color: 'text-slate-400', bg: 'bg-slate-700/40 border-slate-600/30', icon: Shield },
};

export function RiscoCNDBadge({ obrigacoes, compact = false }) {
  const risco = avaliarRiscoCND(obrigacoes);
  const cfg = RISCO_CFG[risco.nivel];
  const Icon = cfg.icon;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {cfg.label}
      </span>
    );
  }

  return (
    <div className={`rounded-xl border p-3 ${cfg.bg}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${cfg.color}`} />
        <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
      </div>
      {risco.motivos.length > 0 && (
        <ul className="space-y-0.5 mt-1">
          {risco.motivos.map((m, i) => (
            <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
              <span className="mt-0.5 shrink-0">•</span>{m}
            </li>
          ))}
        </ul>
      )}
      {risco.motivos.length === 0 && (
        <p className="text-xs text-slate-400">Todas as obrigações em dia.</p>
      )}
    </div>
  );
}

export default function CNDStatusCard({ project, obrigacoes = [] }) {
  const { user: currentUser } = useCurrentUser();
  const canEdit = canEditProject(currentUser);
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const cndAtiva = project?.cnd_ativa !== false; // default true if not set

  const toggleCND = async () => {
    if (!canEdit) return;
    setSaving(true);
    await base44.entities.Project.update(project.id, { cnd_ativa: !cndAtiva });
    queryClient.invalidateQueries(['project', project.id]);
    setSaving(false);
  };

  const risco = avaliarRiscoCND(obrigacoes);

  return (
    <Card className={`border ${cndAtiva ? 'border-emerald-500/40 bg-emerald-900/10' : 'border-red-500/40 bg-red-900/10'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {cndAtiva
              ? <ShieldCheck className="w-8 h-8 text-emerald-400 flex-shrink-0" />
              : <ShieldAlert className="w-8 h-8 text-red-400 flex-shrink-0" />
            }
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Certidão CND</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cndAtiva ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                  {cndAtiva ? '✓ ATIVA' : '✗ INATIVA'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Certidão Negativa de Débitos</p>
            </div>
          </div>
          {canEdit && (
            <button
              onClick={toggleCND}
              disabled={saving}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                cndAtiva
                  ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
              }`}
            >
              {saving ? '...' : cndAtiva ? 'Marcar como Inativa' : 'Marcar como Ativa'}
            </button>
          )}
        </div>

        {/* Risco de perda */}
        <div className="mt-3">
          <RiscoCNDBadge obrigacoes={obrigacoes} />
        </div>
      </CardContent>
    </Card>
  );
}