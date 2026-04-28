import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';

const TIPO_OPTIONS = [
  { value: 'tecnico', label: 'Técnico' },
  { value: 'processo', label: 'Processo' },
  { value: 'comunicacao', label: 'Comunicação' },
  { value: 'cronograma', label: 'Cronograma' },
  { value: 'risco', label: 'Risco' },
  { value: 'cliente', label: 'Cliente' },
  { value: 'outro', label: 'Outro' },
];

const EMPTY = {
  title: '',
  tipo: 'tecnico',
  problema: '',
  solucao: '',
  links: [],
  tags: [],
  responsavel: '',
  data: new Date().toISOString().split('T')[0],
};

export default function LicaoAprendidaModal({ open, onOpenChange, licao, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [newLink, setNewLink] = useState('');
  const [newTag, setNewTag] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(licao ? { ...EMPTY, ...licao } : EMPTY);
      setNewLink('');
      setNewTag('');
      setErrors({});
    }
  }, [open, licao]);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Título obrigatório';
    if (!form.problema.trim()) e.problema = 'Problema obrigatório';
    if (!form.solucao.trim()) e.solucao = 'Solução obrigatória';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave(form);
  };

  const addLink = () => {
    const trimmed = newLink.trim();
    if (trimmed && !form.links.includes(trimmed)) {
      setForm(f => ({ ...f, links: [...f.links, trimmed] }));
    }
    setNewLink('');
  };

  const removeLink = (idx) => setForm(f => ({ ...f, links: f.links.filter((_, i) => i !== idx) }));

  const addTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !form.tags.includes(trimmed)) {
      setForm(f => ({ ...f, tags: [...f.tags, trimmed] }));
    }
    setNewTag('');
  };

  const removeTag = (tag) => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            {licao ? 'Editar Lição Aprendida' : 'Nova Lição Aprendida'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título */}
          <div className="space-y-1.5">
            <Label className="text-slate-300">Título <span className="text-red-400">*</span></Label>
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Ex: Problema com migração de banco de dados"
              className="bg-slate-700 border-slate-600 text-white"
            />
            {errors.title && <p className="text-xs text-red-400">{errors.title}</p>}
          </div>

          {/* Tipo + Responsável + Data */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300">Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {TIPO_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Responsável</Label>
              <Input
                value={form.responsavel}
                onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))}
                placeholder="Nome do responsável"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Data</Label>
              <Input
                type="date"
                value={form.data}
                onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          {/* Problema */}
          <div className="space-y-1.5">
            <Label className="text-slate-300">Problema <span className="text-red-400">*</span></Label>
            <Textarea
              value={form.problema}
              onChange={e => setForm(f => ({ ...f, problema: e.target.value }))}
              placeholder="Descreva o problema enfrentado..."
              className="bg-slate-700 border-slate-600 text-white min-h-[90px] resize-none"
            />
            {errors.problema && <p className="text-xs text-red-400">{errors.problema}</p>}
          </div>

          {/* Solução */}
          <div className="space-y-1.5">
            <Label className="text-slate-300">Solução <span className="text-red-400">*</span></Label>
            <Textarea
              value={form.solucao}
              onChange={e => setForm(f => ({ ...f, solucao: e.target.value }))}
              placeholder="Descreva a solução aplicada..."
              className="bg-slate-700 border-slate-600 text-white min-h-[90px] resize-none"
            />
            {errors.solucao && <p className="text-xs text-red-400">{errors.solucao}</p>}
          </div>

          {/* Links */}
          <div className="space-y-1.5">
            <Label className="text-slate-300">Links úteis</Label>
            <div className="flex gap-2">
              <Input
                value={newLink}
                onChange={e => setNewLink(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }}
                placeholder="https://..."
                className="bg-slate-700 border-slate-600 text-white flex-1"
              />
              <Button type="button" size="sm" onClick={addLink} className="bg-slate-600 hover:bg-slate-500 px-3">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {form.links.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {form.links.map((link, idx) => (
                  <div key={idx} className="flex items-center gap-1 bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded px-2 py-0.5 text-xs max-w-xs">
                    <a href={link} target="_blank" rel="noreferrer" className="truncate hover:underline">{link}</a>
                    <button type="button" onClick={() => removeLink(idx)} className="text-blue-400 hover:text-white flex-shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label className="text-slate-300">Tags</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Ex: migração, banco, prazo..."
                className="bg-slate-700 border-slate-600 text-white flex-1"
              />
              <Button type="button" size="sm" onClick={addTag} className="bg-slate-600 hover:bg-slate-500 px-3">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {form.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 bg-slate-600 text-slate-200 rounded-full px-2.5 py-0.5 text-xs">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="text-slate-400 hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              {licao ? 'Salvar alterações' : 'Adicionar Lição'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}