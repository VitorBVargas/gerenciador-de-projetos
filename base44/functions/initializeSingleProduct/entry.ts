import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const DEFAULT_PHASES = [
  { phase: 'planejamento_contrato', title: 'Planejamento/Contrato' },
  { phase: 'kickoff', title: 'Kickoff' },
  { phase: 'diagnostico', title: 'Diagnóstico' },
  { phase: 'onboarding_cliente', title: 'Onboarding Cliente' },
  { phase: 'configuracao_migracao_hml', title: 'Configuração/Migração de Homologação' },
  { phase: 'homologacao_base', title: 'Homologação da Base' },
  { phase: 'migracao_prd_blackout', title: 'Migração de PRD (Blackout)' },
  { phase: 'configuracao_prd', title: 'Configuração de PRD' },
  { phase: 'treinamento', title: 'Treinamento' },
  { phase: 'go_live', title: 'Go-Live' },
  { phase: 'operacao_assistida', title: 'Operação Assistida' },
  { phase: 'encerramento_bastao', title: 'Encerramento/Passagem de Bastão' }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId, projectId, productName, vertical, migrationTasks, homologationTasks } = await req.json();

    if (!productId || !projectId) {
      return Response.json({ error: 'productId and projectId are required' }, { status: 400 });
    }

    // 1. Check if timeline events already exist for this product
    const existingEvents = await base44.asServiceRole.entities.TimelineEvent.filter({ product_id: productId });

    if (existingEvents.length === 0) {
      // Create 12 default timeline stages
      const eventsToCreate = DEFAULT_PHASES.map((phaseData, index) => ({
        project_id: projectId,
        product_id: productId,
        title: phaseData.title,
        phase: phaseData.phase,
        vertical: vertical || null,
        status: 'nao_iniciado',
        progress: 0,
        order: index
      }));
      await base44.asServiceRole.entities.TimelineEvent.bulkCreate(eventsToCreate);
    }

    // 2. Create default migration tasks if provided
    if (migrationTasks && migrationTasks.length > 0) {
      const existingMig = await base44.asServiceRole.entities.MigrationTask.filter({ product_id: productId });
      if (existingMig.length === 0) {
        const tasksToCreate = [];
        let order = 0;
        migrationTasks.forEach(section => {
          section.tasks.forEach(title => {
            tasksToCreate.push({
              project_id: projectId,
              product_id: productId,
              title,
              completed: false,
              order: order++
            });
          });
        });
        if (tasksToCreate.length > 0) {
          await base44.asServiceRole.entities.MigrationTask.bulkCreate(tasksToCreate);
        }
      }
    }

    // 3. Create default homologation tasks if provided
    if (homologationTasks && homologationTasks.length > 0) {
      const existingHml = await base44.asServiceRole.entities.HomologationTask.filter({ product_id: productId });
      if (existingHml.length === 0) {
        const tasksToCreate = [];
        let order = 0;
        homologationTasks.forEach(section => {
          section.tasks.forEach(title => {
            tasksToCreate.push({
              project_id: projectId,
              product_id: productId,
              title,
              completed: false,
              order: order++
            });
          });
        });
        if (tasksToCreate.length > 0) {
          await base44.asServiceRole.entities.HomologationTask.bulkCreate(tasksToCreate);
        }
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});