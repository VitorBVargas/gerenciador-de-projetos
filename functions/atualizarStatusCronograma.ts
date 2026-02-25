import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Busca todos os eventos que NÃO estão concluídos
        const events = await base44.asServiceRole.entities.TimelineEvent.filter({});

        const updates = [];

        for (const event of events) {
            // Nunca alterar status concluído automaticamente
            if (event.status === 'concluido') continue;

            const startDate = event.start_date ? new Date(event.start_date) : null;
            const endDate = event.end_date ? new Date(event.end_date) : null;

            if (startDate) startDate.setHours(0, 0, 0, 0);
            if (endDate) endDate.setHours(0, 0, 0, 0);

            let newStatus = event.status;

            if (!startDate) continue;

            if (today < startDate) {
                newStatus = 'nao_iniciado';
            } else if (endDate && today > endDate) {
                newStatus = 'atrasado';
            } else {
                // today >= startDate && (no endDate or today <= endDate)
                newStatus = 'em_andamento';
            }

            if (newStatus !== event.status) {
                updates.push({ id: event.id, newStatus });
                await base44.asServiceRole.entities.TimelineEvent.update(event.id, { status: newStatus });
            }
        }

        return Response.json({
            success: true,
            total_events: events.length,
            updated: updates.length,
            updates
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});