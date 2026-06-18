import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, FileText, Download, ExternalLink, Trash2, Plus, FileDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const TIPO_CFG = {
  relatorio: { label: 'Relatório', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  apresentacao: { label: 'Apresentação', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ata: { label: 'Ata', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  evidencia: { label: 'Evidência', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  apoio: { label: 'Apoio', color: 'text-slate-400', bg: 'bg-slate-700/60' },
};

export default function BibliotecaDocumental({ relatorios, projectId, currentUser }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filterTipo, setFilterTipo] = useState('todos');
  const [filterAno, setFilterAno] = useState('todos');
  const [form, setForm] = useState({ nome: '', tipo: 'relatorio', versao: '1.0', observacoes: '', drive_link: '' });
  const [file, setFile] = useState(null);

  const anos = [...new Set(relatorios.map(r => r.ano).filter(Boolean))].sort((a, b) => b - a);

  const filtered = relatorios.filter(r => {
    if (filterTipo !== 'todos' && r.tipo !== filterTipo) return false;
    if (filterAno !== 'todos' && String(r.ano) !== filterAno) return false;
    return true;
  });

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

  const MODEL_URL = 'https://media.base44.com/files/public/6a31ab9617c13b0a39ce874c/658928cdc_FAZERUMACPIAModelodeRelatrioOperacional.docx';

  return (
    <div className="space-y-4">
      {/* Modelo padrão */}
      <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
        <FileDown className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-emerald-300">Modelo Padrão de Relatório Operacional</p>
          <p className="text-xs text-slate-400">Baixe, preencha e envie utilizando o botão "Adicionar" abaixo.</p>
        </div>
        <a href={MODEL_URL} download className="flex-shrink-0">
          <button className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors">
            <Download className="w-3.5 h-3.5" /> Baixar Modelo
          </button>
        </a>
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

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-500 bg-slate-800/40 rounded-xl border border-slate-700/40">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum documento encontrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const tcfg = TIPO_CFG[r.tipo] || TIPO_CFG.apoio;
            return (
              <div key={r.id} className="flex items-center gap-3 bg-slate-800/50 rounded-xl px-4 py-3 border border-slate-700/40 hover:bg-slate-800/70 transition-colors">
                <FileText className={`w-5 h-5 flex-shrink-0 ${tcfg.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white">{r.nome}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${tcfg.bg} ${tcfg.color}`}>{tcfg.label}</span>
                    <span className="text-xs text-slate-500">v{r.versao}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {r.responsavel} • {r.data_envio ? format(parseISO(r.data_envio), 'dd/MM/yyyy') : '—'}
                    {r.observacoes && ` • ${r.observacoes}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {r.file_url && (
                    <a href={r.file_url} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {r.drive_link && (
                    <a href={r.drive_link} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button onClick={() => handleDelete(r.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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