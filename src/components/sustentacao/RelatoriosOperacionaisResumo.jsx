import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText, Download, FileDown, ExternalLink, Calendar, User, Sparkles,
  ChevronRight, FileSignature
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { buildRelatorioPdf, parseRelatorio } from '../reunioes/relatorioPdfGenerator';
import { createPageUrl } from '../../utils';

const TIPO_CFG = {
  relatorio: { label: 'Relatório', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  apresentacao: { label: 'Apresentação', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ata: { label: 'Ata', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  evidencia: { label: 'Evidência', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  apoio: { label: 'Apoio', color: 'text-slate-400', bg: 'bg-slate-700/60' },
};

export default function RelatoriosOperacionaisResumo({ projectId, projectName }) {
  const { data: relatorios = [], isLoading } = useQuery({
    queryKey: ['relatorios', projectId],
    queryFn: () => projectId ? base44.entities.RelatorioOperacional.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });

  const docs = relatorios
    .map(r => ({ ...r, parsed: parseRelatorio(r.observacoes) }))
    .sort((a, b) => (b.data_envio || '').localeCompare(a.data_envio || ''));

  const handleDownloadPdf = (parsed, item) => {
    const meta = parsed.meta || { projectName, dateLabel: item.data_envio };
    const doc = buildRelatorioPdf(parsed.report, parsed.stats, meta);
    const safeName = (meta.projectName || 'projeto').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`relatorio_operacional_${safeName}.pdf`);
  };

  return (
    <Card className="bg-slate-800/60 border-slate-700/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" /> Relatórios Operacionais
          </CardTitle>
          <a href={createPageUrl(`SustentacaoReunioes?project_id=${projectId}`)}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
            Ver todos <ChevronRight className="w-3 h-3" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="py-8 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum relatório operacional registrado.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.slice(0, 8).map(r => {
              const tcfg = TIPO_CFG[r.tipo] || TIPO_CFG.apoio;
              const isIA = !!r.parsed;
              return (
                <div key={r.id} className="flex items-center gap-3 bg-slate-700/40 rounded-lg px-3 py-2.5">
                  <div className={`w-9 h-9 rounded-lg ${tcfg.bg} flex items-center justify-center flex-shrink-0`}>
                    {isIA ? <Sparkles className={`w-4.5 h-4.5 ${tcfg.color}`} /> : <FileText className={`w-4.5 h-4.5 ${tcfg.color}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{r.nome}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap mt-0.5">
                      <span className={`px-1.5 py-0.5 rounded ${tcfg.bg} ${tcfg.color}`}>{tcfg.label}</span>
                      {r.versao && <span>v{r.versao}</span>}
                      <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{r.data_envio ? format(parseISO(r.data_envio), 'dd/MM/yyyy') : '—'}</span>
                      {r.responsavel && <span className="inline-flex items-center gap-1"><User className="w-3 h-3" />{r.responsavel}</span>}
                      {r.assinado && <span className="inline-flex items-center gap-1 text-emerald-300"><FileSignature className="w-3 h-3" />Assinado</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isIA && (
                      <button onClick={() => handleDownloadPdf(r.parsed, r)} title="Baixar PDF"
                        className="flex items-center gap-1 text-xs text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/10 px-2 py-1 rounded-lg transition-colors">
                        <FileDown className="w-3.5 h-3.5" /> PDF
                      </button>
                    )}
                    {r.signed_file_url && (
                      <a href={r.signed_file_url} target="_blank" rel="noreferrer" title="Baixar versão assinada"
                        className="flex items-center gap-1 text-xs text-emerald-300 hover:text-emerald-400 hover:bg-emerald-500/10 px-2 py-1 rounded-lg transition-colors">
                        <FileSignature className="w-3.5 h-3.5" /> Assinado
                      </a>
                    )}
                    {r.file_url && (
                      <a href={r.file_url} target="_blank" rel="noreferrer" title="Baixar arquivo"
                        className="flex items-center gap-1 text-xs text-slate-300 hover:text-blue-400 hover:bg-blue-500/10 px-2 py-1 rounded-lg transition-colors">
                        <Download className="w-3.5 h-3.5" /> Arquivo
                      </a>
                    )}
                    {r.drive_link && (
                      <a href={r.drive_link} target="_blank" rel="noreferrer" title="Abrir no Drive"
                        className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
            {docs.length > 8 && (
              <p className="text-xs text-slate-500 text-center pt-1">+{docs.length - 8} relatórios na aba Reuniões e Relatórios</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}