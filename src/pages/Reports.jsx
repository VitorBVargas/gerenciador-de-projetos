import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Plus, 
  FileText,
  Calendar,
  Pencil,
  Trash2,
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  ArrowRight
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

const typeIcons = {
  observacao: FileText,
  problema: AlertCircle,
  decisao: CheckCircle2,
  licao_aprendida: Lightbulb,
  proximo_passo: ArrowRight
};

const typeColors = {
  observacao: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  problema: 'bg-red-500/20 text-red-400 border-red-500/30',
  decisao: 'bg-green-500/20 text-green-400 border-green-500/30',
  licao_aprendida: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  proximo_passo: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
};

const typeLabels = {
  observacao: 'Observação',
  problema: 'Problema',
  decisao: 'Decisão',
  licao_aprendida: 'Lição Aprendida',
  proximo_passo: 'Próximo Passo'
};

const statusColors = {
  aberto: 'bg-blue-500',
  em_andamento: 'bg-yellow-500',
  resolvido: 'bg-green-500'
};

const statusLabels = {
  aberto: 'Aberto',
  em_andamento: 'Em Andamento',
  resolvido: 'Resolvido'
};

export default function Reports() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    type: 'observacao',
    status: 'aberto',
    priority: 'media'
  });

  // Get project_id from URL
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['operationalReports', projectId],
    queryFn: () => projectId ? base44.entities.OperationalReport.filter({ project_id: projectId }, '-date') : [],
    enabled: !!projectId
  });

  const activeProject = projects.find(p => p.id === projectId);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.OperationalReport.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operationalReports', projectId] });
      setModalOpen(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OperationalReport.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operationalReports', projectId] });
      setModalOpen(false);
      setSelectedReport(null);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.OperationalReport.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operationalReports', projectId] });
      setDeleteDialogOpen(false);
      setReportToDelete(null);
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      type: 'observacao',
      status: 'aberto',
      priority: 'media'
    });
  };

  const handleEdit = (report) => {
    setSelectedReport(report);
    setFormData({
      title: report.title || '',
      description: report.description || '',
      date: report.date || new Date().toISOString().split('T')[0],
      type: report.type || 'observacao',
      status: report.status || 'aberto',
      priority: report.priority || 'media'
    });
    setModalOpen(true);
  };

  const handleDelete = (report) => {
    setReportToDelete(report);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...formData, project_id: activeProject?.id };
    if (selectedReport) {
      updateMutation.mutate({ id: selectedReport.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredReports = activeTab === 'all' 
    ? reports 
    : reports.filter(r => r.type === activeTab);

  const ReportCard = ({ report }) => {
    const Icon = typeIcons[report.type] || FileText;
    return (
      <Card className="bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 transition-all group">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge className={cn("border", typeColors[report.type])}>
                <Icon className="w-3 h-3 mr-1" />
                {typeLabels[report.type]}
              </Badge>
              <div className={cn("w-2 h-2 rounded-full", statusColors[report.status])} title={statusLabels[report.status]} />
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-700"
                onClick={() => handleEdit(report)}
              >
                <Pencil className="w-3 h-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                onClick={() => handleDelete(report)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <h3 className="font-semibold text-white mb-2">{report.title}</h3>
          {report.description && (
            <p className="text-sm text-slate-400 mb-3 line-clamp-3">{report.description}</p>
          )}
          {report.date && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Calendar className="w-3 h-3" />
              {format(new Date(report.date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Relatórios Operacionais</h1>
          <p className="text-slate-400 mt-1">Registre observações, decisões e lições aprendidas</p>
        </div>
        <Button 
          onClick={() => { setSelectedReport(null); resetForm(); setModalOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Registro
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="all" className="data-[state=active]:bg-blue-600">Todos</TabsTrigger>
          <TabsTrigger value="observacao" className="data-[state=active]:bg-blue-600">Observações</TabsTrigger>
          <TabsTrigger value="problema" className="data-[state=active]:bg-blue-600">Problemas</TabsTrigger>
          <TabsTrigger value="decisao" className="data-[state=active]:bg-blue-600">Decisões</TabsTrigger>
          <TabsTrigger value="licao_aprendida" className="data-[state=active]:bg-blue-600">Lições</TabsTrigger>
          <TabsTrigger value="proximo_passo" className="data-[state=active]:bg-blue-600">Próximos Passos</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Reports Grid */}
      {filteredReports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map(report => <ReportCard key={report.id} report={report} />)}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="Nenhum registro encontrado"
          description={activeTab === 'all' ? "Adicione observações, decisões e lições aprendidas" : "Nenhum registro deste tipo"}
          action={
            <Button onClick={() => setModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Registro
            </Button>
          }
        />
      )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {selectedReport ? 'Editar Registro' : 'Novo Registro'}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="observacao">Observação</SelectItem>
                    <SelectItem value="problema">Problema</SelectItem>
                    <SelectItem value="decisao">Decisão</SelectItem>
                    <SelectItem value="licao_aprendida">Lição Aprendida</SelectItem>
                    <SelectItem value="proximo_passo">Próximo Passo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="aberto">Aberto</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="resolvido">Resolvido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white h-32"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {selectedReport ? 'Salvar' : 'Criar'}
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
              Tem certeza que deseja excluir o registro "{reportToDelete?.title}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(reportToDelete?.id)}
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