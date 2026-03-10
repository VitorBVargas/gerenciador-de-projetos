import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { sourceProjectName, newProjectName } = await req.json();

    // 1. Find source project
    const sourceProjects = await base44.entities.Project.filter({ name: sourceProjectName });
    if (!sourceProjects || sourceProjects.length === 0) {
      return Response.json({ error: `Project "${sourceProjectName}" not found` }, { status: 404 });
    }
    const sourceProject = sourceProjects[0];

    // 2. Create new project
    const newProject = await base44.entities.Project.create({
      ...sourceProject,
      name: newProjectName,
      display_order: 999
    });
    delete newProject.id;
    delete newProject.created_date;
    delete newProject.updated_date;
    delete newProject.created_by;

    const newProjectId = newProject.id;

    // 3. Copy all related entities
    const entitiesToCopy = [
      'Product',
      'TimelineEvent',
      'TeamMember',
      'Stakeholder',
      'KanbanTask',
      'Training',
      'Travel',
      'HomologationTask',
      'MigrationTask',
      'OperationalReport',
      'Risk',
      'ProjectMilestone',
      'ProjectDocument',
      'Expense',
      'RecognizedRevenue',
      'Cronograma',
      'ProjectProgressCache',
      'ProjectHealthCache'
    ];

    for (const entityName of entitiesToCopy) {
      // Fetch records for source project
      const records = await base44.entities[entityName].filter({ project_id: sourceProject.id });
      
      if (records && records.length > 0) {
        const newRecords = records.map(record => {
          const copy = { ...record };
          delete copy.id;
          delete copy.created_date;
          delete copy.updated_date;
          delete copy.created_by;
          copy.project_id = newProjectId;
          
          // Special handling for related IDs that might need mapping
          // (e.g., product_id, cronograma_id) - but we'll copy as-is for now
          // since the new entities should have the same structure
          
          return copy;
        });

        // Bulk create with chunking to avoid payload size issues
        const chunkSize = 100;
        for (let i = 0; i < newRecords.length; i += chunkSize) {
          const chunk = newRecords.slice(i, i + chunkSize);
          await base44.entities[entityName].bulkCreate(chunk);
        }
      }
    }

    return Response.json({ 
      success: true, 
      message: `Project "${sourceProjectName}" copied to "${newProjectName}" with ID ${newProjectId}`,
      newProjectId
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});