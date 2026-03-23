import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all necessary data
    const allProjects = await base44.asServiceRole.entities.Project.list('-created_date', 1000);
    const allTimelineEvents = await base44.asServiceRole.entities.TimelineEvent.list('-created_date', 99999);
    const allCronogramas = await base44.asServiceRole.entities.Cronograma.list('-created_date', 1000);
    const allProducts = await base44.asServiceRole.entities.Product.list('-created_date', 1000);

    // Project names to update
    const projectNames = ['Criciuma Geral', 'Lages Educa/Parceiros', 'Altamira'];
    
    // Find matching projects
    const projectsToUpdate = allProjects.filter(p => 
      projectNames.some(name => p.name.toLowerCase().includes(name.toLowerCase()))
    );

    console.log(`Found ${projectsToUpdate.length} projects to update`);

    // Calculate progress for each project
    const calcEventProgress = (event) => {
      if (event.status === 'concluido') return 100;
      if (event.progress > 0) return event.progress;
      if (event.start_date && event.end_date) {
        const now = new Date();
        const start = new Date(event.start_date);
        const end = new Date(event.end_date);
        if (now <= start) return 0;
        if (now >= end) return 99;
        return Math.round(((now - start) / (end - start)) * 100);
      }
      return 0;
    };

    const getProjectEvents = (project) => {
      const projectProducts = allProducts.filter(p => p.project_id === project.id);
      const productIds = new Set(projectProducts.map(p => p.id));
      const projectCronogramas = allCronogramas.filter(c => c.project_id === project.id);
      const cronogramaIds = new Set(projectCronogramas.map(c => c.id));
      
      return allTimelineEvents.filter(e => 
        e.project_id === project.id || 
        productIds.has(e.product_id) || 
        cronogramaIds.has(e.cronograma_id)
      );
    };

    const calculateProjectProgress = (project) => {
      const projectEvents = getProjectEvents(project);
      if (projectEvents.length === 0) return 0;
      const total = projectEvents.reduce((sum, e) => sum + calcEventProgress(e), 0);
      return Math.round(total / projectEvents.length);
    };

    // Update cache for each project
    for (const project of projectsToUpdate) {
      const progress = calculateProjectProgress(project);
      
      // Check if cache exists
      const existing = await base44.asServiceRole.entities.ProjectProgressCache.filter({ 
        project_id: project.id
      });

      if (existing.length > 0) {
        await base44.asServiceRole.entities.ProjectProgressCache.update(existing[0].id, {
          overall_progress: progress,
          last_updated: new Date().toISOString()
        });
      } else {
        await base44.asServiceRole.entities.ProjectProgressCache.create({
          project_id: project.id,
          overall_progress: progress,
          last_updated: new Date().toISOString()
        });
      }

      console.log(`Updated ${project.name}: ${progress}%`);
    }

    return Response.json({ 
      success: true, 
      updated: projectsToUpdate.map(p => ({
        name: p.name,
        progress: calculateProjectProgress(p)
      }))
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});