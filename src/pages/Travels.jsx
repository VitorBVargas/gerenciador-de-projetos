import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Plus, 
  Plane,
  Calendar,
  MapPin,
  Pencil,
  Trash2,
  Car,
  Home,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay,
  addMonths,
  subMonths,
  isWithinInterval,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import EmptyState from '../components/ui/EmptyState';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

const travelTypeIcons = {
  presencial: Car,
  carro: Car,
  aviao: Plane
};

const travelTypeColors = {
  presencial: 'bg-blue-500',
  carro: 'bg-blue-500',
  aviao: 'bg-purple-500'
};

const travelTypeLabels = {
  presencial: 'Carro',
  carro: 'Carro',
  aviao: 'Avião'
};

const verticalLabels = {
  arrecadacao: 'Arrecadação',
  compras: 'Compras',
  contabil: 'Contábil',
  pessoal: 'Pessoal',
  educacao: 'Educação',
  iss: 'ISS',
  parceiros: 'Parceiros',
  plataforma: 'Plataforma',
  atendimento: 'Atendimento'
};

export default function Travels() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTravel, setSelectedTravel] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [travelToDelete, setTravelToDelete] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState('calendar'); // calendar or list
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [dragMember, setDragMember] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    start_date: '',
    end_date: '',
    travel_type: 'carro',
    vertical: '',
    attendees: [],
    status: 'planejada',
  });

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

  const { data: travels = [] } = useQuery({
    queryKey: ['travels', projectId],
    queryFn: () => projectId ? base44.entities.Travel.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const activeProject = projects.find(p => p.id === projectId);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Travel.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travels', projectId] });
      setModalOpen(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Travel.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travels', projectId] });
      setModalOpen(false);
      setSelectedTravel(null);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Travel.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travels', projectId] });
      setDeleteDialogOpen(false);
      setTravelToDelete(null);
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      start_date: '',
      end_date: '',
      travel_type: 'carro',
      vertical: '',
      attendees: [],
      status: 'planejada',
    });
  };

  const handleEdit = (travel) => {
    setSelectedTravel(travel);
    setFormData({
      title: travel.title || '',
      start_date: travel.start_date || '',
      end_date: travel.end_date || '',
      travel_type: travel.travel_type || 'carro',
      vertical: travel.vertical || '',
      attendees: travel.attendees || [],
      status: travel.status || 'planejada',
    });
    setModalOpen(true);
  };

  const handleDelete = (travel) => {
    setTravelToDelete(travel);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...formData, project_id: activeProject?.id };
    if (selectedTravel) {
      updateMutation.mutate({ id: selectedTravel.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Calendar calculations - show 6 months ahead
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(addMonths(currentMonth, 5));
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get travels for a specific day
  const getTravelsForDay = (day) => {
    return travels.filter(travel => {
      if (!travel.start_date) return false;
      const start = parseISO(travel.start_date);
      const end = travel.end_date ? parseISO(travel.end_date) : start;
      return isWithinInterval(day, { start, end });
    });
  };

  // Group team members by vertical
  const membersByVertical = useMemo(() => {
    return teamMembers.reduce((acc, member) => {
      const vertical = member.vertical || 'outros';
      if (!acc[vertical]) acc[vertical] = [];
      acc[vertical].push(member);
      return acc;
    }, {});
  }, [teamMembers]);

  const verticals = Object.keys(membersByVertical).sort();

  // Handle drag selection
  const handleMouseDown = (day, member) => {
    setIsDragging(true);
    setDragStart(day);
    setDragEnd(day);
    setDragMember(member);
  };

  const handleMouseEnter = (day) => {
    if (isDragging) {
      setDragEnd(day);
    }
  };

  const handleMouseUp = () => {
    if (isDragging && dragStart && dragEnd && dragMember) {
      // Determine start and end dates
      const start = dragStart < dragEnd ? dragStart : dragEnd;
      const end = dragStart < dragEnd ? dragEnd : dragStart;
      
      // Reset drag state first
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      setDragMember(null);
      
      // Open modal with pre-filled dates
      setSelectedTravel(null);
      setFormData({
        title: '',
        start_date: format(start, 'yyyy-MM-dd'),
        end_date: format(end, 'yyyy-MM-dd'),
        travel_type: 'carro',
        vertical: '',
        attendees: [dragMember.name],
        status: 'planejada',
      });
      setModalOpen(true);
    } else {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      setDragMember(null);
    }
  };

  // Check if day is in drag selection
  const isInDragRange = (day) => {
    if (!isDragging || !dragStart || !dragEnd) return false;
    const start = dragStart < dragEnd ? dragStart : dragEnd;
    const end = dragStart < dragEnd ? dragEnd : dragStart;
    return day >= start && day <= end;
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 min-h-screen bg-slate-900">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Viagens dos Implantadores</h1>
          <p className="text-slate-400 mt-1">Calendário de deslocamentos da equipe</p>
        </div>
        <div className="flex gap-2">
          <Tabs value={viewMode} onValueChange={setViewMode}>
            <TabsList className="bg-slate-800 border border-slate-700">
              <TabsTrigger value="calendar" className="data-[state=active]:bg-blue-600">
                Calendário
              </TabsTrigger>
              <TabsTrigger value="list" className="data-[state=active]:bg-blue-600">
                Lista
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button 
            onClick={() => { setSelectedTravel(null); resetForm(); setModalOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Viagem
          </Button>
        </div>
      </div>

      {/* Legend */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-slate-400 font-medium">Legenda:</span>
            {Object.entries(travelTypeLabels).map(([type, label]) => {
              const Icon = travelTypeIcons[type];
              return (
                <div key={type} className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", travelTypeColors[type])} />
                  <Icon className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300">{label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {viewMode === 'calendar' ? (
        <>
          {teamMembers.length === 0 ? (
            <EmptyState
              icon={Plane}
              title="Nenhum membro da equipe cadastrado"
              description="Adicione membros à equipe para visualizar o calendário de viagens"
            />
          ) : (
            <div onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
              {/* Month Navigation */}
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader className="border-b border-slate-700/50">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      className="text-slate-400 hover:text-white hover:bg-slate-700"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <CardTitle className="text-xl text-white">
                      {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })} - {format(addMonths(currentMonth, 5), "MMMM 'de' yyyy", { locale: ptBR })}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      className="text-slate-400 hover:text-white hover:bg-slate-700"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="border-collapse" style={{minWidth: 'max-content'}}>
                      <thead>
                        {/* Month headers row */}
                        <tr className="border-b border-slate-700/50">
                          <th className="sticky left-0 z-20 bg-slate-800 px-4 py-2 text-left text-sm font-semibold text-slate-400 min-w-[180px] w-[180px] border-r border-slate-700/50">
                            Período
                          </th>
                          {(() => {
                            let currentDisplayMonth = null;
                            return daysInMonth.map(day => {
                              const dayMonth = format(day, 'MMM/yy', { locale: ptBR });
                              const isFirstOfMonth = day.getDate() === 1;
                              const shouldShowMonth = currentDisplayMonth !== dayMonth && isFirstOfMonth;
                              
                              if (shouldShowMonth) {
                                currentDisplayMonth = dayMonth;
                              }
                              
                              return (
                                <th key={day.toString()} className="px-2 py-2 text-center text-xs font-semibold text-cyan-400 min-w-[40px] border-r border-slate-700/20">
                                  {shouldShowMonth ? dayMonth.toUpperCase() : ''}
                                </th>
                              );
                            });
                          })()}
                        </tr>
                        {/* Days row */}
                        <tr className="border-b border-slate-700/50">
                          <th className="sticky left-0 z-20 bg-slate-800 px-4 py-3 text-left text-sm font-semibold text-slate-400 min-w-[180px] w-[180px] border-r border-slate-700/50">
                            Implantador
                          </th>
                          {daysInMonth.map(day => (
                            <th key={day.toString()} className="px-2 py-3 text-center text-xs font-medium text-slate-400 min-w-[40px] border-r border-slate-700/20">
                              <div>{format(day, 'dd')}</div>
                              <div className="text-[10px] text-slate-500">{format(day, 'EEE', { locale: ptBR })}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {verticals.map(vertical => (
                          <React.Fragment key={vertical}>
                            <tr className="bg-slate-700/30">
                              <td className="sticky left-0 z-20 px-4 py-2 text-sm font-semibold text-cyan-400 bg-slate-800 w-[200px] min-w-[200px]">
                                {verticalLabels[vertical] || vertical}
                              </td>
                              <td colSpan={daysInMonth.length} className="bg-slate-700/30" />
                            </tr>
                            {membersByVertical[vertical].map(member => (
                              <tr key={member.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                                <td className="sticky left-0 z-20 bg-slate-800 px-4 py-3 text-sm text-white border-r border-slate-700/50 w-[200px] min-w-[200px]">
                                  {member.name}
                                </td>
                                {daysInMonth.map(day => {
                                  const dayTravels = getTravelsForDay(day).filter(t => 
                                    t.attendees?.includes(member.name)
                                  );
                                  const travel = dayTravels[0];
                                  const isInRange = isInDragRange(day) && dragMember?.id === member.id;
                                  
                                  return (
                                    <td 
                                      key={day.toString()} 
                                      className={cn(
                                        "px-1 py-2 text-center border-r border-slate-700/20 cursor-pointer select-none",
                                        isInRange && "bg-blue-500/30"
                                      )}
                                      onMouseDown={() => handleMouseDown(day, member)}
                                      onMouseEnter={() => handleMouseEnter(day)}
                                    >
                                      {travel && (
                                        <div 
                                          className={cn(
                                            "w-8 h-8 mx-auto rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110",
                                            travelTypeColors[travel.travel_type]
                                          )}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEdit(travel);
                                          }}
                                          title={`${travel.title} - ${travel.location || 'Sem local'}`}
                                        >
                                          {React.createElement(travelTypeIcons[travel.travel_type], { 
                                            className: "w-4 h-4 text-white" 
                                          })}
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      ) : (
        // List View
        <div className="space-y-4">
          {travels.length > 0 ? (
            travels.map(travel => {
              const Icon = travelTypeIcons[travel.travel_type];
              return (
                <Card key={travel.id} className="bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 transition-all group">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", travelTypeColors[travel.travel_type])}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{travel.title}</h3>
                            <p className="text-sm text-slate-400">{travelTypeLabels[travel.travel_type]}</p>
                          </div>
                        </div>
                        <div className="ml-13 space-y-2 text-sm text-slate-400">
                          {travel.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              {travel.location}
                            </div>
                          )}
                          {travel.start_date && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {format(parseISO(travel.start_date), "dd/MM/yyyy")}
                              {travel.end_date && travel.end_date !== travel.start_date && (
                                <> - {format(parseISO(travel.end_date), "dd/MM/yyyy")}</>
                              )}
                            </div>
                          )}
                          {travel.attendees && travel.attendees.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {travel.attendees.map((attendee, idx) => (
                                <Badge key={idx} variant="secondary" className="bg-slate-700 text-slate-300">
                                  {attendee}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-700"
                          onClick={() => handleEdit(travel)}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          onClick={() => handleDelete(travel)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <EmptyState
              icon={Plane}
              title="Nenhuma viagem cadastrada"
              description="Adicione as viagens dos implantadores"
              action={
                <Button onClick={() => setModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Viagem
                </Button>
              }
            />
          )}
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {selectedTravel ? 'Editar Viagem' : 'Nova Viagem'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Objetivo da Viagem</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Ex: Kick-off do projeto"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Deslocamento</Label>
                <Select value={formData.travel_type} onValueChange={(v) => setFormData({ ...formData, travel_type: v })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="carro">Carro</SelectItem>
                    <SelectItem value="aviao">Avião</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vertical</Label>
                <Select value={formData.vertical} onValueChange={(v) => setFormData({ ...formData, vertical: v })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {Object.entries(verticalLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="planejada">Planejada</SelectItem>
                    <SelectItem value="confirmada">Confirmada</SelectItem>
                    <SelectItem value="realizada">Realizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Participantes</Label>
              <div className="flex flex-wrap gap-2 p-3 bg-slate-700 border border-slate-600 rounded-md min-h-[48px]">
                {formData.attendees.map((attendee, idx) => (
                  <Badge
                    key={idx}
                    className="bg-blue-600 text-white cursor-pointer hover:bg-red-600"
                    onClick={() => setFormData({
                      ...formData,
                      attendees: formData.attendees.filter((_, i) => i !== idx)
                    })}
                  >
                    {attendee} ×
                  </Badge>
                ))}
              </div>
              <Select
                value=""
                onValueChange={(v) => {
                  if (v && !formData.attendees.includes(v)) {
                    setFormData({ ...formData, attendees: [...formData.attendees, v] });
                  }
                }}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Adicionar participante..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {teamMembers.map(member => (
                    <SelectItem key={member.id} value={member.name}>
                      {member.name} ({verticalLabels[member.vertical] || member.vertical})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="flex items-center justify-between gap-2">
              <div>
                {selectedTravel && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                    onClick={() => { setModalOpen(false); handleDelete(selectedTravel); }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {selectedTravel ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja excluir a viagem "{travelToDelete?.title}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(travelToDelete?.id)}
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