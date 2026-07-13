import React, { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FileText, Upload, Download, Trash2, Loader2, X, FolderOpen, Plus, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

// Documentos do modelo padrão — cada um tem um slot fixo para anexar o arquivo real
const MODELO_DOCS = [
  { key: 'tap', label: 'TAP', description: 'Termo de Abertura do Projeto' },
  { key: 'kickoff', label: 'Kickoff', description: 'Documento de Kickoff' },
  { key: 'diagnostico', label: 'Diagnóstico', description: 'Diagnóstico do projeto' },
  { key: 'mapa_relatorios', label: 'Mapa de Relatórios', description: 'Mapa de relatórios do projeto' },
  { key: 'acordos_conversao', label: 'Acordos de Conversão', description: 'Acordos de conversão de dados' },
  { key: 'aceite_homologacao', label: 'Aceite de Homologação', description: 'Aceite de homologação' },
  { key: 'tac', label: 'TAC', description: 'Termo de Aceite de Contrato' },
  { key: 'treinamentos_prova', label: 'Treinamentos/Prova', description: 'Documentos de treinamento' },
  { key: 'aceite_implantacao', label: 'Aceite de Implantação', description: 'Aceite de implantação final' },
];

export default function ProjectFilesTab({ projectId }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const slotInputRef = useRef(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', descricao: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState(null);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['projectFiles', projectId],
    queryFn: () => base44.entities.ProjectFile.filter({ project_id: projectId }, '-created_date'),
    enabled: !!projectId,
  });

  // Arquivo anexado a cada documento do modelo (por doc_key)
  const modeloFileMap = useMemo(() => {
    const map = {};
    files.forEach(f => { if (f.doc_key) map[f.doc_key] = f; });
    return map;
  }, [files]);

  // Documentos livres (sem doc_key)
  const livres = useMemo(() => files.filter(f => !f.doc_key), [files]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectFile.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projectFiles', projectId] }),
  });

  const resetForm = () => {
    setForm({ nome: '', descricao: '' });
    setSelectedFile(null);
    setUploadOpen(false);
  };

  // Anexar arquivo em um slot de documento do modelo
  const handleSlotUpload = async (file, doc) => {
    setUploadingSlot(doc.key);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const existing = modeloFileMap[doc.key];
      if (existing) {
        await base44.entities.ProjectFile.update(existing.id, { file_url });
      } else {
        await base44.entities.ProjectFile.create({
          project_id: projectId,
          nome: doc.label,
          doc_key: doc.key,
          categoria: 'assinado',
          file_url,
        });
      }
      toast.success('Arquivo anexado!');
      queryClient.invalidateQueries({ queryKey: ['projectFiles', projectId] });
    } catch (e) {
      toast.error('Erro ao anexar: ' + e.message);
    } finally {
      setUploadingSlot(null);
    }
  };

  // Salvar documento livre
  const handleSaveLivre = async () => {
    if (!selectedFile) { toast.error('Selecione um arquivo.'); return; }
    if (!form.nome.trim()) { toast.error('Informe um nome para o arquivo.'); return; }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      await base44.entities.ProjectFile.create({
        project_id: projectId,
        nome: form.nome.trim(),
        descricao: form.descricao.trim(),
        categoria: 'outro',
        file_url,
      });
      toast.success('Documento livre anexado!');
      queryClient.invalidateQueries({ queryKey: ['projectFiles', projectId] });
      resetForm();
    } catch (e) {
      toast.error('Erro ao anexar: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (file) => {
    if (window.confirm(`Excluir "${file.nome}"?`)) deleteMutation.mutate(file.id);
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* ===== SLOTS DOS DOCUMENTOS DO MODELO ===== */}
      <div className="space-y-3">
        <p className="text-xs text-slate-500">
          Anexe abaixo o arquivo real de cada documento do <span className="text-blue-400 font-medium">modelo padrão</span> do projeto.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODELO_DOCS.map(doc => {
            const file = modeloFileMap[doc.key];
            const hasFile = !!file;
            return (
              <Card key={doc.key} className="bg-slate-800 border-slate-700">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    {hasFile
                      ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      : <FileText className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{doc.label}</p>
                      <p className="text-xs text-slate-400 line-clamp-1">{doc.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    {hasFile ? (
                      <>
                        <a href={file.file_url} target="_blank" rel="noreferrer" className="flex-1">
                          <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 gap-1.5 text-xs h-7">
                            <Download className="w-3.5 h-3.5" /> Baixar
                          </Button>
                        </a>
                        <Button size="sm" variant="outline"
                          className="border-slate-600 text-slate-400 hover:text-white h-7 px-2"
                          onClick={() => { slotInputRef.current._doc = doc; slotInputRef.current.click(); }}>
                          {uploadingSlot === doc.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        </Button>
                        <Button size="sm" variant="outline"
                          className="border-slate-600 text-slate-400 hover:text-red-400 h-7 px-2"
                          onClick={() => handleDelete(file)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline"
                        className="w-full border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-blue-500 text-xs h-7 gap-1.5"
                        onClick={() => { slotInputRef.current._doc = doc; slotInputRef.current.click(); }}>
                        {uploadingSlot === doc.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        Anexar arquivo
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ===== DOCUMENTOS LIVRES ===== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap border-t border-slate-700 pt-4">
          <div>
            <p className="text-sm font-semibold text-white">Documentos Livres</p>
            <p className="text-xs text-slate-500">Para documentos que não fazem parte do modelo padrão.</p>
          </div>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1.5" onClick={() => setUploadOpen(true)}>
            <Plus className="w-4 h-4" /> Adicionar documento livre
          </Button>
        </div>

        {livres.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-500">
            <FolderOpen className="w-8 h-8 mb-2" />
            <p className="text-sm">Nenhum documento livre anexado ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {livres.map(file => (
              <Card key={file.id} className="bg-slate-800 border-slate-700">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{file.nome}</p>
                      {file.descricao && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{file.descricao}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <a href={file.file_url} target="_blank" rel="noreferrer" className="flex-1">
                      <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 gap-1.5 text-xs h-7">
                        <Download className="w-3.5 h-3.5" /> Baixar
                      </Button>
                    </a>
                    <Button size="sm" variant="outline" className="border-slate-600 text-slate-400 hover:text-red-400 h-7 px-2" onClick={() => handleDelete(file)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* input compartilhado dos slots do modelo */}
      <input ref={slotInputRef} type="file" className="hidden"
        onChange={e => {
          const file = e.target.files[0];
          const doc = slotInputRef.current._doc;
          if (file && doc) handleSlotUpload(file, doc);
          e.target.value = '';
        }} />

      {/* Modal documento livre */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={resetForm}>
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Adicionar documento livre</h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Nome *</label>
                <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: Ata de reunião extra" className="bg-slate-900 border-slate-600 text-slate-200" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Descrição</label>
                <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  placeholder="Observação (opcional)" className="bg-slate-900 border-slate-600 text-slate-200" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Arquivo *</label>
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-2 h-9 px-3 rounded-md bg-slate-900 border border-dashed border-slate-600 text-slate-400 hover:border-blue-500 hover:text-white text-sm">
                  <Upload className="w-4 h-4" />
                  <span className="truncate">{selectedFile ? selectedFile.name : 'Selecionar arquivo'}</span>
                </button>
                <input ref={fileInputRef} type="file" className="hidden"
                  onChange={e => { setSelectedFile(e.target.files[0] || null); e.target.value = ''; }} />
              </div>
            </div>
            <Button disabled={uploading} className="w-full bg-blue-600 hover:bg-blue-700 gap-2" onClick={handleSaveLivre}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Anexar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}