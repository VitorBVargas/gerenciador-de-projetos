import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // 1. Limpar cache existente (em lotes para evitar rate limit)
    const existingCache = await base44.asServiceRole.entities.FinancialTimelineCache.list('', 10000);
    const batchSize = 50;
    for (let i = 0; i < existingCache.length; i += batchSize) {
      const batch = existingCache.slice(i, i + batchSize);
      await Promise.all(batch.map(c => base44.asServiceRole.entities.FinancialTimelineCache.delete(c.id)));
      await new Promise(resolve => setTimeout(resolve, 100)); // Delay entre lotes
    }
    
    // 2. Buscar todos os dados
    const allTimelineEvents = await base44.asServiceRole.entities.TimelineEvent.list('-created_date', 5000);
    const allProducts = await base44.asServiceRole.entities.Product.list('-created_date', 5000);
    
    // 3. Processar produtos em lotes de 100 para evitar memory limit
    const productBatchSize = 100;
    let totalCached = 0;
    
    for (let i = 0; i < allProducts.length; i += productBatchSize) {
      const productBatch = allProducts.slice(i, i + productBatchSize);
      
      const cachesToCreate = productBatch.map(product => {
        // Busca os eventos específicos deste produto (por product_id)
        const productEvents = allTimelineEvents.filter(e => e.product_id === product.id);
        
        // Encontra a data de fim da operação assistida (para reconhecimento de implantação)
        const operacaoEvent = productEvents.find(e => e.phase === 'operacao_assistida' && e.end_date);
        
        // Encontra a data de go_live (para reconhecimento recorrente)
        const goLiveEvent = productEvents.find(e => e.phase === 'go_live' && e.start_date);
        
        return {
          project_id: product.project_id,
          product_id: product.id,
          implantacao_end_date: operacaoEvent?.end_date || null,
          go_live_start_date: goLiveEvent?.start_date || null,
          go_live_end_date: goLiveEvent?.end_date || null,
          last_updated: new Date().toISOString()
        };
      });
      
      // 4. Bulk create em lotes
      if (cachesToCreate.length > 0) {
        await base44.asServiceRole.entities.FinancialTimelineCache.bulkCreate(cachesToCreate);
        totalCached += cachesToCreate.length;
      }
      
      // Delay entre lotes para evitar rate limit
      if (i + productBatchSize < allProducts.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    return Response.json({ success: true, cached: totalCached });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});