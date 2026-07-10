import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { TIPO_OPTIONS, PRIORIDADE_OPTIONS, STATUS_OPTIONS } from './backlogMeta';

const empty = {
  tipo: 'story',
  titulo: '',
  descricao: '',
  produto: '',
  vertical: '',
  epic_id: '',
  feature_id: '',
  story_id: '',
  story_points: 0,
  responsavel: '',
  sprint_id: '',
  release: '',
  prioridade: 'media',
  status: 'backlog',
  criterio_aceite: '',
  definition_of_ready: '',
  definition_of_done: '',
  estimativa_horas: 0,
  dependencias: [],
  rice: { reach: '', impact: '', confidence: '', effort: '', score: '' },
  tags: [],
};

export default function BacklogItemModal({ open, onOpenChange, item, projectId, items, sprints, onSaved }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({ ...empty, ...item, tags: item.tags || [], dependencias: item.dependencias || [], rice: { ...empty.rice, ...(item.rice || {}) } });
    } else {
      setForm(empty);
    }
  }, [item, open]);

  const setRice = (k, v) => setForm(prev => {
    const rice = { ...prev.rice, [k]: v };
    const r = Number(rice.reach), i = Number(rice.impact), c = Number(rice.confidence), e = Number(rice.effort);
    rice.score = (r && i && c && e) ? Math.round((r * i * c / e) * 10) / 10 : rice.score;
    return { ...prev, rice };
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const epics = (items || []).filter(i => i.tipo === 'epic');
  const features = (items || []).filter(i => i.tipo === 'feature');
  const stories = (items || []).filter(i => i.tipo === 'story');

  const handleSave = async () => {
    if (!form.titulo.trim()) return;
    setSaving(true);
    const riceNums = {
      reach: Number(form.rice?.reach) || undefined,
      impact: Number(form.rice?.impact) || undefined,
      confidence: Number(form.rice?.confidence) || undefined,
      effort: Number(form.rice?.effort) || undefined,
      score: Number(form.rice?.score) || undefined,
    };
    const hasRice = Object.values(riceNums).some(v => v !== undefined);
    const payload = {
      ...form,
      project_id: projectId,
      story_points: Number(form.story_points) || 0,
      estimativa_horas: Number(form.estimativa_horas) || 0,
      rice: hasRice ? riceNums : undefined,
      tags: typeof form.tags === 'string' ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : (form.tags || []),
      dependencias: Array.isArray(form.dependencias) ? form.dependencias : [],
    };
    if (item?.id) {
      await base44.entities.AgileBacklog.update(item.id, payload);
    } else {
      await base44.entities.AgileBacklog.create(payload);
    }
    setSaving(false);
    onSaved?.();
    onOpenChange(false);
  };

  const tagsValue = Array.isArray(form.tags) ? form.tags.join(', ') : form.tags;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Editar Item' : 'Novo Item'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <div>
            <Label className="text-slate-300">Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => set('tipo', v)}>
              <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                {TIPO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-slate-300">Prioridade</Label>
            <Select value={form.prioridade} onValueChange={(v) => set('prioridade', v)}>
              <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                {PRIORIDADE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Label className="text-slate-300">Título *</Label>
            <Input value={form.titulo} onChange={(e) => set('titulo', e.target.value)} className="bg-slate-800 border-slate-700" />
          </div>

          <div className="md:col-span-2">
            <Label className="text-slate-300">Descrição</Label>
            <Textarea value={form.descricao} onChange={(e) => set('descricao', e.target.value)} className="bg-slate-800 border-slate-700" rows={3} />
          </div>

          <div>
            <Label className="text-slate-300">Produto</Label>
            <Input value={form.produto} onChange={(e) => set('produto', e.target.value)} className="bg-slate-800 border-slate-700" />
          </div>
          <div>
            <Label className="text-slate-300">Vertical</Label>
            <Input value={form.vertical} onChange={(e) => set('vertical', e.target.value)} className="bg-slate-800 border-slate-700" />
          </div>

          {(form.tipo === 'feature' || form.tipo === 'story' || form.tipo === 'bug') && (
            <div>
              <Label className="text-slate-300">Epic</Label>
              <Select value={form.epic_id || 'none'} onValueChange={(v) => set('epic_id', v === 'none' ? '' : v)}>
                <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  <SelectItem value="none">Nenhum</SelectItem>
                  {epics.map(e => <SelectItem key={e.id} value={e.id}>{e.titulo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {(form.tipo === 'story' || form.tipo === 'bug') && (
            <div>
              <Label className="text-slate-300">Feature</Label>
              <Select value={form.feature_id || 'none'} onValueChange={(v) => set('feature_id', v === 'none' ? '' : v)}>
                <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {features.map(f => <SelectItem key={f.id} value={f.id}>{f.titulo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {form.tipo === 'bug' && (
            <div>
              <Label className="text-slate-300">Story</Label>
              <Select value={form.story_id || 'none'} onValueChange={(v) => set('story_id', v === 'none' ? '' : v)}>
                <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {stories.map(s => <SelectItem key={s.id} value={s.id}>{s.titulo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-slate-300">Story Points</Label>
            <Input type="number" value={form.story_points} onChange={(e) => set('story_points', e.target.value)} className="bg-slate-800 border-slate-700" />
          </div>
          <div>
            <Label className="text-slate-300">Estimativa (horas)</Label>
            <Input type="number" value={form.estimativa_horas} onChange={(e) => set('estimativa_horas', e.target.value)} className="bg-slate-800 border-slate-700" />
          </div>

          <div>
            <Label className="text-slate-300">Responsável</Label>
            <Input value={form.responsavel} onChange={(e) => set('responsavel', e.target.value)} className="bg-slate-800 border-slate-700" />
          </div>
          <div>
            <Label className="text-slate-300">Sprint</Label>
            <Select value={form.sprint_id || 'none'} onValueChange={(v) => set('sprint_id', v === 'none' ? '' : v)}>
              <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue placeholder="Backlog geral" /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                <SelectItem value="none">Backlog geral</SelectItem>
                {(sprints || []).map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-300">Release</Label>
            <Input value={form.release} onChange={(e) => set('release', e.target.value)} placeholder="Ex: v1.0" className="bg-slate-800 border-slate-700" />
          </div>

          <div>
            <Label className="text-slate-300">Status</Label>
            <Select value={form.status} onValueChange={(v) => set('status', v)}>
              <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-slate-300">Tags (separadas por vírgula)</Label>
            <Input value={tagsValue} onChange={(e) => set('tags', e.target.value)} className="bg-slate-800 border-slate-700" />
          </div>

          {/* RICE */}
          <div className="md:col-span-2">
            <Label className="text-slate-300">Priorização RICE</Label>
            <div className="grid grid-cols-5 gap-2 mt-1">
              <Input type="number" value={form.rice?.reach ?? ''} onChange={(e) => setRice('reach', e.target.value)} placeholder="Reach" className="bg-slate-800 border-slate-700 text-xs" />
              <Input type="number" value={form.rice?.impact ?? ''} onChange={(e) => setRice('impact', e.target.value)} placeholder="Impact" className="bg-slate-800 border-slate-700 text-xs" />
              <Input type="number" value={form.rice?.confidence ?? ''} onChange={(e) => setRice('confidence', e.target.value)} placeholder="Confid." className="bg-slate-800 border-slate-700 text-xs" />
              <Input type="number" value={form.rice?.effort ?? ''} onChange={(e) => setRice('effort', e.target.value)} placeholder="Effort" className="bg-slate-800 border-slate-700 text-xs" />
              <Input value={form.rice?.score ?? ''} readOnly placeholder="Score" className="bg-slate-900 border-slate-700 text-xs text-cyan-300" />
            </div>
          </div>

          {/* Dependências */}
          <div className="md:col-span-2">
            <Label className="text-slate-300">Dependências</Label>
            <div className="max-h-28 overflow-y-auto bg-slate-800 border border-slate-700 rounded-md p-2 mt-1 space-y-1">
              {(items || []).filter(i => i.id !== item?.id).length === 0 && <p className="text-xs text-slate-500">Nenhum outro item disponível.</p>}
              {(items || []).filter(i => i.id !== item?.id).map(dep => {
                const checked = (form.dependencias || []).includes(dep.id);
                return (
                  <label key={dep.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => set('dependencias', checked ? form.dependencias.filter(x => x !== dep.id) : [...(form.dependencias || []), dep.id])}
                    />
                    <span className="truncate">[{dep.tipo}] {dep.titulo}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-2">
            <Label className="text-slate-300">Critérios de Aceite</Label>
            <Textarea value={form.criterio_aceite} onChange={(e) => set('criterio_aceite', e.target.value)} className="bg-slate-800 border-slate-700" rows={2} />
          </div>
          <div>
            <Label className="text-slate-300">Definition of Ready</Label>
            <Textarea value={form.definition_of_ready} onChange={(e) => set('definition_of_ready', e.target.value)} className="bg-slate-800 border-slate-700" rows={2} />
          </div>
          <div>
            <Label className="text-slate-300">Definition of Done</Label>
            <Textarea value={form.definition_of_done} onChange={(e) => set('definition_of_done', e.target.value)} className="bg-slate-800 border-slate-700" rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="border-slate-700 text-slate-300" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.titulo.trim()} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}