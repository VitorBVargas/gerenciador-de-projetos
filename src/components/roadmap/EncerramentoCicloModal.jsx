import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';

export default function EncerramentoCicloModal({ open, onOpenChange, ciclo, projectId, percentTotal }) {
  const queryClient = useQueryClient();
  const [licoes, setLicoes] = React.useState('');
  const [resultado, setResultado] = React.useState('');

  const mutation = useMutation({
    mutationFn: () => base44.entities.RoadmapCiclo.update(ciclo.id, {
      status: 'encerrado',
      percent_concluded: percentTotal,
      licoes_aprendidas: licoes,
      resultado_final: resultado,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmapCiclos', projectId] });
      toast.success('Ciclo encerrado e salvo no histórico!');
      onOpenChange(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Encerrar Ciclo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="bg-slate-800 rounded-lg p-4 text-center">
            <p className="text-slate-400 text-sm">Percentual atingido</p>
            <p className="text-4xl font-bold text-blue-400 mt-1">{percentTotal}%</p>
          </div>
          <div className="space-y-1">
            <Label className="text-slate-300 text-xs">Resultado Final</Label>
            <Textarea value={resultado} onChange={e => setResultado(e.target.value)}
              className="bg-slate-800 border-slate-700 resize-none" rows={2} placeholder="Descreva o resultado alcançado..." />
          </div>
          <div className="space-y-1">
            <Label className="text-slate-300 text-xs">Lições Aprendidas</Label>
            <Textarea value={licoes} onChange={e => setLicoes(e.target.value)}
              className="bg-slate-800 border-slate-700 resize-none" rows={3} placeholder="O que aprendemos neste ciclo?" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400">Cancelar</Button>
            <Button onClick={() => mutation.mutate()} className="bg-green-600 hover:bg-green-700" disabled={mutation.isPending}>
              {mutation.isPending ? 'Encerrando...' : 'Confirmar Encerramento'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}