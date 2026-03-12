import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Fetch all timeline events e products
    const allTimelineEvents = await base44.asServiceRole.entities.TimelineEvent.list('-created_date', 5000);
    const allProducts = await base44.asServiceRole.entities.Product.list('-created_date', 5000);
    
    // Clear existing cache
    const existingCache = await base44.asServiceRole.entities.FinancialTimelineCache.list('', 10000);
    for (const cache of existingCache) {
      await base44.asServiceRole.entities.FinancialTimelineCache.delete(cache.id);
    }
    
    // Build new cache: para cada produto, buscar datas de implantacao e go_live por product_id
    const cachesToCreate = [];
    
    allProducts.forEach(product => {
      const operacaoEvent = allTimelineEvents.find(
        e => e.product_id === product.id && e.phase === 'operacao_assistida' && e.end_date
      );
      
      const goLiveEvent = allTimelineEvents.find(
        e => e.product_id === product.id && e.phase === 'go_live' && (e.start_date || e.end_date)
      );
      
      cachesToCreate.push({
        project_id: product.project_id,
        product_id: product.id,
        implantacao_end_date: operacaoEvent?.end_date || null,
        go_live_start_date: goLiveEvent?.start_date || null,
        go_live_end_date: goLiveEvent?.end_date || null,
        last_updated: new Date().toISOString()
      });
    });
    
    // Bulk create
    if (cachesToCreate.length > 0) {
      await base44.asServiceRole.entities.FinancialTimelineCache.bulkCreate(cachesToCreate);
    }
    
    return Response.json({ 
      success: true, 
      cached: cachesToCreate.length 
    });
  } catch (error) {
    console.error('Erro ao atualizar FinancialTimelineCache:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});