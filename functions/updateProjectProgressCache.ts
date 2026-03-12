import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { project_id, overall_progress, overall_progress_all_entities } = body;

    if (!project_id) {
      return Response.json({ error: 'project_id required' }, { status: 400 });
    }

    // Fetch all timeline events and products for this project
    const allTimelineEvents = await base44.asServiceRole.entities.TimelineEvent.list('-created_date', 99999);
    const allProducts = await base44.asServiceRole.entities.Product.list('-created_date', 1000);

    // Get products for this project
    const projectProducts = allProducts.filter(p => p.project_id === project_id);
    const productIds = new Set(projectProducts.map(p => p.id));

    // Get timeline events for this project (by product_id)
    const projectEvents = allTimelineEvents.filter(e => 
      e.project_id === project_id || productIds.has(e.product_id)
    );

    // Calculate estimated deadline (max end_date from all events)
    let estimatedDeadline = null;
    if (projectEvents.length > 0) {
      const validDates = projectEvents
        .filter(e => e.end_date)
        .map(e => new Date(e.end_date).getTime())
        .filter(t => t > 0);
      
      if (validDates.length > 0) {
        const maxTime = Math.max(...validDates);
        estimatedDeadline = new Date(maxTime).toISOString().split('T')[0];
      }
    }

    // Update ProjectProgressCache (entidade-específico)
    const existing = await base44.asServiceRole.entities.ProjectProgressCache.filter({ 
      project_id: project_id
    });

    const cacheData = {
      overall_progress: overall_progress || 0,
      last_updated: new Date().toISOString()
    };

    if (estimatedDeadline) {
      cacheData.estimated_deadline = estimatedDeadline;
    }

    if (existing.length > 0) {
      await base44.asServiceRole.entities.ProjectProgressCache.update(existing[0].id, cacheData);
    } else {
      cacheData.project_id = project_id;
      await base44.asServiceRole.entities.ProjectProgressCache.create(cacheData);
    }

    // Update ProjectOverallProgressCache (todas as entidades)
    if (overall_progress_all_entities !== undefined) {
      const overallExisting = await base44.asServiceRole.entities.ProjectOverallProgressCache.filter({ 
        project_id: project_id
      });

      const overallCacheData = {
        overall_progress: overall_progress_all_entities || 0,
        last_updated: new Date().toISOString()
      };

      if (overallExisting.length > 0) {
        await base44.asServiceRole.entities.ProjectOverallProgressCache.update(overallExisting[0].id, overallCacheData);
      } else {
        overallCacheData.project_id = project_id;
        await base44.asServiceRole.entities.ProjectOverallProgressCache.create(overallCacheData);
      }
    }

    return Response.json({ 
      success: true, 
      project_id,
      overall_progress: cacheData.overall_progress,
      overall_progress_all_entities: overall_progress_all_entities || 0,
      estimated_deadline: estimatedDeadline
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});