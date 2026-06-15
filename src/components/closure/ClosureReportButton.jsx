import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, Brain } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { generateClosureReportPDF } from './closurePdfGenerator';
import { buildAnalysisPayload, requestExecutiveAnalysis } from './aiAnalysisService';

export default function ClosureReportButton({ project }) {
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('');

  if (!project || project.status !== 'concluido') return null;

  const handleExtract = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    setLoading(true);
    try {
      setStage('Coletando dados...');
      toast.info('Coletando dados do projeto...');

      const pid = project.id;
      const [
        products, timelineEvents, baselines, risks,
        healthSnapshots, editalItems, licoes,
        cronogramas, migrationTasks, homologationTasks,
        editalClosureSnapshots
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
        base44.entities.HomologationTask.filter({ project_id: pid }).catch(() => []),
        base44.entities.EditalClosureSnapshot.filter({ project_id: pid }).catch(() => [])
      ]);

      // Se não existe snapshot ainda (projeto concluído antes da automação ser criada), gera agora
      let editalClosureSnapshot = editalClosureSnapshots[0] || null;
      if (!editalClosureSnapshot) {
        try {
          const res = await base44.functions.invoke('captureEditalClosureSnapshot', { project_id: pid });
          editalClosureSnapshot = res?.data?.snapshot || null;
        } catch (err) {
          console.warn('Não foi possível gerar snapshot de edital:', err);
        }
      }

      const datasets = {
        project, products, timelineEvents, baselines, risks,
        healthSnapshots, editalItems, licoes, cronogramas,
        migrationTasks, homologationTasks, editalClosureSnapshot
      };

      setStage('Analisando com IA...');
      toast.info('Agente IA analisando o projeto...');

      let aiAnalysis = '';
      try {
        const payload = buildAnalysisPayload(datasets);
        aiAnalysis = await requestExecutiveAnalysis(project, payload);
      } catch (aiErr) {
        console.error('Falha na análise IA:', aiErr);
        toast.warning('IA indisponível — gerando relatório sem a análise executiva.');
      }

      setStage('Gerando PDF...');
      toast.info('Gerando PDF executivo...');

      await generateClosureReportPDF({ ...datasets, aiAnalysis });

      toast.success('Relatório executivo gerado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar relatório: ' + (err.message || 'desconhecido'));
    } finally {
      setLoading(false);
      setStage('');
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
          {stage || 'Gerando...'}
        </>
      ) : (
        <>
          <Brain className="w-4 h-4 mr-1" />
          <FileDown className="w-4 h-4 mr-2" />
          Extrair Relatório com IA
        </>
      )}
    </Button>
  );
}