import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        // Busca todos os eventos em lotes de 100
        let allEvents = [];
        let skip = 0;
        const batchSize = 100;
        while (true) {
            const batch = await base44.asServiceRole.entities.TimelineEvent.list('-created_date', batchSize, skip);
            if (!batch || batch.length === 0) break;
            allEvents = allEvents.concat(batch);
            if (batch.length < batchSize) break;
            skip += batchSize;
        }

        const toUpdate = [];

        for (const event of allEvents) {
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
                toUpdate.push({ id: event.id, newStatus });
            }
        }

        // Atualiza em série com pequeno delay para evitar rate limit
        let updated = 0;
        for (const item of toUpdate) {
            await base44.asServiceRole.entities.TimelineEvent.update(item.id, { status: item.newStatus });
            updated++;
            // Pequena pausa a cada 10 updates
            if (updated % 10 === 0) {
                await new Promise(r => setTimeout(r, 200));
            }
        }

        return Response.json({
            success: true,
            total_events: allEvents.length,
            updated,
            updates: toUpdate
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});