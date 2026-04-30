import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';
import ActivityKanban from '../activities/ActivityKanban';
import ActivityTimeline from '../activities/ActivityTimeline';
import ActivityModal from '../modals/ActivityModal';

export default function InternalActivitiesTab({ projectId }) {
  const [activeTab, setActiveTab] = useState('kanban');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', projectId],
    queryFn: () => projectId ? base44.entities.ProjectActivity.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
    staleTime: 3 * 60 * 1000,
    gcTime: 15 * 60 * 1000
  });

  const { data: products = [] } = useQuery({
    queryKey: ['internalProducts', projectId],
    queryFn: () => projectId ? base44.entities.InternalProduct.filter({ project_id: projectId }) : [],
    enabled: !!projectId,
    staleTime: 3 * 60 * 1000,
    gcTime: 15 * 60 * 1000
  });

  const verticals = useMemo(() => {
    return [...new Set(products.map(p => p.vertical).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [products]);

  const handleEdit = (act = null) => {
    setSelectedActivity(act);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Atividades do time</h1>
          <p className="text-slate-400 mt-1">Gestão de tarefas e alocação de recursos</p>
        </div>
        <Button onClick={() => handleEdit(null)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          Nova Atividade
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="kanban" className="data-[state=active]:bg-indigo-600">Quadro Kanban</TabsTrigger>
          <TabsTrigger value="timeline" className="data-[state=active]:bg-indigo-600">Timeline / Gantt</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="space-y-6">
          <ActivityKanban
            activities={activities}
            verticals={verticals}
            onEdit={handleEdit}
            projectId={projectId}
          />
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <ActivityTimeline
            activities={activities}
            verticals={verticals}
            onEdit={handleEdit}
          />
        </TabsContent>
      </Tabs>

      <ActivityModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        activity={selectedActivity}
        projectId={projectId}
        verticals={verticals}
        isInternal
      />
    </div>
  );
}