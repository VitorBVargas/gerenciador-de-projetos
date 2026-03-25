import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch paralelo para economizar tempo e buscar todas as entidades necessárias
    const [
      allProjects, 
      allTimelineEvents, 
      allCronogramas, 
      allProducts, 
      allExistingProgressCaches,
      allExistingOverallCaches,
      allMigrationTasks,
      allHomologationTasks
    ] = await Promise.all([
      base44.asServiceRole.entities.Project.list('-created_date', 1000),
      base44.asServiceRole.entities.TimelineEvent.list('-created_date', 99999),
      base44.asServiceRole.entities.Cronograma.list('-created_date', 1000),
      base44.asServiceRole.entities.Product.list('-created_date', 5000),
      base44.asServiceRole.entities.ProjectProgressCache.list('-created_date', 1000),
      base44.asServiceRole.entities.ProjectOverallProgressCache.list('-created_date', 1000),
      base44.asServiceRole.entities.MigrationTask.list('-created_date', 99999),
      base44.asServiceRole.entities.HomologationTask.list('-created_date', 99999)
    ]);

    console.log(`Starting recalculation for ${allProjects.length} projects`);

    // ✅ DICIONÁRIOS (MAPS): Transformando N^3 em O(1)
    const progressCacheMap = new Map(allExistingProgressCaches.map(c => [c.project_id, c]));
    const overallCacheMap = new Map(allExistingOverallCaches.map(c => [c.project_id, c]));
    
    const productsByProject = new Map();
    allProducts.forEach(p => {
      if (!productsByProject.has(p.project_id)) productsByProject.set(p.project_id, new Set());
      productsByProject.get(p.project_id).add(p.id);
    });

    const cronogramasByProject = new Map();
    allCronogramas.forEach(c => {
      if (!cronogramasByProject.has(c.project_id)) cronogramasByProject.set(c.project_id, new Set());
      cronogramasByProject.get(c.project_id).add(c.id);
    });

    const migrationByProject = new Map();
    allMigrationTasks.forEach(m => {
      if (!migrationByProject.has(m.project_id)) migrationByProject.set(m.project_id, []);
      migrationByProject.get(m.project_id).push(m);
    });

    const homologationByProject = new Map();
    allHomologationTasks.forEach(h => {
      if (!homologationByProject.has(h.project_id)) homologationByProject.set(h.project_id, []);
      homologationByProject.get(h.project_id).push(h);
    });

    // Função auxiliar super rápida
    const getProjectEvents = (projectId) => {
      const prodIds = productsByProject.get(projectId) || new Set();
      const cronoIds = cronogramasByProject.get(projectId) || new Set();
      
      return allTimelineEvents.filter(e => 
        e.project_id === projectId || 
        prodIds.has(e.product_id) || 
        cronoIds.has(e.cronograma_id)
      );
    };

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

    const results = [];
    const operations = [];
    const nowIso = new Date().toISOString();

    // Lógica pura em memória
    for (const project of allProjects) {
      const projectEvents = getProjectEvents(project.id);
      
      let timelineProgress = 0;
      if (projectEvents.length > 0) {
        const total = projectEvents.reduce((sum, e) => sum + calcEventProgress(e), 0);
        timelineProgress = Math.round(total / projectEvents.length);
      }

      let latestDate = null;
      if (projectEvents.length > 0) {
        const maxTime = Math.max(...projectEvents.map(e => e.end_date ? new Date(e.end_date).getTime() : 0));
        latestDate = maxTime > 0 ? new Date(maxTime).toISOString().split('T')[0] : null;
      }
      
      // Migração
      const projectMigration = migrationByProject.get(project.id) || [];
      let migrationProgress = 0;
      if (projectMigration.length > 0) {
        const completed = projectMigration.filter(m => m.completed).length;
        migrationProgress = Math.round((completed / projectMigration.length) * 100);
      }

      // Homologação
      const projectHomologation = homologationByProject.get(project.id) || [];
      let homologationProgress = 0;
      if (projectHomologation.length > 0) {
        const completed = projectHomologation.filter(h => h.completed).length;
        homologationProgress = Math.round((completed / projectHomologation.length) * 100);
      }

      // Overall Progress (Média entre cronograma, migração e homologação)
      let weights = 0;
      let totalScore = 0;
      
      if (projectEvents.length > 0) { weights++; totalScore += timelineProgress; }
      if (projectMigration.length > 0) { weights++; totalScore += migrationProgress; }
      if (projectHomologation.length > 0) { weights++; totalScore += homologationProgress; }

      const overallProgress = weights > 0 ? Math.round(totalScore / weights) : 0;

      // 1. Update ProjectProgressCache (Apenas Cronograma)
      const existingProgress = progressCacheMap.get(project.id);
      const progressCacheData = { 
        project_id: project.id, 
        overall_progress: timelineProgress, 
        last_updated: nowIso,
        ...(latestDate && { estimated_deadline: latestDate })
      };

      if (existingProgress) {
        operations.push(() => base44.asServiceRole.entities.ProjectProgressCache.update(existingProgress.id, progressCacheData));
      } else {
        operations.push(() => base44.asServiceRole.entities.ProjectProgressCache.create(progressCacheData));
      }

      // 2. Update ProjectOverallProgressCache (Geral)
      const existingOverall = overallCacheMap.get(project.id);
      const overallCacheData = {
        project_id: project.id,
        overall_progress: overallProgress,
        last_updated: nowIso
      };

      if (existingOverall) {
        operations.push(() => base44.asServiceRole.entities.ProjectOverallProgressCache.update(existingOverall.id, overallCacheData));
      } else {
        operations.push(() => base44.asServiceRole.entities.ProjectOverallProgressCache.create(overallCacheData));
      }

      results.push({ name: project.name, timelineProgress, overallProgress });
    }

    // ✅ CHUNKING: Salva no banco de 50 em 50 para não estourar tempo
    const CHUNK_SIZE = 50;
    for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
      await Promise.all(operations.slice(i, i + CHUNK_SIZE).map(op => op()));
    }

    return Response.json({ success: true, message: `Recalculado ${allProjects.length} projetos com sucesso`, updated: results });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});