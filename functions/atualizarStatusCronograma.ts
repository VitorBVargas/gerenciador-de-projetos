import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        // 1. Busca todos os projetos
        const projects = await base44.asServiceRole.entities.Project.list('-created_date', 200);
        if (!projects || projects.length === 0) {
            return Response.json({ success: true, message: 'Nenhum projeto encontrado', updated: 0 });
        }

        let totalUpdated = 0;
        const summary = [];

        // 2. Para cada projeto, busca e atualiza seus eventos
        for (const project of projects) {
            const events = await base44.asServiceRole.entities.TimelineEvent.filter({ project_id: project.id });

            if (!events || events.length === 0) continue;

            let projectUpdated = 0;

            for (const event of events) {
                if (event.status === 'concluido') continue;
                if (!event.start_date) continue;

                const startStr = event.start_date.split('T')[0];
                const endStr = event.end_date ? event.end_date.split('T')[0] : null;

                let newStatus;
                if (todayStr < startStr) {
                    newStatus = 'nao_iniciado';
                } else if (endStr && todayStr > endStr) {
                    newStatus = 'atrasado';
                } else {
                    newStatus = 'em_andamento';
                }

                if (newStatus !== event.status) {
                    await base44.asServiceRole.entities.TimelineEvent.update(event.id, { status: newStatus });
                    projectUpdated++;
                    totalUpdated++;
                }
            }

            summary.push({ project: project.name, updated: projectUpdated });

            // Pausa entre projetos para evitar rate limit
            await new Promise(r => setTimeout(r, 300));
        }

        return Response.json({
            success: true,
            total_projects: projects.length,
            total_updated: totalUpdated,
            summary
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});