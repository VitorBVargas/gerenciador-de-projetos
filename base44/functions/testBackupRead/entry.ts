import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  console.log('TEST: Starting');
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    console.log(`TEST: User ${user?.email}`);

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { backupId } = await req.json();
    console.log(`TEST: Looking for backup ${backupId}`);

    const records = await base44.asServiceRole.entities.DatabaseBackup.filter({ id: backupId });
    console.log(`TEST: Got records, type=${typeof records}`);
    
    if (!records || records.length === 0) {
      return Response.json({ error: 'Not found', type: typeof records }, { status: 404 });
    }

    const backup = records[0];
    console.log(`TEST: Backup filename=${backup?.filename}`);
    
    const json = backup?.backup_data_json;
    console.log(`TEST: JSON exists=${!!json}, type=${typeof json}, len=${json?.length}`);

    if (!json) {
      return Response.json({ 
        error: 'No JSON', 
        backupKeys: Object.keys(backup || {}) 
      }, { status: 400 });
    }

    const parsed = JSON.parse(json);
    const entities = Object.keys(parsed?.entities || {});
    console.log(`TEST: Entities=${entities.join(',')}`);

    return Response.json({ 
      success: true, 
      filename: backup.filename,
      entities,
      jsonLength: json.length
    });
  } catch (error) {
    console.log(`TEST ERROR: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});