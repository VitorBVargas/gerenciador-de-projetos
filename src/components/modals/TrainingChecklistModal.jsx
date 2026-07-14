import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Upload, Loader2, FileCheck, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Trava (crítica) de conclusão de etapa de Treinamento.
 * Exige anexar a Lista de Presença assinada antes de concluir a etapa.
 * O arquivo é salvo em Documentos (ProjectFile com doc_key='lista_presenca').
 */
export default function TrainingChecklistModal({ open, onOpenChange, event, projectId, onConfirm }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const reset = () => { setFile(null); setSaving(false); };

  const handleConfirm = async () => {
    if (!file) { toast.error('Anexe a lista de presença assinada para concluir.'); return; }
    setSaving(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.ProjectFile.create({
        project_id: projectId,
        nome: file.name || `Lista de Presença - ${event?.title || 'Treinamento'}`,
        descricao: `Lista de presença do treinamento "${event?.title || ''}"`,
        doc_key: 'lista_presenca',
        categoria: 'assinado',
        file_url,
      });
      toast.success('Lista de presença anexada em Documentos.');
      onConfirm();
      reset();
    } catch (e) {
      toast.error('Erro ao anexar: ' + e.message);
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) { if (!v) reset(); onOpenChange(v); } }}>
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <AlertTriangle className="w-5 h-5 text-amber-400" /> Lista de Presença obrigatória
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Para concluir a etapa de <span className="font-semibold text-white">Treinamento</span>
            {event?.title ? <> (“{event.title}”)</> : null}, é obrigatório anexar a
            <span className="font-semibold text-white"> lista de presença assinada</span>. Ela será enviada automaticamente para a aba Documentos.
          </p>

          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center gap-2 h-11 px-3 rounded-md bg-slate-900 border border-dashed border-slate-600 text-slate-400 hover:border-blue-500 hover:text-white text-sm"
          >
            {file ? <FileCheck className="w-4 h-4 text-green-400" /> : <Upload className="w-4 h-4" />}
            <span className="truncate">{file ? file.name : 'Selecionar lista de presença assinada'}</span>
            {file && (
              <span onClick={(e) => { e.stopPropagation(); setFile(null); }} className="ml-auto text-slate-500 hover:text-red-400">
                <X className="w-4 h-4" />
              </span>
            )}
          </button>
          <input ref={fileRef} type="file" className="hidden"
            onChange={(e) => { setFile(e.target.files[0] || null); e.target.value = ''; }} />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={saving}
            onClick={() => { reset(); onOpenChange(false); }}
            className="border-slate-600 text-slate-300 hover:bg-slate-700">
            Cancelar
          </Button>
          <Button type="button" disabled={saving || !file} onClick={handleConfirm}
            className="bg-green-600 hover:bg-green-700 gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
            Anexar e Concluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}