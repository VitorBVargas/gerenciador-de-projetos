import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, AlertTriangle, XCircle, MinusCircle, ArrowLeft, Sparkles,
  ShieldAlert, Lightbulb, Gauge, Users, Clock, Layers, GitBranch, ListTodo, Map
} from 'lucide-react';
import { classifyScore } from './discoveryMaturityAI';

const scoreColors = {
  emerald: { ring: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-300' },
  green: { ring: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-300' },
  lime: { ring: 'text-lime-400', bg: 'bg-lime-500/10', border: 'border-lime-500/30', text: 'text-lime-300' },
  amber: { ring: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-300' },
  red: { ring: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-300' },
};

const statusConfig = {
  completo: { icon: CheckCircle2, cls: 'text-emerald-400', label: 'Completo', chip: 'bg-emerald-500/10 border-emerald-500/30' },
  parcial: { icon: AlertTriangle, cls: 'text-amber-400', label: 'Parcial', chip: 'bg-amber-500/10 border-amber-500/30' },
  pouco_detalhado: { icon: MinusCircle, cls: 'text-orange-400', label: 'Pouco detalhado', chip: 'bg-orange-500/10 border-orange-500/30' },
  nao_encontrado: { icon: XCircle, cls: 'text-red-400', label: 'Não encontrado', chip: 'bg-red-500/10 border-red-500/30' },
};

function ScoreGauge({ score, cls }) {
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.max(0, Math.min(100, score)) / 100) * circ;
  return (
    <div className="relative w-32 h-32 flex-shrink-0">
      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="10" className="text-slate-700" />
        <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} className={cls.ring} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${cls.text}`}>{score}</span>
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Discovery Score</span>
      </div>
    </div>
  );
}

export default function DiscoveryGateReview({ analysis, onBackToDiscovery, onProceed, project }) {
  if (!analysis) return null;
  const cls = classifyScore(analysis.score);
  const colors = scoreColors[cls.color] || scoreColors.amber;
  const lowScore = analysis.score < 70;
  const est = analysis.estimativa || {};

  return (
    <>
      <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1">
        <div>
          <h3 className="text-lg font-semibold text-white">Análise de Maturidade do Discovery</h3>
          <p className="text-sm text-slate-400 mt-1">
            A IA analisou todas as informações preenchidas e avaliou o nível de maturidade do Discovery antes da geração do Product Backlog.
          </p>
        </div>

        {/* Score + Classificação + Complexidade */}
        <div className={`flex flex-col sm:flex-row items-center gap-5 rounded-xl p-4 ${colors.bg} border ${colors.border}`}>
          <ScoreGauge score={analysis.score} cls={colors} />
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <Gauge className={`w-5 h-5 ${colors.ring}`} />
              <span className={`text-xl font-bold ${colors.text}`}>{cls.label}</span>
            </div>
            <p className="text-sm text-slate-300 mt-0.5">{cls.sub}</p>
            {analysis.complexidade && (
              <Badge className="mt-2 bg-slate-800 text-slate-200 border border-slate-700">Complexidade: {analysis.complexidade}</Badge>
            )}
          </div>
        </div>

        {/* Resumo Executivo */}
        {analysis.resumo_executivo && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Resumo Executivo</p>
            <p className="text-sm text-slate-300 whitespace-pre-line">{analysis.resumo_executivo}</p>
          </div>
        )}

        {/* Cards por item */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Avaliação por item</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(analysis.itens || []).map((item, i) => {
              const st = statusConfig[item.status] || statusConfig.parcial;
              const Icon = st.icon;
              return (
                <div key={i} className={`rounded-lg border p-2.5 ${st.chip}`}>
                  <p className="text-sm font-medium text-white truncate">{item.nome}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Icon className={`w-3.5 h-3.5 ${st.cls} flex-shrink-0`} />
                    <span className={`text-xs ${st.cls}`}>{st.label}</span>
                  </div>
                  {item.observacao && <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{item.observacao}</p>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Estimativas */}
        {(est.epics || est.features || est.stories || est.sprints || est.tempo_estimado || (est.equipe || []).length) && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            <p className="text-xs font-semibold text-cyan-300 uppercase tracking-wider mb-2">Estimativa do Produto</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              <div className="bg-slate-900/60 rounded px-3 py-2 border border-slate-700/60 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" /><div><p className="text-lg font-bold text-white leading-none">{est.epics ?? '—'}</p><p className="text-[10px] text-slate-400">Épicos</p></div>
              </div>
              <div className="bg-slate-900/60 rounded px-3 py-2 border border-slate-700/60 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-blue-400" /><div><p className="text-lg font-bold text-white leading-none">{est.features ?? '—'}</p><p className="text-[10px] text-slate-400">Features</p></div>
              </div>
              <div className="bg-slate-900/60 rounded px-3 py-2 border border-slate-700/60 flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-emerald-400" /><div><p className="text-lg font-bold text-white leading-none">{est.stories ?? '—'}</p><p className="text-[10px] text-slate-400">Stories</p></div>
              </div>
              <div className="bg-slate-900/60 rounded px-3 py-2 border border-slate-700/60 flex items-center gap-2">
                <Map className="w-4 h-4 text-cyan-400" /><div><p className="text-lg font-bold text-white leading-none">{est.sprints ?? '—'}</p><p className="text-[10px] text-slate-400">Sprints</p></div>
              </div>
            </div>
            {est.tempo_estimado && (
              <p className="text-sm text-slate-300 flex items-center gap-1.5 mb-2"><Clock className="w-4 h-4 text-slate-400" /> Tempo estimado: <span className="text-white">{est.tempo_estimado}</span></p>
            )}
            {(est.equipe || []).length > 0 && (
              <div className="flex items-start gap-1.5">
                <Users className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                <div className="flex flex-wrap gap-1.5">
                  {est.equipe.map((m, i) => <Badge key={i} className="bg-slate-700 text-slate-200">{m}</Badge>)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sugestões */}
        {(analysis.sugestoes || []).length > 0 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5" /> Sugestões de Melhoria</p>
            <ul className="space-y-1">
              {analysis.sugestoes.map((s, i) => <li key={i} className="text-sm text-slate-300 flex gap-2"><span className="text-amber-400">•</span>{s}</li>)}
            </ul>
          </div>
        )}

        {/* Riscos */}
        {(analysis.riscos || []).length > 0 && (
          <div className="bg-rose-500/5 border border-rose-500/30 rounded-lg p-3">
            <p className="text-xs font-semibold text-rose-300 uppercase tracking-wider mb-2 flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> Riscos identificados {lowScore && '(enviados ao Gerente de Riscos)'}</p>
            {analysis.riscos.map((r, i) => (
              <p key={i} className="text-sm text-slate-300">• {r.titulo} {(r.probabilidade || r.impacto) && <span className="text-xs text-slate-500">({r.probabilidade || '—'}/{r.impacto || '—'})</span>}</p>
            ))}
          </div>
        )}

        {lowScore && (
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-200">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            O Discovery está abaixo do nível recomendado (score {analysis.score}). Recomenda-se complementar as informações antes de gerar o backlog. Você ainda pode prosseguir sob sua responsabilidade.
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 pt-3 border-t border-slate-800">
        <Button variant="outline" onClick={onBackToDiscovery} className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Discovery
        </Button>
        {lowScore ? (
          <Button onClick={onProceed} className="bg-amber-600 hover:bg-amber-700">
            <Sparkles className="w-4 h-4 mr-2" /> Gerar Backlog Mesmo Assim
          </Button>
        ) : (
          <Button onClick={onProceed} className="bg-emerald-600 hover:bg-emerald-700">
            <Sparkles className="w-4 h-4 mr-2" /> Gerar Product Backlog
          </Button>
        )}
      </div>
    </>
  );
}