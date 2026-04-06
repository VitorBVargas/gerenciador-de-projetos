import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const BACKUP_ENTITIES = [
  'Project', 'Product', 'RecognizedRevenue', 'ProjectProgressCache', 'ProjectHealthCache',
  'TeamMember', 'Stakeholder', 'TimelineEvent', 'KanbanTask', 'Training', 'Travel',
  'HomologationTask', 'MigrationTask', 'OperationalReport', 'Risk', 'ProjectMilestone',
  'ProjectDocument', 'Expense', 'StatusReport', 'Cronograma', 'PortfolioCollaborator',
  'VerticalProduct', 'Task', 'InternalProject', 'InternalTeamMember', 'InternalStakeholder',
  'InternalProduct', 'InternalChecklist', 'InternalRisk', 'InternalSchedule',
  'StandardDocument', 'ProductDocumentStatus'
];

const escapeCsvValue = (value) => {
  if (value === null || value === undefined) return '';
  const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
  const escapedValue = stringValue.replace(/"/g, '""');
  return /[",\n]/.test(escapedValue) ? `"${escapedValue}"` : escapedValue;
};

const recordsToCsv = (records) => {
  if (!records || records.length === 0) return 'sem_dados\n';

  const headers = Array.from(
    records.reduce((set, record) => {
      Object.keys(record || {}).forEach((key) => set.add(key));
      return set;
    }, new Set())
  );

  const headerRow = headers.join(',');
  const dataRows = records.map((record) => headers.map((header) => escapeCsvValue(record?.[header])).join(','));
  return [headerRow, ...dataRows].join('\n');
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const timestamp = new Date().toISOString();
    const backupData = {
      timestamp,
      entities: {},
      csv_files: {}
    };

    for (const entityName of BACKUP_ENTITIES) {
      try {
        const data = await base44.asServiceRole.entities[entityName].list('-created_date', 10000);
        const records = Array.isArray(data) ? data : [];
        backupData.entities[entityName] = records;
        backupData.csv_files[`${entityName}.csv`] = recordsToCsv(records);
      } catch {
        console.log(`Entity ${entityName} not found or error fetching`);
      }
    }

    const backupJson = JSON.stringify(backupData);
    const fileName = `backup_${timestamp.replace(/[:.]/g, '-')}.json`;

    await base44.asServiceRole.entities.DatabaseBackup.create({
      filename: fileName,
      timestamp,
      entity_count: Object.keys(backupData.entities).length,
      total_records: Object.values(backupData.entities).reduce((sum, arr) => sum + arr.length, 0),
      backup_data_json: backupJson
    });

    return Response.json({
      success: true,
      timestamp,
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