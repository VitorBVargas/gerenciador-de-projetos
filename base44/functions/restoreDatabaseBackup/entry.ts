import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import JSZip from 'npm:jszip@3.10.1';

Deno.serve(async (req) => {
  console.log('[RESTORE] Function started');
  try {
    console.log('[RESTORE] Creating base44 client');
    const base44 = createClientFromRequest(req);
    console.log('[RESTORE] Authenticating user');
    const user = await base44.auth.me();
    console.log(`[RESTORE] User authenticated: ${user?.email}, role: ${user?.role}`);

    if (!user || user.role !== 'admin') {
      console.log('[RESTORE] Access denied - not admin');
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('[RESTORE] Parsing request body');
    const { backupId } = await req.json();
    console.log(`[RESTORE] Received backupId: ${backupId}`);

    if (!backupId) {
      return Response.json({ error: 'backupId is required' }, { status: 400 });
    }

    console.log(`[RESTORE START] User: ${user.email}, BackupId: ${backupId}`);

    // Busca o backup diretamente por ID usando filter
    console.log('[RESTORE] Fetching backup record...');
    let backupRecords = await base44.asServiceRole.entities.DatabaseBackup.filter({ id: backupId });
    console.log(`[RESTORE] Got backupRecords, type: ${typeof backupRecords}`);
    
    // O SDK retorna uma string JSON gigante ao invés de objeto/array
    if (typeof backupRecords === 'string') {
      console.log('[RESTORE] Parsing JSON string...');
      backupRecords = JSON.parse(backupRecords);
    }
    
    // Pode vir como array ou objeto indexado
    const backup = Array.isArray(backupRecords) ? backupRecords[0] : (backupRecords["0"] || backupRecords[0]);
    
    if (!backup) {
      console.log(`[RESTORE ERROR] Backup not found: ${backupId}`);
      return Response.json({ error: 'Backup not found' }, { status: 404 });
    }

    console.log('[RESTORE] Extracting backup from records...');
    console.log(`[RESTORE] backup type: ${typeof backup}, keys: ${Object.keys(backup || {}).join(',')}`);

    let backupData = null;

    if (backup.backup_file_url) {
      console.log('[RESTORE] Reading backup from ZIP file URL');
      const fileResponse = await fetch(backup.backup_file_url);

      if (!fileResponse.ok) {
        return Response.json({ error: 'Não foi possível baixar o arquivo do backup' }, { status: 400 });
      }

      const zipArrayBuffer = await fileResponse.arrayBuffer();
      const zip = await JSZip.loadAsync(zipArrayBuffer);
      const backupJsonFile = zip.file('backup.json');

      if (!backupJsonFile) {
        return Response.json({ error: 'backup.json não encontrado dentro do ZIP' }, { status: 400 });
      }

      const backupDataJson = await backupJsonFile.async('string');
      backupData = JSON.parse(backupDataJson);
    } else {
      const backupDataJson = backup.backup_data_json;
      console.log(`[RESTORE] backupDataJson type: ${typeof backupDataJson}, exists: ${!!backupDataJson}`);

      if (!backupDataJson || typeof backupDataJson !== 'string') {
        console.log('[RESTORE ERROR] Invalid backup_data_json');
        return Response.json({ error: 'Invalid backup data format' }, { status: 400 });
      }

      console.log(`[RESTORE] Found backup: ${backup.filename}`);
      console.log(`[RESTORE] Parsing backup data (${backupDataJson.length} chars)`);
      backupData = JSON.parse(backupDataJson);
    }

    const entityNames = Object.keys(backupData.entities);
    console.log(`[RESTORE] Backup contains ${entityNames.length} entities: ${entityNames.join(', ')}`);

    let restored = 0;
    let deleted = 0;
    let errors = [];
    const processedEntities = [];

    // Restaura cada entidade
    for (const [entityName, records] of Object.entries(backupData.entities)) {
      try {
        console.log(`[RESTORE] Processing ${entityName} (${records?.length || 0} records in backup)`);
        
        // Primeiro deleta TODOS os registros atuais
        let currentRecords = [];
        try {
          currentRecords = await base44.asServiceRole.entities[entityName].list(undefined, 10000) || [];
          if (!Array.isArray(currentRecords)) {
            currentRecords = [];
          }
          console.log(`[RESTORE] ${entityName} has ${currentRecords.length} current records to delete`);
        } catch (e) {
          console.log(`[RESTORE] Could not list ${entityName}:`, e.message);
        }
        
        // Deleta cada registro individual
        for (const record of currentRecords) {
          try {
            await base44.asServiceRole.entities[entityName].delete(record.id);
            deleted++;
          } catch (err) {
            console.log(`[RESTORE] Error deleting ${entityName} ${record.id}:`, err.message);
          }
        }

        // Depois insere os do backup (se houver)
        if (records && Array.isArray(records) && records.length > 0) {
          console.log(`[RESTORE] Restoring ${records.length} ${entityName} records`);
          
          for (const record of records) {
            // Remove IDs para deixar o sistema gerar novos
            const { id, created_date, updated_date, created_by, ...data } = record;
            
            try {
              await base44.asServiceRole.entities[entityName].create(data);
              restored++;
            } catch (err) {
              console.log(`[RESTORE] Error restoring ${entityName}:`, err.message);
              errors.push(`${entityName}: ${err.message}`);
            }
          }
        } else {
          console.log(`[RESTORE] ${entityName} has no records in backup (cleared)`);
        }
        
        processedEntities.push(entityName);
      } catch (err) {
        console.log(`[RESTORE] Error processing ${entityName}:`, err.message);
        errors.push(`${entityName}: ${err.message}`);
      }
    }

    console.log(`[RESTORE COMPLETE] Deleted: ${deleted}, Restored: ${restored}, Errors: ${errors.length}`);

    return Response.json({
      success: true,
      message: 'Restauração completada',
      deleted_records: deleted,
      restored_records: restored,
      processed_entities: processedEntities,
      errors: errors.length > 0 ? errors : null
    });
  } catch (error) {
    console.log('[RESTORE FATAL ERROR]:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});