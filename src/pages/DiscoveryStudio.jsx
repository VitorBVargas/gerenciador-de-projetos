import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Lightbulb, CheckCircle2, Trash2, Loader2, Pencil,
  ArrowLeft, Sparkles, MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import EmptyState from '../components/ui/EmptyState';
import DiscoveryWizard from '../components/internal/discovery/DiscoveryWizard';
import DiscoveryReport from '../components/internal/discovery/DiscoveryReport';
import DiscoveryAIChat from '../components/discovery/DiscoveryAIChat';

// Projeto virtual para discoveries standalone (não pertence a nenhum projeto interno)
const STANDALONE_PROJECT_ID = 'discovery_studio_standalone';

export default function DiscoveryStudio() {
  const queryClient = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);

  const { data: discoveries = [], isLoading } = useQuery({
    queryKey: ['discoveries', STANDALONE_PROJECT_ID],
    queryFn: () => base44.entities.Discovery.filter({ project_id: STANDALONE_PROJECT_ID }, '-updated_date')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Discovery.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discoveries', STANDALONE_PROJECT_ID] });
      setDeleteOpen(false);
      setToDelete(null);
    }
  });

  const openCreate = () => { setSelected(null); setWizardOpen(true); };
  const openEdit = (d) => { setSelected(d); setReportOpen(false); setWizardOpen(true); };
  const openReport = (d) => { setSelected(d); setReportOpen(true); };

  const statusBadge = {
    em_andamento: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    concluido: 'bg-green-500/20 text-green-400 border-green-500/30'
  };
  const statusLabel = { em_andamento: 'Em andamento', concluido: 'Concluído' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950">
      {/* Top Bar */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to={createPageUrl('Home')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Discovery Studio</p>
              <p className="text-slate-500 text-xs">Estruture problemas e gere planos de ação</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setChatOpen(true)}
              className="border-indigo-600/50 bg-indigo-600/10 text-indigo-300 hover:bg-indigo-600/20"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Discovery IA
            </Button>
            <Link to={createPageUrl('Home')}>
              <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-8">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto py-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-xs mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Metodologia estruturada com apoio de IA</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">
            Faça um Discovery completo, do problema ao plano
          </h1>
          <p className="text-slate-400">
            Diagnóstico · Persona · Causa Raiz · 5 Porquês · AS IS · TO BE · Hipóteses · Plano de Ações (5W2H + RICE)
          </p>
        </div>

        {/* Action bar */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Meus Discoveries</h2>
            <p className="text-slate-400 text-sm mt-0.5">
              {discoveries.length} discovery(s) criado(s) neste espaço
            </p>
          </div>
          <Button onClick={openCreate} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Discovery
          </Button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
          </div>
        ) : discoveries.length === 0 ? (
          <Card className="bg-slate-800/40 border-slate-700/50 border-dashed">
            <CardContent className="py-16">
              <EmptyState
                icon={Lightbulb}
                title="Comece seu primeiro Discovery"
                description="Use a metodologia estruturada com apoio do Discovery IA para entender melhor um problema e gerar um plano de ação claro."
                action={
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button onClick={openCreate} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Discovery
                    </Button>
                    <Button variant="outline" onClick={() => setChatOpen(true)} className="border-indigo-600/50 bg-indigo-600/10 text-indigo-300 hover:bg-indigo-600/20">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Conversar com a IA
                    </Button>
                  </div>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {discoveries.map(d => {
              const totalAcoes = d.acoes?.length || 0;
              return (
                <Card
                  key={d.id}
                  className="bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-indigo-500/40 transition-all group cursor-pointer"
                  onClick={() => openReport(d)}
                >
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate" title={d.name}>{d.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {d.updated_date ? format(new Date(d.updated_date), "dd 'de' MMM, yyyy", { locale: ptBR }) : '—'}
                        </p>
                      </div>
                      <Badge className={cn("border text-xs flex-shrink-0", statusBadge[d.status] || statusBadge.em_andamento)}>
                        {d.status === 'concluido' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {statusLabel[d.status] || statusLabel.em_andamento}
                      </Badge>
                    </div>

                    {d.diagnostico?.problema && (
                      <p className="text-sm text-slate-400 line-clamp-2">{d.diagnostico.problema}</p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                      <div className="flex gap-3 text-xs text-slate-500">
                        <span><span className="text-white font-medium">{totalAcoes}</span> ações</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-slate-400 hover:text-indigo-300"
                          onClick={(e) => { e.stopPropagation(); openEdit(d); }}
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); setToDelete(d); setDeleteOpen(true); }}
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Wizard — reutiliza o componente existente, com projeto standalone */}
      <DiscoveryWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        discovery={selected}
        projectId={STANDALONE_PROJECT_ID}
      />

      <DiscoveryReport
        open={reportOpen}
        onOpenChange={setReportOpen}
        discovery={selected}
        onEdit={() => { setReportOpen(false); setWizardOpen(true); }}
      />

      {/* Chat IA */}
      <DiscoveryAIChat open={chatOpen} onOpenChange={setChatOpen} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Excluir discovery?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(toDelete?.id)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}