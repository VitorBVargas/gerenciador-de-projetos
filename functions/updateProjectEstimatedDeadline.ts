import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { project_id } = body;

        if (!project_id) {
            return Response.json({ error: 'project_id é obrigatório' }, { status: 400 });
        }

        // Buscar todos os eventos do projeto
        const events = await base44.asServiceRole.entities.TimelineEvent.filter(
            { project_id },
            '-updated_date',
            1000
        );

        if (!events || events.length === 0) {
            return Response.json({ 
                success: true,
                message: 'Nenhum evento encontrado',
                estimated_deadline: null
            });
        }

        // Encontrar a data mais tardia (end_date máxima)
        let maxEndDate = null;
        let maxEvent = null;

        events.forEach(event => {
            if (event.end_date) {
                const eventDate = new Date(event.end_date);
                if (!maxEndDate || eventDate > maxEndDate) {
                    maxEndDate = eventDate;
                    maxEvent = event;
                }
            }
        });

        if (!maxEndDate) {
            return Response.json({ 
                success: true,
                message: 'Nenhuma end_date encontrada nos eventos',
                estimated_deadline: null
            });
        }

        // Atualizar o projeto com o novo deadline estimado
        const maxEndDateStr = maxEndDate.toISOString().split('T')[0];
        
        await base44.asServiceRole.entities.Project.update(project_id, {
            deadline: maxEndDateStr
        });

        return Response.json({
            success: true,
            project_id,
            estimated_deadline: maxEndDateStr,
            last_phase: maxEvent?.phase,
            last_phase_title: maxEvent?.title
        });

    } catch (error) {
        console.error('Erro ao atualizar deadline estimado:', error);
        return Response.json({ 
            error: error.message,
            success: false
        }, { status: 500 });
    }
});