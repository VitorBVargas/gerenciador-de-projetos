import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all projects and products
    const projects = await base44.asServiceRole.entities.Project.list();
    const allProducts = await base44.asServiceRole.entities.Product.list();

    // Get active project IDs (status not 'concluido')
    const activeProjectIds = new Set(
      projects
        .filter(p => p.status !== 'concluido')
        .map(p => p.id)
    );

    // Find products with production_password = true in inactive projects
    const residualProducts = allProducts.filter(p => 
      p.production_password === true && 
      !activeProjectIds.has(p.project_id)
    );

    // Reset production_password to false for residual products
    let resetCount = 0;
    for (const product of residualProducts) {
      await base44.asServiceRole.entities.Product.update(product.id, {
        production_password: false
      });
      resetCount++;
    }

    return Response.json({
      success: true,
      message: `Cleaned up ${resetCount} residual password records from inactive projects`,
      activeProjects: activeProjectIds.size,
      residualRecords: resetCount
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});