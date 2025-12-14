import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  GraduationCap,
  Calendar,
  MapPin,
  Pencil,
  Trash2,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
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
  agendado: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  realizado: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelado: 'bg-red-500/20 text-red-400 border-red-500/30'
};

const statusLabels = {
  agendado: 'Agendado',
  realizado: 'Realizado',
  cancelado: 'Cancelado'
};

export default function Trainings() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [trainingToDelete, setTrainingToDelete] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    product: '',
    vertical: '',
    date: '',
    time: '',
    location: 'remoto',
    status: 'agendado',
    notes: ''
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
  });

  const { data: trainings = [] } = useQuery({
    queryKey: ['trainings'],
    queryFn: () => base44.entities.Training.list('-date')
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const activeProject = projects[0];

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Training.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      setModalOpen(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Training.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      setModalOpen(false);
      setSelectedTraining(null);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Training.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      setDeleteDialogOpen(false);
      setTrainingToDelete(null);
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      product: '',
      vertical: '',
      date: '',
      time: '',
      location: 'remoto',
      status: 'agendado',
      notes: ''
    });
  };

  const handleEdit = (training) => {
    setSelectedTraining(training);
    setFormData({
      title: training.title || '',
      product: training.product || '',
      vertical: training.vertical || '',
      date: training.date || '',
      time: training.time || '',
      location: training.location || 'remoto',
      status: training.status || 'agendado',
      notes: training.notes || ''
    });
    setModalOpen(true);
  };

  const handleDelete = (training) => {
    setTrainingToDelete(training);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...formData, project_id: activeProject?.id };
    if (selectedTraining) {
      updateMutation.mutate({ id: selectedTraining.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Group trainings by status
  const upcomingTrainings = trainings.filter(t => t.status === 'agendado');
  const completedTrainings = trainings.filter(t => t.status === 'realizado');
  const canceledTrainings = trainings.filter(t => t.status === 'cancelado');

  const TrainingCard = ({ training }) => (
    <Card className="bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 transition-all group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <Badge className={cn("border", statusColors[training.status])}>
            {statusLabels[training.status]}
          </Badge>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-700"
              onClick={() => handleEdit(training)}
            >
              <Pencil className="w-3 h-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/20"
              onClick={() => handleDelete(training)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <h3 className="font-semibold text-white mb-2">{training.title}</h3>
        {training.product && (
          <p className="text-sm text-slate-400 mb-3">Produto: {training.product}</p>
        )}
        <div className="flex flex-wrap gap-3 text-sm text-slate-400">
          {training.date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(training.date), "dd 'de' MMMM", { locale: ptBR })}
              {training.time && ` às ${training.time}`}
            </div>
          )}
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {training.location === 'presencial' ? 'Presencial' : 'Remoto'}
          </div>
        </div>
        {training.notes && (
          <p className="text-xs text-slate-500 mt-3 line-clamp-2">{training.notes}</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Treinamentos</h1>
          <p className="text-slate-400 mt-1">{trainings.length} treinamentos cadastrados</p>
        </div>
        <Button 
          onClick={() => { setSelectedTraining(null); resetForm(); setModalOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Treinamento
        </Button>
      </div>

      {trainings.length > 0 ? (
        <div className="space-y-8">
          {upcomingTrainings.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                Agendados ({upcomingTrainings.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingTrainings.map(t => <TrainingCard key={t.id} training={t} />)}
              </div>
            </div>
          )}
          {completedTrainings.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                Realizados ({completedTrainings.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedTrainings.map(t => <TrainingCard key={t.id} training={t} />)}
              </div>
            </div>
          )}
          {canceledTrainings.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                Cancelados ({canceledTrainings.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {canceledTrainings.map(t => <TrainingCard key={t.id} training={t} />)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon={GraduationCap}
          title="Nenhum treinamento cadastrado"
          description="Adicione os treinamentos do projeto"
          action={
            <Button onClick={() => setModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Treinamento
            </Button>
          }
        />
      )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {selectedTraining ? 'Editar Treinamento' : 'Novo Treinamento'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Produto</Label>
              <Select value={formData.product} onValueChange={(v) => setFormData({ ...formData, product: v })}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Local</Label>
                <Select value={formData.location} onValueChange={(v) => setFormData({ ...formData, location: v })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="remoto">Remoto</SelectItem>
                    <SelectItem value="presencial">Presencial</SelectItem>
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
                    <SelectItem value="agendado">Agendado</SelectItem>
                    <SelectItem value="realizado">Realizado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                {selectedTraining ? 'Salvar' : 'Criar'}
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
              Tem certeza que deseja excluir o treinamento "{trainingToDelete?.title}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(trainingToDelete?.id)}
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