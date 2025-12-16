import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, FolderOpen, Trash2, Upload, Calendar, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ExcelImporter from '../components/import/ExcelImporter';
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

const statusColors = {
  planejamento: 'bg-slate-500',
  em_andamento: 'bg-blue-500',
  pausado: 'bg-yellow-500',
  concluido: 'bg-green-500'
};

const statusLabels = {
  planejamento: 'Planejamento',
  em_andamento: 'Em Andamento',
  pausado: 'Pausado',
  concluido: 'Concluído'
};

export default function ProjectsList() {
  const queryClient = useQueryClient();
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
  });

  const deleteMutation = useMutation({
    mutationFn: async (projectId) => {
      // Delete all related data
      const entities = ['TeamMember', 'Stakeholder', 'Product', 'TimelineEvent', 
                       'KanbanTask', 'Risk', 'Travel', 'Training', 'MigrationTask', 
                       'HomologationTask', 'OperationalReport'];
      
      for (const entity of entities) {
        const records = await base44.entities[entity].filter({ project_id: projectId });
        for (const record of records) {
          await base44.entities[entity].delete(record.id);
        }
      }
      
      // Delete project
      await base44.entities.Project.delete(projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  });

  const handleDelete = (project) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const handleImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    setImportModalOpen(false);
  };

  // Filter out 100% completed projects
  const activeProjects = projects.filter(p => p.status !== 'concluido');

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Meus Projetos</h1>
            <p className="text-slate-400 mt-1">{activeProjects.length} projeto(s) ativo(s)</p>
          </div>
          <Button 
            onClick={() => setImportModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            Importar Projeto
          </Button>
        </div>

        {/* Projects Grid */}
        {activeProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeProjects.map((project) => (
              <Card key={project.id} className="bg-slate-800/50 border-slate-700 hover:bg-slate-800 transition-all group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white text-lg mb-2">{project.name}</CardTitle>
                      <Badge className={statusColors[project.status]}>
                        {statusLabels[project.status]}
                      </Badge>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete(project);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {project.manager && (
                    <div className="text-sm text-slate-400">
                      <span className="text-slate-500">Gerente:</span> {project.manager}
                    </div>
                  )}
                  
                  {project.deadline && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Calendar className="w-4 h-4" />
                      <span>Prazo: {format(new Date(project.deadline), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    </div>
                  )}

                  {project.value && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <DollarSign className="w-4 h-4" />
                      <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(project.value)}</span>
                    </div>
                  )}

                  <Link to={createPageUrl(`Dashboard?project_id=${project.id}`)}>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 mt-4">
                      <FolderOpen className="w-4 h-4 mr-2" />
                      Abrir Projeto
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-16 text-center">
              <Upload className="w-16 h-16 mx-auto mb-4 text-slate-600" />
              <h3 className="text-xl font-semibold text-white mb-2">Nenhum projeto ativo</h3>
              <p className="text-slate-400 mb-6">Importe um projeto do Excel para começar</p>
              <Button onClick={() => setImportModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Upload className="w-4 h-4 mr-2" />
                Importar Primeiro Projeto
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Import Modal */}
      <ExcelImporter
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onSuccess={handleImportSuccess}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja excluir o projeto "{projectToDelete?.name}"? Todos os dados relacionados (equipe, produtos, cronograma, etc.) serão permanentemente removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(projectToDelete?.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir Projeto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}