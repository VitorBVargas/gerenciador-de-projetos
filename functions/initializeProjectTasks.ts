import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await req.json();

    if (!projectId) {
      return Response.json({ error: 'projectId is required' }, { status: 400 });
    }

    // Fetch all products for this project
    const products = await base44.asServiceRole.entities.Product.filter({
      project_id: projectId
    });

    // Fetch all TimelineEvents for this project
    const timelineEvents = await base44.asServiceRole.entities.TimelineEvent.filter({
      project_id: projectId
    });

    // Create Tasks: one for each unique Entity + Vertical + Product combination
    const tasksToCreate = [];
    const seenCombinations = new Set();

    for (const product of products) {
      const key = `${product.entity}_${product.vertical}_${product.id}`;
      
      if (seenCombinations.has(key)) continue;
      seenCombinations.add(key);

      // Get all timeline events for this product
      const productEvents = timelineEvents.filter(e => e.product_id === product.id);

      // Sort by order index
      productEvents.sort((a, b) => (a.order || 0) - (b.order || 0));

      // Create task for each event
      productEvents.forEach((event, index) => {
        tasksToCreate.push({
          project_id: projectId,
          title: event.title || event.phase,
          description: event.phase,
          start_date: event.start_date,
          end_date: event.end_date,
          duration_days: event.duration_days || calculateDays(event.start_date, event.end_date),
          order_index: index,
          status: event.status === 'concluido' ? 'done' : 'planned',
          progress: event.progress || 0
        });
      });
    }

    // Bulk create tasks
    if (tasksToCreate.length > 0) {
      await base44.asServiceRole.entities.Task.bulkCreate(tasksToCreate);
    }

    return Response.json({
      success: true,
      tasksCreated: tasksToCreate.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
}