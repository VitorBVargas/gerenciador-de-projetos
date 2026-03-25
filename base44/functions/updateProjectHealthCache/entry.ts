import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { project_id, health_score } = await req.json();

    if (!project_id || health_score === undefined) {
      return Response.json({ error: 'project_id e health_score são obrigatórios' }, { status: 400 });
    }

    const cacheData = {
      project_id,
      health_score,
      last_updated: new Date().toISOString()
    };

    const existingCache = await base44.asServiceRole.entities.ProjectHealthCache.filter({ project_id });

    if (existingCache.length > 0) {
      await base44.asServiceRole.entities.ProjectHealthCache.update(existingCache[0].id, cacheData);
    } else {
      await base44.asServiceRole.entities.ProjectHealthCache.create(cacheData);
    }

    return Response.json({ success: true, project_id, health_score });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});