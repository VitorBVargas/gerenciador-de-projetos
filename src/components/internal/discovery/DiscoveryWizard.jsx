import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';

import StepDiagnostico from './StepDiagnostico';
import StepIshikawa from './StepIshikawa';
import StepCincoPorques from './StepCincoPorques';
import StepAsIs from './StepAsIs';
import StepToBe from './StepToBe';
import StepPlanoAcoes from './StepPlanoAcoes';
import StepResultado from './StepResultado';
import { riceScore, ricePriority, emptyDiscovery } from './discoveryUtils';

const STEPS = [
  { id: 'diagnostico', label: '1. Diagnóstico' },
  { id: 'ishikawa', label: '2. Causa Raiz' },
  { id: 'cinco_porques', label: '3. 5 Porquês' },
  { id: 'as_is', label: '4. AS IS' },
  { id: 'to_be', label: '5. TO BE' },
  { id: 'acoes', label: '6. Plano de Ações' },
  { id: 'resultado', label: 'Resultado' }
];

export default function DiscoveryWizard({ open, onOpenChange, discovery, projectId }) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState(emptyDiscovery());
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      if (discovery) {
        setData({ ...emptyDiscovery(discovery.name), ...discovery });
      } else {
        setData(emptyDiscovery(''));
      }
    }
  }, [open, discovery]);

  const saveMutation = useMutation({
    mutationFn: (payload) => discovery?.id
      ? base44.entities.Discovery.update(discovery.id, payload)
      : base44.entities.Discovery.create({ ...payload, project_id: projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discoveries', projectId] });
    }
  });

  const handleSave = async (extraPatch = {}) => {
    const name = (data.name || '').trim() || `Discovery ${new Date().toLocaleDateString('pt-BR')}`;
    const payload = { ...data, ...extraPatch, name };
    try {
      const result = await saveMutation.mutateAsync(payload);
      setData(prev => ({ ...prev, ...payload, id: result?.id || prev.id }));
      return result;
    } catch (err) {
      toast.error('Erro ao salvar: ' + (err?.message || 'desconhecido'));
      return null;
    }
  };

  const handleClose = async () => {
    await handleSave();
    onOpenChange(false);
  };

  const handleGenerateTasks = async () => {
    setGenerating(true);
    try {
      // Garante que está salvo antes
      const saved = await handleSave();
      const discoveryId = saved?.id || discovery?.id || data.id;
      if (!discoveryId) {
        toast.error('Salve o discovery antes de gerar tarefas.');
        setGenerating(false);
        return;
      }

      const updatedAcoes = [];
      let createdCount = 0;
      let skippedCount = 0;

      for (const acao of (data.acoes || [])) {
        if (acao.task_id) {
          // Já vinculada — atualiza para refletir mudanças
          try {
            await base44.entities.ProjectActivity.update(acao.task_id, {
              title: acao.what || 'Ação sem título',
              description: [acao.why && `Por quê: ${acao.why}`, acao.how && `Como: ${acao.how}`].filter(Boolean).join('\n\n'),
              assignee: acao.who || '',
              end_date: acao.when || null,
              priority: ricePriority(riceScore(acao))
            });
            skippedCount++;
            updatedAcoes.push(acao);
            continue;
          } catch {
            // Se a tarefa foi removida, recria
          }
        }

        const created = await base44.entities.ProjectActivity.create({
          project_id: projectId,
          title: acao.what || 'Ação sem título',
          description: [
            acao.why && `Por quê: ${acao.why}`,
            acao.how && `Como: ${acao.how}`,
            `[Discovery: ${data.name}]`
          ].filter(Boolean).join('\n\n'),
          assignee: acao.who || '',
          end_date: acao.when || null,
          status: 'todo',
          vertical: 'interno',
          priority: ricePriority(riceScore(acao)),
          discovery_id: discoveryId
        });
        updatedAcoes.push({ ...acao, task_id: created.id });
        createdCount++;
      }

      const finalData = { ...data, acoes: updatedAcoes };
      await base44.entities.Discovery.update(discoveryId, finalData);
      setData(finalData);
      queryClient.invalidateQueries({ queryKey: ['activities', projectId] });
      queryClient.invalidateQueries({ queryKey: ['discoveries', projectId] });
      toast.success(`${createdCount} tarefa(s) criada(s)${skippedCount ? ` · ${skippedCount} atualizada(s)` : ''}`);
    } catch (err) {
      toast.error('Erro ao gerar tarefas: ' + (err?.message || 'desconhecido'));
    }
    setGenerating(false);
  };

  const handleConcluir = async () => {
    await handleSave({ status: 'concluido' });
    setData(prev => ({ ...prev, status: 'concluido' }));
    toast.success('Discovery concluído!');
  };

  const updateField = (field) => (val) => setData(prev => ({ ...prev, [field]: val }));

  const stepId = STEPS[currentStep].id;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="space-y-3">
          <DialogTitle>
            <Input
              value={data.name || ''}
              onChange={e => setData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nome do discovery"
              className="bg-transparent border-0 border-b border-slate-700 rounded-none px-0 text-lg font-semibold focus-visible:ring-0 focus-visible:border-indigo-500"
            />
          </DialogTitle>

          {/* Stepper */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {STEPS.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentStep(idx)}
                className={cn(
                  "px-3 py-1.5 rounded text-xs whitespace-nowrap transition-colors",
                  idx === currentStep ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2 py-2">
          {stepId === 'diagnostico' && <StepDiagnostico data={data.diagnostico || {}} onChange={updateField('diagnostico')} />}
          {stepId === 'ishikawa' && <StepIshikawa data={data.ishikawa || {}} onChange={updateField('ishikawa')} />}
          {stepId === 'cinco_porques' && <StepCincoPorques data={data.cinco_porques || {}} diagnostico={data.diagnostico} ishikawa={data.ishikawa} onChange={updateField('cinco_porques')} />}
          {stepId === 'as_is' && <StepAsIs data={data.as_is || {}} onChange={updateField('as_is')} />}
          {stepId === 'to_be' && <StepToBe data={data.to_be || {}} onChange={updateField('to_be')} />}
          {stepId === 'acoes' && <StepPlanoAcoes acoes={data.acoes || []} onChange={updateField('acoes')} />}
          {stepId === 'resultado' && <StepResultado discovery={data} onGenerateTasks={handleGenerateTasks} onConcluir={handleConcluir} generating={generating} />}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <Button variant="ghost" onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={currentStep === 0} className="text-slate-300 hover:text-white">
            <ChevronLeft className="w-4 h-4 mr-1" />Anterior
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => handleSave()} disabled={saveMutation.isPending} className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800">
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Salvar
            </Button>
            {currentStep < STEPS.length - 1 ? (
              <Button onClick={() => setCurrentStep(s => Math.min(STEPS.length - 1, s + 1))} className="bg-indigo-600 hover:bg-indigo-700">
                Próximo<ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleClose} className="bg-indigo-600 hover:bg-indigo-700">Fechar</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}