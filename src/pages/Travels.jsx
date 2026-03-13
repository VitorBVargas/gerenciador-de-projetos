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
  ChevronRight,
  Bus
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
  parseISO,
  differenceInDays
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
import { Textarea } from "@/components/ui/textarea";

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
  aviao: Plane,
  onibus: Bus
};

const travelTypeColors = {
  presencial: 'bg-blue-500',
  carro: 'bg-blue-500',
  aviao: 'bg-purple-500',
  onibus: 'bg-green-500'
};

const travelTypeLabels = {
  presencial: 'Carro',
  carro: 'Carro',
  aviao: 'Avião',
  onibus: 'Ônibus'
};

const verticalLabels = {
  arrecadacao: 'Arrecadação',
  compras: 'Contratos',
  contabil: 'Contábil',
  pessoal: 'Pessoal',
  educacao: 'Educação',
  iss: 'ISS',
  parceiros: 'Parceiros',
  plataforma: 'Plataforma',
  atendimento: 'Atendimento'
};

const statusLabels = {
  planejada: 'Planejada',
  comprada: 'Comprada',
  efetuada: 'Efetuada'
};

const statusAbbreviation = {
  planejada: 'P',
  comprada: 'C',
  efetuada: 'E'
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
    notes: '',
  });
  const [calendarFilter, setCalendarFilter] = useState({ name: '', vertical: '' });

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

  const { data: timelineEvents = [] } = useQuery({
    queryKey: ['timelineEvents', projectId],
    queryFn: () => projectId ? base44.entities.TimelineEvent.filter({ project_id: projectId }) : [],
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
      notes: '',
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
      notes: travel.notes || '',
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

  // Filter team members based on calendarFilter
  const filteredTeamMembers = useMemo(() => {
    return teamMembers.filter(m => {
      const nameMatch = !calendarFilter.name || m.name?.toLowerCase().includes(calendarFilter.name.toLowerCase());
      const verticalMatch = !calendarFilter.vertical || m.vertical === calendarFilter.vertical;
      return nameMatch && verticalMatch;
    });
  }, [teamMembers, calendarFilter]);

  // Group team members by vertical
  const membersByVertical = useMemo(() => {
    return filteredTeamMembers.reduce((acc, member) => {
      const vertical = member.vertical || 'outros';
      if (!acc[vertical]) acc[vertical] = [];
      acc[vertical].push(member);
      return acc;
    }, {});
  }, [filteredTeamMembers]);

  const verticals = Object.keys(membersByVertical).sort();
  const allVerticals = [...new Set(teamMembers.map(m => m.vertical).filter(Boolean))].sort();

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
      <div className="space-y-4">
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

      <div className="flex gap-4">
        {/* Left section */}
        <div className="flex flex-col gap-4">
          {/* Legend */}
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-slate-400 font-medium text-sm">Legenda:</span>
                {[{ type: 'carro', label: 'Carro' }, { type: 'aviao', label: 'Avião' }, { type: 'onibus', label: 'Ônibus' }].map(({ type, label }) => {
                  const Icon = travelTypeIcons[type];
                  return (
                    <div key={type} className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-full", travelTypeColors[type])} />
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-300 text-sm">{label}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card className="bg-slate-800/50 border-slate-700/50 w-fit">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Filtrar por nome..."
                  value={calendarFilter.name}
                  onChange={(e) => setCalendarFilter(f => ({ ...f, name: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 h-8 text-sm w-44"
                />
                <Select value={calendarFilter.vertical || 'all'} onValueChange={(v) => setCalendarFilter(f => ({ ...f, vertical: v === 'all' ? '' : v }))}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white h-8 text-sm w-40">
                    <SelectValue placeholder="Todas verticais" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="all">Todas verticais</SelectItem>
                    {allVerticals.map(v => (
                      <SelectItem key={v} value={v}>{verticalLabels[v] || v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <>
          {teamMembers.length === 0 ? (
            <EmptyState
              icon={Plane}
              title="Nenhum membro da equipe cadastrado"
              description="Adicione membros à equipe para visualizar o calendário de viagens"
            />
          ) : (
            <div onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} className="rounded-xl border border-slate-700/50 bg-slate-800/50">
              {/* Month Navigation */}
              <div className="border-b border-slate-700/50 p-4">
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="text-slate-400 hover:text-white hover:bg-slate-700"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <span className="text-xl font-semibold text-white">
                    {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })} - {format(addMonths(currentMonth, 5), "MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="text-slate-400 hover:text-white hover:bg-slate-700"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 overflow-hidden">
                <div className="flex h-full w-full">
                  {/* COLUNA ESQUERDA - STICKY */}
                  <div 
                    className="sticky left-0 z-20 flex flex-col bg-slate-800/80 border-r border-slate-700/50 flex-shrink-0"
                    style={{ width: '220px' }}
                  >
                    {/* Header Mês */}
                    <div className="h-6 px-4 py-1 bg-slate-700/30 border-b border-slate-700/50 flex items-center">
                      <span className="text-xs font-semibold text-cyan-400">&nbsp;</span>
                    </div>

                    {/* Header Dias */}
                    <div className="h-12 px-4 py-2 bg-slate-700/20 border-b border-slate-700/50 flex items-center">
                      <span className="text-xs font-semibold text-cyan-400">VERTICAL / MEMBRO</span>
                    </div>

                    {/* Vertical & Member List */}
                    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
                      {verticals.map(vertical => (
                        <React.Fragment key={vertical}>
                          {/* Vertical Header */}
                          <div className="h-12 px-4 py-2 bg-slate-700/25 border-b border-slate-700/30 flex items-center">
                            <span className="text-sm font-semibold text-cyan-400 truncate">
                              {verticalLabels[vertical] || vertical}
                            </span>
                          </div>

                          {/* Member Rows */}
                          {membersByVertical[vertical].map(member => (
                            <div 
                              key={member.id}
                              className="h-12 px-4 py-2 border-b border-slate-700/20 hover:bg-slate-700/20 flex items-center"
                            >
                              <span className="text-sm text-white truncate">{member.name}</span>
                            </div>
                          ))}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  {/* AREA TIMELINE - SCROLL HORIZONTAL */}
                  <div 
                    className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800"
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    <div style={{ width: `${daysInMonth.length * 48}px` }}>
                      {/* HEADER MÊS */}
                      <div 
                        className="h-6 bg-slate-700/30 border-b border-slate-700/50"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: `repeat(${daysInMonth.length}, 48px)`,
                          gridAutoRows: '100%'
                        }}
                      >
                        {(() => {
                          let lastMonth = null;
                          return daysInMonth.map((day, idx) => {
                            const monthStr = format(day, 'MMM/yy', { locale: ptBR });
                            const isNewMonth = monthStr !== lastMonth;
                            if (isNewMonth) lastMonth = monthStr;
                            
                            return (
                              <div 
                                key={`month-${idx}`}
                                className="text-center text-[10px] font-semibold text-cyan-400/60 border-r border-slate-700/20 flex items-center justify-center"
                              >
                                {isNewMonth ? monthStr.toUpperCase() : ''}
                              </div>
                            );
                          });
                        })()}
                      </div>

                      {/* HEADER DIAS */}
                      <div 
                        className="h-12 bg-slate-700/20 border-b border-slate-700/50"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: `repeat(${daysInMonth.length}, 48px)`,
                          gridAutoRows: '100%'
                        }}
                      >
                        {daysInMonth.map((day, idx) => (
                          <div 
                            key={`day-${idx}`}
                            className="text-center text-xs font-semibold text-slate-300 border-r border-slate-700/20 flex flex-col items-center justify-center"
                          >
                            <div className="font-bold">{format(day, 'dd')}</div>
                            <div className="text-[9px] text-slate-500">{format(day, 'EEE', { locale: ptBR })}</div>
                          </div>
                        ))}
                      </div>

                      {/* TIMELINE BODY */}
                      <div className="flex flex-col">
                        {verticals.map(vertical => (
                          <React.Fragment key={`vertical-${vertical}`}>
                            {/* Member Rows with Events */}
                            {membersByVertical[vertical].map(member => {
                              const memberTravels = travels.filter(t => t.attendees?.includes(member.name));

                              return (
                                <div 
                                  key={`member-${member.id}`}
                                  className="h-12 border-b border-slate-700/20 hover:bg-slate-700/10 relative"
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${daysInMonth.length}, 48px)`,
                                    gridAutoRows: '100%'
                                  }}
                                  onMouseDown={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const dayIdx = Math.floor((e.clientX - rect.left) / 48);
                                    if (dayIdx >= 0 && dayIdx < daysInMonth.length) {
                                      handleMouseDown(daysInMonth[dayIdx], member);
                                    }
                                  }}
                                  onMouseEnter={(e) => {
                                    if (isDragging && e.buttons === 1) {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const dayIdx = Math.floor((e.clientX - rect.left) / 48);
                                      if (dayIdx >= 0 && dayIdx < daysInMonth.length) {
                                        handleMouseEnter(daysInMonth[dayIdx]);
                                      }
                                    }
                                  }}
                                >
                                  {/* Grid Background */}
                                  {daysInMonth.map((day, idx) => {
                                    const isInRange = isInDragRange(day) && dragMember?.id === member.id;
                                    return (
                                      <div 
                                        key={`grid-${idx}`} 
                                        className={cn(
                                          "border-r border-slate-700/20",
                                          isInRange && "bg-blue-500/30"
                                        )}
                                      ></div>
                                    );
                                  })}

                                  {/* Events as Circles */}
                                  {memberTravels.map((travel) => {
                                    if (!travel.start_date) return null;

                                    const startDate = parseISO(travel.start_date);
                                    const endDate = travel.end_date ? parseISO(travel.end_date) : startDate;

                                    const firstDayOfMonth = startOfMonth(currentMonth);
                                    const startDayIdx = Math.max(0, differenceInDays(startDate, firstDayOfMonth));
                                    const endDayIdx = Math.min(daysInMonth.length - 1, differenceInDays(endDate, firstDayOfMonth));

                                    if (startDayIdx > daysInMonth.length - 1 || endDayIdx < 0) return null;

                                    return (
                                      <div
                                        key={`event-${travel.id}`}
                                        className="absolute top-1/2 transform -translate-y-1/2 flex gap-1"
                                        style={{
                                          left: `${startDayIdx * 48 + 12}px`,
                                          zIndex: 10
                                        }}
                                      >
                                        {Array.from({ length: endDayIdx - startDayIdx + 1 }).map((_, i) => (
                                          <div
                                            key={`circle-${i}`}
                                            className={cn(
                                              "w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110 font-bold text-xs text-white",
                                              travelTypeColors[travel.travel_type]
                                            )}
                                            onClick={() => handleEdit(travel)}
                                            title={`${travel.title}`}
                                          >
                                            {statusAbbreviation[travel.status] || 'P'}
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        // List View
        <div className="space-y-6">
          {travels.length > 0 ? (
            (() => {
              // Group travels by month
              const travelsByMonth = travels.reduce((acc, travel) => {
                if (!travel.start_date) return acc;
                const date = parseISO(travel.start_date);
                const monthKey = format(date, 'yyyy-MM', { locale: ptBR });
                const monthLabel = format(date, "MMMM 'de' yyyy", { locale: ptBR });
                
                if (!acc[monthKey]) {
                  acc[monthKey] = { label: monthLabel, travels: [] };
                }
                acc[monthKey].travels.push(travel);
                return acc;
              }, {});

              // Sort months in ascending order
              const sortedMonths = Object.entries(travelsByMonth).sort((a, b) => a[0].localeCompare(b[0]));

              return sortedMonths.map(([monthKey, { label, travels: monthTravels }]) => {
                // Sort travels within month by start_date
                const sortedTravels = monthTravels.sort((a, b) => {
                  const dateA = a.start_date ? new Date(a.start_date) : new Date(0);
                  const dateB = b.start_date ? new Date(b.start_date) : new Date(0);
                  return dateA - dateB;
                });

                return (
                  <div key={monthKey}>
                    <h2 className="text-lg font-semibold text-cyan-400 mb-4 capitalize">
                      {label}
                    </h2>
                    <div className="space-y-3">
                      {sortedTravels.map(travel => {
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
                        })}
                        </div>
                        </div>
                        );
                        });
            })()
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
              <Label>Etapa do Cronograma</Label>
              <Select value={formData.title} onValueChange={(v) => setFormData({ ...formData, title: v })} required>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Selecione a etapa..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600 max-h-64">
                   {timelineEvents.length > 0 ? (
                     [...new Set(
                       timelineEvents
                         .sort((a, b) => (a.order || 0) - (b.order || 0))
                         .map(e => e.title)
                     )].map(title => (
                       <SelectItem key={title} value={title}>{title}</SelectItem>
                     ))
                   ) : (
                     <SelectItem value="Visita ao cliente">Visita ao cliente</SelectItem>
                   )}
                 </SelectContent>
              </Select>
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
                    <SelectItem value="onibus">Ônibus</SelectItem>
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
                    <SelectItem value="comprada">Comprada</SelectItem>
                    <SelectItem value="efetuada">Efetuada</SelectItem>
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

            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white h-20"
                placeholder="Informações adicionais sobre a viagem..."
              />
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