import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        // 1. Busca todos os projetos ativos
        const projects = await base44.asServiceRole.entities.Project.filter(
            { status: 'em_andamento' }
        );

        if (!projects || projects.length === 0) {
            return Response.json({ success: true, message: 'Nenhum projeto ativo', updated: 0 });
        }

        let totalUpdated = 0;
        const summary = [];

        // 2. Para cada projeto, busca eventos e atualiza só os que precisam mudar
        for (const project of projects) {
            await new Promise(r => setTimeout(r, 300)); // pausa entre projetos

            const events = await base44.asServiceRole.entities.TimelineEvent.filter({ project_id: project.id });
            if (!events || events.length === 0) continue;

            const updates = [];

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
                    updates.push({ id: event.id, newStatus });
                }
            }

            // Aplica updates em série com pequena pausa
            for (const u of updates) {
                await base44.asServiceRole.entities.TimelineEvent.update(u.id, { status: u.newStatus });
                await new Promise(r => setTimeout(r, 200));
            }

            totalUpdated += updates.length;
            summary.push({ project: project.name, updated: updates.length });
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