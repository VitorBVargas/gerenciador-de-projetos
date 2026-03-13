import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar todos os produtos e eventos
    const allProducts = await base44.asServiceRole.entities.Product.list('-created_date', 5000);
    const allTimelineEvents = await base44.asServiceRole.entities.TimelineEvent.list('-created_date', 5000);
    
    // Limpar registros existentes
    const existing = await base44.asServiceRole.entities.ProductFinancialDates.list('', 5000);
    for (const record of existing) {
      await base44.asServiceRole.entities.ProductFinancialDates.delete(record.id);
    }
    
    const records = [];
    
    // Para cada produto, buscar as datas relevantes
    for (const product of allProducts) {
      const productEvents = allTimelineEvents.filter(e => e.product_id === product.id);
      
      const goLiveEvent = productEvents.find(e => e.phase === 'go_live' && e.start_date);
      const operacaoEvent = productEvents.find(e => e.phase === 'operacao_assistida' && e.end_date);
      
      // Criar registro apenas se houver pelo menos uma data
      if (goLiveEvent || operacaoEvent) {
        records.push({
          product_id: product.id,
          project_id: product.project_id,
          go_live_date: goLiveEvent?.start_date || null,
          operacao_assistida_end_date: operacaoEvent?.end_date || null,
          last_updated: new Date().toISOString()
        });
      }
    }
    
    // Criar em lote
    if (records.length > 0) {
      await base44.asServiceRole.entities.ProductFinancialDates.bulkCreate(records);
    }
    
    return Response.json({ 
      success: true, 
      populated: records.length,
      total_products: allProducts.length
    });
    
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});