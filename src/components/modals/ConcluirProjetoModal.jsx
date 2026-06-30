import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Plus, Trash2, AlertTriangle, BookOpen } from 'lucide-react';
import { format } from 'date-fns';

const TIPOS = [
  { value: 'tecnico', label: 'Técnico' },
  { value: 'processo', label: 'Processo' },
  { value: 'comunicacao', label: 'Comunicação' },
  { value: 'cronograma', label: 'Cronograma' },
  { value: 'risco', label: 'Risco' },
  { value: 'cliente', label: 'Cliente' },
  { value: 'outro', label: 'Outro' },
];

const emptyLicao = () => ({ title: '', tipo: 'processo', problema: '', solucao: '' });

export default function ConcluirProjetoModal({ open, onOpenChange, project, currentUser, onConfirm, isSaving }) {
  const [licoes, setLicoes] = useState([emptyLicao(), emptyLicao(), emptyLicao()]);
  const [error, setError] = useState('');

  const updateLicao = (index, field, value) => {
    setLicoes(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l));
  };

  const addLicao = () => setLicoes(prev => [...prev, emptyLicao()]);

  const removeLicao = (index) => {
    if (licoes.length <= 3) return;
    setLicoes(prev => prev.filter((_, i) => i !== index));
  };

  const validLicoes = licoes.filter(l => l.title.trim() && l.problema.trim() && l.solucao.trim());

  const handleConfirm = async () => {
    if (validLicoes.length < 3) {
      setError('Preencha no mínimo 3 lições aprendidas (título, problema e solução em cada uma) para concluir o projeto.');
      return;
    }
    setError('');
    await base44.entities.LicaoAprendida.bulkCreate(
      validLicoes.map(l => ({
        project_id: project.id,
        portfolio: project.portfolio,
        title: l.title.trim(),
        tipo: l.tipo,
        problema: l.problema.trim(),
        solucao: l.solucao.trim(),
        responsavel: currentUser?.full_name || '',
        data: format(new Date(), 'yyyy-MM-dd'),
      }))
    );
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            Concluir Projeto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm text-blue-200">
            <BookOpen className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Para concluir <strong>{project?.name}</strong>, registre no mínimo <strong>3 lições aprendidas</strong>. Elas ficarão disponíveis na base de conhecimento.</span>
          </div>

          {licoes.map((licao, index) => (
            <div key={index} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lição {index + 1}</span>
                {licoes.length > 3 && (
                  <button onClick={() => removeLicao(index)} className="text-slate-500 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  value={licao.title}
                  onChange={e => updateLicao(index, 'title', e.target.value)}
                  placeholder="Título"
                  className="sm:col-span-2 bg-slate-900 border-slate-700 text-white"
                />
                <Select value={licao.tipo} onValueChange={v => updateLicao(index, 'tipo', v)}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">
                    {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                value={licao.problema}
                onChange={e => updateLicao(index, 'problema', e.target.value)}
                placeholder="Problema enfrentado"
                rows={2}
                className="bg-slate-900 border-slate-700 text-white"
              />
              <Textarea
                value={licao.solucao}
                onChange={e => updateLicao(index, 'solucao', e.target.value)}
                placeholder="Solução aplicada"
                rows={2}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
          ))}

          <Button variant="outline" onClick={addLicao} className="w-full border-slate-700 text-slate-300 hover:bg-slate-800">
            <Plus className="w-4 h-4 mr-2" /> Adicionar outra lição
          </Button>

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSaving || validLicoes.length < 3}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {isSaving ? 'Concluindo...' : `Concluir Projeto (${validLicoes.length}/3)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}