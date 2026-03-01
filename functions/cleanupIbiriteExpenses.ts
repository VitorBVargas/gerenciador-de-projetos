import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Find "Ibirité Geral" project
    const projects = await base44.asServiceRole.entities.Project.list();
    const ibiriteProject = projects.find(p => 
      p.name && (
        p.name.includes('Ibirité Geral') || 
        p.name.includes('ibirite geral') ||
        p.name.includes('Ibirité') && p.name.includes('Geral')
      )
    );

    if (!ibiriteProject) {
      return Response.json({ 
        success: false,
        message: 'Projeto "Ibirité Geral" não encontrado' 
      });
    }

    // Get all expenses for this project
    const expenses = await base44.asServiceRole.entities.Expense.filter({ 
      project_id: ibiriteProject.id 
    });

    // Delete all expenses
    let deleted = 0;
    for (const expense of expenses) {
      try {
        await base44.asServiceRole.entities.Expense.delete(expense.id);
        deleted++;
      } catch (err) {
        console.error('Error deleting expense:', err);
      }
    }

    return Response.json({ 
      success: true,
      project_name: ibiriteProject.name,
      project_id: ibiriteProject.id,
      expenses_deleted: deleted,
      message: `${deleted} despesas deletadas do projeto "${ibiriteProject.name}"`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});