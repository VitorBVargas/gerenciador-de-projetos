import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Download, RotateCcw, Trash2, Clock, Database, AlertTriangle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function BackupManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);

  const { data: backups = [], isLoading } = useQuery({
    queryKey: ['backups'],
    queryFn: () => base44.entities.DatabaseBackup.list('-created_date', 100),
    staleTime: 0,
    gcTime: 0
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['backup-projects'],
    queryFn: () => base44.entities.Project.list('name', 500),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000
  });

  const getApiErrorMessage = (error, fallbackMessage) => {
    return error?.response?.data?.error || error?.message || fallbackMessage;
  };

  const selectedProjects = useMemo(
    () => projects.filter((project) => selectedProjectIds.includes(project.id)),
    [projects, selectedProjectIds]
  );

  const handleProjectToggle = (projectId, checked) => {
    if (checked && selectedProjectIds.length >= 4) {
      toast.error('Você pode selecionar no máximo 4 projetos por vez.');
      return;
    }

    setSelectedProjectIds((current) =>
      checked ? [...current, projectId] : current.filter((id) => id !== projectId)
    );
  };

  const createBackupMutation = useMutation({
    mutationFn: async () => {
      if (selectedProjectIds.length === 0) {
        throw new Error('Selecione pelo menos 1 projeto para criar o backup.');
      }

      toast.info('Criação do backup iniciada.');

      for (const projectId of selectedProjectIds) {
        await base44.functions.invoke('createDatabaseBackup', { projectId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      toast.success(`Backup criado com sucesso para ${selectedProjectIds.length} projeto(s).`);
    },
    onError: (error) => {
      toast.error(`Erro ao criar backup: ${getApiErrorMessage(error, 'Falha ao criar backup.')}`);
    }
  });

  const restoreBackupMutation = useMutation({
    mutationFn: (backupId) => base44.functions.invoke('restoreDatabaseBackup', { backupId }),
    onSuccess: (response) => {
      const data = response.data;
      console.log('[RESTORE UI] Response:', data);
      
      toast.success(`Restauração completa! ${data.deleted_records} registros deletados, ${data.restored_records} restaurados.`, {
        duration: 5000,
      });
      
      // Aguarda um segundo antes de recarregar para garantir que os dados foram persistidos
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['backups'] });
        setRestoreDialogOpen(false);
        setSelectedBackup(null);
        // Recarrega a página para refletir as mudanças
        window.location.reload();
      }, 1000);
    },
    onError: (error) => {
      console.error('[RESTORE UI] Error:', error);
      toast.error(`Erro na restauração: ${getApiErrorMessage(error, 'Falha ao restaurar backup.')}`);
    }
  });

  const deleteBackupMutation = useMutation({
    mutationFn: (id) => base44.entities.DatabaseBackup.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      setDeleteDialogOpen(false);
      setSelectedBackup(null);
    }
  });

  const handleDownloadBackup = (backup) => {
    if (!backup?.backup_file_url) {
      toast.error('Este backup ainda não possui arquivo ZIP disponível.');
      return;
    }

    const link = document.createElement('a');
    link.href = backup.backup_file_url;
    link.download = backup.filename?.endsWith('.zip') ? backup.filename : `${backup.filename || 'backup'}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6 lg:p-8 space-y-6">
      {/* Header com botão voltar */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl('Home'))}
          className="text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-2">
            <Database className="w-8 h-8 text-blue-400" />
            Gerenciamento de Backups
          </h1>
          <p className="text-slate-400 mt-1">Crie, restaure ou delete versões do banco de dados</p>
        </div>
        <Button
          onClick={() => createBackupMutation.mutate()}
          disabled={createBackupMutation.isPending || selectedProjectIds.length === 0}
          className="bg-blue-600 hover:bg-blue-700 w-fit"
        >
          {createBackupMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {createBackupMutation.isPending ? 'Criando backup...' : 'Criar Backup Agora'}
        </Button>
      </div>

      {/* Seleção de Projetos */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">Projetos para backup</CardTitle>
          <p className="text-sm text-slate-400">Selecione até 4 projetos para criar backups de uma única vez.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
              {selectedProjectIds.length}/4 selecionados
            </Badge>
            {selectedProjects.map((project) => (
              <Badge key={project.id} className="bg-slate-700 text-slate-200 border-slate-600">
                {project.name}
              </Badge>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
            {projects.map((project) => {
              const checked = selectedProjectIds.includes(project.id);
              return (
                <label
                  key={project.id}
                  className="flex items-start gap-3 rounded-lg border border-slate-700 bg-slate-900/60 p-3 cursor-pointer hover:border-slate-600 transition-colors"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => handleProjectToggle(project.id, Boolean(value))}
                    className="mt-0.5 border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{project.name}</p>
                    <p className="text-xs text-slate-500 truncate">{project.manager || 'Sem gerente definido'}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-amber-500/10 border-amber-500/30">
        <CardContent className="pt-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-200 font-medium">Atenção ao restaurar</p>
            <p className="text-amber-100/80 text-sm mt-1">A restauração de um backup substituirá todos os dados atuais pelos dados da versão escolhida. Esta ação é irreversível.</p>
          </div>
        </CardContent>
      </Card>

      {/* Backups List */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Histórico de Backups</h2>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : backups.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="py-12 text-center">
              <Database className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Nenhum backup disponível</p>
              <p className="text-slate-500 text-sm mt-1">Clique em "Criar Backup Agora" para gerar o primeiro</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {backups.map((backup) => (
              <Card key={backup.id} className="bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-white truncate">{backup.filename}</h3>
                        {backup.restored_at && (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Restaurado
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm text-slate-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{formatDistanceToNow(new Date(backup.timestamp), { addSuffix: true, locale: ptBR })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Database className="w-3.5 h-3.5 text-slate-500" />
                          <span>{backup.entity_count} entidades</span>
                        </div>
                        <div className="text-right">
                          <span>{backup.total_records} registros</span>
                        </div>
                      </div>
                      {backup.restored_at && (
                        <p className="text-xs text-slate-500 mt-2">
                          Restaurado em {format(new Date(backup.restored_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownloadBackup(backup)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        title="Baixar ZIP"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedBackup(backup);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Restore Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar restauração</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Você está prestes a restaurar o backup de <strong>{selectedBackup?.filename}</strong>. 
              <br /><br />
              <strong className="text-amber-400">Todos os dados atuais serão substituídos.</strong> Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => restoreBackupMutation.mutate(selectedBackup?.id)}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={restoreBackupMutation.isPending}
            >
              {restoreBackupMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {restoreBackupMutation.isPending ? 'Restaurando...' : 'Restaurar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Deletar backup</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja deletar o backup <strong>{selectedBackup?.filename}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteBackupMutation.mutate(selectedBackup?.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}