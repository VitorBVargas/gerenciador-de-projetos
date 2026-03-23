import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, timelineData } = await req.json();

    if (!projectId || !timelineData || !Array.isArray(timelineData)) {
      return Response.json({ error: 'projectId e timelineData são obrigatórios' }, { status: 400 });
    }

    let updated = 0;
    let created = 0;

    // Para cada evento do frontend com datas preenchidas
    for (const frontendEvent of timelineData) {
      if (!frontendEvent.id) continue;

      // Buscar evento no banco
      const dbEvent = await base44.asServiceRole.entities.TimelineEvent.filter({ id: frontendEvent.id });
      
      if (dbEvent && dbEvent.length > 0) {
        const event = dbEvent[0];
        
        // Verificar se precisa atualizar (frontend tem data mas banco não)
        const needsUpdate = 
          (frontendEvent.start_date && !event.start_date) ||
          (frontendEvent.end_date && !event.end_date);

        if (needsUpdate) {
          await base44.asServiceRole.entities.TimelineEvent.update(event.id, {
            start_date: frontendEvent.start_date || event.start_date,
            end_date: frontendEvent.end_date || event.end_date,
            status: frontendEvent.status || event.status,
            progress: frontendEvent.progress !== undefined ? frontendEvent.progress : event.progress
          });
          updated++;
        }
      }
    }

    // Após sincronizar, recalcular cache
    await base44.functions.invoke('updateFinancialTimelineCache', {});

    return Response.json({ 
      success: true, 
      updated,
      created,
      message: `${updated} eventos atualizados, cache recalculado`
    });

  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});