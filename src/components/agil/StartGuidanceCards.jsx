import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, ListTodo, Sparkles, Plus, Loader2 } from 'lucide-react';
import GerarBacklogIAModal from '@/components/agil/GerarBacklogIAModal';

// Cards discretos na Visão Geral: aparecem só quando não há Discovery / não há Stories.
export default function StartGuidanceCards({ project, discovery, hasStories, onBacklogGenerated }) {
  const projectId = project?.id;
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [backlogModal, setBacklogModal] = useState(false);

  const withPid = (page) => createPageUrl(`${page}?project_id=${projectId}`);
  const hasDiscovery = !!project?.discovery_id || !!discovery;

  const iniciarDiscovery = async () => {
    setBusy(true);
    try {
      const existing = await base44.entities.Discovery.filter({ project_id: projectId }, '-updated_date');
      if (!existing || existing.length === 0) {
        await base44.entities.Discovery.create({
          project_id: projectId,
          name: `Discovery — ${project?.name || 'Projeto Ágil'}`,
          status: 'em_andamento',
        });
      }
      navigate(withPid('AgilDiscovery'));
    } catch (e) {
      console.error(e);
      setBusy(false);
    }
  };

  if (hasDiscovery && hasStories) return null;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {!hasDiscovery && (
          <Card className="bg-slate-800/50 border-emerald-700/40">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-600/20 flex items-center justify-center flex-shrink-0">
                <Search className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold">Discovery não iniciado</h3>
                <p className="text-sm text-slate-400 mt-1 mb-3">
                  Deseja estruturar melhor este projeto antes do desenvolvimento?
                </p>
                <Button onClick={iniciarDiscovery} disabled={busy} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                  {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Search className="w-4 h-4 mr-1.5" />}
                  Iniciar Discovery
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!hasStories && (
          <Card className="bg-slate-800/50 border-indigo-700/40">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
                <ListTodo className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold">Backlog vazio</h3>
                <p className="text-sm text-slate-400 mt-1 mb-3">
                  Ainda não existem Épicos, Features ou Stories cadastradas.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setBacklogModal(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                    <Sparkles className="w-4 h-4 mr-1.5" /> Gerar Backlog com IA
                  </Button>
                  <Button onClick={() => navigate(withPid('AgilBacklog'))} size="sm" variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800">
                    <Plus className="w-4 h-4 mr-1.5" /> Criar primeira Story
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <GerarBacklogIAModal
        open={backlogModal}
        onOpenChange={setBacklogModal}
        project={project}
        discovery={discovery}
        onDone={onBacklogGenerated}
      />
    </>
  );
}