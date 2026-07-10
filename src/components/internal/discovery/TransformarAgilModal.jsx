import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Rocket, Loader2, CheckCircle2, FolderOpen, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';

// Monta o descritivo do projeto ágil a partir das informações do Discovery.
function buildDescription(d) {
  const parts = [];
  const push = (title, val) => { if (val && String(val).trim()) parts.push(`## ${title}\n${String(val).trim()}`); };

  push('Objetivo', d.diagnostico?.porque_resolver);
  push('Problema', d.diagnostico?.problema);
  if (d.ishikawa?.causa_principal) push('Causa Principal', d.ishikawa.causa_principal);
  if (d.cinco_porques?.conclusao) push('Causa Raiz (5 Porquês)', d.cinco_porques.conclusao);

  if ((d.hipoteses || []).length) {
    push('Hipóteses', d.hipoteses.map((h, i) => `${i + 1}. ${h.descricao || h.texto || h.hipotese || ''}`).filter(Boolean).join('\n'));
  }
  push('TO BE', d.to_be?.descricao);
  if (d.to_be?.melhorias) push('Melhorias previstas (TO BE)', d.to_be.melhorias);
  if (d.to_be?.beneficios) push('Benefícios (TO BE)', d.to_be.beneficios);

  if ((d.acoes || []).length) {
    push('Plano de Ações', d.acoes.map((a, i) => `${i + 1}. ${a.what || 'Ação'}${a.who ? ` — ${a.who}` : ''}${a.when ? ` (${a.when})` : ''}`).join('\n'));
  }
  if (d.diagnostico?.observacoes) push('Anotações', d.diagnostico.observacoes);

  parts.push(`\n_Origem: Discovery "${d.name || ''}"_`);
  return parts.join('\n\n');
}

export default function TransformarAgilModal({ open, onOpenChange, discovery }) {
  const [form, setForm] = useState({
    name: '', descricao: '', objetivo: '', area: '',
    responsavel: '', equipe: '', stakeholders: '', produtos: '', prioridade: 'media',
  });
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);

  useEffect(() => {
    if (open && discovery) {
      setCreated(null);
      setForm({
        name: discovery.name || '',
        descricao: discovery.diagnostico?.problema || '',
        objetivo: discovery.diagnostico?.porque_resolver || discovery.to_be?.descricao || '',
        area: discovery.persona?.perfil || '',
        responsavel: '', equipe: '', stakeholders: '', produtos: '', prioridade: 'media',
      });
    }
  }, [open, discovery]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Informe o nome do projeto.'); return; }
    setSaving(true);
    try {
      const project = await base44.entities.InternalProject.create({
        name: form.name.trim(),
        project_type: 'agil',
        status: 'planejamento',
        manager: form.responsavel || '',
        description: buildDescription({ ...discovery, name: form.name.trim() }),
      });

      // Copia riscos levantados (gaps do AS IS) como riscos do projeto
      const gaps = discovery?.as_is?.gaps || [];
      const riscos = gaps
        .map(g => (typeof g.descricao === 'string' ? g.descricao : '').trim())
        .filter(Boolean);
      if (riscos.length) {
        await base44.entities.InternalRisk.bulkCreate(riscos.map(title => ({
          project_id: project.id,
          title,
          category: 'outro',
          status: 'identificado',
        })));
      }

      setCreated(project);
      toast.success('Projeto criado com sucesso.');
    } catch (err) {
      toast.error('Erro ao criar projeto: ' + (err?.message || 'desconhecido'));
    }
    setSaving(false);
  };

  const goToProject = () => {
    window.location.href = createPageUrl(`InternalDashboard?id=${created.id}`);
  };

  const goGenerateBacklog = () => {
    window.location.href = createPageUrl(`AgilBacklog?project_id=${created.id}&generate=ia`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-xl max-h-[90vh] overflow-y-auto">
        {!created ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-emerald-400" />Criar Projeto Ágil
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-slate-300">Nome do Projeto *</Label>
                <Input value={form.name} onChange={e => set('name', e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Descrição</Label>
                <Textarea value={form.descricao} onChange={e => set('descricao', e.target.value)} rows={3} className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-slate-300">Objetivo</Label>
                  <Textarea value={form.objetivo} onChange={e => set('objetivo', e.target.value)} rows={2} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Área</Label>
                  <Input value={form.area} onChange={e => set('area', e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-slate-300">Responsável</Label>
                  <Input value={form.responsavel} onChange={e => set('responsavel', e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Prioridade</Label>
                  <Select value={form.prioridade} onValueChange={v => set('prioridade', v)}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="critica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-slate-300">Equipe</Label>
                  <Input value={form.equipe} onChange={e => set('equipe', e.target.value)} placeholder="Definir no projeto" className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Stakeholders</Label>
                  <Input value={form.stakeholders} onChange={e => set('stakeholders', e.target.value)} placeholder="Definir no projeto" className="bg-slate-800 border-slate-700 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Produtos</Label>
                <Input value={form.produtos} onChange={e => set('produtos', e.target.value)} placeholder="Definir no projeto" className="bg-slate-800 border-slate-700 text-white" />
              </div>

              <p className="text-xs text-slate-500">Problema, hipóteses, TO BE, plano de ações, riscos e anotações do Discovery serão copiados automaticamente. Equipe, produtos, stories e backlog serão definidos no Projeto Ágil.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800">Cancelar</Button>
              <Button onClick={handleCreate} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}Salvar
              </Button>
            </div>
          </>
        ) : (
          <div className="py-6 text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Projeto criado com sucesso.</h3>
              <p className="text-sm text-slate-400 mt-1">"{created.name}" foi criado como Projeto Ágil em planejamento.</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={goToProject} className="bg-emerald-600 hover:bg-emerald-700"><FolderOpen className="w-4 h-4 mr-2" />Abrir Projeto</Button>
              <Button onClick={goGenerateBacklog} variant="outline" className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"><Sparkles className="w-4 h-4 mr-2" />Gerar Backlog com IA</Button>
              <Button onClick={() => onOpenChange(false)} variant="ghost" className="text-slate-400 hover:text-white"><X className="w-4 h-4 mr-2" />Fechar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}