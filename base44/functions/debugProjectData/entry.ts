import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const allProjects = await base44.asServiceRole.entities.Project.list('-created_date', 1000);
    const allTimelineEvents = await base44.asServiceRole.entities.TimelineEvent.list('-created_date', 99999);
    const allProducts = await base44.asServiceRole.entities.Product.list('-created_date', 1000);
    const allCronogramas = await base44.asServiceRole.entities.Cronograma.list('-created_date', 1000);

    // Projects to debug
    const projectNames = ['Altamira', 'Criciuma'];
    const projectsToDebug = allProjects.filter(p => 
      projectNames.some(name => p.name.toLowerCase().includes(name.toLowerCase()))
    );

    const debug = [];

    for (const project of projectsToDebug) {
      const projectProducts = allProducts.filter(p => p.project_id === project.id);
      const productIds = new Set(projectProducts.map(p => p.id));
      const projectCronogramas = allCronogramas.filter(c => c.project_id === project.id);
      const cronogramaIds = new Set(projectCronogramas.map(c => c.id));

      // Get all events related to this project
      const projectEvents = allTimelineEvents.filter(e => 
        e.project_id === project.id || 
        productIds.has(e.product_id) || 
        cronogramaIds.has(e.cronograma_id)
      );

      // Get events that have progress > 0 or are complete
      const activeEvents = projectEvents.filter(e => e.progress > 0 || e.status === 'concluido' || e.status === 'em_andamento');

      debug.push({
        projectName: project.name,
        projectId: project.id,
        totalEvents: projectEvents.length,
        activeEvents: activeEvents.length,
        products: projectProducts.length,
        cronogramas: projectCronogramas.length,
        events: projectEvents.map(e => ({
          title: e.title,
          status: e.status,
          progress: e.progress,
          startDate: e.start_date,
          endDate: e.end_date
        }))
      });
    }

    return Response.json({ success: true, debug });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});