import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  AlertTriangle,
  Shield,
  Pencil,
  Trash2
} from 'lucide-react';
import { cn } from "@/lib/utils";
import RiskModal from '../components/modals/RiskModal';
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

const categoryColors = {
  tecnico: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  cronograma: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  recurso: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  cliente: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  externo: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
};

const categoryLabels = {
  tecnico: 'Técnico',
  cronograma: 'Cronograma',
  recurso: 'Recurso',
  cliente: 'Cliente',
  externo: 'Externo'
};

const statusColors = {
  identificado: 'bg-slate-500',
  em_monitoramento: 'bg-yellow-500',
  mitigado: 'bg-green-500',
  ocorreu: 'bg-red-500'
};

const statusLabels = {
  identificado: 'Identificado',
  em_monitoramento: 'Monitorando',
  mitigado: 'Mitigado',
  ocorreu: 'Ocorreu'
};

const probabilityColors = {
  baixa: 'text-green-400',
  media: 'text-yellow-400',
  alta: 'text-red-400'
};

const impactColors = {
  baixo: 'text-green-400',
  medio: 'text-yellow-400',
  alto: 'text-red-400'
};

export default function Risks() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [riskToDelete, setRiskToDelete] = useState(null);

  // Get project_id from URL
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project_id');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date')
  });

  const { data: risks = [] } = useQuery({
    queryKey: ['risks', projectId],
    queryFn: () => projectId ? base44.entities.Risk.filter({ project_id: projectId }) : [],
    enabled: !!projectId
  });

  const activeProject = projects.find(p => p.id === projectId);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Risk.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks', projectId] });
      setModalOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Risk.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks', projectId] });
      setModalOpen(false);
      setSelectedRisk(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Risk.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks', projectId] });
      setDeleteDialogOpen(false);
      setRiskToDelete(null);
    }
  });

  const handleSave = (data) => {
    if (selectedRisk) {
      updateMutation.mutate({ id: selectedRisk.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (risk) => {
    setSelectedRisk(risk);
    setModalOpen(true);
  };

  const handleDelete = (risk) => {
    setRiskToDelete(risk);
    setDeleteDialogOpen(true);
  };

  // Group risks by status
  const activeRisks = risks.filter(r => r.status !== 'mitigado');
  const mitigatedRisks = risks.filter(r => r.status === 'mitigado');

  // Risk score calculation
  const getRiskScore = (probability, impact) => {
    const probScore = { baixa: 1, media: 2, alta: 3 };
    const impScore = { baixo: 1, medio: 2, alto: 3 };
    return (probScore[probability] || 2) * (impScore[impact] || 2);
  };

  const getRiskLevel = (score) => {
    if (score >= 6) return { label: 'Crítico', color: 'bg-red-500' };
    if (score >= 4) return { label: 'Alto', color: 'bg-orange-500' };
    if (score >= 2) return { label: 'Médio', color: 'bg-yellow-500' };
    return { label: 'Baixo', color: 'bg-green-500' };
  };

  // Stats
  const highRisks = risks.filter(r => getRiskScore(r.probability, r.impact) >= 6).length;
  const monitoringRisks = risks.filter(r => r.status === 'em_monitoramento').length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Riscos do Projeto</h1>
          <p className="text-slate-400 mt-1">Gerencie e monitore os riscos identificados</p>
        </div>
        <Button 
          onClick={() => { setSelectedRisk(null); setModalOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Risco
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-500/20">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{highRisks}</p>
              <p className="text-sm text-slate-400">Riscos Críticos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-yellow-500/20">
              <Shield className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{monitoringRisks}</p>
              <p className="text-sm text-slate-400">Em Monitoramento</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500/20">
              <Shield className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{mitigatedRisks.length}</p>
              <p className="text-sm text-slate-400">Mitigados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risks List */}
      {risks.length > 0 ? (
        <div className="space-y-6">
          {activeRisks.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Riscos Ativos ({activeRisks.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeRisks.map(risk => {
                  const score = getRiskScore(risk.probability, risk.impact);
                  const level = getRiskLevel(score);
                  return (
                    <Card key={risk.id} className="bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 transition-all group">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", statusColors[risk.status])} />
                            <Badge className={cn("border", categoryColors[risk.category])}>
                              {categoryLabels[risk.category]}
                            </Badge>
                            <Badge className={cn("text-white", level.color)}>
                              {level.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-700"
                              onClick={() => handleEdit(risk)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                              onClick={() => handleDelete(risk)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <h3 className="font-semibold text-white mb-3">{risk.title}</h3>
                        <div className="flex gap-4 text-sm mb-3">
                          <div>
                            <span className="text-slate-500">Probabilidade: </span>
                            <span className={probabilityColors[risk.probability]}>
                              {risk.probability?.charAt(0).toUpperCase() + risk.probability?.slice(1)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Impacto: </span>
                            <span className={impactColors[risk.impact]}>
                              {risk.impact?.charAt(0).toUpperCase() + risk.impact?.slice(1)}
                            </span>
                          </div>
                        </div>
                        {risk.mitigation && (
                          <div className="bg-slate-700/30 rounded-lg p-3 text-sm">
                            <p className="text-slate-500 text-xs mb-1">Plano de Mitigação:</p>
                            <p className="text-slate-300 line-clamp-2">{risk.mitigation}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {mitigatedRisks.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 opacity-60">Riscos Mitigados ({mitigatedRisks.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-60">
                {mitigatedRisks.map(risk => (
                  <Card key={risk.id} className="bg-slate-800/30 border-slate-700/30 group">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge className={cn("border mb-2", categoryColors[risk.category])}>
                            {categoryLabels[risk.category]}
                          </Badge>
                          <h3 className="text-white line-through">{risk.title}</h3>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/20 opacity-0 group-hover:opacity-100"
                          onClick={() => handleDelete(risk)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon={AlertTriangle}
          title="Nenhum risco cadastrado"
          description="Identifique e registre os riscos do projeto"
          action={
            <Button onClick={() => setModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Risco
            </Button>
          }
        />
      )}

      {/* Modal */}
      <RiskModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        risk={selectedRisk}
        onSave={handleSave}
        projectId={activeProject?.id}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja excluir o risco "{riskToDelete?.title}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(riskToDelete?.id)}
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