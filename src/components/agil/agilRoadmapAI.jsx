import { base44 } from '@/api/base44Client';

// Gera um Roadmap (RoadmapCiclo → Objetivos → Iniciativas) a partir do Product Backlog do projeto ágil.
// Épicos viram objetivos; features/stories principais viram iniciativas.
export async function gerarRoadmapDoBacklog(projectId) {
  const backlog = await base44.entities.AgileBacklog.filter({ project_id: projectId }, '-created_date', 500);
  const epics = backlog.filter(i => i.tipo === 'epic');
  if (epics.length === 0) {
    throw new Error('Nenhum épico no Product Backlog. Gere o backlog primeiro.');
  }

  const hoje = new Date();
  const fim = new Date();
  fim.setDate(fim.getDate() + 90);
  const iso = (d) => d.toISOString().slice(0, 10);

  const ciclo = await base44.entities.RoadmapCiclo.create({
    project_id: projectId,
    name: `Roadmap ${hoje.toLocaleDateString('pt-BR')}`,
    start_date: iso(hoje),
    end_date: iso(fim),
    status: 'ativo',
    percent_concluded: 0,
  });

  const periodos = ['30dias', '60dias', '90dias'];
  let criados = 0;

  for (let i = 0; i < epics.length; i++) {
    const epic = epics[i];
    const objetivo = await base44.entities.RoadmapObjetivo.create({
      project_id: projectId,
      ciclo_id: ciclo.id,
      titulo: epic.titulo,
      periodo: periodos[Math.min(i, periodos.length - 1)],
      status: epic.status === 'concluido' ? 'concluido' : 'pendente',
    });

    // Filhos (features/stories) do épico viram iniciativas
    const filhos = backlog.filter(b => (b.epic_id === epic.id) && (b.tipo === 'feature' || b.tipo === 'story'));
    const iniciativas = filhos.slice(0, 8);
    for (const f of iniciativas) {
      await base44.entities.RoadmapIniciativa.create({
        project_id: projectId,
        ciclo_id: ciclo.id,
        objetivo_id: objetivo.id,
        titulo: f.titulo,
        responsavel: f.responsavel || '',
        concluido: f.status === 'concluido',
      });
      criados++;
    }
  }

  return { ciclo, objetivos: epics.length, iniciativas: criados };
}