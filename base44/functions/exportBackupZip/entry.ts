import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import JSZip from 'npm:jszip@3.10.1';

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

    const { backupId } = await req.json();
    if (!backupId) {
      return Response.json({ error: 'backupId is required' }, { status: 400 });
    }

    const backupRecords = await base44.asServiceRole.entities.DatabaseBackup.filter({ id: backupId });
    const backup = Array.isArray(backupRecords) ? backupRecords[0] : null;

    if (!backup?.backup_data_json) {
      return Response.json({ error: 'Backup not found' }, { status: 404 });
    }

    const backupData = JSON.parse(backup.backup_data_json);
    const zip = new JSZip();
    const csvFiles = backupData.csv_files || {};
    const entities = backupData.entities || {};

    if (Object.keys(csvFiles).length > 0) {
      Object.entries(csvFiles).forEach(([fileName, content]) => {
        zip.file(fileName, content || 'sem_dados\n');
      });
    } else {
      Object.entries(entities).forEach(([entityName, records]) => {
        zip.file(`${entityName}.csv`, recordsToCsv(records));
      });
    }

    zip.file('manifest.json', JSON.stringify({
      filename: backup.filename,
      timestamp: backup.timestamp,
      entity_count: backup.entity_count,
      total_records: backup.total_records,
      exported_at: new Date().toISOString()
    }, null, 2));

    const zipBuffer = await zip.generateAsync({ type: 'uint8array' });

    return new Response(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${backup.filename.replace(/\.json$/i, '')}.zip"`
      }
    });
  } catch (error) {
    console.error('Export backup zip error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});