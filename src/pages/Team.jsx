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
  Users,
  Mail,
  Phone,
  Pencil,
  Trash2,
  Crown
} from 'lucide-react';
import { cn } from "@/lib/utils";
import TeamMemberModal from '../components/modals/TeamMemberModal';
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

const verticalLabels = {
  gerenciamento: 'Gerenciamento',
  arrecadacao: 'Arrecadação',
  compras: 'Compras/Contratos',
  contabil: 'Contábil',
  pessoal: 'Pessoal',
  educacao: 'Educação',
  iss: 'ISS',
  parceiros: 'Parceiros',
  plataforma: 'Plataforma',
  saude: 'Saúde'
};

const verticalColors = {
  gerenciamento: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  arrecadacao: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  compras: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  contabil: 'bg-green-500/20 text-green-400 border-green-500/30',
  pessoal: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  educacao: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  iss: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  parceiros: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  plataforma: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  saude: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
};

const verticalAvatarColors = {
  gerenciamento: 'from-slate-500 to-slate-600',
  arrecadacao: 'from-blue-500 to-blue-600',
  compras: 'from-purple-500 to-purple-600',
  contabil: 'from-green-500 to-green-600',
  pessoal: 'from-orange-500 to-orange-600',
  educacao: 'from-pink-500 to-pink-600',
  iss: 'from-cyan-500 to-cyan-600',
  parceiros: 'from-yellow-500 to-yellow-600',
  plataforma: 'from-indigo-500 to-indigo-600',
  saude: 'from-emerald-500 to-emerald-600'
};

export default function Team() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Get project_id from URL
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers', projectId],
    queryFn: () => projectId ? base44.entities.TeamMember.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const activeProject = projects.find(p => p.id === projectId);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TeamMember.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers', projectId] });
      setModalOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TeamMember.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers', projectId] });
      setModalOpen(false);
      setSelectedMember(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TeamMember.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers', projectId] });
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
    }
  });

  const handleSave = (data) => {
    if (selectedMember) {
      updateMutation.mutate({ id: selectedMember.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (member) => {
    setSelectedMember(member);
    setModalOpen(true);
  };

  const handleDelete = (member) => {
    setMemberToDelete(member);
    setDeleteDialogOpen(true);
  };

  const filteredMembers = teamMembers.filter(member =>
    member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    verticalLabels[member.vertical]?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleLeader = (member) => {
    updateMutation.mutate({ id: member.id, data: { is_leader: !member.is_leader } });
  };

  // Group by vertical
  const membersByVertical = filteredMembers.reduce((acc, member) => {
    const vertical = member.vertical || 'outros';
    if (!acc[vertical]) acc[vertical] = [];
    acc[vertical].push(member);
    return acc;
  }, {});

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Equipe do Projeto</h1>
          <p className="text-slate-400 mt-1">{teamMembers.length} membros cadastrados</p>
        </div>
        <Button 
          onClick={() => { setSelectedMember(null); setModalOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Membro
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          placeholder="Buscar por nome, função ou vertical..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
        />
      </div>

      {/* Team Grid */}
      {filteredMembers.length > 0 ? (
        <div className="space-y-5">
          {Object.entries(membersByVertical)
            .sort(([a], [b]) => {
              if (a === 'gerenciamento') return -1;
              if (b === 'gerenciamento') return 1;
              return 0;
            })
            .map(([vertical, members]) => (
              <div key={vertical}>
                <div className="flex items-center gap-2 mb-2.5">
                  <h2 className="text-sm font-semibold text-white">{verticalLabels[vertical] || 'Outros'}</h2>
                  <Badge variant="secondary" className="bg-slate-700 text-slate-300 text-xs h-5">{members.length}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {members.map((member) => (
                    <div key={member.id}
                      className={cn(
                        "border rounded-lg px-3 py-2 transition-all group",
                        member.is_leader
                          ? 'bg-yellow-500/10 border-yellow-500/40 hover:bg-yellow-500/15'
                          : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/60'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-semibold text-xs flex-shrink-0",
                          verticalAvatarColors[vertical] || 'from-slate-500 to-slate-600'
                        )}>
                          {member.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <h4 className="font-medium text-white text-xs leading-tight">{member.name}</h4>
                            {member.is_leader && <Crown className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
                            {member.email && (
                              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                <Mail className="w-2.5 h-2.5" /><span className="truncate max-w-[100px]">{member.email}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            title={member.is_leader ? 'Remover líder' : 'Marcar como líder'}
                            onClick={() => toggleLeader(member)}
                            className={cn('p-1 rounded transition-all', member.is_leader ? 'text-yellow-400 hover:text-yellow-300' : 'text-slate-600 hover:text-yellow-400')}
                          >
                            <Crown className="w-3.5 h-3.5" />
                          </button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-white hover:bg-slate-700"
                            onClick={() => handleEdit(member)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                            onClick={() => handleDelete(member)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
      ) : (
        <EmptyState
          icon={Users}
          title={searchQuery ? "Nenhum resultado encontrado" : "Nenhum membro cadastrado"}
          description={searchQuery ? "Tente buscar por outro termo" : "Adicione membros da equipe do projeto"}
          action={!searchQuery && (
            <Button onClick={() => setModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Membro
            </Button>
          )}
        />
      )}

      {/* Modal */}
      <TeamMemberModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        member={selectedMember}
        onSave={handleSave}
        projectId={activeProject?.id}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja excluir o membro "{memberToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(memberToDelete?.id)}
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