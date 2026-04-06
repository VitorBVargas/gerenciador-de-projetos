import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import JSZip from 'npm:jszip@3.10.1';

async function uploadZipFile(base44, zipUint8Array, zipName) {
  const zipFile = new File([zipUint8Array], zipName, { type: 'application/zip' });
  return await base44.integrations.Core.UploadFile({ file: zipFile });
}

const BACKUP_ENTITIES = [
  'Project', 'Product', 'RecognizedRevenue', 'ProjectProgressCache', 'ProjectHealthCache',
  'TeamMember', 'Stakeholder', 'TimelineEvent', 'KanbanTask', 'Training', 'Travel',
  'HomologationTask', 'MigrationTask', 'OperationalReport', 'Risk', 'ProjectMilestone',
  'ProjectDocument', 'Expense', 'StatusReport', 'Cronograma', 'PortfolioCollaborator',
  'VerticalProduct', 'Task', 'InternalProject', 'InternalTeamMember', 'InternalStakeholder',
  'InternalProduct', 'InternalChecklist', 'InternalRisk', 'InternalSchedule',
  'StandardDocument', 'ProductDocumentStatus'
];

const PAGE_SIZE = 200;
const REQUEST_DELAY_MS = 250;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) return '';
  const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
  const escaped = stringValue.replace(/"/g, '""');
  return /[",\n;]/.test(escaped) ? `"${escaped}"` : escaped;
}

function recordsToCsv(records) {
  if (!records.length) return 'id\n';

  const headers = Array.from(new Set(records.flatMap((record) => Object.keys(record))));
  const rows = records.map((record) => (
    headers.map((header) => escapeCsvValue(record[header])).join(',')
  ));

  return [headers.join(','), ...rows].join('\n');
}

async function listEntityPage(entityApi, skip) {
  const response = await entityApi.list('-created_date', PAGE_SIZE, skip);
  if (Array.isArray(response)) return response;
  if (typeof response === 'string') return JSON.parse(response);
  return [];
}

async function getAllEntityRecords(entityApi, entityName, projectId) {
  const allRecords = [];
  let skip = 0;

  while (true) {
    const page = await listEntityPage(entityApi, skip);
    const filteredPage = page.filter((record) => {
      if (record.project_id !== undefined) return record.project_id === projectId;
      if (entityName === 'Project') return record.id === projectId;
      return false;
    });
    console.log(`[BACKUP] ${entityName}: página ${Math.floor(skip / PAGE_SIZE) + 1} com ${filteredPage.length} registros do projeto`);

    if (!page.length) break;

    allRecords.push(...filteredPage);
    skip += page.length;

    if (page.length < PAGE_SIZE) break;

    await sleep(REQUEST_DELAY_MS);
  }

  return allRecords;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { projectId } = await req.json();
    if (!projectId) {
      return Response.json({ error: 'projectId is required' }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    const zipName = `backup_${timestamp.replace(/[:.]/g, '-')}.zip`;
    const backupData = {
      timestamp,
      entities: {}
    };
    const zip = new JSZip();
    let totalRecords = 0;
    let entityCount = 0;

    for (const entityName of BACKUP_ENTITIES) {
      try {
        const entityApi = base44.asServiceRole.entities[entityName];
        if (!entityApi) continue;

        const records = await getAllEntityRecords(entityApi, entityName, projectId);
        backupData.entities[entityName] = records;
        zip.file(`${entityName}.csv`, recordsToCsv(records));
        totalRecords += records.length;
        entityCount += 1;
        await sleep(REQUEST_DELAY_MS);
      } catch (err) {
        console.log(`[BACKUP] Ignorando ${entityName}: ${err.message}`);
        await sleep(REQUEST_DELAY_MS * 2);
      }
    }

    zip.file('backup.json', JSON.stringify(backupData, null, 2));
    const zipUint8Array = await zip.generateAsync({ type: 'uint8array' });
    const uploadResult = await uploadZipFile(base44, zipUint8Array, zipName);

    await base44.asServiceRole.entities.DatabaseBackup.create({
      filename: zipName,
      timestamp,
      entity_count: entityCount,
      total_records: totalRecords,
      backup_data_json: JSON.stringify({ stored_in_zip: true, project_id: projectId }),
      backup_file_url: uploadResult.file_url
    });

    return Response.json({
      success: true,
      timestamp,
      filename: zipName,
      entity_count: entityCount,
      total_records: totalRecords,
      message: 'Backup criado com sucesso'
    });
  } catch (error) {
    console.error('Backup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});