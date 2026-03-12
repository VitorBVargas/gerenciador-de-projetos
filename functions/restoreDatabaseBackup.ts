import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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

    console.error(`[RESTORE START] User: ${user.email}, BackupId: ${backupId}`);

    // Busca o backup diretamente por ID usando filter
    console.error('[RESTORE] Fetching backup record...');
    const backupRecords = await base44.asServiceRole.entities.DatabaseBackup.filter({ id: backupId });
    console.error(`[RESTORE] Got backupRecords, type: ${typeof backupRecords}, length: ${backupRecords?.length}`);
    
    if (!backupRecords || backupRecords.length === 0) {
      console.error(`[RESTORE ERROR] Backup not found: ${backupId}`);
      return Response.json({ error: 'Backup not found' }, { status: 404 });
    }

    console.error('[RESTORE] Extracting backup from records...');
    const backup = backupRecords[0];
    console.error(`[RESTORE] backup type: ${typeof backup}, keys: ${Object.keys(backup || {}).join(',')}`);
    const backupDataJson = backup.backup_data_json;
    console.error(`[RESTORE] backupDataJson type: ${typeof backupDataJson}, exists: ${!!backupDataJson}`);
    
    if (!backupDataJson || typeof backupDataJson !== 'string') {
      console.error('[RESTORE ERROR] Invalid backup_data_json');
      return Response.json({ error: 'Invalid backup data format' }, { status: 400 });
    }
    
    console.error(`[RESTORE] Found backup: ${backup.filename}`);
    console.error(`[RESTORE] Parsing backup data (${backupDataJson.length} chars)`);
    
    const backupData = JSON.parse(backupDataJson);
    const entityNames = Object.keys(backupData.entities);
    console.error(`[RESTORE] Backup contains ${entityNames.length} entities: ${entityNames.join(', ')}`);

    let restored = 0;
    let deleted = 0;
    let errors = [];
    const processedEntities = [];

    // Restaura cada entidade
    for (const [entityName, records] of Object.entries(backupData.entities)) {
      try {
        console.error(`[RESTORE] Processing ${entityName} (${records?.length || 0} records in backup)`);
        
        // Primeiro deleta TODOS os registros atuais
        let currentRecords = [];
        try {
          currentRecords = await base44.asServiceRole.entities[entityName].list(undefined, 10000) || [];
          if (!Array.isArray(currentRecords)) {
            currentRecords = [];
          }
          console.error(`[RESTORE] ${entityName} has ${currentRecords.length} current records to delete`);
        } catch (e) {
          console.error(`[RESTORE] Could not list ${entityName}:`, e.message);
        }
        
        // Deleta cada registro individual
        for (const record of currentRecords) {
          try {
            await base44.asServiceRole.entities[entityName].delete(record.id);
            deleted++;
          } catch (err) {
            console.error(`[RESTORE] Error deleting ${entityName} ${record.id}:`, err.message);
          }
        }

        // Depois insere os do backup (se houver)
        if (records && Array.isArray(records) && records.length > 0) {
          console.error(`[RESTORE] Restoring ${records.length} ${entityName} records`);
          
          for (const record of records) {
            // Remove IDs para deixar o sistema gerar novos
            const { id, created_date, updated_date, created_by, ...data } = record;
            
            try {
              await base44.asServiceRole.entities[entityName].create(data);
              restored++;
            } catch (err) {
              console.error(`[RESTORE] Error restoring ${entityName}:`, err.message);
              errors.push(`${entityName}: ${err.message}`);
            }
          }
        } else {
          console.error(`[RESTORE] ${entityName} has no records in backup (cleared)`);
        }
        
        processedEntities.push(entityName);
      } catch (err) {
        console.error(`[RESTORE] Error processing ${entityName}:`, err.message);
        errors.push(`${entityName}: ${err.message}`);
      }
    }

    console.error(`[RESTORE COMPLETE] Deleted: ${deleted}, Restored: ${restored}, Errors: ${errors.length}`);

    return Response.json({
      success: true,
      message: 'Restauração completada',
      deleted_records: deleted,
      restored_records: restored,
      processed_entities: processedEntities,
      errors: errors.length > 0 ? errors : null
    });
  } catch (error) {
    console.error('[RESTORE FATAL ERROR]:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});