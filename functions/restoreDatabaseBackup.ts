import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { backupFilename } = await req.json();

    if (!backupFilename) {
      return Response.json({ error: 'backupFilename is required' }, { status: 400 });
    }

    console.error(`[RESTORE START] User: ${user.email}, Filename: ${backupFilename}`);

    // Busca o backup pelo filename usando filter com projection para não trazer backup_data_json
    const backupRecords = await base44.asServiceRole.entities.DatabaseBackup.filter(
      { filename: backupFilename }
    );
    
    if (!backupRecords || backupRecords.length === 0) {
      console.error(`[RESTORE ERROR] Backup not found: ${backupFilename}`);
      return Response.json({ error: 'Backup not found' }, { status: 404 });
    }

    const backupMeta = backupRecords[0];
    console.error(`[RESTORE] Found backup metadata: ${backupMeta.filename}, ID: ${backupMeta.id}`);
    
    // Agora busca o backup completo com backup_data_json
    // Precisa buscar novamente porque filter não traz campos grandes
    const fullBackupRecords = await base44.asServiceRole.entities.DatabaseBackup.filter(
      { id: backupMeta.id }
    );
    
    if (!fullBackupRecords || fullBackupRecords.length === 0) {
      throw new Error('Failed to fetch backup data');
    }
    
    const fullBackup = fullBackupRecords[0];
    const backupDataJson = fullBackup.backup_data_json;
    
    if (!backupDataJson || typeof backupDataJson !== 'string') {
      console.error('[RESTORE ERROR] Invalid backup_data_json');
      return Response.json({ error: 'Invalid backup data format' }, { status: 400 });
    }
    
    console.error(`[RESTORE] Parsing backup data (${backupDataJson.length} chars)`);
    const backupData = JSON.parse(backupDataJson);
    console.error(`[RESTORE] Backup contains ${Object.keys(backupData.entities).length} entities`);

    let restored = 0;
    let deleted = 0;
    let errors = [];
    const processedEntities = [];

    // Restaura cada entidade
    for (const [entityName, records] of Object.entries(backupData.entities)) {
      try {
        console.error(`[RESTORE] Processing entity: ${entityName} (${records?.length || 0} records in backup)`);
        
        // Primeiro deleta TODOS os registros atuais
        let currentRecords = [];
        try {
          currentRecords = await base44.asServiceRole.entities[entityName].list(undefined, 10000) || [];
          if (!Array.isArray(currentRecords)) {
            currentRecords = [];
          }
          console.error(`[RESTORE] Entity ${entityName} has ${currentRecords.length} current records to delete`);
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
            errors.push(`Erro ao deletar ${entityName}: ${err.message}`);
          }
        }

        // Depois insere os do backup (se houver)
        if (records && Array.isArray(records) && records.length > 0) {
          console.error(`[RESTORE] Restoring ${records.length} ${entityName} records from backup`);
          
          for (const record of records) {
            // Remove IDs para deixar o sistema gerar novos
            const { id, created_date, updated_date, created_by, ...data } = record;
            
            try {
              await base44.asServiceRole.entities[entityName].create(data);
              restored++;
            } catch (err) {
              console.error(`[RESTORE] Error restoring ${entityName}:`, err.message);
              errors.push(`Erro ao restaurar ${entityName}: ${err.message}`);
            }
          }
        } else {
          console.error(`[RESTORE] Entity ${entityName} has no records in backup (entity cleared)`);
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