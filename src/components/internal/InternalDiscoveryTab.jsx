import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Lightbulb, CheckCircle2, Trash2, Loader2, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import EmptyState from '../ui/EmptyState';
import DiscoveryWizard from './discovery/DiscoveryWizard';
import DiscoveryReport from './discovery/DiscoveryReport';

export default function InternalDiscoveryTab({ projectId }) {
  const queryClient = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const { data: discoveries = [], isLoading } = useQuery({
    queryKey: ['discoveries', projectId],
    queryFn: () => base44.entities.Discovery.filter({ project_id: projectId }, '-updated_date'),
    enabled: !!projectId
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Discovery.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discoveries', projectId] });
      setDeleteOpen(false);
      setToDelete(null);
    }
  });

  const openCreate = () => { setSelected(null); setWizardOpen(true); };
  const openEdit = (d) => { setSelected(d); setReportOpen(false); setWizardOpen(true); };
  const openReport = (d) => { setSelected(d); setReportOpen(true); };

  const statusBadge = {
    em_andamento: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    concluido: 'bg-green-500/20 text-green-400 border-green-500/30'
  };
  const statusLabel = { em_andamento: 'Em andamento', concluido: 'Concluído' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-2">
            <Lightbulb className="w-7 h-7 text-yellow-400" />
            Discovery
          </h1>
          <p className="text-slate-400 mt-1">Análise estruturada de melhorias de processo</p>
        </div>
        <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          Novo Discovery
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
      ) : discoveries.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="Nenhum discovery iniciado"
          description="Crie um novo discovery para conduzir uma análise estruturada com o time."
          action={<Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2" />Novo Discovery</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {discoveries.map(d => {
            const totalAcoes = d.acoes?.length || 0;
            const tarefasGeradas = d.acoes?.filter(a => a.task_id).length || 0;
            return (
              <Card key={d.id} className="bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-indigo-500/40 transition-all group cursor-pointer" onClick={() => openReport(d)}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate" title={d.name}>{d.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {d.updated_date ? format(new Date(d.updated_date), "dd 'de' MMM, yyyy", { locale: ptBR }) : '—'}
                      </p>
                    </div>
                    <Badge className={cn("border text-xs flex-shrink-0", statusBadge[d.status] || statusBadge.em_andamento)}>
                      {d.status === 'concluido' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {statusLabel[d.status] || statusLabel.em_andamento}
                    </Badge>
                  </div>

                  {d.diagnostico?.problema && (
                    <p className="text-sm text-slate-400 line-clamp-2">{d.diagnostico.problema}</p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                    <div className="flex gap-3 text-xs text-slate-500">
                      <span><span className="text-white font-medium">{totalAcoes}</span> ações</span>
                      <span><span className="text-green-400 font-medium">{tarefasGeradas}</span> no board</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-slate-400 hover:text-indigo-300"
                        onClick={(e) => { e.stopPropagation(); openEdit(d); }}
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100"
                        onClick={(e) => { e.stopPropagation(); setToDelete(d); setDeleteOpen(true); }}
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <DiscoveryWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        discovery={selected}
        projectId={projectId}
      />

      <DiscoveryReport
        open={reportOpen}
        onOpenChange={setReportOpen}
        discovery={selected}
        onEdit={() => { setReportOpen(false); setWizardOpen(true); }}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Excluir discovery?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              As tarefas já geradas no board não serão excluídas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(toDelete?.id)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}