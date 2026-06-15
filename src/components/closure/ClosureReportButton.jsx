import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { generateClosureReportPDF } from './closurePdfGenerator';

export default function ClosureReportButton({ project }) {
  const [loading, setLoading] = useState(false);

  if (!project || project.status !== 'concluido') return null;

  const handleExtract = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    setLoading(true);
    try {
      toast.info('Coletando dados do projeto...');

      const pid = project.id;
      const [
        products,
        timelineEvents,
        baselines,
        risks,
        healthSnapshots,
        editalItems,
        licoes,
        cronogramas,
        migrationTasks,
        homologationTasks
      ] = await Promise.all([
        base44.entities.Product.filter({ project_id: pid }),
        base44.entities.TimelineEvent.filter({ project_id: pid }),
        base44.entities.ScheduleBaseline.filter({ project_id: pid }),
        base44.entities.Risk.filter({ project_id: pid }),
        base44.entities.HealthScoreSnapshot.filter({ project_id: pid }).catch(() => []),
        base44.entities.EditalItem.filter({ portfolio: project.portfolio }).catch(() => []),
        base44.entities.LicaoAprendida.filter({ project_id: pid }).catch(() => []),
        base44.entities.Cronograma.filter({ project_id: pid }).catch(() => []),
        base44.entities.MigrationTask.filter({ project_id: pid }).catch(() => []),
        base44.entities.HomologationTask.filter({ project_id: pid }).catch(() => [])
      ]);

      toast.info('Gerando PDF executivo...');

      await generateClosureReportPDF({
        project,
        products,
        timelineEvents,
        baselines,
        risks,
        healthSnapshots,
        editalItems,
        licoes,
        cronogramas,
        migrationTasks,
        homologationTasks
      });

      toast.success('Relatório executivo gerado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar relatório: ' + (err.message || 'desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleExtract}
      disabled={loading}
      className="w-full bg-emerald-600 hover:bg-emerald-700 mt-2"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Gerando...
        </>
      ) : (
        <>
          <FileDown className="w-4 h-4 mr-2" />
          Extrair Relatório
        </>
      )}
    </Button>
  );
}