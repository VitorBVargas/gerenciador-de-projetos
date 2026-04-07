import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { project_id, overall_progress, overall_progress_all_entities } = body;

    if (!project_id) {
      return Response.json({ error: 'project_id required' }, { status: 400 });
    }

    // ✅ BUSCA DIRECIONADA: Baixamos apenas os produtos do projeto
    const projectProducts = await base44.asServiceRole.entities.Product.filter({ project_id });
    const productIds = projectProducts.map(p => p.id);

    // ✅ BUSCA PARALELA e DIRECIONADA: Buscamos apenas os eventos que importam
    const eventFetchPromises = [
      base44.asServiceRole.entities.TimelineEvent.filter({ project_id }),
      ...productIds.map(id => base44.asServiceRole.entities.TimelineEvent.filter({ product_id: id }))
    ];
    
    const [eventsArrays, migrationTasks, homologationTasks] = await Promise.all([
      Promise.all(eventFetchPromises),
      base44.asServiceRole.entities.MigrationTask.filter({ project_id }),
      base44.asServiceRole.entities.HomologationTask.filter({ project_id })
    ]);
    
    // Achatar (flat) o array de arrays e remover duplicatas pelo ID do evento
    const rawEvents = eventsArrays.flat();
    const uniqueEventsMap = new Map(rawEvents.map(e => [e.id, e]));
    const projectEvents = Array.from(uniqueEventsMap.values());

    // Calcula prazo estimado pela etapa Encerramento/Passagem de Bastão
    let estimatedDeadline = null;
    if (projectEvents.length > 0) {
      const validDates = projectEvents
        .filter(e => e.end_date && (e.phase === 'encerramento_bastao' || e.title === 'Encerramento/Passagem de Bastão'))
        .map(e => new Date(e.end_date).getTime())
        .filter(t => t > 0);

      if (validDates.length > 0) {
        const maxTime = Math.max(...validDates);
        estimatedDeadline = new Date(maxTime).toISOString().split('T')[0];
      }
    }

    // Calculate timeline progress
    const calcEventProgress = (event) => {
      if (event.status === 'concluido') return 100;
      if (event.status === 'nao_iniciado') return 0;
      if (event.progress > 0) return event.progress;
      if (event.start_date && event.end_date) {
        const now = new Date();
        const start = new Date(event.start_date);
        const end = new Date(event.end_date);
        if (now <= start) return 0;
        if (now >= end) return 99;
        return Math.round(((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100);
      }
      return 0;
    };

    let timelineProgress = 0;
    if (projectEvents.length > 0) {
      const total = projectEvents.reduce((sum, e) => sum + calcEventProgress(e), 0);
      timelineProgress = Math.round(total / projectEvents.length);
    }

    // Migration progress
    let migrationProgress = 0;
    if (migrationTasks.length > 0) {
      const completed = migrationTasks.filter(m => m.completed).length;
      migrationProgress = Math.round((completed / migrationTasks.length) * 100);
    }

    // Homologation progress
    let homologationProgress = 0;
    if (homologationTasks.length > 0) {
      const completed = homologationTasks.filter(h => h.completed).length;
      homologationProgress = Math.round((completed / homologationTasks.length) * 100);
    }

    // Overall Progress
    let weights = 0;
    let totalScore = 0;
    
    if (projectEvents.length > 0) { weights++; totalScore += timelineProgress; }
    // if (migrationTasks.length > 0) { weights++; totalScore += migrationProgress; }
    // if (homologationTasks.length > 0) { weights++; totalScore += homologationProgress; }

    const calculatedOverallProgress = timelineProgress; // weights > 0 ? Math.round(totalScore / weights) : 0;

    const cacheData = {
      overall_progress: overall_progress !== undefined ? overall_progress : timelineProgress,
      last_updated: new Date().toISOString(),
      ...(estimatedDeadline && { estimated_deadline: estimatedDeadline })
    };

    // Atualiza ProjectProgressCache
    const existing = await base44.asServiceRole.entities.ProjectProgressCache.filter({ project_id });
    
    if (existing.length > 0) {
      await base44.asServiceRole.entities.ProjectProgressCache.update(existing[0].id, cacheData);
    } else {
      await base44.asServiceRole.entities.ProjectProgressCache.create({
        project_id,
        ...cacheData
      });
    }

    // Atualiza ProjectOverallProgressCache
    const overallExisting = await base44.asServiceRole.entities.ProjectOverallProgressCache.filter({ project_id });
    const overallCacheData = {
      project_id,
      overall_progress: overall_progress_all_entities !== undefined ? overall_progress_all_entities : calculatedOverallProgress,
      last_updated: new Date().toISOString()
    };

    if (overallExisting.length > 0) {
      await base44.asServiceRole.entities.ProjectOverallProgressCache.update(overallExisting[0].id, overallCacheData);
    } else {
      await base44.asServiceRole.entities.ProjectOverallProgressCache.create(overallCacheData);
    }

    return Response.json({ 
      success: true, 
      project_id,
      overall_progress: cacheData.overall_progress,
      overall_progress_all_entities: overallCacheData.overall_progress,
      estimated_deadline: estimatedDeadline
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});