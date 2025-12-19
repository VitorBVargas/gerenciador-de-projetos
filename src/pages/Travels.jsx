import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Plane,
  Calendar,
  MapPin,
  Pencil,
  Trash2,
  Users
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
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

const statusColors = {
  planejada: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  confirmada: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  realizada: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelada: 'bg-red-500/20 text-red-400 border-red-500/30'
};

const statusLabels = {
  planejada: 'Planejada',
  confirmada: 'Confirmada',
  realizada: 'Realizada',
  cancelada: 'Cancelada'
};

export default function Travels() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTravel, setSelectedTravel] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [travelToDelete, setTravelToDelete] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    start_date: '',
    end_date: '',
    location: '',
    status: 'planejada',
    notes: ''
  });

  // Get project_id from URL
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
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
      location: '',
      status: 'planejada',
      notes: ''
    });
  };

  const handleEdit = (travel) => {
    setSelectedTravel(travel);
    setFormData({
      title: travel.title || '',
      start_date: travel.start_date || '',
      end_date: travel.end_date || '',
      location: travel.location || '',
      status: travel.status || 'planejada',
      notes: travel.notes || ''
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

  const getDuration = (start, end) => {
    if (!start) return null;
    if (!end) return '1 dia';
    const days = differenceInDays(new Date(end), new Date(start)) + 1;
    return `${days} dia${days > 1 ? 's' : ''}`;
  };

  // Group travels by status
  const upcomingTravels = travels.filter(t => t.status === 'planejada' || t.status === 'confirmada');
  const completedTravels = travels.filter(t => t.status === 'realizada');
  const canceledTravels = travels.filter(t => t.status === 'cancelada');

  const TravelCard = ({ travel }) => (
    <Card className="bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 transition-all group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <Badge className={cn("border", statusColors[travel.status])}>
            {statusLabels[travel.status]}
          </Badge>
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
        <h3 className="font-semibold text-white mb-3">{travel.title}</h3>
        <div className="space-y-2 text-sm text-slate-400">
          {travel.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {travel.location}
            </div>
          )}
          {travel.start_date && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {format(new Date(travel.start_date), "dd 'de' MMMM", { locale: ptBR })}
              {travel.end_date && travel.end_date !== travel.start_date && (
                <> - {format(new Date(travel.end_date), "dd 'de' MMMM", { locale: ptBR })}</>
              )}
              {getDuration(travel.start_date, travel.end_date) && (
                <Badge variant="secondary" className="bg-slate-700 text-slate-300 ml-2">
                  {getDuration(travel.start_date, travel.end_date)}
                </Badge>
              )}
            </div>
          )}
        </div>
        {travel.notes && (
          <p className="text-xs text-slate-500 mt-3 line-clamp-2">{travel.notes}</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Viagens</h1>
          <p className="text-slate-400 mt-1">{travels.length} viagens cadastradas</p>
        </div>
        <Button 
          onClick={() => { setSelectedTravel(null); resetForm(); setModalOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Viagem
        </Button>
      </div>

      {travels.length > 0 ? (
        <div className="space-y-8">
          {upcomingTravels.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                Próximas ({upcomingTravels.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingTravels.map(t => <TravelCard key={t.id} travel={t} />)}
              </div>
            </div>
          )}
          {completedTravels.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                Realizadas ({completedTravels.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedTravels.map(t => <TravelCard key={t.id} travel={t} />)}
              </div>
            </div>
          )}
          {canceledTravels.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                Canceladas ({canceledTravels.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {canceledTravels.map(t => <TravelCard key={t.id} travel={t} />)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon={Plane}
          title="Nenhuma viagem cadastrada"
          description="Adicione as viagens do projeto"
          action={
            <Button onClick={() => setModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nova Viagem
            </Button>
          }
        />
      )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {selectedTravel ? 'Editar Viagem' : 'Nova Viagem'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Objetivo</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Ex: Kick-off do projeto"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Local de Destino</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Ex: São Paulo, SP"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white h-20"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {selectedTravel ? 'Salvar' : 'Criar'}
              </Button>
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