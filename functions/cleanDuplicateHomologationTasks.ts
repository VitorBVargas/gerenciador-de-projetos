import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Busca todas as tarefas de homologação
    const allTasks = await base44.asServiceRole.entities.HomologationTask.list();
    
    // Filtra tarefas que começam com "Módulo único:"
    const tasksToDelete = allTasks.filter(task => 
      task.title.startsWith('Módulo único:')
    );

    // Deleta todas as tarefas encontradas
    let deletedCount = 0;
    for (const task of tasksToDelete) {
      await base44.asServiceRole.entities.HomologationTask.delete(task.id);
      deletedCount++;
    }

    return Response.json({ 
      success: true, 
      message: `${deletedCount} tarefas "Módulo único:" deletadas com sucesso!`,
      deletedCount 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});