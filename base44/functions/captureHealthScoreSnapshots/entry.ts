import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Captura snapshot do health score de todos os projetos ativos.
// Usa o valor do cache ProjectHealthCache (que já é mantido atualizado pelos
// outros fluxos). Cria um HealthScoreSnapshot por projeto.
// Executado periodicamente (a cada 20 dias) via automação agendada.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Busca todos os projetos não concluídos (não vale snapshotar concluídos)
    const projects = await base44.asServiceRole.entities.Project.list();
    const eligible = projects.filter(p => p.status !== 'concluido');

    let created = 0;
    let skipped = 0;
    const now = new Date().toISOString();

    for (const project of eligible) {
      // Lê o score atual do cache
      const cache = await base44.asServiceRole.entities.ProjectHealthCache.filter({ project_id: project.id });
      if (!cache || cache.length === 0) {
        skipped++;
        continue;
      }
      const score = cache[0].health_score;
      if (score === undefined || score === null) {
        skipped++;
        continue;
      }

      await base44.asServiceRole.entities.HealthScoreSnapshot.create({
        project_id: project.id,
        score,
        captured_at: now,
        source: 'auto'
      });
      created++;
    }

    return Response.json({
      success: true,
      total_projects: eligible.length,
      snapshots_created: created,
      skipped
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});