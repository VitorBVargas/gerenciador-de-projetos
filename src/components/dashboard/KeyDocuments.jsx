import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ExternalLink, Upload, Download, FolderOpen, X, Loader2, Settings, Plus, Trash2, Pencil } from 'lucide-react';
import { cn } from "@/lib/utils";

const KEY_DOCUMENTS = [
  'TAP',
  'Kickoff',
  'Diagnóstico',
  'Mapa de relatórios',
  'Acordos de conversão',
  'Aceite de homologação',
  'TAC',
  'Treinamentos/Prova',
  'Aceite de implantação',
];

export default function KeyDocuments({ projectId, project }) {
  const queryClient = useQueryClient();
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [linkInput, setLinkInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: () => base44.entities.ProjectDocument.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  // Initialize fixed documents if not yet created
  useEffect(() => {
    if (!isLoading && projectId && documents.length === 0 && !initialized) {
      setInitialized(true);
      base44.entities.ProjectDocument.bulkCreate(
        KEY_DOCUMENTS.map((title, index) => ({
          project_id: projectId,
          title,
          completed: false,
          order: index,
        }))
      ).then(() => queryClient.invalidateQueries({ queryKey: ['documents', projectId] }));
    }
  }, [isLoading, projectId, documents.length, initialized, queryClient]);

  // Ensure all key docs exist even if new ones were added
  useEffect(() => {
    if (!isLoading && projectId && documents.length > 0 && !initialized) {
      setInitialized(true);
      const existingTitles = documents.map(d => d.title);
      const missing = KEY_DOCUMENTS.filter(t => !existingTitles.includes(t));
      if (missing.length > 0) {
        const maxOrder = Math.max(...documents.map(d => d.order || 0), 0);
        base44.entities.ProjectDocument.bulkCreate(
          missing.map((title, i) => ({
            project_id: projectId,
            title,
            completed: false,
            order: maxOrder + i + 1,
          }))
        ).then(() => queryClient.invalidateQueries({ queryKey: ['documents', projectId] }));
      }
    }
  }, [isLoading, projectId, documents, initialized, queryClient]);

  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }) => base44.entities.ProjectDocument.update(id, { completed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents', projectId] }),
  });

  const updateDocMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProjectDocument.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
      setDocModalOpen(false);
    },
  });

  const handleOpenModal = (doc) => {
    setSelectedDoc(doc);
    setLinkInput(doc.link || '');
    setDocModalOpen(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await updateDocMutation.mutateAsync({ id: selectedDoc.id, data: { file_url } });
    setUploading(false);
  };

  const deleteDocMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectDocument.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents', projectId] }),
  });

  const createDocMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectDocument.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
      setAddModalOpen(false);
      setNewDocTitle('');
    },
  });

  const handleSaveLink = () => {
    updateDocMutation.mutate({ id: selectedDoc.id, data: { link: linkInput } });
  };

  const handleAddDoc = () => {
    if (!newDocTitle.trim()) return;
    const maxOrder = documents.length > 0 ? Math.max(...documents.map(d => d.order || 0)) + 1 : 0;
    createDocMutation.mutate({ project_id: projectId, title: newDocTitle.trim(), completed: false, order: maxOrder });
  };

  const handleRenameDoc = (doc) => {
    setSelectedDoc({ ...doc, _renaming: true });
    setLinkInput(doc.link || '');
    setDocModalOpen(true);
  };

  // Sort by order, keep fixed list order
  const sorted = [...documents].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <>
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Documentos Chave</CardTitle>
            <div className="flex items-center gap-2">
              {project?.documents_folder_link && (
                <a
                  href={project.documents_folder_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Diretório Geral
                </a>
              )}
              <button
                onClick={() => setEditMode(v => !v)}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  editMode ? "bg-blue-600/20 text-blue-400" : "text-slate-500 hover:text-white hover:bg-slate-700"
                )}
                title="Gerenciar documentos"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : sorted.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 group">
              {!editMode && (
                <Checkbox
                  checked={doc.completed}
                  onCheckedChange={(checked) => toggleMutation.mutate({ id: doc.id, completed: checked })}
                  className="border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
              )}
              <button
                onClick={() => !editMode && handleOpenModal(doc)}
                className={cn(
                  "flex-1 text-sm text-left transition-colors",
                  editMode ? "text-slate-300 cursor-default" : "hover:text-blue-400",
                  doc.completed && !editMode ? "text-slate-500 line-through" : "text-white"
                )}
              >
                {doc.title}
              </button>
              {!editMode && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {doc.file_url && (
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                      className="p-1 text-slate-400 hover:text-green-400 transition-colors" title="Baixar arquivo">
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {doc.link && (
                    <a href={doc.link} target="_blank" rel="noopener noreferrer"
                      className="p-1 text-slate-400 hover:text-blue-400 transition-colors" title="Abrir link">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {(doc.link || doc.file_url) && (
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" title="Tem arquivo/link" />
                  )}
                </div>
              )}
              {editMode && (
                <div className="flex items-center gap-1">
                  <button onClick={() => handleOpenModal(doc)}
                    className="p-1 text-slate-400 hover:text-blue-400 transition-colors" title="Editar">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteDocMutation.mutate(doc.id)}
                    className="p-1 text-slate-400 hover:text-red-400 transition-colors" title="Excluir">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
          {editMode && (
            <button
              onClick={() => setAddModalOpen(true)}
              className="w-full mt-2 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 transition-colors text-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar documento
            </button>
          )}
        </CardContent>
      </Card>

      {/* Add Document Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-sm">
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-white">Adicionar Documento</h3>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Nome do documento</Label>
              <Input
                value={newDocTitle}
                onChange={e => setNewDocTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddDoc()}
                placeholder="Ex: Ata de reunião"
                className="bg-slate-700 border-slate-600 text-white"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setAddModalOpen(false); setNewDocTitle(''); }}
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</Button>
              <Button onClick={handleAddDoc} disabled={!newDocTitle.trim() || createDocMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700">Adicionar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Modal */}
      <Dialog open={docModalOpen} onOpenChange={setDocModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-white">{selectedDoc?.title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Gerencie o arquivo e o link deste documento</p>
            </div>

            {/* Link do diretório */}
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Link do documento (Drive, etc)</Label>
              <div className="flex gap-2">
                <Input
                  value={linkInput}
                  onChange={e => setLinkInput(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="bg-slate-700 border-slate-600 text-white text-sm"
                />
                <Button onClick={handleSaveLink} size="sm"
                  disabled={updateDocMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 flex-shrink-0">
                  Salvar
                </Button>
              </div>
              {selectedDoc?.link && (
                <a href={selectedDoc.link} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> Abrir link atual
                </a>
              )}
            </div>

            {/* Upload de arquivo */}
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Arquivo (upload)</Label>
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-slate-700/30 transition-all">
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                {uploading ? (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Enviando...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-400">
                    <Upload className="w-5 h-5" />
                    <span className="text-sm">Clique para enviar um arquivo</span>
                  </div>
                )}
              </label>
              {selectedDoc?.file_url && (
                <a href={selectedDoc.file_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-green-400 hover:underline flex items-center gap-1">
                  <Download className="w-3 h-3" /> Baixar arquivo atual
                </a>
              )}
            </div>

            <Button variant="outline" onClick={() => setDocModalOpen(false)}
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}