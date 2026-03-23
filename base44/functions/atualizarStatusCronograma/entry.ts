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
        const MAX_ROUNDS = 5; // segurança: no máximo 5 rodadas
        let round = 0;
        let hadUpdatesThisRound = true;

        // Loop até não ter mais nada para atualizar (ou atingir limite de rodadas)
        while (hadUpdatesThisRound && round < MAX_ROUNDS) {
            round++;
            hadUpdatesThisRound = false;

            for (const project of projects) {
                await new Promise(r => setTimeout(r, 300));

                const events = await base44.asServiceRole.entities.TimelineEvent.filter({ project_id: project.id });
                if (!events || events.length === 0) continue;

                const updates = [];

                for (const event of events) {
                    if (event.status === 'concluido' || event.status === 'pausado' || event.status === 'atrasado') continue;
                    if (!event.start_date) continue;

                    const startStr = event.start_date.split('T')[0];
                    const endStr = event.end_date ? event.end_date.split('T')[0] : null;

                    let newStatus;
                    if (todayStr < startStr) {
                        newStatus = 'nao_iniciado';
                    } else {
                        newStatus = 'em_andamento';
                    }

                    if (newStatus !== event.status) {
                        updates.push({ id: event.id, newStatus });
                    }
                }

                for (const u of updates) {
                    await base44.asServiceRole.entities.TimelineEvent.update(u.id, { status: u.newStatus });
                    await new Promise(r => setTimeout(r, 200));
                    hadUpdatesThisRound = true;
                }

                totalUpdated += updates.length;
                if (updates.length > 0) {
                    const existing = summary.find(s => s.project === project.name);
                    if (existing) existing.updated += updates.length;
                    else summary.push({ project: project.name, updated: updates.length });
                }
            }
        }

        return Response.json({
            success: true,
            total_projects: projects.length,
            rounds_executed: round,
            total_updated: totalUpdated,
            summary
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});