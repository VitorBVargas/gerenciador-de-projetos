import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Search, 
  Users,
  Mail,
  Phone,
  Pencil,
  Trash2,
  Crown,
  Plane,
  LayoutGrid,
  CalendarRange,
  MapPin
} from 'lucide-react';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { cn } from "@/lib/utils";
import TeamMemberModal from '../components/modals/TeamMemberModal';
import { VERTICAL_BADGE_COLORS, VERTICAL_AVATAR_COLORS } from '../components/verticalColors';
import { phaseLabels } from '../components/timeline/phaseLabels';
import TeamTimeline from '../components/team/TeamTimeline';
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
  compras: 'Contratos',
  contabil: 'Contábil',
  pessoal: 'Pessoal',
  educacao: 'Educação',
  iss: 'ISS',
  parceiros: 'Parceiros',
  plataforma: 'Plataforma',
  saude: 'Saúde',
  atendimento: 'Atendimento',
  extensoes: 'Extensões',
  gestao_projetos: 'Gestão de Projetos',
  gestao_operacoes: 'Gestão de Operações',
  coordenacao_tecnica: 'Coordenação Técnica',
  migrador: 'Migrador'
};

// Colors imported from verticalColors.js

export default function Team() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'timeline'

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

  const { data: timelineEvents = [] } = useQuery({
    queryKey: ['timelineEvents', projectId],
    queryFn: () => projectId ? base44.entities.TimelineEvent.filter({ project_id: projectId }) : [],
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
    verticalLabels[member.vertical]?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleLeader = (member) => {
    updateMutation.mutate({ id: member.id, data: { is_leader: !member.is_leader } });
  };

  // Group by vertical and sort members (leaders first)
  const membersByVertical = filteredMembers.reduce((acc, member) => {
    const vertical = member.vertical || 'outros';
    if (!acc[vertical]) acc[vertical] = [];
    acc[vertical].push(member);
    return acc;
  }, {});

  // Sort members in each vertical (leaders first)
  Object.keys(membersByVertical).forEach(vertical => {
    membersByVertical[vertical].sort((a, b) => {
      if (a.is_leader && !b.is_leader) return -1;
      if (!a.is_leader && b.is_leader) return 1;
      return a.name.localeCompare(b.name);
    });
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Equipe do Projeto</h1>
          <p className="text-slate-400 mt-1">{teamMembers.length} membros cadastrados</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
            <Button size="sm" variant={viewMode === 'cards' ? 'default' : 'ghost'} onClick={() => setViewMode('cards')} className={cn("h-8", viewMode === 'cards' ? "bg-blue-600 hover:bg-blue-700" : "text-slate-300 hover:text-white")}>
              <LayoutGrid className="w-4 h-4 mr-1" /> Cards
            </Button>
            <Button size="sm" variant={viewMode === 'timeline' ? 'default' : 'ghost'} onClick={() => setViewMode('timeline')} className={cn("h-8", viewMode === 'timeline' ? "bg-blue-600 hover:bg-blue-700" : "text-slate-300 hover:text-white")}>
              <CalendarRange className="w-4 h-4 mr-1" /> Timeline
            </Button>
          </div>
          <Button 
            onClick={() => { setSelectedMember(null); setModalOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Membro
          </Button>
        </div>
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

      {viewMode === 'timeline' ? (
        <TeamTimeline members={filteredMembers} timelineEvents={timelineEvents} />
      ) : (
      /* Team Grid - Card Layout by Vertical */
      filteredMembers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(membersByVertical)
            .sort(([a], [b]) => {
              if (a === 'gerenciamento') return -1;
              if (b === 'gerenciamento') return 1;
              return 0;
            })
            .map(([vertical, members]) => (
              <Card key={vertical} className="bg-slate-800/50 border-slate-700/50">
                {/* Vertical Header */}
                <div className={cn(
                  "p-4 border-b border-slate-700/50",
                  VERTICAL_BADGE_COLORS[vertical] || 'bg-slate-700/30'
                )}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white">{verticalLabels[vertical] || vertical}</h2>
                    <Badge variant="secondary" className="bg-slate-700 text-slate-300 text-xs h-5">{members.length}</Badge>
                  </div>
                </div>

                {/* Members List */}
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-700/30">
                    {members.map((member) => (
                      <div key={member.id}
                        className={cn(
                          "p-3 transition-all group",
                          member.is_leader
                            ? 'bg-yellow-500/10'
                            : 'hover:bg-slate-700/30'
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={cn(
                            "w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 mt-0.5",
                            VERTICAL_AVATAR_COLORS[vertical] || 'from-slate-500 to-slate-600'
                          )}>
                            {member.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-white text-sm">{member.name}</h4>
                              {member.is_leader && <Crown className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />}
                            </div>

                            {member.entity && (
                              <div className="mt-1">
                                <Badge variant="outline" className="border-indigo-500/40 bg-indigo-500/15 text-indigo-300 text-[11px] font-medium">
                                  {member.entity}
                                </Badge>
                              </div>
                            )}
                            {member.city && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                                <MapPin className="w-2.5 h-2.5 text-blue-400" />
                                <span className="truncate">{member.city}</span>
                              </div>
                            )}
                            {member.ticket_number && (
                              <div className="text-xs text-slate-500 mt-0.5">{member.ticket_number}</div>
                            )}
                            {member.email && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                                <Mail className="w-2.5 h-2.5" />
                                <span className="truncate">{member.email}</span>
                              </div>
                            )}
                            {member.phone && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                                <Phone className="w-2.5 h-2.5" />
                                <span>{member.phone}</span>
                              </div>
                            )}
                            {(member.ferias_inicio || member.ferias_fim) && (() => {
                              const hoje = new Date();
                              const emFerias = member.ferias_inicio && member.ferias_fim &&
                                isWithinInterval(hoje, { start: parseISO(member.ferias_inicio), end: parseISO(member.ferias_fim) });
                              const fmt = (d) => d ? format(parseISO(d), 'dd/MM/yyyy') : '—';
                              return (
                                <div className={cn(
                                  "flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded-md border text-xs font-medium",
                                  emFerias
                                    ? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
                                    : 'border-slate-600/50 bg-slate-700/40 text-slate-300'
                                )}>
                                  <Plane className="w-3 h-3 flex-shrink-0" />
                                  <span>{emFerias ? 'De férias' : 'Férias'}: {fmt(member.ferias_inicio)} – {fmt(member.ferias_fim)}</span>
                                </div>
                              );
                            })()}
                            {member.stages?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {member.stages.map((stage) => (
                                  <Badge
                                    key={stage}
                                    variant="outline"
                                    className="border-blue-500/30 bg-blue-500/10 text-blue-300 text-[10px]"
                                  >
                                    {phaseLabels[stage] || stage}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
                            <button
                              title={member.is_leader ? 'Remover líder' : 'Marcar como líder'}
                              onClick={() => toggleLeader(member)}
                              className={cn('p-1 rounded transition-all', member.is_leader ? 'text-yellow-400 hover:text-yellow-300' : 'text-slate-600 hover:text-yellow-400')}
                            >
                              <Crown className="w-3 h-3" />
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
                </CardContent>
              </Card>
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
      )
      )}

      {/* Modal */}
      <TeamMemberModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        member={selectedMember}
        onSave={handleSave}
        projectId={activeProject?.id}
        portfolio={activeProject?.portfolio}
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