import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { project_id, health_score } = body;

    if (!project_id || health_score === undefined) {
      return Response.json({ error: 'project_id and health_score required' }, { status: 400 });
    }

    // Check if cache exists
    const existing = await base44.asServiceRole.entities.ProjectHealthCache.filter({ 
      project_id: project_id
    });

    const cacheData = {
      health_score: health_score,
      last_updated: new Date().toISOString()
    };

    if (existing.length > 0) {
      await base44.asServiceRole.entities.ProjectHealthCache.update(existing[0].id, cacheData);
    } else {
      cacheData.project_id = project_id;
      await base44.asServiceRole.entities.ProjectHealthCache.create(cacheData);
    }

    return Response.json({ 
      success: true, 
      project_id,
      health_score
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});