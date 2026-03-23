import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Lista de todas as entidades a fazer backup
const BACKUP_ENTITIES = [
  'Project', 'Product', 'RecognizedRevenue', 'ProjectProgressCache', 'ProjectHealthCache',
  'TeamMember', 'Stakeholder', 'TimelineEvent', 'KanbanTask', 'Training', 'Travel',
  'HomologationTask', 'MigrationTask', 'OperationalReport', 'Risk', 'ProjectMilestone',
  'ProjectDocument', 'Expense', 'StatusReport', 'Cronograma', 'PortfolioCollaborator',
  'VerticalProduct', 'Task', 'InternalProject', 'InternalTeamMember', 'InternalStakeholder',
  'InternalProduct', 'InternalChecklist', 'InternalRisk', 'InternalSchedule',
  'StandardDocument', 'ProductDocumentStatus'
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const backupData = {
      timestamp: new Date().toISOString(),
      entities: {}
    };

    // Busca todos os dados de cada entidade
    for (const entityName of BACKUP_ENTITIES) {
      try {
        const data = await base44.asServiceRole.entities[entityName].list('-created_date', 10000);
        backupData.entities[entityName] = data || [];
      } catch (err) {
        // Entidade pode não existir nesta app, ignora
        console.log(`Entity ${entityName} not found or error fetching`);
      }
    }

    // Salva backup como arquivo
    const backupJson = JSON.stringify(backupData, null, 2);
    const fileName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

    // Cria uma entidade especial para rastrear backups
    try {
      await base44.asServiceRole.entities.DatabaseBackup.create({
        filename: fileName,
        timestamp: backupData.timestamp,
        entity_count: Object.keys(backupData.entities).length,
        total_records: Object.values(backupData.entities).reduce((sum, arr) => sum + arr.length, 0),
        backup_data_json: backupJson
      });
    } catch (err) {
      console.error('Error creating backup record:', err);
    }

    return Response.json({
      success: true,
      timestamp: backupData.timestamp,
      filename: fileName,
      entity_count: Object.keys(backupData.entities).length,
      total_records: Object.values(backupData.entities).reduce((sum, arr) => sum + arr.length, 0),
      message: 'Backup criado com sucesso'
    });
  } catch (error) {
    console.error('Backup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});