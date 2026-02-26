import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Processa UM projeto por execução, rotacionando via índice salvo em variável de ambiente ou argumento
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        // Recebe project_id opcional no body para processar só um projeto específico
        let body = {};
        try { body = await req.json(); } catch (_) {}
        const specificProjectId = body.project_id || null;

        // Busca projetos
        const projects = await base44.asServiceRole.entities.Project.list('-created_date', 200);
        if (!projects || projects.length === 0) {
            return Response.json({ success: true, message: 'Nenhum projeto encontrado', updated: 0 });
        }

        // Se veio project_id específico, processa só ele; senão pega todos mas com pausa maior
        const toProcess = specificProjectId
            ? projects.filter(p => p.id === specificProjectId)
            : projects;

        let totalUpdated = 0;
        const summary = [];

        for (const project of toProcess) {
            // Busca eventos deste projeto
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
                    // Pausa entre cada update
                    await new Promise(r => setTimeout(r, 500));
                }
            }

            summary.push({ project: project.name, updated: projectUpdated });

            // Pausa maior entre projetos
            await new Promise(r => setTimeout(r, 1000));
        }

        return Response.json({
            success: true,
            total_projects: toProcess.length,
            total_updated: totalUpdated,
            summary
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});