import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();
        const projectId = body.project_id;

        if (!projectId) {
            return Response.json({ error: 'project_id é obrigatório' }, { status: 400 });
        }

        // Buscar todos os eventos do projeto
        const events = await base44.asServiceRole.entities.TimelineEvent.filter(
            { project_id: projectId },
            '-created_date',
            1000
        );

        // Encontrar a data mais recente (end_date mais longe)
        let estimatedDeadline = null;
        
        if (events && events.length > 0) {
            const validDates = events
                .filter(e => e.end_date)
                .map(e => e.end_date)
                .sort()
                .reverse();
            
            if (validDates.length > 0) {
                estimatedDeadline = validDates[0];
            }
        }

        // Buscar ou criar cache
        const existingCache = await base44.asServiceRole.entities.ProjectProgressCache.filter(
            { project_id: projectId }
        );

        if (existingCache && existingCache.length > 0) {
            // Atualizar com a nova data estimada
            await base44.asServiceRole.entities.ProjectProgressCache.update(
                existingCache[0].id,
                { estimated_deadline: estimatedDeadline }
            );
        } else {
            // Criar novo cache
            await base44.asServiceRole.entities.ProjectProgressCache.create({
                project_id: projectId,
                overall_progress: 0,
                estimated_deadline: estimatedDeadline
            });
        }

        return Response.json({
            success: true,
            project_id: projectId,
            estimated_deadline: estimatedDeadline,
            event_count: events ? events.length : 0
        });

    } catch (error) {
        console.error('Erro ao atualizar prazo estimado:', error);
        return Response.json({ 
            error: error.message,
            success: false
        }, { status: 500 });
    }
});