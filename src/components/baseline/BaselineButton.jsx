import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Bookmark, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { collectCurrentMilestones } from './baselineUtils';
import BaselineReasonModal from './BaselineReasonModal';

export default function BaselineButton({ projectId, timelineEvents, products }) {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);

  const { data: baselines = [] } = useQuery({
    queryKey: ['scheduleBaselines', projectId],
    queryFn: () => projectId ? base44.entities.ScheduleBaseline.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const sorted = [...baselines].sort((a, b) => (b.version || 0) - (a.version || 0));
  const latest = sorted[0] || null;
  const nextVersion = (latest?.version || 0) + 1;

  const createMutation = useMutation({
    mutationFn: async ({ reason, observation }) => {
      const user = await base44.auth.me().catch(() => null);
      const currentMilestones = collectCurrentMilestones(timelineEvents, products);

      // Marca todas as anteriores como inativas
      for (const b of baselines) {
        if (b.is_active) {
          await base44.entities.ScheduleBaseline.update(b.id, { is_active: false });
        }
      }

      return base44.entities.ScheduleBaseline.create({
        project_id: projectId,
        version: nextVersion,
        is_active: true,
        reason: reason || (nextVersion === 1 ? 'planejamento_inicial' : 'outro'),
        observation: observation || '',
        user_name: user?.full_name || '',
        user_email: user?.email || '',
        milestones: currentMilestones,
        previous_milestones: latest?.milestones || []
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduleBaselines', projectId] });
      toast.success(`Linha de Base V${nextVersion} criada.`);
      setReasonOpen(false);
    },
    onError: (err) => {
      toast.error('Erro ao criar baseline: ' + (err?.message || 'desconhecido'));
    }
  });

  const handleClick = () => {
    if (!projectId) return;
    if (latest) {
      setConfirmOpen(true);
    } else {
      // Cria V1 direto sem pedir motivo
      createMutation.mutate({ reason: 'planejamento_inicial', observation: '' });
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={handleClick}
        disabled={createMutation.isPending}
        className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 gap-2"
        title="Linha de Base"
      >
        {createMutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Bookmark className="w-4 h-4" />
        )}
        Baseline{latest ? ` V${latest.version}` : ''}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Tentativa de criar nova linha de base</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Já existe uma linha de base criada para este cronograma (V{latest?.version}).
              Deseja criar uma revisão (V{nextVersion})?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); setConfirmOpen(false); setReasonOpen(true); }}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Criar Revisão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BaselineReasonModal
        open={reasonOpen}
        onOpenChange={setReasonOpen}
        onConfirm={(payload) => createMutation.mutate(payload)}
        nextVersion={nextVersion}
        saving={createMutation.isPending}
      />
    </>
  );
}