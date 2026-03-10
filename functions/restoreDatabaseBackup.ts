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

    // Busca o backup
    const backupRecords = await base44.asServiceRole.entities.DatabaseBackup.filter({ id: backupId });
    
    if (!backupRecords || backupRecords.length === 0) {
      return Response.json({ error: 'Backup not found' }, { status: 404 });
    }

    const backup = backupRecords[0];
    const backupData = JSON.parse(backup.backup_data_json);

    let restored = 0;
    let errors = [];

    // Restaura cada entidade
    for (const [entityName, records] of Object.entries(backupData.entities)) {
      if (!records || records.length === 0) continue;

      try {
        // Primeiro deleta todos os registros atuais
        const current = await base44.asServiceRole.entities[entityName].list('-created_date', 10000);
        
        for (const record of current || []) {
          try {
            await base44.asServiceRole.entities[entityName].delete(record.id);
          } catch (err) {
            // Ignora erros ao deletar
          }
        }

        // Depois insere os do backup
        for (const record of records) {
          // Remove IDs para deixar o sistema gerar novos
          const { id, created_date, updated_date, created_by, ...data } = record;
          
          try {
            await base44.asServiceRole.entities[entityName].create(data);
            restored++;
          } catch (err) {
            console.warn(`Error restoring ${entityName}:`, err.message);
          }
        }
      } catch (err) {
        console.error(`Error processing ${entityName}:`, err.message);
        errors.push(`${entityName}: ${err.message}`);
      }
    }

    return Response.json({
      success: true,
      message: 'Restauração completada',
      restored_records: restored,
      errors: errors.length > 0 ? errors : null
    });
  } catch (error) {
    console.error('Restore error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});