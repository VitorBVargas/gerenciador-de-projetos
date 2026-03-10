import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, overall_progress } = await req.json();

    if (!project_id || overall_progress === undefined) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if cache already exists
    const existing = await base44.asServiceRole.entities.ProjectProgressCache.filter({ 
      project_id 
    });

    if (existing.length > 0) {
      // Update existing cache
      await base44.asServiceRole.entities.ProjectProgressCache.update(existing[0].id, {
        overall_progress,
        last_updated: new Date().toISOString()
      });
    } else {
      // Create new cache entry
      await base44.asServiceRole.entities.ProjectProgressCache.create({
        project_id,
        overall_progress,
        last_updated: new Date().toISOString()
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});