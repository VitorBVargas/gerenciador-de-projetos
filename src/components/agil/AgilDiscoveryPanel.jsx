import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles, Loader2, ListTodo, RefreshCw, Map, Rocket, Gauge, Layers, GitBranch,
  Clock, Users, History, ChevronDown, ChevronRight, Save
} from 'lucide-react';
import { toast } from 'sonner';
import { analyzeDiscoveryMaturity } from './discoveryMaturityAI';
import { classifyScore } from './discoveryMaturityAI';
import { gerarRoadmapDoBacklog } from './agilRoadmapAI';
import GerarBacklogIAModal from './GerarBacklogIAModal';
import TransformarAgilModal from '@/components/internal/discovery/TransformarAgilModal';

const scoreColors = {
  emerald: 'text-emerald-400', green: 'text-green-400', lime: 'text-lime-400',
  amber: 'text-amber-400', red: 'text-red-400',
};
const scoreRing = {
  emerald: '#34d399', green: '#4ade80', lime: '#a3e635', amber: '#fbbf24', red: '#f87171',
};

function ScoreGauge({ score, color }) {
  const r = 42, c = 2 * Math.PI * r, off = c - (Math.min(100, Math.max(0, score)) / 100) * c;
  return (
    <div className="relative w-28 h-28 flex-shrink-0">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={scoreRing[color]} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${scoreColors[color]}`}>{score}</span>
        <span className="text-[10px] text-slate-500">/100</span>
      </div>
    </div>
  );
}

function Est({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg bg-slate-900/60 border border-slate-700/50 px-3 py-2 text-center">
      <Icon className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
      <p className="text-lg font-bold text-white">{value ?? '—'}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}

export default function AgilDiscoveryPanel({ project, discovery, onChanged }) {
  const queryClient = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [backlogModal, setBacklogModal] = useState(false);
  const [criarProjetoModal, setCriarProjetoModal] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  const analysis = discovery?.discovery_analysis || null;
  const score = discovery?.discovery_score ?? analysis?.score ?? null;
  const cls = score != null ? classifyScore(score) : null;
  const est = analysis?.estimativa || {};
  const versoes = discovery?.versoes || [];

  const refresh = () => { queryClient.invalidateQueries({ queryKey: ['discoveries', project?.id] }); onChanged?.(); };

  const runAnalysis = async () => {
    if (!discovery) { toast.error('Selecione um Discovery.'); return; }
    setAnalyzing(true);
    try {
      const a = await analyzeDiscoveryMaturity({ project, discovery });
      if (!a) throw new Error('A IA não retornou a análise.');
      await base44.entities.Discovery.update(discovery.id, {
        discovery_score: a.score,
        discovery_analysis: {
          score: a.score, complexidade: a.complexidade, resumo_executivo: a.resumo_executivo,
          analyzed_at: new Date().toISOString(), estimativa: a.estimativa || {},
        },
      });
      toast.success('Análise concluída.');
      refresh();
    } catch (e) {
      toast.error(e?.message || 'Falha na análise de maturidade.');
    } finally { setAnalyzing(false); }
  };

  const gerarRoadmap = async () => {
    setRoadmapLoading(true);
    try {
      const r = await gerarRoadmapDoBacklog(project.id);
      toast.success(`Roadmap criado: ${r.objetivos} objetivos, ${r.iniciativas} iniciativas.`);
    } catch (e) {
      toast.error(e?.message || 'Falha ao gerar roadmap.');
    } finally { setRoadmapLoading(false); }
  };

  const salvarVersao = async () => {
    if (!discovery) return;
    setSavingVersion(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      const nova = {
        versao: (versoes[versoes.length - 1]?.versao || 0) + 1,
        data: new Date().toISOString(),
        autor: me?.full_name || '',
        descricao: `Versão salva em ${new Date().toLocaleString('pt-BR')}`,
        score: score ?? undefined,
      };
      await base44.entities.Discovery.update(discovery.id, { versoes: [...versoes, nova] });
      toast.success(`Versão ${nova.versao} registrada.`);
      refresh();
    } finally { setSavingVersion(false); }
  };

  if (!discovery) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="py-8 text-center text-slate-400 text-sm">
          Crie ou selecione um Discovery abaixo para ver o Health Score, a análise da IA e as ações.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-5 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-white font-semibold flex items-center gap-2"><Gauge className="w-4 h-4 text-emerald-400" /> Discovery Health Score</h3>
              <p className="text-xs text-slate-500">{discovery.name}</p>
            </div>
            <Button onClick={runAnalysis} disabled={analyzing} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
              {analyzing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
              {analysis ? 'Reanalisar com IA' : 'Analisar com IA'}
            </Button>
          </div>

          {!analysis ? (
            <div className="text-sm text-slate-400 bg-slate-900/40 border border-slate-700/50 rounded-lg p-4">
              Ainda não há análise de maturidade. Clique em <span className="text-emerald-400">Analisar com IA</span> para gerar o Discovery Score, a complexidade e as estimativas (épicos, features, stories, sprints, equipe e tempo).
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-5">
              <div className="flex items-center gap-4">
                <ScoreGauge score={score || 0} color={cls?.color || 'slate'} />
                <div>
                  <Badge className={`${scoreColors[cls?.color]} bg-slate-900/60 border border-slate-700`}>{cls?.label}</Badge>
                  <p className="text-xs text-slate-400 mt-1">{cls?.sub}</p>
                  {analysis.complexidade && <p className="text-sm text-slate-300 mt-2"><span className="text-slate-500">Complexidade:</span> {analysis.complexidade}</p>}
                  {est.tempo_estimado && <p className="text-sm text-slate-300"><span className="text-slate-500">Tempo estimado:</span> {est.tempo_estimado}</p>}
                </div>
              </div>
              <div className="flex-1 space-y-3">
                {analysis.resumo_executivo && <p className="text-sm text-slate-300">{analysis.resumo_executivo}</p>}
                <div className="grid grid-cols-4 gap-2">
                  <Est icon={Layers} label="Épicos" value={est.epics} />
                  <Est icon={GitBranch} label="Features" value={est.features} />
                  <Est icon={ListTodo} label="Stories" value={est.stories} />
                  <Est icon={Map} label="Sprints" value={est.sprints} />
                </div>
                {(est.equipe || []).length > 0 && (
                  <div className="flex items-start gap-2 text-sm text-slate-300">
                    <Users className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span><span className="text-slate-500">Equipe sugerida:</span> {est.equipe.join(', ')}</span>
                  </div>
                )}
                {analysis.analyzed_at && <p className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Analisado em {new Date(analysis.analyzed_at).toLocaleString('pt-BR')}</p>}
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-700/50">
            <Button onClick={() => setBacklogModal(true)} className="bg-emerald-600 hover:bg-emerald-700"><Sparkles className="w-4 h-4 mr-1" /> Gerar Product Backlog</Button>
            <Button onClick={() => setBacklogModal(true)} variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800"><RefreshCw className="w-4 h-4 mr-1" /> Atualizar Product Backlog</Button>
            <Button onClick={gerarRoadmap} disabled={roadmapLoading} variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800">
              {roadmapLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Map className="w-4 h-4 mr-1" />} Gerar Roadmap
            </Button>
            <Button onClick={() => setCriarProjetoModal(true)} variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800"><Rocket className="w-4 h-4 mr-1" /> Criar Projeto Ágil</Button>
            <Button onClick={salvarVersao} disabled={savingVersion} variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800">
              {savingVersion ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Salvar Versão
            </Button>
          </div>

          {/* Histórico de versões */}
          <div className="pt-2">
            <button onClick={() => setShowVersions(v => !v)} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white">
              {showVersions ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <History className="w-4 h-4 text-emerald-400" /> Histórico de versões
              <Badge className="bg-slate-700 text-slate-200 border-0">{versoes.length}</Badge>
            </button>
            {showVersions && (
              <div className="mt-2 space-y-1.5">
                {versoes.length === 0 ? (
                  <p className="text-xs text-slate-500 pl-6">Nenhuma versão registrada ainda. Use "Salvar Versão" para criar um ponto de restauração histórico.</p>
                ) : (
                  [...versoes].reverse().map((v, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-slate-900/50 border border-slate-700/50 rounded px-3 py-1.5">
                      <span className="text-slate-200">v{v.versao} <span className="text-slate-500">— {v.autor || 'Sistema'}</span></span>
                      <span className="text-xs text-slate-400">{v.score != null ? `Score ${v.score} · ` : ''}{v.data ? new Date(v.data).toLocaleString('pt-BR') : ''}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <GerarBacklogIAModal
        open={backlogModal}
        onOpenChange={setBacklogModal}
        project={project}
        discovery={discovery}
        onDone={refresh}
      />
      <TransformarAgilModal
        open={criarProjetoModal}
        onOpenChange={setCriarProjetoModal}
        discovery={discovery}
      />
    </>
  );
}