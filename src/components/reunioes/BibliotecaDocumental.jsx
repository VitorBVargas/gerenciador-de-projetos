import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Upload, FileText, Download, ExternalLink, Trash2, Plus, FileDown,
  Sparkles, AlertTriangle, CheckCircle, Clock, ListChecks, Eye, Calendar, User
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { buildRelatorioPdf, parseRelatorio } from './relatorioPdfGenerator';
import GerarRelatorioOperacionalModal from './GerarRelatorioOperacionalModal';

const TIPO_CFG = {
  relatorio: { label: 'Relatório', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  apresentacao: { label: 'Apresentação', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ata: { label: 'Ata', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  evidencia: { label: 'Evidência', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  apoio: { label: 'Apoio', color: 'text-slate-400', bg: 'bg-slate-700/60' },
};

const MODEL_URL = 'https://media.base44.com/files/public/6a31ab9617c13b0a39ce874c/658928cdc_FAZERUMACPIAModelodeRelatrioOperacional.docx';

export default function BibliotecaDocumental({ relatorios, projectId, currentUser, projectName }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filterTipo, setFilterTipo] = useState('todos');
  const [filterAno, setFilterAno] = useState('todos');
  const [form, setForm] = useState({ nome: '', tipo: 'relatorio', versao: '1.0', observacoes: '', drive_link: '' });
  const [file, setFile] = useState(null);
  const [viewing, setViewing] = useState(null); // documento em leitura
  const [gerarOpen, setGerarOpen] = useState(false);

  const anos = [...new Set(relatorios.map(r => r.ano).filter(Boolean))].sort((a, b) => b - a);

  const docs = relatorios
    .map(r => ({ ...r, parsed: parseRelatorio(r.observacoes) }))
    .filter(r => {
      if (filterTipo !== 'todos' && r.tipo !== filterTipo) return false;
      if (filterAno !== 'todos' && String(r.ano) !== filterAno) return false;
      return true;
    })
    .sort((a, b) => (b.data_envio || '').localeCompare(a.data_envio || ''));

  const handleUpload = async () => {
    if (!form.nome) return;
    setUploading(true);
    let file_url = '';
    if (file) {
      const res = await base44.integrations.Core.UploadFile({ file });
      file_url = res.file_url;
    }
    const now = new Date();
    await base44.entities.RelatorioOperacional.create({
      project_id: projectId,
      nome: form.nome,
      tipo: form.tipo,
      versao: form.versao,
      observacoes: form.observacoes,
      drive_link: form.drive_link,
      file_url,
      data_envio: now.toISOString().split('T')[0],
      responsavel: currentUser?.full_name || '',
      status: 'enviado',
      ano: now.getFullYear(),
      mes: now.getMonth() + 1,
    });
    queryClient.invalidateQueries(['relatorios', projectId]);
    setUploading(false);
    setModalOpen(false);
    setForm({ nome: '', tipo: 'relatorio', versao: '1.0', observacoes: '', drive_link: '' });
    setFile(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Remover este documento?')) return;
    await base44.entities.RelatorioOperacional.delete(id);
    queryClient.invalidateQueries(['relatorios', projectId]);
  };

  const handleDownloadPdf = (parsed, item) => {
    const meta = parsed.meta || { projectName, dateLabel: item.data_envio };
    const doc = buildRelatorioPdf(parsed.report, parsed.stats, meta);
    const safeName = (meta.projectName || 'projeto').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`relatorio_operacional_${safeName}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Modelo padrão */}
      <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
        <FileDown className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-emerald-300">Modelo Padrão de Relatório Operacional</p>
          <p className="text-xs text-slate-400">Baixe, preencha e envie utilizando o botão "Adicionar" abaixo.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setGerarOpen(true)} className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors">
            <Sparkles className="w-3.5 h-3.5" /> Gerar Relatório
          </button>
          <a href={MODEL_URL} download>
            <button className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors">
              <Download className="w-3.5 h-3.5" /> Baixar Modelo
            </button>
          </a>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-base font-semibold text-white">Biblioteca Documental</h3>
        <div className="flex items-center gap-2">
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="bg-slate-800 border-slate-700 h-8 text-xs w-36"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {Object.entries(TIPO_CFG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterAno} onValueChange={setFilterAno}>
            <SelectTrigger className="bg-slate-800 border-slate-700 h-8 text-xs w-24"><SelectValue placeholder="Ano" /></SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="todos">Todos</SelectItem>
              {anos.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setModalOpen(true)} size="sm" className="bg-blue-600 hover:bg-blue-700 h-8 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
          </Button>
        </div>
      </div>

      {docs.length === 0 ? (
        <div className="text-center py-10 text-slate-500 bg-slate-800/40 rounded-xl border border-slate-700/40">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum documento encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {docs.map(r => {
            const tcfg = TIPO_CFG[r.tipo] || TIPO_CFG.apoio;
            const isIA = !!r.parsed;
            const clickable = isIA;
            return (
              <div key={r.id}
                onClick={clickable ? () => setViewing(r) : undefined}
                className={`bg-slate-800/50 rounded-xl p-4 border border-slate-700/40 transition-colors flex flex-col gap-3 ${clickable ? 'cursor-pointer hover:bg-slate-800/80 hover:border-blue-500/40' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg ${tcfg.bg} flex items-center justify-center flex-shrink-0`}>
                    {isIA ? <Sparkles className={`w-5 h-5 ${tcfg.color}`} /> : <FileText className={`w-5 h-5 ${tcfg.color}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white leading-tight">{r.nome}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${tcfg.bg} ${tcfg.color}`}>{tcfg.label}</span>
                      {isIA && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300">Gerado por IA</span>}
                      {r.versao && <span className="text-[10px] text-slate-500">v{r.versao}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                  <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{r.data_envio ? format(parseISO(r.data_envio), 'dd/MM/yyyy') : '—'}</span>
                  {r.responsavel && <span className="inline-flex items-center gap-1"><User className="w-3 h-3" />{r.responsavel}</span>}
                </div>

                {isIA && r.parsed.stats && (
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="text-emerald-400">{r.parsed.stats.concluidas} concl.</span>
                    <span className="text-red-400">{r.parsed.stats.atrasadas} atras.</span>
                    <span className="text-orange-400">{r.parsed.stats.chamados_abertos} ch. abertos</span>
                  </div>
                )}

                {!isIA && r.observacoes && (
                  <p className="text-xs text-slate-400 line-clamp-2">{r.observacoes}</p>
                )}

                <div className="flex items-center gap-1 pt-1 border-t border-slate-700/40 mt-auto" onClick={e => e.stopPropagation()}>
                  {isIA && (
                    <>
                      <button onClick={() => setViewing(r)} className="flex items-center gap-1 text-xs text-slate-300 hover:text-blue-400 hover:bg-blue-500/10 px-2 py-1 rounded-lg transition-colors">
                        <Eye className="w-3.5 h-3.5" /> Ler
                      </button>
                      <button onClick={() => handleDownloadPdf(r.parsed, r)} className="flex items-center gap-1 text-xs text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/10 px-2 py-1 rounded-lg transition-colors">
                        <FileDown className="w-3.5 h-3.5" /> PDF
                      </button>
                    </>
                  )}
                  {r.file_url && (
                    <a href={r.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-slate-300 hover:text-blue-400 hover:bg-blue-500/10 px-2 py-1 rounded-lg transition-colors">
                      <Download className="w-3.5 h-3.5" /> Arquivo
                    </a>
                  )}
                  {r.drive_link && (
                    <a href={r.drive_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/10 px-2 py-1 rounded-lg transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" /> Drive
                    </a>
                  )}
                  <button onClick={() => handleDelete(r.id)} className="ml-auto p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de geração de Relatório Operacional */}
      {gerarOpen && (
        <GerarRelatorioOperacionalModal
          projectName={projectName}
          currentUser={currentUser}
          onClose={() => setGerarOpen(false)}
        />
      )}

      {/* Modal de leitura ampliada */}
      <RelatorioViewer
        item={viewing}
        onClose={() => setViewing(null)}
        onDownload={(parsed, item) => handleDownloadPdf(parsed, item)}
      />

      {/* Upload Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[460px] bg-slate-900 border-slate-700 text-slate-200">
          <DialogHeader><DialogTitle>Adicionar Documento</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Nome *</Label>
              <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Nome do documento" className="bg-slate-800 border-slate-700" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-300 text-xs">Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {Object.entries(TIPO_CFG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-slate-300 text-xs">Versão</Label>
                <Input value={form.versao} onChange={e => setForm(p => ({ ...p, versao: e.target.value }))} placeholder="1.0" className="bg-slate-800 border-slate-700" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Arquivo (PDF, DOCX, XLSX)</Label>
              <Input type="file" accept=".pdf,.docx,.xlsx" onChange={e => setFile(e.target.files[0])} className="bg-slate-800 border-slate-700 text-slate-300 file:mr-3 file:bg-slate-700 file:text-slate-300 file:border-0 file:rounded file:px-2 file:py-1 file:text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Link Google Drive (opcional)</Label>
              <Input value={form.drive_link} onChange={e => setForm(p => ({ ...p, drive_link: e.target.value }))} placeholder="https://drive.google.com/..." className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Observações</Label>
              <Input value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} placeholder="Observações..." className="bg-slate-800 border-slate-700" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="text-slate-400">Cancelar</Button>
            <Button onClick={handleUpload} disabled={uploading || !form.nome} className="bg-blue-600 hover:bg-blue-700">
              {uploading ? 'Enviando...' : <><Upload className="w-4 h-4 mr-1" /> Enviar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ViewerSection({ title, icon: Icon, color, children }) {
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

function ViewerStat({ icon: Icon, label, value, color, bg }) {
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

function RelatorioViewer({ item, onClose, onDownload }) {
  if (!item?.parsed) return null;
  const { report: r, stats, meta } = item.parsed;

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-slate-200 p-0">
        {/* Header executivo */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-5 rounded-t-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> {item.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-blue-100">
            {meta?.projectName && <span>{meta.projectName}</span>}
            {meta?.days && <span>• Período: {meta.days} dias</span>}
            <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{item.data_envio ? format(parseISO(item.data_envio), 'dd/MM/yyyy') : '—'}</span>
            {item.responsavel && <span className="inline-flex items-center gap-1"><User className="w-3 h-3" />{item.responsavel}</span>}
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <ViewerStat icon={CheckCircle} label="Concluídas" value={stats.concluidas} color="text-emerald-400" bg="bg-emerald-500/10" />
              <ViewerStat icon={Clock} label="Em andamento" value={stats.em_andamento} color="text-blue-400" bg="bg-blue-500/10" />
              <ViewerStat icon={AlertTriangle} label="Atrasadas" value={stats.atrasadas} color="text-red-400" bg="bg-red-500/10" />
              <ViewerStat icon={Clock} label="Vencendo" value={stats.proximas} color="text-yellow-400" bg="bg-yellow-500/10" />
              <ViewerStat icon={ListChecks} label="Ch. abertos" value={stats.chamados_abertos} color="text-orange-400" bg="bg-orange-500/10" />
              <ViewerStat icon={CheckCircle} label="Ch. resolvidos" value={stats.chamados_resolvidos} color="text-cyan-400" bg="bg-cyan-500/10" />
            </div>
          )}

          <ViewerSection title="Resumo das Atividades Executadas" icon={CheckCircle} color="text-emerald-400">
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
          </ViewerSection>

          <ViewerSection title="Análise de Risco — Próximos Dias" icon={AlertTriangle} color="text-red-400">
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{r.analise_risco}</p>
          </ViewerSection>

          {r.acoes_recomendadas?.length > 0 && (
            <ViewerSection title="Ações Recomendadas" icon={ListChecks} color="text-blue-400">
              <ul className="space-y-1.5">
                {r.acoes_recomendadas.map((a, i) => (
                  <li key={i} className="text-sm text-slate-300 flex gap-2">
                    <span className="text-blue-400 mt-0.5">{i + 1}.</span><span>{a}</span>
                  </li>
                ))}
              </ul>
            </ViewerSection>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-800">
          <Button variant="ghost" onClick={onClose} className="text-slate-400">Fechar</Button>
          <Button onClick={() => onDownload(item.parsed, item)} className="bg-blue-600 hover:bg-blue-700">
            <FileDown className="w-4 h-4 mr-1" /> Baixar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}