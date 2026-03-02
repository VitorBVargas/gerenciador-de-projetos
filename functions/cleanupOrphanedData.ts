import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Buscar todos os projetos existentes
    const projects = await base44.entities.Project.list();
    const projectIds = new Set(projects.map(p => p.id));

    const cleanupLog = {
      timestamp: new Date().toISOString(),
      deletedRecords: {}
    };

    // Lista de entidades que referenciam project_id
    const entitiesWithProjectRef = [
      'TeamMember',
      'Stakeholder',
      'Product',
      'TimelineEvent',
      'MigrationTask',
      'HomologationTask',
      'Risk',
      'Expense',
      'Travel',
      'Training',
      'KanbanTask',
      'ProjectMilestone',
      'ProjectDocument',
      'Cronograma',
      'OperationalReport',
      'StatusReport',
      'RecognizedRevenue'
    ];

    // Para cada entidade, buscar e deletar registros órfãos
    for (const entityName of entitiesWithProjectRef) {
      try {
        const records = await base44.asServiceRole.entities[entityName].list();
        let deletedCount = 0;

        for (const record of records) {
          if (record.project_id && !projectIds.has(record.project_id)) {
            await base44.asServiceRole.entities[entityName].delete(record.id);
            deletedCount++;
          }
        }

        if (deletedCount > 0) {
          cleanupLog.deletedRecords[entityName] = deletedCount;
        }
      } catch (error) {
        console.log(`Entidade ${entityName} não encontrada ou erro ao processar:`, error.message);
      }
    }

    // Limpar produtos órfãos (sem projeto válido)
    try {
      const allProducts = await base44.asServiceRole.entities.Product.list();
      let orphanedProductCount = 0;

      for (const product of allProducts) {
        if (!projectIds.has(product.project_id)) {
          await base44.asServiceRole.entities.Product.delete(product.id);
          orphanedProductCount++;
        }
      }

      if (orphanedProductCount > 0) {
        console.log(`Deletados ${orphanedProductCount} produtos órfãos`);
      }
    } catch (error) {
      console.log('Erro ao limpar produtos:', error.message);
    }

    return Response.json({
      success: true,
      message: 'Limpeza de dados órfãos concluída',
      deletedRecords: cleanupLog.deletedRecords,
      totalProjectsActive: projects.length
    });
  } catch (error) {
    console.error('Erro durante limpeza:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});