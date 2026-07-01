import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Sparkles, AlertTriangle, CheckCircle, Clock, ListChecks, FileDown, Loader2, FileText, Trash2, History } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { buildRelatorioPdf, serializeRelatorio, parseRelatorio } from './relatorioPdfGenerator';

const PERIODS = [
  { value: 7, label: '7 dias' },
  { value: 14, label: '14 dias' },
  { value: 30, label: '30 dias' },
];

function downloadPdf(report, stats, meta) {
  const doc = buildRelatorioPdf(report, stats, meta);
  const safeName = (meta.projectName || 'projeto').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`relatorio_operacional_${safeName}_${(meta.dateLabel || '').replace(/\//g, '-')}.pdf`);
}

export default function RelatorioOperacionalIA({ projectId, currentUser, projectName }) {
  const queryClient = useQueryClient();
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const { data: historico = [] } = useQuery({
    queryKey: ['relatorios', projectId],
    queryFn: () => base44.entities.RelatorioOperacional.filter({ project_id: projectId }),
    enabled: !!projectId, refetchInterval: 30000,
  });

  // Apenas relatórios gerados por IA (com JSON estruturado)
  const relatoriosIA = historico
    .map(r => ({ ...r, parsed: parseRelatorio(r.observacoes) }))
    .filter(r => r.parsed)
    .sort((a, b) => (b.data_envio || '').localeCompare(a.data_envio || ''));

  const generate = async () => {
    if (!projectId) { toast.error('Selecione um projeto.'); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('generateOperationalReportAI', { project_id: projectId, days });
      if (res.data?.success) {
        const now = new Date();
        const meta = {
          projectName: projectName || '',
          days: res.data.period_days,
          dateLabel: now.toLocaleDateString('pt-BR'),
          responsavel: currentUser?.full_name || '',
        };
        const payload = { report: res.data.report, stats: res.data.stats, meta };
        setResult(payload);

        // Salva automaticamente na biblioteca (histórico)
        await base44.entities.RelatorioOperacional.create({
          project_id: projectId,
          nome: `Relatório Operacional IA — ${now.toLocaleDateString('pt-BR')}`,
          tipo: 'relatorio',
          data_envio: now.toISOString().slice(0, 10),
          responsavel: currentUser?.full_name || '',
          status: 'enviado',
          ano: now.getFullYear(),
          mes: now.getMonth() + 1,
          observacoes: serializeRelatorio(res.data.report, res.data.stats, meta),
        });
        queryClient.invalidateQueries(['relatorios', projectId]);

        // Baixa o PDF gerado
        downloadPdf(res.data.report, res.data.stats, meta);
        toast.success('Relatório gerado em PDF e salvo no histórico!');
      } else {
        toast.error(res.data?.error || 'Erro ao gerar relatório.');
      }
    } catch (e) {
      toast.error('Erro ao gerar relatório.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadHistorico = (item) => {
    const { report, stats, meta } = item.parsed;
    downloadPdf(report, stats, meta || { projectName, dateLabel: item.data_envio });
  };

  const handleDelete = async (id) => {
    if (!confirm('Remover este relatório do histórico?')) return;
    await base44.entities.RelatorioOperacional.delete(id);
    queryClient.invalidateQueries(['relatorios', projectId]);
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
            <p className="text-sm text-slate-400">Ao gerar, um PDF executivo é criado automaticamente, baixado e registrado no histórico abaixo.</p>
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
            {loading ? 'Gerando...' : 'Gerar Relatório PDF'}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Analisando atividades, chamados e prazos...
        </div>
      )}

      {/* Preview do último gerado */}
      {r && !loading && (
        <div className="space-y-4">
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

          <div className="flex justify-end">
            <Button onClick={() => downloadPdf(result.report, result.stats, result.meta)} size="sm" className="bg-blue-600 hover:bg-blue-700">
              <FileDown className="w-4 h-4 mr-1" /> Baixar PDF novamente
            </Button>
          </div>

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

          <Section title="Análise de Risco — Próximos Dias" icon={AlertTriangle} color="text-red-400">
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{r.analise_risco}</p>
          </Section>

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

      {/* Histórico de geração */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Histórico de Relatórios Gerados</h3>
        </div>
        {relatoriosIA.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum relatório gerado ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {relatoriosIA.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-slate-900/40 rounded-xl px-4 py-3 border border-slate-700/40 hover:bg-slate-900/70 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4.5 h-4.5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.nome}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {item.data_envio ? format(parseISO(item.data_envio), 'dd/MM/yyyy') : '—'}
                    {item.parsed?.meta?.days ? ` • ${item.parsed.meta.days} dias` : ''}
                    {item.responsavel ? ` • ${item.responsavel}` : ''}
                  </p>
                </div>
                <Button onClick={() => handleDownloadHistorico(item)} size="sm" variant="outline"
                  className="border-slate-700 bg-slate-800 hover:bg-slate-700 h-8 text-xs flex-shrink-0">
                  <FileDown className="w-3.5 h-3.5 mr-1" /> Baixar
                </Button>
                <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
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