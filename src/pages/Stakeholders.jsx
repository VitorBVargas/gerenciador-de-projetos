import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  UserCircle,
  Mail,
  Phone,
  Pencil,
  Trash2,
  MessageSquare
} from 'lucide-react';
import { cn } from "@/lib/utils";
import StakeholderModal from '../components/modals/StakeholderModal';
import EmptyState from '../components/ui/EmptyState';
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

const communicationColors = {
  alto: 'bg-green-500/20 text-green-400 border-green-500/30',
  medio: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  baixo: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
};

const communicationLabels = {
  alto: 'Alto',
  medio: 'Médio',
  baixo: 'Baixo'
};

export default function Stakeholders() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStakeholder, setSelectedStakeholder] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [stakeholderToDelete, setStakeholderToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Get project_id from URL
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
  });

  const { data: stakeholders = [] } = useQuery({
    queryKey: ['stakeholders', projectId],
    queryFn: () => projectId ? base44.entities.Stakeholder.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const activeProject = projects.find(p => p.id === projectId);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Stakeholder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stakeholders', projectId] });
      setModalOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Stakeholder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stakeholders', projectId] });
      setModalOpen(false);
      setSelectedStakeholder(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Stakeholder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stakeholders', projectId] });
      setDeleteDialogOpen(false);
      setStakeholderToDelete(null);
    }
  });

  const handleSave = (data) => {
    if (selectedStakeholder) {
      updateMutation.mutate({ id: selectedStakeholder.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (stakeholder) => {
    setSelectedStakeholder(stakeholder);
    setModalOpen(true);
  };

  const handleDelete = (stakeholder) => {
    setStakeholderToDelete(stakeholder);
    setDeleteDialogOpen(true);
  };

  const filteredStakeholders = stakeholders.filter(s =>
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Stakeholders</h1>
          <p className="text-slate-400 mt-1">{stakeholders.length} stakeholders cadastrados</p>
        </div>
        <Button 
          onClick={() => { setSelectedStakeholder(null); setModalOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Stakeholder
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          placeholder="Buscar por nome ou papel..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
        />
      </div>

      {/* Stakeholders Grid */}
      {filteredStakeholders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStakeholders.map((stakeholder) => (
            <Card key={stakeholder.id} className="bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 transition-all group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
                      {stakeholder.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{stakeholder.name}</h3>
                      <p className="text-sm text-slate-400">{stakeholder.role || 'Papel não definido'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                      onClick={() => handleEdit(stakeholder)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                      onClick={() => handleDelete(stakeholder)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {stakeholder.communication_level && (
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-slate-500" />
                      <Badge className={cn("border", communicationColors[stakeholder.communication_level])}>
                        Comunicação {communicationLabels[stakeholder.communication_level]}
                      </Badge>
                    </div>
                  )}
                  {stakeholder.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{stakeholder.email}</span>
                    </div>
                  )}
                  {stakeholder.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Phone className="w-4 h-4" />
                      <span>{stakeholder.phone}</span>
                    </div>
                  )}
                  {stakeholder.communication_routine && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                      {stakeholder.communication_routine}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={UserCircle}
          title={searchQuery ? "Nenhum resultado encontrado" : "Nenhum stakeholder cadastrado"}
          description={searchQuery ? "Tente buscar por outro termo" : "Adicione os stakeholders do cliente"}
          action={!searchQuery && (
            <Button onClick={() => setModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Stakeholder
            </Button>
          )}
        />
      )}

      {/* Modal */}
      <StakeholderModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        stakeholder={selectedStakeholder}
        onSave={handleSave}
        projectId={activeProject?.id}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja excluir o stakeholder "{stakeholderToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(stakeholderToDelete?.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}