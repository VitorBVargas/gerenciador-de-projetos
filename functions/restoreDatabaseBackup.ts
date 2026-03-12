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

    console.log(`[RESTORE START] User: ${user.email}, BackupId: ${backupId}`);

    // Busca o backup
    const backupRecords = await base44.asServiceRole.entities.DatabaseBackup.filter({ id: backupId });
    
    if (!backupRecords || backupRecords.length === 0) {
      console.error(`[RESTORE ERROR] Backup not found: ${backupId}`);
      return Response.json({ error: 'Backup not found' }, { status: 404 });
    }

    const backup = backupRecords[0];
    
    // Log completo do objeto para debug
    console.log('[RESTORE DEBUG] Backup record structure:', JSON.stringify(backup, null, 2).substring(0, 500));
    console.log('[RESTORE DEBUG] typeof backup:', typeof backup);
    console.log('[RESTORE DEBUG] backup.filename:', backup?.filename);
    console.log('[RESTORE DEBUG] backup.backup_data_json exists:', !!backup?.backup_data_json);
    console.log('[RESTORE DEBUG] typeof backup.backup_data_json:', typeof backup?.backup_data_json);
    
    const backupDataJson = backup.backup_data_json;
    
    if (!backupDataJson || typeof backupDataJson !== 'string') {
      console.error('[RESTORE ERROR] Invalid backup_data_json, type:', typeof backupDataJson);
      return Response.json({ 
        error: 'Invalid backup data format',
        debug: {
          type: typeof backupDataJson,
          exists: !!backupDataJson,
          backupKeys: Object.keys(backup || {})
        }
      }, { status: 400 });
    }
    
    console.log(`[RESTORE] Found backup: ${backup.filename}`);
    const backupData = JSON.parse(backupDataJson);
    console.log(`[RESTORE] Backup contains entities: ${Object.keys(backupData.entities).join(', ')}`);

    let restored = 0;
    let deleted = 0;
    let errors = [];
    const processedEntities = [];

    // Restaura cada entidade
    for (const [entityName, records] of Object.entries(backupData.entities)) {
      try {
        console.log(`[RESTORE] Processing entity: ${entityName}`);
        
        // Primeiro deleta TODOS os registros atuais
        let currentRecords = [];
        try {
          currentRecords = await base44.asServiceRole.entities[entityName].list(undefined, 10000) || [];
          console.log(`[RESTORE] Entity ${entityName} has ${currentRecords.length} current records`);
        } catch (e) {
          console.warn(`[RESTORE] Could not list ${entityName}:`, e.message);
        }
        
        // Deleta cada registro individual
        for (const record of currentRecords) {
          try {
            await base44.asServiceRole.entities[entityName].delete(record.id);
            deleted++;
            console.log(`[RESTORE] Deleted ${entityName} record: ${record.id}`);
          } catch (err) {
            console.warn(`[RESTORE] Error deleting ${entityName} ${record.id}:`, err.message);
            errors.push(`Erro ao deletar ${entityName}: ${err.message}`);
          }
        }

        // Depois insere os do backup (se houver)
        if (records && records.length > 0) {
          console.log(`[RESTORE] Restoring ${records.length} ${entityName} records from backup`);
          
          for (const record of records) {
            // Remove IDs para deixar o sistema gerar novos
            const { id, created_date, updated_date, created_by, ...data } = record;
            
            try {
              await base44.asServiceRole.entities[entityName].create(data);
              restored++;
              console.log(`[RESTORE] Restored ${entityName} record`);
            } catch (err) {
              console.error(`[RESTORE] Error restoring ${entityName}:`, err.message);
              errors.push(`Erro ao restaurar ${entityName}: ${err.message}`);
            }
          }
        } else {
          console.log(`[RESTORE] Entity ${entityName} has no records in backup (entity cleared)`);
        }
        
        processedEntities.push(entityName);
      } catch (err) {
        console.error(`[RESTORE] Error processing ${entityName}:`, err.message);
        errors.push(`${entityName}: ${err.message}`);
      }
    }

    console.log(`[RESTORE COMPLETE] Deleted: ${deleted}, Restored: ${restored}, Errors: ${errors.length}`);

    return Response.json({
      success: true,
      message: 'Restauração completada com sucesso',
      deleted_records: deleted,
      restored_records: restored,
      processed_entities: processedEntities,
      errors: errors.length > 0 ? errors : null
    });
  } catch (error) {
    console.error('[RESTORE FATAL ERROR]:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});