import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { phaseLabels } from '@/components/timeline/phaseLabels';

export default function ActivityModal({ open, onOpenChange, activity, projectId, verticals }) {
  const queryClient = useQueryClient();
  
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers', projectId],
    queryFn: () => projectId ? base44.entities.TeamMember.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const { data: dbColumns = [] } = useQuery({
    queryKey: ['kanbanColumns', projectId],
    queryFn: () => projectId ? base44.entities.KanbanColumn.filter({ project_id: projectId }, "order", 100) : [],
    enabled: !!projectId
  });

  const columns = dbColumns.length > 0 ? [...dbColumns].sort((a,b) => a.order - b.order) : [
    { id: 'todo', key: 'todo', title: 'A Fazer' },
    { id: 'in_progress', key: 'in_progress', title: 'Em Andamento' },
    { id: 'done', key: 'done', title: 'Concluído' }
  ];
  
  const { register, handleSubmit, reset, setValue, watch } = useForm();

  useEffect(() => {
    if (open) {
      if (activity) {
        reset({
          title: activity.title,
          description: activity.description || '',
          start_date: activity.start_date || '',
          end_date: activity.end_date || '',
          assignee: activity.assignee || '',
          status: activity.status || 'todo',
          vertical: activity.vertical || verticals[0] || '',
          phase: activity.phase || activity.timeline_event_id || 'none'
        });
      } else {
        reset({
          title: '',
          description: '',
          start_date: '',
          end_date: '',
          assignee: '',
          status: 'todo',
          vertical: verticals[0] || '',
          phase: 'none'
        });
      }
    }
  }, [open, activity, reset, verticals]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (activity) {
        return base44.entities.ProjectActivity.update(activity.id, data);
      }
      return base44.entities.ProjectActivity.create({ ...data, project_id: projectId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', projectId] });
      toast.success(activity ? 'Atividade atualizada!' : 'Atividade criada!');
      onOpenChange(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.ProjectActivity.delete(activity.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', projectId] });
      toast.success('Atividade excluída!');
      onOpenChange(false);
    }
  });

  const onSubmit = (data) => {
    const payload = { ...data };
    if (payload.phase === 'none') {
      payload.phase = null;
    }
    saveMutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{activity ? 'Editar Atividade' : 'Nova Atividade'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Título *</label>
            <Input 
              {...register('title', { required: true })} 
              className="bg-slate-800 border-slate-700" 
              placeholder="Nome da atividade"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Vertical *</label>
              <Select value={watch('vertical')} onValueChange={(val) => setValue('vertical', val)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 capitalize">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  {verticals.map(v => (
                    <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Status</label>
              <Select value={watch('status')} onValueChange={(val) => setValue('status', val)}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  {columns.map(c => (
                    <SelectItem key={c.id} value={c.key || c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Etapa do Cronograma</label>
            <Select value={watch('phase')} onValueChange={(val) => setValue('phase', val)}>
              <SelectTrigger className="bg-slate-800 border-slate-700">
                <SelectValue placeholder="Selecione uma etapa (opcional)" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white max-h-[200px]">
                <SelectItem value="none">Nenhuma</SelectItem>
                {Object.entries(phaseLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Responsável</label>
            <Select value={watch('assignee')} onValueChange={(val) => setValue('assignee', val)}>
              <SelectTrigger className="bg-slate-800 border-slate-700">
                <SelectValue placeholder="Selecione um responsável" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                {teamMembers
                  .filter(member => member.vertical === watch('vertical'))
                  .map(member => (
                  <SelectItem key={member.id} value={member.name}>{member.name}</SelectItem>
                ))}
                {teamMembers.filter(member => member.vertical === watch('vertical')).length === 0 && (
                  <div className="p-2 text-sm text-slate-400 text-center">Nenhum membro nesta vertical</div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Data de Início</label>
              <Input 
                type="date" 
                {...register('start_date')} 
                className="bg-slate-800 border-slate-700" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Data de Fim</label>
              <Input 
                type="date" 
                {...register('end_date')} 
                className="bg-slate-800 border-slate-700" 
              />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            {activity ? (
              <Button type="button" variant="destructive" onClick={() => deleteMutation.mutate()}>
                Excluir
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Salvar
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}