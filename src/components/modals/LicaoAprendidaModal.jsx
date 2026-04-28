import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const TIPOS = [
  { value: 'tecnico', label: 'Técnico' },
  { value: 'processo', label: 'Processo' },
  { value: 'comunicacao', label: 'Comunicação' },
  { value: 'cronograma', label: 'Cronograma' },
  { value: 'risco', label: 'Risco' },
  { value: 'cliente', label: 'Cliente' },
  { value: 'outro', label: 'Outro' },
];

const emptyForm = {
  title: '',
  tipo: 'outro',
  problema: '',
  solucao: '',
  responsavel: '',
  data: '',
  tags: '',
  links: '',
};

export default function LicaoAprendidaModal({ open, onOpenChange, licao, onSave }) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!open) return;
    setForm({
      title: licao?.title || '',
      tipo: licao?.tipo || 'outro',
      problema: licao?.problema || '',
      solucao: licao?.solucao || '',
      responsavel: licao?.responsavel || '',
      data: licao?.data || '',
      tags: Array.isArray(licao?.tags) ? licao.tags.join(', ') : '',
      links: Array.isArray(licao?.links) ? licao.links.join('\n') : '',
    });
  }, [open, licao]);

  if (!open) return null;

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      title: form.title,
      tipo: form.tipo,
      problema: form.problema,
      solucao: form.solucao,
      responsavel: form.responsavel,
      data: form.data,
      tags: form.tags.split(',').map((item) => item.trim()).filter(Boolean),
      links: form.links.split('\n').map((item) => item.trim()).filter(Boolean),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => onOpenChange(false)}>
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">{licao ? 'Editar lição' : 'Nova lição'}</h3>
              <p className="text-sm text-slate-400">Preencha os detalhes da lição aprendida.</p>
            </div>
            <button type="button" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white">✕</button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm text-slate-300">Título</label>
              <Input value={form.title} onChange={(e) => handleChange('title', e.target.value)} className="bg-slate-900 border-slate-700 text-white" required />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => handleChange('tipo', e.target.value)}
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-white"
              >
                {TIPOS.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Data</label>
              <Input type="date" value={form.data} onChange={(e) => handleChange('data', e.target.value)} className="bg-slate-900 border-slate-700 text-white" />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Responsável</label>
              <Input value={form.responsavel} onChange={(e) => handleChange('responsavel', e.target.value)} className="bg-slate-900 border-slate-700 text-white" />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Tags</label>
              <Input value={form.tags} onChange={(e) => handleChange('tags', e.target.value)} placeholder="Ex: migração, cliente, prazo" className="bg-slate-900 border-slate-700 text-white" />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-sm text-slate-300">Problema</label>
              <Textarea value={form.problema} onChange={(e) => handleChange('problema', e.target.value)} className="min-h-[120px] bg-slate-900 border-slate-700 text-white" required />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-sm text-slate-300">Solução</label>
              <Textarea value={form.solucao} onChange={(e) => handleChange('solucao', e.target.value)} className="min-h-[120px] bg-slate-900 border-slate-700 text-white" required />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-sm text-slate-300">Links úteis</label>
              <Textarea value={form.links} onChange={(e) => handleChange('links', e.target.value)} placeholder="Um link por linha" className="min-h-[100px] bg-slate-900 border-slate-700 text-white" />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" className="border-slate-600 text-slate-300" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              {licao ? 'Salvar alterações' : 'Adicionar lição'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}