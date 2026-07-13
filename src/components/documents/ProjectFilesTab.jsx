import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FileText, Upload, Download, Trash2, Loader2, X, FolderOpen,
  FileSignature, FileCheck
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIAS = {
  assinado: { label: 'Assinado', icon: FileSignature, color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  utilizado: { label: 'Utilizado', icon: FileCheck, color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  outro: { label: 'Outro', icon: FileText, color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
};

export default function ProjectFilesTab({ projectId }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', descricao: '', categoria: 'utilizado' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['projectFiles', projectId],
    queryFn: () => base44.entities.ProjectFile.filter({ project_id: projectId }, '-created_date'),
    enabled: !!projectId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectFile.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projectFiles', projectId] }),
  });

  const resetForm = () => {
    setForm({ nome: '', descricao: '', categoria: 'utilizado' });
    setSelectedFile(null);
    setUploadOpen(false);
  };

  const handleSave = async () => {
    if (!selectedFile) { toast.error('Selecione um arquivo.'); return; }
    if (!form.nome.trim()) { toast.error('Informe um nome para o arquivo.'); return; }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      await base44.entities.ProjectFile.create({
        project_id: projectId,
        nome: form.nome.trim(),
        descricao: form.descricao.trim(),
        categoria: form.categoria,
        file_url,
      });
      toast.success('Arquivo anexado!');
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-slate-500">
          Anexe aqui os documentos <span className="text-blue-400 font-medium">assinados ou utilizados</span> no projeto para consulta e download posterior.
        </p>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1.5" onClick={() => setUploadOpen(true)}>
          <Upload className="w-4 h-4" /> Anexar arquivo
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <FolderOpen className="w-10 h-10 mb-2" />
          <p className="text-sm">Nenhum arquivo anexado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {files.map(file => {
            const cat = CATEGORIAS[file.categoria] || CATEGORIAS.outro;
            const Icon = cat.icon;
            return (
              <Card key={file.id} className="bg-slate-800 border-slate-700">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <Icon className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{file.nome}</p>
                        {file.descricao && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{file.descricao}</p>}
                      </div>
                    </div>
                    <span className={`text-[10px] rounded px-1.5 py-0.5 border flex-shrink-0 ${cat.color}`}>{cat.label}</span>
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
            );
          })}
        </div>
      )}

      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={resetForm}>
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Anexar arquivo</h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Nome *</label>
                <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: Contrato assinado" className="bg-slate-900 border-slate-600 text-slate-200" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Descrição</label>
                <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  placeholder="Observação (opcional)" className="bg-slate-900 border-slate-600 text-slate-200" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Categoria</label>
                <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                  className="w-full h-9 px-3 rounded-md bg-slate-900 border border-slate-600 text-slate-200 text-sm">
                  <option value="assinado">Assinado</option>
                  <option value="utilizado">Utilizado</option>
                  <option value="outro">Outro</option>
                </select>
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
            <Button disabled={uploading} className="w-full bg-blue-600 hover:bg-blue-700 gap-2" onClick={handleSave}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Anexar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}