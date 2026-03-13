import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all projects
        const projects = await base44.asServiceRole.entities.Project.list('-created_date', 500);
        
        if (!projects || projects.length === 0) {
            return Response.json({ 
                success: true, 
                message: 'Nenhum projeto encontrado',
                caches_updated: 0
            });
        }

        let cacheUpdates = 0;
        const summary = [];

        // Verificar e sincronizar datas vazias antes de atualizar cache
        try {
            const allEvents = await base44.asServiceRole.entities.TimelineEvent.list('-created_date', 5000);
            const emptyEvents = allEvents.filter(e => 
                (e.phase === 'go_live' || e.phase === 'operacao_assistida') && 
                (!e.start_date && !e.end_date)
            );

            if (emptyEvents.length > 0) {
                console.log(`⚠️ Encontrados ${emptyEvents.length} eventos críticos sem datas - será necessário preencher manualmente`);
            }
        } catch (error) {
            console.error('Erro ao verificar eventos vazios:', error.message);
        }

        // Atualizar Financial Timeline Cache
        try {
            await base44.functions.invoke('updateFinancialTimelineCache', {});
        } catch (error) {
            console.error('Erro ao atualizar FinancialTimelineCache:', error.message);
        }

        // Para cada projeto, recalcular cache geral
        for (const project of projects) {
            try {
                // Buscar todos os eventos relacionados ao projeto
                const events = await base44.asServiceRole.entities.TimelineEvent.filter(
                    { project_id: project.id },
                    '-created_date',
                    1000
                );

                if (!events || events.length === 0) continue;

                // Calcular progresso: média dos progresses individuais
                const calcEventProgress = (event) => {
                    if (event.status === 'concluido') return 100;
                    if (event.progress > 0) return event.progress;
                    if (event.start_date && event.end_date) {
                        const now = new Date();
                        const start = new Date(event.start_date);
                        const end = new Date(event.end_date);
                        if (now <= start) return 0;
                        if (now >= end) return 99;
                        return Math.round(((now - start) / (end - start)) * 100);
                    }
                    return 0;
                };

                const totalProgress = events.reduce((sum, e) => sum + calcEventProgress(e), 0);
                const overallProgress = Math.round(totalProgress / events.length);

                // Buscar ou criar cache
                const existingCache = await base44.asServiceRole.entities.ProjectOverallProgressCache.filter(
                    { project_id: project.id }
                );

                if (existingCache && existingCache.length > 0) {
                    // Atualizar
                    await base44.asServiceRole.entities.ProjectOverallProgressCache.update(
                        existingCache[0].id,
                        {
                            overall_progress: overallProgress,
                            last_updated: new Date().toISOString()
                        }
                    );
                } else {
                    // Criar novo
                    await base44.asServiceRole.entities.ProjectOverallProgressCache.create({
                        project_id: project.id,
                        overall_progress: overallProgress,
                        last_updated: new Date().toISOString()
                    });
                }

                cacheUpdates++;
                summary.push({
                    project: project.name,
                    overall_progress: overallProgress,
                    event_count: events.length
                });

            } catch (error) {
                console.error(`Erro ao processar projeto ${project.name}:`, error.message);
            }
        }

        return Response.json({
            success: true,
            caches_updated: cacheUpdates,
            total_projects: projects.length,
            summary
        });

    } catch (error) {
        console.error('Erro ao recalcular caches:', error);
        return Response.json({ 
            error: error.message,
            success: false
        }, { status: 500 });
    }
});