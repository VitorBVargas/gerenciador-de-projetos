import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Sparkles, AlertTriangle, CheckCircle, Clock, ListChecks, Save, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const PERIODS = [
  { value: 7, label: '7 dias' },
  { value: 14, label: '14 dias' },
  { value: 30, label: '30 dias' },
];

function buildPlainText(report, stats, days) {
  const lines = [];
  lines.push(`RELATÓRIO OPERACIONAL — últimos/próximos ${days} dias`);
  lines.push('');
  lines.push('RESUMO DAS ATIVIDADES');
  lines.push(report.resumo_atividades || '');
  if (report.destaques?.length) {
    lines.push('');
    lines.push('DESTAQUES');
    report.destaques.forEach(d => lines.push(`• ${d}`));
  }
  lines.push('');
  lines.push('ANÁLISE DE RISCO (PRÓXIMOS DIAS)');
  lines.push(report.analise_risco || '');
  if (report.acoes_recomendadas?.length) {
    lines.push('');
    lines.push('AÇÕES RECOMENDADAS');
    report.acoes_recomendadas.forEach(a => lines.push(`• ${a}`));
  }
  return lines.join('\n');
}

export default function RelatorioOperacionalIA({ projectId, currentUser }) {
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!projectId) { toast.error('Selecione um projeto.'); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('generateOperationalReportAI', { project_id: projectId, days });
      if (res.data?.success) {
        setResult(res.data);
      } else {
        toast.error(res.data?.error || 'Erro ao gerar relatório.');
      }
    } catch (e) {
      toast.error('Erro ao gerar relatório.');
    } finally {
      setLoading(false);
    }
  };

  const copyText = () => {
    if (!result) return;
    navigator.clipboard.writeText(buildPlainText(result.report, result.stats, result.period_days));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const saveToLibrary = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const now = new Date();
      await base44.entities.RelatorioOperacional.create({
        project_id: projectId,
        nome: `Relatório Operacional IA — ${now.toLocaleDateString('pt-BR')}`,
        tipo: 'relatorio',
        data_envio: now.toISOString().slice(0, 10),
        responsavel: currentUser?.full_name || '',
        status: 'enviado',
        ano: now.getFullYear(),
        mes: now.getMonth() + 1,
        observacoes: buildPlainText(result.report, result.stats, result.period_days),
      });
      toast.success('Relatório salvo na biblioteca de documentos!');
    } catch (e) {
      toast.error('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const r = result?.report;
  const stats = result?.stats;

  return (
    <div className="space-y-5">
      {/* Controles */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Relatório Operacional com IA</h3>
            <p className="text-sm text-slate-400">Resumo das atividades executadas e análise de risco para os próximos dias, com base em criticidade e prazos.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 bg-slate-900/60 rounded-lg p-1">
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => setDays(p.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${days === p.value ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <Button onClick={generate} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
            {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
            {loading ? 'Gerando...' : 'Gerar Relatório'}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Analisando atividades, chamados e prazos...
        </div>
      )}

      {r && !loading && (
        <div className="space-y-4">
          {/* Stats rápidas */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatMini icon={CheckCircle} label="Concluídas" value={stats.concluidas} color="text-emerald-400" bg="bg-emerald-500/10" />
              <StatMini icon={Clock} label="Em andamento" value={stats.em_andamento} color="text-blue-400" bg="bg-blue-500/10" />
              <StatMini icon={AlertTriangle} label="Atrasadas" value={stats.atrasadas} color="text-red-400" bg="bg-red-500/10" />
              <StatMini icon={Clock} label="Vencendo" value={stats.proximas} color="text-yellow-400" bg="bg-yellow-500/10" />
              <StatMini icon={ListChecks} label="Chamados abertos" value={stats.chamados_abertos} color="text-orange-400" bg="bg-orange-500/10" />
              <StatMini icon={CheckCircle} label="Ch. resolvidos" value={stats.chamados_resolvidos} color="text-cyan-400" bg="bg-cyan-500/10" />
            </div>
          )}

          {/* Ações */}
          <div className="flex justify-end gap-2">
            <Button onClick={copyText} variant="outline" size="sm" className="border-slate-700 bg-slate-800 hover:bg-slate-700">
              {copied ? <Check className="w-4 h-4 mr-1 text-emerald-400" /> : <Copy className="w-4 h-4 mr-1" />}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
            <Button onClick={saveToLibrary} disabled={saving} size="sm" className="bg-blue-600 hover:bg-blue-700">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Salvar na biblioteca
            </Button>
          </div>

          {/* Resumo das atividades */}
          <Section title="Resumo das Atividades Executadas" icon={CheckCircle} color="text-emerald-400">
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{r.resumo_atividades}</p>
            {r.destaques?.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {r.destaques.map((d, i) => (
                  <li key={i} className="text-sm text-slate-300 flex gap-2">
                    <span className="text-emerald-400 mt-0.5">•</span><span>{d}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Análise de risco */}
          <Section title="Análise de Risco — Próximos Dias" icon={AlertTriangle} color="text-red-400">
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{r.analise_risco}</p>
          </Section>

          {/* Ações recomendadas */}
          {r.acoes_recomendadas?.length > 0 && (
            <Section title="Ações Recomendadas" icon={ListChecks} color="text-blue-400">
              <ul className="space-y-1.5">
                {r.acoes_recomendadas.map((a, i) => (
                  <li key={i} className="text-sm text-slate-300 flex gap-2">
                    <span className="text-blue-400 mt-0.5">{i + 1}.</span><span>{a}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function StatMini({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 flex items-center gap-2.5">
      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-400 truncate">{label}</p>
        <p className="text-lg font-bold text-white leading-none">{value}</p>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, color, children }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${color}`} />
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  );
}