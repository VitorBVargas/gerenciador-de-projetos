import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let allProjects = [];
    let skip = 0;
    const limit = 100;
    let fetching = true;

    // 1. PAGINAÇÃO: Busca projetos em lotes para não estourar a memória
    while (fetching) {
      // Nota: Assumindo que o SDK suporte paginação via skip/offset.
      // Caso contrário, buscaríamos com um limite alto seguro.
      const batch = await base44.asServiceRole.entities.Project.list('-created_date', limit, skip);
      
      if (batch && batch.length > 0) {
        allProjects = allProjects.concat(batch);
        skip += limit;
        if (batch.length < limit) fetching = false; // Última página
      } else {
        fetching = false;
      }
    }

    console.log(`Iniciando recálculo paginado para ${allProjects.length} projetos`);

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
    const nowIso = new Date().toISOString();

    // 2. PROCESSAMENTO EM CHUNKS: Processa N projetos por vez em paralelo
    const CHUNK_SIZE = 5; // Ajuste conforme a capacidade do banco
    
    for (let i = 0; i < allProjects.length; i += CHUNK_SIZE) {
      const projectChunk = allProjects.slice(i, i + CHUNK_SIZE);
      
      const chunkPromises = projectChunk.map(async (project) => {
        // Busca eventos APENAS deste projeto
        const projectEvents = await base44.asServiceRole.entities.TimelineEvent.filter({ project_id: project.id });
        
        let timelineProgress = 0;
        if (projectEvents.length > 0) {
          const total = projectEvents.reduce((sum, e) => sum + calcEventProgress(e), 0);
          timelineProgress = Math.round(total / projectEvents.length);
        }

        let latestDate = null;
        if (projectEvents.length > 0) {
          const validDates = projectEvents
            .filter(e => e.end_date && (e.phase === 'encerramento_bastao' || e.title === 'Encerramento/Passagem de Bastão'))
            .map(e => new Date(e.end_date).getTime())
            .filter(t => t > 0);

          if (validDates.length > 0) {
            const maxTime = Math.max(...validDates);
            latestDate = new Date(maxTime).toISOString().split('T')[0];
          }
        }

        // 3. BUSCA SOB DEMANDA: Em vez de carregar todos os caches na memória no início,
        // buscamos apenas os caches do projeto atual.
        const [existingProgressArr, existingOverallArr] = await Promise.all([
          base44.asServiceRole.entities.ProjectProgressCache.filter({ project_id: project.id }),
          base44.asServiceRole.entities.ProjectOverallProgressCache.filter({ project_id: project.id })
        ]);

        const existingProgress = existingProgressArr[0];
        const existingOverall = existingOverallArr[0];

        const progressCacheData = { 
          project_id: project.id, 
          overall_progress: timelineProgress, 
          last_updated: nowIso,
          ...(latestDate && { estimated_deadline: latestDate })
        };

        const overallCacheData = {
          project_id: project.id,
          overall_progress: timelineProgress,
          last_updated: nowIso
        };

        // Prepara as operações de escrita no banco
        const ops = [];
        if (existingProgress) {
          ops.push(base44.asServiceRole.entities.ProjectProgressCache.update(existingProgress.id, progressCacheData));
        } else {
          ops.push(base44.asServiceRole.entities.ProjectProgressCache.create(progressCacheData));
        }

        if (existingOverall) {
          ops.push(base44.asServiceRole.entities.ProjectOverallProgressCache.update(existingOverall.id, overallCacheData));
        } else {
          ops.push(base44.asServiceRole.entities.ProjectOverallProgressCache.create(overallCacheData));
        }

        // Executa as atualizações deste projeto em paralelo
        await Promise.all(ops);
        
        return { name: project.name, timelineProgress, overallProgress: timelineProgress };
      });

      // Aguarda o chunk atual terminar
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
      
      // 4. THROTTLING: Pequeno delay entre os chunks para não sobrecarregar o banco de dados
      if (i + CHUNK_SIZE < allProjects.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    return Response.json({ success: true, message: `Recalculado ${allProjects.length} projetos com arquitetura escalável`, updated: results });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});