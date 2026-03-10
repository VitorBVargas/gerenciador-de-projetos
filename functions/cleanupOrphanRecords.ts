import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  return Response.json({ 
    error: 'DESATIVADA', 
    message: 'Esta função de limpeza foi desativada para proteger dados' 
  }, { status: 410 });
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Apenas admins podem executar cleanup
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Buscar todos os project_ids válidos
    const projects = await base44.entities.Project.list();
    const validProjectIds = new Set(projects.map(p => p.id));

    // Limpar APENAS Products órfãos (que sujam o gráfico)
    const products = await base44.entities.Product.list();
    const orphanProducts = products.filter(p => !validProjectIds.has(p.project_id));
    
    let deletedCount = 0;
    for (const product of orphanProducts) {
      await base44.entities.Product.delete(product.id);
      deletedCount++;
    }

    return Response.json({
      success: true,
      message: `Deletados ${deletedCount} produtos órfãos`,
      deleted: {
        products: deletedCount
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});