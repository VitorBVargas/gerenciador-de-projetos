import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';

export default function CicloModal({ open, onOpenChange, projectId, ciclo = null }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    if (open) {
      if (ciclo) {
        reset({ name: ciclo.name, start_date: ciclo.start_date, end_date: ciclo.end_date });
      } else {
        const today = new Date().toISOString().split('T')[0];
        const d90 = new Date(); d90.setDate(d90.getDate() + 90);
        reset({ name: '', start_date: today, end_date: d90.toISOString().split('T')[0] });
      }
    }
  }, [open, ciclo, reset]);

  const mutation = useMutation({
    mutationFn: (data) => ciclo
      ? base44.entities.RoadmapCiclo.update(ciclo.id, data)
      : base44.entities.RoadmapCiclo.create({ ...data, project_id: projectId, status: 'ativo' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmapCiclos', projectId] });
      toast.success(ciclo ? 'Ciclo atualizado!' : 'Ciclo criado!');
      onOpenChange(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>{ciclo ? 'Editar Ciclo' : 'Novo Ciclo de Evolução'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label className="text-slate-300 text-xs">Nome do Ciclo</Label>
            <Input {...register('name', { required: true })} className="bg-slate-800 border-slate-700" placeholder="Ex: Ciclo de Evolução 01" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Início</Label>
              <Input type="date" {...register('start_date', { required: true })} className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Encerramento</Label>
              <Input type="date" {...register('end_date', { required: true })} className="bg-slate-800 border-slate-700" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400">Cancelar</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}