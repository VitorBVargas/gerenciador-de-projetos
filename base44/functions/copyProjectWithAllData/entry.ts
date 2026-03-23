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
    const projectData = { ...sourceProject };
    delete projectData.id;
    delete projectData.created_date;
    delete projectData.updated_date;
    delete projectData.created_by;
    projectData.name = newProjectName;
    projectData.display_order = 999;

    const newProject = await base44.entities.Project.create(projectData);
    const newProjectId = newProject.id;

    // 3. Copy Cronograma first and build ID mapping
    const cronogramaMap = {}; // old_id -> new_id
    const cronogramas = await base44.entities.Cronograma.filter({ project_id: sourceProject.id });
    
    if (cronogramas && cronogramas.length > 0) {
      for (const cron of cronogramas) {
        const cronData = { ...cron };
        delete cronData.id;
        delete cronData.created_date;
        delete cronData.updated_date;
        delete cronData.created_by;
        cronData.project_id = newProjectId;
        
        const newCron = await base44.entities.Cronograma.create(cronData);
        cronogramaMap[cron.id] = newCron.id;
      }
    }

    // 4. Copy all other related entities
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
          
          // Remap cronograma_id if it exists
          if (copy.cronograma_id && cronogramaMap[copy.cronograma_id]) {
            copy.cronograma_id = cronogramaMap[copy.cronograma_id];
          }
          
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